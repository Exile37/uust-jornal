import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { fetchWithTimeout, readJson } from './http';

export const PROXY_URL = 'https://uust-proxy.onrender.com';

// =========================
// БИОМЕТРИЯ
// =========================
export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Войти в УУСТР',
    cancelLabel: 'Отмена',
  });
  return result.success;
}

// Сохранить логин/пароль для биометрии
export async function saveBiometricCredentials(username, password) {
  await SecureStore.setItemAsync('bio_username', username);
  await SecureStore.setItemAsync('bio_password', password);
}

export async function getBiometricCredentials() {
  const username = await SecureStore.getItemAsync('bio_username');
  const password = await SecureStore.getItemAsync('bio_password');
  return username && password ? { username, password } : null;
}

export async function clearBiometricCredentials() {
  await SecureStore.deleteItemAsync('bio_username');
  await SecureStore.deleteItemAsync('bio_password');
}

export async function hasBiometricCredentials() {
  const creds = await getBiometricCredentials();
  return !!creds;
}

// =========================
// ЛОГИН
// =========================
const LOGIN_TIMEOUT = 45000;

function normalizeGroup(value) {
  return String(value || '').replace(/^К-/i, '').trim().toLowerCase();
}

// Подбор группы для расписания не должен задерживать вход: если прокси
// просыпается или недоступен, экран входа просто не дождётся ответа.
async function resolveGroupInBackground(groupName) {
  try {
    const cleanName = String(groupName).replace(/^К-/i, '').trim();
    const [savedGroupId, savedGroupName] = await Promise.all([
      AsyncStorage.getItem('savedGroupId'),
      AsyncStorage.getItem('savedGroupName'),
    ]);
    if (savedGroupId && normalizeGroup(savedGroupName) === normalizeGroup(groupName)) return;

    const groupsResp = await fetchWithTimeout(`${PROXY_URL}/api/schedule/groups?faculty=26`, {}, 20000);
    const groupsData = await readJson(groupsResp, 'Список групп недоступен');
    const groups = groupsData.groups || [];
    const found = groups.find(g =>
      String(g.name || '').toLowerCase() === cleanName.toLowerCase() ||
      String(g.name || '').toLowerCase() === String(groupName).toLowerCase()
    );
    if (found) {
      await AsyncStorage.setItem('savedGroupId', found.id);
      await AsyncStorage.setItem('savedGroupName', found.name);
    } else {
      await AsyncStorage.removeItem('savedGroupId');
      await AsyncStorage.setItem('savedGroupName', groupName);
    }
  } catch (e) {}
}

export async function login(username, password) {
  const resp = await fetchWithTimeout(`${PROXY_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, LOGIN_TIMEOUT);
  const data = await readJson(resp, 'Сервер не отвечает. Попробуйте позже.');

  if (data.success) {
    // Never offer another login's cached official statement while offline.
    await AsyncStorage.removeItem('uust:recordbook').catch(() => {});
    if (data.group_name) resolveGroupInBackground(data.group_name);
  }

  return data;
}

export function logout() {
  fetch(`${PROXY_URL}/api/logout`, { method: 'POST' }).catch(() => {});
  return { success: true };
}

export function getSessionCookies() {
  return { _proxy: true };
}

export function clearSessionCookies() {}
