// =========================
// TASKS SERVICE
// Личные задачи и дедлайны. Хранятся локально, доступны офлайн.
// =========================
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tasks_v1';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadTasks() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function saveAll(tasks) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  return tasks;
}

export async function addTask({ title, subject, due }) {
  const tasks = await loadTasks();
  const task = {
    id: makeId(),
    title: String(title || '').trim(),
    subject: String(subject || '').trim(),
    due: due || '',
    done: false,
    createdAt: Date.now(),
  };
  if (!task.title) return tasks;
  const next = [task, ...tasks];
  return saveAll(next);
}

export async function toggleTask(id) {
  const tasks = await loadTasks();
  const next = tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : null } : t));
  return saveAll(next);
}

export async function removeTask(id) {
  const tasks = await loadTasks();
  return saveAll(tasks.filter((t) => t.id !== id));
}

export async function updateTask(id, patch) {
  const tasks = await loadTasks();
  return saveAll(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

// Ближайший дедлайн среди незавершённых.
export function nextDeadline(tasks) {
  const pending = (tasks || []).filter((t) => !t.done && t.due).sort((a, b) => a.due.localeCompare(b.due));
  return pending[0] || null;
}

// Сколько дней осталось до дедлайна: отрицательное — просрочено.
export function daysUntil(due) {
  if (!due) return null;
  const m = String(due).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
