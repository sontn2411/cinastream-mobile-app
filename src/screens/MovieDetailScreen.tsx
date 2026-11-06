import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Clock,
  Download,
  Globe,
  Heart,
  Pause,
  Play,
  Share2,
  Star,
} from 'lucide-react-native';
import VideoPlayer from '../components/VideoPlayer';
import { DownloadPickerModal } from '../components/DownloadPickerModal';
import { EpisodeSelector } from '../components/EpisodeSelector';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { fetchMovieDetail } from '../services/movieApi';
import {
  buildDownloadId,
  StartDownloadPayload,
  useDownloadStore,
} from '../store/useDownloadStore';
import { useFavoriteStore } from '../store/useFavoriteStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { EpisodeItem } from '../types/movie';
import { getImageSrc } from '../utils/image';
import { useResponsive } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetail'>;

function cleanHtml(raw?: string): string {
  if (!raw) {
    return '';
  }
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{2,}/g, '\n\n')
    .trim();
}

export default function MovieDetailScreen({ navigation, route }: Props) {
  const {
    slug,
    movie: initialMovie,
    resumeEpisodeIndex,
    resumeServerIndex,
    resumeTime,
    localUri,
  } = route.params;
  const { width, isTablet, rs } = useResponsive();
  const insets = useSafeAreaInsets();

  const historyItem = useHistoryStore(state => state.getHistoryItem(slug));
  const saveProgress = useHistoryStore(state => state.saveProgress);

  const [selectedServerIdx, setSelectedServerIdx] = useState(
    resumeServerIndex ?? historyItem?.serverIndex ?? 0,
  );
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(
    resumeEpisodeIndex ?? historyItem?.episodeIndex ?? 0,
  );
  const [isPlaying, setIsPlaying] = useState(
    Boolean(
      resumeTime !== undefined ||
        resumeEpisodeIndex !== undefined ||
        localUri !== undefined,
    ),
  );
  const [hasStarted, setHasStarted] = useState(
    Boolean(
      resumeTime !== undefined ||
        resumeEpisodeIndex !== undefined ||
        localUri !== undefined,
    ),
  );

  const isFavorite = useFavoriteStore(state =>
    state.favorites.some(item => item.slug === slug),
  );
  const toggleFavorite = useFavoriteStore(state => state.toggleFavorite);

  // Select only downloads relevant to this movie to prevent re-renders when other movies are downloading
  const downloads = useDownloadStore(
    useCallback(
      state => state.downloads.filter(d => d.movie.slug === slug),
      [slug],
    ),
  );
  const startDownload = useDownloadStore(state => state.startDownload);
  const startBatchDownloads = useDownloadStore(
    state => state.startBatchDownloads,
  );
  const pauseDownload = useDownloadStore(state => state.pauseDownload);
  const resumeDownload = useDownloadStore(state => state.resumeDownload);
  const removeDownload = useDownloadStore(state => state.removeDownload);

  const [expandSynopsis, setExpandSynopsis] = useState(false);
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);
  const [pickedEpisodeIndices, setPickedEpisodeIndices] = useState<number[]>(
    [],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['movieDetail', slug],
    queryFn: ({ signal }) => fetchMovieDetail(slug, signal),
  });

  const movie = data?.movie ?? initialMovie;
  const servers = useMemo(() => data?.episodes ?? [], [data?.episodes]);
  const currentServerName =
    servers[selectedServerIdx]?.server_name || 'Vietsub';
  const episodes: EpisodeItem[] = useMemo(
    () => servers[selectedServerIdx]?.server_data ?? [],
    [servers, selectedServerIdx],
  );
  const currentEpisode: EpisodeItem | undefined = episodes[selectedEpisodeIdx];

  // Lookup download item for currently selected episode
  const currentEpisodeDownload = useMemo(() => {
    if (!currentEpisode) {
      return undefined;
    }
    const id = buildDownloadId(slug, selectedServerIdx, currentEpisode.slug);
    return downloads.find(d => d.id === id);
  }, [downloads, slug, selectedServerIdx, currentEpisode]);

  // Map of episodeSlug -> download item for the current server
  const serverDownloadMap = useMemo(() => {
    const map = new Map<string, (typeof downloads)[number]>();
    for (const d of downloads) {
      if (d.movie.slug === slug && d.serverIndex === selectedServerIdx) {
        map.set(d.episodeSlug, d);
      }
    }
    return map;
  }, [downloads, slug, selectedServerIdx]);

  // Prefer playing local manifest when episode is already downloaded
  const playbackUri = useMemo(() => {
    if (
      currentEpisodeDownload?.status === 'completed' &&
      currentEpisodeDownload.localManifestPath
    ) {
      return currentEpisodeDownload.localManifestPath;
    }
    if (
      localUri &&
      selectedEpisodeIdx === (resumeEpisodeIndex ?? 0) &&
      selectedServerIdx === (resumeServerIndex ?? 0)
    ) {
      return localUri;
    }
    return currentEpisode?.link_m3u8;
  }, [
    currentEpisodeDownload,
    localUri,
    selectedEpisodeIdx,
    resumeEpisodeIndex,
    selectedServerIdx,
    resumeServerIndex,
    currentEpisode,
  ]);

  const handleStartPlay = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(true);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSelectEpisode = useCallback((idx: number) => {
    setSelectedEpisodeIdx(idx);
    setHasStarted(true);
    setIsPlaying(true);
  }, []);

  const handleSelectServer = useCallback((idx: number) => {
    setSelectedServerIdx(idx);
    setSelectedEpisodeIdx(0);
  }, []);

  const handleProgressUpdate = useCallback(
    (currTime: number, dur: number) => {
      if (!movie || !currentEpisode) {
        return;
      }
      saveProgress({
        movie,
        episodeName: currentEpisode.name,
        episodeSlug: currentEpisode.slug,
        episodeIndex: selectedEpisodeIdx,
        serverIndex: selectedServerIdx,
        currentTime: currTime,
        duration: dur,
      });
    },
    [movie, currentEpisode, selectedEpisodeIdx, selectedServerIdx, saveProgress],
  );

  const handleEnd = useCallback(() => {
    if (selectedEpisodeIdx + 1 < episodes.length) {
      setSelectedEpisodeIdx(selectedEpisodeIdx + 1);
    } else {
      setIsPlaying(false);
    }
  }, [selectedEpisodeIdx, episodes.length]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleShare = useCallback(() => {
    if (!movie) {
      return;
    }
    Share.share({
      message: `${movie.name} (${movie.origin_name}) - Xem trên CINASTREAM`,
    }).catch(() => {});
  }, [movie]);

  const handlePressDownloadButton = useCallback(() => {
    if (!movie || episodes.length === 0) {
      Alert.alert(
        'Đang tải dữ liệu',
        'Vui lòng đợi thông tin tập phim tải xong trước khi tải về.',
      );
      return;
    }

    // Phim bộ (nhiều tập) -> mở hộp chọn tập tải về
    if (episodes.length > 1) {
      const canPreselect =
        currentEpisode &&
        currentEpisode.link_m3u8 &&
        !currentEpisodeDownload;
      setPickedEpisodeIndices(canPreselect ? [selectedEpisodeIdx] : []);
      setShowDownloadPicker(true);
      return;
    }

    // Phim lẻ (1 tập)
    if (!currentEpisode?.link_m3u8) {
      Alert.alert('Không hỗ trợ', 'Tập phim này chưa có luồng M3U8 để tải về.');
      return;
    }

    if (!currentEpisodeDownload || currentEpisodeDownload.status === 'failed') {
      startDownload({
        movie,
        episodeName: currentEpisode.name || 'Full',
        episodeSlug: currentEpisode.slug || 'full',
        episodeIndex: selectedEpisodeIdx,
        serverIndex: selectedServerIdx,
        serverName: currentServerName,
        remoteUri: currentEpisode.link_m3u8,
      });
      return;
    }

    if (
      currentEpisodeDownload.status === 'downloading' ||
      currentEpisodeDownload.status === 'queued'
    ) {
      const msg =
        currentEpisodeDownload.status === 'downloading'
          ? `Phim đang tải (${currentEpisodeDownload.progress}%). Bạn có thể quản lý tiến trình trong tab Tải về.`
          : 'Tập phim đang trong hàng đợi tải xuống.';
      Alert.alert(
        currentEpisodeDownload.status === 'downloading'
          ? 'Đang tải về'
          : 'Đang trong hàng đợi',
        msg,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Tạm dừng',
            onPress: () => pauseDownload(currentEpisodeDownload.id),
          },
          {
            text: 'Hủy tải',
            style: 'destructive',
            onPress: () => removeDownload(currentEpisodeDownload.id),
          },
        ],
      );
      return;
    }

    if (currentEpisodeDownload.status === 'paused') {
      Alert.alert(
        'Tạm dừng tải',
        `Bản tải đang tạm dừng ở ${currentEpisodeDownload.progress}%.`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Tiếp tục tải',
            onPress: () => resumeDownload(currentEpisodeDownload.id),
          },
          {
            text: 'Hủy tải',
            style: 'destructive',
            onPress: () => removeDownload(currentEpisodeDownload.id),
          },
        ],
      );
      return;
    }

    // Completed
    Alert.alert(
      'Đã tải về',
      'Phim này đã được tải hoàn tất trong tab Tải về.',
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Xóa bản tải',
          style: 'destructive',
          onPress: () => removeDownload(currentEpisodeDownload.id),
        },
      ],
    );
  }, [
    movie,
    episodes,
    currentEpisode,
    currentEpisodeDownload,
    selectedEpisodeIdx,
    selectedServerIdx,
    currentServerName,
    startDownload,
    pauseDownload,
    resumeDownload,
    removeDownload,
  ]);

  const togglePickEpisode = useCallback((idx: number) => {
    setPickedEpisodeIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx],
    );
  }, []);

  const handleSelectAllDownloadable = useCallback(() => {
    const downloadableIndices: number[] = [];
    episodes.forEach((ep, idx) => {
      const existing = serverDownloadMap.get(ep.slug);
      if (
        ep.link_m3u8 &&
        (!existing || existing.status === 'failed' || existing.status === 'paused')
      ) {
        downloadableIndices.push(idx);
      }
    });
    if (pickedEpisodeIndices.length === downloadableIndices.length) {
      setPickedEpisodeIndices([]);
    } else {
      setPickedEpisodeIndices(downloadableIndices);
    }
  }, [episodes, serverDownloadMap, pickedEpisodeIndices.length]);

  const handleConfirmBatchDownload = useCallback(() => {
    if (!movie || pickedEpisodeIndices.length === 0) {
      return;
    }
    const payloads: StartDownloadPayload[] = [];
    for (const idx of pickedEpisodeIndices) {
      const ep = episodes[idx];
      if (ep && ep.link_m3u8) {
        payloads.push({
          movie,
          episodeName: ep.name || `Tập ${idx + 1}`,
          episodeSlug: ep.slug || `tap-${idx + 1}`,
          episodeIndex: idx,
          serverIndex: selectedServerIdx,
          serverName: currentServerName,
          remoteUri: ep.link_m3u8,
        });
      }
    }
    if (payloads.length > 0) {
      startBatchDownloads(payloads);
    }
    setShowDownloadPicker(false);
  }, [
    movie,
    pickedEpisodeIndices,
    episodes,
    selectedServerIdx,
    currentServerName,
    startBatchDownloads,
  ]);

  const playerHeight = Math.round(width * (isTablet ? 0.48 : 0.5625));
  const localPosterPath = useMemo(
    () =>
      currentEpisodeDownload?.localPosterPath ||
      downloads.find(d => d.movie.slug === slug && d.localPosterPath)
        ?.localPosterPath,
    [currentEpisodeDownload, downloads, slug],
  );
  const backdropUri =
    localPosterPath || getImageSrc(movie?.thumb_url || movie?.poster_url);
  const synopsis = useMemo(
    () => cleanHtml(data?.movie?.content),
    [data?.movie?.content],
  );
  const rating =
    movie?.tmdb?.vote_average && movie.tmdb.vote_average > 0
      ? movie.tmdb.vote_average.toFixed(1)
      : movie?.imdb?.vote_average && movie.imdb.vote_average > 0
        ? movie.imdb.vote_average.toFixed(1)
        : null;

  const epColumns = isTablet ? 8 : 4;
  const horizontalPad = rs(16);
  const epGap = rs(8);
  const epWidth = Math.floor(
    (width - horizontalPad * 2 - epGap * (epColumns - 1)) / epColumns,
  );

  const isCurrentDownloaded = currentEpisodeDownload?.status === 'completed';
  const isCurrentDownloading =
    currentEpisodeDownload?.status === 'downloading' ||
    currentEpisodeDownload?.status === 'queued' ||
    currentEpisodeDownload?.status === 'paused';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 1. Khung Video Player 16:9 cố định ở đầu màn hình */}
      <VideoPlayer
        uri={playbackUri}
        backdropUri={backdropUri}
        title={`${movie?.name ?? ''}${currentEpisode ? ` • ${currentEpisode.name}` : ''}`}
        height={playerHeight}
        started={hasStarted}
        playing={isPlaying}
        initialTime={resumeTime ?? historyItem?.currentTime}
        onProgressUpdate={handleProgressUpdate}
        onStart={handleStartPlay}
        onTogglePlay={handleTogglePlay}
        onBack={handleBack}
        onEnd={handleEnd}
      />

      {/* 2. Phần thông tin chi tiết & chọn tập cuộn bên dưới */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPad,
          paddingTop: rs(16),
          paddingBottom: insets.bottom + rs(32),
          gap: rs(18),
        }}
      >
        {/* Tiêu đề & Hàng thông số */}
        <View style={{ gap: rs(6) }}>
          <Text style={[styles.movieTitle, { fontSize: rs(20) }]}>
            {movie?.name}
          </Text>
          {movie?.origin_name ? (
            <Text style={[styles.originTitle, { fontSize: rs(13) }]}>
              {movie.origin_name}
            </Text>
          ) : null}

          <View style={[styles.metaWrap, { gap: rs(8), marginTop: rs(6) }]}>
            {rating ? (
              <View
                style={[
                  styles.ratingBadge,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(3),
                    borderRadius: rs(6),
                    gap: rs(4),
                  },
                ]}
              >
                <Star color="#FBBF24" fill="#FBBF24" size={rs(12)} />
                <Text style={[styles.ratingValue, { fontSize: rs(12) }]}>
                  {rating}
                </Text>
              </View>
            ) : null}

            {movie?.quality ? (
              <View
                style={[
                  styles.qualityTag,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(3),
                    borderRadius: rs(6),
                  },
                ]}
              >
                <Text style={[styles.qualityTagText, { fontSize: rs(11) }]}>
                  {movie.quality}
                </Text>
              </View>
            ) : null}

            {movie?.lang ? (
              <View
                style={[
                  styles.metaTag,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(3),
                    borderRadius: rs(6),
                  },
                ]}
              >
                <Text style={[styles.metaTagText, { fontSize: rs(11) }]}>
                  {movie.lang}
                </Text>
              </View>
            ) : null}

            {movie?.year ? (
              <View
                style={[
                  styles.metaTag,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(3),
                    borderRadius: rs(6),
                  },
                ]}
              >
                <Text style={[styles.yearTagText, { fontSize: rs(11) }]}>
                  {movie.year}
                </Text>
              </View>
            ) : null}

            {movie?.time ? (
              <View
                style={[
                  styles.metaTag,
                  {
                    paddingHorizontal: rs(8),
                    paddingVertical: rs(3),
                    borderRadius: rs(6),
                    gap: rs(4),
                  },
                ]}
              >
                <Clock color="#9CA3AF" size={rs(11)} />
                <Text style={[styles.metaTagText, { fontSize: rs(11) }]}>
                  {movie.time}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Hàng nút chức năng: Phát ngay | Yêu thích | Tải về | Chia sẻ */}
        <View style={[styles.actionRow, { gap: rs(10) }]}>
          <Pressable
            onPress={() => {
              if (!hasStarted) {
                handleStartPlay();
              } else {
                setIsPlaying(prev => !prev);
              }
            }}
            style={[
              styles.watchNowBtn,
              {
                height: rs(42),
                borderRadius: rs(10),
                paddingHorizontal: rs(18),
                gap: rs(8),
              },
            ]}
          >
            {hasStarted && isPlaying ? (
              <Pause color="#FFFFFF" fill="#FFFFFF" size={rs(16)} />
            ) : (
              <Play color="#FFFFFF" fill="#FFFFFF" size={rs(16)} />
            )}
            <Text style={[styles.watchNowText, { fontSize: rs(13) }]}>
              {hasStarted
                ? isPlaying
                  ? 'Đang phát'
                  : 'Tiếp tục'
                : historyItem && historyItem.currentTime > 0
                ? `Xem tiếp (${historyItem.episodeName || 'Đang dở'})`
                : 'Xem phim'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (movie) {
                toggleFavorite(movie);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? 'Bỏ yêu thích phim này' : 'Yêu thích phim này'
            }
            style={[
              styles.actionIconBtn,
              {
                width: rs(42),
                height: rs(42),
                borderRadius: rs(10),
              },
              isFavorite ? styles.actionIconBtnActive : null,
            ]}
          >
            <Heart
              color={isFavorite ? COLORS.primary : '#D1D5DB'}
              fill={isFavorite ? COLORS.primary : 'none'}
              size={rs(18)}
            />
          </Pressable>

          <Pressable
            onPress={handlePressDownloadButton}
            accessibilityRole="button"
            accessibilityLabel="Tải về"
            style={[
              styles.actionIconBtn,
              {
                width: rs(42),
                height: rs(42),
                borderRadius: rs(10),
              },
              isCurrentDownloaded || isCurrentDownloading
                ? styles.actionIconBtnActive
                : null,
            ]}
          >
            {currentEpisodeDownload?.status === 'queued' ? (
              <Clock color={COLORS.primary} size={rs(18)} />
            ) : isCurrentDownloading ? (
              <Text style={[styles.downloadPercentBadge, { fontSize: rs(10) }]}>
                {`${currentEpisodeDownload?.progress ?? 0}%`}
              </Text>
            ) : isCurrentDownloaded ? (
              <Check color={COLORS.primary} size={rs(18)} />
            ) : (
              <Download color="#D1D5DB" size={rs(18)} />
            )}
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={[
              styles.actionIconBtn,
              {
                width: rs(42),
                height: rs(42),
                borderRadius: rs(10),
              },
            ]}
          >
            <Share2 color="#D1D5DB" size={rs(18)} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={[styles.loadingCenter, { paddingVertical: rs(24) }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : null}

        {/* Chọn Server & Danh sách Tập phim */}
        <EpisodeSelector
          servers={servers}
          selectedServerIdx={selectedServerIdx}
          onSelectServer={handleSelectServer}
          episodes={episodes}
          selectedEpisodeIdx={selectedEpisodeIdx}
          onSelectEpisode={handleSelectEpisode}
          serverDownloadMap={serverDownloadMap}
          epWidth={epWidth}
          epGap={epGap}
          rs={rs}
        />

        {/* Nội dung phim */}
        {synopsis ? (
          <View style={{ gap: rs(6) }}>
            <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
              Nội dung phim
            </Text>
            <Text
              numberOfLines={expandSynopsis ? undefined : 3}
              style={[
                styles.synopsisText,
                { fontSize: rs(13), lineHeight: rs(20) },
              ]}
            >
              {synopsis}
            </Text>
            {synopsis.length > 140 ? (
              <Pressable onPress={() => setExpandSynopsis(prev => !prev)}>
                <Text style={[styles.readMoreText, { fontSize: rs(12) }]}>
                  {expandSynopsis ? 'Thu gọn' : 'Xem thêm'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Thể loại, Quốc gia, Đạo diễn, Diễn viên */}
        <View
          style={[
            styles.infoCard,
            {
              padding: rs(12),
              borderRadius: rs(12),
              gap: rs(8),
            },
          ]}
        >
          {movie?.category?.length ? (
            <View style={[styles.infoRow, { gap: rs(6) }]}>
              <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                Thể loại:
              </Text>
              <Text style={[styles.infoValue, { fontSize: rs(12) }]}>
                {movie.category.map(c => c.name).join(', ')}
              </Text>
            </View>
          ) : null}

          {movie?.country?.length ? (
            <View style={[styles.infoRow, { gap: rs(6) }]}>
              <Globe color="#9CA3AF" size={rs(13)} />
              <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                Quốc gia:
              </Text>
              <Text style={[styles.infoValue, { fontSize: rs(12) }]}>
                {movie.country.map(c => c.name).join(', ')}
              </Text>
            </View>
          ) : null}

          {data?.movie?.director?.length ? (
            <View style={[styles.infoRow, { gap: rs(6) }]}>
              <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                Đạo diễn:
              </Text>
              <Text style={[styles.infoValue, { fontSize: rs(12) }]}>
                {data.movie.director.filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          {data?.movie?.actor?.length ? (
            <View style={[styles.infoRow, { gap: rs(6) }]}>
              <Text style={[styles.infoLabel, { fontSize: rs(12) }]}>
                Diễn viên:
              </Text>
              <Text style={[styles.infoValue, { fontSize: rs(12) }]}>
                {data.movie.actor.filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Modal chọn tập tải về cho Phim Bộ */}
      <DownloadPickerModal
        visible={showDownloadPicker}
        onClose={() => setShowDownloadPicker(false)}
        movieName={movie?.name}
        currentServerName={currentServerName}
        episodes={episodes}
        serverDownloadMap={serverDownloadMap}
        pickedEpisodeIndices={pickedEpisodeIndices}
        onTogglePickEpisode={togglePickEpisode}
        onSelectAllDownloadable={handleSelectAllDownloadable}
        onConfirmBatchDownload={handleConfirmBatchDownload}
        insetsBottom={insets.bottom}
        epWidth={epWidth}
        epGap={epGap}
        rs={rs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  originTitle: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
  },
  ratingValue: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  qualityTag: {
    backgroundColor: COLORS.primary,
  },
  qualityTagText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
  },
  metaTagText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  yearTagText: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  watchNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionIconBtn: {
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 0, 0, 0.12)',
  },
  downloadPercentBadge: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  serverPill: {
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
  },
  serverPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serverPillText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  serverPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeBox: {
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  episodeBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  episodeBoxDisabled: {
    opacity: 0.45,
  },
  episodeText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  episodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  epDownloadedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  epModalStatusText: {
    color: '#10B981',
    fontWeight: '700',
    marginTop: 2,
  },
  synopsisText: {
    color: '#D1D5DB',
  },
  readMoreText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#14151C',
    borderWidth: 1,
    borderColor: '#1F222E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  infoLabel: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    color: '#E5E7EB',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#13141C',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingCenter: {
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  epModalStatusQueued: {
    color: '#9CA3AF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalSubTitle: {
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectAllBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  selectAllText: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  closeModalCircle: {
    backgroundColor: '#1E202B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmDownloadBtnDisabled: {
    opacity: 0.45,
  },
  confirmDownloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
