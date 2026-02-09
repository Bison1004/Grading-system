import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPE_LABELS = {
  multiple_choice: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};

export default function ResultScreen({ route, navigation }) {
  const { gradingResult } = route.params || {};
  const { summary, details, typeStats } = gradingResult || {};

  if (!summary) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>채점 결과를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 점수 등급 계산
  const getGrade = (pct) => {
    if (pct >= 90) return { grade: 'A', color: '#10B981', emoji: '🏆' };
    if (pct >= 80) return { grade: 'B', color: '#3B82F6', emoji: '👏' };
    if (pct >= 70) return { grade: 'C', color: '#F59E0B', emoji: '👍' };
    if (pct >= 60) return { grade: 'D', color: '#F97316', emoji: '💪' };
    return { grade: 'F', color: '#EF4444', emoji: '📚' };
  };

  const gradeInfo = getGrade(summary.percentage);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 총점 카드 */}
        <View style={[styles.scoreCard, { borderColor: gradeInfo.color }]}>
          <Text style={styles.gradeEmoji}>{gradeInfo.emoji}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: gradeInfo.color }]}>
              {summary.totalScore}
            </Text>
            <Text style={styles.scoreMax}>/ {summary.totalPoints}</Text>
          </View>
          <View style={[styles.percentBadge, { backgroundColor: gradeInfo.color + '15' }]}>
            <Text style={[styles.percentText, { color: gradeInfo.color }]}>
              {summary.percentage}% ({gradeInfo.grade}등급)
            </Text>
          </View>

          {/* 통계 */}
          <View style={styles.statsRow}>
            <StatItem icon="checkmark-circle" color="#10B981" value={summary.correctCount} label="정답" />
            <StatItem icon="close-circle" color="#EF4444" value={summary.wrongCount} label="오답" />
            <StatItem icon="ellipsis-horizontal-circle" color="#F59E0B" value={summary.partialCount} label="부분" />
            <StatItem icon="time" color="#6366F1" value={`${summary.gradingTimeMs}ms`} label="소요" />
          </View>
        </View>

        {/* 유형별 분석 */}
        {typeStats && Object.keys(typeStats).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 유형별 분석</Text>
            {Object.entries(typeStats).map(([type, stat]) => {
              const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
              const pointPct = stat.maxPoints > 0 ? Math.round((stat.points / stat.maxPoints) * 100) : 0;
              return (
                <View key={type} style={styles.typeStatCard}>
                  <View style={styles.typeStatHeader}>
                    <Text style={styles.typeStatName}>{TYPE_LABELS[type] || type}</Text>
                    <Text style={styles.typeStatScore}>
                      {Math.round(stat.points * 10) / 10}/{stat.maxPoints}점
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${pointPct}%`,
                          backgroundColor: pointPct >= 80 ? '#10B981' : pointPct >= 50 ? '#F59E0B' : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.typeStatDetail}>
                    정답 {stat.correct}/{stat.total} ({accuracy}%)
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* 문제별 상세 결과 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 문제별 상세 결과</Text>
          {details?.map((item, index) => (
            <View
              key={index}
              style={[
                styles.detailCard,
                {
                  borderLeftColor: item.isCorrect ? '#10B981' : item.earnedPoints > 0 ? '#F59E0B' : '#EF4444',
                },
              ]}
            >
              {/* 문제 헤더 */}
              <View style={styles.detailHeader}>
                <View style={styles.detailLeft}>
                  <Text style={styles.detailNumber}>Q{item.questionNumber}</Text>
                  <View style={styles.detailTypeBadge}>
                    <Text style={styles.detailTypeText}>{TYPE_LABELS[item.questionType]}</Text>
                  </View>
                </View>
                <View style={styles.detailRight}>
                  <Ionicons
                    name={item.isCorrect ? 'checkmark-circle' : item.earnedPoints > 0 ? 'alert-circle' : 'close-circle'}
                    size={24}
                    color={item.isCorrect ? '#10B981' : item.earnedPoints > 0 ? '#F59E0B' : '#EF4444'}
                  />
                  <Text style={styles.detailScore}>
                    {item.earnedPoints}/{item.maxPoints}
                  </Text>
                </View>
              </View>

              {/* 답안 비교 */}
              <View style={styles.answerComparison}>
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>학생 답안</Text>
                  <Text style={[
                    styles.answerValue,
                    !item.isCorrect && styles.wrongAnswer,
                  ]}>
                    {item.studentAnswer || '(미작성)'}
                  </Text>
                </View>
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>정답</Text>
                  <Text style={[styles.answerValue, styles.correctAnswer]}>
                    {item.correctAnswer}
                  </Text>
                </View>
              </View>

              {/* 유사도 & 피드백 */}
              {item.similarity > 0 && item.similarity < 1 && (
                <View style={styles.similarityBar}>
                  <Text style={styles.similarityLabel}>유사도</Text>
                  <View style={styles.similarityBarBg}>
                    <View style={[styles.similarityBarFill, { width: `${item.similarity * 100}%` }]} />
                  </View>
                  <Text style={styles.similarityValue}>{Math.round(item.similarity * 100)}%</Text>
                </View>
              )}

              {item.feedback && !item.isCorrect && (
                <View style={styles.feedbackBox}>
                  <Ionicons name="bulb" size={14} color="#D97706" />
                  <Text style={styles.feedbackText}>{item.feedback}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home" size={20} color="#2563EB" />
          <Text style={styles.homeButtonText}>홈으로</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newExamButton}
          onPress={() => navigation.navigate('Camera')}
        >
          <Ionicons name="camera" size={20} color="#fff" />
          <Text style={styles.newExamButtonText}>새 시험 채점</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StatItem({ icon, color, value, label }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
  },

  // 총점 카드
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  gradeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 4,
  },
  percentBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  percentText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // 섹션
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },

  // 유형별 분석
  typeStatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  typeStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeStatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  typeStatScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  typeStatDetail: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // 문제별 상세
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  detailTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailTypeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  detailRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailScore: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  answerComparison: {
    gap: 6,
    marginBottom: 8,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  answerLabel: {
    fontSize: 12,
    color: '#94A3B8',
    width: 60,
    fontWeight: '600',
  },
  answerValue: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  wrongAnswer: {
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  correctAnswer: {
    color: '#10B981',
    fontWeight: '600',
  },
  similarityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  similarityLabel: {
    fontSize: 11,
    color: '#94A3B8',
    width: 40,
  },
  similarityBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  similarityBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  similarityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    width: 35,
    textAlign: 'right',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  feedbackText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },

  // 하단 바
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  homeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  homeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  newExamButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  newExamButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
