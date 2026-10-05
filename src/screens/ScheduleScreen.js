import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, FlatList, Modal, Alert, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGroups, fetchSchedule, fetchWeekHeader } from '../services/scheduleService';
import OfflineBanner from '../components/OfflineBanner';

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function typeColor(type) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('лек')) return { bg: '#1a237e', text: '#82b1ff', label: 'Лекция' };
  if (t.includes('тест') || t.includes('фэпо')) return { bg: '#b71c1c', text: '#ff8a80', label: type };
  if (t.includes('пр') || t.includes('прак')) return { bg: '#1b5e20', text: '#b9f6ca', label: 'Практика' };
  if (t.includes('лаб')) return { bg: '#4a148c', text: '#ea80fc', label: 'Лаб. работа' };
  return { bg: '#1e3a4f', text: '#90caf9', label: type };
}

function LessonCard({ lesson }) {
  const tc = lesson.type ? typeColor(lesson.type) : null;
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const match = String(lesson.time || '').match(/(\d{1,2})\D+(\d{2})/);
  const lessonMinutes = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  const isCurrent = lessonMinutes >= 0 && Math.abs(lessonMinutes - currentMinutes) <= 50;
  
  return (
    <View style={[styles.lessonCard, isCurrent && styles.lessonCardCurrent]}>
      <View style={styles.lessonTop}>
        <View style={styles.lessonNumBox}>
          <Text style={styles.lessonNumText}>{lesson.num}</Text>
        </View>
        <Text style={styles.lessonTime}>{lesson.time}</Text>
        {tc && (
          <View style={[styles.typeTag, { backgroundColor: tc.bg }]}>
            <Text style={[styles.typeText, { color: tc.text }]}>{tc.label}</Text>
          </View>
        )}
        {lesson.room ? (
          <View style={styles.roomTag}>
            <Text style={styles.roomText}>🚪 {lesson.room}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.lessonSubject}>{lesson.subject}</Text>
      {lesson.teacher ? (
        <Text style={styles.lessonTeacher}>👤 {lesson.teacher}</Text>
      ) : null}
    </View>
  );
}

export default function ScheduleScreen() {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [weekHeader, setWeekHeader] = useState('');
  const [week, setWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);

  useEffect(() => {
    loadGroups();
    const d = new Date().getDay();
    setSelectedDay(d === 0 ? 0 : Math.min(d - 1, 5));
  }, []);

  useEffect(() => {
    if (groups.length === 0) return;
    AsyncStorage.getItem('savedGroupId').then(id => {
      if (id) {
        const g = groups.find(gr => gr.id === id);
        if (g) {
          setSelectedGroup(g);
          loadSchedule(g.id, 0);
        }
      }
    });
  }, [groups]);

  async function loadGroups() {
    setLoadingGroups(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
      setFilteredGroups(data);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить список групп');
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadSchedule(groupId, w) {
    setLoading(true);
    try {
      const [schedResult, header] = await Promise.all([
        fetchSchedule(groupId, w),
        fetchWeekHeader(groupId, w),
      ]);
      setSchedule(schedResult.data);
      setFromCache(schedResult.fromCache || false);
      setCacheAge(schedResult.cacheAge || null);
      setWeekHeader(header);
      setWeek(w);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectGroup(group) {
    setSelectedGroup(group);
    setShowPicker(false);
    setSearchText('');
    setFilteredGroups(groups);
    AsyncStorage.setItem('savedGroupId', group.id);
    loadSchedule(group.id, 0);
  }

  function handleSearch(text) {
    setSearchText(text);
    setFilteredGroups(
      groups.filter(g => g.name.toLowerCase().includes(text.toLowerCase()))
    );
  }

  function changeWeek(delta) {
    loadSchedule(selectedGroup.id, week + delta);
  }

  async function shareDay() {
    const day = schedule?.[selectedDay];
    const lines = [
      `Расписание${selectedGroup ? ` · ${selectedGroup.name}` : ''}`,
      weekHeader,
      day?.header || '',
    ].filter(Boolean);
    if (day?.lessons?.length) {
      day.lessons.forEach((l) => lines.push(`${l.time}  ${l.subject}${l.room ? `  ·  каб. ${l.room}` : ''}`));
    } else {
      lines.push('Занятий нет');
    }
    try { await Share.share({ message: lines.join('\n') }); } catch (e) {}
  }

  const currentDay = schedule?.[selectedDay];

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Расписание</Text>
      </View>

      {/* Выбор группы */}
      <TouchableOpacity style={styles.groupSelector} onPress={() => setShowPicker(true)}>
        <Text style={styles.groupSelectorText}>
          {selectedGroup ? selectedGroup.name : 'Выбрать группу'}
        </Text>
        <Text style={styles.groupSelectorArrow}>▼</Text>
      </TouchableOpacity>

      {/* Модалка выбора группы */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите группу</Text>
              <TouchableOpacity onPress={() => {
                setShowPicker(false);
                setSearchText('');
                setFilteredGroups(groups);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Поиск группы..."
              placeholderTextColor="#8a9bb0"
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
            />
            {loadingGroups ? (
              <ActivityIndicator color="#4fc3f7" style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={filteredGroups}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.groupItem, selectedGroup?.id === item.id && styles.groupItemActive]}
                    onPress={() => handleSelectGroup(item)}
                  >
                    <Text style={[styles.groupItemText, selectedGroup?.id === item.id && styles.groupItemTextActive]}>
                      {item.name}
                    </Text>
                    {selectedGroup?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4fc3f7" />
          <Text style={styles.loadingText}>Загружаем расписание...</Text>
        </View>
      ) : schedule ? (
        <View style={{ flex: 1 }}>
          {/* Навигация по неделям */}
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.weekBtn} onPress={() => changeWeek(-1)}>
              <Text style={styles.weekBtnText}>← Пред.</Text>
            </TouchableOpacity>
            <Text style={styles.weekTitle} numberOfLines={1}>{weekHeader}</Text>
            <TouchableOpacity style={styles.weekBtn} onPress={() => changeWeek(1)}>
              <Text style={styles.weekBtnText}>След. →</Text>
            </TouchableOpacity>
          </View>

          {/* Офлайн баннер */}
          <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

          {/* Дни недели */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysRow}>
            {DAYS_SHORT.map((day, i) => {
              const hasLessons = schedule[i]?.lessons?.length > 0;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
                  onPress={() => setSelectedDay(i)}
                >
                  <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
                    {day}
                  </Text>
                  {hasLessons && (
                    <View style={[styles.dot, selectedDay === i && styles.dotActive]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Дата выбранного дня */}
          {currentDay?.header ? (
            <Text style={styles.dayDate}>{currentDay.header}</Text>
          ) : null}

          {/* Занятия */}
          <ScrollView contentContainerStyle={styles.lessonsList}>
            {currentDay?.lessons?.length > 0 ? (
              currentDay.lessons.map((lesson, i) => (
                <LessonCard key={i} lesson={lesson} />
              ))
            ) : (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyText}>Занятий нет</Text>
                <Text style={styles.emptySubText}>Свободный день!</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : !selectedGroup ? (
        <View style={styles.center}>
          <Text style={styles.hintEmoji}>👆</Text>
          <Text style={styles.hintText}>Выберите группу выше</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#132233', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#e8f4fd' },
  groupSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 14, backgroundColor: '#132233', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1e3a4f',
  },
  groupSelectorText: { color: '#e8f4fd', fontSize: 16, fontWeight: '600' },
  groupSelectorArrow: { color: '#4fc3f7', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#132233', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  modalTitle: { color: '#e8f4fd', fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#8a9bb0', fontSize: 20 },
  modalSearch: {
    backgroundColor: '#0d1b2a', margin: 14, borderRadius: 10,
    padding: 12, color: '#e8f4fd', fontSize: 15,
    borderWidth: 1, borderColor: '#1e3a4f',
  },
  groupItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#0d1b2a',
  },
  groupItemActive: { backgroundColor: '#1565c022' },
  groupItemText: { color: '#c8ddf0', fontSize: 15 },
  groupItemTextActive: { color: '#4fc3f7', fontWeight: '700' },
  checkmark: { color: '#4fc3f7', fontSize: 16, fontWeight: '700' },
  weekNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#0f2030', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  weekBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  weekBtnText: { color: '#4fc3f7', fontSize: 13, fontWeight: '600' },
  weekTitle: { color: '#8a9bb0', fontSize: 12, flex: 1, textAlign: 'center' },
  daysRow: {
    flexGrow: 0, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#132233', borderBottomWidth: 1, borderBottomColor: '#1e3a4f',
  },
  dayTab: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, marginRight: 6, minWidth: 44,
  },
  dayTabActive: { backgroundColor: '#1565c0' },
  dayTabText: { color: '#8a9bb0', fontSize: 14, fontWeight: '600' },
  dayTabTextActive: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4fc3f7', marginTop: 3 },
  dotActive: { backgroundColor: '#fff' },
  dayDate: {
    color: '#4fc3f7', fontSize: 13, fontWeight: '600',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2,
  },
  lessonsList: { padding: 14, paddingBottom: 32 },
  lessonCardCurrent: { borderLeftColor: '#4fc3f7', borderWidth: 1, borderColor: '#1e4d67' },
  lessonCard: {
    backgroundColor: '#132233', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#1565c0',
  },
  lessonTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  lessonNumBox: {
    backgroundColor: '#1565c0', borderRadius: 6,
    width: 28, height: 28, justifyContent: 'center', alignItems: 'center',
  },
  lessonNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  lessonTime: { color: '#4fc3f7', fontSize: 13, fontWeight: '700', flex: 1 },
  roomTag: { backgroundColor: '#1e3a4f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  roomText: { color: '#e8f4fd', fontSize: 13, fontWeight: '700' },
  lessonSubject: { color: '#e8f4fd', fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  lessonTeacher: { color: '#8a9bb0', fontSize: 12 },
  typeTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  emptyDay: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#e8f4fd', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptySubText: { color: '#8a9bb0', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8a9bb0', marginTop: 12 },
  hintEmoji: { fontSize: 40, marginBottom: 12 },
  hintText: { color: '#8a9bb0', fontSize: 16 },
});
