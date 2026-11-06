import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from 'react-native';
import { fetchSubjects } from '../services/subjectsService';
import { logout } from '../services/authService';
import OfflineBanner from '../components/OfflineBanner';
import Chevron from '../components/Chevron';
import { colors, layout, radius } from '../theme';

function semesterLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /семестр/i.test(text) ? text : `${text} семестр`;
}

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

  function renderItem({ item, index }) {
    const first = index === 0;
    const last = index === filtered.length - 1;
    const meta = [semesterLabel(item.semestr), item.teacher].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        style={[styles.row, first && styles.rowFirst, last && styles.rowLast, index > 0 && styles.rowDivider]}
        onPress={() => onSelectSubject(item)}
        activeOpacity={0.8}
      >
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.subjectName} numberOfLines={2}>{item.name}</Text>
            <Chevron direction="right" size={7} />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {meta || 'Преподаватель не указан'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Загрузка</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Предметы</Text>
        <TouchableOpacity onPress={() => { logout(); onLogout(); }} style={styles.logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner fromCache={fromCache} cacheAge={cacheAge} />

      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.url || String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubjects(); }} tintColor={colors.accent} />}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{search ? 'Ничего не найдено' : 'Предметы не найдены'}</Text>
            <Text style={styles.emptyText}>{search ? 'Попробуйте другое название' : 'Потяните вниз, чтобы обновить'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: layout.page,
    paddingTop: layout.top,
    paddingBottom: 12,
  },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '600' },
  logout: { paddingVertical: 6, paddingLeft: 12 },
  logoutText: { color: colors.text2, fontSize: 13, lineHeight: 17, fontWeight: '500' },

  searchWrap: { paddingHorizontal: layout.page, paddingTop: 12 },
  search: {
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
  },

  list: { paddingHorizontal: layout.page, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  row: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectName: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  loadingText: { color: colors.muted, fontSize: 13, marginTop: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: colors.text2, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
});
