// =========================
// CACHE SERVICE
// Кэширование данных в AsyncStorage
// =========================
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

export async function saveCache(key, data) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.log('Cache save error:', e);
  }
}

export async function loadCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const age = Date.now() - timestamp;
    return {
      data,
      isStale: age > CACHE_TTL,
      age: Math.floor(age / 60000), // минуты
    };
  } catch (e) {
    return null;
  }
}

export async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (e) {
    console.log('Cache clear error:', e);
  }
}

export function cacheKey(type, id = '') {
  return `cache_${type}_${id}`;
}
