import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useResponsive } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const { rs } = useResponsive();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingHorizontal: rs(24) }]}>
      <Image
        source={require('../assets/logo-cinastream.png')}
        style={{
          width: rs(120),
          height: rs(84),
          marginBottom: rs(16),
        }}
        resizeMode="contain"
      />
      <Text
        style={[
          styles.title,
          { fontSize: rs(32), letterSpacing: rs(2) },
        ]}>
        <Text style={styles.cina}>CINA</Text>
        <Text style={styles.stream}>STREAM</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  cina: {
    color: COLORS.primary,
  },
  stream: {
    color: '#FFFFFF',
  },
});
