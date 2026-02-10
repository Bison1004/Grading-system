# 영어시험 자동 채점 앱 - 클라우드 배포 가이드

## Render.com 배포 (무료)

### 1단계: Render.com 계정 생성

1. https://render.com 접속
2. **Get Started for Free** 클릭
3. **GitHub** 계정으로 로그인 (GitHub: Bison1004)

### 2단계: 새 Web Service 생성

**방법 A: Blueprint (자동 - 권장)**

1. Render 대시보드에서 **Blueprints** 클릭
2. **New Blueprint Instance** 클릭
3. GitHub 저장소 `Bison1004/Grading-system` 연결
4. `render.yaml` 을 자동 감지하여 설정이 적용됨
5. **Apply** 클릭 → 자동 빌드 & 배포 시작

**방법 B: 수동 설정**

1. Render 대시보드 → **New** → **Web Service**
2. GitHub 저장소 `Bison1004/Grading-system` 선택
3. 아래 설정 입력:

| 항목 | 값 |
|------|-----|
| Name | `exam-grading-app` |
| Region | `Singapore (Southeast Asia)` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node src/server.js` |
| Plan | `Free` |

4. **Environment Variables** 추가:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `HOST` | `0.0.0.0` |
| `JWT_SECRET` | (Generate 클릭) |
| `OCR_MODE` | `mock` |
| `AI_MODE` | `mock` |
| `UPLOAD_DIR` | `/tmp/uploads` |
| `DB_PATH` | `/tmp/data/exam_grading.db` |

5. **Create Web Service** 클릭

### 3단계: 배포 확인

- 빌드 완료까지 약 2~5분 소요
- 배포 성공 시 URL 발급: `https://exam-grading-app-xxxx.onrender.com`
- Health 체크: `https://your-url.onrender.com/health`

### 4단계: 테스트

브라우저에서 배포된 URL 접속 → 웹 채점 앱 로드됨

```
https://exam-grading-app-xxxx.onrender.com        → 웹 앱
https://exam-grading-app-xxxx.onrender.com/health  → 서버 상태
https://exam-grading-app-xxxx.onrender.com/dashboard → 대시보드
```

### 5단계: 모바일 앱 연결

모바일 앱에서 클라우드 서버에 접속하려면:

1. `mobile/src/config/api.js` 파일 열기
2. `MANUAL_SERVER_IP`를 Render URL로 변경:

```javascript
const MANUAL_SERVER_IP = 'exam-grading-app-xxxx.onrender.com';
```

3. `API_BASE_URL`에서 포트 제거하고 https 사용:

```javascript
const API_BASE_URL = `https://${SERVER_IP}`;
```

---

## 중요 사항

### 무료 플랜 제한

| 항목 | 내용 |
|------|------|
| 슬립 모드 | 15분 비활성 시 서버 자동 중지, 다음 요청 시 ~30초 후 재시작 |
| 데이터 유지 | 서버 재시작/재배포 시 SQLite DB 및 업로드 파일 초기화 |
| 월 사용량 | 750시간/월 (1개 서비스 기준 충분) |
| 빌드 시간 | 월 400분 제한 |

### 데이터 영속성이 필요한 경우

무료 플랜에서 DB 데이터가 초기화되는 것이 문제라면:

1. **유료 플랜** ($7/월) → 영구 디스크 사용 가능
2. **PostgreSQL 전환** → Render 무료 PostgreSQL 사용 (별도 코드 수정 필요)
3. **현 상태 유지** → 학교 수업용/데모용으로는 충분 (매 세션마다 새로 시작)

### 실제 OCR/AI 기능 활성화

현재 mock 모드로 배포됩니다. 실제 기능을 사용하려면:

1. Render Environment Variables에서 수정:
   - `OCR_MODE` → `google` + `GOOGLE_APPLICATION_CREDENTIALS` 추가
   - `AI_MODE` → `openai` + `OPENAI_API_KEY` 추가
2. 비용 발생 주의 (Google Vision API, OpenAI API)

---

## 배포 후 업데이트 방법

코드를 수정한 후:

```bash
git add -A
git commit -m "update: 변경 내용 설명"
git push origin main
```

→ Render가 자동으로 감지하여 재빌드 & 재배포 (약 2~5분)
