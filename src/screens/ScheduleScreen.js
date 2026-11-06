import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, FlatList, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGroups, fetchSchedule, fetchWeekHeader } from '../services/scheduleService';
import OfflineBanner from '../components/OfflineBanner';

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function typeColor(type) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('лек')) return { bg: '#1a237e', text: '#82b1ff', label: 'Лекция' };
  if (t.includes('тест') || t.includes('фэпо')) return { bg: '#b71c1c', text: '#ff8a80', label: type };
  if (t.includes('пр') || t.includes('прак')) return { bg: '#1b5e20', text: '#b9f6ca', label: 'Практика' };
  if (t.includes('лаб')) return { bg: '#4a148c', text: '#ea80fc', label: 'Лаб. работа' };
  return { bg: '#1e3a4f', text: '#90caf9', label: type };
}

function LessonCard({ lesson, isToday }) {
  const tc = lesson.type ? typeColor(lesson.type) : null;
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const match = String(lesson.time || '').match(/(\d{1,2})\D+(\d{2})/);
  const lessonMinutes = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  const isCurrent = isToday && lessonMinutes >= 0 && Math.abs(lessonMinutes - currentMinutes) <= 50;
  
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
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);
  const scheduleRequestId = useRef(0);

  useEffect(() => {
    loadGroups();
    // The saved group ID is enough to request the timetable; don't make the
    // student wait for the (separate) group directory first.
    Promise.all([
      AsyncStorage.getItem('savedGroupId'),
      AsyncStorage.getItem('savedGroupName'),
    ]).then(([id, name]) => {
      if (!id || scheduleRequestId.current > 0) return;
      setSelectedGroup({ id, name: name || 'Моя группа' });
      loadSchedule(id, 0);
    });
  }, []);

  async function loadGroups() {
    setLoadingGroups(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
      setFilteredGroups(data);
      const savedId = await AsyncStorage.getItem('savedGroupId');
      const saved = data.find(group => group.id === savedId);
      if (saved) setSelectedGroup(saved);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить список групп');
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadSchedule(groupId, w) {
    const requestId = ++scheduleRequestId.current;
    setLoading(true);
    setWeek(w);
    setWeekHeader('');
    try {
      const schedResult = await fetchSchedule(groupId, w);
      if (requestId !== scheduleRequestId.current) return;
      setSchedule(schedResult.data);
      setFromCache(schedResult.fromCache || false);
      setCacheAge(schedResult.cacheAge ?? null);
      // The header is decorative; load it after showing the actual timetable.
      fetchWeekHeader(groupId, w).then(header => {
        if (requestId === scheduleRequestId.current) setWeekHeader(header);
      });
    } catch (e) {
      if (requestId === scheduleRequestId.current) Alert.alert('Ошибка', e.message);
    } finally {
      if (requestId === scheduleRequestId.current) setLoading(false);
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

  const days = schedule || [];
  const todayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? -1 : day - 1;
  })();
  const hasAnyLesson = days.some(day => (day?.lessons || []).length > 0);

  function pluralLessons(count) {
    const tail = count % 100;
    const last = count % 10;
    if (tail > 10 && tail < 20) return 'пар';
    if (last > 1 && last < 5) return 'пары';
    if (last === 1) return 'пара';
    return 'пар';
  }

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

          {/* Лента: все дни недели подряд */}
          <ScrollView contentContainerStyle={styles.feed}>
            {!hasAnyLesson ? (
              <View style={styles.emptyWeek}>
                <Text style={styles.emptyText}>На эту неделю занятий нет</Text>
                <Text style={styles.emptySubText}>Проверьте другую неделю или группу</Text>
              </View>
            ) : days.map((day, index) => {
              const lessons = day?.lessons || [];
              const isToday = week === 0 && index === todayIndex;
              return (
                <View key={`${day?.name || index}-${index}`} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                        {day?.name || DAYS_FULL[index] || DAYS_SHORT[index] || `День ${index + 1}`}
                      </Text>
                      {isToday ? (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>СЕГОДНЯ</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.dayMeta}>
                      {day?.header || (lessons.length ? `${lessons.length} ${pluralLessons(lessons.length)}` : '')}
                    </Text>
                  </View>

                  {lessons.length ? lessons.map((lesson, i) => (
                    <LessonCard key={`${lesson.time}-${i}`} lesson={lesson} isToday={isToday} />
                  )) : (
                    <View style={styles.dayEmpty}>
                      <Text style={styles.dayEmptyText}>Занятий нет</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
  feed: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 32 },
  daySection: { marginTop: 14 },
  dayHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 4, marginBottom: 8,
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { color: '#8a9bb0', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  dayNameToday: { color: '#4fc3f7' },
  todayBadge: { backgroundColor: '#1565c0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  todayBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  dayMeta: { color: '#5f7488', fontSize: 11, fontWeight: '600' },
  dayEmpty: {
    backgroundColor: '#0f2030', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#17293a',
  },
  dayEmptyText: { color: '#5f7488', fontSize: 12 },
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
  emptyWeek: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#e8f4fd', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySubText: { color: '#8a9bb0', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#8a9bb0', marginTop: 12 },
  hintEmoji: { fontSize: 40, marginBottom: 12 },
  hintText: { color: '#8a9bb0', fontSize: 16 },
});
