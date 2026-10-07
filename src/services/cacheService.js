import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'uust:';

export function cacheKey(...parts) {
  return PREFIX + parts.filter(Boolean).join(':');
}

// fetch с таймаутом: бесплатный прокси может «просыпаться» долго,
// без ограничения запрос висел бы минутами.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function saveCache(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data: value, savedAt: Date.now() }));
  } catch (e) {
    console.error(`[CacheError] Ошибка записи ключа ${key}:`, e);
  }
}

export async function loadCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      const age = parsed.savedAt ? Math.floor((Date.now() - parsed.savedAt) / 60000) : null;
      return { data: parsed.data, age };
    }
    return { data: parsed, age: null };
  } catch (e) {
    console.error(`[CacheError] Ошибка чтения ключа ${key}:`, e);
    return null;
  }
}

// Мгновенное чтение кэша без обращения к сети — для показа данных сразу после входа.
export async function peekCache(key) {
  const cached = await loadCache(key);
  return cached ? { data: cached.data, age: cached.age } : null;
}

export async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch (e) {
    console.error('[CacheError] Ошибка очистки кэша:', e);
  }
}

export const cacheService = {
  async getLocal(key) {
    const cached = await loadCache(key);
    return cached ? cached.data : null;
  },

  async setLocal(key, value) {
    await saveCache(key, value);
  },

  async fetchWithCache(key, fetcher, onData) {
    const cached = await loadCache(key);
    if (cached && onData) onData(cached.data);

    try {
      const freshData = await fetcher();
      await saveCache(key, freshData);
      if (onData) onData(freshData);
      return freshData;
    } catch (error) {
      console.warn(`[CacheWarning] Не удалось обновить ${key} с сервера. Использован кэш.`, error);
      if (!cached) throw error;
      return cached.data;
    }
  },
};
