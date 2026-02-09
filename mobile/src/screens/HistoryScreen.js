import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGradingHistory, getGradingResult } from '../services/apiService';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const result = await getGradingHistory();
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('기록 조회 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const viewResult = async (item) => {
    try {
      const result = await getGradingResult(item.examId);
      if (result.success) {
        navigation.navigate('Result', {
          examId: item.examId,
          gradingResult: result.data,
        });
      }
    } catch (error) {
      console.error('결과 조회 오류:', error);
    }
  };

  const getGradeColor = (pct) => {
    if (pct >= 90) return '#10B981';
    if (pct >= 80) return '#3B82F6';
    if (pct >= 70) return '#F59E0B';
    if (pct >= 60) return '#F97316';
    return '#EF4444';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>기록 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>채점 기록이 없습니다</Text>
          <Text style={styles.emptyDesc}>시험지를 촬영하고 채점하면 여기에 기록됩니다</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.startButtonText}>시험지 촬영하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>총 {history.length}회 채점</Text>
            {history.length > 0 && (
              <Text style={styles.summaryAvg}>
                평균 {Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length)}%
              </Text>
            )}
          </View>

          <FlatList
            data={history}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
            }
            renderItem={({ item }) => {
              const gradeColor = getGradeColor(item.percentage);
              return (
                <TouchableOpacity
                  style={styles.historyCard}
                  onPress={() => viewResult(item)}
                  activeOpacity={0.7}
                >
                  {/* 왼쪽: 점수 원형 */}
                  <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
                    <Text style={[styles.scorePercent, { color: gradeColor }]}>
                      {item.percentage}%
                    </Text>
                  </View>

                  {/* 중앙: 정보 */}
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {item.examTitle || '영어 시험'}
                    </Text>
                    <Text style={styles.historyScore}>
                      {item.totalScore}/{item.totalPoints}점 · 정답 {item.correctCount}개
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(item.gradedAt)}</Text>
                  </View>

                  {/* 오른쪽: 화살표 */}
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.gradingResultId}
            contentContainerStyle={{ padding: 16 }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryAvg: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePercent: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  historyScore: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
