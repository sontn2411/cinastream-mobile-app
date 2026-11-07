import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieItem } from '../types/movie';

export interface EpisodeWatchProgress {
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface HistoryItem {
  movie: MovieItem;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
  episodes?: Record<string, EpisodeWatchProgress>;
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
  getEpisodeProgress: (
    slug: string,
    serverIndex: number,
    episodeIndex: number,
  ) => EpisodeWatchProgress | undefined;
}

const MAX_HISTORY_ITEMS = 50;

function getEpisodeKey(serverIndex: number, episodeIndex: number): string {
  return `s${serverIndex}_ep${episodeIndex}`;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      saveProgress: (payload: SaveProgressPayload) => {
        const currentList = get().history;
        const existing = currentList.find(
          item => item.movie.slug === payload.movie.slug,
        );

        const epKey = getEpisodeKey(payload.serverIndex, payload.episodeIndex);
        const existingEp =
          existing?.episodes?.[epKey] ??
          (existing &&
          (existing.serverIndex ?? 0) === payload.serverIndex &&
          existing.episodeIndex === payload.episodeIndex
            ? {
                episodeName: existing.episodeName,
                episodeSlug: existing.episodeSlug,
                episodeIndex: existing.episodeIndex,
                serverIndex: existing.serverIndex ?? 0,
                currentTime: existing.currentTime,
                duration: existing.duration,
                updatedAt: existing.updatedAt,
              }
            : undefined);

        const duration =
          payload.duration > 0
            ? payload.duration
            : existingEp?.duration && existingEp.duration > 0
            ? existingEp.duration
            : 0;

        const now = Date.now();
        const updatedEpisodes: Record<string, EpisodeWatchProgress> = {
          ...(existing?.episodes ?? {}),
        };

        if (existing && !existing.episodes && existing.currentTime > 0) {
          const legacyKey = getEpisodeKey(
            existing.serverIndex ?? 0,
            existing.episodeIndex ?? 0,
          );
          updatedEpisodes[legacyKey] = {
            episodeName: existing.episodeName,
            episodeSlug: existing.episodeSlug,
            episodeIndex: existing.episodeIndex ?? 0,
            serverIndex: existing.serverIndex ?? 0,
            currentTime: existing.currentTime,
            duration: existing.duration,
            updatedAt: existing.updatedAt,
          };
        }

        updatedEpisodes[epKey] = {
          episodeName: payload.episodeName,
          episodeSlug: payload.episodeSlug,
          episodeIndex: payload.episodeIndex,
          serverIndex: payload.serverIndex,
          currentTime: payload.currentTime,
          duration,
          updatedAt: now,
        };

        const newItem: HistoryItem = {
          ...payload,
          duration,
          updatedAt: now,
          episodes: updatedEpisodes,
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

      getEpisodeProgress: (
        slug: string,
        serverIndex: number,
        episodeIndex: number,
      ) => {
        const item = get().history.find(h => h.movie.slug === slug);
        if (!item) {
          return undefined;
        }
        const epKey = getEpisodeKey(serverIndex, episodeIndex);
        if (item.episodes?.[epKey]) {
          return item.episodes[epKey];
        }
        if (
          (item.serverIndex ?? 0) === serverIndex &&
          item.episodeIndex === episodeIndex
        ) {
          return {
            episodeName: item.episodeName,
            episodeSlug: item.episodeSlug,
            episodeIndex: item.episodeIndex,
            serverIndex: item.serverIndex ?? 0,
            currentTime: item.currentTime,
            duration: item.duration,
            updatedAt: item.updatedAt,
          };
        }
        return undefined;
      },
    }),
    {
      name: 'cinastream_history_storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

