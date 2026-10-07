import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WINDOW_MS = 5 * 60 * 1000;

function parseTime(time) {
  const m = String(time || '').match(/(\d{1,2})\D+(\d{2})/);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

// Ближайшая предстоящая пара с её точным временем начала.
function findNext(schedule, nowMs) {
  if (!Array.isArray(schedule)) return null;
  const now = new Date(nowMs);
  const today = Math.min(Math.max(now.getDay() - 1, 0), 5);
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (today + offset) % 6;
    const lessons = [...(schedule[index]?.lessons || [])]
      .map((lesson) => {
        const t = parseTime(lesson.time);
        if (!t) return null;
        const start = new Date(now);
        start.setDate(now.getDate() + offset);
        start.setHours(t.h, t.m, 0, 0);
        return { lesson, start, day: DAYS[index], offset };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
    for (const item of lessons) {
      if (item.start.getTime() > nowMs) return item;
    }
  }
  return null;
}

export default function LessonCountdown({ schedule, enabled = true }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  const next = useMemo(() => (enabled ? findNext(schedule, now) : null), [schedule, enabled, now]);

  if (!next) return null;
  const diff = next.start.getTime() - now;
  if (diff <= 0 || diff > WINDOW_MS) return null;

  const total = Math.floor(diff / 1000);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');

  return (
    <View style={styles.banner}>
      <View style={styles.pulse}>
        <View style={styles.dot} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>ПАРА НАЧНЁТСЯ ЧЕРЕЗ</Text>
        <Text style={styles.timer}>{mm}:{ss}</Text>
        <Text style={styles.subject} numberOfLines={1}>{next.lesson.subject || 'Занятие'}</Text>
        <Text style={styles.meta}>
          {next.day} · {next.lesson.time}{next.lesson.room ? ` · каб. ${next.lesson.room}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 18, backgroundColor: '#12324a',
    borderWidth: 1, borderColor: '#2b6f9e',
  },
  pulse: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4fc3f722', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4fc3f7' },
  body: { flex: 1 },
  label: { color: '#9fd8ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  timer: { color: '#ffffff', fontSize: 30, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] },
  subject: { color: '#e8f4fd', fontSize: 14, fontWeight: '700', marginTop: 2 },
  meta: { color: '#8ab6d6', fontSize: 11, marginTop: 3 },
});
