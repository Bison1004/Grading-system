const config = require('../config/env');
const fs = require('fs');

/**
 * AI 채점 서비스 - OpenAI GPT-4 Vision 또는 Mock 모드 지원
 * 서술형/주관식 답안의 AI 기반 채점
 */
class AIGradingService {
  constructor() {
    this.mode = config.ai.mode;
    this.openai = null;

    if (this.mode === 'openai') {
      this._initOpenAI();
    }
  }

  _initOpenAI() {
    try {
      const OpenAI = require('openai');
      this.openai = new OpenAI({ apiKey: config.ai.openaiKey });
      console.log('✅ OpenAI API 초기화 완료');
    } catch (error) {
      console.warn('⚠️ OpenAI API 초기화 실패, Mock 모드로 전환:', error.message);
      this.mode = 'mock';
    }
  }

  /**
   * 서술형 답안 AI 채점
   * @param {string} studentAnswer - 학생 답안
   * @param {string} correctAnswer - 모범 답안
   * @param {Object} options - 채점 옵션
   */
  async gradeEssay(studentAnswer, correctAnswer, options = {}) {
    if (this.mode === 'openai') {
      return this._gradeWithOpenAI(studentAnswer, correctAnswer, options);
    }
    return this._gradeWithMock(studentAnswer, correctAnswer, options);
  }

  /**
   * 이미지 기반 AI 채점 (GPT-4 Vision)
   */
  async gradeFromImage(imagePath, correctAnswer, options = {}) {
    if (this.mode === 'openai' && this.openai) {
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

        const response = await this.openai.chat.completions.create({
          model: config.ai.openaiModel,
          messages: [
            {
              role: 'system',
              content: this._getSystemPrompt(),
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64Image}` },
                },
                {
                  type: 'text',
                  text: `이 시험지 이미지에서 학생의 답안을 읽고, 아래 모범답안과 비교하여 채점해주세요.\n\n모범답안: ${correctAnswer}\n\n${options.rubric ? `채점 기준: ${options.rubric}` : ''}`,
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        });

        return this._parseAIResponse(response.choices[0]?.message?.content);
      } catch (error) {
        console.error('이미지 AI 채점 오류:', error);
        return this._gradeWithMock('', correctAnswer, options);
      }
    }
    return this._gradeWithMock('', correctAnswer, options);
  }

  /**
   * OpenAI GPT-4를 사용한 서술형 채점
   */
  async _gradeWithOpenAI(studentAnswer, correctAnswer, options) {
    try {
      const maxPoints = options.maxPoints || 10;
      const rubric = options.rubric || '';
      const keywords = options.keywords || [];

      const prompt = this._buildGradingPrompt(studentAnswer, correctAnswer, maxPoints, rubric, keywords);

      const response = await this.openai.chat.completions.create({
        model: config.ai.openaiModel,
        messages: [
          { role: 'system', content: this._getSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      return this._parseAIResponse(content, maxPoints);
    } catch (error) {
      console.error('OpenAI 채점 오류:', error);
      // 폴백: Mock 채점
      return this._gradeWithMock(studentAnswer, correctAnswer, options);
    }
  }

  /**
   * Mock AI 채점 (개발/테스트용)
   * Levenshtein 편집 거리 + 키워드 매칭 기반 유사도 분석
   */
  async _gradeWithMock(studentAnswer, correctAnswer, options = {}) {
    await this._delay(200);

    const maxPoints = options.maxPoints || 10;
    const keywords = options.keywords || this._extractKeywords(correctAnswer);

    // 1. 텍스트 유사도 계산
    const textSimilarity = this._calculateSimilarity(
      studentAnswer.toLowerCase().trim(),
      correctAnswer.toLowerCase().trim()
    );

    // 2. 키워드 매칭
    const keywordResult = this._checkKeywords(studentAnswer, keywords);

    // 3. 문법적 완성도 (간단한 휴리스틱)
    const grammarScore = this._checkGrammar(studentAnswer);

    // 4. 종합 점수 (가중 평균)
    const weightedScore = (
      textSimilarity * 0.4 +
      keywordResult.matchRate * 0.4 +
      grammarScore * 0.2
    );

    const earnedPoints = Math.round(weightedScore * maxPoints * 10) / 10;

    // 피드백 생성
    const feedback = this._generateFeedback(
      textSimilarity,
      keywordResult,
      grammarScore,
      studentAnswer,
      correctAnswer
    );

    return {
      success: true,
      score: earnedPoints,
      maxPoints,
      percentage: Math.round(weightedScore * 100),
      similarity: Math.round(textSimilarity * 100) / 100,
      keywordMatch: keywordResult,
      feedback,
      details: {
        textSimilarity: Math.round(textSimilarity * 100),
        keywordMatchRate: Math.round(keywordResult.matchRate * 100),
        grammarScore: Math.round(grammarScore * 100),
      },
    };
  }

  /**
   * 시스템 프롬프트 (AI가 영어 교사 역할)
   */
  _getSystemPrompt() {
    return `당신은 한국 중학교 영어 교사입니다. 학생의 영어 시험 답안을 채점합니다.

채점 원칙:
1. 객관적이고 일관된 기준으로 채점합니다.
2. 사소한 철자 오류는 감점하되 의미가 통하면 부분 점수를 줍니다.
3. 문법적 정확성, 의미 전달, 키워드 포함 여부를 종합 평가합니다.
4. 한국 학생의 영어 학습 수준을 고려합니다.

반드시 JSON 형식으로 응답해주세요:
{
  "score": <획득 점수>,
  "maxPoints": <만점>,
  "percentage": <백분율>,
  "similarity": <유사도 0.0-1.0>,
  "feedback": "<한국어로 된 상세 피드백>",
  "keywordMatch": {
    "matched": ["매칭된 키워드 목록"],
    "missed": ["놓친 키워드 목록"],
    "matchRate": <매칭률 0.0-1.0>
  },
  "details": {
    "contentAccuracy": <내용 정확도 0-100>,
    "grammarAccuracy": <문법 정확도 0-100>,
    "spellingAccuracy": <철자 정확도 0-100>
  }
}`;
  }

  /**
   * 채점 프롬프트 생성
   */
  _buildGradingPrompt(studentAnswer, correctAnswer, maxPoints, rubric, keywords) {
    let prompt = `다음 학생의 영어 시험 답안을 채점해주세요.

**만점**: ${maxPoints}점
**모범 답안**: ${correctAnswer}
**학생 답안**: ${studentAnswer || '(답안 없음)'}`;

    if (keywords.length > 0) {
      prompt += `\n**핵심 키워드**: ${keywords.join(', ')}`;
    }

    if (rubric) {
      prompt += `\n**채점 기준**: ${rubric}`;
    }

    return prompt;
  }

  /**
   * AI 응답 파싱
   */
  _parseAIResponse(content, maxPoints = 10) {
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        score: Math.min(parsed.score || 0, maxPoints),
        maxPoints: parsed.maxPoints || maxPoints,
        percentage: parsed.percentage || 0,
        similarity: parsed.similarity || 0,
        feedback: parsed.feedback || '채점 완료',
        keywordMatch: parsed.keywordMatch || { matched: [], missed: [], matchRate: 0 },
        details: parsed.details || {},
      };
    } catch {
      return {
        success: false,
        score: 0,
        maxPoints,
        feedback: 'AI 응답 파싱 실패',
      };
    }
  }

  // ========== 유틸리티 함수 ==========

  /**
   * Levenshtein 편집 거리 기반 유사도
   */
  _calculateSimilarity(str1, str2) {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    return 1 - distance / Math.max(len1, len2);
  }

  /**
   * 키워드 매칭 검사
   */
  _checkKeywords(answer, keywords) {
    if (!keywords || keywords.length === 0) {
      return { matched: [], missed: [], matchRate: 1 };
    }

    const lowerAnswer = (answer || '').toLowerCase();
    const matched = [];
    const missed = [];

    for (const keyword of keywords) {
      if (lowerAnswer.includes(keyword.toLowerCase())) {
        matched.push(keyword);
      } else {
        missed.push(keyword);
      }
    }

    return {
      matched,
      missed,
      matchRate: keywords.length > 0 ? matched.length / keywords.length : 0,
    };
  }

  /**
   * 간단한 문법 점수 (휴리스틱)
   */
  _checkGrammar(answer) {
    if (!answer || answer.trim().length === 0) return 0;

    let score = 1.0;

    // 기본 검사
    const trimmed = answer.trim();

    // 첫 글자 대문자 시작
    if (trimmed[0] !== trimmed[0].toUpperCase()) {
      score -= 0.1;
    }

    // 마침표로 끝남 (문장형 답의 경우)
    if (trimmed.length > 10 && !/[.!?]$/.test(trimmed)) {
      score -= 0.1;
    }

    // 이중 공백 검사
    if (/\s{2,}/.test(trimmed)) {
      score -= 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 모범 답안에서 키워드 자동 추출
   */
  _extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'and', 'or', 'but', 'i', 'my', 'me']);
    return text
      .toLowerCase()
      .replace(/[^a-z가-힣\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 5);
  }

  /**
   * 피드백 생성
   */
  _generateFeedback(textSim, keywordResult, grammarScore, studentAnswer, correctAnswer) {
    const feedbackParts = [];

    if (!studentAnswer || studentAnswer.trim().length === 0) {
      return '답안이 작성되지 않았습니다.';
    }

    if (textSim >= 0.9) {
      feedbackParts.push('정답과 매우 유사합니다. 잘했습니다! 👏');
    } else if (textSim >= 0.7) {
      feedbackParts.push('대체로 정확하지만 일부 수정이 필요합니다.');
    } else if (textSim >= 0.5) {
      feedbackParts.push('부분적으로 맞았습니다.');
    } else {
      feedbackParts.push('정답과 많이 다릅니다. 다시 확인해보세요.');
    }

    if (keywordResult.missed.length > 0) {
      feedbackParts.push(`놓친 핵심 키워드: ${keywordResult.missed.join(', ')}`);
    }

    if (grammarScore < 0.8 && studentAnswer.length > 10) {
      feedbackParts.push('문법 및 형식을 확인해주세요.');
    }

    feedbackParts.push(`모범 답안: ${correctAnswer}`);

    return feedbackParts.join(' ');
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AIGradingService();
