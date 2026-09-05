import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

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
export async function login(username, password) {
  const resp = await fetch(`${PROXY_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await resp.json();

  if (data.success && data.group_name) {
    try {
      const cleanName = data.group_name.replace(/^К-/i, '').trim();
      const groupsResp = await fetch(`${PROXY_URL}/api/schedule/groups?faculty=26`);
      const groupsData = await groupsResp.json();
      const groups = groupsData.groups || [];
      const found = groups.find(g =>
        g.name.toLowerCase() === cleanName.toLowerCase() ||
        g.name.toLowerCase() === data.group_name.toLowerCase()
      );
      if (found) {
        await AsyncStorage.setItem('savedGroupId', found.id);
        await AsyncStorage.setItem('savedGroupName', found.name);
      }
    } catch (e) {}
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
