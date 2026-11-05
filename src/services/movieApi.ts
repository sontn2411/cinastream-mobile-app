import axios from 'axios';
import {
  CategoryRef,
  MovieDetailResult,
  MovieFilterState,
  MovieItem,
  MovieListResult,
  Pagination,
} from '../types/movie';

const api = axios.create({
  baseURL: 'https://phimapi.com',
  timeout: 15000,
});

const DEFAULT_PAGINATION: Pagination = {
  totalItems: 0,
  totalItemsPerPage: 24,
  currentPage: 1,
  totalPages: 1,
};

export async function fetchCategories(): Promise<CategoryRef[]> {
  const { data } = await api.get('/the-loai');
  return data?.data?.items ?? data?.items ?? [];
}

function matchesClientFilters(
  item: MovieItem,
  filter: MovieFilterState,
): boolean {
  if (
    filter.category &&
    item.category?.length &&
    !item.category.some(c => c.slug === filter.category)
  ) {
    return false;
  }
  if (
    filter.country &&
    item.country?.length &&
    !item.country.some(c => c.slug === filter.country)
  ) {
    return false;
  }
  if (filter.year && item.year && String(item.year) !== filter.year) {
    return false;
  }
  return true;
}

export async function fetchMovies(params: {
  filter: MovieFilterState;
  keyword?: string;
  page?: number;
  signal?: AbortSignal;
}): Promise<MovieListResult> {
  const { filter, keyword = '', page = 1, signal } = params;
  const trimmedKeyword = keyword.trim();

  // 1. Search by keyword
  if (trimmedKeyword) {
    const { data } = await api.get('/v1/api/tim-kiem', {
      params: { keyword: trimmedKeyword, page, limit: 24 },
      signal,
    });
    const rawItems: MovieItem[] = data?.data?.items ?? [];
    const items = rawItems.filter(item => matchesClientFilters(item, filter));
    const pagination: Pagination =
      data?.data?.params?.pagination ?? {
        ...DEFAULT_PAGINATION,
        totalItems: items.length,
        currentPage: page,
      };
    return { items, pagination };
  }

  const queryParams: Record<string, string | number> = { page };
  if (filter.category) {
    queryParams.category = filter.category;
  }
  if (filter.country) {
    queryParams.country = filter.country;
  }
  if (filter.year) {
    queryParams.year = filter.year;
  }

  // 2. Specific list type (phim-bo, phim-le, hoat-hinh)
  if (
    filter.listType === 'phim-bo' ||
    filter.listType === 'phim-le' ||
    filter.listType === 'hoat-hinh'
  ) {
    const { data } = await api.get(`/v1/api/danh-sach/${filter.listType}`, {
      params: queryParams,
      signal,
    });
    return {
      items: data?.data?.items ?? [],
      pagination: data?.data?.params?.pagination ?? DEFAULT_PAGINATION,
    };
  }

  // 3. 'all' or 'phim-moi-cap-nhat' with sub-filters (category / country / year)
  if (filter.category) {
    const { category, ...rest } = queryParams;
    const { data } = await api.get(`/v1/api/the-loai/${category}`, {
      params: rest,
      signal,
    });
    return {
      items: data?.data?.items ?? [],
      pagination: data?.data?.params?.pagination ?? DEFAULT_PAGINATION,
    };
  }

  if (filter.country) {
    const { country, ...rest } = queryParams;
    const { data } = await api.get(`/v1/api/quoc-gia/${country}`, {
      params: rest,
      signal,
    });
    return {
      items: data?.data?.items ?? [],
      pagination: data?.data?.params?.pagination ?? DEFAULT_PAGINATION,
    };
  }

  if (filter.year) {
    const { year, ...rest } = queryParams;
    const { data } = await api.get(`/v1/api/nam/${year}`, {
      params: rest,
      signal,
    });
    return {
      items: data?.data?.items ?? [],
      pagination: data?.data?.params?.pagination ?? DEFAULT_PAGINATION,
    };
  }

  // 4. Default: Phim mới cập nhật
  const { data } = await api.get('/danh-sach/phim-moi-cap-nhat', {
    params: { page },
    signal,
  });
  return {
    items: data?.items ?? [],
    pagination: data?.pagination ?? DEFAULT_PAGINATION,
  };
}

export async function fetchMovieDetail(
  slug: string,
  signal?: AbortSignal,
): Promise<MovieDetailResult> {
  const { data } = await api.get(`/phim/${slug}`, { signal });
  return {
    movie: data?.movie,
    episodes: data?.episodes ?? [],
  };
}

