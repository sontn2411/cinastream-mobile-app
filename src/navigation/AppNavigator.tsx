import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import SplashScreen from '../screens/SplashScreen';
import { MovieItem } from '../types/movie';
import BottomTabNavigator from './BottomTabNavigator';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  MovieDetail: {
    slug: string;
    movie?: MovieItem;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={BottomTabNavigator} />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
