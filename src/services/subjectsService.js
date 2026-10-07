// =========================
// SUBJECTS & GRADES SERVICE — с офлайн кэшем
// =========================
import { saveCache, loadCache, cacheKey, peekCache, fetchWithTimeout } from './cacheService';

const PROXY_URL = 'https://uust-proxy.onrender.com';

// Мгновенно отдаёт предметы из кэша, не дожидаясь сети.
export async function peekSubjects() {
  const cached = await peekCache(cacheKey('subjects'));
  return cached ? { data: cached.data, fromCache: true, cacheAge: cached.age } : null;
}

export async function fetchSubjects() {
  const key = cacheKey('subjects');

  // Пробуем загрузить свежие данные
  try {
    const resp = await fetchWithTimeout(`${PROXY_URL}/api/subjects`);
    if (resp.status === 401) throw new Error('auth');
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Сервер не отвечает'); }
    if (data.error === 'auth') throw new Error('auth');
    if (data.error) throw new Error(data.error);

    // Сохраняем в кэш
    await saveCache(key, data.subjects);
    return { data: data.subjects, fromCache: false };
  } catch (e) {
    if (e.message === 'auth') throw e;

    // Пробуем кэш
    const cached = await loadCache(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cacheAge: cached.age };
    }
    throw e;
  }
}

export async function fetchGrades(subjectUrl, options = {}) {
  const key = cacheKey('grades', subjectUrl.replace(/\//g, '_'));

  // cacheOnly — мгновенно отдаём только локальные оценки (для быстрого показа).
  if (options.cacheOnly) {
    const cached = await loadCache(key);
    if (cached) return { data: cached.data, fromCache: true, cacheAge: cached.age };
    throw new Error('no-cache');
  }

  try {
    const resp = await fetchWithTimeout(
      `${PROXY_URL}/api/grades?url=${encodeURIComponent(subjectUrl)}`
    );
    if (resp.status === 401) throw new Error('auth');
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Сервер не отвечает'); }
    if (data.error === 'auth') throw new Error('auth');
    if (data.error) throw new Error(data.error);

    await saveCache(key, data.lessons);
    return { data: data.lessons, fromCache: false };
  } catch (e) {
    if (e.message === 'auth') throw e;

    const cached = await loadCache(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cacheAge: cached.age };
    }
    throw e;
  }
}
