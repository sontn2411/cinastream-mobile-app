export interface CategoryRef {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
}

export interface CountryRef {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
}

export interface MovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year?: number;
  type?: string;
  time?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  chieurap?: boolean;
  category?: CategoryRef[];
  country?: CountryRef[];
  tmdb?: {
    id?: string | null;
    type?: string;
    season?: number | null;
    vote_average?: number;
    vote_count?: number;
  };
  imdb?: {
    id?: string | null;
    vote_average?: number;
    vote_count?: number;
  };
}

export interface EpisodeItem {
  name: string;
  slug: string;
  filename?: string;
  link_embed?: string;
  link_m3u8?: string;
  episodeIndex?: number;
}

export interface EpisodeServer {
  server_name: string;
  server_data: EpisodeItem[];
  serverIndex?: number;
}

export interface MovieDetail extends MovieItem {
  content?: string;
  status?: string;
  trailer_url?: string;
  episode_total?: number | string;
  view?: number;
  actor?: string[];
  director?: string[];
}

export interface MovieDetailResult {
  movie: MovieDetail;
  episodes: EpisodeServer[];
}

export interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export type MovieListType =
  | 'all'
  | 'phim-moi-cap-nhat'
  | 'phim-bo'
  | 'phim-le'
  | 'hoat-hinh';

export interface MovieFilterState {
  listType: MovieListType;
  category: string; // '' means Tất cả
  country: string; // '' means Tất cả
  year: string; // '' means Tất cả
}

export interface MovieListResult {
  items: MovieItem[];
  pagination: Pagination;
}
