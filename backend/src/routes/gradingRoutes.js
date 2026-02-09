const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const config = require('../config/env');
const aiGradingService = require('../services/aiGradingService');

const router = express.Router();

// ========== 채점 알고리즘 유틸 ==========

/**
 * 객관식 답안 정규화
 */
function normalizeMultipleChoice(answer) {
  if (!answer) return '';
  const str = answer.toString().trim();

  const circleMap = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };
  if (circleMap[str]) return circleMap[str];

  const letterMap = { 'a': '1', 'b': '2', 'c': '3', 'd': '4', 'e': '5' };
  if (letterMap[str.toLowerCase()]) return letterMap[str.toLowerCase()];

  const numMatch = str.match(/(\d)/);
  if (numMatch) return numMatch[1];

  return str;
}

/**
 * Levenshtein 편집 거리
 */
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/**
 * 유사도 계산
 */
function calculateSimilarity(str1, str2) {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / Math.max(str1.length, str2.length);
}

/**
 * 객관식 채점
 */
function gradeMultipleChoice(studentAnswer, correctAnswer, maxPoints) {
  const normalized = normalizeMultipleChoice(studentAnswer);
  const normalizedCorrect = normalizeMultipleChoice(correctAnswer);
  const isCorrect = normalized === normalizedCorrect;

  return {
    isCorrect,
    earnedPoints: isCorrect ? maxPoints : 0,
    similarity: isCorrect ? 1 : 0,
    feedback: isCorrect ? '정답입니다! ✅' : `오답입니다. 정답: ${correctAnswer}`,
  };
}

/**
 * 단답형 채점 (Fuzzy Match)
 */
function gradeShortAnswer(studentAnswer, correctAnswer, maxPoints) {
  if (!studentAnswer || studentAnswer.trim().length === 0) {
    return {
      isCorrect: false,
      earnedPoints: 0,
      similarity: 0,
      feedback: '답안이 작성되지 않았습니다.',
    };
  }

  const studentNorm = studentAnswer.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  const correctNorm = correctAnswer.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');

  // 정확히 일치
  if (studentNorm === correctNorm) {
    return {
      isCorrect: true,
      earnedPoints: maxPoints,
      similarity: 1,
      feedback: '정답입니다! ✅',
    };
  }

  // 유사도 계산
  const similarity = calculateSimilarity(studentNorm, correctNorm);
  const threshold = config.grading.shortAnswerThreshold;

  if (similarity >= threshold) {
    return {
      isCorrect: true,
      earnedPoints: maxPoints,
      similarity,
      feedback: `정답으로 인정합니다. (유사도: ${Math.round(similarity * 100)}%)`,
    };
  }

  // 부분 점수 (fuzzy threshold 이상)
  if (similarity >= config.grading.fuzzyThreshold) {
    const partialPoints = Math.round(maxPoints * similarity * 10) / 10;
    return {
      isCorrect: false,
      earnedPoints: partialPoints,
      similarity,
      feedback: `부분 점수 (유사도: ${Math.round(similarity * 100)}%). 정답: ${correctAnswer}`,
    };
  }

  return {
    isCorrect: false,
    earnedPoints: 0,
    similarity,
    feedback: `오답입니다. 정답: ${correctAnswer}`,
  };
}

// ========== 라우트 핸들러 ==========

/**
 * POST /api/v1/grading/grade - 채점 실행
 * Body: {
 *   examId,
 *   answerKey: [{ questionNumber, correctAnswer, type, points, keywords, rubric }],
 *   gradingOptions: { strictMode, partialCredit }
 * }
 */
router.post('/grade', async (req, res) => {
  const startTime = Date.now();

  try {
    const { examId, answerKey, gradingOptions = {} } = req.body;

    if (!examId || !answerKey || !Array.isArray(answerKey)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'examId와 answerKey(배열)가 필요합니다.' },
      });
    }

    // OCR 결과 조회
    const ocrResults = db.prepare(`
      SELECT * FROM ocr_results WHERE exam_id = ? ORDER BY question_number
    `).all(examId);

    if (ocrResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_OCR_DATA', message: 'OCR 결과가 없습니다. 먼저 OCR 처리를 수행해주세요.' },
      });
    }

    // 정답 키 저장
    db.prepare('DELETE FROM answer_keys WHERE exam_id = ?').run(examId);
    const insertAnswer = db.prepare(`
      INSERT INTO answer_keys (id, exam_id, question_number, question_type, correct_answer, points, keywords, rubric)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saveAnswerKeys = db.transaction(() => {
      for (const ak of answerKey) {
        insertAnswer.run(
          uuidv4(), examId, ak.questionNumber, ak.type || 'short_answer',
          ak.correctAnswer, ak.points || 0,
          ak.keywords ? JSON.stringify(ak.keywords) : null,
          ak.rubric || null
        );
      }
    });
    saveAnswerKeys();

    // ========== 채점 수행 ==========
    const details = [];
    let totalScore = 0;
    let totalPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let partialCount = 0;

    for (const ocr of ocrResults) {
      const answer = answerKey.find(a => a.questionNumber === ocr.question_number);
      if (!answer) continue;

      const maxPoints = answer.points || ocr.points || 0;
      totalPoints += maxPoints;

      let result;

      switch (ocr.question_type) {
        case 'multiple_choice':
          result = gradeMultipleChoice(ocr.recognized_text, answer.correctAnswer, maxPoints);
          break;

        case 'short_answer':
          result = gradeShortAnswer(ocr.recognized_text, answer.correctAnswer, maxPoints);
          break;

        case 'essay':
          // AI 기반 서술형 채점
          result = await aiGradingService.gradeEssay(
            ocr.recognized_text,
            answer.correctAnswer,
            {
              maxPoints,
              keywords: answer.keywords || [],
              rubric: answer.rubric || '',
            }
          );

          // AI 결과를 통일된 형식으로 변환
          result = {
            isCorrect: result.percentage >= 80,
            earnedPoints: result.score || 0,
            similarity: result.similarity || 0,
            feedback: result.feedback || '',
          };
          break;

        default:
          result = gradeShortAnswer(ocr.recognized_text, answer.correctAnswer, maxPoints);
      }

      totalScore += result.earnedPoints;
      if (result.isCorrect) correctCount++;
      else if (result.earnedPoints > 0) partialCount++;
      else wrongCount++;

      details.push({
        questionNumber: ocr.question_number,
        questionType: ocr.question_type,
        studentAnswer: ocr.recognized_text,
        correctAnswer: answer.correctAnswer,
        isCorrect: result.isCorrect,
        earnedPoints: result.earnedPoints,
        maxPoints,
        similarity: result.similarity,
        feedback: result.feedback,
      });
    }

    const gradingTimeMs = Date.now() - startTime;
    const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100 * 10) / 10 : 0;

    // 채점 결과 저장
    const gradingResultId = uuidv4();
    db.prepare(`
      INSERT INTO grading_results (id, exam_id, total_score, total_points, percentage, correct_count, wrong_count, partial_count, grading_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(gradingResultId, examId, totalScore, totalPoints, percentage, correctCount, wrongCount, partialCount, gradingTimeMs);

    // 상세 결과 저장
    const insertDetail = db.prepare(`
      INSERT INTO grading_details (id, grading_result_id, exam_id, question_number, question_type, student_answer, correct_answer, is_correct, earned_points, max_points, similarity, feedback)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saveDetails = db.transaction(() => {
      for (const d of details) {
        insertDetail.run(
          uuidv4(), gradingResultId, examId,
          d.questionNumber, d.questionType,
          d.studentAnswer, d.correctAnswer,
          d.isCorrect ? 1 : 0,
          d.earnedPoints, d.maxPoints,
          d.similarity, d.feedback
        );
      }
    });
    saveDetails();

    // 시험 상태 업데이트
    db.prepare("UPDATE exams SET status = 'graded', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(examId);

    // 유형별 통계
    const typeStats = {};
    for (const d of details) {
      if (!typeStats[d.questionType]) {
        typeStats[d.questionType] = { total: 0, correct: 0, points: 0, maxPoints: 0 };
      }
      typeStats[d.questionType].total++;
      if (d.isCorrect) typeStats[d.questionType].correct++;
      typeStats[d.questionType].points += d.earnedPoints;
      typeStats[d.questionType].maxPoints += d.maxPoints;
    }

    res.json({
      success: true,
      data: {
        gradingResultId,
        examId,
        summary: {
          totalScore: Math.round(totalScore * 10) / 10,
          totalPoints,
          percentage,
          correctCount,
          wrongCount,
          partialCount,
          totalQuestions: details.length,
          gradingTimeMs,
        },
        typeStats,
        details,
      },
    });
  } catch (error) {
    console.error('채점 오류:', error);
    res.status(500).json({
      success: false,
      error: { code: 'GRADING_ERROR', message: error.message },
    });
  }
});

/**
 * GET /api/v1/grading/:examId/result - 채점 결과 조회
 */
router.get('/:examId/result', (req, res) => {
  const result = db.prepare(`
    SELECT * FROM grading_results WHERE exam_id = ? ORDER BY graded_at DESC LIMIT 1
  `).get(req.params.examId);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '채점 결과가 없습니다.' },
    });
  }

  const details = db.prepare(`
    SELECT * FROM grading_details WHERE grading_result_id = ? ORDER BY question_number
  `).all(result.id);

  // 유형별 통계
  const typeStats = {};
  for (const d of details) {
    if (!typeStats[d.question_type]) {
      typeStats[d.question_type] = { total: 0, correct: 0, points: 0, maxPoints: 0 };
    }
    typeStats[d.question_type].total++;
    if (d.is_correct) typeStats[d.question_type].correct++;
    typeStats[d.question_type].points += d.earned_points;
    typeStats[d.question_type].maxPoints += d.max_points;
  }

  res.json({
    success: true,
    data: {
      gradingResultId: result.id,
      examId: req.params.examId,
      summary: {
        totalScore: result.total_score,
        totalPoints: result.total_points,
        percentage: result.percentage,
        correctCount: result.correct_count,
        wrongCount: result.wrong_count,
        partialCount: result.partial_count,
        gradingTimeMs: result.grading_time_ms,
        gradedAt: result.graded_at,
      },
      typeStats,
      details: details.map(d => ({
        questionNumber: d.question_number,
        questionType: d.question_type,
        studentAnswer: d.student_answer,
        correctAnswer: d.correct_answer,
        isCorrect: !!d.is_correct,
        earnedPoints: d.earned_points,
        maxPoints: d.max_points,
        similarity: d.similarity,
        feedback: d.feedback,
      })),
    },
  });
});

/**
 * GET /api/v1/grading/history - 채점 기록 조회
 */
router.get('/history/all', (req, res) => {
  const results = db.prepare(`
    SELECT gr.*, e.title as exam_title
    FROM grading_results gr
    JOIN exams e ON gr.exam_id = e.id
    ORDER BY gr.graded_at DESC
    LIMIT 50
  `).all();

  res.json({
    success: true,
    data: results.map(r => ({
      gradingResultId: r.id,
      examId: r.exam_id,
      examTitle: r.exam_title,
      totalScore: r.total_score,
      totalPoints: r.total_points,
      percentage: r.percentage,
      correctCount: r.correct_count,
      wrongCount: r.wrong_count,
      gradedAt: r.graded_at,
    })),
  });
});

module.exports = router;
