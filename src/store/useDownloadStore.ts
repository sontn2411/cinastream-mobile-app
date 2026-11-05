import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieItem } from '../types/movie';
import { getImageSrc } from '../utils/image';
import {
  BASE_DOWNLOAD_DIR,
  cancelAndDeleteHlsDownloadJob,
  cleanupOrphanedDownloads,
  downloadAndSaveMoviePoster,
  getEpisodeDownloadDir,
  pauseHlsDownloadJob,
  removeMoviePoster,
  safeUnlink,
  sanitizeFolderName,
  startHlsDownloadJob,
} from '../services/hlsDownloader';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export interface DownloadEpisodeItem {
  id: string;
  movie: MovieItem;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  serverName: string;
  remoteUri: string;
  localManifestPath: string;
  localPosterPath?: string;
  directoryPath: string;
  status: DownloadStatus;
  progress: number;
  downloadedSegments: number;
  totalSegments: number;
  downloadedBytes: number;
  durationMinutes: number;
  detectedQuality?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StartDownloadPayload {
  movie: MovieItem;
  episodeName: string;
  episodeSlug: string;
  episodeIndex: number;
  serverIndex: number;
  serverName: string;
  remoteUri: string;
}

export interface MovieDownloadGroup {
  movieSlug: string;
  movie: MovieItem;
  localPosterPath?: string;
  episodes: DownloadEpisodeItem[];
  totalEpisodes: number;
  completedCount: number;
  activeCount: number;
  totalBytes: number;
  latestUpdatedAt: number;
}

export interface DownloadState {
  downloads: DownloadEpisodeItem[];
  startDownload: (payload: StartDownloadPayload) => void;
  startBatchDownloads: (payloads: StartDownloadPayload[]) => void;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => void;
  removeDownload: (id: string) => Promise<void>;
  removeMovieDownloads: (movieSlug: string) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  getDownloadItem: (
    movieSlug: string,
    serverIndex: number,
    episodeSlug: string,
  ) => DownloadEpisodeItem | undefined;
}

export function buildDownloadId(
  movieSlug: string,
  serverIndex: number,
  episodeSlug: string,
): string {
  return `${movieSlug}_s${serverIndex}_ep_${episodeSlug}`;
}

export function groupDownloadsByMovie(
  downloads: DownloadEpisodeItem[],
): MovieDownloadGroup[] {
  const map = new Map<string, MovieDownloadGroup>();

  for (const item of downloads) {
    const slug = item.movie.slug;
    const existing = map.get(slug);
    if (!existing) {
      map.set(slug, {
        movieSlug: slug,
        movie: item.movie,
        localPosterPath: item.localPosterPath,
        episodes: [item],
        totalEpisodes: 1,
        completedCount: item.status === 'completed' ? 1 : 0,
        activeCount:
          item.status === 'downloading' ||
          item.status === 'queued' ||
          item.status === 'paused'
            ? 1
            : 0,
        totalBytes: item.downloadedBytes || 0,
        latestUpdatedAt: item.updatedAt,
      });
    } else {
      existing.episodes.push(item);
      if (!existing.localPosterPath && item.localPosterPath) {
        existing.localPosterPath = item.localPosterPath;
      }
      existing.totalEpisodes += 1;
      if (item.status === 'completed') {
        existing.completedCount += 1;
      }
      if (
        item.status === 'downloading' ||
        item.status === 'queued' ||
        item.status === 'paused'
      ) {
        existing.activeCount += 1;
      }
      existing.totalBytes += item.downloadedBytes || 0;
      if (item.updatedAt > existing.latestUpdatedAt) {
        existing.latestUpdatedAt = item.updatedAt;
      }
    }
  }

  const groups = Array.from(map.values());
  for (const group of groups) {
    group.episodes.sort((a, b) => a.episodeIndex - b.episodeIndex);
  }
  groups.sort((a, b) => b.latestUpdatedAt - a.latestUpdatedAt);
  return groups;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => {
      const ensureMoviePoster = (movie: MovieItem) => {
        const remotePosterUrl = getImageSrc(
          movie.poster_url || movie.thumb_url,
        );
        if (!remotePosterUrl || !movie.slug) {
          return;
        }
        downloadAndSaveMoviePoster(movie.slug, remotePosterUrl)
          .then(savedPath => {
            if (!savedPath) {
              return;
            }
            const localPosterUri = savedPath.startsWith('file://')
              ? savedPath
              : `file://${savedPath}`;
            set(state => ({
              downloads: state.downloads.map(d =>
                d.movie.slug === movie.slug
                  ? { ...d, localPosterPath: localPosterUri }
                  : d,
              ),
            }));
          })
          .catch(() => {});
      };

      // Process queue: if nothing is currently downloading, pick the oldest 'queued' item
      const processQueue = () => {
        const currentList = get().downloads;
        const isAnyDownloading = currentList.some(
          d => d.status === 'downloading',
        );
        if (isAnyDownloading) {
          return;
        }

        const nextQueued = currentList.find(d => d.status === 'queued');
        if (!nextQueued) {
          return;
        }

        // Change status from queued -> downloading and start engine
        set(state => ({
          downloads: state.downloads.map(d =>
            d.id === nextQueued.id
              ? { ...d, status: 'downloading', updatedAt: Date.now() }
              : d,
          ),
        }));

        triggerEngineJob(nextQueued.id, nextQueued.remoteUri);
      };

      const triggerEngineJob = (id: string, remoteUri: string) => {
        startHlsDownloadJob({
          id,
          remoteUri,
          callbacks: {
            onMetadata: meta => {
              set(state => ({
                downloads: state.downloads.map(d =>
                  d.id === id
                    ? {
                        ...d,
                        totalSegments: meta.totalSegments,
                        durationMinutes:
                          meta.durationMinutes || d.durationMinutes,
                        detectedQuality:
                          meta.detectedQuality || d.detectedQuality,
                        directoryPath: meta.directoryPath,
                        localManifestPath: meta.localManifestPath,
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
            },
            onProgress: snapshot => {
              set(state => ({
                downloads: state.downloads.map(d =>
                  d.id === id && d.status === 'downloading'
                    ? {
                        ...d,
                        downloadedSegments: snapshot.downloadedSegments,
                        totalSegments: snapshot.totalSegments,
                        downloadedBytes: snapshot.downloadedBytes,
                        progress: snapshot.progress,
                        durationMinutes:
                          snapshot.durationMinutes || d.durationMinutes,
                        detectedQuality:
                          snapshot.detectedQuality || d.detectedQuality,
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
            },
            onPaused: snapshot => {
              set(state => ({
                downloads: state.downloads.map(d =>
                  d.id === id
                    ? {
                        ...d,
                        status: 'paused',
                        downloadedSegments: snapshot.downloadedSegments,
                        totalSegments: snapshot.totalSegments,
                        downloadedBytes: snapshot.downloadedBytes,
                        progress: snapshot.progress,
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
              // When paused, auto advance to the next item in queue!
              processQueue();
            },
            onCompleted: result => {
              set(state => ({
                downloads: state.downloads.map(d =>
                  d.id === id
                    ? {
                        ...d,
                        status: 'completed',
                        progress: 100,
                        downloadedSegments: result.totalSegments,
                        totalSegments: result.totalSegments,
                        downloadedBytes: result.downloadedBytes,
                        durationMinutes:
                          result.durationMinutes || d.durationMinutes,
                        localManifestPath: result.localManifestPath,
                        directoryPath: result.directoryPath,
                        errorMessage: undefined,
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
              // Auto start next item in queue!
              processQueue();
            },
            onFailed: errorMessage => {
              set(state => ({
                downloads: state.downloads.map(d =>
                  d.id === id
                    ? {
                        ...d,
                        status: 'failed',
                        progress: 0,
                        downloadedSegments: 0,
                        downloadedBytes: 0,
                        errorMessage,
                        updatedAt: Date.now(),
                      }
                    : d,
                ),
              }));
              // Even if current failed, continue downloading next item in queue
              processQueue();
            },
          },
        });
      };

      return {
        downloads: [],

        startDownload: (payload: StartDownloadPayload) => {
          const id = buildDownloadId(
            payload.movie.slug,
            payload.serverIndex,
            payload.episodeSlug,
          );
          const currentList = get().downloads;
          const existing = currentList.find(d => d.id === id);

          if (
            existing &&
            (existing.status === 'downloading' ||
              existing.status === 'queued' ||
              existing.status === 'completed')
          ) {
            return;
          }

          const directoryPath = getEpisodeDownloadDir(id);
          const localManifestPath = `file://${directoryPath}/local.m3u8`;
          const now = Date.now();
          const existingMoviePoster = currentList.find(
            d => d.movie.slug === payload.movie.slug && d.localPosterPath,
          )?.localPosterPath;

          // If something is already downloading, queue this item
          const isBusy = currentList.some(d => d.status === 'downloading');
          const initialStatus: DownloadStatus = isBusy ? 'queued' : 'downloading';

          const newItem: DownloadEpisodeItem = {
            id,
            movie: payload.movie,
            episodeName: payload.episodeName,
            episodeSlug: payload.episodeSlug,
            episodeIndex: payload.episodeIndex,
            serverIndex: payload.serverIndex,
            serverName: payload.serverName,
            remoteUri: payload.remoteUri,
            localManifestPath,
            localPosterPath: existing?.localPosterPath ?? existingMoviePoster,
            directoryPath,
            status: initialStatus,
            progress: existing?.status === 'paused' ? existing.progress : 0,
            downloadedSegments:
              existing?.status === 'paused' ? existing.downloadedSegments : 0,
            totalSegments:
              existing?.status === 'paused' ? existing.totalSegments : 0,
            downloadedBytes:
              existing?.status === 'paused' ? existing.downloadedBytes : 0,
            durationMinutes: existing?.durationMinutes ?? 0,
            detectedQuality: existing?.detectedQuality ?? payload.movie.quality,
            errorMessage: undefined,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };

          set(state => ({
            downloads: [
              ...state.downloads.filter(d => d.id !== id),
              newItem,
            ],
          }));

          ensureMoviePoster(payload.movie);

          if (initialStatus === 'downloading') {
            triggerEngineJob(id, payload.remoteUri);
          }
        },

        startBatchDownloads: (payloads: StartDownloadPayload[]) => {
          const currentList = get().downloads;
          const isBusyInitially = currentList.some(
            d => d.status === 'downloading',
          );
          let assignedDownloading = isBusyInitially;
          const newItems: DownloadEpisodeItem[] = [];
          const moviesToDownloadPoster = new Map<string, MovieItem>();
          const now = Date.now();

          for (const payload of payloads) {
            const id = buildDownloadId(
              payload.movie.slug,
              payload.serverIndex,
              payload.episodeSlug,
            );
            const existing = currentList.find(d => d.id === id);
            if (
              existing &&
              (existing.status === 'downloading' ||
                existing.status === 'queued' ||
                existing.status === 'completed')
            ) {
              continue;
            }

            const existingMoviePoster = currentList.find(
              d => d.movie.slug === payload.movie.slug && d.localPosterPath,
            )?.localPosterPath;

            const directoryPath = getEpisodeDownloadDir(id);
            const localManifestPath = `file://${directoryPath}/local.m3u8`;
            const status: DownloadStatus = !assignedDownloading
              ? 'downloading'
              : 'queued';

            if (status === 'downloading') {
              assignedDownloading = true;
            }

            moviesToDownloadPoster.set(payload.movie.slug, payload.movie);

            newItems.push({
              id,
              movie: payload.movie,
              episodeName: payload.episodeName,
              episodeSlug: payload.episodeSlug,
              episodeIndex: payload.episodeIndex,
              serverIndex: payload.serverIndex,
              serverName: payload.serverName,
              remoteUri: payload.remoteUri,
              localManifestPath,
              localPosterPath: existing?.localPosterPath ?? existingMoviePoster,
              directoryPath,
              status,
              progress: existing?.status === 'paused' ? existing.progress : 0,
              downloadedSegments:
                existing?.status === 'paused' ? existing.downloadedSegments : 0,
              totalSegments:
                existing?.status === 'paused' ? existing.totalSegments : 0,
              downloadedBytes:
                existing?.status === 'paused' ? existing.downloadedBytes : 0,
              durationMinutes: existing?.durationMinutes ?? 0,
              detectedQuality:
                existing?.detectedQuality ?? payload.movie.quality,
              errorMessage: undefined,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
            });
          }

          if (newItems.length === 0) {
            return;
          }

          const newItemIds = new Set(newItems.map(item => item.id));
          set(state => ({
            downloads: [
              ...state.downloads.filter(d => !newItemIds.has(d.id)),
              ...newItems,
            ],
          }));

          for (const movie of moviesToDownloadPoster.values()) {
            ensureMoviePoster(movie);
          }

          // Trigger the one designated as 'downloading'
          const activeItem = newItems.find(d => d.status === 'downloading');
          if (activeItem) {
            triggerEngineJob(activeItem.id, activeItem.remoteUri);
          }
        },

        pauseDownload: async (id: string) => {
          const target = get().downloads.find(d => d.id === id);
          if (!target) {
            return;
          }

          set(state => ({
            downloads: state.downloads.map(d =>
              d.id === id
                ? { ...d, status: 'paused', updatedAt: Date.now() }
                : d,
            ),
          }));

          if (target.status === 'downloading') {
            await pauseHlsDownloadJob(id);
          }
          // Resume next queued item if current was running
          processQueue();
        },

        resumeDownload: (id: string) => {
          const currentList = get().downloads;
          const target = currentList.find(d => d.id === id);
          if (
            !target ||
            target.status === 'downloading' ||
            target.status === 'queued'
          ) {
            return;
          }

          const isBusy = currentList.some(d => d.status === 'downloading');
          const newStatus: DownloadStatus = isBusy ? 'queued' : 'downloading';

          set(state => ({
            downloads: state.downloads.map(d =>
              d.id === id
                ? {
                    ...d,
                    status: newStatus,
                    errorMessage: undefined,
                    updatedAt: Date.now(),
                  }
                : d,
            ),
          }));

          if (!target.localPosterPath) {
            ensureMoviePoster(target.movie);
          }

          if (newStatus === 'downloading') {
            triggerEngineJob(id, target.remoteUri);
          }
        },

        removeDownload: async (id: string) => {
          const target = get().downloads.find(d => d.id === id);
          set(state => ({
            downloads: state.downloads.filter(d => d.id !== id),
          }));
          await cancelAndDeleteHlsDownloadJob(id, target?.directoryPath);
          if (target) {
            const hasRemainingForMovie = get().downloads.some(
              d => d.movie.slug === target.movie.slug,
            );
            if (!hasRemainingForMovie) {
              await removeMoviePoster(target.movie.slug);
            }
          }
          processQueue();
        },

        removeMovieDownloads: async (movieSlug: string) => {
          const targets = get().downloads.filter(
            d => d.movie.slug === movieSlug,
          );
          set(state => ({
            downloads: state.downloads.filter(d => d.movie.slug !== movieSlug),
          }));
          await Promise.allSettled([
            ...targets.map(t =>
              cancelAndDeleteHlsDownloadJob(t.id, t.directoryPath),
            ),
            removeMoviePoster(movieSlug),
          ]);
          processQueue();
        },

        clearAllDownloads: async () => {
          const current = get().downloads;
          set({ downloads: [] });
          await Promise.allSettled(
            current.map(t =>
              cancelAndDeleteHlsDownloadJob(t.id, t.directoryPath),
            ),
          );
          await safeUnlink(BASE_DOWNLOAD_DIR);
        },

        getDownloadItem: (
          movieSlug: string,
          serverIndex: number,
          episodeSlug: string,
        ) => {
          const id = buildDownloadId(movieSlug, serverIndex, episodeSlug);
          return get().downloads.find(d => d.id === id);
        },
      };
    },
    {
      name: 'cinastream_download_storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (!state) {
          return;
        }
        // Convert any interrupted 'downloading' or 'queued' items to 'paused'
        const updated = state.downloads.map(item => {
          if (item.status === 'downloading' || item.status === 'queued') {
            return { ...item, status: 'paused' as const };
          }
          if (item.status === 'failed') {
            return {
              ...item,
              progress: 0,
              downloadedSegments: 0,
              downloadedBytes: 0,
            };
          }
          return item;
        });

        useDownloadStore.setState({ downloads: updated });

        // Run Startup Garbage Collector
        const validFolders = new Set<string>();
        const validMovieSlugs = new Set<string>();
        const moviesMissingPoster = new Map<string, MovieItem>();

        for (const item of updated) {
          if (item.status === 'completed' || item.status === 'paused') {
            validFolders.add(sanitizeFolderName(item.id));
          }
          if (item.movie?.slug) {
            validMovieSlugs.add(sanitizeFolderName(item.movie.slug));
            if (!item.localPosterPath) {
              moviesMissingPoster.set(item.movie.slug, item.movie);
            }
          }
        }
        cleanupOrphanedDownloads(validFolders, validMovieSlugs).catch(() => {});

        // Backfill local posters for existing downloads
        for (const movie of moviesMissingPoster.values()) {
          const remotePosterUrl = getImageSrc(
            movie.poster_url || movie.thumb_url,
          );
          if (remotePosterUrl) {
            downloadAndSaveMoviePoster(movie.slug, remotePosterUrl)
              .then(savedPath => {
                if (!savedPath) {
                  return;
                }
                const localPosterUri = savedPath.startsWith('file://')
                  ? savedPath
                  : `file://${savedPath}`;
                useDownloadStore.setState(s => ({
                  downloads: s.downloads.map(d =>
                    d.movie.slug === movie.slug
                      ? { ...d, localPosterPath: localPosterUri }
                      : d,
                  ),
                }));
              })
              .catch(() => {});
          }
        }
      },
    },
  ),
);
