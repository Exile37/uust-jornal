import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCache } from '../services/cacheService';
import { clearBiometricCredentials, hasBiometricCredentials } from '../services/authService';
import Chevron from '../components/Chevron';
import { colors, layout, radius } from '../theme';

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

  async function toggleNotifications(value) {
    if (value) {
      Alert.alert('Уведомления', 'Функция подготовлена в интерфейсе. Для системных уведомлений установите expo-notifications командой npm install expo-notifications и подключите сервис из src/services/notificationService.js.');
    }
    setNotifications(value);
    await AsyncStorage.setItem('settings_notifications', String(value));
  }

  async function changeMinutes(next) {
    setMinutes(next);
    await AsyncStorage.setItem('settings_reminder_minutes', String(next));
  }

  function handleClearCache() {
    Alert.alert('Очистить кэш?', 'Сохранённые офлайн-данные будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: async () => { await clearCache(); Alert.alert('Готово', 'Кэш очищен'); } },
    ]);
  }

  if (busy) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Настройки</Text>
      <Text style={styles.subtitle}>Профиль и приложение</Text>

      <Text style={styles.section}>Профиль</Text>
      <View style={styles.group}>
        <TouchableOpacity style={styles.row} onPress={onOpenSchedule} activeOpacity={0.8}>
          <View style={styles.rowBody}>
            <Text style={styles.label}>Группа</Text>
            <Text style={styles.value}>{group}</Text>
          </View>
          <Chevron direction="right" size={7} />
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Уведомления</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.label}>Напоминать о парах</Text>
            <Text style={styles.hint}>Локальные уведомления перед занятием</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.raised, true: colors.accent }}
            ios_backgroundColor={colors.raised}
            thumbColor={colors.text}
          />
        </View>
        {notifications ? (
          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.rowBody}>
              <Text style={styles.label}>За сколько минут</Text>
              <Text style={styles.hint}>Время напоминания</Text>
            </View>
            <View style={styles.minutes}>
              {[10, 30, 60].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => changeMinutes(n)}
                  style={[styles.minute, minutes === n && styles.minuteActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.minuteText, minutes === n && styles.minuteTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Text style={styles.section}>Безопасность</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.label}>Вход по биометрии</Text>
            <Text style={styles.hint}>Face ID, Touch ID или отпечаток</Text>
          </View>
          <Switch
            value={bio}
            onValueChange={toggleBio}
            trackColor={{ false: colors.raised, true: colors.accent }}
            ios_backgroundColor={colors.raised}
            thumbColor={colors.text}
          />
        </View>
      </View>

      <Text style={styles.section}>Данные</Text>
      <View style={styles.group}>
        <TouchableOpacity style={styles.row} onPress={handleClearCache} activeOpacity={0.8}>
          <Text style={[styles.label, styles.rowBody]}>Очистить офлайн-кэш</Text>
          <Chevron direction="right" size={7} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, styles.rowDivider, styles.dangerRow]} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.dangerText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>УУСТР Журнал · 1.4.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: layout.page, paddingTop: layout.top, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },

  section: { color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 24, marginBottom: 8 },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowBody: { flex: 1 },

  label: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  value: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },

  minutes: { flexDirection: 'row', gap: 4 },
  minute: {
    minWidth: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.raised,
  },
  minuteActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  minuteText: { color: colors.text2, fontSize: 12, lineHeight: 16, fontWeight: '500', fontVariant: ['tabular-nums'] },
  minuteTextActive: { color: colors.accent },

  dangerRow: { justifyContent: 'center' },
  dangerText: { color: colors.bad, fontSize: 14, lineHeight: 19, fontWeight: '500' },
  version: { color: colors.muted, textAlign: 'center', fontSize: 10, lineHeight: 14, marginTop: 24 },
});
