import React, { useCallback } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Compass,
  Heart,
  Download,
  DownloadCloud,
  Settings,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import ExploreScreen from '../screens/ExploreScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import DownloadScreen from '../screens/DownloadScreen';
import FacebookDownloadScreen from '../screens/FacebookDownloadScreen';
import { RootStackParamList } from './AppNavigator';
import { useDownloadStore } from '../store/useDownloadStore';
import { useFbDownloadStore } from '../store/useFbDownloadStore';
import { useResponsive } from '../utils/responsive';

export type BottomTabParamList = {
  Explore: undefined;
  Favorite: undefined;
  Download: undefined;
  Facebook: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// shortcut: Android New Architecture conflicts with @react-native-community/blur root DecorView canvas causing full-screen white overlay; use BlurView on iOS and translucent dark glass View on Android
function GlassBlurBackground() {
  if (Platform.OS === 'ios') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={20}
          reducedTransparencyFallbackColor="#12131A"
        />
        <View style={styles.iosGlassOverlay} />
      </View>
    );
  }

  return <View pointerEvents="none" style={styles.androidGlass} />;
}

function HeaderBrand() {
  const { rs } = useResponsive();

  return (
    <View style={[styles.headerBrand, { paddingLeft: rs(16), gap: rs(8) }]}>
      <Image
        source={require('../assets/logo-cinastream.png')}
        style={{ width: rs(32), height: rs(22) }}
        resizeMode="contain"
      />
      <Text
        style={[
          styles.brandTitle,
          {
            fontSize: rs(18),
            lineHeight: rs(22),
            letterSpacing: rs(1),
          },
        ]}
      >
        <Text style={styles.cina}>CINA</Text>
        <Text style={styles.stream}>STREAM</Text>
      </Text>
    </View>
  );
}

function HeaderRightSetting() {
  const { rs } = useResponsive();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('Setting')}
      hitSlop={8}
      style={[
        styles.headerSettingBtn,
        {
          marginRight: rs(16),
          width: rs(36),
          height: rs(36),
          borderRadius: rs(18),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Cài đặt"
    >
      <Settings color="#D1D5DB" size={rs(20)} />
    </Pressable>
  );
}

export default function BottomTabNavigator() {
  const { rs } = useResponsive();
  const iconSize = rs(22);
  const activeMovieDownloads = useDownloadStore(
    state =>
      state.downloads.filter(
        d => d.status === 'downloading' || d.status === 'queued',
      ).length,
  );
  const activeFbDownloads = useFbDownloadStore(
    state => state.fbDownloads.filter(d => d.status === 'downloading').length,
  );
  const activeDownloadCount = activeMovieDownloads + activeFbDownloads;

  const renderExploreIcon = useCallback(
    ({ color }: { color: string }) => <Compass color={color} size={iconSize} />,
    [iconSize],
  );

  const renderFavoriteIcon = useCallback(
    ({ color }: { color: string }) => <Heart color={color} size={iconSize} />,
    [iconSize],
  );

  const renderDownloadIcon = useCallback(
    ({ color }: { color: string }) => <Download color={color} size={iconSize} />,
    [iconSize],
  );

  const renderFacebookIcon = useCallback(
    ({ color }: { color: string }) => (
      <DownloadCloud color={color} size={iconSize} />
    ),
    [iconSize],
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerLeft: HeaderBrand,
        headerRight: HeaderRightSetting,
        headerBackground: GlassBlurBackground,
        headerStyle: styles.header,
        tabBarStyle: [
          styles.tabBar,
          {
            height: rs(60),
            paddingTop: rs(6),
            paddingBottom: rs(8),
            paddingHorizontal: rs(8),
          },
        ],
        tabBarLabelStyle: {
          fontSize: rs(12),
        },
        tabBarBackground: GlassBlurBackground,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondary,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Khám phá',
          tabBarIcon: renderExploreIcon,
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          tabBarLabel: 'Yêu thích',
          tabBarIcon: renderFavoriteIcon,
        }}
      />
      <Tab.Screen
        name="Download"
        component={DownloadScreen}
        options={{
          tabBarLabel: 'Tải về',
          tabBarIcon: renderDownloadIcon,
          tabBarBadge:
            activeDownloadCount > 0 ? activeDownloadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            color: '#FFFFFF',
            fontSize: rs(10),
            fontWeight: '700',
          },
        }}
      />
      <Tab.Screen
        name="Facebook"
        component={FacebookDownloadScreen}
        options={{
          tabBarLabel: 'Facebook',
          tabBarIcon: renderFacebookIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 14,
    boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.75)',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSettingBtn: {
    backgroundColor: '#1E202B',
    borderWidth: 1,
    borderColor: '#2F3346',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cina: {
    color: COLORS.primary,
  },
  stream: {
    color: '#FFFFFF',
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 14,
    boxShadow: '0px -6px 20px rgba(0, 0, 0, 0.75)',
  },
  iosGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 15, 20, 0.45)',
  },
  androidGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 19, 26, 0.92)',
  },
});
