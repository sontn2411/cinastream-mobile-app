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
  Sparkles,
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

function HeaderGlassBackground() {
  if (Platform.OS === 'ios') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={18}
          reducedTransparencyFallbackColor={COLORS.background}
        />
        <View style={styles.iosHeaderOverlay} />
      </View>
    );
  }

  return <View pointerEvents="none" style={styles.androidHeaderGlass} />;
}

function TabPillBackground() {
  const { rs } = useResponsive();
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.tabPillSurface,
        { borderRadius: rs(28) },
      ]}
    />
  );
}

function HeaderBrand() {
  const { rs } = useResponsive();

  return (
    <View style={[styles.headerBrand, { paddingLeft: rs(14), gap: rs(8) }]}>
      <View
        style={[
          styles.logoBadge,
          {
            paddingHorizontal: rs(7),
            paddingVertical: rs(4),
            borderRadius: rs(12),
          },
        ]}
      >
        <Image
          source={require('../assets/logo-cinastream.png')}
          style={{ width: rs(26), height: rs(18) }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={[
          styles.brandTitle,
          {
            fontSize: rs(19),
            lineHeight: rs(23),
            letterSpacing: rs(0.5),
          },
        ]}
      >
        <Text style={styles.cina}>Cina</Text>
        <Text style={styles.stream}>Stream</Text>
      </Text>
      <Sparkles color={COLORS.accent} fill={COLORS.accent} size={rs(14)} />
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
      style={({ pressed }) => [
        styles.headerSettingBtn,
        {
          marginRight: rs(14),
          width: rs(38),
          height: rs(38),
          borderRadius: rs(19),
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Cài đặt"
    >
      <Settings color={COLORS.ink} size={rs(19)} />
    </Pressable>
  );
}

export default function BottomTabNavigator() {
  const { rs } = useResponsive();
  const iconSize = rs(21);
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
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Heart
        color={color}
        fill={focused ? COLORS.primarySoft : 'none'}
        size={iconSize}
      />
    ),
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
        headerBackground: HeaderGlassBackground,
        headerStyle: styles.header,
        tabBarStyle: [
          styles.tabBar,
          {
            height: rs(64),
            left: rs(14),
            right: rs(14),
            bottom: rs(12),
            borderRadius: rs(28),
            paddingTop: rs(6),
            paddingBottom: rs(8),
            paddingHorizontal: rs(8),
          },
        ],
        tabBarItemStyle: {
          borderRadius: rs(20),
          marginHorizontal: rs(2),
        },
        tabBarLabelStyle: {
          fontSize: rs(11.5),
          fontWeight: '800',
        },
        tabBarBackground: TabPillBackground,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inkMuted,
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
          tabBarLabel: 'Tủ phim',
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
            fontWeight: '800',
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
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    shadowColor: '#F4A2B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.borderStrong,
  },
  headerSettingBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cina: {
    color: COLORS.primary,
  },
  stream: {
    color: COLORS.ink,
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: '#E8839B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  tabPillSurface: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  iosHeaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 246, 0.82)',
  },
  androidHeaderGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 246, 0.96)',
  },
});
