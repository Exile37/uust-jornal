import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import GradesScreen from './src/screens/GradesScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TasksScreen from './src/screens/TasksScreen';

const TABS = [
  { id: 'home', icon: '⌂', label: 'Главная' },
  { id: 'grades', icon: '★', label: 'Оценки' },
  { id: 'schedule', icon: '▦', label: 'Расписание' },
  { id: 'tasks', icon: '✓', label: 'Задачи' },
  { id: 'settings', icon: '⚙', label: 'Настройки' },
];

export default function App() {
  const [screen, setScreen] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSubject, setSelectedSubject] = useState(null);

  function handleLoginSuccess() { setScreen('main'); setActiveTab('home'); }
  function handleSelectSubject(subject) { setSelectedSubject(subject); setScreen('gradesDetail'); }
  function handleLogout() { setSelectedSubject(null); setScreen('login'); setActiveTab('home'); }
  function handleBack() { setScreen('main'); setSelectedSubject(null); }
  function openTab(tab) { setSelectedSubject(null); setScreen('main'); setActiveTab(tab); }

  if (screen === 'login') return <><StatusBar barStyle="light-content" backgroundColor="#0d1b2a" /><LoginScreen onLoginSuccess={handleLoginSuccess} /></>;
  if (screen === 'gradesDetail' && selectedSubject) return <><StatusBar barStyle="light-content" backgroundColor="#0d1b2a" /><GradesScreen subject={selectedSubject} onBack={handleBack} /></>;

  return (
    <><StatusBar barStyle="light-content" backgroundColor="#0d1b2a" />
      <View style={styles.container}>
        <View style={styles.content}>
          {activeTab === 'home' && <DashboardScreen onOpenGrades={() => openTab('grades')} onOpenSchedule={() => openTab('schedule')} onOpenSettings={() => openTab('settings')} onOpenTasks={() => openTab('tasks')} />}
          {activeTab === 'grades' && <SubjectsScreen onSelectSubject={handleSelectSubject} onLogout={handleLogout} />}
          {activeTab === 'schedule' && <ScheduleScreen />}
          {activeTab === 'tasks' && <TasksScreen />}
          {activeTab === 'settings' && <SettingsScreen onLogout={handleLogout} onOpenSchedule={() => openTab('schedule')} />}
        </View>
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => openTab(tab.id)} activeOpacity={0.75}>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>;
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' }, content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#132233', borderTopWidth: 1, borderTopColor: '#1e3a4f', paddingBottom: 18, paddingTop: 7 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4, position: 'relative' },
  tabIcon: { color: '#71859b', fontSize: 21, lineHeight: 24 }, tabIconActive: { color: '#4fc3f7' },
  tabLabel: { color: '#71859b', fontSize: 10, fontWeight: '700', marginTop: 2 }, tabLabelActive: { color: '#4fc3f7' },
  tabIndicator: { position: 'absolute', top: -7, width: 28, height: 3, backgroundColor: '#4fc3f7', borderRadius: 2 },
});
