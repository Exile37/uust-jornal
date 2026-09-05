import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { fetchGrades } from '../services/subjectsService';
import OfflineBanner from '../components/OfflineBanner';

function gradeColor(grade) {
  if (!grade || grade === '-') return '#8a9bb0';
  const n = parseInt(grade);
  if (n >= 5) return '#66bb6a';
  if (n === 4) return '#29b6f6';
  if (n === 3) return '#ffa726';
  if (n <= 2) return '#ef5350';
  return '#8a9bb0';
}

function gradeLabel(avg) {
  if (!avg) return null;
  const n = parseFloat(avg);
  if (n >= 4.5) return { text: 'Отлично', color: '#66bb6a' };
  if (n >= 3.5) return { text: 'Хорошо', color: '#29b6f6' };
  if (n >= 2.5) return { text: 'Удовл.', color: '#ffa726' };
  return { text: 'Неудовл.', color: '#ef5350' };
}

function StatBar({ grade, count, maxCount }) {
  const color = gradeColor(String(grade));
  const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <View style={statStyles.row}>
      <Text style={[statStyles.gradeNum, { color }]}>{grade}</Text>
      <View style={statStyles.barBg}>
        <View style={[statStyles.barFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
      <Text style={statStyles.count}>{count}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  gradeNum: { width: 16, fontSize: 13, fontWeight: '700', marginRight: 8 },
  barBg: { flex: 1, height: 8, backgroundColor: '#1e3a4f', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, minWidth: 6 },
  count: { width: 24, textAlign: 'right', color: '#8a9bb0', fontSize: 12, marginLeft: 8 },
});

function StatsPanel({ lessons, avg }) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0 };
  for (const l of lessons) {
    const n = parseInt(l.grade);
    if (n >= 2 && n <= 5) counts[n]++;
  }
  const maxCount = Math.max(...Object.values(counts));
  const label = gradeLabel(avg);

  return (
    <View style={styles.statsPanel}>
      <View style={styles.statsLeft}>
        <Text style={[styles.avgBig, { color: gradeColor(avg) }]}>{avg || '—'}</Text>
        <Text style={styles.avgLabel}>СРЕДНИЙ БАЛЛ</Text>
        {label && (
          <View style={[styles.labelBadge, { backgroundColor: label.color + '22', borderColor: label.color }]}>
            <Text style={[styles.labelText, { color: label.color }]}>{label.text}</Text>
          </View>
        )}
      </View>
      <View style={styles.statsRight}>
        {[5, 4, 3, 2].map(g => (
          <StatBar key={g} grade={g} count={counts[g]} maxCount={maxCount} />
        ))}
      </View>
    </View>
  );
}

function GradeCell({ grade }) {
  const color = gradeColor(grade);
  const hasGrade = grade && grade !== '-';
  return (
    <View style={[styles.gradeBox, hasGrade && { borderColor: color }]}>
      <Text style={[styles.gradeText, { color }]}>{grade || '—'}</Text>
    </View>
  );
}

function renderItem({ item, index }) {
  return (
    <View style={[styles.row, index % 2 === 0 && styles.rowAlt]}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.theme} numberOfLines={2}>{item.theme}</Text>
      <GradeCell grade={item.grade} />
    </View>
  );
}

export default function GradesScreen({ subject, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);

  useEffect(() => {
    fetchGrades(subject.url)
      .then((result) => {
        setLessons(result.data);
        setFromCache(result.fromCache || false);
        setCacheAge(result.cacheAge || null);
      })
      .catch((e) => Alert.alert('Ошибка', e.message))
      .finally(() => setLoading(false));
  }, [subject.url]);

  const graded = lessons.filter((l) => l.grade && l.grade !== '-' && !isNaN(parseInt(l.grade)));
  const avg = graded.length > 0
    ? (graded.reduce((s, l) => s + parseInt(l.grade), 0) / graded.length).toFixed(2)
    : null;
  const nextGrade = avg && parseFloat(avg) < 4.5
    ? Math.ceil((4.5 * (graded.length + 1)) - graded.reduce((s, l) => s + parseInt(l.grade), 0))
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>{subject.name}</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.teacherText}>{subject.teacher}</Text>
      </View>

      <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4fc3f7" />
          <Text style={styles.loadingText}>Загружаем оценки...</Text>
        </View>
      ) : lessons.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Занятия не найдены</Text>
        </View>
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <StatsPanel lessons={lessons} avg={avg} />
              {nextGrade != null && nextGrade >= 2 && nextGrade <= 5 && (
                <View style={styles.goalCard}>
                  <Text style={styles.goalTitle}>Цель: средний 4.5</Text>
                  <Text style={styles.goalText}>Следующая оценка для выхода на 4.5: <Text style={styles.goalStrong}>{nextGrade}</Text></Text>
                </View>
              )}
              <View style={styles.tableHeader}>
                <Text style={[styles.colDate, styles.colHeaderText]}>ДАТА</Text>
                <Text style={[styles.colTheme, styles.colHeaderText]}>ТЕМА ЗАНЯТИЯ</Text>
                <Text style={[styles.colGrade, styles.colHeaderText]}>ОЦ.</Text>
              </View>
            </>
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#132233', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  backBtn: { marginBottom: 8 },
  backText: { color: '#4fc3f7', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#e8f4fd', lineHeight: 24 },
  subHeader: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#0f2030', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  teacherText: { color: '#8a9bb0', fontSize: 13 },

  statsPanel: {
    flexDirection: 'row', padding: 20,
    backgroundColor: '#132233', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  statsLeft: { alignItems: 'center', justifyContent: 'center', marginRight: 20, width: 90 },
  avgBig: { fontSize: 44, fontWeight: '900', lineHeight: 50 },
  avgLabel: { color: '#8a9bb0', fontSize: 10, letterSpacing: 1, marginTop: 2, marginBottom: 8 },
  labelBadge: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  labelText: { fontSize: 12, fontWeight: '700' },
  statsRight: { flex: 1, justifyContent: 'center' },

  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#0f2030', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  colHeaderText: { color: '#4fc3f7', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  goalCard: { marginHorizontal: 16, marginTop: 10, marginBottom: 2, padding: 14, borderRadius: 12, backgroundColor: '#102b3e', borderWidth: 1, borderColor: '#1e4d67' },
  goalTitle: { color: '#90caf9', fontSize: 12, fontWeight: '800' },
  goalText: { color: '#8a9bb0', fontSize: 12, marginTop: 4 },
  goalStrong: { color: '#4fc3f7', fontWeight: '900' },
  list: { paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#132233',
  },
  rowAlt: { backgroundColor: '#0f1e2e' },
  date: { width: 72, color: '#8a9bb0', fontSize: 12, marginRight: 8 },
  theme: { flex: 1, color: '#c8ddf0', fontSize: 13, lineHeight: 18, marginRight: 8 },
  gradeBox: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#1e3a4f',
    justifyContent: 'center', alignItems: 'center',
  },
  gradeText: { fontSize: 15, fontWeight: '800' },
  colDate: { width: 72, marginRight: 8 },
  colTheme: { flex: 1, marginRight: 8 },
  colGrade: { width: 36, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8a9bb0', marginTop: 12, fontSize: 14 },
  emptyText: { color: '#8a9bb0', fontSize: 15 },
});
