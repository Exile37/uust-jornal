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
      console.log('bioAvailable:', available, '| hasCredentials:', hasCredentials);
      setBioAvailable(available);
      setBioEnabled(hasCredentials);

      if (available && hasCredentials) {
        // Небольшая задержка чтобы экран успел отрисоваться
        setTimeout(() => handleBiometricLogin(), 500);
      }
    } catch (e) {
      console.log('checkBiometrics error:', e);
    }
  }

  async function handleBiometricLogin() {
    console.log('handleBiometricLogin called');
    try {
      const success = await authenticateWithBiometrics();
      console.log('bio success:', success);
      if (!success) return;

      const creds = await getBiometricCredentials();
      console.log('creds:', creds ? 'found' : 'null');
      if (!creds) return;

      setLoading(true);
      const result = await login(creds.username, creds.password);
      console.log('login result:', result);
      if (result.success) {
        onLoginSuccess();
      } else {
        Alert.alert('Ошибка', 'Сессия истекла, войдите вручную');
        setBioEnabled(false);
      }
    } catch (e) {
      console.log('handleBiometricLogin error:', e);
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
            'Вход по Face ID',
            'Хотите входить в приложение по Face ID / Touch ID?',
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
      <View style={styles.card}>
        <Text style={styles.title}>УУСТР</Text>
        <Text style={styles.subtitle}>Электронный журнал</Text>

        <TextInput
          style={styles.input}
          placeholder="Логин"
          placeholderTextColor="#8a9bb0"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor="#8a9bb0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Войти</Text>
          )}
        </TouchableOpacity>

        {bioAvailable && bioEnabled && !loading && (
          <TouchableOpacity
            style={styles.bioButton}
            onPress={handleBiometricLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.bioIcon}>🔒</Text>
            <Text style={styles.bioText}>Войти по Face ID</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d1b2a',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#132233', borderRadius: 16, padding: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  title: {
    fontSize: 32, fontWeight: '800', color: '#4fc3f7',
    textAlign: 'center', letterSpacing: 4, marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: '#8a9bb0', textAlign: 'center',
    marginBottom: 32, letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: '#1e3a4f',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#e8f4fd', marginBottom: 14,
  },
  button: {
    backgroundColor: '#1565c0', borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  bioButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingVertical: 14, borderRadius: 10,
    backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: '#1e3a4f',
    gap: 8,
  },
  bioIcon: { fontSize: 22 },
  bioText: { color: '#4fc3f7', fontSize: 15, fontWeight: '600' },
});