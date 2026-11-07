import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ClipboardPaste,
  Download,
  DownloadCloud,
  Eye,
  Film,
  Link2,
  RotateCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { extractFacebookVideoInfo } from '../services/facebookDownloader';
import { showAppAlert } from '../store/useDialogStore';
import { useFbDownloadStore } from '../store/useFbDownloadStore';
import { formatBytes } from '../utils/format';
import { useResponsive } from '../utils/responsive';

export default function FacebookDownloadScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const isTabScreen = route.name === 'Facebook';
  const insets = useSafeAreaInsets();
  const { rs } = useResponsive();
  const inputUrl = useFbDownloadStore(state => state.sessionInputUrl);
  const videoInfo = useFbDownloadStore(state => state.sessionVideoInfo);
  const currentDownloadId = useFbDownloadStore(
    state => state.sessionDownloadId,
  );
  const setSessionInputUrl = useFbDownloadStore(
    state => state.setSessionInputUrl,
  );
  const setSessionScanResult = useFbDownloadStore(
    state => state.setSessionScanResult,
  );
  const setSessionDownloadId = useFbDownloadStore(
    state => state.setSessionDownloadId,
  );
  const clearSessionState = useFbDownloadStore(
    state => state.clearSessionState,
  );
  const startFbDownload = useFbDownloadStore(state => state.startFbDownload);
  const retryFbDownload = useFbDownloadStore(state => state.retryFbDownload);
  const cleanupFailedFbDownloads = useFbDownloadStore(
    state => state.cleanupFailedFbDownloads,
  );

  const [isExtracting, setIsExtracting] = useState(false);

  const scanAbortRef = useRef<AbortController | null>(null);

  // Dọn dẹp các bản ghi lỗi/rác cũ khi mở màn hình & hủy request đang quét khi rời màn hình
  useEffect(() => {
    cleanupFailedFbDownloads();
    return () => {
      scanAbortRef.current?.abort();
    };
  }, [cleanupFailedFbDownloads]);

  // Chỉ subscribe đúng item đang tải trong phiên hiện tại (tránh re-render toàn mảng)
  const selectActiveItem = useCallback(
    (state: { fbDownloads: ReturnType<typeof useFbDownloadStore.getState>['fbDownloads'] }) =>
      currentDownloadId
        ? state.fbDownloads.find(d => d.id === currentDownloadId)
        : undefined,
    [currentDownloadId],
  );
  const activeItem = useFbDownloadStore(selectActiveItem);

  const isDownloading = activeItem?.status === 'downloading';
  const isDone = activeItem?.status === 'completed';
  const isFailed = activeItem?.status === 'failed';
  const downloadProgress = activeItem?.progress ?? 0;
  const downloadedBytes = activeItem?.downloadedBytes ?? 0;
  const totalBytes = activeItem?.totalBytes ?? 0;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClear = useCallback(() => {
    scanAbortRef.current?.abort();
    setIsExtracting(false);
    clearSessionState();
  }, [clearSessionState]);

  const handlePasteUrl = useCallback(async () => {
    try {
      const content = await Clipboard.getString();
      const trimmed = content ? content.trim() : '';
      if (!trimmed) {
        showAppAlert('Thông báo', 'Bộ nhớ tạm (Clipboard) hiện đang trống.');
        return;
      }
      setSessionInputUrl(trimmed);
      setSessionScanResult(null, null);
    } catch {
      showAppAlert('Lỗi', 'Không thể đọc dữ liệu từ bộ nhớ tạm.');
    }
  }, [setSessionInputUrl, setSessionScanResult]);

  const handleCheckUrl = useCallback(async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      showAppAlert(
        'Thông báo',
        'Vui lòng dán link video Facebook hoặc Reels cần tải.',
      );
      return;
    }

    Keyboard.dismiss();
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setIsExtracting(true);
    setSessionScanResult(null, null);

    try {
      const info = await extractFacebookVideoInfo(trimmed, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (info) {
        setSessionScanResult(info, null);
      } else {
        showAppAlert(
          'Không tìm thấy video',
          'Không thể lấy link video từ URL này. Vui lòng kiểm tra lại xem video có đang để ở chế độ Công khai (Public) không.',
        );
      }
    } catch {
      if (!controller.signal.aborted) {
        showAppAlert('Lỗi', 'Đã xảy ra sự cố trong quá trình phân tích URL.');
      }
    } finally {
      if (scanAbortRef.current === controller) {
        setIsExtracting(false);
      }
    }
  }, [inputUrl, setSessionScanResult]);

  const handleViewVideo = useCallback(() => {
    if (!videoInfo) {
      return;
    }

    const targetUri =
      isDone && activeItem?.localFilePath
        ? activeItem.localFilePath
        : videoInfo.videoUrl;

    navigation.navigate('LocalVideoPlayer', {
      title: activeItem?.title || videoInfo.title,
      uri: targetUri,
    });
  }, [activeItem?.localFilePath, activeItem?.title, isDone, navigation, videoInfo]);

  const handleDownload = useCallback(() => {
    if (!videoInfo) {
      return;
    }

    if (isFailed && activeItem) {
      retryFbDownload(activeItem.id);
      return;
    }

    const downloadId = startFbDownload(
      videoInfo.sourceUrl,
      videoInfo.videoUrl,
      videoInfo.title,
    );
    setSessionDownloadId(downloadId);
  }, [activeItem, isFailed, retryFbDownload, setSessionDownloadId, startFbDownload, videoInfo]);

  return (
    <View style={styles.container}>
      {/* Header (Chỉ hiện khi mở từ SettingScreen dạng Stack) */}
      {!isTabScreen ? (
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + rs(8),
              paddingHorizontal: rs(16),
              paddingBottom: rs(12),
            },
          ]}
        >
          <Pressable
            onPress={handleGoBack}
            hitSlop={8}
            style={[
              styles.backBtn,
              { width: rs(36), height: rs(36), borderRadius: rs(18) },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <ChevronLeft color="#FFFFFF" size={rs(22)} />
          </Pressable>

          <Text style={[styles.headerTitle, { fontSize: rs(18) }]}>
            Tải Video Facebook
          </Text>

          <View style={{ width: rs(36) }} />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: rs(16),
            paddingTop: isTabScreen ? insets.top + rs(72) : rs(16),
            paddingBottom: isTabScreen
              ? insets.bottom + rs(88)
              : insets.bottom + rs(24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Banner giới thiệu */}
        <View
          style={[
            styles.bannerCard,
            { padding: rs(16), borderRadius: rs(14) },
          ]}
        >
          <View
            style={[
              styles.bannerIconWrapper,
              { width: rs(44), height: rs(44), borderRadius: rs(22) },
            ]}
          >
            <DownloadCloud color="#1877F2" size={rs(24)} />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { fontSize: rs(15) }]}>
              Facebook Reels & Video Downloader
            </Text>
            <Text
              style={[
                styles.bannerDesc,
                { fontSize: rs(12), marginTop: rs(4) },
              ]}
            >
              Dán link video Facebook hoặc Reels để quét thông tin, xem trước hoặc tải file MP4 về máy.
            </Text>
          </View>
        </View>

        {/* Input Form */}
        <View style={[styles.inputSection, { marginTop: rs(16) }]}>
          <Text
            style={[
              styles.inputLabel,
              { fontSize: rs(13), marginBottom: rs(8) },
            ]}
          >
            Đường dẫn video hoặc Reels Facebook
          </Text>

          <View
            style={[
              styles.inputWrapper,
              { borderRadius: rs(18), minHeight: rs(50) },
            ]}
          >
            <TextInput
              value={inputUrl}
              onChangeText={setSessionInputUrl}
              placeholder="https://www.facebook.com/reel/..."
              placeholderTextColor={COLORS.inkMuted}
              style={[styles.textInput, { fontSize: rs(14) }]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="never"
            />
            {inputUrl.length > 0 ? (
              <Pressable
                onPress={handleClear}
                hitSlop={6}
                style={[
                  styles.clearBtn,
                  {
                    width: rs(28),
                    height: rs(28),
                    borderRadius: rs(14),
                    marginRight: rs(6),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Xóa đường dẫn"
              >
                <X color={COLORS.inkSoft} size={rs(16)} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handlePasteUrl}
              hitSlop={6}
              style={({ pressed }) => [
                styles.pasteBtn,
                {
                  paddingHorizontal: rs(12),
                  height: rs(34),
                  borderRadius: rs(12),
                  gap: rs(4),
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dán đường dẫn từ bộ nhớ tạm"
            >
              <ClipboardPaste color={COLORS.primary} size={rs(14)} />
              <Text style={[styles.pasteBtnText, { fontSize: rs(12) }]}>
                Dán link
              </Text>
            </Pressable>
          </View>

          {/* Nút Kiểm tra / Quét Video */}
          <Pressable
            onPress={handleCheckUrl}
            disabled={isExtracting || inputUrl.trim().length === 0}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.checkBtn,
              {
                height: rs(46),
                borderRadius: rs(12),
                marginTop: rs(12),
                opacity:
                  pressed || isExtracting || inputUrl.trim().length === 0
                    ? 0.75
                    : 1,
              },
            ]}
          >
            {isExtracting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Search color="#FFFFFF" size={rs(18)} />
            )}
            <Text
              style={[
                styles.btnText,
                { fontSize: rs(15), marginLeft: rs(8) },
              ]}
            >
              {isExtracting ? 'Đang quét thông tin...' : 'Kiểm tra & Lấy Video'}
            </Text>
          </Pressable>
        </View>

        {/* Thẻ Thông Tin Video Sau Khi Quét */}
        {videoInfo ? (
          <View
            style={[
              styles.resultCard,
              {
                marginTop: rs(20),
                padding: rs(16),
                borderRadius: rs(14),
              },
            ]}
          >
            <View style={[styles.resultHeader, { gap: rs(8) }]}>
              <Film color="#10B981" size={rs(20)} />
              <Text style={[styles.resultTitle, { fontSize: rs(15) }]}>
                Thông tin Video đã quét
              </Text>
            </View>

            {/* Chi tiết thông tin video */}
            <View
              style={[
                styles.infoBox,
                {
                  marginTop: rs(12),
                  padding: rs(12),
                  borderRadius: rs(10),
                  gap: rs(10),
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                  Tên file / Tiêu đề:
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.infoValueTitle, { fontSize: rs(13) }]}
                >
                  {activeItem?.fileName || `${videoInfo.title}.mp4`}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                  Định dạng & Chất lượng:
                </Text>
                <View style={[styles.qualityBadgeRow, { gap: rs(6) }]}>
                  <View
                    style={[
                      styles.qualityBadge,
                      {
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(2),
                        borderRadius: rs(6),
                      },
                    ]}
                  >
                    <Sparkles color="#60A5FA" size={rs(11)} />
                    <Text
                      style={[
                        styles.qualityBadgeText,
                        { fontSize: rs(11), marginLeft: rs(4) },
                      ]}
                    >
                      {videoInfo.quality} MP4
                    </Text>
                  </View>
                  {isDone && activeItem?.fileSize ? (
                    <Text style={[styles.fileSizeMeta, { fontSize: rs(12) }]}>
                      • {formatBytes(activeItem.fileSize)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                  Nguồn phát:
                </Text>
                <View style={[styles.linkPreviewRow, { gap: rs(4) }]}>
                  <Link2 color="#9CA3AF" size={rs(13)} />
                  <Text
                    numberOfLines={1}
                    style={[styles.infoValueUrl, { fontSize: rs(12) }]}
                  >
                    {videoInfo.videoUrl}
                  </Text>
                </View>
              </View>
            </View>

            {/* Thanh tiến trình tải (Hiện khi đang tải hoặc đã tải xong) */}
            {isDownloading || isDone ? (
              <View style={[styles.progressSection, { marginTop: rs(14) }]}>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressText, { fontSize: rs(12) }]}>
                    {isDone
                      ? 'Hoàn tất: 100%'
                      : `Đang tải xuống: ${downloadProgress}%`}
                  </Text>
                  <Text style={[styles.progressText, { fontSize: rs(12) }]}>
                    {formatBytes(downloadedBytes)} /{' '}
                    {totalBytes > 0 ? formatBytes(totalBytes) : '--'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressTrack,
                    {
                      height: rs(7),
                      borderRadius: rs(4),
                      marginTop: rs(6),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      isDone && styles.progressFillDone,
                      {
                        width: `${isDone ? 100 : downloadProgress}%`,
                        borderRadius: rs(4),
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            {/* Thông báo lỗi nếu bấm tải mà bị lỗi */}
            {isFailed ? (
              <View
                style={[
                  styles.errorBadge,
                  {
                    marginTop: rs(14),
                    padding: rs(10),
                    borderRadius: rs(8),
                  },
                ]}
              >
                <AlertCircle color="#EF4444" size={rs(18)} />
                <Text
                  style={[
                    styles.errorText,
                    { fontSize: rs(12), marginLeft: rs(8) },
                  ]}
                >
                  {activeItem?.errorMessage || 'Tải thất bại. Vui lòng thử lại.'}
                </Text>
              </View>
            ) : null}

            {/* Thông báo đã tải xong */}
            {isDone ? (
              <View
                style={[
                  styles.savedBadge,
                  {
                    marginTop: rs(12),
                    padding: rs(10),
                    borderRadius: rs(8),
                  },
                ]}
              >
                <CheckCircle2 color="#10B981" size={rs(18)} />
                <Text
                  style={[
                    styles.savedText,
                    { fontSize: rs(12), marginLeft: rs(8) },
                  ]}
                >
                  Đã lưu &quot;{activeItem?.fileName}&quot; vào mục Tải về!
                </Text>
              </View>
            ) : null}

            {/* 2 Button: View (Xem) và Download (Tải) */}
            <View
              style={[
                styles.buttonGroupRow,
                { marginTop: rs(16), gap: rs(10) },
              ]}
            >
              {/* Button View */}
              <Pressable
                onPress={handleViewVideo}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.viewBtn,
                  {
                    flex: 1,
                    height: rs(46),
                    borderRadius: rs(12),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Eye color="#FFFFFF" size={rs(18)} />
                <Text
                  style={[
                    styles.btnText,
                    { fontSize: rs(14), marginLeft: rs(8) },
                  ]}
                >
                  {isDone ? 'Xem bản đã tải' : 'Xem (View)'}
                </Text>
              </Pressable>

              {/* Button Download */}
              <Pressable
                onPress={handleDownload}
                disabled={isDownloading || isDone}
                style={({ pressed }) => [
                  styles.actionBtn,
                  isDone ? styles.downloadedBtn : styles.downloadBtn,
                  {
                    flex: 1,
                    height: rs(46),
                    borderRadius: rs(12),
                    opacity:
                      pressed || isDownloading || isDone ? 0.75 : 1,
                  },
                ]}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : isDone ? (
                  <CheckCircle2 color="#FFFFFF" size={rs(18)} />
                ) : isFailed ? (
                  <RotateCw color="#FFFFFF" size={rs(18)} />
                ) : (
                  <Download color="#FFFFFF" size={rs(18)} />
                )}
                <Text
                  style={[
                    styles.btnText,
                    { fontSize: rs(14), marginLeft: rs(8) },
                  ]}
                >
                  {isDownloading
                    ? `Đang tải (${downloadProgress}%)`
                    : isDone
                    ? 'Đã tải xong'
                    : isFailed
                    ? 'Tải lại'
                    : 'Tải về (Download)'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Hướng dẫn sử dụng */}
        <View
          style={[
            styles.guideBox,
            {
              marginTop: rs(24),
              padding: rs(14),
              borderRadius: rs(12),
            },
          ]}
        >
          <View style={[styles.guideHeader, { gap: rs(6) }]}>
            <AlertCircle color="#9CA3AF" size={rs(15)} />
            <Text style={[styles.guideTitle, { fontSize: rs(13) }]}>
              Lưu ý
            </Text>
          </View>
          <Text
            style={[
              styles.guideText,
              { fontSize: rs(12), marginTop: rs(6) },
            ]}
          >
            • Video / Reels phải được đặt ở chế độ công khai (Public).{'\n'}•
            Nhấn &quot;Xem (View)&quot; để phát trực tiếp hoặc &quot;Tải về
            (Download)&quot; để lưu vào bộ nhớ ứng dụng và xem ngoại tuyến tại
            màn hình Tải về.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.ink,
    fontWeight: '900',
  },
  scrollContent: {
    flexGrow: 1,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  bannerIconWrapper: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  bannerDesc: {
    color: COLORS.inkSoft,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputSection: {
    width: '100%',
  },
  inputLabel: {
    color: COLORS.inkSoft,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.borderStrong,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    color: COLORS.ink,
    fontWeight: '600',
    paddingVertical: 10,
  },
  clearBtn: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  pasteBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderBottomWidth: 4,
  },
  checkBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  viewBtn: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
    borderBottomColor: COLORS.secondaryDark,
  },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  downloadedBtn: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
    borderBottomColor: COLORS.secondaryDark,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'column',
    gap: 4,
  },
  infoLabel: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  infoValueTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  qualityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qualityBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  fileSizeMeta: {
    color: COLORS.success,
    fontWeight: '800',
  },
  linkPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValueUrl: {
    flex: 1,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  progressSection: {
    width: '100%',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressFillDone: {
    backgroundColor: COLORS.success,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  errorText: {
    color: COLORS.danger,
    fontWeight: '700',
    flex: 1,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successSoft,
    borderWidth: 1.5,
    borderColor: '#A9EFE6',
  },
  savedText: {
    color: COLORS.secondaryDark,
    fontWeight: '700',
    flex: 1,
  },
  buttonGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  guideText: {
    color: COLORS.inkSoft,
    fontWeight: '500',
    lineHeight: 19,
  },
});
