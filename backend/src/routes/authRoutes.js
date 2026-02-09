const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const config = require('../config/env');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/v1/auth/register - 회원가입
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '사용자명과 비밀번호는 필수입니다.' },
      });
    }

    // 중복 검사
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_USER', message: '이미 존재하는 사용자명입니다.' },
      });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, username, email || null, passwordHash, displayName || username, role || 'student');

    const token = jwt.sign({ id, username, role: role || 'student' }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id, username, displayName: displayName || username, role: role || 'student' },
        token,
      },
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '회원가입 처리 중 오류가 발생했습니다.' },
    });
  }
});

/**
 * POST /api/v1/auth/login - 로그인
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '사용자명과 비밀번호를 입력해주세요.' },
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '사용자명 또는 비밀번호가 올바르지 않습니다.' },
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '로그인 처리 중 오류가 발생했습니다.' },
    });
  }
});

/**
 * GET /api/v1/auth/profile - 내 프로필
 */
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, email, display_name, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
    });
  }

  res.json({ success: true, data: user });
});

/**
 * POST /api/v1/auth/guest - 게스트 토큰 발급 (비회원 사용)
 */
router.post('/guest', (req, res) => {
  const guestId = `guest_${uuidv4().split('-')[0]}`;
  const token = jwt.sign(
    { id: guestId, username: guestId, role: 'guest' },
    config.jwt.secret,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: {
      user: { id: guestId, username: guestId, role: 'guest' },
      token,
    },
  });
});

module.exports = router;
