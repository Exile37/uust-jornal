import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { fetchSubjects } from '../services/subjectsService';
import { logout } from '../services/authService';
import OfflineBanner from '../components/OfflineBanner';

export default function SubjectsScreen({ onSelectSubject, onLogout }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(null);

  async function loadSubjects() {
    try {
      const result = await fetchSubjects();
      setSubjects(result.data || []);
      setFromCache(result.fromCache || false);
      setCacheAge(result.cacheAge || null);
    } catch (e) {
      if (e.message === 'auth') onLogout();
      else Alert.alert('Ошибка', e.message || 'Не удалось загрузить предметы');
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadSubjects(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(s => `${s.name || ''} ${s.teacher || ''} ${s.semestr || ''}`.toLowerCase().includes(q));
  }, [subjects, search]);

  function renderItem({ item }) {
    return <TouchableOpacity style={styles.card} onPress={() => onSelectSubject(item)} activeOpacity={0.75}>
      <View style={styles.cardTop}><Text style={styles.subjectName} numberOfLines={2}>{item.name}</Text><Text style={styles.chevron}>›</Text></View>
      <View style={styles.row}>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.semestr || '—'}</Text></View>
        <Text style={styles.teacher} numberOfLines={1}>{item.teacher || 'Преподаватель не указан'}</Text>
      </View>
    </TouchableOpacity>;
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4fc3f7" /><Text style={styles.loadingText}>Загружаем предметы...</Text></View>;

  return <View style={styles.container}>
    <View style={styles.header}>
      <View><Text style={styles.eyebrow}>ЖУРНАЛ</Text><Text style={styles.headerTitle}>Мои предметы</Text></View>
      <TouchableOpacity onPress={() => { logout(); onLogout(); }} style={styles.logoutBtn}><Text style={styles.logoutText}>Выйти</Text></TouchableOpacity>
    </View>
    <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />
    <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Поиск предмета или преподавателя" placeholderTextColor="#65798d" style={styles.search} /></View>
    <FlatList
      data={filtered} keyExtractor={(item, i) => item.url || String(i)} renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubjects(); }} tintColor="#4fc3f7" />}
      ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>{search ? 'Ничего не найдено' : 'Предметы не найдены'}</Text><Text style={styles.emptyText}>{search ? 'Попробуйте другое название.' : 'Потяните вниз, чтобы обновить.'}</Text></View>}
    />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1b2a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  eyebrow: { color: '#4fc3f7', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  headerTitle: { fontSize: 25, fontWeight: '800', color: '#e8f4fd', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#132233', borderRadius: 9, borderWidth: 1, borderColor: '#1e3a4f' }, logoutText: { color: '#ef5350', fontSize: 12, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: '#132233', borderRadius: 12, borderWidth: 1, borderColor: '#1e3a4f', paddingHorizontal: 12 }, searchIcon: { color: '#4fc3f7', fontSize: 20 }, search: { flex: 1, color: '#e8f4fd', paddingVertical: 12, paddingHorizontal: 8, fontSize: 13 },
  list: { padding: 16, paddingTop: 6, paddingBottom: 32 },
  card: { backgroundColor: '#132233', borderRadius: 15, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1e3a4f' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' }, subjectName: { flex: 1, fontSize: 15, fontWeight: '750', color: '#e8f4fd', lineHeight: 21 }, chevron: { color: '#4fc3f7', fontSize: 25, lineHeight: 20, marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11 }, badge: { backgroundColor: '#0d355c', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }, badgeText: { color: '#90caf9', fontSize: 11, fontWeight: '700' }, teacher: { color: '#8a9bb0', fontSize: 12, flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }, loadingText: { color: '#8a9bb0', marginTop: 12, fontSize: 14 }, emptyTitle: { color: '#c8ddf0', fontSize: 15, fontWeight: '700' }, emptyText: { color: '#71859b', fontSize: 12, marginTop: 5 },
});
