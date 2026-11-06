// Official record-book data only. Journal marks have a different meaning and
// must never be presented as a substitute for the student's official statement.
import { saveCache, loadCache, cacheKey } from './cacheService';
import { fetchWithTimeout } from './http';

const PROXY_URL = 'https://uust-proxy.onrender.com';
const SCHEMA_VERSION = 2;

async function fetchFromLk() {
  const resp = await fetchWithTimeout(`${PROXY_URL}/api/recordbook`, {}, 25000);
  if (resp.status === 401) throw new Error('auth');
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(resp.ok ? 'Сервер вернул некорректный ответ' : `Сервер недоступен (${resp.status})`);
  }
  if (data.error === 'auth') throw new Error('auth');
  if (!resp.ok || data.error) throw new Error(data.error || `Ошибка сервера (${resp.status})`);
  if (!Array.isArray(data.semesters) || data.schemaVersion !== SCHEMA_VERSION || data.source !== 'lk') {
    throw new Error('Сервер зачётки ещё не обновлён. Попробуйте позже.');
  }
  return data;
}

export async function fetchRecordBook() {
  const key = cacheKey('recordbook');
  try {
    const data = await fetchFromLk();
    await saveCache(key, data);
    return { data, fromCache: false, source: 'lk' };
  } catch (error) {
    if (error.message === 'auth') throw error;
    const cached = await loadCache(key);
    // Reject old schema and journal-derived values rather than showing invented
    // grades from another endpoint as though they came from the official book.
    if (cached?.data?.schemaVersion === SCHEMA_VERSION && cached.data.source === 'lk') {
      return { data: cached.data, fromCache: true, cacheAge: cached.age, source: 'lk' };
    }
    throw error;
  }
}
