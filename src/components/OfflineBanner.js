// =========================
// OFFLINE BANNER
// Пометка, когда данные пришли из кэша.
// =========================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, layout } from '../theme';

export default function OfflineBanner({ fromCache, cacheAge }) {
  if (!fromCache) return null;

  const ageText = cacheAge != null
    ? cacheAge < 60
      ? `${cacheAge} мин. назад`
      : `${Math.floor(cacheAge / 60)} ч. назад`
    : '';

  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        Офлайн · данные из кэша{ageText ? ` · ${ageText}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: layout.page,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warn },
  text: { color: colors.text2, fontSize: 12, lineHeight: 16 },
});
