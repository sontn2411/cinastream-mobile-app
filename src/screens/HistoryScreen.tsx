import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Clock,
  Compass,
  Play,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { showAppAlert } from '../store/useDialogStore';
import { HistoryItem, useHistoryStore } from '../store/useHistoryStore';
import { getImageSrc } from '../utils/image';
import { useResponsive } from '../utils/responsive';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) {
    return 'Vừa xong';
  }
  if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)} phút trước`;
  }
  if (diffSec < 86400) {
    return `${Math.floor(diffSec / 3600)} giờ trước`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days < 7) {
    return `${days} ngày trước`;
  }
  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`;
}

const keyExtractor = (item: HistoryItem) =>
  `${item.movie.slug}-${item.episodeSlug || item.episodeIndex}`;

export default function HistoryScreen() {
  const { width, isTablet, rs } = useResponsive();
  const insets = useSafeAreaInsets();

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList & BottomTabParamList>>();

  const history = useHistoryStore(state => state.history);
  const removeHistory = useHistoryStore(state => state.removeHistory);
  const clearHistory = useHistoryStore(state => state.clearHistory);

  const numColumns = isTablet ? 2 : 1;
  const horizontalPad = rs(14);
  const gap = rs(12);
  const cardWidth = Math.floor(
    (width - horizontalPad * 2 - gap * (numColumns - 1)) / numColumns,
  );

  const topOffset = rs(16);

  const handleResumePlay = useCallback(
    (item: HistoryItem) => {
      navigation.navigate('MovieDetail', {
        slug: item.movie.slug,
        movie: item.movie,
        resumeEpisodeIndex: item.episodeIndex,
        resumeServerIndex: item.serverIndex,
        resumeTime: item.currentTime,
      });
    },
    [navigation],
  );

  const handleRemoveOne = useCallback(
    (item: HistoryItem) => {
      showAppAlert(
        'Xóa lịch sử xem',
        `Bạn có muốn xóa "${item.movie.name}" khỏi nhật ký xem phim không?`,
        [
          { text: 'Giữ lại', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => removeHistory(item.movie.slug),
          },
        ],
      );
    },
    [removeHistory],
  );

  const handleClearAll = useCallback(() => {
    showAppAlert(
      'Xóa toàn bộ nhật ký',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa hết',
          style: 'destructive',
          onPress: clearHistory,
        },
      ],
    );
  }, [clearHistory]);

  const handleGoExplore = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<HistoryItem>) => {
      const thumbUri = getImageSrc(
        item.movie.thumb_url || item.movie.poster_url,
      );
      const progressPercent =
        item.duration > 0
          ? Math.min(100, Math.round((item.currentTime / item.duration) * 100))
          : 0;

      const thumbWidth = rs(116);
      const thumbHeight = rs(76);

      return (
        <Pressable
          onPress={() => handleResumePlay(item)}
          style={({ pressed }) => [
            styles.card,
            {
              width: cardWidth,
              borderRadius: rs(18),
              padding: rs(10),
              gap: rs(12),
              transform: [{ translateY: pressed ? 2 : 0 }],
            },
          ]}
        >
          {/* Thumbnail kèm progress bar */}
          <View
            style={[
              styles.thumbWrapper,
              {
                width: thumbWidth,
                height: thumbHeight,
                borderRadius: rs(12),
              },
            ]}
          >
            {thumbUri ? (
              <Image
                source={{ uri: thumbUri }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumbImage, styles.placeholderThumb]} />
            )}

            {/* Play button overlay */}
            <View style={styles.playOverlay}>
              <View
                style={[
                  styles.playCircle,
                  {
                    width: rs(30),
                    height: rs(30),
                    borderRadius: rs(15),
                  },
                ]}
              >
                <Play
                  color="#FFFFFF"
                  fill="#FFFFFF"
                  size={rs(12)}
                  style={styles.playIconOffset}
                />
              </View>
            </View>

            {/* Strawberry progress bar at the bottom */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Info Column */}
          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                style={[styles.movieTitle, { fontSize: rs(14) }]}
              >
                {item.movie.name}
              </Text>
              <Pressable
                onPress={() => handleRemoveOne(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Xóa mục này khỏi lịch sử"
                style={styles.deleteBtn}
              >
                <Trash2 color={COLORS.danger} size={rs(15)} />
              </Pressable>
            </View>

            {item.movie.origin_name ? (
              <Text
                numberOfLines={1}
                style={[styles.originName, { fontSize: rs(11) }]}
              >
                {item.movie.origin_name}
              </Text>
            ) : null}

            {/* Episode badge & time watched */}
            <View style={[styles.metaRow, { gap: rs(8), marginTop: rs(5) }]}>
              <View
                style={[
                  styles.epBadge,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(2.5),
                    borderRadius: rs(8),
                  },
                ]}
              >
                <Text style={[styles.epBadgeText, { fontSize: rs(10) }]}>
                  {item.episodeName || 'Đang xem'}
                </Text>
              </View>

              {item.currentTime > 0 ? (
                <Text style={[styles.timeText, { fontSize: rs(11) }]}>
                  {formatTime(item.currentTime)}
                  {item.duration > 0 ? ` / ${formatTime(item.duration)}` : ''}
                </Text>
              ) : null}
            </View>

            {/* Relative updated timestamp */}
            <View style={[styles.relativeTimeRow, { gap: rs(4), marginTop: rs(4) }]}>
              <Clock color={COLORS.inkMuted} size={rs(11)} />
              <Text style={[styles.relativeTimeText, { fontSize: rs(10) }]}>
                {formatRelativeTime(item.updatedAt)}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [cardWidth, handleResumePlay, handleRemoveOne, rs],
  );

  const contentContainerStyle = useMemo(
    () => [
      styles.contentContainer,
      {
        paddingTop: topOffset,
        paddingBottom: rs(88),
        paddingHorizontal: horizontalPad,
        flexGrow: 1,
      },
    ],
    [topOffset, rs, horizontalPad],
  );

  const columnWrapperStyle = useMemo(
    () =>
      numColumns > 1 && history.length > 0
        ? {
            gap,
            marginBottom: gap,
          }
        : undefined,
    [numColumns, history.length, gap],
  );

  const renderItemSeparator = useCallback(
    () => <View style={{ height: gap }} />,
    [gap],
  );

  return (
    <View style={styles.container}>
      {/* Top Bar Header */}
      <View
        style={[
          styles.topHeader,
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
            { width: rs(38), height: rs(38), borderRadius: rs(19) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ChevronLeft color={COLORS.ink} size={rs(22)} />
        </Pressable>

        <Text style={[styles.topHeaderTitle, { fontSize: rs(18) }]}>
          Nhật ký xem phim
        </Text>

        <View style={{ width: rs(38) }} />
      </View>

      <FlatList
        key={`history-grid-${numColumns}`}
        data={history}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        columnWrapperStyle={columnWrapperStyle}
        ItemSeparatorComponent={
          numColumns === 1 ? renderItemSeparator : undefined
        }
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View style={[styles.headerContainer, { marginBottom: rs(16) }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { fontSize: rs(18) }]}>
                Phim đang xem dở
              </Text>
              {history.length > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    {
                      paddingHorizontal: rs(9),
                      paddingVertical: rs(2.5),
                      borderRadius: rs(12),
                    },
                  ]}
                >
                  <Text style={[styles.countBadgeText, { fontSize: rs(11) }]}>
                    {history.length} phim
                  </Text>
                </View>
              ) : null}
            </View>

            {history.length > 0 ? (
              <Pressable
                onPress={handleClearAll}
                hitSlop={8}
                style={[
                  styles.clearAllBtn,
                  {
                    paddingHorizontal: rs(11),
                    paddingVertical: rs(6.5),
                    borderRadius: rs(14),
                    gap: rs(4),
                  },
                ]}
              >
                <Trash2 color={COLORS.danger} size={rs(14)} />
                <Text style={[styles.clearAllText, { fontSize: rs(12) }]}>
                  Xóa hết
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.emptyContainer,
              {
                paddingVertical: rs(52),
                paddingHorizontal: rs(24),
                gap: rs(12),
              },
            ]}
          >
            <View
              style={[
                styles.emptyStickerCircle,
                {
                  paddingHorizontal: rs(20),
                  paddingVertical: rs(14),
                  borderRadius: rs(28),
                },
              ]}
            >
              <Text style={[styles.kaomojiText, { fontSize: rs(24) }]}>
                (◕‿◕✿)
              </Text>
            </View>

            <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
              Nhật ký xem phim còn trống
            </Text>

            <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
              Những tập phim bạn đã xem sẽ được ghi nhớ từng phút tại đây để
              bạn xem tiếp bất cứ lúc nào!
            </Text>

            <Pressable
              onPress={handleGoExplore}
              style={({ pressed }) => [
                styles.exploreBtn,
                {
                  marginTop: rs(8),
                  height: rs(46),
                  paddingHorizontal: rs(22),
                  borderRadius: rs(23),
                  gap: rs(8),
                  transform: [{ translateY: pressed ? 2 : 0 }],
                },
              ]}
            >
              <Compass color="#FFFFFF" size={rs(18)} />
              <Text style={[styles.exploreBtnText, { fontSize: rs(14) }]}>
                Chọn phim xem ngay
              </Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
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
  topHeaderTitle: {
    color: COLORS.ink,
    fontWeight: '900',
  },
  contentContainer: {},
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  countBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  clearAllText: {
    color: COLORS.danger,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
  },
  thumbWrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    backgroundColor: COLORS.surface,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74, 46, 53, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movieTitle: {
    flex: 1,
    fontWeight: '800',
    color: COLORS.ink,
    marginRight: 6,
  },
  deleteBtn: {
    padding: 2,
  },
  originName: {
    color: COLORS.inkMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  epBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  epBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  timeText: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  relativeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relativeTimeText: {
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  emptyStickerCircle: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kaomojiText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyTitle: {
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.inkSoft,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primaryDark,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
