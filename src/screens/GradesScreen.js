import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { fetchGrades } from '../services/subjectsService';
import { notifyNewGrades } from '../services/notificationService';
import OfflineBanner from '../components/OfflineBanner';

const GradeItem = React.memo(({ item }) => {
  const grade = String(item.grade ?? '').trim();
  const numeric = parseInt(grade, 10);
  const isBad = grade === '2' || grade === 'н/я' || grade === 'н';
  const isGood = numeric >= 4;
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.theme}>{item.theme || 'Занятие'}</Text>
        <Text style={styles.date}>{item.date || 'Дата не указана'}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isBad ? '#ef5350' : isGood ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.gradeText}>{grade || '—'}</Text>
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
      if (!result.fromCache) {
        notifyNewGrades(subject.url, subject.name, result.data || []).catch(() => {});
      }
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
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
  }, [lessons]);

  const graded = lessons.filter((l) => {
    const n = parseInt(String(l.grade).trim(), 10);
    return n >= 2 && n <= 5;
  }).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backText}>‹ Назад</Text></TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{subject?.name || 'Оценки'}</Text>
        {subject?.teacher ? <Text style={styles.subtitle}>{subject.teacher}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{average}</Text><Text style={styles.statLabel}>СРЕДНИЙ БАЛЛ</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{graded}</Text><Text style={styles.statLabel}>ОЦЕНОК</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{lessons.length}</Text><Text style={styles.statLabel}>ЗАНЯТИЙ</Text></View>
      </View>

      <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4fc3f7" /><Text style={styles.loadingText}>Загружаем оценки...</Text></View>
      ) : (
        <FlashList
          data={lessons}
          renderItem={({ item }) => <GradeItem item={item} />}
          estimatedItemSize={76}
          keyExtractor={(item, i) => `${item.date || ''}-${i}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>Оценок пока нет</Text><Text style={styles.emptyText}>По этому предмету ещё не выставляли оценки.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 10, marginBottom: 6 },
  backText: { color: '#4fc3f7', fontSize: 15, fontWeight: '700' },
  title: { color: '#e8f4fd', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  subtitle: { color: '#8a9bb0', fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#132233', borderRadius: 14, borderWidth: 1, borderColor: '#1e3a4f', padding: 13 },
  statValue: { color: '#4fc3f7', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#71859b', fontSize: 9, fontWeight: '700', marginTop: 4 },
  listContent: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  card: { backgroundColor: '#132233', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 13, marginBottom: 8, borderWidth: 1, borderColor: '#1e3a4f' },
  info: { flex: 1, marginRight: 10 },
  theme: { fontSize: 14, fontWeight: '700', color: '#e8f4fd', lineHeight: 19 },
  date: { fontSize: 11, color: '#8a9bb0', marginTop: 5 },
  badge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gradeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { color: '#8a9bb0', marginTop: 12, fontSize: 14 },
  emptyTitle: { color: '#c8ddf0', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#71859b', fontSize: 12, marginTop: 5, textAlign: 'center' },
});
