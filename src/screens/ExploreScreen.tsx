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
import { Mic, Search, SlidersHorizontal, X } from 'lucide-react-native';
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

  return (
    <View style={styles.container}>
      <FlatList
        key={`grid-${numColumns}`}
        data={movies}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topOffset,
          paddingBottom: rs(84),
          paddingHorizontal: horizontalPad,
        }}
        columnWrapperStyle={{
          gap,
          marginBottom: gap,
        }}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View style={{ marginBottom: rs(6) }}>
            {/* Search Bar + Filter Button */}
            <View
              style={[styles.searchRow, { gap: rs(10), marginBottom: rs(12) }]}>
              <View
                style={[
                  styles.searchBox,
                  {
                    height: rs(44),
                    borderRadius: rs(12),
                    paddingHorizontal: rs(12),
                    gap: rs(8),
                  },
                ]}>
                <Search color="#8A8F9E" size={rs(18)} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Tìm tên phim..."
                  placeholderTextColor="#6B7280"
                  numberOfLines={1}
                  multiline={false}
                  style={[styles.searchInput, { fontSize: rs(13) }]}
                  returnKeyType="search"
                />
                {searchText.length > 0 ? (
                  <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                    <X color="#9CA3AF" size={rs(16)} />
                  </Pressable>
                ) : (
                  <Mic color="#8A8F9E" size={rs(17)} />
                )}
              </View>

              <Pressable
                onPress={() => setShowFilter(prev => !prev)}
                style={[
                  styles.filterBtn,
                  {
                    width: rs(44),
                    height: rs(44),
                    borderRadius: rs(12),
                  },
                  showFilter ? styles.filterBtnActive : null,
                ]}>
                {showFilter ? (
                  <X color="#FFFFFF" size={rs(18)} />
                ) : (
                  <SlidersHorizontal color="#FFFFFF" size={rs(18)} />
                )}
                {hasActiveFilter && !showFilter ? (
                  <View
                    style={[
                      styles.filterDot,
                      {
                        width: rs(8),
                        height: rs(8),
                        borderRadius: rs(4),
                        top: rs(8),
                        right: rs(8),
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
            <View style={{ paddingVertical: rs(48), alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={{ paddingVertical: rs(48), alignItems: 'center' }}>
              <Text style={[styles.emptyText, { fontSize: rs(14) }]}>
                Không tìm thấy phim phù hợp
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: rs(16), alignItems: 'center' }}>
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
    backgroundColor: '#0B0C10',
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
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  filterBtn: {
    backgroundColor: '#161821',
    borderWidth: 1,
    borderColor: '#232634',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    borderColor: '#2F3346',
    backgroundColor: '#1C1F2B',
  },
  filterDot: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
  },
  emptyText: {
    color: '#8A8F9E',
  },
});
