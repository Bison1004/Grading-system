import { Platform } from 'react-native';

// 서버 IP 설정
// Android 에뮬레이터: 10.0.2.2
// iOS 시뮬레이터: localhost
// 실기기: 컴퓨터 IP 주소
const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android 에뮬레이터
      return 'http://10.0.2.2:3001';
    }
    if (Platform.OS === 'ios') {
      return 'http://localhost:3001';
    }
    // 웹 또는 실기기 - 같은 네트워크 IP 사용
    return 'http://192.168.5.228:3001'; // 실제 로컬 IP
  }
  // Production
  return 'https://api.exam-grading.example.com';
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
