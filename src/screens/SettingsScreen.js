import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCache } from '../services/cacheService';
import { clearBiometricCredentials, hasBiometricCredentials } from '../services/authService';
import { fetchSchedule } from '../services/scheduleService';
import { requestNotificationPermission, syncLessonReminders } from '../services/notificationService';

export default function SettingsScreen({ onLogout, onOpenSchedule }) {
  const [group, setGroup] = useState('');
  const [bio, setBio] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('savedGroupName'),
      hasBiometricCredentials(),
      AsyncStorage.getItem('settings_notifications'),
      AsyncStorage.getItem('settings_reminder_minutes'),
    ]).then(([g, b, n, m]) => {
      setGroup(g || 'Не выбрана');
      setBio(b);
      setNotifications(n !== 'false');
      setMinutes(Number(m || 30));
    }).finally(() => setBusy(false));
  }, []);

  async function toggleBio(value) {
    if (!value) {
      await clearBiometricCredentials();
      setBio(false);
      return;
    }
    Alert.alert('Биометрия', 'Для включения снова войдите с логином и паролем — приложение предложит сохранить доступ.', [{ text: 'Понятно' }]);
  }

  async function reschedule(enabled, mins) {
    try {
      const group = await AsyncStorage.getItem('savedGroupId');
      if (!group) return;
      const result = await fetchSchedule(group, 0);
      await syncLessonReminders(result.data || [], mins, enabled);
    } catch (e) {}
  }

  async function toggleNotifications(value) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Уведомления выключены', 'Разрешите уведомления в настройках iOS, чтобы получать напоминания о парах.');
        setNotifications(false);
        await AsyncStorage.setItem('settings_notifications', 'false');
        return;
      }
    }
    setNotifications(value);
    await AsyncStorage.setItem('settings_notifications', String(value));
    await reschedule(value, minutes);
  }

  async function changeMinutes(next) {
    setMinutes(next);
    await AsyncStorage.setItem('settings_reminder_minutes', String(next));
    await reschedule(notifications, next);
  }

  function handleClearCache() {
    Alert.alert('Очистить кэш?', 'Сохранённые офлайн-данные будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: async () => { await clearCache(); Alert.alert('Готово', 'Кэш очищен.'); } },
    ]);
  }

  if (busy) return <View style={styles.center}><ActivityIndicator color="#4fc3f7" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Настройки</Text>
      <Text style={styles.subtitle}>Профиль и поведение приложения</Text>

      <Text style={styles.section}>ПРОФИЛЬ</Text>
      <TouchableOpacity style={styles.card} onPress={onOpenSchedule}>
        <View><Text style={styles.label}>Группа</Text><Text style={styles.value}>{group}</Text></View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <Text style={styles.section}>УВЕДОМЛЕНИЯ</Text>
      <View style={styles.card}>
        <View style={styles.flex}><Text style={styles.label}>Напоминать о парах</Text><Text style={styles.hint}>Локальные уведомления перед занятием</Text></View>
        <Switch value={notifications} onValueChange={toggleNotifications} trackColor={{ false: '#26384a', true: '#1565c0' }} thumbColor="#e8f4fd" />
      </View>
      {notifications && <View style={styles.card}>
        <View style={styles.flex}><Text style={styles.label}>За сколько минут</Text><Text style={styles.hint}>Время напоминания</Text></View>
        <View style={styles.minutes}>{[5, 10, 30, 60].map(n => <TouchableOpacity key={n} onPress={() => changeMinutes(n)} style={[styles.minute, minutes === n && styles.minuteActive]}><Text style={[styles.minuteText, minutes === n && styles.minuteTextActive]}>{n}</Text></TouchableOpacity>)}</View>
      </View>}

      <Text style={styles.section}>БЕЗОПАСНОСТЬ</Text>
      <View style={styles.card}>
        <View style={styles.flex}><Text style={styles.label}>Вход по биометрии</Text><Text style={styles.hint}>Face ID / Touch ID / отпечаток</Text></View>
        <Switch value={bio} onValueChange={toggleBio} trackColor={{ false: '#26384a', true: '#1565c0' }} thumbColor="#e8f4fd" />
      </View>

      <Text style={styles.section}>ДАННЫЕ</Text>
      <TouchableOpacity style={styles.action} onPress={handleClearCache}><Text style={styles.actionText}>Очистить офлайн-кэш</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>
      <TouchableOpacity style={styles.actionDanger} onPress={onLogout}><Text style={styles.dangerText}>Выйти из аккаунта</Text></TouchableOpacity>

      <Text style={styles.version}>УУСТР Журнал · 1.2.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1b2a' },
  title: { color: '#e8f4fd', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#71859b', fontSize: 13, marginTop: 4, marginBottom: 26 },
  section: { color: '#4fc3f7', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 8, marginTop: 10 },
  card: { minHeight: 62, flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#132233', borderRadius: 14, borderWidth: 1, borderColor: '#1e3a4f', marginBottom: 8 },
  flex: { flex: 1 }, label: { color: '#e8f4fd', fontSize: 14, fontWeight: '700' },
  value: { color: '#8a9bb0', fontSize: 12, marginTop: 4 },
  hint: { color: '#71859b', fontSize: 11, marginTop: 4 }, arrow: { color: '#71859b', fontSize: 25, marginLeft: 8 },
  minutes: { flexDirection: 'row', gap: 5 }, minute: { minWidth: 38, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#0d1b2a' }, minuteActive: { backgroundColor: '#1565c0' }, minuteText: { color: '#8a9bb0', fontSize: 12, fontWeight: '700' }, minuteTextActive: { color: '#fff' },
  action: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: '#132233', borderRadius: 14, borderWidth: 1, borderColor: '#1e3a4f', marginBottom: 8 }, actionText: { color: '#c8ddf0', fontSize: 14, fontWeight: '600' },
  actionDanger: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a171b', borderRadius: 14, borderWidth: 1, borderColor: '#54252b', marginTop: 8 }, dangerText: { color: '#ef5350', fontSize: 14, fontWeight: '700' },
  version: { color: '#4f6376', textAlign: 'center', fontSize: 10, marginTop: 24 },
});
