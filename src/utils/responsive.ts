import { PixelRatio, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;
  const ratio = shortestSide / BASE_WIDTH;

  const scale = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * ratio));

  const rs = (size: number, factor = 0.5) =>
    Math.round(
      PixelRatio.roundToNearestPixel(size + (size * ratio - size) * factor),
    );

  return { width, height, isTablet, scale, rs };
}
