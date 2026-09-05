// =========================
// SCHEDULE SERVICE — с офлайн кэшем
// =========================
import { saveCache, loadCache, cacheKey } from './cacheService';

const PROXY_URL = 'https://uust-proxy.onrender.com';

export async function fetchGroups() {
  const key = cacheKey('groups');
  try {
    const resp = await fetch(`${PROXY_URL}/api/schedule/groups?faculty=26`);
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Ошибка сервера'); }
    if (data.error) throw new Error(data.error);
    await saveCache(key, data.groups);
    return data.groups || [];
  } catch (e) {
    const cached = await loadCache(key);
    if (cached) return cached.data;
    throw e;
  }
}

export async function fetchWeekHeader(groupId, week) {
  try {
    const resp = await fetch(`${PROXY_URL}/api/schedule/week_header?id=${groupId}&week=${week}`);
    const data = await resp.json();
    return data.header || '';
  } catch (e) {
    return '';
  }
}

export async function fetchSchedule(groupId, week = 0) {
  const key = cacheKey('schedule', `${groupId}_${week}`);
  try {
    const resp = await fetch(`${PROXY_URL}/api/schedule/timetable?id=${groupId}&week=${week}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    await saveCache(key, data.days);
    return { data: data.days || [], fromCache: false };
  } catch (e) {
    const cached = await loadCache(key);
    if (cached) return { data: cached.data, fromCache: true, cacheAge: cached.age };
    throw e;
  }
}
