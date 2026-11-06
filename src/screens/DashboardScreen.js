import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSubjects, fetchGrades } from '../services/subjectsService';
import { fetchSchedule } from '../services/scheduleService';
import OfflineBanner from '../components/OfflineBanner';
import StatStrip from '../components/StatStrip';
import Chevron from '../components/Chevron';
import { colors, layout, radius } from '../theme';

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

function formatAverage(value) {
  if (value == null || value === '') return '—';
  return String(value).replace('.', ',');
}

export default function DashboardScreen({ onOpenGrades, onOpenRecordBook, onOpenSchedule, onOpenSettings }) {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [avg, setAvg] = useState(null);
  const [gradeCount, setGradeCount] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [group, groupNameValue] = await Promise.all([
      AsyncStorage.getItem('savedGroupId'),
      AsyncStorage.getItem('savedGroupName'),
    ]);
    setGroupName(groupNameValue || 'Группа не выбрана');

    // Fetch the day and subjects together. Do not hold the whole home screen
    // behind up to 12 separate grade-page requests; fill statistics afterwards.
    const scheduleTask = group
      ? fetchSchedule(group, 0).then((result) => {
          setSchedule(result.data || []);
          if (result.fromCache) {
            setFromCache(true);
            setCacheAge(result.cacheAge ?? null);
          }
        }).catch(() => {}).finally(() => setLoading(false))
      : Promise.resolve().finally(() => setLoading(false));

    const subjectsTask = fetchSubjects().then(async (subjectsResult) => {
      const subjectList = subjectsResult.data || [];
      setSubjects(subjectList);
      setFromCache((current) => current || Boolean(subjectsResult.fromCache));
      if (subjectsResult.fromCache) setCacheAge(subjectsResult.cacheAge ?? null);

      const results = await Promise.allSettled(subjectList.slice(0, 12).map((subject) => fetchGrades(subject.url)));
      let sum = 0;
      let count = 0;
      results.forEach((result) => {
        if (result.status !== 'fulfilled') return;
        (result.value.data || []).forEach((lesson) => {
          const number = parseInt(lesson.grade, 10);
          if (number >= 2 && number <= 5) { sum += number; count += 1; }
        });
      });
      setGradeCount(count);
      setAvg(count ? (sum / count).toFixed(2) : null);
    }).catch(() => {});

    await Promise.allSettled([scheduleTask, subjectsTask]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const next = getNextLesson(schedule);
  const todayLessons = schedule
    ? (schedule[Math.min(Math.max(new Date().getDay() - 1, 0), 5)]?.lessons || [])
    : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loading}>Загрузка</Text>
      </View>
    );
  }

  const stats = [
    { label: 'Средний балл', value: formatAverage(avg), accent: true },
    { label: 'Оценок', value: gradeCount == null ? '—' : gradeCount },
    { label: 'Предметов', value: subjects.length },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Главная</Text>
          <Text style={styles.group}>{groupName}</Text>
        </View>

        <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

        <View style={styles.page}>
          <TouchableOpacity style={styles.hero} onPress={onOpenSchedule} activeOpacity={0.85}>
            <View style={styles.heroRule} />
            <Text style={styles.heroLabel}>
              {next ? (next.offset === 0 ? 'Следующая пара' : 'Ближайшая пара') : 'Расписание'}
            </Text>
            {next ? (
              <>
                <Text style={styles.heroTitle} numberOfLines={2}>{next.lesson.subject || 'Занятие'}</Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {[next.lesson.time, next.day, next.lesson.room ? `каб. ${next.lesson.room}` : ''].filter(Boolean).join(' · ')}
                </Text>
              </>
            ) : (
              <Text style={styles.heroEmpty}>
                {schedule
                  ? 'На ближайшие дни пар нет'
                  : groupName === 'Группа не выбрана'
                    ? 'Выберите группу в расписании'
                    : 'Расписание пока не загрузилось'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.block}>
            <StatStrip items={stats} />
          </View>

          <TouchableOpacity style={styles.bookRow} onPress={onOpenRecordBook} activeOpacity={0.85}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Зачётная книжка</Text>
              <Text style={styles.rowMeta}>Итоговые оценки по семестрам</Text>
            </View>
            <Chevron direction="right" size={7} />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Сегодня</Text>
            <TouchableOpacity style={styles.link} onPress={onOpenSchedule} activeOpacity={0.7}>
              <Text style={styles.linkText}>Вся неделя</Text>
              <Chevron direction="right" size={6} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {todayLessons === null ? (
            <TouchableOpacity style={styles.emptyCard} onPress={onOpenSchedule} activeOpacity={0.85}>
              <Text style={styles.emptyTitle}>Расписание пока не загрузилось</Text>
              <Text style={styles.emptyText}>Откройте расписание и обновите данные</Text>
            </TouchableOpacity>
          ) : todayLessons.length ? (
            <View style={styles.list}>
              {todayLessons.slice(0, 4).map((lesson, i) => (
                <TouchableOpacity
                  key={`${lesson.time}-${i}`}
                  style={[styles.lessonRow, i > 0 && styles.rowDivider]}
                  onPress={onOpenSchedule}
                  activeOpacity={0.8}
                >
                  <View style={styles.timeCol}>
                    <Text style={styles.lessonTime}>{lesson.time || '—'}</Text>
                    {lesson.num ? <Text style={styles.lessonNum}>Пара {lesson.num}</Text> : null}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.lessonName} numberOfLines={1}>{lesson.subject || 'Занятие'}</Text>
                    <Text style={styles.lessonMeta} numberOfLines={1}>
                      {[lesson.room ? `каб. ${lesson.room}` : '', lesson.teacher].filter(Boolean).join(' · ') || 'Аудитория не указана'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>На сегодня пар нет</Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Быстрые действия</Text>
          </View>

          <View style={styles.list}>
            <TouchableOpacity style={styles.actionRow} onPress={onOpenGrades} activeOpacity={0.8}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Оценки</Text>
                <Text style={styles.rowMeta}>Предметы и успеваемость</Text>
              </View>
              <Chevron direction="right" size={7} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionRow, styles.rowDivider]} onPress={onOpenSchedule} activeOpacity={0.8}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Расписание</Text>
                <Text style={styles.rowMeta}>Неделя и пары</Text>
              </View>
              <Chevron direction="right" size={7} />
            </TouchableOpacity>
          </View>

          {cacheAge != null ? <Text style={styles.updated}>Данные обновлены {formatCache(cacheAge)}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loading: { color: colors.muted, fontSize: 13, marginTop: 12 },

  header: { paddingHorizontal: layout.page, paddingTop: layout.top, paddingBottom: 16 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '600' },
  group: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },

  page: { paddingHorizontal: layout.page },
  block: { marginTop: 12 },

  hero: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  heroRule: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  heroLabel: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  heroTitle: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '600', marginTop: 6 },
  heroMeta: {
    color: colors.text2,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  heroEmpty: { color: colors.text2, fontSize: 15, lineHeight: 21, marginTop: 6 },

  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  rowMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  linkText: { color: colors.accent, fontSize: 13, lineHeight: 17, fontWeight: '500' },

  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeCol: { width: 72 },
  lessonTime: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  lessonNum: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  lessonName: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  lessonMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },

  emptyCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { color: colors.text2, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  updated: { color: colors.muted, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 24 },
});
