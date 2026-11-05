import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieItem } from '../types/movie';

export interface FavoriteState {
  favorites: MovieItem[];
  toggleFavorite: (movie: MovieItem) => void;
  removeFavorite: (slug: string) => void;
  clearFavorites: () => void;
  isFavorite: (slug: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (movie: MovieItem) => {
        const currentFavorites = get().favorites;
        const exists = currentFavorites.some(item => item.slug === movie.slug);
        if (exists) {
          set({
            favorites: currentFavorites.filter(item => item.slug !== movie.slug),
          });
        } else {
          set({
            favorites: [movie, ...currentFavorites],
          });
        }
      },

      removeFavorite: (slug: string) => {
        set({
          favorites: get().favorites.filter(item => item.slug !== slug),
        });
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },

      isFavorite: (slug: string) => {
        return get().favorites.some(item => item.slug === slug);
      },
    }),
    {
      name: 'cinastream_favorites_storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
