import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DownloadCloud, Play, RotateCw, Trash2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { FbDownloadItem } from '../store/useFbDownloadStore';
import { formatBytes } from '../utils/format';

interface Props {
  item: FbDownloadItem;
  onPlay: (item: FbDownloadItem) => void;
  onRetry: (item: FbDownloadItem) => void;
  onDelete: (item: FbDownloadItem) => void;
  rs: (size: number) => number;
}

export const FacebookDownloadCard = memo(function CardComponent({
  item,
  onPlay,
  onRetry,
  onDelete,
  rs,
}: Props) {
  const isDone = item.status === 'completed';
  const isFailed = item.status === 'failed';
  const isDownloading = item.status === 'downloading';

  const handleCardPress = useCallback(() => {
    if (isDone) {
      onPlay(item);
    } else if (isFailed) {
      onRetry(item);
    }
  }, [isDone, isFailed, item, onPlay, onRetry]);

  const handleDeletePress = useCallback(() => {
    onDelete(item);
  }, [item, onDelete]);

  return (
    <Pressable
      onPress={handleCardPress}
      disabled={isDownloading}
      style={({ pressed }) => [
        styles.fbCard,
        {
          borderRadius: rs(18),
          padding: rs(14),
          transform: [{ translateY: pressed && !isDownloading ? 2 : 0 }],
        },
      ]}
    >
      <View style={[styles.fbCardLeft, { gap: rs(12) }]}>
        <View
          style={[
            styles.fbIconBox,
            isDone && styles.fbIconBoxDone,
            isFailed && styles.fbIconBoxFailed,
            { width: rs(44), height: rs(44), borderRadius: rs(14) },
          ]}
        >
          {isDone ? (
            <Play color={COLORS.success} fill={COLORS.success} size={rs(20)} />
          ) : isFailed ? (
            <RotateCw color={COLORS.danger} size={rs(20)} />
          ) : (
            <DownloadCloud color={COLORS.primary} size={rs(22)} />
          )}
        </View>
        <View style={styles.fbTextContainer}>
          <Text numberOfLines={1} style={[styles.fbTitle, { fontSize: rs(14) }]}>
            {item.fileName}
          </Text>
          <Text
            style={[
              styles.fbSubtitle,
              isFailed && styles.fbSubtitleFailed,
              { fontSize: rs(12), marginTop: rs(4) },
            ]}
          >
            {isDone
              ? `Đã tải xong • ${formatBytes(item.fileSize)} • Bấm để xem`
              : isFailed
              ? `Lỗi: ${item.errorMessage || 'Không thể tải'} (Bấm để thử lại)`
              : `Đang tải: ${item.progress}% (${formatBytes(item.downloadedBytes)} / ${
                  item.totalBytes > 0 ? formatBytes(item.totalBytes) : '--'
                })`}
          </Text>

          {isDownloading ? (
            <View
              style={[
                styles.progressTrack,
                { height: rs(6), borderRadius: rs(3), marginTop: rs(8) },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progress}%`, borderRadius: rs(3) },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={handleDeletePress}
        hitSlop={8}
        style={[
          styles.deleteCircleBtn,
          { width: rs(36), height: rs(36), borderRadius: rs(18), marginLeft: rs(8) },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Xóa video ${item.fileName}`}
      >
        <Trash2 color={COLORS.danger} size={rs(16)} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderBottomWidth: 4.5,
    borderBottomColor: COLORS.borderStrong,
  },
  fbCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fbIconBox: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbIconBoxDone: {
    backgroundColor: COLORS.successSoft,
    borderColor: '#A9EFE6',
  },
  fbIconBoxFailed: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.border,
  },
  fbTextContainer: {
    flex: 1,
  },
  fbTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  fbSubtitle: {
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
  fbSubtitleFailed: {
    color: COLORS.danger,
  },
  progressTrack: {
    width: '100%',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  deleteCircleBtn: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
