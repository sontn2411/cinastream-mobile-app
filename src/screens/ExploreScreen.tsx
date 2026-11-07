import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Sparkles, X } from 'lucide-react-native';
import FilterSection from '../components/FilterSection';
import MovieCard from '../components/MovieCard';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { fetchCategories, fetchMovies } from '../services/movieApi';
import { MovieFilterState, MovieItem } from '../types/movie';
import { useResponsive } from '../utils/responsive';
import { useDebounce } from '../utils/useDebounce';

const INITIAL_FILTER: MovieFilterState = {
  listType: 'all',
  category: '',
  country: '',
  year: '',
};

const keyExtractor = (item: MovieItem, idx: number) =>
  `${item._id || item.slug}-${idx}`;

export default function ExploreScreen() {
  const { width, isTablet, rs } = useResponsive();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [searchText, setSearchText] = useState('');
  const debouncedKeyword = useDebounce(searchText.trim(), 500);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<MovieFilterState>(INITIAL_FILTER);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['movies', filter, debouncedKeyword],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchMovies({
        filter,
        keyword: debouncedKeyword,
        page: pageParam,
        signal,
      }),
    getNextPageParam: lastPage => {
      const { currentPage, totalPages } = lastPage.pagination;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
  });

  const movies = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data],
  );
  const totalItems = data?.pages[0]?.pagination.totalItems ?? movies.length;

  const handleReset = useCallback(() => {
    setSearchText('');
    setFilter(INITIAL_FILTER);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const numColumns = isTablet ? 4 : 2;
  const horizontalPad = rs(14);
  const gap = rs(12);
  const cardWidth = Math.floor(
    (width - horizontalPad * 2 - gap * (numColumns - 1)) / numColumns,
  );

  const handlePressMovie = useCallback(
    (movie: MovieItem) => {
      navigation.navigate('MovieDetail', { slug: movie.slug, movie });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<MovieItem>) => (
      <MovieCard
        movie={item}
        cardWidth={cardWidth}
        onPress={handlePressMovie}
      />
    ),
    [cardWidth, handlePressMovie],
  );

  const hasActiveFilter =
    filter.listType !== 'all' ||
    filter.category !== '' ||
    filter.country !== '' ||
    filter.year !== '' ||
    debouncedKeyword !== '';

  const topOffset =
    (headerHeight > 0 ? headerHeight : insets.top + rs(64)) + rs(16);

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: topOffset,
      paddingBottom: rs(96),
      paddingHorizontal: horizontalPad,
    }),
    [topOffset, horizontalPad, rs],
  );

  const columnWrapperStyle = useMemo(
    () => ({
      gap,
      marginBottom: gap,
    }),
    [gap],
  );

  return (
    <View style={styles.container}>
      <FlatList
        key={`grid-${numColumns}`}
        data={movies}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        columnWrapperStyle={columnWrapperStyle}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View style={{ marginBottom: rs(8) }}>
            {/* Search Bar + Filter Button */}
            <View
              style={[styles.searchRow, { gap: rs(10), marginBottom: rs(12) }]}
            >
              <View
                style={[
                  styles.searchBox,
                  {
                    height: rs(46),
                    borderRadius: rs(23),
                    paddingHorizontal: rs(14),
                    gap: rs(8),
                  },
                ]}
              >
                <Search color={COLORS.primary} size={rs(18)} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Tìm bộ phim yêu thích của bạn..."
                  placeholderTextColor={COLORS.inkMuted}
                  numberOfLines={1}
                  multiline={false}
                  style={[styles.searchInput, { fontSize: rs(13) }]}
                  returnKeyType="search"
                />
                {searchText.length > 0 ? (
                  <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                    <X color={COLORS.inkSoft} size={rs(16)} />
                  </Pressable>
                ) : (
                  <Sparkles color={COLORS.accent} size={rs(16)} />
                )}
              </View>

              <Pressable
                onPress={() => setShowFilter(prev => !prev)}
                style={({ pressed }) => [
                  styles.filterBtn,
                  {
                    width: rs(46),
                    height: rs(46),
                    borderRadius: rs(23),
                    transform: [{ translateY: pressed ? 2 : 0 }],
                  },
                  showFilter ? styles.filterBtnActive : null,
                ]}
              >
                {showFilter ? (
                  <X color="#FFFFFF" size={rs(18)} />
                ) : (
                  <SlidersHorizontal
                    color={hasActiveFilter ? COLORS.primary : COLORS.ink}
                    size={rs(18)}
                  />
                )}
                {hasActiveFilter && !showFilter ? (
                  <View
                    style={[
                      styles.filterDot,
                      {
                        width: rs(9),
                        height: rs(9),
                        borderRadius: rs(4.5),
                        top: rs(7),
                        right: rs(7),
                      },
                    ]}
                  />
                ) : null}
              </Pressable>
            </View>

            {/* Khối Bộ lọc Inline & Thanh Tổng kết */}
            <FilterSection
              visible={showFilter}
              filter={filter}
              categories={categories}
              totalItems={totalItems}
              onChangeFilter={setFilter}
              onReset={handleReset}
            />
          </View>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? (
            <View style={[styles.centeredContainer, { paddingVertical: rs(48), gap: rs(10) }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.loadingCaption, { fontSize: rs(13) }]}>
                Đang chuẩn bị bắp rang bơ... (◕‿◕✿)
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  marginTop: rs(24),
                  paddingVertical: rs(36),
                  paddingHorizontal: rs(20),
                  borderRadius: rs(24),
                  gap: rs(8),
                },
              ]}
            >
              <Text style={[styles.kaomoji, { fontSize: rs(28) }]}>
                (｡•́︿•̀｡)
              </Text>
              <Text style={[styles.emptyTitle, { fontSize: rs(16) }]}>
                Chưa tìm thấy bộ phim này rồi
              </Text>
              <Text style={[styles.emptyText, { fontSize: rs(13) }]}>
                Bạn thử đổi từ khóa khác hoặc bấm Đặt lại bộ lọc xem sao nhé!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={[styles.centeredContainer, { paddingVertical: rs(16) }]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : null
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.borderStrong,
  },
  searchInput: {
    flex: 1,
    color: COLORS.ink,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  filterDot: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.card,
  },
  centeredContainer: {
    alignItems: 'center',
  },
  loadingCaption: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  kaomoji: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  emptyTitle: {
    color: COLORS.ink,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.inkSoft,
    fontWeight: '500',
    textAlign: 'center',
  },
});
