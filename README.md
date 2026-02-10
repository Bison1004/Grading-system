# 📝 영어시험 자동 채점 앱

중학생을 위한 AI 기반 영어 시험 자동 채점 모바일 앱입니다.
핸드폰으로 시험지를 촬영하면 OCR로 답안을 인식하고, AI가 자동으로 채점합니다.

## 📸 주요 기능

| 기능 | 설명 |
|------|------|
| **시험지 촬영/업로드** | 카메라 촬영 또는 갤러리에서 이미지 선택 (최대 10장) |
| **OCR 답안 인식** | Google Vision API로 필기체 한글/영어 혼합 인식 |
| **자동 채점** | 객관식(exact match), 단답형(fuzzy match), 서술형(AI 채점) |
| **상세 피드백** | 문제별 정/오답, 유사도, 피드백 제공 |
| **채점 기록** | 이전 채점 결과 저장 및 조회 |

## 🏗️ 시스템 아키텍처

```
📱 Mobile (React Native + Expo)
    ↕ REST API (HTTP)
🖥️ Backend (Node.js + Express)
    ├── 📦 SQLite DB (채점 데이터)
    ├── 📁 Local Storage (이미지)
    ├── 🔍 OCR Service (Google Vision / Mock)
    └── 🤖 AI Service (OpenAI GPT-4 / Mock)
```

## 🚀 빠른 시작 (Windows)

### 방법 1: 원클릭 실행 (권장)

1. **`서버실행.bat`** 더블클릭 → 서버 자동 시작
2. **PC 브라우저**에서 `http://localhost:3001` 접속
3. **스마트폰**에서 화면에 표시된 IP 주소로 접속 (예: `http://192.168.x.x:3001`)

> 📱 스마트폰에서 접속이 안 되면 **`방화벽설정.bat`**을 관리자 권한으로 실행하세요.

### 방법 2: 명령어로 실행

```bash
cd backend
npm install
npm start
```

### 방법 3: Expo Go 네이티브 앱

```bash
# 터미널 1 - 서버
cd backend && npm start

# 터미널 2 - 모바일 앱
cd mobile && npm install && npx expo start
```
스마트폰에 **Expo Go** 앱 설치 후 QR 코드를 스캔합니다.

---

## 📱 다른 사람이 테스트하는 방법

### 같은 Wi-Fi 네트워크 (교실/사무실)

| 단계 | 할 일 |
|------|-------|
| 1 | 서버 운영자: `서버실행.bat` 실행 |
| 2 | 서버 운영자: 화면에 표시된 IP 주소 공유 |
| 3 | 테스터: 스마트폰 브라우저에서 `http://공유된IP:3001` 접속 |
| 4 | 시험지 촬영 → OCR 인식 → 정답 입력 → 채점 결과 확인 |

> ⚠️ **필수 조건**: 서버 PC와 스마트폰이 **같은 Wi-Fi**에 연결되어야 합니다.

### 처음 설정 시 체크리스트

- [ ] [Node.js](https://nodejs.org) 설치 (v18 이상)
- [ ] `서버실행.bat` 실행 (의존성 자동 설치됨)
- [ ] 스마트폰에서 접속 안 될 시 `방화벽설정.bat` 관리자 권한 실행
- [ ] 현재 Mock 모드 (API 키 불필요) — 실제 OCR/AI는 `.env` 설정 필요

## 📁 프로젝트 구조

```
채점시스템/
├── backend/                    # 백엔드 서버
│   ├── src/
│   │   ├── server.js          # Express 서버 진입점
│   │   ├── config/
│   │   │   ├── env.js         # 환경 설정
│   │   │   └── database.js    # SQLite DB 초기화
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT 인증
│   │   │   └── upload.js      # Multer 파일 업로드
│   │   ├── routes/
│   │   │   ├── authRoutes.js  # 인증 API
│   │   │   ├── examRoutes.js  # 시험 관리 API
│   │   │   ├── ocrRoutes.js   # OCR 처리 API
│   │   │   └── gradingRoutes.js # 채점 API
│   │   └── services/
│   │       ├── ocrService.js      # OCR 엔진 (Google Vision / Mock)
│   │       ├── aiGradingService.js # AI 채점 (GPT-4 / Mock)
│   │       └── imageService.js     # 이미지 전처리 (Sharp)
│   ├── .env                   # 환경 변수
│   └── package.json
│
├── mobile/                    # 모바일 앱
│   ├── App.js                 # 앱 진입점 + 네비게이션
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js         # API 설정
│   │   ├── screens/
│   │   │   ├── HomeScreen.js      # 홈 화면
│   │   │   ├── CameraScreen.js    # 촬영 화면
│   │   │   ├── AnswerKeyScreen.js # 정답 입력 화면
│   │   │   ├── ResultScreen.js    # 결과 화면
│   │   │   └── HistoryScreen.js   # 기록 화면
│   │   └── services/
│   │       └── apiService.js  # API 통신 모듈
│   ├── app.json               # Expo 설정
│   └── package.json
│
└── README.md
```

## 🔧 API 엔드포인트

### 인증 (Auth)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/register` | 회원가입 |
| POST | `/api/v1/auth/login` | 로그인 |
| POST | `/api/v1/auth/guest` | 게스트 토큰 발급 |
| GET | `/api/v1/auth/profile` | 프로필 조회 |

### 시험 관리 (Exam)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/exam/upload` | 시험지 이미지 업로드 |
| GET | `/api/v1/exam` | 시험 목록 조회 |
| GET | `/api/v1/exam/:examId` | 시험 상세 조회 |
| DELETE | `/api/v1/exam/:examId` | 시험 삭제 |

### OCR (문자 인식)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/ocr/process` | OCR 처리 요청 |
| GET | `/api/v1/ocr/:examId/results` | OCR 결과 조회 |

### 채점 (Grading)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/grading/grade` | 채점 실행 |
| GET | `/api/v1/grading/:examId/result` | 채점 결과 조회 |
| GET | `/api/v1/grading/history/all` | 채점 기록 조회 |

## ⚙️ 환경 설정

### Mock 모드 (기본값, API 키 불필요)
`.env` 파일에서:
```env
OCR_MODE=mock
AI_MODE=mock
```

### 실제 API 연동
```env
OCR_MODE=google
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

AI_MODE=openai
OPENAI_API_KEY=sk-your-api-key
```

## 📊 채점 알고리즘

### 객관식 (Multiple Choice)
- **Exact Match**: 정규화 후 정확히 일치 여부 판별
- 지원 형식: ①②③④⑤, 1-5, a-e

### 단답형 (Short Answer)
- **Levenshtein 편집 거리** 기반 유사도 계산
- 유사도 ≥ 80%: 정답 인정
- 유사도 ≥ 70%: 부분 점수 (유사도 비율)
- 대소문자/구두점 무시 정규화

### 서술형 (Essay)
- **AI 기반 채점** (GPT-4 / Claude)
- 키워드 매칭 (40%) + 텍스트 유사도 (40%) + 문법 (20%)
- 상세 피드백 및 놓친 키워드 안내

## 🗄️ 데이터베이스 스키마

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 정보 (학생/교사) |
| `exams` | 시험 메타데이터 |
| `exam_images` | 시험지 이미지 파일 정보 |
| `ocr_results` | OCR 인식 결과 |
| `answer_keys` | 정답 키 |
| `grading_results` | 채점 결과 요약 |
| `grading_details` | 문제별 채점 상세 |
| `study_records` | 학습 기록 |

## 🛡️ 보안

- JWT 토큰 기반 인증
- Helmet 보안 헤더
- Rate Limiting (15분당 100회)
- 파일 타입/크기 검증
- 환경 변수로 민감 정보 관리

## 📝 개발 가이드 참조

이 앱은 `영어학습앱_개발가이드.csv`의 8단계 개발 프로세스를 기반으로 설계되었습니다:

1. ✅ 프로젝트 기획 및 요구사항 정의
2. ✅ 시스템 아키텍처 설계
3. ✅ AI/OCR 서비스 선정 (Google Vision + GPT-4)
4. ✅ 프론트엔드 개발 (React Native + Expo)
5. ✅ 백엔드 및 API 개발 (Node.js + Express + SQLite)
6. ✅ AI 채점 로직 구현 (Levenshtein + 키워드 + AI)
7. ✅ 통합 테스트 및 디버깅
8. 🔲 배포 및 운영
