import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Download,
  Pause,
  Play,
  RotateCw,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import {
  DownloadEpisodeItem,
  groupDownloadsByMovie,
  MovieDownloadGroup,
  useDownloadStore,
} from '../store/useDownloadStore';
import { MovieItem } from '../types/movie';
import { getImageSrc } from '../utils/image';
import { useResponsive } from '../utils/responsive';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  if (mb >= 10) {
    return `${Math.round(mb)} MB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function extractEpisodeNumberBadge(
  episodeName: string,
  episodeIndex: number,
): string {
  const match = episodeName.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : episodeIndex + 1;
  return String(num).padStart(2, '0');
}

function formatEpisodeTitle(episodeName: string, episodeIndex: number): string {
  const trimmed = episodeName.trim();
  if (!trimmed) {
    return `Tập ${episodeIndex + 1}`;
  }
  if (/^tập\s/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `Tập ${parseInt(trimmed, 10)}`;
  }
  return trimmed;
}

function getLanguageBadges(
  movie: MovieItem,
  episodes: DownloadEpisodeItem[],
): { hasVietsub: boolean; hasThuyetMinh: boolean; hasLongTieng: boolean } {
  const combined = `${movie.lang || ''} ${episodes
    .map(e => e.serverName)
    .join(' ')}`.toLowerCase();

  const hasVietsub =
    combined.includes('vietsub') ||
    combined.includes('phụ đề') ||
    (!combined.includes('thuyết minh') && !combined.includes('lồng tiếng'));
  const hasThuyetMinh =
    combined.includes('thuyết minh') || combined.includes('thuyet minh');
  const hasLongTieng =
    combined.includes('lồng tiếng') || combined.includes('long tieng');

  return { hasVietsub, hasThuyetMinh, hasLongTieng };
}

function getMovieSeriesLabel(movie: MovieItem, totalEpisodes: number): string {
  if (
    movie.type === 'series' ||
    movie.type === 'tvshows' ||
    movie.type === 'hoathinh' ||
    totalEpisodes > 1
  ) {
    return 'TV Series';
  }
  return 'Movie';
}

function getQualityBadgeText(
  movie: MovieItem,
  episodes: DownloadEpisodeItem[],
): string {
  for (const ep of episodes) {
    if (ep.detectedQuality) {
      return ep.detectedQuality.toUpperCase();
    }
  }
  if (movie.quality) {
    const q = movie.quality.toUpperCase();
    if (q === 'FHD' || q === 'FULLHD' || q === 'HD') {
      return '1080P';
    }
    return q;
  }
  return '1080P';
}

const keyExtractor = (item: MovieDownloadGroup) => item.movieSlug;

export default function DownloadScreen() {
  const { rs } = useResponsive();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList & BottomTabParamList>
    >();

  const downloads = useDownloadStore(state => state.downloads);
  const pauseDownload = useDownloadStore(state => state.pauseDownload);
  const resumeDownload = useDownloadStore(state => state.resumeDownload);
  const removeDownload = useDownloadStore(state => state.removeDownload);
  const clearAllDownloads = useDownloadStore(state => state.clearAllDownloads);

  // Track collapsed movie slugs (by default all movie cards are expanded like the screenshot)
  const [collapsedSlugs, setCollapsedSlugs] = useState<Record<string, boolean>>(
    {},
  );

  const movieGroups = useMemo(
    () => groupDownloadsByMovie(downloads),
    [downloads],
  );

  const topOffset =
    (headerHeight > 0 ? headerHeight : insets.top + rs(64)) + rs(16);
  const horizontalPad = rs(14);

  const toggleExpandMovie = useCallback((movieSlug: string) => {
    setCollapsedSlugs(prev => ({
      ...prev,
      [movieSlug]: !prev[movieSlug],
    }));
  }, []);

  const handlePressEpisodeAction = useCallback(
    (ep: DownloadEpisodeItem) => {
      if (ep.status === 'completed') {
        navigation.navigate('MovieDetail', {
          slug: ep.movie.slug,
          movie: ep.movie,
          resumeEpisodeIndex: ep.episodeIndex,
          resumeServerIndex: ep.serverIndex,
          localUri: ep.localManifestPath,
        });
        return;
      }
      if (ep.status === 'downloading' || ep.status === 'queued') {
        pauseDownload(ep.id);
        return;
      }
      // paused or failed -> resume/retry
      resumeDownload(ep.id);
    },
    [navigation, pauseDownload, resumeDownload],
  );

  const handleDeleteEpisode = useCallback(
    (ep: DownloadEpisodeItem) => {
      const title = formatEpisodeTitle(ep.episodeName, ep.episodeIndex);
      Alert.alert(
        'Xóa tập đã tải',
        `Bạn có muốn xóa "${title}" của phim "${ep.movie.name}" và giải phóng dung lượng bộ nhớ không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => {
              removeDownload(ep.id);
            },
          },
        ],
      );
    },
    [removeDownload],
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Xóa tất cả video tải về',
      'Toàn bộ các tập phim đã tải và đang tải sẽ bị xóa sạch khỏi bộ nhớ thiết bị. Bạn có chắc chắn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => {
            clearAllDownloads();
          },
        },
      ],
    );
  }, [clearAllDownloads]);

  const handleGoExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const renderGroupItem = useCallback(
    ({ item: group }: ListRenderItemInfo<MovieDownloadGroup>) => {
      const isCollapsed = Boolean(collapsedSlugs[group.movieSlug]);
      const posterUri =
        group.localPosterPath ||
        getImageSrc(group.movie.poster_url || group.movie.thumb_url);
      const { hasVietsub, hasThuyetMinh, hasLongTieng } = getLanguageBadges(
        group.movie,
        group.episodes,
      );
      const qualityText = getQualityBadgeText(group.movie, group.episodes);
      const seriesLabel = getMovieSeriesLabel(group.movie, group.totalEpisodes);

      return (
        <View
          style={[
            styles.movieCard,
            {
              borderRadius: rs(16),
              padding: rs(14),
              gap: rs(14),
            },
          ]}
        >
          {/* 1. Header Thẻ Phim */}
          <Pressable
            onPress={() => toggleExpandMovie(group.movieSlug)}
            style={[styles.movieHeaderRow, { gap: rs(12) }]}
          >
            {/* Poster bên trái kèm badge số tập */}
            <View
              style={[
                styles.posterWrapper,
                {
                  width: rs(72),
                  height: rs(96),
                  borderRadius: rs(10),
                },
              ]}
            >
              {posterUri ? (
                <Image
                  source={{ uri: posterUri }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.posterImage, styles.posterPlaceholder]} />
              )}
              <View
                style={[
                  styles.posterEpBadge,
                  {
                    right: rs(4),
                    bottom: rs(4),
                    paddingHorizontal: rs(6),
                    paddingVertical: rs(2),
                    borderRadius: rs(5),
                  },
                ]}
              >
                <Text style={[styles.posterEpBadgeText, { fontSize: rs(10) }]}>
                  {group.totalEpisodes} tập
                </Text>
              </View>
            </View>

            {/* Thông tin phim ở giữa */}
            <View style={[styles.movieHeaderInfo, { gap: rs(6) }]}>
              <Text
                numberOfLines={2}
                style={[styles.movieTitle, { fontSize: rs(17) }]}
              >
                {group.movie.name}
              </Text>

              {/* Hàng nhãn: Vietsub | Thuyết minh | 1080P */}
              <View style={[styles.badgeRow, { gap: rs(6) }]}>
                {hasVietsub ? (
                  <View
                    style={[
                      styles.vietsubPill,
                      {
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(3),
                        borderRadius: rs(6),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.vietsubPillText, { fontSize: rs(11) }]}
                    >
                      Vietsub
                    </Text>
                  </View>
                ) : null}

                {hasThuyetMinh ? (
                  <View
                    style={[
                      styles.thuyetMinhPill,
                      {
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(3),
                        borderRadius: rs(6),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.thuyetMinhPillText, { fontSize: rs(11) }]}
                    >
                      Thuyết minh
                    </Text>
                  </View>
                ) : null}

                {hasLongTieng && !hasThuyetMinh ? (
                  <View
                    style={[
                      styles.thuyetMinhPill,
                      {
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(3),
                        borderRadius: rs(6),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.thuyetMinhPillText, { fontSize: rs(11) }]}
                    >
                      Lồng tiếng
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.qualityText, { fontSize: rs(12) }]}>
                  {qualityText}
                </Text>
              </View>

              {/* Dòng thông số: 4 tập • 3.2 GB • TV Series */}
              <Text
                numberOfLines={1}
                style={[styles.summaryMetaText, { fontSize: rs(12) }]}
              >
                {`${group.totalEpisodes} tập • ${formatBytes(
                  group.totalBytes,
                )} • ${seriesLabel}`}
              </Text>
            </View>

            {/* Nút Chevron Đóng/Mở */}
            <Pressable
              onPress={() => toggleExpandMovie(group.movieSlug)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                isCollapsed ? 'Mở rộng danh sách tập' : 'Thu gọn danh sách tập'
              }
              style={[
                styles.chevronCircle,
                {
                  width: rs(34),
                  height: rs(34),
                  borderRadius: rs(17),
                },
              ]}
            >
              {isCollapsed ? (
                <ChevronDown color="#D1D5DB" size={rs(18)} />
              ) : (
                <ChevronUp color="#D1D5DB" size={rs(18)} />
              )}
            </Pressable>
          </Pressable>

          {/* 2. Danh sách các Tập bên dưới */}
          {!isCollapsed ? (
            <View style={{ gap: rs(10) }}>
              {group.episodes.map((ep, idx) => {
                const epBadgeNum = extractEpisodeNumberBadge(
                  ep.episodeName,
                  ep.episodeIndex,
                );
                const epTitle = formatEpisodeTitle(
                  ep.episodeName,
                  ep.episodeIndex,
                );
                const isFirstHighlight = idx === 0;

                return (
                  <Pressable
                    key={ep.id}
                    onPress={() => handlePressEpisodeAction(ep)}
                    style={({ pressed }) => [
                      styles.episodeRow,
                      {
                        borderRadius: rs(12),
                        paddingHorizontal: rs(12),
                        paddingVertical: rs(11),
                        gap: rs(12),
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {/* Ô số thứ tự tập (01, 02, 03...) */}
                    <View
                      style={[
                        styles.epNumBox,
                        {
                          width: rs(40),
                          height: rs(40),
                          borderRadius: rs(10),
                        },
                        isFirstHighlight
                          ? styles.epNumBoxActive
                          : styles.epNumBoxDefault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.epNumText,
                          { fontSize: rs(13) },
                          isFirstHighlight
                            ? styles.epNumTextActive
                            : styles.epNumTextDefault,
                        ]}
                      >
                        {epBadgeNum}
                      </Text>
                    </View>

                    {/* Cột thông tin tập */}
                    <View style={[styles.epInfoCol, { gap: rs(4) }]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.epTitleText, { fontSize: rs(14) }]}
                      >
                        {epTitle}
                      </Text>

                      {ep.status === 'completed' ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.epSubMetaText, { fontSize: rs(12) }]}
                        >
                          {`${formatBytes(ep.downloadedBytes)}${
                            ep.durationMinutes > 0
                              ? ` • ${ep.durationMinutes} phút`
                              : ''
                          }`}
                        </Text>
                      ) : ep.status === 'downloading' ? (
                        <View style={{ gap: rs(4) }}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.epDownloadingText,
                              { fontSize: rs(11) },
                            ]}
                          >
                            {`Đang tải ${ep.progress}% • ${formatBytes(
                              ep.downloadedBytes,
                            )}${
                              ep.durationMinutes > 0
                                ? ` • ${ep.durationMinutes} phút`
                                : ''
                            }`}
                          </Text>
                          <View style={styles.epProgressTrack}>
                            <View
                              style={[
                                styles.epProgressFill,
                                { width: `${ep.progress}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ) : ep.status === 'paused' ? (
                        <View style={{ gap: rs(4) }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.epPausedText, { fontSize: rs(11) }]}
                          >
                            {`Tạm dừng (${ep.progress}%) • ${formatBytes(
                              ep.downloadedBytes,
                            )} • Bấm để tiếp tục`}
                          </Text>
                          <View style={styles.epProgressTrack}>
                            <View
                              style={[
                                styles.epProgressFillPaused,
                                { width: `${ep.progress}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ) : ep.status === 'queued' ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.epQueuedText, { fontSize: rs(11) }]}
                        >
                          Đang chờ trong hàng đợi...
                        </Text>
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={[styles.epFailedText, { fontSize: rs(11) }]}
                        >
                          Tải lỗi (Đã dọn file tạm) • Bấm để thử lại
                        </Text>
                      )}
                    </View>

                    {/* Cụm 2 nút tròn bên phải: Play/Pause (Đỏ) + Xóa (Xám) */}
                    <View style={[styles.epActionBtns, { gap: rs(8) }]}>
                      <Pressable
                        onPress={() => handlePressEpisodeAction(ep)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={
                          ep.status === 'completed'
                            ? `Phát ${epTitle}`
                            : ep.status === 'downloading'
                            ? 'Tạm dừng tải'
                            : ep.status === 'queued'
                            ? 'Tạm dừng'
                            : 'Tiếp tục tải'
                        }
                        style={[
                          styles.playCircleBtn,
                          {
                            width: rs(38),
                            height: rs(38),
                            borderRadius: rs(19),
                          },
                        ]}
                      >
                        {ep.status === 'downloading' ? (
                          <Pause color="#FFFFFF" fill="#FFFFFF" size={rs(15)} />
                        ) : ep.status === 'queued' ? (
                          <Clock color="#FFFFFF" size={rs(15)} />
                        ) : ep.status === 'failed' ? (
                          <RotateCw color="#FFFFFF" size={rs(15)} />
                        ) : (
                          <Play
                            color="#FFFFFF"
                            fill="#FFFFFF"
                            size={rs(15)}
                            style={{ marginLeft: 2 }}
                          />
                        )}
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteEpisode(ep)}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Xóa ${epTitle}`}
                        style={[
                          styles.deleteCircleBtn,
                          {
                            width: rs(38),
                            height: rs(38),
                            borderRadius: rs(19),
                          },
                        ]}
                      >
                        <Trash2 color="#EF4444" size={rs(16)} />
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      );
    },
    [
      collapsedSlugs,
      handleDeleteEpisode,
      handlePressEpisodeAction,
      rs,
      toggleExpandMovie,
    ],
  );

  const renderItemSeparator = useCallback(
    () => <View style={{ height: rs(14) }} />,
    [rs],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={movieGroups}
        keyExtractor={keyExtractor}
        renderItem={renderGroupItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topOffset,
          paddingBottom: rs(96),
          paddingHorizontal: horizontalPad,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={renderItemSeparator}
        ListHeaderComponent={
          <View style={[styles.headerContainer, { marginBottom: rs(16) }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { fontSize: rs(19) }]}>
                Tải về
              </Text>
              {downloads.length > 0 ? (
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
                    {downloads.length} tập
                  </Text>
                </View>
              ) : null}
            </View>

            {downloads.length > 0 ? (
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
              <Download color={COLORS.primary} size={rs(38)} />
            </View>

            <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
              Chưa có phim tải về
            </Text>

            <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
              Nhấn vào biểu tượng Tải về tại màn hình chi tiết phim để lưu các
              tập phim yêu thích và thưởng thức mượt mà mọi lúc!
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
  movieCard: {
    backgroundColor: '#13141C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  movieHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterWrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E202B',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: '#252836',
  },
  posterEpBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(11, 12, 16, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  posterEpBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  movieHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  vietsubPill: {
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
  },
  vietsubPillText: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  thuyetMinhPill: {
    backgroundColor: 'rgba(217, 119, 6, 0.22)',
  },
  thuyetMinhPillText: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  qualityText: {
    color: '#9CA3AF',
    fontWeight: '700',
  },
  summaryMetaText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  chevronCircle: {
    backgroundColor: '#1E202B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181A24',
  },
  epNumBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  epNumBoxActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.24)',
  },
  epNumBoxDefault: {
    backgroundColor: '#232634',
  },
  epNumText: {
    fontWeight: '800',
  },
  epNumTextActive: {
    color: '#FCA5A5',
  },
  epNumTextDefault: {
    color: '#D1D5DB',
  },
  epInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  epTitleText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  epSubMetaText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  epDownloadingText: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  epPausedText: {
    color: '#FBBF24',
    fontWeight: '600',
  },
  epQueuedText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  epFailedText: {
    color: '#F87171',
    fontWeight: '600',
  },
  epProgressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  epProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  epProgressFillPaused: {
    height: '100%',
    backgroundColor: '#FBBF24',
  },
  epActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playCircleBtn: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCircleBtn: {
    backgroundColor: '#252836',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
