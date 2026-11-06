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
          borderRadius: rs(14),
          padding: rs(14),
          opacity: pressed && !isDownloading ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.fbCardLeft, { gap: rs(12) }]}>
        <View
          style={[
            styles.fbIconBox,
            isDone && styles.fbIconBoxDone,
            isFailed && styles.fbIconBoxFailed,
            { width: rs(44), height: rs(44), borderRadius: rs(12) },
          ]}
        >
          {isDone ? (
            <Play color="#10B981" fill="#10B981" size={rs(20)} />
          ) : isFailed ? (
            <RotateCw color="#EF4444" size={rs(20)} />
          ) : (
            <DownloadCloud color="#1877F2" size={rs(22)} />
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
              ? `Đã tải • ${formatBytes(item.fileSize)} • Nhấn để phát`
              : isFailed
              ? `Lỗi: ${item.errorMessage || 'Không thể tải'} (Nhấn để thử lại)`
              : `Đang tải: ${item.progress}% (${formatBytes(item.downloadedBytes)} / ${
                  item.totalBytes > 0 ? formatBytes(item.totalBytes) : '--'
                })`}
          </Text>

          {isDownloading ? (
            <View
              style={[
                styles.progressTrack,
                { height: rs(4), borderRadius: rs(2), marginTop: rs(8) },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${item.progress}%`, borderRadius: rs(2) },
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
          { width: rs(34), height: rs(34), borderRadius: rs(17), marginLeft: rs(8) },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Xóa video ${item.fileName}`}
      >
        <Trash2 color="#EF4444" size={rs(16)} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151722',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  fbCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fbIconBox: {
    backgroundColor: 'rgba(24, 119, 242, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbIconBoxDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  fbIconBoxFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  fbTextContainer: {
    flex: 1,
  },
  fbTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fbSubtitle: {
    color: '#8A8F9E',
  },
  fbSubtitleFailed: {
    color: '#F87171',
  },
  progressTrack: {
    width: '100%',
    backgroundColor: '#252836',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  deleteCircleBtn: {
    backgroundColor: '#252836',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
