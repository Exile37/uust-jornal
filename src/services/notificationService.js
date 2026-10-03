// =========================
// NOTIFICATION SERVICE
// Локальные напоминания о ближайших парах на основе расписания.
// Требует установленный пакет expo-notifications (см. package.json).
// =========================
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Метка, по которой отличаем "наши" уведомления от прочих при отмене.
const SOURCE_TAG = 'uust-lesson-reminder';

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

// Отменяет все ранее запланированные напоминания о парах (не трогает
// прочие уведомления, если они когда-нибудь появятся в приложении).
export async function cancelAllLessonReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => n.content?.data?.source === SOURCE_TAG);
  await Promise.all(
    ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Планирует напоминания на ближайшие 6 дней расписания.
 * @param {Array} schedule — массив из 6 дней, как возвращает scheduleService.fetchSchedule
 * @param {number} minutesBefore — за сколько минут до пары напомнить
 */
export async function scheduleLessonReminders(schedule, minutesBefore = 30) {
  await cancelAllLessonReminders();
  if (!Array.isArray(schedule) || !schedule.length) return 0;

  const now = new Date();
  const todayIndex = Math.min(Math.max(now.getDay() - 1, 0), 5); // Пн=0 ... Сб=5
  let scheduledCount = 0;

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

      if (triggerDate.getTime() <= now.getTime()) continue; // не планируем в прошлое

      // eslint-disable-next-line no-await-in-loop
      await Notifications.scheduleNotificationAsync({
        content: {
          title: lesson.subject || 'Занятие',
          body: `Через ${minutesBefore} мин · ${lesson.time}${lesson.room ? ` · Каб. ${lesson.room}` : ''}`,
          data: { source: SOURCE_TAG },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      scheduledCount += 1;
    }
  }

  return scheduledCount;
}
