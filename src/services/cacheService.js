import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheService = {
  /**
   * Получение сохраненных данных из AsyncStorage
   */
  async getLocal(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error(`[CacheError] Ошибка чтения ключа ${key}:`, e);
      return null;
    }
  },

  /**
   * Сохранение данных в AsyncStorage
   */
  async setLocal(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[CacheError] Ошибка записи ключа ${key}:`, e);
    }
  },

  /**
   * Стратегия Stale-While-Revalidate:
   * 1. Мгновенно возвращает кэшированные данные через callback (onData).
   * 2. Выполняет сетевой запрос (fetcher).
   * 3. Обновляет кэш и вызывает callback с новыми данными.
   */
  async fetchWithCache(key, fetcher, onData) {
    // 1. Отдаем локальный кэш мгновенно
    const cachedData = await this.getLocal(key);
    if (cachedData && onData) {
      onData(cachedData);
    }

    // 2. Подтягиваем свежие данные из сети
    try {
      const freshData = await fetcher();
      await this.setLocal(key, freshData);
      if (onData) {
        onData(freshData);
      }
      return freshData;
    } catch (error) {
      console.warn(`[CacheWarning] Не удалось обновить ${key} с сервера. Использован кэш.`, error);
      if (!cachedData) throw error;
      return cachedData;
    }
  }
};