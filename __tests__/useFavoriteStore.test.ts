import { useFavoriteStore } from '../src/store/useFavoriteStore';
import { MovieItem } from '../src/types/movie';

const mockMovie1: MovieItem = {
  _id: '1',
  name: 'Squid Game 2',
  slug: 'tro-choi-con-muc-2',
  origin_name: 'Squid Game Season 2',
  poster_url: 'https://example.com/poster1.jpg',
  thumb_url: 'https://example.com/thumb1.jpg',
  year: 2024,
  quality: 'FHD',
  lang: 'Vietsub',
};

const mockMovie2: MovieItem = {
  _id: '2',
  name: 'Avatar 3',
  slug: 'avatar-3',
  origin_name: 'Avatar: Fire and Ash',
  poster_url: 'https://example.com/poster2.jpg',
  thumb_url: 'https://example.com/thumb2.jpg',
  year: 2025,
  quality: '4K',
  lang: 'Thuyết Minh',
};

describe('useFavoriteStore', () => {
  beforeEach(() => {
    useFavoriteStore.getState().clearFavorites();
  });

  it('initially has empty favorites list', () => {
    const { favorites } = useFavoriteStore.getState();
    expect(favorites).toEqual([]);
  });

  it('adds movie when toggleFavorite is called', () => {
    useFavoriteStore.getState().toggleFavorite(mockMovie1);

    const { favorites, isFavorite } = useFavoriteStore.getState();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].slug).toBe('tro-choi-con-muc-2');
    expect(isFavorite('tro-choi-con-muc-2')).toBe(true);
    expect(isFavorite('avatar-3')).toBe(false);
  });

  it('removes movie when toggleFavorite is called again on the same movie', () => {
    useFavoriteStore.getState().toggleFavorite(mockMovie1);
    expect(useFavoriteStore.getState().favorites).toHaveLength(1);

    useFavoriteStore.getState().toggleFavorite(mockMovie1);
    expect(useFavoriteStore.getState().favorites).toHaveLength(0);
    expect(useFavoriteStore.getState().isFavorite('tro-choi-con-muc-2')).toBe(false);
  });

  it('orders newly added movies first', () => {
    useFavoriteStore.getState().toggleFavorite(mockMovie1);
    useFavoriteStore.getState().toggleFavorite(mockMovie2);

    const { favorites } = useFavoriteStore.getState();
    expect(favorites).toHaveLength(2);
    expect(favorites[0].slug).toBe('avatar-3');
    expect(favorites[1].slug).toBe('tro-choi-con-muc-2');
  });

  it('removes movie by slug via removeFavorite', () => {
    useFavoriteStore.getState().toggleFavorite(mockMovie1);
    useFavoriteStore.getState().toggleFavorite(mockMovie2);

    useFavoriteStore.getState().removeFavorite('tro-choi-con-muc-2');

    const { favorites, isFavorite } = useFavoriteStore.getState();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].slug).toBe('avatar-3');
    expect(isFavorite('tro-choi-con-muc-2')).toBe(false);
  });

  it('clears all favorites via clearFavorites', () => {
    useFavoriteStore.getState().toggleFavorite(mockMovie1);
    useFavoriteStore.getState().toggleFavorite(mockMovie2);
    expect(useFavoriteStore.getState().favorites).toHaveLength(2);

    useFavoriteStore.getState().clearFavorites();
    expect(useFavoriteStore.getState().favorites).toHaveLength(0);
  });
});

