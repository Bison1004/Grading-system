const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * JWT 인증 미들웨어
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '인증 토큰이 필요합니다.' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: '토큰이 만료되었습니다.' },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다.' },
    });
  }
}

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 파싱, 없어도 통과)
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, config.jwt.secret);
    }
  } catch {
    // 토큰이 유효하지 않아도 진행
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
