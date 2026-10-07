import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSubjects, fetchGrades } from '../services/subjectsService';
import { fetchSchedule } from '../services/scheduleService';
import { syncLessonReminders } from '../services/notificationService';
import { loadTasks, nextDeadline, daysUntil } from '../services/tasksService';
import LessonCountdown from '../components/LessonCountdown';
import OfflineBanner from '../components/OfflineBanner';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function parseMinutes(time) {
  const m = String(time || '').match(/(\d{1,2})\D+(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
}

function getNextLesson(schedule) {
  if (!Array.isArray(schedule)) return null;
  const now = new Date();
  const today = Math.min(Math.max(now.getDay() - 1, 0), 5);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (today + offset) % 6;
    const lessons = [...(schedule[index]?.lessons || [])].sort((a, b) => parseMinutes(a.time) - parseMinutes(b.time));
    for (const lesson of lessons) {
      if (offset > 0 || parseMinutes(lesson.time) >= currentMinutes) {
        return { lesson, day: DAYS[index], offset };
      }
    }
  }
  return null;
}

function formatCache(age) {
  if (age == null) return '';
  if (age < 60) return `${age} мин. назад`;
  return `${Math.floor(age / 60)} ч. назад`;
}

export default function DashboardScreen({ onOpenGrades, onOpenSchedule, onOpenSettings, onOpenTasks }) {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [avg, setAvg] = useState(null);
  const [gradeCount, setGradeCount] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [subjectsResult, group, groupNameValue] = await Promise.all([
        fetchSubjects(),
        AsyncStorage.getItem('savedGroupId'),
        AsyncStorage.getItem('savedGroupName'),
      ]);
      setSubjects(subjectsResult.data || []);
      setGroupName(groupNameValue || 'Группа не выбрана');
      setFromCache(Boolean(subjectsResult.fromCache));
      setCacheAge(subjectsResult.cacheAge ?? null);
      setTasks(await loadTasks());

      if (group) {
        const scheduleResult = await fetchSchedule(group, 0);
        setSchedule(scheduleResult.data || []);
        if (scheduleResult.fromCache) {
          setFromCache(true);
          setCacheAge(scheduleResult.cacheAge ?? cacheAge);
        }
      }

      const results = await Promise.allSettled((subjectsResult.data || []).slice(0, 12).map(s => fetchGrades(s.url)));
      let sum = 0;
      let count = 0;
      results.forEach(r => {
        if (r.status !== 'fulfilled') return;
        (r.value.data || []).forEach(l => {
          const n = parseInt(l.grade, 10);
          if (n >= 2 && n <= 5) { sum += n; count += 1; }
        });
      });
      setGradeCount(count);
      setAvg(count ? (sum / count).toFixed(2) : null);
    } catch (e) {
      // Отдельные блоки экрана могут работать даже если сеть недоступна.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const next = getNextLesson(schedule);
  const todayLessons = schedule?.[Math.min(Math.max(new Date().getDay() - 1, 0), 5)]?.lessons || [];

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4fc3f7" /><Text style={styles.loading}>Собираем ваш день...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4fc3f7" />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>УУСТР</Text>
            <Text style={styles.title}>Главная</Text>
            <Text style={styles.group}>{groupName}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}><Text style={styles.settingsIcon}>⚙</Text></TouchableOpacity>
        </View>

        <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

        <LessonCountdown schedule={schedule} />

        <TouchableOpacity style={styles.hero} onPress={onOpenSchedule} activeOpacity={0.85}>
          <Text style={styles.heroLabel}>{next?.offset === 0 ? 'СЛЕДУЮЩАЯ ПАРА' : 'БЛИЖАЙШАЯ ПАРА'}</Text>
          {next ? (
            <>
              <Text style={styles.heroTitle} numberOfLines={2}>{next.lesson.subject || 'Занятие'}</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroTime}>{next.day} · {next.lesson.time}</Text>
                {next.lesson.room ? <Text style={styles.heroRoom}>Каб. {next.lesson.room}</Text> : null}
              </View>
            </>
          ) : <Text style={styles.heroTitle}>На ближайшие дни занятий нет</Text>}
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={onOpenGrades}>
            <Text style={styles.statValue}>{avg || '—'}</Text>
            <Text style={styles.statLabel}>СРЕДНИЙ БАЛЛ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={onOpenGrades}>
            <Text style={styles.statValue}>{gradeCount}</Text>
            <Text style={styles.statLabel}>ОЦЕНОК</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={onOpenGrades}>
            <Text style={styles.statValue}>{subjects.length}</Text>
            <Text style={styles.statLabel}>ПРЕДМЕТОВ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Сегодня</Text><TouchableOpacity onPress={onOpenSchedule}><Text style={styles.more}>Все →</Text></TouchableOpacity></View>
        {todayLessons.length ? todayLessons.slice(0, 4).map((lesson, i) => (
          <TouchableOpacity key={`${lesson.time}-${i}`} style={styles.lessonRow} onPress={onOpenSchedule}>
            <View style={styles.timeCol}><Text style={styles.lessonTime}>{lesson.time || '—'}</Text><Text style={styles.lessonNum}>Пара {lesson.num || i + 1}</Text></View>
            <View style={styles.lessonInfo}><Text style={styles.lessonName} numberOfLines={1}>{lesson.subject || 'Занятие'}</Text><Text style={styles.lessonMeta}>{lesson.room ? `Каб. ${lesson.room}` : 'Аудитория не указана'}{lesson.teacher ? ` · ${lesson.teacher}` : ''}</Text></View>
          </TouchableOpacity>
        )) : <View style={styles.empty}><Text style={styles.emptyTitle}>Свободный день</Text><Text style={styles.emptyText}>Можно выдохнуть и закрыть хвосты.</Text></View>}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Задачи</Text><TouchableOpacity onPress={onOpenTasks}><Text style={styles.more}>Все →</Text></TouchableOpacity></View>
        {(tasks.filter((t) => !t.done).length || nextDeadline(tasks)) ? (
          <TouchableOpacity style={styles.lessonRow} onPress={onOpenTasks}>
            <View style={styles.timeCol}>
              <Text style={styles.lessonTime}>{tasks.filter((t) => !t.done).length}</Text>
              <Text style={styles.lessonNum}>в работе</Text>
            </View>
            <View style={styles.lessonInfo}>
              {nextDeadline(tasks) ? (
                <>
                  <Text style={styles.lessonName} numberOfLines={1}>{nextDeadline(tasks).title}</Text>
                  <Text style={styles.lessonMeta}>
                    Ближайший дедлайн: {nextDeadline(tasks).due} ({daysUntil(nextDeadline(tasks).due)} дн.)
                  </Text>
                </>
              ) : (
                <Text style={styles.lessonMeta}>Дедлайнов нет</Text>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Задач нет</Text>
            <Text style={styles.emptyText}>Добавьте дедлайны, чтобы не забыть.</Text>
          </View>
        )}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Быстрые действия</Text></View>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={onOpenGrades}><Text style={styles.quickIcon}>★</Text><Text style={styles.quickTitle}>Оценки</Text><Text style={styles.quickText}>Предметы и успеваемость</Text></TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={onOpenSchedule}><Text style={styles.quickIcon}>▦</Text><Text style={styles.quickTitle}>Расписание</Text><Text style={styles.quickText}>Неделя и пары</Text></TouchableOpacity>
        </View>
        {cacheAge != null && <Text style={styles.updated}>Данные обновлены {formatCache(cacheAge)}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  content: { paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1b2a' },
  loading: { color: '#8a9bb0', marginTop: 12 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#4fc3f7', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#e8f4fd', fontSize: 30, fontWeight: '800', marginTop: 2 },
  group: { color: '#8a9bb0', fontSize: 13, marginTop: 3 },
  settingsButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#132233', borderWidth: 1, borderColor: '#1e3a4f', alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { color: '#c8ddf0', fontSize: 21 },
  hero: { marginHorizontal: 16, padding: 20, borderRadius: 20, backgroundColor: '#1565c0', marginBottom: 12 },
  heroLabel: { color: '#b9e6ff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 8, lineHeight: 27 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  heroTime: { color: '#e8f4fd', fontSize: 13, fontWeight: '700' },
  heroRoom: { color: '#b9e6ff', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  statCard: { flex: 1, backgroundColor: '#132233', borderRadius: 15, borderWidth: 1, borderColor: '#1e3a4f', padding: 14 },
  statValue: { color: '#4fc3f7', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#71859b', fontSize: 9, fontWeight: '700', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: '#e8f4fd', fontSize: 18, fontWeight: '800' },
  more: { color: '#4fc3f7', fontSize: 13, fontWeight: '700' },
  lessonRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#132233', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e3a4f' },
  timeCol: { width: 68 },
  lessonTime: { color: '#4fc3f7', fontSize: 14, fontWeight: '800' },
  lessonNum: { color: '#71859b', fontSize: 10, marginTop: 3 },
  lessonInfo: { flex: 1 },
  lessonName: { color: '#e8f4fd', fontSize: 14, fontWeight: '700' },
  lessonMeta: { color: '#8a9bb0', fontSize: 11, marginTop: 5 },
  empty: { marginHorizontal: 16, padding: 18, backgroundColor: '#132233', borderRadius: 14, borderWidth: 1, borderColor: '#1e3a4f' },
  emptyTitle: { color: '#c8ddf0', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#71859b', marginTop: 4, fontSize: 12 },
  quickGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  quickCard: { flex: 1, padding: 16, borderRadius: 15, backgroundColor: '#132233', borderWidth: 1, borderColor: '#1e3a4f' },
  quickIcon: { color: '#4fc3f7', fontSize: 20, fontWeight: '800' },
  quickTitle: { color: '#e8f4fd', fontSize: 14, fontWeight: '800', marginTop: 9 },
  quickText: { color: '#71859b', fontSize: 11, marginTop: 3 },
  updated: { color: '#566b80', fontSize: 10, textAlign: 'center', marginTop: 20 },
});
