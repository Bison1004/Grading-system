const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./env');

// DB 디렉토리 생성
const dbDir = path.dirname(path.resolve(config.db.path));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(config.db.path));

// WAL 모드 활성화 (성능 향상)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 테이블 생성
function initializeDatabase() {
  db.exec(`
    -- 사용자 테이블
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT DEFAULT 'student' CHECK(role IN ('student', 'teacher', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 시험 정보 테이블
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT DEFAULT '영어 시험',
      exam_type TEXT DEFAULT 'english',
      total_questions INTEGER DEFAULT 0,
      total_points REAL DEFAULT 0,
      status TEXT DEFAULT 'uploaded' CHECK(status IN ('uploaded', 'processing', 'ocr_done', 'graded', 'error')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 시험지 이미지 테이블
    CREATE TABLE IF NOT EXISTS exam_images (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      original_filename TEXT,
      stored_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      page_number INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- OCR 결과 테이블
    CREATE TABLE IF NOT EXISTS ocr_results (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice', 'short_answer', 'essay')),
      recognized_text TEXT,
      confidence REAL DEFAULT 0,
      bounding_box TEXT,
      points REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- 정답 키 테이블
    CREATE TABLE IF NOT EXISTS answer_keys (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice', 'short_answer', 'essay')),
      correct_answer TEXT NOT NULL,
      points REAL DEFAULT 0,
      keywords TEXT,
      rubric TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- 채점 결과 테이블
    CREATE TABLE IF NOT EXISTS grading_results (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      total_score REAL DEFAULT 0,
      total_points REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      partial_count INTEGER DEFAULT 0,
      grading_time_ms INTEGER DEFAULT 0,
      graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- 문제별 채점 상세 테이블
    CREATE TABLE IF NOT EXISTS grading_details (
      id TEXT PRIMARY KEY,
      grading_result_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_type TEXT NOT NULL,
      student_answer TEXT,
      correct_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      earned_points REAL DEFAULT 0,
      max_points REAL DEFAULT 0,
      similarity REAL DEFAULT 0,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grading_result_id) REFERENCES grading_results(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- 학습 기록 테이블
    CREATE TABLE IF NOT EXISTS study_records (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      exam_id TEXT NOT NULL,
      grading_result_id TEXT,
      weak_areas TEXT,
      notes TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (grading_result_id) REFERENCES grading_results(id)
    );

    -- 인덱스 생성
    CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
    CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
    CREATE INDEX IF NOT EXISTS idx_ocr_results_exam_id ON ocr_results(exam_id);
    CREATE INDEX IF NOT EXISTS idx_answer_keys_exam_id ON answer_keys(exam_id);
    CREATE INDEX IF NOT EXISTS idx_grading_results_exam_id ON grading_results(exam_id);
    CREATE INDEX IF NOT EXISTS idx_grading_details_result_id ON grading_details(grading_result_id);
    CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON study_records(user_id);
  `);

  console.log('✅ Database initialized successfully');
}

// 초기화 실행
initializeDatabase();

module.exports = db;
