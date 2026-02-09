import axios from 'axios';
import API_CONFIG from '../config/api';

// Axios 인스턴스
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 토큰 설정
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const message = error.response?.data?.error?.message || error.message || '서버 연결 오류';
    console.error(`❌ API Error: ${message}`);
    return Promise.reject(error);
  }
);

// ========== API 함수 ==========

/**
 * 게스트 토큰 발급
 */
export const getGuestToken = async () => {
  const response = await api.post(API_CONFIG.ENDPOINTS.GUEST);
  if (response.data.success) {
    setAuthToken(response.data.data.token);
  }
  return response.data;
};

/**
 * 로그인
 */
export const login = async (username, password) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN, { username, password });
  if (response.data.success) {
    setAuthToken(response.data.data.token);
  }
  return response.data;
};

/**
 * 회원가입
 */
export const register = async (userData) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.REGISTER, userData);
  if (response.data.success) {
    setAuthToken(response.data.data.token);
  }
  return response.data;
};

/**
 * 시험지 이미지 업로드
 */
export const uploadExam = async (images, title = '') => {
  const formData = new FormData();

  images.forEach((image, index) => {
    const uri = image.uri;
    const filename = image.fileName || `exam_${Date.now()}_${index}.jpg`;
    const type = image.type || 'image/jpeg';

    formData.append('images', {
      uri,
      name: filename,
      type,
    });
  });

  if (title) {
    formData.append('title', title);
  }

  const response = await api.post(API_CONFIG.ENDPOINTS.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return response.data;
};

/**
 * OCR 처리 요청
 */
export const processOCR = async (examId) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.OCR_PROCESS, { examId });
  return response.data;
};

/**
 * 채점 요청
 */
export const gradeExam = async (examId, answerKey, options = {}) => {
  const response = await api.post(API_CONFIG.ENDPOINTS.GRADE, {
    examId,
    answerKey,
    gradingOptions: options,
  });
  return response.data;
};

/**
 * 채점 결과 조회
 */
export const getGradingResult = async (examId) => {
  const response = await api.get(`${API_CONFIG.ENDPOINTS.GRADING_RESULT}/${examId}/result`);
  return response.data;
};

/**
 * 채점 기록 조회
 */
export const getGradingHistory = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.GRADING_HISTORY);
  return response.data;
};

/**
 * 시험 목록 조회
 */
export const getExamList = async () => {
  const response = await api.get(API_CONFIG.ENDPOINTS.EXAM_LIST);
  return response.data;
};

/**
 * 서버 상태 확인
 */
export const checkHealth = async () => {
  try {
    const response = await api.get(API_CONFIG.ENDPOINTS.HEALTH, { timeout: 5000 });
    return { connected: true, data: response.data };
  } catch {
    return { connected: false, error: '서버에 연결할 수 없습니다.' };
  }
};

export default api;
