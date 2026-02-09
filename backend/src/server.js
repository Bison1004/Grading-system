require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');

// DB 초기화 (import 시 자동 실행)
require('./config/database');

// Routes
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const gradingRoutes = require('./routes/gradingRoutes');

const app = express();

// ========== 미들웨어 ==========

// 보안 헤더 (로컬 네트워크 앱이므로 CSP 완화)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// 요청 로그
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// CORS
app.use(cors({
  origin: config.allowedOrigins === '*' ? '*' : config.allowedOrigins.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } },
});
app.use('/api/', limiter);

// Body 파싱
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 업로드 디렉토리 생성
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 정적 파일 서빙 (업로드된 이미지)
app.use('/uploads', express.static(uploadDir));

// 웹 앱 프론트엔드 서빙
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ========== 로컬 IP 감지 ==========
function getLocalIP() {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'YOUR_IP';
}

// ========== 관리자 대시보드 ==========
app.get('/dashboard', (req, res) => {
  const localIP = getLocalIP();
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📝 영어시험 자동 채점 시스템</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 20px; padding: 40px; max-width: 650px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 15px; }
    .open-app { display: block; background: linear-gradient(135deg, #2563EB, #7C3AED); color: white; text-align: center; padding: 18px 24px; border-radius: 14px; font-size: 20px; font-weight: 700; text-decoration: none; margin-bottom: 24px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(37,99,235,0.4); }
    .open-app:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(37,99,235,0.5); }
    .open-app small { display: block; font-size: 13px; font-weight: 400; opacity: 0.85; margin-top: 4px; }
    .status { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .badge { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .badge.ok { background: #d4edda; color: #155724; }
    .badge.ai { background: #cce5ff; color: #004085; }
    .badge.ocr { background: #fff3cd; color: #856404; }
    .section { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h3 { font-size: 14px; color: #888; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
    .ep { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
    .ep:last-child { border: none; }
    .method { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; min-width: 50px; text-align: center; margin-right: 12px; }
    .method.post { background: #28a745; color: white; }
    .method.get { background: #007bff; color: white; }
    .path { font-family: 'Consolas', monospace; font-size: 13px; color: #333; }
    .desc { color: #999; font-size: 12px; margin-left: auto; }
    .mobile-box { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px; padding: 24px; text-align: center; }
    .mobile-box h3 { margin-bottom: 10px; font-size: 18px; }
    .mobile-box .ip { font-family: monospace; font-size: 18px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 10px 18px; border-radius: 8px; display: inline-block; margin: 8px 0; cursor: pointer; }
    .mobile-box .ip:hover { background: rgba(255,255,255,0.3); }
    .mobile-box p { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .steps { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .step { background: #f0f4ff; border-radius: 10px; padding: 14px; text-align: center; }
    .step .num { display: inline-block; width: 28px; height: 28px; line-height: 28px; background: #2563EB; color: white; border-radius: 50%; font-size: 14px; font-weight: bold; margin-bottom: 6px; }
    .step .label { font-size: 13px; color: #333; }
    @media (max-width: 500px) { .steps { grid-template-columns: 1fr; } .card { padding: 24px; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>📝 영어시험 자동 채점 시스템</h1>
    <p class="subtitle">English Exam Auto-Grading System v1.0.0</p>
    
    <a href="/" class="open-app">
      🚀 채점 앱 열기
      <small>http://${localIP}:${config.port}</small>
    </a>

    <div class="status">
      <span class="badge ok">✅ 서버 정상</span>
      <span class="badge ai">🤖 AI: ${config.ai.mode}</span>
      <span class="badge ocr">🔍 OCR: ${config.ocr.mode}</span>
    </div>

    <div class="steps">
      <div class="step"><div class="num">1</div><div class="label">📸 시험지 촬영</div></div>
      <div class="step"><div class="num">2</div><div class="label">🔍 OCR 인식</div></div>
      <div class="step"><div class="num">3</div><div class="label">✏️ 정답 입력</div></div>
      <div class="step"><div class="num">4</div><div class="label">📊 자동 채점</div></div>
    </div>

    <div class="mobile-box">
      <h3>📱 스마트폰에서 사용하기</h3>
      <p>같은 Wi-Fi 연결 후 아래 주소를 폰 브라우저에 입력</p>
      <div class="ip" onclick="navigator.clipboard.writeText('http://${localIP}:${config.port}')">http://${localIP}:${config.port}</div>
      <p>👆 클릭하면 주소가 복사됩니다</p>
      <p style="margin-top:12px; font-size:12px; opacity:0.7;">같은 Wi-Fi에 연결된 기기에서 접속하세요</p>
    </div>

    <details style="margin-top:20px;">
      <summary style="cursor:pointer; color:#888; font-size:14px;">🔧 API Endpoints (개발자용)</summary>
      <div class="section" style="margin-top:12px;">
        <div class="ep"><span class="method post">POST</span><span class="path">/api/v1/auth/guest</span><span class="desc">게스트 로그인</span></div>
        <div class="ep"><span class="method post">POST</span><span class="path">/api/v1/exam/upload</span><span class="desc">시험지 업로드</span></div>
        <div class="ep"><span class="method post">POST</span><span class="path">/api/v1/ocr/process</span><span class="desc">OCR 인식</span></div>
        <div class="ep"><span class="method post">POST</span><span class="path">/api/v1/grading/grade</span><span class="desc">자동 채점</span></div>
        <div class="ep"><span class="method get">GET</span><span class="path">/api/v1/grading/history/all</span><span class="desc">채점 이력</span></div>
        <div class="ep"><span class="method get">GET</span><span class="path">/health</span><span class="desc">상태 확인</span></div>
      </div>
    </details>
  </div>
</body>
</html>`;
  res.type('html').send(html);
});

// ========== Health Check ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: config.nodeEnv,
    services: {
      ocr: config.ocr.mode,
      ai: config.ai.mode,
    },
  });
});

// ========== API Routes ==========
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exam', examRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/grading', gradingRoutes);

// ========== 에러 핸들링 ==========

// Multer 에러 핸들링
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: `파일 크기가 너무 큽니다. (최대 ${config.upload.maxFileSize / 1024 / 1024}MB)` },
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      success: false,
      error: { code: 'TOO_MANY_FILES', message: `파일 개수가 너무 많습니다. (최대 ${config.upload.maxFiles}개)` },
    });
  }
  next(err);
});

// 일반 에러 핸들링
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || '서버 오류가 발생했습니다.',
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `${req.method} ${req.path} - 요청한 리소스를 찾을 수 없습니다.` },
  });
});

// ========== 서버 시작 ==========
app.listen(config.port, config.host, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📝 영어시험 자동 채점 서버                    ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  🚀 서버: http://${config.host}:${config.port}            ║`);
  console.log(`║  📋 환경: ${config.nodeEnv.padEnd(36)}║`);
  console.log(`║  🔍 OCR: ${config.ocr.mode.padEnd(37)}║`);
  console.log(`║  🤖 AI:  ${config.ai.mode.padEnd(37)}║`);
  console.log(`║  💾 DB:  SQLite                                ║`);
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Health: http://localhost:${config.port}/health`);
  console.log(`  API:    http://localhost:${config.port}/api/v1/`);
  console.log('');
});

module.exports = app;
