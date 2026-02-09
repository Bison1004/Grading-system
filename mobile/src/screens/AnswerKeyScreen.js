import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gradeExam } from '../services/apiService';

const TYPE_LABELS = {
  multiple_choice: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};

const TYPE_COLORS = {
  multiple_choice: '#3B82F6',
  short_answer: '#8B5CF6',
  essay: '#F59E0B',
};

export default function AnswerKeyScreen({ route, navigation }) {
  const { examId, ocrResults = [], totalQuestions } = route.params || {};
  const [answers, setAnswers] = useState(
    ocrResults.map(q => ({
      questionNumber: q.questionNumber,
      type: q.type,
      studentAnswer: q.recognizedText || '',
      correctAnswer: '',
      points: q.points || (q.type === 'essay' ? 10 : q.type === 'short_answer' ? 5 : 3),
    }))
  );
  const [grading, setGrading] = useState(false);

  const updateAnswer = (index, field, value) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // 샘플 정답 자동 입력 (테스트용)
  const autoFillSample = () => {
    const sampleAnswers = [
      '③', 'goes', '②', 'beautiful', '④',
      'went', 'taller', '①', 'I am a student',
      'I study hard because I want to get good grades.',
    ];

    setAnswers(prev =>
      prev.map((a, i) => ({
        ...a,
        correctAnswer: sampleAnswers[i] || '',
      }))
    );
  };

  // 채점 실행
  const handleGrade = async () => {
    const unanswered = answers.filter(a => !a.correctAnswer.trim());
    if (unanswered.length > 0) {
      Alert.alert(
        '정답 미입력',
        `${unanswered.length}개 문제의 정답이 입력되지 않았습니다.\n그래도 채점하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '채점', onPress: () => executeGrading() },
        ]
      );
      return;
    }
    executeGrading();
  };

  const executeGrading = async () => {
    setGrading(true);
    try {
      const answerKey = answers.map(a => ({
        questionNumber: a.questionNumber,
        type: a.type,
        correctAnswer: a.correctAnswer,
        points: a.points,
      }));

      const result = await gradeExam(examId, answerKey);

      if (!result.success) {
        throw new Error(result.error?.message || '채점 실패');
      }

      navigation.navigate('Result', {
        examId,
        gradingResult: result.data,
      });
    } catch (error) {
      console.error('채점 오류:', error);
      Alert.alert('채점 오류', error.message || '채점에 실패했습니다.');
    } finally {
      setGrading(false);
    }
  };

  if (grading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingTitle}>🤖 AI 채점 중...</Text>
          <Text style={styles.loadingSubtext}>객관식, 단답형, 서술형을 분석하고 있습니다</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 요약 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>인식된 문제: {totalQuestions}개</Text>
          <TouchableOpacity style={styles.sampleButton} onPress={autoFillSample}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
            <Text style={styles.sampleButtonText}>샘플 정답</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.typeChips}>
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const count = answers.filter(a => a.type === type).length;
            if (count === 0) return null;
            return (
              <View key={type} style={[styles.chip, { backgroundColor: TYPE_COLORS[type] + '20' }]}>
                <View style={[styles.chipDot, { backgroundColor: TYPE_COLORS[type] }]} />
                <Text style={[styles.chipText, { color: TYPE_COLORS[type] }]}>
                  {label} {count}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 문제 목록 */}
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }}>
        {answers.map((item, index) => (
          <View key={index} style={styles.questionCard}>
            {/* 문제 헤더 */}
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>{item.questionNumber}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + '15' }]}>
                <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] }]}>
                  {TYPE_LABELS[item.type]}
                </Text>
              </View>
              <Text style={styles.pointsText}>{item.points}점</Text>
            </View>

            {/* 학생 답안 (읽기 전용) */}
            <View style={styles.studentAnswerBox}>
              <Text style={styles.fieldLabel}>📝 학생 답안 (OCR 인식)</Text>
              <Text style={styles.studentAnswerText}>
                {item.studentAnswer || '(인식된 답안 없음)'}
              </Text>
            </View>

            {/* 정답 입력 */}
            <View style={styles.correctAnswerBox}>
              <Text style={styles.fieldLabel}>✅ 정답</Text>
              <TextInput
                style={[
                  styles.answerInput,
                  item.type === 'essay' && styles.essayInput,
                ]}
                value={item.correctAnswer}
                onChangeText={(text) => updateAnswer(index, 'correctAnswer', text)}
                placeholder={
                  item.type === 'multiple_choice' ? '1~5 입력' :
                  item.type === 'essay' ? '모범 답안을 입력하세요...' :
                  '정답을 입력하세요'
                }
                multiline={item.type === 'essay'}
                numberOfLines={item.type === 'essay' ? 3 : 1}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* 배점 조정 */}
            <View style={styles.pointsRow}>
              <Text style={styles.fieldLabel}>🎯 배점</Text>
              <View style={styles.pointsControl}>
                <TouchableOpacity
                  style={styles.pointsBtn}
                  onPress={() => updateAnswer(index, 'points', Math.max(1, item.points - 1))}
                >
                  <Ionicons name="remove" size={16} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.pointsValue}>{item.points}</Text>
                <TouchableOpacity
                  style={styles.pointsBtn}
                  onPress={() => updateAnswer(index, 'points', Math.min(20, item.points + 1))}
                >
                  <Ionicons name="add" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 하단 채점 버튼 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>
            총 {answers.reduce((sum, a) => sum + a.points, 0)}점 만점
          </Text>
          <Text style={styles.bottomInfoSub}>
            정답 입력: {answers.filter(a => a.correctAnswer.trim()).length}/{answers.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.gradeButton} onPress={handleGrade}>
          <Ionicons name="checkmark-done" size={22} color="#fff" />
          <Text style={styles.gradeButtonText}>채점하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sampleButtonText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
  },
  typeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  questionNumberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pointsText: {
    marginLeft: 'auto',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  studentAnswerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  studentAnswerText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  correctAnswerBox: {
    marginBottom: 10,
  },
  answerInput: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  essayInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    gap: 0,
  },
  pointsBtn: {
    padding: 8,
  },
  pointsValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    paddingHorizontal: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomInfoText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  bottomInfoSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  gradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
});
