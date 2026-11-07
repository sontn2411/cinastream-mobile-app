import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import Video from 'react-native-video';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  BASE_DOWNLOAD_DIR,
  FB_REQUEST_HEADERS,
  isAllowedFacebookVideoStreamUrl,
} from '../services/facebookDownloader';
import { useResponsive } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalVideoPlayer'>;

export default function LocalVideoPlayerScreen({ route, navigation }: Props) {
  const { title, uri } = route.params;
  const insets = useSafeAreaInsets();
  const { rs } = useResponsive();
  const [paused, setPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Memoize & validate source object reference so react-native-video does not reload or access unauthorized paths
  const videoSource = useMemo(() => {
    const isRemote = uri.startsWith('http://') || uri.startsWith('https://');
    if (isRemote) {
      if (!isAllowedFacebookVideoStreamUrl(uri)) {
        return null;
      }
      return { uri, headers: FB_REQUEST_HEADERS };
    }

    const rawPath = uri.startsWith('file://') ? uri.slice(7) : uri;
    if (
      !rawPath.startsWith(`${BASE_DOWNLOAD_DIR}/`) ||
      rawPath.includes('..')
    ) {
      return null;
    }

    return { uri: `file://${rawPath}` };
  }, [uri]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoaded = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleEnd = useCallback(() => {
    setPaused(true);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {videoSource ? (
        <Video
          source={videoSource}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          controls
          paused={paused}
          ignoreSilentSwitch="ignore"
          onLoadStart={handleLoadStart}
          onLoad={handleLoaded}
          onReadyForDisplay={handleLoaded}
          onError={handleError}
          onEnd={handleEnd}
        />
      ) : null}

      {isLoading && !hasError && videoSource ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text
            style={[
              styles.loadingText,
              { fontSize: rs(13), marginTop: rs(10) },
            ]}
          >
            Đang tải luồng video...
          </Text>
        </View>
      ) : null}

      {hasError || !videoSource ? (
        <View style={[styles.centerOverlay, { paddingHorizontal: rs(24) }]}>
          <AlertCircle color="#EF4444" size={rs(36)} />
          <Text
            style={[styles.errorTitle, { fontSize: rs(15), marginTop: rs(10) }]}
          >
            Không thể phát video này
          </Text>
          <Text
            style={[
              styles.errorSubtitle,
              { fontSize: rs(12), marginTop: rs(6) },
            ]}
          >
            Link phát trực tiếp có thể đã hết hạn hoặc tệp tin bị lỗi.
          </Text>
        </View>
      ) : null}

      {/* Floating Back Bar */}
      <View
        style={[
          styles.topBar,
          { top: insets.top + rs(8), left: rs(16), right: rs(16) },
        ]}
      >
        <Pressable
          onPress={handleGoBack}
          hitSlop={10}
          style={[
            styles.backBtn,
            { width: rs(38), height: rs(38), borderRadius: rs(19) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft color="#FFFFFF" size={rs(20)} />
        </Pressable>

        <Text
          numberOfLines={1}
          style={[styles.title, { fontSize: rs(15), marginLeft: rs(12) }]}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.playerBg,
  },
  topBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(74, 46, 53, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFE0E9',
    fontWeight: '700',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#F7C8D4',
    fontWeight: '600',
    textAlign: 'center',
  },
});
