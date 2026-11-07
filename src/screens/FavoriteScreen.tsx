import React, { useCallback, useMemo } from 'react';
import {
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
  Trash2,
} from 'lucide-react-native';
import MovieCard from '../components/MovieCard';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { showAppAlert } from '../store/useDialogStore';
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
      showAppAlert(
        'Bỏ khỏi tủ phim',
        `Bạn có muốn bỏ "${movie.name}" khỏi tủ phim yêu thích không?`,
        [
          { text: 'Giữ lại', style: 'cancel' },
          {
            text: 'Bỏ yêu thích',
            style: 'destructive',
            onPress: () => removeFavorite(movie.slug),
          },
        ],
      );
    },
    [removeFavorite],
  );

  const handleClearAll = useCallback(() => {
    showAppAlert(
      'Dọn tủ phim yêu thích',
      'Bạn có chắc chắn muốn xóa toàn bộ danh sách phim yêu thích không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa hết',
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
              top: rs(12),
              right: rs(12),
              width: rs(30),
              height: rs(30),
              borderRadius: rs(15),
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
        paddingBottom: rs(96),
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
                Tủ phim yêu thích
              </Text>
              {favorites.length > 0 ? (
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
                (｡♥‿♥｡)
              </Text>
            </View>

            <Text style={[styles.emptyTitle, { fontSize: rs(18) }]}>
              Tủ phim yêu thích còn trống
            </Text>

            <Text style={[styles.emptySubtitle, { fontSize: rs(13) }]}>
              Hãy dạo quanh kho phim và thả tim cho những bộ phim làm bạn rung
              động để lưu vào đây nhé!
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
                Đi dạo kho phim ngay
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
  quickRemoveBtn: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#F4A2B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrapper: {
    position: 'relative',
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
