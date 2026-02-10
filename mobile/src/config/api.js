import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 서버 IP 설정
// Android 에뮬레이터: 10.0.2.2
// iOS 시뮬레이터: localhost
// 실기기: 컴퓨터 IP 주소
//
// 자동 감지가 안 될 경우 아래 값을 직접 수정하세요:
const MANUAL_SERVER_IP = null; // 예: '192.168.0.100'
const SERVER_PORT = 3001;

const getBaseUrl = () => {
  // 수동 설정이 있으면 우선 사용
  if (MANUAL_SERVER_IP) {
    return `http://${MANUAL_SERVER_IP}:${SERVER_PORT}`;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android 에뮬레이터
      return `http://10.0.2.2:${SERVER_PORT}`;
    }
    if (Platform.OS === 'ios') {
      return `http://localhost:${SERVER_PORT}`;
    }

    // 웹 또는 실기기 - Expo debuggerHost에서 IP 자동 감지
    try {
      const debuggerHost = Constants.expoConfig?.hostUri
        || Constants.manifest?.debuggerHost
        || Constants.manifest2?.extra?.expoGo?.debuggerHost;
      if (debuggerHost) {
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:${SERVER_PORT}`;
      }
    } catch (e) {
      console.warn('서버 IP 자동 감지 실패:', e.message);
    }

    // fallback: 같은 호스트
    return `http://localhost:${SERVER_PORT}`;
  }
  // Production - Render.com 클라우드 서버
  return 'https://exam-grading-app-sjem.onrender.com';
};

const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 30000,
  ENDPOINTS: {
    // Auth
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    GUEST: '/api/v1/auth/guest',
    PROFILE: '/api/v1/auth/profile',

    // Exam
    UPLOAD: '/api/v1/exam/upload',
    EXAM_LIST: '/api/v1/exam',
    EXAM_DETAIL: '/api/v1/exam', // + /:examId

    // OCR
    OCR_PROCESS: '/api/v1/ocr/process',
    OCR_RESULTS: '/api/v1/ocr', // + /:examId/results

    // Grading
    GRADE: '/api/v1/grading/grade',
    GRADING_RESULT: '/api/v1/grading', // + /:examId/result
    GRADING_HISTORY: '/api/v1/grading/history/all',

    // Health
    HEALTH: '/health',
  },
};

export default API_CONFIG;
