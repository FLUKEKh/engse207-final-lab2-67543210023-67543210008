const express  = require('express');
const bcrypt   = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken, verifyToken } = require('../middleware/jwtUtils');

const router = express.Router();

const DUMMY_BCRYPT_HASH =
  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8y0R6VQwWi4KFOeFHrgb3R04QLbL7a';

// ── Helper: บันทึก log ลง DB ──────────────────────────────────────────
async function logToDB({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      `INSERT INTO logs (level, event, user_id, message, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [level, event, userId || null, message || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (_) {}
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอก username, email และ password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();

  try {
    // ตรวจสอบ duplicate
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [normalizedEmail, normalizedUsername]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username หรือ Email นี้ถูกใช้แล้ว' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'member') RETURNING id, username, email, role, created_at`,
      [normalizedUsername, normalizedEmail, passwordHash]
    );
    const user = result.rows[0];

    await logToDB({
      level: 'INFO',
      event: 'REGISTER_SUCCESS',
      userId: user.id,
      message: `New user registered: ${user.username}`,
      meta: { username: user.username, email: user.email }
    });

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอก email และ password' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = $1',
      [normalizedEmail]
    );

    const user = result.rows[0] || null;
    const passwordHash = user ? user.password_hash : DUMMY_BCRYPT_HASH;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      await logToDB({
        level: 'WARN',
        event: 'LOGIN_FAILED',
        userId: user?.id || null,
        message: `Login failed for: ${normalizedEmail}`
      });
      return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username
    });

    await logToDB({
      level: 'INFO',
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      message: `User ${user.username} logged in`,
      meta: { username: user.username, role: user.role }
    });

    res.json({
      message: 'Login สำเร็จ',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const result = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/auth/health
router.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'auth-service', time: new Date() });
});

module.exports = router;
