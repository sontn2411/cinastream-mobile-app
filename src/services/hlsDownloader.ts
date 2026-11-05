import axios from 'axios';
import ReactNativeBlobUtil from 'react-native-blob-util';

const CONCURRENCY = 5;
const MAX_RETRIES = 3;

export const BASE_DOWNLOAD_DIR = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/downloads`;
export const POSTERS_DOWNLOAD_DIR = `${BASE_DOWNLOAD_DIR}/posters`;

export async function ensureNoMediaFile(dirPath: string): Promise<void> {
  try {
    const noMediaPath = `${dirPath}/.nomedia`;
    const exists = await ReactNativeBlobUtil.fs.exists(noMediaPath);
    if (!exists) {
      await ReactNativeBlobUtil.fs.writeFile(noMediaPath, '', 'utf8');
    }
  } catch {
    // Ignore errors on non-android or file system permissions
  }
}

export function getMoviePosterPath(movieSlug: string): string {
  const cleanSlug = sanitizeFolderName(movieSlug);
  return `${POSTERS_DOWNLOAD_DIR}/${cleanSlug}.jpg`;
}

export async function removeMoviePoster(movieSlug: string): Promise<void> {
  if (!movieSlug) {
    return;
  }
  await safeUnlink(getMoviePosterPath(movieSlug));
}

export async function downloadAndSaveMoviePoster(
  movieSlug: string,
  remoteImageUrl: string,
): Promise<string | undefined> {
  if (!remoteImageUrl || !movieSlug) {
    return undefined;
  }
  const targetPath = getMoviePosterPath(movieSlug);

  try {
    const exists = await ReactNativeBlobUtil.fs.exists(targetPath);
    if (exists) {
      const stat = await ReactNativeBlobUtil.fs.stat(targetPath);
      if (Number(stat.size) > 0) {
        return targetPath;
      }
      await safeUnlink(targetPath);
    }

    const postersDirExists = await ReactNativeBlobUtil.fs.exists(POSTERS_DOWNLOAD_DIR);
    if (!postersDirExists) {
      await ReactNativeBlobUtil.fs.mkdir(POSTERS_DOWNLOAD_DIR);
    }
    await ensureNoMediaFile(POSTERS_DOWNLOAD_DIR);

    const tempPath = `${targetPath}.part`;
    await safeUnlink(tempPath);

    const res = await ReactNativeBlobUtil.config({
      path: tempPath,
      timeout: 20000,
      overwrite: true,
    }).fetch('GET', remoteImageUrl);

    const status = res.info().status;
    if (status < 200 || status >= 300) {
      await safeUnlink(tempPath);
      return undefined;
    }

    const stat = await ReactNativeBlobUtil.fs.stat(tempPath);
    if (Number(stat.size) <= 0) {
      await safeUnlink(tempPath);
      return undefined;
    }

    await safeUnlink(targetPath);
    await ReactNativeBlobUtil.fs.mv(tempPath, targetPath);
    return targetPath;
  } catch {
    return undefined;
  }
}

export interface SegmentEntry {
  index: number;
  url: string;
  filename: string;
  durationSec: number;
  isKeyOrMap?: boolean;
}

export interface ParsedHlsMetadata {
  mediaPlaylistUrl: string;
  detectedQuality?: string;
  durationMinutes: number;
  totalDurationSeconds: number;
  segments: SegmentEntry[];
  localManifestContent: string;
}

export interface DownloadProgressSnapshot {
  downloadedSegments: number;
  totalSegments: number;
  downloadedBytes: number;
  progress: number;
  durationMinutes: number;
  detectedQuality?: string;
}

export interface StartHlsDownloadCallbacks {
  onMetadata?: (meta: {
    totalSegments: number;
    durationMinutes: number;
    detectedQuality?: string;
    directoryPath: string;
    localManifestPath: string;
  }) => void;
  onProgress: (snapshot: DownloadProgressSnapshot) => void;
  onCompleted: (result: {
    localManifestPath: string;
    directoryPath: string;
    downloadedBytes: number;
    totalSegments: number;
    durationMinutes: number;
  }) => void;
  onPaused: (snapshot: DownloadProgressSnapshot) => void;
  onFailed: (errorMessage: string) => void;
}

interface ActiveDownloadController {
  id: string;
  directoryPath: string;
  state: 'running' | 'paused' | 'cancelled' | 'failed';
  abortController: AbortController;
  activeNativeTasks: Set<{ cancel: () => void }>;
  workersSettledPromise: Promise<void> | null;
}

const activeControllers = new Map<string, ActiveDownloadController>();

export function sanitizeFolderName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function getEpisodeDownloadDir(id: string): string {
  return `${BASE_DOWNLOAD_DIR}/${sanitizeFolderName(id)}`;
}

export async function safeUnlink(path: string): Promise<void> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(path);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(path);
    }
  } catch {
    // Ignore errors when file/folder is already gone
  }
}

export async function cleanPartFilesInDir(directoryPath: string): Promise<void> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(directoryPath);
    if (!exists) {
      return;
    }
    const files = await ReactNativeBlobUtil.fs.ls(directoryPath);
    for (const file of files) {
      if (file.endsWith('.part') || file.endsWith('.tmp')) {
        await safeUnlink(`${directoryPath}/${file}`);
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

function resolveUrl(baseUrl: string, targetUrl: string): string {
  const trimmed = targetUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const cleanBase = baseUrl.split('?')[0];
  const lastSlashIdx = cleanBase.lastIndexOf('/');
  const baseDir =
    lastSlashIdx >= 0 ? cleanBase.substring(0, lastSlashIdx + 1) : cleanBase;

  if (trimmed.startsWith('//')) {
    const protocol = cleanBase.startsWith('https') ? 'https:' : 'http:';
    return `${protocol}${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    const match = cleanBase.match(/^(https?:\/\/[^/]+)/i);
    if (match) {
      return `${match[1]}${trimmed}`;
    }
  }

  // Handle ./ and ../ segments cleanly
  const rawCombined = `${baseDir}${trimmed}`;
  const protocolMatch = rawCombined.match(/^(https?:\/\/[^/]+)(\/.*)$/i);
  if (!protocolMatch) {
    return rawCombined;
  }
  const origin = protocolMatch[1];
  const pathParts = protocolMatch[2].split('/');
  const resolvedParts: string[] = [];
  for (const part of pathParts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      resolvedParts.pop();
    } else {
      resolvedParts.push(part);
    }
  }
  return `${origin}/${resolvedParts.join('/')}`;
}

function formatQualityLabel(height?: number): string | undefined {
  if (!height || height <= 0) {
    return undefined;
  }
  if (height >= 2160) {
    return '4K';
  }
  if (height >= 1080) {
    return '1080P';
  }
  if (height >= 720) {
    return '720P';
  }
  if (height >= 480) {
    return '480P';
  }
  return `${height}P`;
}

async function parseM3u8Manifest(
  manifestUrl: string,
  directoryPath: string,
  signal: AbortSignal,
): Promise<ParsedHlsMetadata> {
  const { data: rawText } = await axios.get<string>(manifestUrl, {
    responseType: 'text',
    timeout: 20000,
    signal,
  });

  if (typeof rawText !== 'string' || !rawText.includes('#EXTM3U')) {
    throw new Error('Link video M3U8 không hợp lệ hoặc bị hỏng.');
  }

  let mediaPlaylistUrl = manifestUrl;
  let mediaText = rawText;
  let detectedQuality: string | undefined;

  // Check if Master Playlist (#EXT-X-STREAM-INF)
  if (rawText.includes('#EXT-X-STREAM-INF')) {
    const lines = rawText.split(/\r?\n/);
    let bestBandwidth = -1;
    let bestHeight = 0;
    let selectedVariantUri = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
        const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        const height = resMatch ? parseInt(resMatch[2], 10) : 0;

        // Find next non-empty, non-comment line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            continue;
          }
          if (!nextLine.startsWith('#')) {
            if (bandwidth >= bestBandwidth) {
              bestBandwidth = bandwidth;
              bestHeight = height;
              selectedVariantUri = nextLine;
            }
            i = j;
            break;
          }
        }
      }
    }

    if (!selectedVariantUri) {
      throw new Error('Không tìm thấy luồng phát trong Master Playlist.');
    }

    detectedQuality = formatQualityLabel(bestHeight);
    mediaPlaylistUrl = resolveUrl(manifestUrl, selectedVariantUri);

    const variantRes = await axios.get<string>(mediaPlaylistUrl, {
      responseType: 'text',
      timeout: 20000,
      signal,
    });
    mediaText = variantRes.data;
  }

  const lines = mediaText.split(/\r?\n/);
  const segments: SegmentEntry[] = [];
  const rewrittenLines: string[] = [];

  let totalDurationSeconds = 0;
  let pendingDuration = 0;
  let segCounter = 0;
  let keyCounter = 0;
  let mapCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const durMatch = line.match(/#EXTINF:([\d.]+)/i);
      if (durMatch) {
        const d = parseFloat(durMatch[1]);
        if (Number.isFinite(d) && d > 0) {
          pendingDuration = d;
          totalDurationSeconds += d;
        }
      }
      rewrittenLines.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-KEY:')) {
      const uriMatch = line.match(/URI="([^"]+)"/i);
      if (uriMatch && !/METHOD=NONE/i.test(line)) {
        keyCounter += 1;
        const keyUrl = resolveUrl(mediaPlaylistUrl, uriMatch[1]);
        const keyFilename = `key_${String(keyCounter).padStart(3, '0')}.key`;
        segments.push({
          index: segments.length,
          url: keyUrl,
          filename: keyFilename,
          durationSec: 0,
          isKeyOrMap: true,
        });
        // Relative path so HLS players on both Android & iOS resolve segments within the same directory,
        // and avoid broken paths when iOS DocumentDir UUID changes upon app updates.
        rewrittenLines.push(line.replace(/URI="([^"]+)"/i, `URI="${keyFilename}"`));
        continue;
      }
      rewrittenLines.push(line);
      continue;
    }

    if (line.startsWith('#EXT-X-MAP:')) {
      const uriMatch = line.match(/URI="([^"]+)"/i);
      if (uriMatch) {
        mapCounter += 1;
        const mapUrl = resolveUrl(mediaPlaylistUrl, uriMatch[1]);
        const mapFilename = `init_${String(mapCounter).padStart(3, '0')}.mp4`;
        segments.push({
          index: segments.length,
          url: mapUrl,
          filename: mapFilename,
          durationSec: 0,
          isKeyOrMap: true,
        });
        rewrittenLines.push(line.replace(/URI="([^"]+)"/i, `URI="${mapFilename}"`));
        continue;
      }
      rewrittenLines.push(line);
      continue;
    }

    if (line.startsWith('#')) {
      rewrittenLines.push(line);
      continue;
    }

    // Segment URI line: use relative filename (RFC 8216 HLS standard)
    segCounter += 1;
    const segUrl = resolveUrl(mediaPlaylistUrl, line);
    const segFilename = `seg_${String(segCounter).padStart(5, '0')}.ts`;
    segments.push({
      index: segments.length,
      url: segUrl,
      filename: segFilename,
      durationSec: pendingDuration,
    });
    pendingDuration = 0;

    rewrittenLines.push(segFilename);
  }

  if (segments.length === 0) {
    throw new Error('Không tìm thấy phân đoạn video (.ts) nào trong luồng M3U8.');
  }

  if (!rewrittenLines.some(l => l.startsWith('#EXT-X-ENDLIST'))) {
    rewrittenLines.push('#EXT-X-ENDLIST');
  }

  const durationMinutes =
    totalDurationSeconds > 0
      ? Math.max(1, Math.round(totalDurationSeconds / 60))
      : 0;

  return {
    mediaPlaylistUrl,
    detectedQuality,
    durationMinutes,
    totalDurationSeconds,
    segments,
    localManifestContent: rewrittenLines.join('\n'),
  };
}

async function downloadSingleSegmentWithRetry(
  seg: SegmentEntry,
  directoryPath: string,
  controller: ActiveDownloadController,
): Promise<number> {
  const finalPath = `${directoryPath}/${seg.filename}`;
  const partPath = `${finalPath}.part`;

  // Check if already downloaded completely in a previous session
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(finalPath);
    if (exists) {
      const stat = await ReactNativeBlobUtil.fs.stat(finalPath);
      const existingSize = Number(stat.size) || 0;
      if (existingSize > 0) {
        return existingSize;
      }
      await safeUnlink(finalPath);
    }
  } catch {
    await safeUnlink(finalPath);
  }

  let lastError: unknown = new Error('Download segment failed');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (controller.state !== 'running') {
      await safeUnlink(partPath);
      throw new Error('DOWNLOAD_ABORTED');
    }

    let taskRef: { cancel: () => void } | null = null;

    try {
      await safeUnlink(partPath);

      const fetchTask = ReactNativeBlobUtil.config({
        path: partPath,
        timeout: 30000,
        overwrite: true,
      }).fetch('GET', seg.url);

      taskRef = fetchTask;
      controller.activeNativeTasks.add(fetchTask);

      const res = await fetchTask;
      controller.activeNativeTasks.delete(fetchTask);

      if (controller.state !== 'running') {
        await safeUnlink(partPath);
        throw new Error('DOWNLOAD_ABORTED');
      }

      // Layer 1: Validate HTTP Status === 200 (or 206) and file size > 0
      const httpStatus = res.info().status;
      if (httpStatus < 200 || httpStatus >= 300) {
        await safeUnlink(partPath);
        throw new Error(`HTTP Error ${httpStatus}`);
      }

      const stat = await ReactNativeBlobUtil.fs.stat(partPath);
      const byteSize = Number(stat.size) || 0;
      if (byteSize <= 0) {
        await safeUnlink(partPath);
        throw new Error('Phân đoạn tải về có dung lượng 0 byte');
      }

      // Atomic move from .part -> .ts
      await safeUnlink(finalPath);
      await ReactNativeBlobUtil.fs.mv(partPath, finalPath);
      return byteSize;
    } catch (err) {
      if (taskRef) {
        controller.activeNativeTasks.delete(taskRef);
      }
      // Layer 2: Always clean up .part file immediately on any error
      await safeUnlink(partPath);
      lastError = err;

      if (controller.state !== 'running') {
        throw new Error('DOWNLOAD_ABORTED');
      }

      if (attempt < MAX_RETRIES) {
        await new Promise<void>(resolve =>
          setTimeout(() => resolve(), attempt * 700),
        );
      }
    }
  }

  throw lastError;
}

export async function startHlsDownloadJob(params: {
  id: string;
  remoteUri: string;
  callbacks: StartHlsDownloadCallbacks;
}): Promise<void> {
  const { id, remoteUri, callbacks } = params;

  // If already running, ignore duplicate start
  const existing = activeControllers.get(id);
  if (existing && existing.state === 'running') {
    return;
  }

  const directoryPath = getEpisodeDownloadDir(id);
  const localManifestPath = `file://${directoryPath}/local.m3u8`;
  const rawManifestFilePath = `${directoryPath}/local.m3u8`;
  const metaJsonPath = `${directoryPath}/meta.json`;

  const controller: ActiveDownloadController = {
    id,
    directoryPath,
    state: 'running',
    abortController: new AbortController(),
    activeNativeTasks: new Set(),
    workersSettledPromise: null,
  };
  activeControllers.set(id, controller);

  try {
    const baseExists = await ReactNativeBlobUtil.fs.exists(BASE_DOWNLOAD_DIR);
    if (!baseExists) {
      await ReactNativeBlobUtil.fs.mkdir(BASE_DOWNLOAD_DIR);
    }

    const dirExists = await ReactNativeBlobUtil.fs.exists(directoryPath);
    if (!dirExists) {
      await ReactNativeBlobUtil.fs.mkdir(directoryPath);
    } else {
      // Clean any leftover .part files from previous interrupted session
      await cleanPartFilesInDir(directoryPath);
    }

    let metadata: ParsedHlsMetadata | null = null;

    // Try reading cached metadata if resuming
    try {
      const metaExists = await ReactNativeBlobUtil.fs.exists(metaJsonPath);
      if (metaExists) {
        const rawJson = await ReactNativeBlobUtil.fs.readFile(
          metaJsonPath,
          'utf8',
        );
        const parsed = JSON.parse(rawJson) as ParsedHlsMetadata;
        if (parsed && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
          metadata = parsed;
        }
      }
    } catch {
      metadata = null;
    }

    if (!metadata) {
      metadata = await parseM3u8Manifest(
        remoteUri,
        directoryPath,
        controller.abortController.signal,
      );
      if (controller.state !== 'running') {
        throw new Error('DOWNLOAD_ABORTED');
      }
      await ReactNativeBlobUtil.fs.writeFile(
        metaJsonPath,
        JSON.stringify(metadata),
        'utf8',
      );
      await ReactNativeBlobUtil.fs.writeFile(
        rawManifestFilePath,
        metadata.localManifestContent,
        'utf8',
      );
    }

    const totalSegments = metadata.segments.length;
    const durationMinutes = metadata.durationMinutes;
    const detectedQuality = metadata.detectedQuality;

    callbacks.onMetadata?.({
      totalSegments,
      durationMinutes,
      detectedQuality,
      directoryPath,
      localManifestPath,
    });

    let downloadedSegments = 0;
    let downloadedBytes = 0;
    let nextIndex = 0;
    let fatalWorkerError: unknown = null;
    let lastEmitTime = 0;

    const emitProgress = (force = false) => {
      const now = Date.now();
      if (!force && now - lastEmitTime < 250) {
        return;
      }
      lastEmitTime = now;
      const progress = Math.min(
        99,
        Math.round((downloadedSegments / totalSegments) * 100),
      );
      callbacks.onProgress({
        downloadedSegments,
        totalSegments,
        downloadedBytes,
        progress,
        durationMinutes,
        detectedQuality,
      });
    };

    const workerCount = Math.min(CONCURRENCY, totalSegments);
    const workers: Promise<void>[] = [];

    for (let w = 0; w < workerCount; w++) {
      const workerPromise = (async () => {
        while (controller.state === 'running') {
          const currentIdx = nextIndex;
          if (currentIdx >= totalSegments) {
            break;
          }
          nextIndex += 1;
          const segment = metadata.segments[currentIdx];

          try {
            const bytes = await downloadSingleSegmentWithRetry(
              segment,
              directoryPath,
              controller,
            );
            if (controller.state !== 'running') {
              break;
            }
            downloadedSegments += 1;
            downloadedBytes += bytes;
            emitProgress(downloadedSegments === totalSegments);
          } catch (err) {
            if (controller.state === 'running') {
              // Layer 3: One worker failed after retries -> abort all other workers
              fatalWorkerError = err;
              controller.state = 'failed';
              controller.abortController.abort();
              for (const task of controller.activeNativeTasks) {
                try {
                  task.cancel();
                } catch {}
              }
              controller.activeNativeTasks.clear();
            }
            break;
          }
        }
      })();
      workers.push(workerPromise);
    }

    // Layer 3: Wait for ALL concurrent workers to settle before touching disk cleanup
    const settledPromise = Promise.allSettled(workers).then(() => {});
    controller.workersSettledPromise = settledPromise;
    await settledPromise;

    const finalState = controller.state as ActiveDownloadController['state'];

    if (finalState === 'paused') {
      await cleanPartFilesInDir(directoryPath);
      const progress = Math.min(
        99,
        Math.round((downloadedSegments / totalSegments) * 100),
      );
      callbacks.onPaused({
        downloadedSegments,
        totalSegments,
        downloadedBytes,
        progress,
        durationMinutes,
        detectedQuality,
      });
      return;
    }

    if (finalState === 'cancelled') {
      await safeUnlink(directoryPath);
      return;
    }

    if (finalState === 'failed' || fatalWorkerError) {
      // Layer 4: Clean-on-Fail -> wipe the entire directory so failed downloads leave 0 bytes
      await safeUnlink(directoryPath);
      const msg =
        fatalWorkerError instanceof Error
          ? fatalWorkerError.message
          : 'Lỗi kết nối khi tải phân đoạn video.';
      callbacks.onFailed(msg);
      return;
    }

    // Completed 100%
    await cleanPartFilesInDir(directoryPath);
    callbacks.onCompleted({
      localManifestPath,
      directoryPath,
      downloadedBytes,
      totalSegments,
      durationMinutes,
    });
  } catch (err) {
    if (controller.workersSettledPromise) {
      await controller.workersSettledPromise;
    }
    const currentState = controller.state as ActiveDownloadController['state'];
    if (currentState === 'paused') {
      await cleanPartFilesInDir(directoryPath);
      return;
    }
    if (currentState === 'cancelled') {
      await safeUnlink(directoryPath);
      return;
    }
    // Layer 4: Clean-on-Fail -> remove directory completely on manifest/initial error
    await safeUnlink(directoryPath);
    const msg =
      err instanceof Error ? err.message : 'Không thể tải luồng video M3U8.';
    callbacks.onFailed(msg);
  } finally {
    activeControllers.delete(id);
  }
}

export async function pauseHlsDownloadJob(id: string): Promise<void> {
  const controller = activeControllers.get(id);
  if (!controller) {
    return;
  }
  controller.state = 'paused';
  controller.abortController.abort();
  for (const task of controller.activeNativeTasks) {
    try {
      task.cancel();
    } catch {}
  }
  controller.activeNativeTasks.clear();
  if (controller.workersSettledPromise) {
    await controller.workersSettledPromise;
  }
  await cleanPartFilesInDir(controller.directoryPath);
}

export async function cancelAndDeleteHlsDownloadJob(
  id: string,
  directoryPath?: string,
): Promise<void> {
  const controller = activeControllers.get(id);
  const targetDir =
    directoryPath || controller?.directoryPath || getEpisodeDownloadDir(id);

  if (controller) {
    controller.state = 'cancelled';
    controller.abortController.abort();
    for (const task of controller.activeNativeTasks) {
      try {
        task.cancel();
      } catch {}
    }
    controller.activeNativeTasks.clear();
    if (controller.workersSettledPromise) {
      await controller.workersSettledPromise;
    }
  }

  await safeUnlink(targetDir);
}

/**
 * Layer 4 Startup Garbage Collector:
 * Deletes any folder in BASE_DOWNLOAD_DIR not belonging to a valid non-failed store item,
 * and cleans up any leftover .part/.tmp files inside valid folders.
 */
export async function cleanupOrphanedDownloads(
  validFolderNames: Set<string>,
  validMovieSlugs?: Set<string>,
): Promise<void> {
  try {
    const baseExists = await ReactNativeBlobUtil.fs.exists(BASE_DOWNLOAD_DIR);
    if (!baseExists) {
      return;
    }
    const entries = await ReactNativeBlobUtil.fs.ls(BASE_DOWNLOAD_DIR);
    for (const folderName of entries) {
      const fullPath = `${BASE_DOWNLOAD_DIR}/${folderName}`;
      if (folderName === 'posters') {
        if (validMovieSlugs) {
          const posterFiles = await ReactNativeBlobUtil.fs.ls(fullPath);
          for (const file of posterFiles) {
            if (file === '.nomedia') {
              continue;
            }
            if (file.endsWith('.part') || file.endsWith('.tmp')) {
              await safeUnlink(`${fullPath}/${file}`);
              continue;
            }
            const slugWithoutExt = file.replace(/\.jpg$/i, '');
            if (!validMovieSlugs.has(slugWithoutExt)) {
              await safeUnlink(`${fullPath}/${file}`);
            }
          }
        }
        continue;
      }
      if (!validFolderNames.has(folderName)) {
        await safeUnlink(fullPath);
      } else {
        await cleanPartFilesInDir(fullPath);
      }
    }
  } catch {
    // Ignore errors during background cleanup
  }
}

