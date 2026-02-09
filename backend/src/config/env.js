require('dotenv').config();

const config = {
  // 서버 설정
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // OCR
  ocr: {
    mode: process.env.OCR_MODE || 'mock', // 'google', 'mock'
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  // AI 채점
  ai: {
    mode: process.env.AI_MODE || 'mock', // 'openai', 'mock'
    openaiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  },

  // 파일 업로드
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    maxFiles: parseInt(process.env.MAX_FILES || '10'),
  },

  // 데이터베이스
  db: {
    path: process.env.DB_PATH || './data/exam_grading.db',
  },

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS || '*',

  // 채점 설정
  grading: {
    fuzzyThreshold: parseFloat(process.env.FUZZY_MATCH_THRESHOLD || '0.7'),
    shortAnswerThreshold: parseFloat(process.env.SHORT_ANSWER_THRESHOLD || '0.8'),
  },
};

module.exports = config;
