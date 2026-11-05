/**
 * @format
 */

import React from 'react';
import { Dimensions } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import SplashScreen from '../src/screens/SplashScreen';
import { getImageSrc } from '../src/utils/image';
import { useResponsive } from '../src/utils/responsive';

jest.useFakeTimers();

test('getImageSrc normalizes relative and absolute image URLs', () => {
  expect(getImageSrc('')).toBe('');
  expect(getImageSrc('uploads/movies/a.webp')).toBe(
    'https://phimimg.com/uploads/movies/a.webp',
  );
  expect(getImageSrc('/uploads/movies/a.webp')).toBe(
    'https://phimimg.com/uploads/movies/a.webp',
  );
  expect(getImageSrc('https://phimimg.com/uploads/movies/a.webp')).toBe(
    'https://phimimg.com/uploads/movies/a.webp',
  );
});

test('useResponsive scales proportionally by screen size', async () => {
  let result: ReturnType<typeof useResponsive> | undefined;
  function Probe() {
    result = useResponsive();
    return null;
  }

  jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width: 375, height: 812, scale: 3, fontScale: 1 });
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  expect(result?.isTablet).toBe(false);
  expect(result?.rs(20)).toBe(20);
  expect(result?.scale(20)).toBe(20);

  jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width: 750, height: 1024, scale: 2, fontScale: 1 });
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  expect(result?.isTablet).toBe(true);
  expect(result?.scale(20)).toBe(40);
  expect(result?.rs(20)).toBe(30);

  jest.restoreAllMocks();
});

test('renders App correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('SplashScreen transitions to Home after 2s', async () => {
  const replace = jest.fn();
  const navigation = { replace } as any;
  const route = { key: 'Splash', name: 'Splash' } as any;

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <SplashScreen navigation={navigation} route={route} />,
    );
  });

  expect(replace).not.toHaveBeenCalled();

  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(replace).toHaveBeenCalledWith('Home');
});
