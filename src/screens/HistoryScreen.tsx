import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../utils/responsive';

export default function HistoryScreen() {
  const { rs } = useResponsive();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const topOffset = headerHeight > 0 ? headerHeight : insets.top + rs(64);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topOffset,
          paddingHorizontal: rs(16),
          paddingBottom: rs(60),
        },
      ]}>
      <Text style={[styles.text, { fontSize: rs(20) }]}>Lịch sử</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
