import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  History,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useResponsive } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Setting'>;

export default function SettingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { rs } = useResponsive();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleGoHistory = useCallback(() => {
    navigation.navigate('History');
  }, [navigation]);

  const handleGoFacebookDownload = useCallback(() => {
    navigation.navigate('FacebookDownload');
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + rs(8),
            paddingHorizontal: rs(16),
            paddingBottom: rs(12),
          },
        ]}
      >
        <Pressable
          onPress={handleGoBack}
          hitSlop={8}
          style={[
            styles.backBtn,
            { width: rs(36), height: rs(36), borderRadius: rs(18) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ChevronLeft color="#FFFFFF" size={rs(22)} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: rs(18) }]}>Cài đặt</Text>

        {/* Placeholder View to keep Title centered */}
        <View style={{ width: rs(36) }} />
      </View>

      {/* Settings Options */}
      <View style={[styles.content, { padding: rs(16), gap: rs(12) }]}>
        <Text style={[styles.sectionTitle, { fontSize: rs(13) }]}>
          TIỆN ÍCH & CÁ NHÂN
        </Text>

        {/* Item 1: Lịch sử xem */}
        <Pressable
          onPress={handleGoHistory}
          style={({ pressed }) => [
            styles.menuItem,
            {
              paddingVertical: rs(14),
              paddingHorizontal: rs(14),
              borderRadius: rs(12),
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Chuyển đến màn hình lịch sử xem"
        >
          <View style={[styles.menuItemLeft, { gap: rs(12) }]}>
            <View
              style={[
                styles.menuIconContainer,
                styles.historyIconContainer,
                { width: rs(38), height: rs(38), borderRadius: rs(10) },
              ]}
            >
              <History color={COLORS.primary} size={rs(20)} />
            </View>
            <View>
              <Text style={[styles.menuItemTitle, { fontSize: rs(15) }]}>
                Lịch sử xem
              </Text>
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { fontSize: rs(12), marginTop: rs(2) },
                ]}
              >
                Danh sách các bộ đang xem dở
              </Text>
            </View>
          </View>
          <ChevronRight color="#8A8F9E" size={rs(18)} />
        </Pressable>

        {/* Item 2: Tải Video Facebook */}
        <Pressable
          onPress={handleGoFacebookDownload}
          style={({ pressed }) => [
            styles.menuItem,
            {
              paddingVertical: rs(14),
              paddingHorizontal: rs(14),
              borderRadius: rs(12),
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Chuyển đến màn hình tải video Facebook"
        >
          <View style={[styles.menuItemLeft, { gap: rs(12) }]}>
            <View
              style={[
                styles.menuIconContainer,
                { width: rs(38), height: rs(38), borderRadius: rs(10) },
              ]}
            >
              <DownloadCloud color="#1877F2" size={rs(20)} />
            </View>
            <View>
              <Text style={[styles.menuItemTitle, { fontSize: rs(15) }]}>
                Tải Video Facebook
              </Text>
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { fontSize: rs(12), marginTop: rs(2) },
                ]}
              >
                Công cụ tải clip & reel từ Facebook
              </Text>
            </View>
          </View>
          <ChevronRight color="#8A8F9E" size={rs(18)} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    backgroundColor: '#1E202B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    color: '#8A8F9E',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151722',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  menuIconContainer: {
    backgroundColor: 'rgba(24, 119, 242, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconContainer: {
    backgroundColor: 'rgba(229, 9, 20, 0.14)',
  },
  menuItemTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  menuItemSubtitle: {
    color: '#8A8F9E',
  },
});
