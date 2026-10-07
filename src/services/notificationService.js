// =========================
// NOTIFICATION SERVICE
// Локальные уведомления: напоминания о парах и уведомления о новых оценках.
// =========================
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_TAG = 'uust-lesson-reminder';
const GRADE_TAG = 'uust-new-grade';

export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

function parseTime(time) {
  const m = String(time || '').match(/(\d{1,2})\D+(\d{2})/);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

async function cancelByTag(tag) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => n.content?.data?.source === tag);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function cancelAllLessonReminders() {
  await cancelByTag(REMINDER_TAG);
}

export async function setGradeBadge(count) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count | 0));
  } catch (e) {}
}

/**
 * Пересобирает расписание напоминаний. Без запроса разрешения: если пользователь
 * ещё не давал согласия, просто снимает ранее запланированные напоминания.
 */
export async function syncLessonReminders(schedule, minutesBefore, enabled) {
  if (!enabled) {
    await cancelAllLessonReminders();
    return 0;
  }
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') {
    await cancelAllLessonReminders();
    return 0;
  }
  return scheduleLessonReminders(schedule, minutesBefore);
}

// Планирует напоминания на ближайшие 6 дней расписания.
export async function scheduleLessonReminders(schedule, minutesBefore = 30) {
  await cancelAllLessonReminders();
  if (!Array.isArray(schedule) || !schedule.length) return 0;

  const now = new Date();
  const todayIndex = Math.min(Math.max(now.getDay() - 1, 0), 5); // Пн=0 ... Сб=5
  let count = 0;

  for (let offset = 0; offset < 6; offset += 1) {
    const dayIndex = (todayIndex + offset) % 6;
    const day = schedule[dayIndex];
    if (!day?.lessons?.length) continue;

    for (const lesson of day.lessons) {
      const time = parseTime(lesson.time);
      if (!time) continue;

      const triggerDate = new Date(now);
      triggerDate.setDate(now.getDate() + offset);
      triggerDate.setHours(time.h, time.m, 0, 0);
      triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);
      if (triggerDate.getTime() <= now.getTime()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: lesson.subject || 'Занятие',
          body: `Через ${minutesBefore} мин · ${lesson.time}${lesson.room ? ` · Каб. ${lesson.room}` : ''}`,
          data: { source: REMINDER_TAG },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
      count += 1;
    }
  }
  return count;
}

function gradeKey(subjectUrl, lesson) {
  return `${subjectUrl}::${lesson.date}::${lesson.theme}::${lesson.grade}`;
}

/**
 * Сравнивает свежие оценки с сохранённым снимком и шлёт уведомления о новых.
 * Возвращает число отправленных уведомлений.
 */
export async function notifyNewGrades(subjectUrl, subjectName, lessons) {
  if (!Array.isArray(lessons) || !lessons.length) return 0;

  const storageKey = `gradesSnapshot:${subjectUrl}`;
  const raw = await AsyncStorage.getItem(storageKey);
  const previous = raw ? new Set(JSON.parse(raw)) : null;

  const currentKeys = lessons.map((l) => gradeKey(subjectUrl, l));
  await AsyncStorage.setItem(storageKey, JSON.stringify(currentKeys));

  // Первый запуск: снимок сохраняем, но не спамим уведомлениями.
  if (!previous) return 0;

  const fresh = lessons.filter((l) => {
    const g = String(l.grade ?? '').trim();
    return g && g !== '-' && !previous.has(gradeKey(subjectUrl, l));
  });

  await Promise.all(
    fresh.slice(0, 10).map((l) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Новая оценка',
          body: `${subjectName || 'Предмет'}: ${l.grade}${l.theme ? ` · ${l.theme}` : ''}`,
          data: { source: GRADE_TAG, subjectUrl },
          badge: fresh.length,
        },
        trigger: null, // доставить сразу
      })
    )
  );
  return fresh.length;
}
