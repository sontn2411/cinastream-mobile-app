import React, { memo, useCallback } from 'react';
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
  const posterHeight = Math.round(cardWidth * 1.36);
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

  const handlePress = useCallback(() => {
    onPress?.(movie);
  }, [movie, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          borderRadius: rs(18),
          padding: rs(6),
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      {/* Polaroid Poster Frame */}
      <View
        style={[
          styles.posterWrapper,
          {
            height: posterHeight,
            borderRadius: rs(13),
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

        {/* Top-left stacked candy badges */}
        <View
          style={[
            styles.topLeftBadges,
            { top: rs(7), left: rs(7), gap: rs(4) },
          ]}
        >
          {primaryBadge ? (
            <View
              style={[
                styles.primaryBadge,
                isEpisodeTag ? styles.episodeBadge : styles.qualityBadge,
                {
                  paddingHorizontal: rs(8),
                  paddingVertical: rs(3),
                  borderRadius: rs(10),
                },
              ]}
            >
              <Text style={[styles.primaryBadgeText, { fontSize: rs(10) }]}>
                {primaryBadge}
              </Text>
            </View>
          ) : null}
          {langBadge ? (
            <View
              style={[
                styles.langBadge,
                {
                  paddingHorizontal: rs(8),
                  paddingVertical: rs(2.5),
                  borderRadius: rs(10),
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

        {/* Bottom overlay: Star rating pill + Strawberry play button */}
        <View
          style={[
            styles.posterBottomRow,
            {
              paddingHorizontal: rs(8),
              paddingBottom: rs(7),
              paddingTop: rs(12),
            },
          ]}
        >
          {rating ? (
            <View
              style={[
                styles.ratingPill,
                {
                  paddingHorizontal: rs(7),
                  paddingVertical: rs(2.5),
                  borderRadius: rs(10),
                  gap: rs(3),
                },
              ]}
            >
              <Star color={COLORS.accent} fill={COLORS.accent} size={rs(11)} />
              <Text style={[styles.ratingText, { fontSize: rs(11) }]}>
                {rating}
              </Text>
            </View>
          ) : (
            <View />
          )}
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
            <Play color="#FFFFFF" fill="#FFFFFF" size={rs(12)} />
          </View>
        </View>
      </View>

      {/* Info Footer */}
      <View
        style={{
          paddingHorizontal: rs(6),
          paddingTop: rs(8),
          paddingBottom: rs(4),
          gap: rs(2),
        }}
      >
        <Text numberOfLines={1} style={[styles.title, { fontSize: rs(13.5) }]}>
          {movie.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.originTitle, { fontSize: rs(11) }]}
        >
          {movie.origin_name}
        </Text>
        <View
          style={[
            styles.metaFooterRow,
            { gap: rs(5), marginTop: rs(3) },
          ]}
        >
          {movie.year ? (
            <View
              style={[
                styles.yearPill,
                {
                  paddingHorizontal: rs(6),
                  paddingVertical: rs(1.5),
                  borderRadius: rs(6),
                },
              ]}
            >
              <Text style={[styles.yearText, { fontSize: rs(10) }]}>
                {movie.year}
              </Text>
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            style={[styles.categoryText, { fontSize: rs(11) }]}
          >
            {categoryName}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(MovieCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
    shadowColor: '#F4A2B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  posterWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: COLORS.surface,
  },
  topLeftBadges: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  primaryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  qualityBadge: {
    backgroundColor: COLORS.primary,
  },
  episodeBadge: {
    backgroundColor: '#FF7597',
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  langBadge: {
    backgroundColor: 'rgba(255, 248, 246, 0.92)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  langBadgeText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  posterBottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 246, 0.92)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingText: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  playCircle: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  originTitle: {
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  metaFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearPill: {
    backgroundColor: COLORS.accentSoft,
  },
  yearText: {
    color: '#C87D00',
    fontWeight: '800',
  },
  categoryText: {
    flex: 1,
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
});
