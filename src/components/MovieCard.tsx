import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Play, Star } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { MovieItem } from '../types/movie';
import { getImageSrc } from '../utils/image';
import { useResponsive } from '../utils/responsive';

interface Props {
  movie: MovieItem;
  cardWidth: number;
  onPress?: (movie: MovieItem) => void;
}

function MovieCard({ movie, cardWidth, onPress }: Props) {
  const { rs } = useResponsive();
  const posterHeight = Math.round(cardWidth * 1.42);
  const imageUri = getImageSrc(movie.poster_url || movie.thumb_url);

  const isEpisodeTag = Boolean(
    movie.episode_current &&
      movie.episode_current.toLowerCase() !== 'full' &&
      movie.type !== 'single',
  );
  const primaryBadge = isEpisodeTag
    ? movie.episode_current
    : movie.quality || 'FHD';
  const langBadge = movie.lang || 'Vietsub';
  const rating =
    movie.tmdb?.vote_average && movie.tmdb.vote_average > 0
      ? movie.tmdb.vote_average.toFixed(1)
      : movie.imdb?.vote_average && movie.imdb.vote_average > 0
      ? movie.imdb.vote_average.toFixed(1)
      : null;
  const categoryName = movie.category?.[0]?.name || 'Phim mới';

  return (
    <Pressable
      onPress={() => onPress?.(movie)}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          borderRadius: rs(12),
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Poster */}
      <View
        style={[
          styles.posterWrapper,
          {
            height: posterHeight,
            borderTopLeftRadius: rs(12),
            borderTopRightRadius: rs(12),
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.poster}
            resizeMode="cover"
            resizeMethod="resize"
            fadeDuration={200}
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]} />
        )}

        {/* Top-left stacked badges */}
        <View
          style={[
            styles.topLeftBadges,
            { top: rs(8), left: rs(8), gap: rs(4) },
          ]}
        >
          {primaryBadge ? (
            <View
              style={[
                styles.primaryBadge,
                isEpisodeTag ? styles.episodeBadge : styles.qualityBadge,
                {
                  paddingHorizontal: rs(6),
                  paddingVertical: rs(2),
                  borderRadius: rs(4),
                },
              ]}
            >
              <Text style={[styles.primaryBadgeText, { fontSize: rs(10) }]}>
                {primaryBadge.toUpperCase()}
              </Text>
            </View>
          ) : null}
          {langBadge ? (
            <View
              style={[
                styles.langBadge,
                {
                  paddingHorizontal: rs(6),
                  paddingVertical: rs(2),
                  borderRadius: rs(4),
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.langBadgeText, { fontSize: rs(10) }]}
              >
                {langBadge}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom overlay: Star rating + Red play button */}
        <View
          style={[
            styles.posterBottomRow,
            {
              paddingHorizontal: rs(8),
              paddingBottom: rs(8),
              paddingTop: rs(20),
            },
          ]}
        >
          <View style={[styles.ratingRow, { gap: rs(4) }]}>
            {rating ? (
              <>
                <Star color="#FBBF24" fill="#FBBF24" size={rs(12)} />
                <Text style={[styles.ratingText, { fontSize: rs(12) }]}>
                  {rating}
                </Text>
              </>
            ) : (
              <View />
            )}
          </View>
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
            <Play color="#FFFFFF" fill="#FFFFFF" size={rs(12)} />
          </View>
        </View>
      </View>

      {/* Info Footer */}
      <View
        style={{
          paddingHorizontal: rs(10),
          paddingVertical: rs(10),
          gap: rs(2),
        }}
      >
        <Text numberOfLines={1} style={[styles.title, { fontSize: rs(14) }]}>
          {movie.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.originTitle, { fontSize: rs(11) }]}
        >
          {movie.origin_name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.metaRow, { fontSize: rs(11), marginTop: rs(2) }]}
        >
          {movie.year ? (
            <Text style={styles.yearText}>{movie.year}</Text>
          ) : null}
          {movie.year && categoryName ? '  •  ' : ''}
          <Text style={styles.categoryText}>{categoryName}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

export default memo(MovieCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#14151C',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F222E',
  },
  posterWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1C1E26',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: '#252836',
  },
  topLeftBadges: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  primaryBadge: {
    alignSelf: 'flex-start',
  },
  qualityBadge: {
    backgroundColor: COLORS.primary,
  },
  episodeBadge: {
    backgroundColor: '#A16207',
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  langBadge: {
    backgroundColor: 'rgba(18, 18, 24, 0.82)',
    alignSelf: 'flex-start',
  },
  langBadgeText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  posterBottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  playCircle: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  originTitle: {
    color: '#8A8F9E',
  },
  metaRow: {
    color: '#8A8F9E',
  },
  yearText: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  categoryText: {
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
