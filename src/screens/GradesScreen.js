import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { fetchGrades } from '../services/subjectsService';
import OfflineBanner from '../components/OfflineBanner';
import StatStrip from '../components/StatStrip';
import Chevron from '../components/Chevron';
import { colors, layout, radius } from '../theme';

function markColors(grade) {
  const numeric = parseInt(grade, 10);
  if (grade === '2' || grade === 'н/я' || grade === 'н') {
    return { bg: colors.badSoft, border: 'rgba(207, 127, 114, 0.35)', fg: colors.bad };
  }
  if (numeric >= 4) {
    return { bg: colors.goodSoft, border: 'rgba(143, 174, 120, 0.35)', fg: colors.good };
  }
  if (numeric === 3) {
    return { bg: colors.warnSoft, border: 'rgba(201, 162, 94, 0.35)', fg: colors.warn };
  }
  return { bg: colors.raised, border: colors.line, fg: colors.text2 };
}

const GradeItem = React.memo(({ item, first, last }) => {
  const grade = String(item.grade ?? '').trim();
  const mark = markColors(grade);
  return (
    <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !first && styles.rowDivider]}>
      <View style={styles.info}>
        <Text style={styles.theme} numberOfLines={2}>{item.theme || 'Занятие'}</Text>
        <Text style={styles.date} numberOfLines={1}>{item.date || 'Дата не указана'}</Text>
      </View>
      <View style={[styles.mark, { backgroundColor: mark.bg, borderColor: mark.border }]}>
        <Text style={[styles.gradeText, { color: mark.fg }]}>{grade || '—'}</Text>
      </View>
    </View>
  );
});

export default function GradesScreen({ subject, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);

  const load = useCallback(async () => {
    if (!subject?.url) {
      setLoading(false);
      return;
    }
    try {
      const result = await fetchGrades(subject.url);
      setLessons(result.data || []);
      setFromCache(result.fromCache || false);
      setCacheAge(result.cacheAge ?? null);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось загрузить оценки');
    } finally {
      setLoading(false);
    }
  }, [subject]);

  useEffect(() => { load(); }, [load]);

  const average = useMemo(() => {
    const nums = lessons
      .map((l) => parseInt(String(l.grade).trim(), 10))
      .filter((n) => n >= 2 && n <= 5);
    if (!nums.length) return '—';
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2).replace('.', ',');
  }, [lessons]);

  const graded = lessons.filter((l) => {
    const n = parseInt(String(l.grade).trim(), 10);
    return n >= 2 && n <= 5;
  }).length;

  const stats = [
    { label: 'Средний балл', value: average, accent: true },
    { label: 'Оценок', value: graded },
    { label: 'Занятий', value: lessons.length },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} activeOpacity={0.7}>
          <Chevron direction="left" size={7} color={colors.text2} />
          <Text style={styles.backText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{subject?.name || 'Оценки'}</Text>
        {subject?.teacher ? <Text style={styles.subtitle}>{subject.teacher}</Text> : null}
      </View>

      <View style={styles.block}>
        <StatStrip items={stats} />
      </View>

      <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка</Text>
        </View>
      ) : (
        <FlashList
          data={lessons}
          renderItem={({ item, index }) => (
            <GradeItem
              item={item}
              first={index === 0}
              last={index === lessons.length - 1}
            />
          )}
          estimatedItemSize={68}
          keyExtractor={(item, i) => `${item.date || ''}-${i}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={(
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Оценок пока нет</Text>
              <Text style={styles.emptyText}>По этому предмету ещё не выставляли оценки</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: layout.page, paddingTop: layout.top, paddingBottom: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 10, marginBottom: 8 },
  backText: { color: colors.text2, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  title: { color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  block: { paddingHorizontal: layout.page, marginBottom: 12 },

  listContent: { paddingHorizontal: layout.page, paddingTop: 12, paddingBottom: 32 },
  row: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  info: { flex: 1 },
  theme: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  date: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: colors.text2, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4, textAlign: 'center' },
});
