import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { useResponsive } from '../utils/responsive';

interface Props {
  uri?: string;
  backdropUri?: string;
  title: string;
  height: number;
  started: boolean;
  playing: boolean;
  initialTime?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onStart: () => void;
  onTogglePlay: () => void;
  onBack: () => void;
  onEnd: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

// Playback state (progress, buffering, controls) lives here so the 500ms progress ticks
// re-render only the player, not the whole detail screen with its episode grid.
function VideoPlayer({
  uri,
  backdropUri,
  title,
  height,
  started,
  playing,
  initialTime,
  onProgressUpdate,
  onStart,
  onTogglePlay,
  onBack,
  onEnd,
}: Props) {
  const { rs } = useResponsive();
  const videoRef = useRef<VideoRef>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialSeeked = useRef(false);
  const lastSavedTime = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [seekBarWidth, setSeekBarWidth] = useState(1);
  const [error, setError] = useState(false);

  // Sync refs for cleanup/unmount
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Flush progress on unmount if user was watching
  useEffect(() => {
    return () => {
      if (currentTimeRef.current > 0 && onProgressUpdate) {
        onProgressUpdate(currentTimeRef.current, durationRef.current);
      }
    };
  }, [onProgressUpdate]);

  // New episode → reset progress & error
  useEffect(() => {
    const startAt = initialTime && initialTime > 0 ? initialTime : 0;
    setCurrentTime(startAt);
    setDuration(0);
    setError(false);
    setShowControls(true);
    hasInitialSeeked.current = false;
    lastSavedTime.current = startAt;
  }, [uri, initialTime]);

  useEffect(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    if (playing && showControls) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3500);
    }
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [playing, showControls]);

  const seekTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(duration, target));
      videoRef.current?.seek(next);
      setCurrentTime(next);
      lastSavedTime.current = next;
      onProgressUpdate?.(next, duration);
      setShowControls(true);
    },
    [duration, onProgressUpdate],
  );

  const handleSeekBarLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setSeekBarWidth(w);
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (fullscreen) {
      videoRef.current?.dismissFullscreenPlayer();
    } else {
      videoRef.current?.presentFullscreenPlayer();
    }
    setFullscreen(prev => !prev);
  }, [fullscreen]);

  const handleMainPress = useCallback(() => {
    if (error) {
      setError(false);
      onStart();
      return;
    }
    if (!started) {
      onStart();
    } else {
      onTogglePlay();
    }
  }, [error, started, onStart, onTogglePlay]);

  const progressPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const overlayVisible = !started || showControls || error;
  const circle = (size: number) => ({
    width: rs(size),
    height: rs(size),
    borderRadius: rs(size / 2),
  });

  return (
    <View style={[styles.container, { height }]}>
      {started && uri && !error ? (
        <Video
          ref={videoRef}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!playing}
          muted={muted}
          progressUpdateInterval={500}
          onLoad={meta => {
            setDuration(meta.duration);
            setBuffering(false);
            if (initialTime && initialTime > 0 && !hasInitialSeeked.current) {
              hasInitialSeeked.current = true;
              videoRef.current?.seek(initialTime);
              setCurrentTime(initialTime);
            }
          }}
          onProgress={prog => {
            setCurrentTime(prog.currentTime);
            if (Math.abs(prog.currentTime - lastSavedTime.current) >= 3) {
              lastSavedTime.current = prog.currentTime;
              onProgressUpdate?.(prog.currentTime, duration);
            }
          }}
          onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
          onError={() => {
            setError(true);
            setBuffering(false);
          }}
          onFullscreenPlayerWillPresent={() => setFullscreen(true)}
          onFullscreenPlayerWillDismiss={() => setFullscreen(false)}
          onEnd={onEnd}
        />
      ) : backdropUri ? (
        <Image
          source={{ uri: backdropUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      <Pressable
        onPress={started ? () => setShowControls(prev => !prev) : onStart}
        style={[StyleSheet.absoluteFill, overlayVisible ? styles.overlay : null]}>
        {overlayVisible ? (
          <View style={styles.inner}>
            {/* Top bar */}
            <View
              style={[
                styles.row,
                styles.spaceBetween,
                { paddingHorizontal: rs(12), paddingTop: rs(10) },
              ]}>
              <Pressable
                onPress={onBack}
                hitSlop={10}
                accessibilityLabel="Quay lại"
                style={[styles.iconCircle, circle(36)]}>
                <ArrowLeft color="#FFFFFF" size={rs(20)} />
              </Pressable>
              <Text
                numberOfLines={1}
                style={[styles.title, { fontSize: rs(13), marginHorizontal: rs(10) }]}>
                {title}
              </Text>
              {started ? (
                <Pressable
                  onPress={() => setMuted(prev => !prev)}
                  hitSlop={10}
                  accessibilityLabel={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                  style={[styles.iconCircle, circle(36)]}>
                  {muted ? (
                    <VolumeX color="#FFFFFF" size={rs(18)} />
                  ) : (
                    <Volume2 color="#FFFFFF" size={rs(18)} />
                  )}
                </Pressable>
              ) : (
                <View style={{ width: rs(36) }} />
              )}
            </View>

            {/* Center controls */}
            <View style={[styles.row, styles.center, { gap: rs(28) }]}>
              {started && !error ? (
                <Pressable
                  onPress={() => seekTo(currentTime - 10)}
                  hitSlop={10}
                  accessibilityLabel="Tua lùi 10 giây"
                  style={[styles.seekCircle, circle(40)]}>
                  <RotateCcw color="#FFFFFF" size={rs(20)} />
                </Pressable>
              ) : null}

              {buffering && !error ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Pressable
                  onPress={handleMainPress}
                  disabled={!uri}
                  accessibilityLabel={started && playing ? 'Tạm dừng' : 'Phát'}
                  style={[styles.mainBtn, circle(56), !uri ? styles.disabled : null]}>
                  {error ? (
                    <RotateCw color="#FFFFFF" size={rs(24)} />
                  ) : started && playing ? (
                    <Pause color="#FFFFFF" fill="#FFFFFF" size={rs(24)} />
                  ) : (
                    <Play color="#FFFFFF" fill="#FFFFFF" size={rs(24)} />
                  )}
                </Pressable>
              )}

              {started && !error ? (
                <Pressable
                  onPress={() => seekTo(currentTime + 10)}
                  hitSlop={10}
                  accessibilityLabel="Tua tới 10 giây"
                  style={[styles.seekCircle, circle(40)]}>
                  <RotateCw color="#FFFFFF" size={rs(20)} />
                </Pressable>
              ) : null}
            </View>

            {/* Bottom bar */}
            {error ? (
              <Text style={[styles.errorText, { fontSize: rs(12), paddingBottom: rs(12) }]}>
                Không phát được tập này. Bấm để thử lại hoặc chọn server khác.
              </Text>
            ) : started ? (
              <View
                style={[
                  styles.row,
                  { paddingHorizontal: rs(12), paddingBottom: rs(10), gap: rs(10) },
                ]}>
                <Text style={[styles.time, { fontSize: rs(11) }]}>
                  {formatTime(currentTime)}
                </Text>
                <Pressable
                  onLayout={handleSeekBarLayout}
                  onPress={e =>
                    duration > 0 &&
                    seekTo((e.nativeEvent.locationX / seekBarWidth) * duration)
                  }
                  style={[styles.seekWrap, { height: rs(24) }]}>
                  <View style={[styles.seekTrack, { height: rs(4) }]}>
                    <View
                      style={[styles.seekFill, { width: `${progressPercent}%`, height: rs(4) }]}
                    />
                  </View>
                </Pressable>
                <Text style={[styles.time, { fontSize: rs(11) }]}>
                  {formatTime(duration)}
                </Text>
                <Pressable
                  onPress={handleToggleFullscreen}
                  hitSlop={10}
                  accessibilityLabel="Toàn màn hình"
                  style={{ padding: rs(4) }}>
                  {fullscreen ? (
                    <Minimize color="#FFFFFF" size={rs(18)} />
                  ) : (
                    <Maximize color="#FFFFFF" size={rs(18)} />
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={{ height: rs(28) }} />
            )}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

export default memo(VideoPlayer);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000000',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: 'rgba(18, 19, 26, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  seekCircle: {
    backgroundColor: 'rgba(18, 19, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBtn: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  time: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  seekWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  seekTrack: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  seekFill: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
    fontWeight: '600',
  },
});
