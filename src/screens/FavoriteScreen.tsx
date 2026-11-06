import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
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
  Compass,
  Heart,
  HeartOff,
  Trash2,
} from 'lucide-react-native';
import MovieCard from '../components/MovieCard';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { useFavoriteStore } from '../store/useFavoriteStore';
import { MovieItem } from '../types/movie';
import { useResponsive } from '../utils/responsive';

const keyExtractor = (item: MovieItem) => item.slug || item._id;

export default function FavoriteScreen() {
  const { width, isTablet, rs } = useResponsive();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList & BottomTabParamList>>();

  const favorites = useFavoriteStore(state => state.favorites);
  const removeFavorite = useFavoriteStore(state => state.removeFavorite);
  const clearFavorites = useFavoriteStore(state => state.clearFavorites);

  const numColumns = isTablet ? 4 : 2;
  const horizontalPad = rs(14);
  const gap = rs(12);
  const cardWidth = Math.floor(
    (width - horizontalPad * 2 - gap * (numColumns - 1)) / numColumns,
  );

  const topOffset =
    (headerHeight > 0 ? headerHeight : insets.top + rs(64)) + rs(16);

  const handlePressMovie = useCallback(
    (movie: MovieItem) => {
      navigation.navigate('MovieDetail', { slug: movie.slug, movie });
    },
    [navigation],
  );

  const handleRemoveOne = useCallback(
    (movie: MovieItem) => {
      Alert.alert(
        'Bỏ yêu thích',
        `Bạn có muốn xóa "${movie.name}" khỏi danh sách yêu thích?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: () => removeFavorite(movie.slug),
          },
        ],
      );
    },
    [removeFavorite],
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Xóa tất cả',
      'Bạn có chắc chắn muốn xóa toàn bộ danh sách phim yêu thích không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: clearFavorites,
        },
      ],
    );
  }, [clearFavorites]);

  const handleGoExplore = useCallback(() => {
    navigation.navigate('Explore');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MovieItem>) => (
      <View style={[styles.itemWrapper, { width: cardWidth }]}>
        <MovieCard
          movie={item}
          cardWidth={cardWidth}
          onPress={handlePressMovie}
        />
        {/* Nút gỡ yêu thích nhanh ở góc trên bên phải của Card */}
        <Pressable
          onPress={() => handleRemoveOne(item)}
          accessibilityRole="button"
          accessibilityLabel={`Xóa ${item.name} khỏi yêu thích`}
          style={[
            styles.quickRemoveBtn,
            {
              top: rs(8),
              right: rs(8),
              width: rs(28),
              height: rs(28),
              borderRadius: rs(14),
            },
          ]}
        >
          <Heart color={COLORS.primary} fill={COLORS.primary} size={rs(15)} />
        </Pressable>
      </View>
    ),
    [cardWidth, handlePressMovie, handleRemoveOne, rs],
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
      favorites.length > 0
        ? {
            gap,
            marginBottom: gap,
          }
        : undefined,
    [favorites.length, gap],
  );

  return (
    <View style={styles.container}>
      <FlatList
        key={`favorite-grid-${numColumns}`}
        data={favorites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        columnWrapperStyle={columnWrapperStyle}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View style={[styles.headerContainer, { marginBottom: rs(16) }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.headerTitle, { fontSize: rs(19) }]}>
                Phim yêu thích
              </Text>
              {favorites.length > 0 ? (
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
                    {favorites.length} phim
                  </Text>
                </View>
              ) : null}
            </View>

            {favorites.length > 0 ? (
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
              <HeartOff color={COLORS.primary} size={rs(38)} />
            </View>

            <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
              Chưa có phim yêu thích
            </Text>

            <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
              Hãy khám phá kho phim phong phú và nhấn biểu tượng trái tim để lưu lại
              những bộ phim bạn yêu thích nhé!
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
  contentContainer: {
    // will be supplemented inline
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
  quickRemoveBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 17, 23, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrapper: {
    position: 'relative',
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
