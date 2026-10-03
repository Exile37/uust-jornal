import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

// Мемоизированный компонент карточки оценки
const GradeItem = React.memo(({ item }) => (
  <View style={styles.card}>
    <View style={styles.info}>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.date}>{item.date || 'Текущий семестр'}</Text>
    </View>
    <View style={[styles.badge, { backgroundColor: item.grade >= 4 ? '#4CAF50' : '#FF9800' }]}>
      <Text style={styles.gradeText}>{item.grade}</Text>
    </View>
  </View>
));

export default function GradesScreen({ gradesData = [] }) {
  // Вычисление среднего балла с помощью useMemo (не пересчитывается при ререндерах)
  const averageGrade = useMemo(() => {
    if (!gradesData || gradesData.length === 0) return '0.0';
    const sum = gradesData.reduce((acc, curr) => acc + (Number(curr.grade) || 0), 0);
    return (sum / gradesData.length).toFixed(2);
  }, [gradesData]);

  // Оптимизированный рендер элементов списка
  const renderItem = useCallback(({ item }) => <GradeItem item={item} />, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Средний балл</Text>
        <Text style={styles.headerValue}>{averageGrade}</Text>
      </View>

      <FlashList
        data={gradesData}
        renderItem={renderItem}
        estimatedItemSize={72}
        keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 16 },
  headerCard: {
    backgroundColor: '#0052cc',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: 'center',
  },
  headerTitle: { color: '#ffffff', fontSize: 14, opacity: 0.8 },
  headerValue: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  info: { flex: 1, marginRight: 10 },
  subject: { fontSize: 16, fontWeight: '600', color: '#333' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});