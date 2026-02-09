const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const ocrService = require('../services/ocrService');

const router = express.Router();

/**
 * POST /api/v1/ocr/process - OCR 처리 요청
 * Body: { examId }
 */
router.post('/process', async (req, res) => {
  try {
    const { examId } = req.body;

    if (!examId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'examId가 필요합니다.' },
      });
    }

    // 시험 존재 확인
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다.' },
      });
    }

    // 상태 업데이트
    db.prepare("UPDATE exams SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(examId);

    // 이미지 목록 조회
    const images = db.prepare('SELECT * FROM exam_images WHERE exam_id = ? ORDER BY page_number')
      .all(examId);

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_IMAGES', message: '처리할 이미지가 없습니다.' },
      });
    }

    // 각 이미지에 대해 OCR 수행
    const allQuestions = [];
    for (const image of images) {
      const ocrResult = await ocrService.extractText(image.file_path);

      if (ocrResult.success) {
        const questions = ocrService.parseQuestions(ocrResult);
        allQuestions.push(...questions);
      }
    }

    // 기존 OCR 결과 삭제
    db.prepare('DELETE FROM ocr_results WHERE exam_id = ?').run(examId);

    // OCR 결과 DB 저장
    const insertStmt = db.prepare(`
      INSERT INTO ocr_results (id, exam_id, question_number, question_type, recognized_text, confidence, points)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const savedResults = [];
    const insertMany = db.transaction((questions) => {
      for (const q of questions) {
        const id = uuidv4();
        const points = q.type === 'essay' ? 10 : q.type === 'short_answer' ? 5 : 3;

        insertStmt.run(id, examId, q.number, q.type, q.answer, q.confidence || 0.9, points);

        savedResults.push({
          id,
          questionNumber: q.number,
          type: q.type,
          recognizedText: q.answer,
          confidence: Math.round((q.confidence || 0.9) * 100) / 100,
          points,
        });
      }
    });

    insertMany(allQuestions);

    // 시험 정보 업데이트
    const totalPoints = savedResults.reduce((sum, r) => sum + r.points, 0);
    db.prepare(`
      UPDATE exams SET 
        status = 'ocr_done', 
        total_questions = ?, 
        total_points = ?,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(savedResults.length, totalPoints, examId);

    res.json({
      success: true,
      data: {
        examId,
        totalQuestions: savedResults.length,
        totalPoints,
        questions: savedResults,
        status: 'ocr_done',
      },
    });
  } catch (error) {
    console.error('OCR 처리 오류:', error);

    // 오류 시 상태 복원
    if (req.body.examId) {
      db.prepare("UPDATE exams SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(req.body.examId);
    }

    res.status(500).json({
      success: false,
      error: { code: 'OCR_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/v1/ocr/:examId/results - OCR 결과 조회
 */
router.get('/:examId/results', (req, res) => {
  const results = db.prepare(`
    SELECT * FROM ocr_results WHERE exam_id = ? ORDER BY question_number
  `).all(req.params.examId);

  if (results.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'OCR 결과가 없습니다.' },
    });
  }

  res.json({
    success: true,
    data: results.map(r => ({
      id: r.id,
      questionNumber: r.question_number,
      type: r.question_type,
      recognizedText: r.recognized_text,
      confidence: r.confidence,
      points: r.points,
    })),
  });
});

module.exports = router;
