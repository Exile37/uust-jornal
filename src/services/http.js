// =========================
// HTTP — единая точка сетевых запросов
// Без таймаута fetch может висеть бесконечно: экран остаётся со спиннером,
// а пользователь не понимает, что сервер не отвечает.
// =========================
export const DEFAULT_TIMEOUT = 15000;

export async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      const timeoutError = new Error('Сервер не отвечает. Проверьте интернет и попробуйте снова.');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function readJson(resp, fallbackMessage = 'Сервер вернул некорректный ответ') {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(fallbackMessage);
  }
}
