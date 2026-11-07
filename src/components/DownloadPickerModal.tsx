import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Download, Sparkles, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { DownloadEpisodeItem } from '../store/useDownloadStore';
import { EpisodeItem } from '../types/movie';

interface Props {
  visible: boolean;
  onClose: () => void;
  movieName?: string;
  currentServerName: string;
  episodes: EpisodeItem[];
  serverDownloadMap: Map<string, DownloadEpisodeItem>;
  pickedEpisodeIndices: number[];
  onTogglePickEpisode: (index: number) => void;
  onSelectAllDownloadable: () => void;
  onConfirmBatchDownload: () => void;
  insetsBottom: number;
  epWidth: number;
  epGap: number;
  rs: (size: number) => number;
}

export const DownloadPickerModal = memo(function DownloadPickerModalComponent({
  visible,
  onClose,
  movieName,
  currentServerName,
  episodes,
  serverDownloadMap,
  pickedEpisodeIndices,
  onTogglePickEpisode,
  onSelectAllDownloadable,
  onConfirmBatchDownload,
  insetsBottom,
  epWidth,
  epGap,
  rs,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          style={[
            styles.modalSheet,
            {
              borderTopLeftRadius: rs(28),
              borderTopRightRadius: rs(28),
              paddingHorizontal: rs(16),
              paddingTop: rs(18),
              paddingBottom: insetsBottom + rs(18),
              gap: rs(14),
            },
          ]}
        >
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <View style={styles.titleRow}>
                <Sparkles color={COLORS.primary} size={rs(16)} />
                <Text style={[styles.modalTitle, { fontSize: rs(16) }]}>
                  Chọn tập muốn tải về
                </Text>
              </View>
              <Text style={[styles.modalSubTitle, { fontSize: rs(12) }]}>
                {`${movieName ?? ''} • ${currentServerName}`}
              </Text>
            </View>
            <Pressable
              onPress={onSelectAllDownloadable}
              style={[
                styles.selectAllBtn,
                {
                  paddingHorizontal: rs(12),
                  paddingVertical: rs(6.5),
                  borderRadius: rs(14),
                  marginRight: rs(8),
                },
              ]}
            >
              <Text style={[styles.selectAllText, { fontSize: rs(12) }]}>
                Chọn hết
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeModalCircle,
                { width: rs(34), height: rs(34), borderRadius: rs(17) },
              ]}
            >
              <X color={COLORS.ink} size={rs(18)} />
            </Pressable>
          </View>

          {/* Lưới tập phim trong Modal */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: rs(320) }}
          >
            <View style={[styles.episodeGrid, { gap: epGap }]}>
              {episodes.map((ep, idx) => {
                const dlItem = serverDownloadMap.get(ep.slug);
                const isAlreadyDone = dlItem?.status === 'completed';
                const isBusy =
                  dlItem?.status === 'downloading' ||
                  dlItem?.status === 'queued';
                const isPicked = pickedEpisodeIndices.includes(idx);

                return (
                  <Pressable
                    key={`dl-${ep.slug}-${idx}`}
                    disabled={isAlreadyDone || isBusy}
                    onPress={() => onTogglePickEpisode(idx)}
                    style={[
                      styles.episodeBox,
                      {
                        width: epWidth,
                        paddingVertical: rs(10),
                        borderRadius: rs(12),
                      },
                      isPicked ? styles.episodeBoxActive : null,
                      isAlreadyDone || isBusy ? styles.episodeBoxDisabled : null,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.episodeText,
                        { fontSize: rs(12) },
                        isPicked ? styles.episodeTextActive : null,
                      ]}
                    >
                      {ep.name}
                    </Text>
                    {isAlreadyDone ? (
                      <Text
                        style={[styles.epModalStatusDone, { fontSize: rs(9) }]}
                      >
                        Đã tải
                      </Text>
                    ) : dlItem?.status === 'queued' ? (
                      <Text
                        style={[
                          styles.epModalStatusText,
                          styles.epModalStatusQueued,
                          { fontSize: rs(9) },
                        ]}
                      >
                        Chờ tải
                      </Text>
                    ) : isBusy ? (
                      <Text
                        style={[styles.epModalStatusText, { fontSize: rs(9) }]}
                      >
                        {`${dlItem?.progress ?? 0}%`}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Nút xác nhận tải xuống */}
          <Pressable
            disabled={pickedEpisodeIndices.length === 0}
            onPress={onConfirmBatchDownload}
            style={({ pressed }) => [
              styles.confirmDownloadBtn,
              {
                height: rs(48),
                borderRadius: rs(18),
                gap: rs(8),
                transform: [{ translateY: pressed ? 2 : 0 }],
              },
              pickedEpisodeIndices.length === 0
                ? styles.confirmDownloadBtnDisabled
                : null,
            ]}
          >
            <Download color="#FFFFFF" size={rs(18)} />
            <Text style={[styles.confirmDownloadText, { fontSize: rs(14) }]}>
              {pickedEpisodeIndices.length > 0
                ? `Bắt đầu tải ${pickedEpisodeIndices.length} tập ngay`
                : 'Chọn ít nhất 1 tập để tải nhé'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 46, 53, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopWidth: 2.5,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  modalSubTitle: {
    color: COLORS.inkMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  selectAllBtn: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  selectAllText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  closeModalCircle: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  episodeBoxDisabled: {
    opacity: 0.55,
    backgroundColor: COLORS.surface,
  },
  episodeText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  episodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  epModalStatusText: {
    color: COLORS.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  epModalStatusDone: {
    color: COLORS.success,
    fontWeight: '800',
    marginTop: 2,
  },
  epModalStatusQueued: {
    color: COLORS.inkMuted,
  },
  confirmDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.primaryDark,
  },
  confirmDownloadBtnDisabled: {
    opacity: 0.45,
  },
  confirmDownloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
