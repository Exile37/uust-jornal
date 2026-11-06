import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, StatusBar, Platform, useWindowDimensions,
} from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import GradesScreen from './src/screens/GradesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RecordBookScreen from './src/screens/RecordBookScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TabIcon from './src/components/TabIcon';
import { colors } from './src/theme';

const TABS = [
  { id: 'home', icon: 'home', label: 'Главная' },
  { id: 'grades', icon: 'grades', label: 'Оценки' },
  { id: 'record', icon: 'record', label: 'Зачётка' },
  { id: 'schedule', icon: 'schedule', label: 'Расписание' },
  { id: 'settings', icon: 'settings', label: 'Настройки' },
];

export default function App() {
  const [screen, setScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const { fontScale } = useWindowDimensions();

  // Пять подписей при системном крупном шрифте не влезают в строку.
  // Тогда подпись остаётся только у активной вкладки — это же и подсказка,
  // где пользователь находится.
  const labelsOnlyForActive = fontScale >= 1.3;

  function handleLoginSuccess() { setScreen('main'); setActiveTab('home'); }
  function handleSelectSubject(subject) { setSelectedSubject(subject); setScreen('gradesDetail'); }
  function handleLogout() { setSelectedSubject(null); setScreen('login'); setActiveTab('home'); }
  function handleBack() { setScreen('main'); setSelectedSubject(null); }
  function openTab(tab) { setSelectedSubject(null); setScreen('main'); setActiveTab(tab); }

  if (screen === 'login') return <><StatusBar barStyle="light-content" backgroundColor={colors.bg} /><LoginScreen onLoginSuccess={handleLoginSuccess} /></>;
  if (screen === 'gradesDetail' && selectedSubject) return <><StatusBar barStyle="light-content" backgroundColor={colors.bg} /><GradesScreen subject={selectedSubject} onBack={handleBack} /></>;

  return (
    <><StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.container}>
        <View style={styles.content}>
          {activeTab === 'home' && <DashboardScreen onOpenGrades={() => openTab('grades')} onOpenRecordBook={() => openTab('record')} onOpenSchedule={() => openTab('schedule')} onOpenSettings={() => openTab('settings')} />}
          {activeTab === 'grades' && <SubjectsScreen onSelectSubject={handleSelectSubject} onLogout={handleLogout} />}
          {activeTab === 'record' && <RecordBookScreen onLogout={handleLogout} />}
          {activeTab === 'schedule' && <ScheduleScreen />}
          {activeTab === 'settings' && <SettingsScreen onLogout={handleLogout} onOpenSchedule={() => openTab('schedule')} />}
        </View>
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const showLabel = !labelsOnlyForActive || active;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabItem}
                onPress={() => openTab(tab.id)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <View style={[styles.tabRule, active && styles.tabRuleActive]} />
                <TabIcon name={tab.icon} color={active ? colors.accent : colors.muted} size={22} />
                {showLabel ? (
                  <Text
                    style={[styles.tabLabel, active && styles.tabLabelActive]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 52,
    paddingTop: 12,
    paddingBottom: 2,
  },
  tabRule: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  tabRuleActive: { backgroundColor: colors.accent },
  tabLabel: { color: colors.muted, fontSize: 11, lineHeight: 14, fontWeight: '500', marginTop: 4, paddingHorizontal: 2 },
  tabLabelActive: { color: colors.accent },
});
