import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieItem } from '../types/movie';

export interface HistoryItem {
  movie: MovieItem;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface SaveProgressPayload {
  movie: MovieItem;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  currentTime: number;
  duration: number;
}

export interface HistoryState {
  history: HistoryItem[];
  saveProgress: (payload: SaveProgressPayload) => void;
  removeHistory: (slug: string) => void;
  clearHistory: () => void;
  getHistoryItem: (slug: string) => HistoryItem | undefined;
}

const MAX_HISTORY_ITEMS = 50;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      saveProgress: (payload: SaveProgressPayload) => {
        const currentList = get().history;
        const existing = currentList.find(
          item => item.movie.slug === payload.movie.slug,
        );

        const duration =
          payload.duration > 0
            ? payload.duration
            : existing?.duration && existing.duration > 0
            ? existing.duration
            : 0;

        const newItem: HistoryItem = {
          ...payload,
          duration,
          updatedAt: Date.now(),
        };

        const remaining = currentList.filter(
          item => item.movie.slug !== payload.movie.slug,
        );

        set({
          history: [newItem, ...remaining].slice(0, MAX_HISTORY_ITEMS),
        });
      },

      removeHistory: (slug: string) => {
        set({
          history: get().history.filter(item => item.movie.slug !== slug),
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getHistoryItem: (slug: string) => {
        return get().history.find(item => item.movie.slug === slug);
      },
    }),
    {
      name: 'cinastream_history_storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

