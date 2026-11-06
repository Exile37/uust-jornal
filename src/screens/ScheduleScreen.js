import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, FlatList, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGroups, fetchSchedule, fetchWeekHeader } from '../services/scheduleService';
import OfflineBanner from '../components/OfflineBanner';
import Chevron from '../components/Chevron';
import { colors, layout, radius } from '../theme';

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

function typeInfo(type) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('лек')) return { dot: '#7fa3c9', label: 'Лекция' };
  if (t.includes('лаб')) return { dot: colors.warn, label: 'Лаб. работа' };
  if (t.includes('пр') || t.includes('прак')) return { dot: colors.good, label: 'Практика' };
  if (t.includes('тест') || t.includes('фэпо')) return { dot: colors.bad, label: type };
  return { dot: colors.muted, label: type };
}

function LessonCard({ lesson, isToday }) {
  const tc = typeInfo(lesson.type);
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const match = String(lesson.time || '').match(/(\d{1,2})\D+(\d{2})/);
  const lessonMinutes = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  const isCurrent = isToday && lessonMinutes >= 0 && Math.abs(lessonMinutes - currentMinutes) <= 50;
  const meta = [lesson.room ? `каб. ${lesson.room}` : '', lesson.teacher].filter(Boolean).join(' · ');

  return (
    <View style={styles.lessonCard}>
      {isCurrent ? <View style={styles.lessonRule} /> : null}
      <View style={styles.lessonTop}>
        <Text style={styles.lessonTime}>{lesson.time || '—'}</Text>
        {tc ? (
          <View style={styles.type}>
            <View style={[styles.typeDot, { backgroundColor: tc.dot }]} />
            <Text style={styles.typeText} numberOfLines={1}>{tc.label}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.lessonSubject}>{lesson.subject || 'Занятие'}</Text>
      {meta ? <Text style={styles.lessonMeta} numberOfLines={1}>{meta}</Text> : null}
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
    AsyncStorage.setItem('savedGroupName', group.name);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Расписание</Text>
      </View>

      <TouchableOpacity style={styles.groupSelector} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
        <Text style={styles.groupLabel}>Группа</Text>
        <View style={styles.groupValue}>
          <Text style={styles.groupName} numberOfLines={1}>
            {selectedGroup ? selectedGroup.name : 'Выбрать'}
          </Text>
          <Chevron direction="down" size={7} />
        </View>
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите группу</Text>
              <TouchableOpacity onPress={() => {
                setShowPicker(false);
                setSearchText('');
                setFilteredGroups(groups);
              }} activeOpacity={0.7}>
                <Text style={styles.modalClose}>Закрыть</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Поиск группы"
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
            />
            {loadingGroups ? (
              <ActivityIndicator color={colors.accent} style={styles.modalLoading} />
            ) : (
              <FlatList
                data={filteredGroups}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = selectedGroup?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={styles.groupItem}
                      onPress={() => handleSelectGroup(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.groupItemText, active && styles.groupItemTextActive]}>
                        {item.name}
                      </Text>
                      {active ? <View style={styles.groupItemDot} /> : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>Загрузка</Text>
        </View>
      ) : schedule ? (
        <View style={styles.flex}>
          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.weekBtn} onPress={() => changeWeek(-1)} activeOpacity={0.7}>
              <Chevron direction="left" size={6} color={colors.text2} />
              <Text style={styles.weekBtnText}>Пред.</Text>
            </TouchableOpacity>
            <Text style={styles.weekTitle} numberOfLines={1}>{weekHeader || 'Неделя'}</Text>
            <TouchableOpacity style={styles.weekBtn} onPress={() => changeWeek(1)} activeOpacity={0.7}>
              <Text style={styles.weekBtnText}>След.</Text>
              <Chevron direction="right" size={6} color={colors.text2} />
            </TouchableOpacity>
          </View>

          <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

          <ScrollView contentContainerStyle={styles.feed}>
            {!hasAnyLesson ? (
              <View style={styles.emptyWeek}>
                <Text style={styles.emptyTitle}>На этой неделе пар нет</Text>
                <Text style={styles.emptyText}>Проверьте другую неделю или группу</Text>
              </View>
            ) : days.map((day, index) => {
              const lessons = day?.lessons || [];
              const isToday = week === 0 && index === todayIndex;
              return (
                <View key={`${day?.name || index}-${index}`} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View>
                      <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                        {day?.name || DAYS_FULL[index] || DAYS_SHORT[index] || `День ${index + 1}`}
                      </Text>
                      {isToday ? <View style={styles.todayRule} /> : null}
                    </View>
                    <Text style={styles.dayMeta} numberOfLines={1}>
                      {day?.header || (lessons.length ? `${lessons.length} ${pluralLessons(lessons.length)}` : '')}
                    </Text>
                  </View>

                  {lessons.length ? lessons.map((lesson, i) => (
                    <LessonCard key={`${lesson.time}-${i}`} lesson={lesson} isToday={isToday} />
                  )) : (
                    <Text style={styles.dayEmpty}>Пар нет</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : !selectedGroup ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Выберите группу</Text>
          <Text style={styles.emptyText}>Список групп открывается по нажатию на строку выше</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  header: { paddingHorizontal: layout.page, paddingTop: layout.top, paddingBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '600' },

  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    height: 52,
    marginHorizontal: layout.page,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  groupLabel: { color: colors.muted, fontSize: 12, lineHeight: 16 },
  groupValue: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  groupName: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '500', flexShrink: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.page,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  modalClose: { color: colors.text2, fontSize: 13, lineHeight: 17, fontWeight: '500' },
  modalSearch: {
    height: 44,
    marginHorizontal: layout.page,
    marginTop: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 14,
  },
  modalLoading: { marginVertical: 24 },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: layout.page,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  groupItemText: { color: colors.text2, fontSize: 15, lineHeight: 20 },
  groupItemTextActive: { color: colors.accent, fontWeight: '500' },
  groupItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.page,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  weekBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  weekBtnText: { color: colors.text2, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  weekTitle: { color: colors.muted, fontSize: 12, lineHeight: 16, flex: 1, textAlign: 'center' },

  feed: { paddingHorizontal: layout.page, paddingTop: 4, paddingBottom: 32 },
  daySection: { marginTop: 20 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  dayName: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  dayNameToday: { color: colors.accent },
  todayRule: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.accent, marginTop: 4 },
  dayMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, flexShrink: 1, textAlign: 'right' },
  dayEmpty: { color: colors.muted, fontSize: 12, lineHeight: 16, paddingVertical: 6 },

  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lessonRule: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  lessonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  lessonTime: {
    color: colors.text2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  type: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeText: { color: colors.muted, fontSize: 12, lineHeight: 16, flexShrink: 1 },
  lessonSubject: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '500', marginTop: 6 },
  lessonMeta: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  emptyWeek: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 6, textAlign: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 },
});
