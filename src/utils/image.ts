const CDN_BASE = 'https://phimimg.com';

export const getImageSrc = (url?: string): string => {
  if (!url) {
    return '';
  }
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://')
  ) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${CDN_BASE}/${cleanUrl}`;
};

