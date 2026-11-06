import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchRecordBook } from '../services/recordBookService';
import OfflineBanner from '../components/OfflineBanner';
import StatStrip from '../components/StatStrip';
import { colors, layout, radius } from '../theme';

function plural(count, one, few, many) {
  const tail = Math.abs(count) % 100;
  const last = tail % 10;
  if (tail > 10 && tail < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function shortGrade(value) {
  const grade = String(value || '').trim();
  const lower = grade.toLowerCase().replace('ё', 'е');
  if (!grade) return '';
  if (lower === 'зачтено' || lower === 'зачет') return 'Зачёт';
  if (lower === 'не зачтено' || lower === 'не зачет') return 'Незач.';
  if (lower === 'н/я' || lower === 'н.я.' || lower === 'неявка') return 'Н/Я';
  return grade;
}

function markColors(value, isAverage) {
  const grade = String(value || '').trim().toLowerCase().replace('ё', 'е');
  if (isAverage) return { bg: colors.accentSoft, fg: colors.accent, border: 'rgba(217, 164, 91, 0.35)' };
  if (!grade) return { bg: colors.raised, fg: colors.muted, border: colors.line };
  if (grade === '2' || grade === 'неудовлетворительно' || grade === 'неуд.' || grade.includes('не зач') || grade === 'н/я' || grade === 'неявка') {
    return { bg: colors.badSoft, fg: colors.bad, border: 'rgba(207, 127, 114, 0.35)' };
  }
  if (grade === '5' || grade === '4' || grade === 'отлично' || grade === 'хорошо') {
    return { bg: colors.goodSoft, fg: colors.good, border: 'rgba(143, 174, 120, 0.35)' };
  }
  if (grade === '3' || grade === 'удовлетворительно') {
    return { bg: colors.warnSoft, fg: colors.warn, border: 'rgba(201, 162, 94, 0.35)' };
  }
  if (grade.includes('зач')) {
    return { bg: colors.accentSoft, fg: colors.accent, border: 'rgba(217, 164, 91, 0.35)' };
  }
  return { bg: colors.raised, fg: colors.text2, border: colors.line };
}

function semesterStats(disciplines) {
  const numbers = disciplines
    .map((item) => item.numericGrade ?? parseFloat(String(item.average || item.grade || '').replace(',', '.')))
    .filter((number) => Number.isFinite(number) && number >= 2 && number <= 5);
  return {
    count: disciplines.length,
    average: numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : null,
  };
}

function DisciplineRow({ item, last }) {
  const display = shortGrade(item.grade);
  const isAverage = !display && Boolean(item.average);
  const mark = markColors(display || item.average, isAverage);
  const meta = [item.control, item.teacher].filter(Boolean).join(' · ');
  const details = [
    item.credits ? `${item.credits} з.е.` : '',
    item.hours ? `${item.hours} ч.` : '',
    item.date || '',
  ].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        {meta ? <Text style={styles.rowMeta} numberOfLines={2}>{meta}</Text> : null}
        {details ? <Text style={styles.rowDetails} numberOfLines={1}>{details}</Text> : null}
      </View>
      <View style={[styles.mark, { backgroundColor: mark.bg, borderColor: mark.border }]}>
        <Text style={[styles.markText, { color: mark.fg }]} numberOfLines={1}>{display || item.average || '—'}</Text>
        {isAverage ? <Text style={styles.markNote}>ср.</Text> : null}
      </View>
    </View>
  );
}

export default function RecordBookScreen({ onLogout }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  const [source, setSource] = useState('lk');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await fetchRecordBook();
      setRecord(result.data);
      setFromCache(result.fromCache || false);
      setCacheAge(result.cacheAge ?? null);
      setSource(result.source || result.data?.source || 'lk');
      setError('');
    } catch (e) {
      if (e.message === 'auth') {
        if (onLogout) onLogout();
        return;
      }
      setError(e.message || 'Не удалось загрузить зачётную книжку');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  const semesters = record?.semesters || [];
  const student = record?.student || {};
  const summary = record?.summary || {};
  const subtitle = useMemo(() => {
    const parts = [student.group, student.recordBook ? `№ ${student.recordBook}` : ''].filter(Boolean);
    return parts.join(' · ');
  }, [student.group, student.recordBook]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Загрузка</Text>
      </View>
    );
  }

  if (error && !record) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Зачётка не открылась</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }} activeOpacity={0.85}>
          <Text style={styles.retryText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const average = summary.average != null
    ? Number(summary.average).toFixed(2).replace('.', ',')
    : '—';
  const total = summary.total ?? semesters.reduce((sum, item) => sum + item.disciplines.length, 0);
  const rating = summary.rating != null ? Number(summary.rating).toLocaleString('ru-RU') : '—';
  const stats = [
    { label: 'Средний балл', value: average, accent: true },
    { label: 'Дисциплин', value: total },
    { label: 'Рейтинг', value: rating },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Зачётная книжка</Text>
          <Text style={styles.headerSub}>{subtitle || 'УУСТР'}</Text>
        </View>

        <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

        <View style={styles.page}>
          {(student.name || student.faculty) ? (
            <View style={styles.studentCard}>
              {student.name ? <Text style={styles.studentName}>{student.name}</Text> : null}
              {student.faculty ? <Text style={styles.studentFaculty}>{student.faculty}</Text> : null}
            </View>
          ) : null}

          <StatStrip items={stats} />

          {summary.averageSource === 'calculated' && summary.average != null ? (
            <Text style={styles.noteSmall}>Средний балл рассчитан по числовым оценкам</Text>
          ) : null}

          {source === 'journal' ? (
            <View style={styles.note}>
              <Text style={styles.noteText}>Собрано из журнала. Итоговые оценки могут отличаться от личного кабинета.</Text>
            </View>
          ) : null}

          {semesters.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Пока пусто</Text>
              <Text style={styles.emptyText}>Оценки появятся здесь, когда их выставят в личном кабинете</Text>
            </View>
          ) : semesters.map((semester) => {
            const statsForSemester = semesterStats(semester.disciplines);
            return (
              <View key={semester.title} style={styles.semester}>
                <View style={styles.semHeader}>
                  <Text style={styles.semTitle}>{semester.title}</Text>
                  <Text style={styles.semMeta} numberOfLines={1}>
                    {statsForSemester.count} {plural(statsForSemester.count, 'дисциплина', 'дисциплины', 'дисциплин')}
                    {statsForSemester.average != null ? ` · ср. ${statsForSemester.average.toFixed(2).replace('.', ',')}` : ''}
                  </Text>
                </View>
                <View style={styles.semBody}>
                  {semester.disciplines.map((item, index) => (
                    <DisciplineRow
                      key={`${item.name}-${index}`}
                      item={item}
                      last={index === semester.disciplines.length - 1}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          <Text style={styles.footer}>Официальная выписка · account.str.uust.ru</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 },
  errorTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  errorText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  retry: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  retryText: { color: colors.onAccent, fontSize: 14, fontWeight: '600' },

  header: { paddingHorizontal: layout.page, paddingTop: layout.top, paddingBottom: 16 },
  headerTitle: { color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: '600' },
  headerSub: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  page: { paddingHorizontal: layout.page, paddingTop: 16 },
  studentCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  studentName: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  studentFaculty: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  noteSmall: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 8 },
  note: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 94, 0.3)',
  },
  noteText: { color: colors.warn, fontSize: 11, lineHeight: 16 },

  empty: {
    marginTop: 12,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { color: colors.text2, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },

  semester: { marginTop: 24 },
  semHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  semTitle: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  semMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, flexShrink: 1, textAlign: 'right' },
  semBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowInfo: { flex: 1 },
  rowName: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  rowMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  rowDetails: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },

  mark: {
    minWidth: 52,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  markNote: { color: colors.muted, fontSize: 9, lineHeight: 11, marginTop: 1 },

  footer: { color: colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 24 },
});
