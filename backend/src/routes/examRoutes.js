const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const upload = require('../middleware/upload');
const { optionalAuth } = require('../middleware/auth');
const imageService = require('../services/imageService');

const router = express.Router();

/**
 * POST /api/v1/exam/upload - 시험지 이미지 업로드
 */
router.post('/upload', optionalAuth, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: '업로드할 이미지 파일이 없습니다.' },
      });
    }

    const examId = uuidv4();
    // 게스트 사용자는 users 테이블에 없으므로 FK 위반 방지를 위해 NULL 처리
    const userId = (req.user && req.user.role !== 'guest') ? req.user.id : null;
    const title = req.body.title || `영어 시험 ${new Date().toLocaleDateString('ko-KR')}`;

    // 시험 레코드 생성
    db.prepare(`
      INSERT INTO exams (id, user_id, title, status)
      VALUES (?, ?, ?, 'uploaded')
    `).run(examId, userId, title);

    // 이미지 전처리 및 저장
    const imageResults = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const imageId = uuidv4();

      // 이미지 품질 검사
      const quality = await imageService.checkImageQuality(file.path);

      // 이미지 전처리
      let processedPath = file.path;
      let preprocessResult = null;
      try {
        preprocessResult = await imageService.preprocessImage(file.path);
        if (preprocessResult.success) {
          processedPath = preprocessResult.processedPath;
        }
      } catch (err) {
        console.warn('전처리 스킵:', err.message);
      }

      // DB에 이미지 정보 저장
      db.prepare(`
        INSERT INTO exam_images (id, exam_id, original_filename, stored_filename, file_path, file_size, mime_type, page_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        imageId,
        examId,
        file.originalname,
        file.filename,
        processedPath,
        file.size,
        file.mimetype,
        i + 1
      );

      imageResults.push({
        imageId,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        pageNumber: i + 1,
        quality,
        preprocessed: preprocessResult?.success || false,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        examId,
        title,
        imageCount: req.files.length,
        images: imageResults,
        status: 'uploaded',
      },
    });
  } catch (error) {
    console.error('업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/v1/exam/:examId - 시험 정보 조회
 */
router.get('/:examId', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다.' },
    });
  }

  const images = db.prepare('SELECT * FROM exam_images WHERE exam_id = ? ORDER BY page_number')
    .all(req.params.examId);

  const ocrResults = db.prepare('SELECT * FROM ocr_results WHERE exam_id = ? ORDER BY question_number')
    .all(req.params.examId);

  res.json({
    success: true,
    data: { ...exam, images, ocrResults },
  });
});

/**
 * GET /api/v1/exam - 시험 목록 조회
 */
router.get('/', optionalAuth, (req, res) => {
  const userId = req.user?.id;
  let exams;

  if (userId && !userId.startsWith('guest_')) {
    exams = db.prepare('SELECT * FROM exams WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(userId);
  } else {
    exams = db.prepare('SELECT * FROM exams ORDER BY created_at DESC LIMIT 20').all();
  }

  res.json({ success: true, data: exams });
});

/**
 * DELETE /api/v1/exam/:examId - 시험 삭제
 */
router.delete('/:examId', optionalAuth, (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.examId);
  if (!exam) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다.' },
    });
  }

  // 관련 이미지 파일 삭제
  const images = db.prepare('SELECT file_path FROM exam_images WHERE exam_id = ?')
    .all(req.params.examId);
  for (const img of images) {
    try {
      if (fs.existsSync(img.file_path)) fs.unlinkSync(img.file_path);
    } catch { /* ignore */ }
  }

  // CASCADE로 관련 데이터 모두 삭제
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.examId);

  res.json({ success: true, message: '시험이 삭제되었습니다.' });
});

module.exports = router;
