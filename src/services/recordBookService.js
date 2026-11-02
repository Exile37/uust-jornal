// =========================
// RECORD BOOK SERVICE — зачётная книжка
// Сначала пробуем страницу личного кабинета, если прокси ещё не обновлён —
// собираем книжку из журнала, чтобы экран не оставался пустым.
// =========================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCache, loadCache, cacheKey } from './cacheService';
import { fetchSubjects, fetchGrades } from './subjectsService';

const PROXY_URL = 'https://uust-proxy.onrender.com';

function semesterTitle(raw) {
  const value = String(raw || '').trim();
  const match = value.match(/(\d+)\s*(семестр|сем\.)/i) || value.match(/^(\d+)$/);
  if (match) return `${match[1]} семестр`;
  return value || 'Дисциплины';
}

function semesterOrder(title) {
  const match = String(title || '').match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function averageOf(grades) {
  const numbers = grades
    .map((grade) => parseInt(String(grade).trim(), 10))
    .filter((number) => number >= 2 && number <= 5);
  if (!numbers.length) return null;
  return numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
}

async function fetchFromLk() {
  const resp = await fetch(`${PROXY_URL}/api/recordbook`);
  if (resp.status === 401) throw new Error('auth');
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Сервер не отвечает'); }
  if (data.error === 'auth') throw new Error('auth');
  if (data.error) throw new Error(data.error);
  return { ...data, source: 'lk' };
}

async function buildFromJournal() {
  const subjectsResult = await fetchSubjects();
  const subjects = subjectsResult.data || [];
  if (!subjects.length) return null;

  const groupName = await AsyncStorage.getItem('savedGroupName');
  const results = await Promise.allSettled(subjects.map((subject) => fetchGrades(subject.url)));

  const semesters = new Map();
  const allGrades = [];
  let debts = 0;

  subjects.forEach((subject, index) => {
    const result = results[index];
    const lessons = result.status === 'fulfilled' ? result.value.data || [] : [];
    const gradeValues = lessons
      .map((lesson) => String(lesson.grade || '').trim())
      .filter((grade) => grade && grade !== '-');
    const average = averageOf(gradeValues);

    gradeValues.forEach((grade) => {
      allGrades.push(grade);
      if (String(grade).trim() === '2') debts += 1;
    });

    const title = semesterTitle(subject.semestr);
    if (!semesters.has(title)) semesters.set(title, []);
    semesters.get(title).push({
      name: subject.name || 'Дисциплина',
      teacher: subject.teacher || '',
      control: '',
      date: '',
      grade: '',
      average: average != null ? average.toFixed(2) : '',
      credits: '',
      hours: '',
    });
  });

  const sorted = [...semesters.entries()]
    .map(([title, disciplines]) => ({ title, disciplines }))
    .sort((a, b) => semesterOrder(a.title) - semesterOrder(b.title));

  const average = averageOf(allGrades);
  return {
    student: {
      name: '',
      group: groupName || '',
      faculty: '',
      recordBook: '',
    },
    semesters: sorted,
    summary: {
      average: average != null ? Number(average.toFixed(2)) : null,
      credits: null,
      debts,
      total: subjects.length,
    },
    source: 'journal',
  };
}

export async function fetchRecordBook() {
  const key = cacheKey('recordbook');

  try {
    const data = await fetchFromLk();
    await saveCache(key, data);
    return { data, fromCache: false, source: 'lk' };
  } catch (error) {
    if (error.message === 'auth') throw error;

    try {
      const data = await buildFromJournal();
      if (data && data.semesters.length) {
        await saveCache(key, data);
        return { data, fromCache: false, source: 'journal' };
      }
    } catch (journalError) {
      if (journalError.message === 'auth') throw journalError;
    }

    const cached = await loadCache(key);
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
        cacheAge: cached.age,
        source: cached.data?.source || 'lk',
      };
    }
    throw error;
  }
}
