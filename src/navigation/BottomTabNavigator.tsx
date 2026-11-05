import React from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Compass, Heart, Download, History } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import ExploreScreen from '../screens/ExploreScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import DownloadScreen from '../screens/DownloadScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { useDownloadStore } from '../store/useDownloadStore';
import { useResponsive } from '../utils/responsive';

export type BottomTabParamList = {
  Explore: undefined;
  Favorite: undefined;
  Download: undefined;
  History: undefined;
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

export default function BottomTabNavigator() {
  const { rs } = useResponsive();
  const iconSize = rs(22);
  const activeDownloadCount = useDownloadStore(
    state =>
      state.downloads.filter(
        d => d.status === 'downloading' || d.status === 'queued',
      ).length,
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerLeft: HeaderBrand,
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
          tabBarIcon: ({ color }) => <Compass color={color} size={iconSize} />,
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          tabBarLabel: 'Yêu thích',
          tabBarIcon: ({ color }) => <Heart color={color} size={iconSize} />,
        }}
      />
      <Tab.Screen
        name="Download"
        component={DownloadScreen}
        options={{
          tabBarLabel: 'Tải về',
          tabBarIcon: ({ color }) => <Download color={color} size={iconSize} />,
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
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ color }) => <History color={color} size={iconSize} />,
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
