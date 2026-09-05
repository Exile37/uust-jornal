// =========================
// OFFLINE BANNER
// Показывает пометку когда данные из кэша
// =========================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OfflineBanner({ fromCache, cacheAge }) {
  if (!fromCache) return null;

  const ageText = cacheAge != null
    ? cacheAge < 60
      ? `${cacheAge} мин. назад`
      : `${Math.floor(cacheAge / 60)} ч. назад`
    : '';

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📵</Text>
      <Text style={styles.text}>
        Офлайн — данные из кэша{ageText ? ` · ${ageText}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a4a2a',
  },
  icon: { fontSize: 14 },
  text: { color: '#66bb6a', fontSize: 12, fontWeight: '600' },
});
