import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

// Одна полоса на три цифры вместо трёх одинаковых карточек.
export default function StatStrip({ items }) {
  return (
    <View style={styles.strip}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.cell, index > 0 && styles.cellDivider]}>
          <Text
            style={[styles.value, item.accent && styles.valueAccent]}
            numberOfLines={1}
          >
            {item.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cellDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  value: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  valueAccent: { color: colors.accent },
  label: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});
