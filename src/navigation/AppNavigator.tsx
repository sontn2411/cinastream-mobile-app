import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import FacebookDownloadScreen from '../screens/FacebookDownloadScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LocalVideoPlayerScreen from '../screens/LocalVideoPlayerScreen';
import SettingScreen from '../screens/SettingScreen';
import SplashScreen from '../screens/SplashScreen';
import { MovieItem } from '../types/movie';
import BottomTabNavigator from './BottomTabNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Setting: undefined;
  History: undefined;
  FacebookDownload: undefined;
  LocalVideoPlayer: {
    title: string;
    uri: string;
  };
  MovieDetail: {
    slug: string;
    movie?: MovieItem;
    resumeEpisodeIndex?: number;
    resumeServerIndex?: number;
    resumeTime?: number;
    localUri?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={BottomTabNavigator} />
        <Stack.Screen name="Setting" component={SettingScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen
          name="FacebookDownload"
          component={FacebookDownloadScreen}
        />
        <Stack.Screen
          name="LocalVideoPlayer"
          component={LocalVideoPlayerScreen}
          options={{ orientation: 'all' }}
        />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
