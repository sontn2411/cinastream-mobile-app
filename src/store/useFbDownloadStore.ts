import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { safeUnlink } from '../services/hlsDownloader';
import {
  FB_DOWNLOAD_DIR,
  FB_REQUEST_HEADERS,
  FacebookVideoInfo,
  ensureFbDownloadDir,
  isAllowedFacebookVideoStreamUrl,
  sanitizeFileName,
} from '../services/facebookDownloader';

export type FbDownloadStatus = 'downloading' | 'completed' | 'failed';

export interface FbDownloadItem {
  id: string;
  title: string;
  sourceUrl: string;
  videoUrl: string;
  localFilePath: string;
  fileName: string;
  fileSize: number;
  status: FbDownloadStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  errorMessage?: string;
  createdAt: number;
}

export interface FbDownloadState {
  fbDownloads: FbDownloadItem[];
  // State lưu tạm trong phiên (RAM) cho màn hình FacebookDownloadScreen, tự xóa khi tắt app
  sessionInputUrl: string;
  sessionVideoInfo: FacebookVideoInfo | null;
  sessionDownloadId: string | null;
  setSessionInputUrl: (url: string) => void;
  setSessionScanResult: (
    info: FacebookVideoInfo | null,
    downloadId?: string | null,
  ) => void;
  setSessionDownloadId: (id: string | null) => void;
  clearSessionState: () => void;
  startFbDownload: (
    sourceUrl: string,
    videoUrl: string,
    title?: string,
  ) => string;
  retryFbDownload: (id: string) => void;
  removeFbDownload: (id: string) => Promise<void>;
  clearAllFbDownloads: () => Promise<void>;
  cleanupFailedFbDownloads: () => Promise<void>;
}

const activeFbTasks = new Map<string, { cancel: () => void }>();

function buildUniqueFileName(
  rawTitle: string | undefined,
  existingItems: FbDownloadItem[],
): { displayTitle: string; fileName: string } {
  const baseTitle = sanitizeFileName(
    (rawTitle || 'Facebook Video').replace(/\.mp4$/i, ''),
  );

  // Chỉ kiểm tra trùng tên với các file đã tải xong hoặc đang tải
  const validItems = existingItems.filter(
    item => item.status === 'completed' || item.status === 'downloading',
  );

  const isNameTaken = (candidateTitle: string, candidateFile: string) => {
    const lowerTitle = candidateTitle.toLowerCase();
    const lowerFile = candidateFile.toLowerCase();
    return validItems.some(
      item =>
        (item.title && item.title.toLowerCase() === lowerTitle) ||
        item.fileName.toLowerCase() === lowerFile,
    );
  };

  const defaultFile = `${baseTitle}.mp4`;
  if (!isNameTaken(baseTitle, defaultFile)) {
    return {
      displayTitle: baseTitle,
      fileName: defaultFile,
    };
  }

  let counter = 1;
  while (counter < 1000) {
    const candidateTitle = `${baseTitle} ${counter}`;
    const candidateFile = `${candidateTitle}.mp4`;
    if (!isNameTaken(candidateTitle, candidateFile)) {
      return {
        displayTitle: candidateTitle,
        fileName: candidateFile,
      };
    }
    counter += 1;
  }

  const fallback = `${baseTitle} ${Date.now().toString().slice(-4)}`;
  return {
    displayTitle: fallback,
    fileName: `${fallback}.mp4`,
  };
}

export const useFbDownloadStore = create<FbDownloadState>()(
  persist(
    (set, get) => {
      const executeDownloadTask = async (
        id: string,
        videoUrl: string,
        localFilePath: string,
      ) => {
        const tempPath = `${localFilePath}.part`;

        try {
          if (!isAllowedFacebookVideoStreamUrl(videoUrl)) {
            throw new Error('Nguồn phát video không thuộc máy chủ Facebook hợp lệ.');
          }
          if (
            !localFilePath.startsWith(`${FB_DOWNLOAD_DIR}/`) ||
            localFilePath.includes('..')
          ) {
            throw new Error('Đường dẫn lưu tệp không hợp lệ.');
          }

          await ensureFbDownloadDir();
          await safeUnlink(tempPath);

          const task = ReactNativeBlobUtil.config({
            path: tempPath,
            overwrite: true,
          }).fetch('GET', videoUrl, FB_REQUEST_HEADERS);

          activeFbTasks.set(id, task);

          task.progress({ interval: 250 }, (received, total) => {
            const r = Number(received) || 0;
            const t = Number(total) || 0;
            const p = t > 0 ? Math.min(99, Math.round((r / t) * 100)) : 0;

            const currentItem = get().fbDownloads.find(d => d.id === id);
            if (
              !currentItem ||
              currentItem.status !== 'downloading' ||
              (currentItem.progress === p &&
                Math.abs(r - currentItem.downloadedBytes) < 32768)
            ) {
              return;
            }

            set(state => ({
              fbDownloads: state.fbDownloads.map(item =>
                item.id === id && item.status === 'downloading'
                  ? {
                      ...item,
                      progress: p,
                      downloadedBytes: r,
                      totalBytes: t,
                    }
                  : item,
              ),
            }));
          });

          const res = await task;
          activeFbTasks.delete(id);

          // Nếu người dùng đã xóa mục này trong lúc đang tải thì dọn file tạm và dừng
          if (!get().fbDownloads.some(d => d.id === id)) {
            await safeUnlink(tempPath);
            return;
          }

          const status = res.info().status;

          if (status >= 200 && status < 300) {
            await safeUnlink(localFilePath);
            await ReactNativeBlobUtil.fs.mv(tempPath, localFilePath);
            const stat = await ReactNativeBlobUtil.fs.stat(localFilePath);
            const finalSize = Number(stat.size) || 0;

            if (finalSize <= 0) {
              throw new Error(
                'File tải về rỗng (0 B). Link video có thể đã hết hạn.',
              );
            }

            set(state => ({
              fbDownloads: state.fbDownloads.map(item =>
                item.id === id
                  ? {
                      ...item,
                      status: 'completed',
                      progress: 100,
                      fileSize: finalSize,
                      downloadedBytes: finalSize,
                      totalBytes: finalSize,
                      errorMessage: undefined,
                    }
                  : item,
              ),
            }));
          } else {
            throw new Error(`Tải thất bại (Mã HTTP ${status})`);
          }
        } catch (error: unknown) {
          activeFbTasks.delete(id);
          await safeUnlink(tempPath);
          await safeUnlink(localFilePath);

          if (!get().fbDownloads.some(d => d.id === id)) {
            return;
          }

          const errStr =
            error instanceof Error ? error.message : 'Lỗi kết nối khi tải video';

          set(state => ({
            fbDownloads: state.fbDownloads.map(item =>
              item.id === id
                ? {
                    ...item,
                    status: 'failed',
                    errorMessage: errStr,
                  }
                : item,
            ),
          }));
        }
      };

      return {
        fbDownloads: [],
        sessionInputUrl: '',
        sessionVideoInfo: null,
        sessionDownloadId: null,

        setSessionInputUrl: (url: string) => {
          set({ sessionInputUrl: url });
        },

        setSessionScanResult: (
          info: FacebookVideoInfo | null,
          downloadId: string | null = null,
        ) => {
          set({
            sessionVideoInfo: info,
            sessionDownloadId: downloadId,
          });
        },

        setSessionDownloadId: (id: string | null) => {
          set({ sessionDownloadId: id });
        },

        clearSessionState: () => {
          set({
            sessionInputUrl: '',
            sessionVideoInfo: null,
            sessionDownloadId: null,
          });
        },

        startFbDownload: (
          sourceUrl: string,
          videoUrl: string,
          title?: string,
        ) => {
          const currentValidList = get().fbDownloads.filter(
            d => d.status === 'completed' || d.status === 'downloading',
          );

          const activeDownloading = currentValidList.find(
            d => d.videoUrl === videoUrl && d.status === 'downloading',
          );
          if (activeDownloading) {
            return activeDownloading.id;
          }

          const timestamp = Date.now();
          const id = `fb_${timestamp}`;
          const { displayTitle, fileName } = buildUniqueFileName(
            title,
            currentValidList,
          );
          const localFilePath = `${FB_DOWNLOAD_DIR}/${fileName}`;

          const newItem: FbDownloadItem = {
            id,
            title: displayTitle,
            sourceUrl,
            videoUrl,
            localFilePath,
            fileName,
            fileSize: 0,
            status: 'downloading',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: 0,
            createdAt: timestamp,
          };

          set({
            fbDownloads: [newItem, ...currentValidList],
          });

          executeDownloadTask(id, videoUrl, localFilePath);

          return id;
        },

        retryFbDownload: (id: string) => {
          const target = get().fbDownloads.find(d => d.id === id);
          if (!target || target.status === 'downloading') {
            return;
          }

          set(state => ({
            fbDownloads: state.fbDownloads.map(item =>
              item.id === id
                ? {
                    ...item,
                    status: 'downloading',
                    progress: 0,
                    downloadedBytes: 0,
                    totalBytes: 0,
                    errorMessage: undefined,
                  }
                : item,
            ),
          }));

          executeDownloadTask(target.id, target.videoUrl, target.localFilePath);
        },

        removeFbDownload: async (id: string) => {
          const runningTask = activeFbTasks.get(id);
          if (runningTask) {
            try {
              runningTask.cancel();
            } catch {
              // Ignore cancel errors
            }
            activeFbTasks.delete(id);
          }

          const item = get().fbDownloads.find(d => d.id === id);
          set(state => ({
            fbDownloads: state.fbDownloads.filter(d => d.id !== id),
          }));

          if (item) {
            await safeUnlink(item.localFilePath);
            await safeUnlink(`${item.localFilePath}.part`);
          }
        },

        clearAllFbDownloads: async () => {
          activeFbTasks.forEach(task => {
            try {
              task.cancel();
            } catch {
              // Ignore cancel errors
            }
          });
          activeFbTasks.clear();

          const all = get().fbDownloads;
          set({ fbDownloads: [] });

          for (const item of all) {
            await safeUnlink(item.localFilePath);
            await safeUnlink(`${item.localFilePath}.part`);
          }
        },

        cleanupFailedFbDownloads: async () => {
          const failedItems = get().fbDownloads.filter(
            d =>
              d.status === 'failed' ||
              (d.status === 'completed' && d.fileSize <= 0),
          );
          if (failedItems.length === 0) {
            return;
          }
          set(state => ({
            fbDownloads: state.fbDownloads.filter(
              d =>
                d.status === 'downloading' ||
                (d.status === 'completed' && d.fileSize > 0),
            ),
          }));
          for (const item of failedItems) {
            await safeUnlink(item.localFilePath);
            await safeUnlink(`${item.localFilePath}.part`);
          }
        },
      };
    },
    {
      name: 'cinastream-fb-downloads',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        fbDownloads: state.fbDownloads.filter(
          item => item.status === 'completed' && item.fileSize > 0,
        ),
      }),
      merge: (persistedState, currentState) => {
        const typed = persistedState as Partial<FbDownloadState> | undefined;
        const cleanDownloads = (typed?.fbDownloads ?? []).filter(
          item => item.status === 'completed' && item.fileSize > 0,
        );
        return {
          ...currentState,
          fbDownloads: cleanDownloads,
        };
      },
      onRehydrateStorage: () => state => {
        state?.cleanupFailedFbDownloads();
      },
    },
  ),
);

useFbDownloadStore.getState().cleanupFailedFbDownloads();
