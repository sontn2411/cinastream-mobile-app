import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  History,
  Sparkles,
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
            { width: rs(38), height: rs(38), borderRadius: rs(19) },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <ChevronLeft color={COLORS.ink} size={rs(22)} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: rs(18) }]}>
          Góc cài đặt
        </Text>

        {/* Placeholder View to keep Title centered */}
        <View style={{ width: rs(38) }} />
      </View>

      {/* Settings Options */}
      <View style={[styles.content, { padding: rs(16), gap: rs(12) }]}>
        <View style={[styles.sectionHeaderRow, { gap: rs(6) }]}>
          <Sparkles color={COLORS.primary} size={rs(15)} />
          <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
            Góc riêng của bạn
          </Text>
        </View>

        {/* Item 1: Lịch sử xem */}
        <Pressable
          onPress={handleGoHistory}
          style={({ pressed }) => [
            styles.menuItem,
            {
              paddingVertical: rs(14),
              paddingHorizontal: rs(14),
              borderRadius: rs(18),
              transform: [{ translateY: pressed ? 2 : 0 }],
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
                { width: rs(42), height: rs(42), borderRadius: rs(14) },
              ]}
            >
              <History color={COLORS.primary} size={rs(20)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { fontSize: rs(15) }]}>
                Nhật ký xem phim
              </Text>
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { fontSize: rs(12), marginTop: rs(2) },
                ]}
              >
                Xem tiếp các tập phim bạn đang thưởng thức dở
              </Text>
            </View>
          </View>
          <ChevronRight color={COLORS.inkMuted} size={rs(18)} />
        </Pressable>

        {/* Item 2: Tải Video Facebook */}
        <Pressable
          onPress={handleGoFacebookDownload}
          style={({ pressed }) => [
            styles.menuItem,
            {
              paddingVertical: rs(14),
              paddingHorizontal: rs(14),
              borderRadius: rs(18),
              transform: [{ translateY: pressed ? 2 : 0 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Chuyển đến màn hình tải video Facebook"
        >
          <View style={[styles.menuItemLeft, { gap: rs(12) }]}>
            <View
              style={[
                styles.menuIconContainer,
                { width: rs(42), height: rs(42), borderRadius: rs(14) },
              ]}
            >
              <DownloadCloud color={COLORS.secondaryDark} size={rs(20)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { fontSize: rs(15) }]}>
                Tải video Facebook
              </Text>
              <Text
                style={[
                  styles.menuItemSubtitle,
                  { fontSize: rs(12), marginTop: rs(2) },
                ]}
              >
                Lưu nhanh clip & thước phim Reels về máy
              </Text>
            </View>
          </View>
          <ChevronRight color={COLORS.inkMuted} size={rs(18)} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.ink,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  menuIconContainer: {
    backgroundColor: COLORS.secondarySoft,
    borderWidth: 1.5,
    borderColor: '#A9EFE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconContainer: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.border,
  },
  menuItemTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  menuItemSubtitle: {
    color: COLORS.inkSoft,
    fontWeight: '500',
  },
});
