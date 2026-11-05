import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  Clock,
  Download,
  Film,
  Globe,
  Heart,
  Pause,
  Play,
  Server,
  Share2,
  Star,
} from 'lucide-react-native';
import VideoPlayer from '../components/VideoPlayer';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { fetchMovieDetail } from '../services/movieApi';
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
  const { slug, movie: initialMovie, resumeEpisodeIndex, resumeTime } =
    route.params;
  const { width, isTablet, rs } = useResponsive();
  const insets = useSafeAreaInsets();

  const historyItem = useHistoryStore(state => state.getHistoryItem(slug));
  const saveProgress = useHistoryStore(state => state.saveProgress);

  const [selectedServerIdx, setSelectedServerIdx] = useState(
    historyItem?.serverIndex ?? 0,
  );
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(
    resumeEpisodeIndex ?? historyItem?.episodeIndex ?? 0,
  );
  const [isPlaying, setIsPlaying] = useState(
    Boolean(resumeTime !== undefined || resumeEpisodeIndex !== undefined),
  );
  const [hasStarted, setHasStarted] = useState(
    Boolean(resumeTime !== undefined || resumeEpisodeIndex !== undefined),
  );

  const isFavorite = useFavoriteStore(state =>
    state.favorites.some(item => item.slug === slug),
  );
  const toggleFavorite = useFavoriteStore(state => state.toggleFavorite);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['movieDetail', slug],
    queryFn: ({ signal }) => fetchMovieDetail(slug, signal),
  });

  const movie = data?.movie ?? initialMovie;
  const servers = useMemo(() => data?.episodes ?? [], [data?.episodes]);
  const episodes: EpisodeItem[] = useMemo(
    () => servers[selectedServerIdx]?.server_data ?? [],
    [servers, selectedServerIdx],
  );
  const currentEpisode: EpisodeItem | undefined = episodes[selectedEpisodeIdx];

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

  const playerHeight = Math.round(width * (isTablet ? 0.48 : 0.5625));
  const backdropUri = getImageSrc(movie?.thumb_url || movie?.poster_url);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 1. Khung Video Player 16:9 cố định ở đầu màn hình */}
      <VideoPlayer
        uri={currentEpisode?.link_m3u8}
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
            onPress={() => setIsDownloaded(prev => !prev)}
            style={[
              styles.actionIconBtn,
              {
                width: rs(42),
                height: rs(42),
                borderRadius: rs(10),
              },
              isDownloaded ? styles.actionIconBtnActive : null,
            ]}
          >
            <Download
              color={isDownloaded ? COLORS.primary : '#D1D5DB'}
              size={rs(18)}
            />
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
          <View style={{ paddingVertical: rs(24), alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : null}

        {/* Chọn Server & Danh sách Tập phim */}
        {servers.length > 0 ? (
          <View style={{ gap: rs(12) }}>
            {/* Server Tabs */}
            <View style={{ gap: rs(8) }}>
              <View style={[styles.sectionHeaderRow, { gap: rs(6) }]}>
                <Server color={COLORS.primary} size={rs(15)} />
                <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
                  Chọn Server
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: rs(8) }}
              >
                {servers.map((srv, idx) => {
                  const active = idx === selectedServerIdx;
                  return (
                    <Pressable
                      key={`${srv.server_name}-${idx}`}
                      onPress={() => handleSelectServer(idx)}
                      style={[
                        styles.serverPill,
                        {
                          paddingHorizontal: rs(14),
                          paddingVertical: rs(7),
                          borderRadius: rs(8),
                        },
                        active ? styles.serverPillActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.serverPillText,
                          { fontSize: rs(12) },
                          active ? styles.serverPillTextActive : null,
                        ]}
                      >
                        {srv.server_name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Lưới Tập phim */}
            {episodes.length > 0 ? (
              <View style={{ gap: rs(8) }}>
                <View style={[styles.sectionHeaderRow, { gap: rs(6) }]}>
                  <Film color={COLORS.primary} size={rs(15)} />
                  <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
                    Danh sách tập ({episodes.length})
                  </Text>
                </View>

                <View style={[styles.episodeGrid, { gap: epGap }]}>
                  {episodes.map((ep, idx) => {
                    const active = idx === selectedEpisodeIdx;
                    return (
                      <Pressable
                        key={`${ep.slug}-${idx}`}
                        onPress={() => handleSelectEpisode(idx)}
                        style={[
                          styles.episodeBox,
                          {
                            width: epWidth,
                            paddingVertical: rs(10),
                            borderRadius: rs(8),
                          },
                          active ? styles.episodeBoxActive : null,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.episodeText,
                            { fontSize: rs(12) },
                            active ? styles.episodeTextActive : null,
                          ]}
                        >
                          {ep.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

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
  },
  episodeBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  episodeText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  episodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
});
