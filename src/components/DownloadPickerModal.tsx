import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Download, X } from 'lucide-react-native';
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

export function DownloadPickerModal({
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
              borderTopLeftRadius: rs(20),
              borderTopRightRadius: rs(20),
              paddingHorizontal: rs(16),
              paddingTop: rs(16),
              paddingBottom: insetsBottom + rs(16),
              gap: rs(14),
            },
          ]}
        >
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={[styles.modalTitle, { fontSize: rs(16) }]}>
                Chọn tập tải về
              </Text>
              <Text style={[styles.modalSubTitle, { fontSize: rs(12) }]}>
                {`${movieName ?? ''} • ${currentServerName}`}
              </Text>
            </View>
            <Pressable
              onPress={onSelectAllDownloadable}
              style={[
                styles.selectAllBtn,
                {
                  paddingHorizontal: rs(10),
                  paddingVertical: rs(6),
                  borderRadius: rs(8),
                  marginRight: rs(8),
                },
              ]}
            >
              <Text style={[styles.selectAllText, { fontSize: rs(12) }]}>
                Chọn tất cả
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeModalCircle,
                { width: rs(32), height: rs(32), borderRadius: rs(16) },
              ]}
            >
              <X color="#D1D5DB" size={rs(18)} />
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
                        borderRadius: rs(8),
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
                        style={[styles.epModalStatusText, { fontSize: rs(9) }]}
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
            style={[
              styles.confirmDownloadBtn,
              {
                height: rs(46),
                borderRadius: rs(12),
                gap: rs(8),
              },
              pickedEpisodeIndices.length === 0
                ? styles.confirmDownloadBtnDisabled
                : null,
            ]}
          >
            <Download color="#FFFFFF" size={rs(18)} />
            <Text style={[styles.confirmDownloadText, { fontSize: rs(14) }]}>
              {pickedEpisodeIndices.length > 0
                ? `Tải xuống ${pickedEpisodeIndices.length} tập đã chọn`
                : 'Chọn ít nhất 1 tập để tải'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#13141C',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalSubTitle: {
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectAllBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  selectAllText: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  closeModalCircle: {
    backgroundColor: '#1E202B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeBox: {
    backgroundColor: '#161822',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeBoxActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: COLORS.primary,
  },
  episodeBoxDisabled: {
    opacity: 0.45,
    backgroundColor: '#111218',
  },
  episodeText: {
    color: '#D1D5DB',
    fontWeight: '600',
  },
  episodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  epModalStatusText: {
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  epModalStatusQueued: {
    color: '#9CA3AF',
  },
  confirmDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmDownloadBtnDisabled: {
    opacity: 0.45,
  },
  confirmDownloadText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

