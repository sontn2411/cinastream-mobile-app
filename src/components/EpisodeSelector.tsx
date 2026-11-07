import React, { memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Film, Server } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { DownloadEpisodeItem } from '../store/useDownloadStore';
import { EpisodeItem, EpisodeServer } from '../types/movie';

interface Props {
  servers: EpisodeServer[];
  selectedServerIdx: number;
  onSelectServer: (index: number) => void;
  episodes: EpisodeItem[];
  selectedEpisodeIdx: number;
  onSelectEpisode: (index: number) => void;
  serverDownloadMap: Map<string, DownloadEpisodeItem>;
  epWidth: number;
  epGap: number;
  rs: (size: number) => number;
}

export const EpisodeSelector = memo(function EpisodeSelectorComponent({
  servers,
  selectedServerIdx,
  onSelectServer,
  episodes,
  selectedEpisodeIdx,
  onSelectEpisode,
  serverDownloadMap,
  epWidth,
  epGap,
  rs,
}: Props) {
  if (servers.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: rs(14) }}>
      {/* Server Tabs */}
      <View style={{ gap: rs(8) }}>
        <View style={[styles.sectionHeaderRow, { gap: rs(6) }]}>
          <Server color={COLORS.primary} size={rs(15)} />
          <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
            Chọn nguồn phát
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.serverList, { gap: rs(8) }]}
        >
          {servers.map((srv, idx) => {
            const srvIndex = srv.serverIndex ?? idx;
            const active = srvIndex === selectedServerIdx;
            return (
              <Pressable
                key={`${srv.server_name}-${srvIndex}`}
                onPress={() => onSelectServer(srvIndex)}
                style={[
                  styles.serverPill,
                  {
                    paddingHorizontal: rs(15),
                    paddingVertical: rs(8),
                    borderRadius: rs(20),
                  },
                  active ? styles.serverPillActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.serverPillText,
                    { fontSize: rs(12) },
                    active ? styles.serverPillTextActive : null,
                  ]}
                >
                  {srv.server_name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Lưới Tập phim */}
      {episodes.length > 0 ? (
        <View style={{ gap: rs(8) }}>
          <View style={[styles.sectionHeaderRow, { gap: rs(6) }]}>
            <Film color={COLORS.primary} size={rs(15)} />
            <Text style={[styles.sectionTitle, { fontSize: rs(14) }]}>
              Danh sách tập ({episodes.length})
            </Text>
          </View>

          <View style={[styles.episodeGrid, { gap: epGap }]}>
            {episodes.map((ep, idx) => {
              const epIndex = ep.episodeIndex ?? idx;
              const active = epIndex === selectedEpisodeIdx;
              const dlItem = serverDownloadMap.get(ep.slug);
              return (
                <Pressable
                  key={`${ep.slug}-${epIndex}`}
                  onPress={() => onSelectEpisode(epIndex)}
                  style={({ pressed }) => [
                    styles.episodeBox,
                    {
                      width: epWidth,
                      paddingVertical: rs(10),
                      borderRadius: rs(12),
                      transform: [{ translateY: pressed ? 1.5 : 0 }],
                    },
                    active ? styles.episodeBoxActive : null,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.episodeText,
                      { fontSize: rs(12) },
                      active ? styles.episodeTextActive : null,
                    ]}
                  >
                    {ep.name}
                  </Text>
                  {dlItem?.status === 'completed' ? (
                    <View
                      style={[
                        styles.epDownloadedDot,
                        active ? styles.epDownloadedDotActive : null,
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.ink,
    fontWeight: '800',
  },
  serverList: {
    paddingVertical: 2,
  },
  serverPill: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
  },
  serverPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  serverPillText: {
    color: COLORS.inkSoft,
    fontWeight: '700',
  },
  serverPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  episodeBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderBottomWidth: 3.5,
    borderBottomColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  episodeBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderBottomColor: COLORS.primaryDark,
  },
  episodeText: {
    color: COLORS.ink,
    fontWeight: '700',
  },
  episodeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  epDownloadedDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.success,
  },
  epDownloadedDotActive: {
    backgroundColor: '#FFFFFF',
  },
});
