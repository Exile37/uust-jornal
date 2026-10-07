import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  loadTasks, addTask, toggleTask, removeTask, nextDeadline, daysUntil,
} from '../services/tasksService';
import { syncTaskReminders } from '../services/notificationService';

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dueLabel(due) {
  const days = daysUntil(due);
  if (days == null) return '';
  if (days < 0) return `Просрочено на ${Math.abs(days)} дн.`;
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} дн.`;
}

function dueColor(due) {
  const days = daysUntil(due);
  if (days == null) return '#71859b';
  if (days < 0) return '#ef5350';
  if (days <= 1) return '#FF9800';
  return '#4fc3f7';
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.checkWrap} onPress={() => onToggle(task.id)}>
        <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
          {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          {task.subject ? <Text style={styles.subjectChip}>{task.subject}</Text> : null}
          {task.due ? (
            <Text style={[styles.dueChip, { color: dueColor(task.due) }]}>
              {dueLabel(task.due)} · {task.due}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(task)}>
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [due, setDue] = useState('');

  const refresh = useCallback(async () => {
    const data = await loadTasks();
    setTasks(data);
    setLoading(false);
    syncTaskReminders(data).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const pending = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due && !b.due) return b.createdAt - a.createdAt;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  }, [tasks]);
  const nearest = nextDeadline(tasks);

  async function handleAdd() {
    if (!title.trim()) {
      Alert.alert('Задача', 'Введите название задачи.');
      return;
    }
    const next = await addTask({ title, subject, due });
    setTasks(next);
    syncTaskReminders(next).catch(() => {});
    setTitle(''); setSubject(''); setDue('');
    setShowForm(false);
  }

  async function handleToggle(id) {
    const next = await toggleTask(id);
    setTasks(next);
    syncTaskReminders(next).catch(() => {});
  }

  function handleDelete(task) {
    Alert.alert('Удалить задачу?', task.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          const next = await removeTask(task.id);
          setTasks(next);
          syncTaskReminders(next).catch(() => {});
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4fc3f7" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>УЧЁБА</Text>
          <Text style={styles.title}>Задачи</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Задача</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pending.length}</Text>
            <Text style={styles.statLabel}>В РАБОТЕ</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tasks.length - pending.length}</Text>
            <Text style={styles.statLabel}>ГОТОВО</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, nearest && daysUntil(nearest.due) <= 1 ? { color: '#FF9800' } : null]}>
              {nearest ? dueLabel(nearest.due).replace('Через ', '').replace(' дн.', 'д') : '—'}
            </Text>
            <Text style={styles.statLabel}>БЛИЖАЙШИЙ</Text>
          </View>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗒️</Text>
            <Text style={styles.emptyTitle}>Задач пока нет</Text>
            <Text style={styles.emptyText}>Добавьте дедлайны по предметам — напомним заранее.</Text>
          </View>
        ) : (
          sorted.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новая задача</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Что нужно сделать?"
              placeholderTextColor="#8a9bb0"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Предмет (необязательно)"
              placeholderTextColor="#8a9bb0"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={styles.input}
              placeholder="Дедлайн: ГГГГ-ММ-ДД"
              placeholderTextColor="#8a9bb0"
              value={due}
              onChangeText={setDue}
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.quickDates}>
              <TouchableOpacity style={styles.quickDate} onPress={() => setDue(todayISO(0))}><Text style={styles.quickDateText}>Сегодня</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quickDate} onPress={() => setDue(todayISO(1))}><Text style={styles.quickDateText}>Завтра</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quickDate} onPress={() => setDue(todayISO(7))}><Text style={styles.quickDateText}>+ неделя</Text></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1b2a' },
  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  eyebrow: { color: '#4fc3f7', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#e8f4fd', fontSize: 30, fontWeight: '800', marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1565c0' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  content: { paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#132233', borderRadius: 15, borderWidth: 1, borderColor: '#1e3a4f', padding: 14 },
  statValue: { color: '#4fc3f7', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#71859b', fontSize: 9, fontWeight: '700', marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#132233', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1e3a4f',
  },
  checkWrap: { marginRight: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#4fc3f7',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: '#4fc3f7', borderColor: '#4fc3f7' },
  checkMark: { color: '#0d1b2a', fontSize: 13, fontWeight: '900' },
  cardBody: { flex: 1 },
  taskTitle: { color: '#e8f4fd', fontSize: 15, fontWeight: '700' },
  taskTitleDone: { color: '#566b80', textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6, gap: 8 },
  subjectChip: {
    color: '#c8ddf0', fontSize: 11, backgroundColor: '#1e3a4f',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },
  dueChip: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 6, paddingVertical: 6, marginLeft: 6 },
  deleteIcon: { color: '#566b80', fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#e8f4fd', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8a9bb0', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#132233', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#e8f4fd', fontSize: 18, fontWeight: '700' },
  modalClose: { color: '#8a9bb0', fontSize: 20 },
  input: {
    backgroundColor: '#0d1b2a', borderRadius: 10, padding: 13, marginBottom: 12,
    color: '#e8f4fd', fontSize: 15, borderWidth: 1, borderColor: '#1e3a4f',
  },
  quickDates: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  quickDate: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: '#1e3a4f', alignItems: 'center' },
  quickDateText: { color: '#4fc3f7', fontSize: 12, fontWeight: '700' },
  saveBtn: { backgroundColor: '#1565c0', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
