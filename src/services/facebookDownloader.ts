import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

export const BASE_DOWNLOAD_DIR = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/downloads`;
export const FB_DOWNLOAD_DIR = `${BASE_DOWNLOAD_DIR}/facebook`;

const MAX_HTML_BYTES = 5 * 1024 * 1024; // Giới hạn 5MB cho trang HTML để chống tràn bộ nhớ (OOM DoS)

export const FB_REQUEST_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
};

export interface FacebookVideoInfo {
  sourceUrl: string;
  videoUrl: string;
  title: string;
  quality: 'HD' | 'SD';
}

// Pre-compiled regex patterns hoisted outside functions for JS engine optimization
const SHORT_ID_PATTERNS = [
  /\/(?:reel|videos|watch|share\/r|share\/v)\/([A-Za-z0-9_-]+)/i,
  /[?&]v=([0-9]+)/i,
  /\/([A-Za-z0-9_-]{10,})\.mp4/i,
];

const HD_VIDEO_PATTERNS = [
  /"browser_native_hd_url":"([^"]+)"/,
  /"playable_url_quality_hd":"([^"]+)"/,
  /"hd_src":"([^"]+)"/,
  /"hd_src_no_ratelimit":"([^"]+)"/,
];

const SD_VIDEO_PATTERNS = [
  /"progressive_url":"([^"]+)"/,
  /"browser_native_sd_url":"([^"]+)"/,
  /"playable_url":"([^"]+)"/,
  /"sd_src":"([^"]+)"/,
  /"sd_src_no_ratelimit":"([^"]+)"/,
  /<meta\s+property="og:video(?::secure_url)?"\s+content="([^"]+)"/i,
];

const TITLE_PATTERNS = [
  /<meta\s+property="og:title"\s+content="([^"]+)"/i,
  /<meta\s+name="description"\s+content="([^"]+)"/i,
  /"message":\{"text":"([^"]+)"/,
  /"title":\{"text":"([^"]+)"/,
  /<title[^>]*>([^<]+)<\/title>/i,
];

const HTTPS_HOST_REGEX = /^https:\/\/([a-z0-9.-]+)(?::443)?(?:\/|$)/i;

/**
 * Kiểm tra chặt chẽ URL đầu vào phải là HTTPS và thuộc tên miền chính thức của Facebook / Meta
 * Chống lỗi SSRF, đọc file nội bộ (file://) hoặc kết nối HTTP không mã hóa.
 */
export function isAllowedFacebookSourceUrl(rawUrl: string): boolean {
  const match = rawUrl.trim().match(HTTPS_HOST_REGEX);
  if (!match?.[1]) {
    return false;
  }
  const host = match[1].toLowerCase();
  return (
    host === 'facebook.com' ||
    host.endsWith('.facebook.com') ||
    host === 'fb.watch' ||
    host.endsWith('.fb.watch') ||
    host === 'fb.com' ||
    host.endsWith('.fb.com') ||
    host.endsWith('.fbcdn.net')
  );
}

/**
 * Kiểm tra URL luồng video MP4 bóc tách được phải là HTTPS từ hệ thống CDN của Facebook
 */
export function isAllowedFacebookVideoStreamUrl(rawUrl: string): boolean {
  const match = rawUrl.trim().match(HTTPS_HOST_REGEX);
  if (!match?.[1]) {
    return false;
  }
  const host = match[1].toLowerCase();
  return (
    host.endsWith('.fbcdn.net') ||
    host === 'facebook.com' ||
    host.endsWith('.facebook.com')
  );
}

let dirEnsured = false;

export async function ensureFbDownloadDir(): Promise<void> {
  if (dirEnsured) {
    const exists = await ReactNativeBlobUtil.fs.exists(FB_DOWNLOAD_DIR);
    if (exists) {
      return;
    }
  }

  const baseExists = await ReactNativeBlobUtil.fs.exists(BASE_DOWNLOAD_DIR);
  if (!baseExists) {
    await ReactNativeBlobUtil.fs.mkdir(BASE_DOWNLOAD_DIR);
  }

  const fbExists = await ReactNativeBlobUtil.fs.exists(FB_DOWNLOAD_DIR);
  if (!fbExists) {
    await ReactNativeBlobUtil.fs.mkdir(FB_DOWNLOAD_DIR);
  }

  if (Platform.OS === 'ios') {
    try {
      await ReactNativeBlobUtil.ios.excludeFromBackupKey(BASE_DOWNLOAD_DIR);
      await ReactNativeBlobUtil.ios.excludeFromBackupKey(FB_DOWNLOAD_DIR);
    } catch {
      // Ignore iOS backup exclusion errors
    }
  }

  dirEnsured = true;
}

export function sanitizeFileName(rawTitle: string): string {
  const withoutCtrl = Array.from(rawTitle)
    .filter(ch => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && (code < 0x7f || code > 0x9f);
    })
    .join('');

  const cleaned = withoutCtrl
    // Loại bỏ ký tự đảo chiều văn bản Unicode (RTLO spoofing)
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]+/g, '')
    // Loại bỏ các ký tự cấm trong đường dẫn hệ thống tệp
    .replace(/[/\\?%*:|"<>#\r\n\t]+/g, ' ')
    // Ngăn chặn chuỗi '..' gây Path Traversal
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  if (
    !cleaned ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(cleaned)
  ) {
    return 'Facebook Video';
  }

  return cleaned.length > 80 ? cleaned.slice(0, 80).trim() : cleaned;
}

function unescapeFbJsonUrl(raw: string): string {
  return raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();
}

function decodeHtmlEntities(raw: string): string {
  return unescapeFbJsonUrl(raw)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanExtractedTitle(raw: string): string {
  const text = decodeHtmlEntities(raw)
    .replace(/\s*[|-]\s*Facebook.*$/i, '')
    .replace(/^[^|]*?(?:lượt xem|views|cảm xúc|reactions)[^|]*\|\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = text.toLowerCase();
  if (!text || lower === 'facebook' || lower === 'reels' || lower === 'watch') {
    return '';
  }

  return sanitizeFileName(text);
}

function extractTitleFromHtml(html: string, fallbackId: string): string {
  for (const regex of TITLE_PATTERNS) {
    const match = html.match(regex);
    if (match?.[1]) {
      const cleaned = cleanExtractedTitle(match[1]);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  return sanitizeFileName(`Facebook Video ${fallbackId}`);
}

function extractFallbackId(url: string): string {
  for (const regex of SHORT_ID_PATTERNS) {
    const match = url.match(regex);
    if (match?.[1]) {
      return match[1].slice(0, 12);
    }
  }
  return String(Date.now()).slice(-6);
}

export async function extractFacebookVideoInfo(
  fbUrl: string,
  externalSignal?: AbortSignal,
): Promise<FacebookVideoInfo | null> {
  try {
    const trimmedUrl = fbUrl.trim();
    if (!trimmedUrl || !isAllowedFacebookSourceUrl(trimmedUrl)) {
      return null;
    }

    const fallbackId = extractFallbackId(trimmedUrl);

    // Nếu người dùng dán trực tiếp link file mp4 từ fbcdn.net hợp lệ
    if (
      (trimmedUrl.includes('.mp4') || trimmedUrl.includes('fbcdn.net')) &&
      isAllowedFacebookVideoStreamUrl(trimmedUrl)
    ) {
      const isHd =
        trimmedUrl.includes('720p') ||
        trimmedUrl.includes('1080p') ||
        trimmedUrl.includes('hd');
      return {
        sourceUrl: trimmedUrl,
        videoUrl: unescapeFbJsonUrl(trimmedUrl),
        title: sanitizeFileName(`Facebook Video ${fallbackId}`),
        quality: isHd ? 'HD' : 'SD',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    let html = '';
    try {
      const response = await fetch(trimmedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': FB_REQUEST_HEADERS['User-Agent'],
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const contentType = (
        response.headers.get('content-type') || ''
      ).toLowerCase();
      const contentLength = Number(
        response.headers.get('content-length') || '0',
      );

      // Nếu URL rút gọn chuyển hướng thẳng tới luồng video MP4 của Facebook CDN
      if (
        contentType.startsWith('video/') &&
        response.url &&
        isAllowedFacebookVideoStreamUrl(response.url)
      ) {
        controller.abort();
        return {
          sourceUrl: trimmedUrl,
          videoUrl: response.url,
          title: sanitizeFileName(`Facebook Video ${fallbackId}`),
          quality: 'HD',
        };
      }

      // Chặn các phản hồi nhị phân hoặc vượt quá giới hạn 5MB để chống tràn RAM (OOM)
      if (
        contentLength > MAX_HTML_BYTES ||
        (contentType &&
          !contentType.includes('text/') &&
          !contentType.includes('json') &&
          !contentType.includes('xml') &&
          !contentType.includes('html'))
      ) {
        throw new Error('Phản hồi không phải định dạng trang web hợp lệ.');
      }

      html = await response.text();
      if (html.length > MAX_HTML_BYTES) {
        throw new Error('Kích thước trang vượt quá giới hạn an toàn.');
      }
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    const cleanHtml = html
      .replace(/\\u0025/g, '%')
      .replace(/\\u0026/g, '&')
      .replace(/\\u003C/g, '<')
      .replace(/\\u003E/g, '>')
      .replace(/\\u003D/gi, '=')
      .replace(/\\\//g, '/');

    for (const regex of HD_VIDEO_PATTERNS) {
      const match = cleanHtml.match(regex);
      if (match?.[1]) {
        const candidateUrl = unescapeFbJsonUrl(match[1]);
        if (isAllowedFacebookVideoStreamUrl(candidateUrl)) {
          return {
            sourceUrl: trimmedUrl,
            videoUrl: candidateUrl,
            title: extractTitleFromHtml(cleanHtml, fallbackId),
            quality: 'HD',
          };
        }
      }
    }

    for (const regex of SD_VIDEO_PATTERNS) {
      const match = cleanHtml.match(regex);
      if (match?.[1]) {
        const candidateUrl = unescapeFbJsonUrl(match[1]);
        if (isAllowedFacebookVideoStreamUrl(candidateUrl)) {
          return {
            sourceUrl: trimmedUrl,
            videoUrl: candidateUrl,
            title: extractTitleFromHtml(cleanHtml, fallbackId),
            quality: 'SD',
          };
        }
      }
    }

    throw new Error(
      'Không tìm thấy link trong HTML (Facebook yêu cầu đăng nhập hoặc đổi cấu trúc).',
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('Lỗi bóc tách Facebook video:', error);
    }
    return null;
  }
}

export async function extractFacebookReelUrl(
  fbUrl: string,
): Promise<string | null> {
  const info = await extractFacebookVideoInfo(fbUrl);
  return info ? info.videoUrl : null;
}
