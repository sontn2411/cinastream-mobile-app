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
      <View
        style={[
          styles.bubbleTop,
          {
            width: rs(220),
            height: rs(220),
            borderRadius: rs(110),
            top: -rs(60),
            right: -rs(50),
          },
        ]}
      />
      <View
        style={[
          styles.bubbleBottom,
          {
            width: rs(180),
            height: rs(180),
            borderRadius: rs(90),
            bottom: -rs(40),
            left: -rs(40),
          },
        ]}
      />

      <View
        style={[
          styles.logoSticker,
          {
            paddingHorizontal: rs(26),
            paddingVertical: rs(22),
            borderRadius: rs(32),
            marginBottom: rs(18),
          },
        ]}
      >
        <Image
          source={require('../assets/logo-cinastream.png')}
          style={{
            width: rs(110),
            height: rs(76),
          }}
          resizeMode="contain"
        />
      </View>

      <Text
        style={[
          styles.title,
          { fontSize: rs(30), letterSpacing: rs(1.2) },
        ]}
      >
        <Text style={styles.cina}>Cina</Text>
        <Text style={styles.stream}>Stream</Text>
      </Text>

      <View
        style={[
          styles.taglinePill,
          {
            marginTop: rs(10),
            paddingHorizontal: rs(14),
            paddingVertical: rs(6),
            borderRadius: rs(20),
          },
        ]}
      >
        <Text style={[styles.taglineText, { fontSize: rs(12) }]}>
          Rạp phim dâu tây ngọt ngào (◕‿◕✿)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleTop: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  bubbleBottom: {
    position: 'absolute',
    backgroundColor: COLORS.secondarySoft,
    borderWidth: 2,
    borderColor: '#BCECE8',
  },
  logoSticker: {
    backgroundColor: COLORS.card,
    borderWidth: 2.5,
    borderColor: COLORS.border,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.borderStrong,
    shadowColor: '#F4A2B8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  title: {
    fontWeight: '900',
  },
  cina: {
    color: COLORS.primary,
  },
  stream: {
    color: COLORS.ink,
  },
  taglinePill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  taglineText: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
});
