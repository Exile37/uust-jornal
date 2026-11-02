import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchRecordBook } from '../services/recordBookService';
import OfflineBanner from '../components/OfflineBanner';

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
  if (isAverage) return { bg: '#102a3d', fg: '#4fc3f7', border: '#1b4059' };
  if (!grade) return { bg: '#0f1f2e', fg: '#5c7186', border: '#1e3a4f' };
  if (grade === '2' || grade.includes('не зач') || grade === 'н/я' || grade === 'неявка') {
    return { bg: '#3a1a1d', fg: '#ef5350', border: '#54252b' };
  }
  if (grade === '5' || grade === '4') return { bg: '#1b3324', fg: '#66bb6a', border: '#285034' };
  if (grade === '3') return { bg: '#3a2a12', fg: '#ffb74d', border: '#5a411c' };
  if (grade.includes('зач')) return { bg: '#102a3d', fg: '#4fc3f7', border: '#1b4059' };
  return { bg: '#132233', fg: '#c8ddf0', border: '#1e3a4f' };
}

function semesterStats(disciplines) {
  const numbers = disciplines
    .map((item) => parseFloat(String(item.average || item.grade || '').replace(',', '.')))
    .filter((number) => number >= 2 && number <= 5);
  return {
    count: disciplines.length,
    average: numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : null,
  };
}

function DisciplineRow({ item, last }) {
  const display = shortGrade(item.grade);
  const isAverage = !display && Boolean(item.average);
  const colors = markColors(display || item.average, isAverage);
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
        {details ? <Text style={styles.rowDetails}>{details}</Text> : null}
      </View>
      <View style={[styles.mark, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.markText, { color: colors.fg }]} numberOfLines={1}>{display || item.average || '—'}</Text>
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
        <ActivityIndicator size="large" color="#4fc3f7" />
        <Text style={styles.loadingText}>Открываем зачётную книжку...</Text>
      </View>
    );
  }

  if (error && !record) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Зачётка не открылась</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Попробовать снова</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4fc3f7" />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ЛИЧНЫЙ КАБИНЕТ</Text>
          <Text style={styles.headerTitle}>Зачётная книжка</Text>
          <Text style={styles.headerSub}>{subtitle || 'УУСТР'}</Text>
        </View>

        <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

        {(student.name || student.faculty) ? (
          <View style={styles.studentCard}>
            {student.name ? <Text style={styles.studentName}>{student.name}</Text> : null}
            {student.faculty ? <Text style={styles.studentFaculty}>{student.faculty}</Text> : null}
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.average != null ? summary.average : '—'}</Text>
            <Text style={styles.statLabel}>СРЕДНИЙ БАЛЛ</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.total ?? semesters.reduce((sum, item) => sum + item.disciplines.length, 0)}</Text>
            <Text style={styles.statLabel}>ДИСЦИПЛИН</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, summary.debts > 0 && styles.statValueDanger]}>{summary.debts ?? 0}</Text>
            <Text style={styles.statLabel}>ДОЛГОВ</Text>
          </View>
        </View>

        {source === 'journal' ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>Собрано из журнала. Итоговые оценки могут отличаться от личного кабинета.</Text>
          </View>
        ) : null}

        {semesters.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Пока пусто</Text>
            <Text style={styles.emptyText}>Оценки появятся здесь, когда их выставят в личном кабинете.</Text>
          </View>
        ) : semesters.map((semester) => {
          const stats = semesterStats(semester.disciplines);
          return (
            <View key={semester.title} style={styles.semester}>
              <View style={styles.semHeader}>
                <Text style={styles.semTitle}>{semester.title}</Text>
                <Text style={styles.semMeta}>
                  {stats.count} {plural(stats.count, 'дисциплина', 'дисциплины', 'дисциплин')}
                  {stats.average != null ? ` · ${stats.average.toFixed(2)}` : ''}
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

        <Text style={styles.footer}>Источник: личный кабинет account.str.uust.ru</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#0d1b2a' },
  loadingText: { color: '#8a9bb0', marginTop: 12, fontSize: 14 },
  errorTitle: { color: '#e8f4fd', fontSize: 18, fontWeight: '800' },
  errorText: { color: '#8a9bb0', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  retry: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: '#1565c0' },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  eyebrow: { color: '#4fc3f7', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { color: '#e8f4fd', fontSize: 26, fontWeight: '800', marginTop: 3 },
  headerSub: { color: '#8a9bb0', fontSize: 12, marginTop: 4 },
  studentCard: { marginHorizontal: 16, marginBottom: 10, padding: 15, borderRadius: 15, backgroundColor: '#132233', borderWidth: 1, borderColor: '#1e3a4f' },
  studentName: { color: '#e8f4fd', fontSize: 15, fontWeight: '700' },
  studentFaculty: { color: '#8a9bb0', fontSize: 11, marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#132233', borderRadius: 14, borderWidth: 1, borderColor: '#1e3a4f', padding: 13 },
  statValue: { color: '#4fc3f7', fontSize: 20, fontWeight: '800' },
  statValueDanger: { color: '#ef5350' },
  statLabel: { color: '#71859b', fontSize: 9, fontWeight: '700', marginTop: 4 },
  note: { marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#172a1c', borderWidth: 1, borderColor: '#27452e' },
  noteText: { color: '#8fbf95', fontSize: 11, lineHeight: 16 },
  empty: { marginHorizontal: 16, marginTop: 8, padding: 22, borderRadius: 15, backgroundColor: '#132233', borderWidth: 1, borderColor: '#1e3a4f' },
  emptyTitle: { color: '#c8ddf0', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#71859b', fontSize: 12, marginTop: 5, lineHeight: 18 },
  semester: { marginTop: 8, marginHorizontal: 16 },
  semHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 },
  semTitle: { color: '#e8f4fd', fontSize: 16, fontWeight: '800' },
  semMeta: { color: '#71859b', fontSize: 10, fontWeight: '600' },
  semBody: { backgroundColor: '#132233', borderRadius: 15, borderWidth: 1, borderColor: '#1e3a4f', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#1a2f42' },
  rowInfo: { flex: 1, marginRight: 12 },
  rowName: { color: '#e8f4fd', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  rowMeta: { color: '#8a9bb0', fontSize: 11, marginTop: 4, lineHeight: 15 },
  rowDetails: { color: '#5f7488', fontSize: 10, marginTop: 3 },
  mark: { minWidth: 50, height: 40, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: 13, fontWeight: '800' },
  markNote: { color: '#5f7488', fontSize: 8, fontWeight: '700', marginTop: 1 },
  footer: { color: '#4f6376', fontSize: 10, textAlign: 'center', marginTop: 22 },
});
