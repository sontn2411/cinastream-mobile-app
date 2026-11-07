import React, { useCallback, useMemo, useState } from 'react';
import {
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
  DownloadCloud,
  Film,
  Pause,
  Play,
  RotateCw,
  Trash2,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { FacebookDownloadCard } from '../components/FacebookDownloadCard';
import {
  DownloadEpisodeItem,
  groupDownloadsByMovie,
  MovieDownloadGroup,
  useDownloadStore,
} from '../store/useDownloadStore';
import { showAppAlert } from '../store/useDialogStore';
import { useFbDownloadStore, FbDownloadItem } from '../store/useFbDownloadStore';
import { MovieItem } from '../types/movie';
import { formatBytes } from '../utils/format';
import { getImageSrc } from '../utils/image';
import { useResponsive } from '../utils/responsive';

export { formatBytes };

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

  const fbDownloads = useFbDownloadStore(state => state.fbDownloads);
  const retryFbDownload = useFbDownloadStore(state => state.retryFbDownload);
  const removeFbDownload = useFbDownloadStore(state => state.removeFbDownload);
  const [activeTab, setActiveTab] = useState<'movie' | 'facebook'>('movie');

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
      showAppAlert(
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
    if (activeTab === 'facebook') {
      showAppAlert(
        'Xóa tất cả video Facebook',
        'Toàn bộ các video Facebook đã tải sẽ bị xóa khỏi bộ nhớ thiết bị. Bạn có chắc chắn không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa tất cả',
            style: 'destructive',
            onPress: () => {
              useFbDownloadStore.getState().clearAllFbDownloads();
            },
          },
        ],
      );
      return;
    }

    showAppAlert(
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
  }, [activeTab, clearAllDownloads]);

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
                <ChevronDown color={COLORS.ink} size={rs(18)} />
              ) : (
                <ChevronUp color={COLORS.ink} size={rs(18)} />
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
                            style={styles.playIconOffset}
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

  const handleDeleteFbItem = useCallback(
    (item: FbDownloadItem) => {
      showAppAlert(
        'Xóa video Facebook',
        `Bạn có muốn xóa video "${item.fileName}" và giải phóng bộ nhớ không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => {
              removeFbDownload(item.id);
            },
          },
        ],
      );
    },
    [removeFbDownload],
  );

  const handlePlayFbVideo = useCallback(
    (item: FbDownloadItem) => {
      if (item.status === 'completed' && item.localFilePath) {
        navigation.navigate('LocalVideoPlayer', {
          title: item.title || item.fileName,
          uri: item.localFilePath,
        });
      }
    },
    [navigation],
  );

  const handleRetryFbVideo = useCallback(
    (item: FbDownloadItem) => {
      retryFbDownload(item.id);
    },
    [retryFbDownload],
  );

  const renderFbItem = useCallback(
    ({ item }: ListRenderItemInfo<FbDownloadItem>) => (
      <FacebookDownloadCard
        item={item}
        onPlay={handlePlayFbVideo}
        onRetry={handleRetryFbVideo}
        onDelete={handleDeleteFbItem}
        rs={rs}
      />
    ),
    [handleDeleteFbItem, handlePlayFbVideo, handleRetryFbVideo, rs],
  );

  const renderItemSeparator = useCallback(
    () => <View style={{ height: rs(14) }} />,
    [rs],
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: topOffset,
      paddingBottom: rs(96),
      paddingHorizontal: horizontalPad,
      flexGrow: 1,
    }),
    [topOffset, rs, horizontalPad],
  );

  const isMovieTab = activeTab === 'movie';
  const validFbDownloads = fbDownloads.filter(
    d => d.status === 'downloading' || (d.status === 'completed' && d.fileSize > 0),
  );
  const currentCount = isMovieTab ? downloads.length : validFbDownloads.length;

  return (
    <View style={styles.container}>
      <FlatList
        data={isMovieTab ? (movieGroups as unknown[]) : (validFbDownloads as unknown[])}
        keyExtractor={item => {
          if (isMovieTab) {
            return keyExtractor(item as MovieDownloadGroup);
          }
          return (item as FbDownloadItem).id;
        }}
        renderItem={
          isMovieTab
            ? (renderGroupItem as unknown as (info: ListRenderItemInfo<unknown>) => React.ReactElement | null)
            : (renderFbItem as unknown as (info: ListRenderItemInfo<unknown>) => React.ReactElement | null)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        ItemSeparatorComponent={renderItemSeparator}
        ListHeaderComponent={
          <View style={{ marginBottom: rs(16) }}>
            <View style={[styles.headerContainer, { marginBottom: rs(12) }]}>
              <View style={styles.headerLeft}>
                <Text style={[styles.headerTitle, { fontSize: rs(19) }]}>
                  Tải về
                </Text>
                {currentCount > 0 ? (
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
                      {isMovieTab ? `${currentCount} tập` : `${currentCount} video`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {currentCount > 0 ? (
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

            {/* Tabs Switch: Phim & Facebook */}
            <View style={[styles.tabSegmentContainer, { borderRadius: rs(18), padding: rs(4) }]}>
              <Pressable
                onPress={() => setActiveTab('movie')}
                style={[
                  styles.tabSegmentBtn,
                  { paddingVertical: rs(8), borderRadius: rs(14), gap: rs(6) },
                  isMovieTab && styles.tabSegmentBtnActive,
                ]}
              >
                <Film color={isMovieTab ? '#FFFFFF' : COLORS.inkSoft} size={rs(15)} />
                <Text style={[styles.tabSegmentText, isMovieTab && styles.tabSegmentTextActive, { fontSize: rs(13) }]}>
                  Phim ({downloads.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('facebook')}
                style={[
                  styles.tabSegmentBtn,
                  { paddingVertical: rs(8), borderRadius: rs(14), gap: rs(6) },
                  !isMovieTab && styles.tabSegmentBtnActive,
                ]}
              >
                <DownloadCloud color={!isMovieTab ? '#FFFFFF' : COLORS.inkSoft} size={rs(15)} />
                <Text style={[styles.tabSegmentText, !isMovieTab && styles.tabSegmentTextActive, { fontSize: rs(13) }]}>
                  Facebook ({validFbDownloads.length})
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          isMovieTab ? (
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
          ) : (
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
                  styles.fbEmptyIconCircle,
                  {
                    width: rs(80),
                    height: rs(80),
                    borderRadius: rs(40),
                  },
                ]}
              >
                <DownloadCloud color="#1877F2" size={rs(38)} />
              </View>

              <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
                Chưa có video Facebook tải về
              </Text>

              <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
                Mở tab Facebook để dán link reel hoặc clip yêu thích cần tải về!
              </Text>

              <Pressable
                onPress={() => navigation.navigate('Facebook')}
                style={[
                  styles.exploreBtn,
                  styles.fbExploreBtn,
                  {
                    marginTop: rs(8),
                    height: rs(44),
                    paddingHorizontal: rs(22),
                    borderRadius: rs(22),
                    gap: rs(8),
                  },
                ]}
              >
                <DownloadCloud color="#FFFFFF" size={rs(18)} />
                <Text style={[styles.exploreBtnText, { fontSize: rs(14) }]}>
                  Đến trang tải Facebook
                </Text>
              </Pressable>
            </View>
          )
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
  movieCard: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  movieHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterWrapper: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: COLORS.surface,
  },
  posterEpBadge: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: '#FFFFFF',
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
    color: COLORS.ink,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  vietsubPill: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vietsubPillText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  thuyetMinhPill: {
    backgroundColor: COLORS.secondarySoft,
    borderWidth: 1,
    borderColor: '#A9EFE6',
  },
  thuyetMinhPillText: {
    color: COLORS.secondaryDark,
    fontWeight: '800',
  },
  qualityText: {
    color: COLORS.inkSoft,
    fontWeight: '800',
  },
  summaryMetaText: {
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  chevronCircle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  epNumBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  epNumBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  epNumBoxDefault: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  epNumText: {
    fontWeight: '800',
  },
  epNumTextActive: {
    color: '#FFFFFF',
  },
  epNumTextDefault: {
    color: COLORS.ink,
  },
  epInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  epTitleText: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  epSubMetaText: {
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
  epDownloadingText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  epPausedText: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  epQueuedText: {
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  epFailedText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  epProgressTrack: {
    height: 5,
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  epProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  epProgressFillPaused: {
    height: '100%',
    backgroundColor: COLORS.warning,
  },
  epActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playCircleBtn: {
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCircleBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
  playIconOffset: {
    marginLeft: 2,
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
  tabSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.borderStrong,
  },
  tabSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabSegmentText: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  tabSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  fbEmptyIconCircle: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  fbExploreBtn: {
    backgroundColor: COLORS.primary,
  },
});
