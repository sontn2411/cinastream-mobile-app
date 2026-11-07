import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CalendarDays,
  Globe,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import {
  CategoryRef,
  MovieFilterState,
  MovieListType,
} from '../types/movie';
import { useResponsive } from '../utils/responsive';

interface Props {
  visible: boolean;
  filter: MovieFilterState;
  categories: CategoryRef[];
  totalItems: number;
  onChangeFilter: (next: MovieFilterState) => void;
  onReset: () => void;
}

const LIST_TABS: { label: string; value: MovieListType; hot?: boolean }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Mới cập nhật', value: 'phim-moi-cap-nhat', hot: true },
  { label: 'Phim bộ', value: 'phim-bo' },
  { label: 'Phim lẻ', value: 'phim-le' },
  { label: 'Hoạt hình', value: 'hoat-hinh' },
];

const COUNTRY_TABS = [
  { label: 'Tất cả', slug: '' },
  { label: 'Trung Quốc', slug: 'trung-quoc' },
  { label: 'Hàn Quốc', slug: 'han-quoc' },
];

function FilterSection({
  visible,
  filter,
  categories,
  totalItems,
  onChangeFilter,
  onReset,
}: Props) {
  const { rs } = useResponsive();
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [visible, anim]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - contentHeight) > 1) {
      setContentHeight(h);
    }
  };

  const years = useMemo(() => {
    const currentYear = Math.min(new Date().getFullYear(), 2026);
    const list: string[] = [];
    for (let y = currentYear; y >= 2010; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  const animatedHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-rs(12), 0],
  });

  return (
    <View style={{ marginBottom: rs(8) }}>
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.animatedContainer,
          {
            height: animatedHeight,
            opacity: anim,
          },
        ]}
      >
        <Animated.View
          onLayout={handleLayout}
          style={[
            styles.measureInner,
            {
              gap: rs(12),
              paddingBottom: rs(12),
              transform: [{ translateY }],
            },
          ]}
        >
          {/* 1. Danh mục phim */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: rs(8) }}
          >
            {LIST_TABS.map(tab => {
              const active = filter.listType === tab.value;
              return (
                <Pressable
                  key={tab.value}
                  onPress={() =>
                    onChangeFilter({ ...filter, listType: tab.value })
                  }
                  style={[
                    styles.mainPill,
                    {
                      paddingHorizontal: rs(16),
                      paddingVertical: rs(9),
                      borderRadius: rs(20),
                      gap: rs(6),
                    },
                    active ? styles.pillActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.mainPillText,
                      { fontSize: rs(13) },
                      active ? styles.pillTextActive : null,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.hot ? (
                    <View
                      style={[
                        styles.hotBadge,
                        {
                          paddingHorizontal: rs(6),
                          paddingVertical: rs(1.5),
                          borderRadius: rs(8),
                        },
                        active ? styles.hotBadgeOnActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hotBadgeText,
                          { fontSize: rs(9) },
                          active ? { color: COLORS.primary } : null,
                        ]}
                      >
                        Mới
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 2. Thể loại */}
          <View style={{ gap: rs(6) }}>
            <Text style={[styles.sectionLabel, { fontSize: rs(12) }]}>
              Thể loại yêu thích
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: rs(8) }}
            >
              <Pressable
                onPress={() => onChangeFilter({ ...filter, category: '' })}
                style={[
                  styles.subPill,
                  {
                    paddingHorizontal: rs(14),
                    paddingVertical: rs(6.5),
                    borderRadius: rs(18),
                  },
                  filter.category === '' ? styles.pillActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.subPillText,
                    { fontSize: rs(12) },
                    filter.category === '' ? styles.pillTextActive : null,
                  ]}
                >
                  Tất cả
                </Text>
              </Pressable>
              {categories.map(cat => {
                const active = filter.category === cat.slug;
                return (
                  <Pressable
                    key={cat._id ?? cat.slug}
                    onPress={() =>
                      onChangeFilter({ ...filter, category: cat.slug })
                    }
                    style={[
                      styles.subPill,
                      {
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(6.5),
                        borderRadius: rs(18),
                      },
                      active ? styles.pillActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subPillText,
                        { fontSize: rs(12) },
                        active ? styles.pillTextActive : null,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Quốc gia & Năm */}
          <View style={{ gap: rs(8) }}>
            <Text style={[styles.sectionLabel, { fontSize: rs(12) }]}>
              Quốc gia & Năm phát hành
            </Text>

            {/* Hàng Quốc gia */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.rowCenter, { gap: rs(8) }]}
            >
              <View
                style={[
                  styles.tagHeader,
                  {
                    paddingHorizontal: rs(10),
                    paddingVertical: rs(6),
                    borderRadius: rs(14),
                    gap: rs(5),
                  },
                ]}
              >
                <Globe color={COLORS.secondaryDark} size={rs(13)} />
                <Text style={[styles.tagHeaderText, { fontSize: rs(12) }]}>
                  Quốc gia
                </Text>
              </View>
              {COUNTRY_TABS.map(c => {
                const active = filter.country === c.slug;
                return (
                  <Pressable
                    key={c.slug || 'all'}
                    onPress={() =>
                      onChangeFilter({ ...filter, country: c.slug })
                    }
                    style={[
                      styles.subPill,
                      {
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(6.5),
                        borderRadius: rs(18),
                      },
                      active ? styles.pillActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subPillText,
                        { fontSize: rs(12) },
                        active ? styles.pillTextActive : null,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Hàng Năm */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.rowCenter, { gap: rs(8) }]}
            >
              <View
                style={[
                  styles.tagHeader,
                  {
                    paddingHorizontal: rs(10),
                    paddingVertical: rs(6),
                    borderRadius: rs(14),
                    gap: rs(5),
                  },
                ]}
              >
                <CalendarDays color={COLORS.primary} size={rs(13)} />
                <Text style={[styles.tagHeaderText, { fontSize: rs(12) }]}>
                  Năm
                </Text>
              </View>
              <Pressable
                onPress={() => onChangeFilter({ ...filter, year: '' })}
                style={[
                  styles.subPill,
                  {
                    paddingHorizontal: rs(14),
                    paddingVertical: rs(6.5),
                    borderRadius: rs(18),
                  },
                  filter.year === '' ? styles.pillActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.subPillText,
                    { fontSize: rs(12) },
                    filter.year === '' ? styles.pillTextActive : null,
                  ]}
                >
                  Tất cả
                </Text>
              </Pressable>
              {years.map(yr => {
                const active = filter.year === yr;
                return (
                  <Pressable
                    key={yr}
                    onPress={() => onChangeFilter({ ...filter, year: yr })}
                    style={[
                      styles.subPill,
                      {
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(6.5),
                        borderRadius: rs(18),
                      },
                      active ? styles.pillActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subPillText,
                        { fontSize: rs(12) },
                        active ? styles.pillTextActive : null,
                      ]}
                    >
                      {yr}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Thanh tổng kết số phim & Đặt lại */}
      <View
        style={[
          styles.summaryBar,
          {
            paddingVertical: rs(8),
            paddingHorizontal: rs(12),
            borderRadius: rs(16),
          },
        ]}
      >
        <View style={[styles.rowCenter, { gap: rs(6) }]}>
          <Sparkles color={COLORS.primary} size={rs(14)} />
          <Text style={[styles.summaryText, { fontSize: rs(12.5) }]}>
            Có <Text style={styles.summaryHighlight}>{totalItems}</Text> bộ phim
            đang chờ bạn khám phá
          </Text>
        </View>
        <Pressable
          onPress={onReset}
          style={[
            styles.rowCenter,
            styles.resetPill,
            {
              gap: rs(4),
              paddingHorizontal: rs(9),
              paddingVertical: rs(4),
              borderRadius: rs(12),
            },
          ]}
        >
          <RotateCcw color={COLORS.primary} size={rs(12)} />
          <Text style={[styles.resetText, { fontSize: rs(11.5) }]}>
            Làm mới
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default memo(FilterSection);

const styles = StyleSheet.create({
  measureInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    color: COLORS.inkSoft,
    fontWeight: '800',
  },
  mainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
  },
  mainPillText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  subPill: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.borderStrong,
  },
  subPillText: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hotBadge: {
    backgroundColor: COLORS.accent,
  },
  hotBadgeOnActive: {
    backgroundColor: '#FFFFFF',
  },
  hotBadgeText: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  tagHeaderText: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  summaryText: {
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
  summaryHighlight: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  animatedContainer: {
    overflow: 'hidden',
  },
  resetPill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
