import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkHealth, getGuestToken } from '../services/apiService';

export default function HomeScreen({ navigation }) {
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // 서버 상태 확인
      const health = await checkHealth();
      setServerStatus(health.connected);

      // 게스트 토큰 발급
      if (health.connected) {
        await getGuestToken();
      }
    } catch (error) {
      setServerStatus(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGrading = () => {
    if (!serverStatus) {
      Alert.alert(
        '서버 연결 오류',
        '백엔드 서버에 연결할 수 없습니다.\n서버가 실행 중인지 확인해주세요.',
        [
          { text: '다시 시도', onPress: initApp },
          { text: '확인', style: 'cancel' },
        ]
      );
      return;
    }
    navigation.navigate('Camera');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 카드 */}
        <View style={styles.headerCard}>
          <Text style={styles.headerEmoji}>📝</Text>
          <Text style={styles.headerTitle}>스마트 영어시험 채점</Text>
          <Text style={styles.headerSubtitle}>
            시험지를 촬영하면 AI가 자동으로 채점해드립니다
          </Text>

          {/* 서버 상태 */}
          <View style={[styles.statusBadge, { backgroundColor: loading ? '#FEF3C7' : serverStatus ? '#D1FAE5' : '#FEE2E2' }]}>
            {loading ? (
              <ActivityIndicator size="small" color="#D97706" />
            ) : (
              <Ionicons
                name={serverStatus ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={serverStatus ? '#059669' : '#DC2626'}
              />
            )}
            <Text style={[styles.statusText, { color: loading ? '#D97706' : serverStatus ? '#059669' : '#DC2626' }]}>
              {loading ? '서버 연결 중...' : serverStatus ? '서버 연결됨' : '서버 연결 안됨'}
            </Text>
          </View>
        </View>

        {/* 기능 카드 목록 */}
        <View style={styles.featureGrid}>
          <FeatureCard
            icon="camera"
            title="시험지 촬영"
            description="카메라로 시험지를 촬영하거나 갤러리에서 선택"
            color="#3B82F6"
          />
          <FeatureCard
            icon="scan"
            title="자동 인식"
            description="OCR로 답안을 자동 인식하고 문제 유형 분류"
            color="#8B5CF6"
          />
          <FeatureCard
            icon="checkmark-done"
            title="AI 채점"
            description="객관식·단답형·서술형 모두 자동 채점"
            color="#10B981"
          />
          <FeatureCard
            icon="analytics"
            title="결과 분석"
            description="상세 피드백과 오답 분석 제공"
            color="#F59E0B"
          />
        </View>

        {/* 메인 버튼 */}
        <TouchableOpacity
          style={[styles.mainButton, !serverStatus && !loading && styles.mainButtonDisabled]}
          onPress={handleStartGrading}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.mainButtonText}>시험지 촬영하기</Text>
        </TouchableOpacity>

        {/* 채점 기록 버튼 */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.8}
        >
          <Ionicons name="time" size={20} color="#2563EB" />
          <Text style={styles.secondaryButtonText}>채점 기록 보기</Text>
        </TouchableOpacity>

        {/* 사용 방법 */}
        <View style={styles.guideSection}>
          <Text style={styles.guideTitle}>📖 사용 방법</Text>
          <GuideStep number="1" text="시험지를 촬영하거나 갤러리에서 선택합니다" />
          <GuideStep number="2" text="AI가 자동으로 답안을 인식합니다" />
          <GuideStep number="3" text="정답을 입력합니다" />
          <GuideStep number="4" text="채점 결과와 피드백을 확인합니다" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ icon, title, description, color }) {
  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  );
}

function GuideStep({ number, text }) {
  return (
    <View style={styles.guideStep}>
      <View style={styles.guideNumber}>
        <Text style={styles.guideNumberText}>{number}</Text>
      </View>
      <Text style={styles.guideText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BFDBFE',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  mainButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginBottom: 24,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  guideSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  guideNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  guideText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
});
