import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import {
  login,
  isBiometricAvailable,
  authenticateWithBiometrics,
  saveBiometricCredentials,
  getBiometricCredentials,
  hasBiometricCredentials,
} from '../services/authService';
import { colors, radius } from '../theme';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    try {
      const available = await isBiometricAvailable();
      const hasCredentials = await hasBiometricCredentials();
      setBioAvailable(available);
      setBioEnabled(hasCredentials);

      if (available && hasCredentials) {
        // Небольшая задержка чтобы экран успел отрисоваться
        setTimeout(() => handleBiometricLogin(), 500);
      }
    } catch (e) {
      // Биометрия не критична для входа: форма работает и без неё.
    }
  }

  async function handleBiometricLogin() {
    try {
      const success = await authenticateWithBiometrics();
      if (!success) return;

      const creds = await getBiometricCredentials();
      if (!creds) return;

      setLoading(true);
      const result = await login(creds.username, creds.password);
      if (result.success) {
        onLoginSuccess();
      } else {
        Alert.alert('Ошибка', 'Сессия истекла, войдите вручную');
        setBioEnabled(false);
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Нет соединения с сервером');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        if (bioAvailable && !bioEnabled) {
          Alert.alert(
            'Вход по биометрии',
            'Включить вход по Face ID или отпечатку?',
            [
              { text: 'Не сейчас', style: 'cancel', onPress: () => onLoginSuccess() },
              {
                text: 'Включить',
                onPress: async () => {
                  await saveBiometricCredentials(username.trim(), password);
                  setBioEnabled(true);
                  onLoginSuccess();
                },
              },
            ]
          );
        } else {
          onLoginSuccess();
        }
      } else {
        Alert.alert('Ошибка входа', result.error || 'Неверный логин или пароль');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Нет соединения с сервером');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.sheet}>
        <View style={styles.brandRow}>
          <View style={styles.brandRule} />
          <Text style={styles.brand}>УУСТР</Text>
        </View>
        <Text style={styles.subtitle}>Электронный журнал</Text>

        <Text style={styles.label}>Логин</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
          textContentType="username"
        />

        <Text style={styles.label}>Пароль</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          onSubmitEditing={handleLogin}
          textContentType="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Войти</Text>
          )}
        </TouchableOpacity>

        {bioAvailable && bioEnabled && !loading ? (
          <TouchableOpacity
            style={styles.bioButton}
            onPress={handleBiometricLogin}
            activeOpacity={0.7}
          >
            <Text style={styles.bioText}>Войти по биометрии</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.footer}>account.str.uust.ru</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandRule: { width: 20, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  brand: { color: colors.text, fontSize: 22, lineHeight: 26, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  label: { color: colors.text2, fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 20, marginBottom: 6 },
  input: {
    height: 52,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: colors.onAccent, fontSize: 15, fontWeight: '600' },
  bioButton: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  bioText: { color: colors.text2, fontSize: 14, fontWeight: '500' },
  footer: { color: colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 16 },
});
