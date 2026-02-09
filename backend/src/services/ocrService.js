const config = require('../config/env');
const fs = require('fs');

/**
 * OCR 서비스 - Google Vision API 또는 Mock 모드 지원
 */
class OCRService {
  constructor() {
    this.mode = config.ocr.mode;
    this.visionClient = null;

    if (this.mode === 'google') {
      this._initGoogleVision();
    }
  }

  _initGoogleVision() {
    try {
      const vision = require('@google-cloud/vision');
      this.visionClient = new vision.ImageAnnotatorClient();
      console.log('✅ Google Vision API 초기화 완료');
    } catch (error) {
      console.warn('⚠️ Google Vision API 초기화 실패, Mock 모드로 전환:', error.message);
      this.mode = 'mock';
    }
  }

  /**
   * 이미지에서 텍스트 추출
   * @param {string} imagePath - 이미지 파일 경로
   * @returns {Promise<Object>} OCR 결과
   */
  async extractText(imagePath) {
    if (this.mode === 'google') {
      return this._extractWithGoogleVision(imagePath);
    }
    return this._extractWithMock(imagePath);
  }

  /**
   * Google Vision API OCR
   */
  async _extractWithGoogleVision(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
        imageContext: {
          languageHints: ['ko', 'en'],
        },
      });

      const detections = result.textAnnotations || [];
      if (detections.length === 0) {
        return { success: true, fullText: '', blocks: [], confidence: 0 };
      }

      const fullText = detections[0]?.description || '';
      const blocks = detections.slice(1).map((d, i) => ({
        text: d.description,
        confidence: d.confidence || 0.9,
        boundingBox: d.boundingPoly?.vertices || [],
        index: i,
      }));

      return {
        success: true,
        fullText: fullText.trim(),
        blocks,
        confidence: this._calculateAvgConfidence(blocks),
      };
    } catch (error) {
      console.error('Google Vision API 오류:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mock OCR (개발/테스트용)
   */
  async _extractWithMock(imagePath) {
    // 실제 시험지를 시뮬레이션하는 Mock 데이터
    await this._delay(300); // API 호출 시뮬레이션

    return {
      success: true,
      fullText: `영어 시험지

1. What is the capital of England?
   ③

2. She ___ to school every day.
   goes

3. Choose the correct sentence.
   ②

4. The weather is ___ today.
   beautiful

5. Which word means "happy"?
   ④

6. Write the past tense of "go".
   went

7. She is ___ than her sister.
   taller

8. What does "enormous" mean?
   ①

9. Translate: "나는 학생입니다"
   I am a student

10. Write a sentence using "because".
    I study hard because I want to get good grades.`,
      blocks: this._generateMockBlocks(),
      confidence: 0.92,
    };
  }

  /**
   * OCR 결과를 문제별로 파싱
   */
  parseQuestions(ocrResult) {
    if (!ocrResult.success || !ocrResult.fullText) {
      return [];
    }

    const lines = ocrResult.fullText.split('\n').filter(l => l.trim());
    const questions = [];
    let currentQuestion = null;

    for (const line of lines) {
      // 문제 번호 매칭 (예: 1. 또는 1) 또는 #1)
      const questionMatch = line.match(/^(\d+)[.)]\s*(.*)/);

      if (questionMatch) {
        if (currentQuestion) {
          questions.push(this._classifyQuestion(currentQuestion));
        }
        currentQuestion = {
          number: parseInt(questionMatch[1]),
          text: questionMatch[2].trim(),
          answer: '',
        };
      } else if (currentQuestion) {
        // 답안 라인 (들여쓰기된 텍스트)
        const answerText = line.trim();
        if (answerText) {
          currentQuestion.answer = currentQuestion.answer
            ? `${currentQuestion.answer} ${answerText}`
            : answerText;
        }
      }
    }

    if (currentQuestion) {
      questions.push(this._classifyQuestion(currentQuestion));
    }

    return questions;
  }

  /**
   * 문제 유형 자동 분류
   */
  _classifyQuestion(question) {
    const answer = question.answer.trim();

    // 객관식: ①②③④⑤ 또는 단일 숫자(1-5)
    const mcPattern = /^[①②③④⑤]$|^[1-5]$/;
    if (mcPattern.test(answer)) {
      return {
        ...question,
        type: 'multiple_choice',
        confidence: 0.95,
      };
    }

    // 서술형: 10자 이상의 답변
    if (answer.length > 20) {
      return {
        ...question,
        type: 'essay',
        confidence: 0.85,
      };
    }

    // 단답형: 나머지
    return {
      ...question,
      type: 'short_answer',
      confidence: 0.88,
    };
  }

  _generateMockBlocks() {
    const mockAnswers = [
      { text: '③', type: 'multiple_choice' },
      { text: 'goes', type: 'short_answer' },
      { text: '②', type: 'multiple_choice' },
      { text: 'beautiful', type: 'short_answer' },
      { text: '④', type: 'multiple_choice' },
      { text: 'went', type: 'short_answer' },
      { text: 'taller', type: 'short_answer' },
      { text: '①', type: 'multiple_choice' },
      { text: 'I am a student', type: 'short_answer' },
      { text: 'I study hard because I want to get good grades.', type: 'essay' },
    ];

    return mockAnswers.map((a, i) => ({
      text: a.text,
      type: a.type,
      questionNumber: i + 1,
      confidence: 0.85 + Math.random() * 0.14,
      boundingBox: { x: 100, y: 100 + i * 80, width: 300, height: 40 },
    }));
  }

  _calculateAvgConfidence(blocks) {
    if (blocks.length === 0) return 0;
    return blocks.reduce((sum, b) => sum + (b.confidence || 0), 0) / blocks.length;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new OCRService();
