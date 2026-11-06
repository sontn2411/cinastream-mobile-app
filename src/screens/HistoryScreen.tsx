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
  History,
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
        resumeTime: item.currentTime,
      });
    },
    [navigation],
  );

  const handleRemoveOne = useCallback(
    (item: HistoryItem) => {
      showAppAlert(
        'Xóa lịch sử',
        `Bạn có muốn xóa "${item.movie.name}" khỏi lịch sử xem không?`,
        [
          { text: 'Hủy', style: 'cancel' },
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
      'Xóa tất cả lịch sử',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
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
      const thumbHeight = rs(74);

      return (
        <Pressable
          onPress={() => handleResumePlay(item)}
          style={({ pressed }) => [
            styles.card,
            {
              width: cardWidth,
              borderRadius: rs(12),
              padding: rs(10),
              gap: rs(12),
              opacity: pressed ? 0.88 : 1,
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
                borderRadius: rs(8),
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
                    width: rs(28),
                    height: rs(28),
                    borderRadius: rs(14),
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

            {/* Red progress bar at the bottom */}
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
                <Trash2 color="#9CA3AF" size={rs(15)} />
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
            <View style={[styles.metaRow, { gap: rs(8), marginTop: rs(4) }]}>
              <View
                style={[
                  styles.epBadge,
                  {
                    paddingHorizontal: rs(6),
                    paddingVertical: rs(2),
                    borderRadius: rs(4),
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
              <Clock color="#6B7280" size={rs(11)} />
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
            { width: rs(36), height: rs(36), borderRadius: rs(18) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ChevronLeft color="#FFFFFF" size={rs(22)} />
        </Pressable>

        <Text style={[styles.topHeaderTitle, { fontSize: rs(18) }]}>
          Lịch sử xem
        </Text>

        <View style={{ width: rs(36) }} />
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
              <Text style={[styles.headerTitle, { fontSize: rs(19) }]}>
                Lịch sử xem
              </Text>
              {history.length > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    {
                      paddingHorizontal: rs(8),
                      paddingVertical: rs(2),
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
                    paddingHorizontal: rs(10),
                    paddingVertical: rs(6),
                    borderRadius: rs(8),
                    gap: rs(4),
                  },
                ]}
              >
                <Trash2 color="#EF4444" size={rs(14)} />
                <Text style={[styles.clearAllText, { fontSize: rs(12) }]}>
                  Xóa tất cả
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
                paddingVertical: rs(60),
                paddingHorizontal: rs(24),
                gap: rs(14),
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                {
                  width: rs(80),
                  height: rs(80),
                  borderRadius: rs(40),
                },
              ]}
            >
              <History color={COLORS.primary} size={rs(38)} />
            </View>

            <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
              Chưa có lịch sử xem
            </Text>

            <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
              Các bộ phim bạn đã xem sẽ được lưu tại đây để bạn có thể xem tiếp
              bất cứ lúc nào!
            </Text>

            <Pressable
              onPress={handleGoExplore}
              style={[
                styles.exploreBtn,
                {
                  marginTop: rs(8),
                  height: rs(44),
                  paddingHorizontal: rs(22),
                  borderRadius: rs(22),
                  gap: rs(8),
                },
              ]}
            >
              <Compass color="#FFFFFF" size={rs(18)} />
              <Text style={[styles.exploreBtnText, { fontSize: rs(14) }]}>
                Khám phá ngay
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
    backgroundColor: '#0B0C10',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    backgroundColor: '#1E202B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeaderTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  countBadgeText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  clearAllText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#14151C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  thumbWrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E202B',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    backgroundColor: '#2A2D3A',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 6,
  },
  deleteBtn: {
    padding: 2,
  },
  originName: {
    color: '#8A8F9E',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  epBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  epBadgeText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  timeText: {
    color: '#9CA3AF',
  },
  relativeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relativeTimeText: {
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  emptyIconCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
