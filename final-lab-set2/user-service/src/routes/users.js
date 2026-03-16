const express     = require('express');
const { pool }    = require('../db/db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

// Helper: บันทึก log ลง user-db
async function logToDB({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      `INSERT INTO logs (level, event, user_id, message, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [level, event, userId || null, message || null, meta ? JSON.stringify(meta) : null]
    );
  } catch (_) {}
}

// Helper: สร้าง profile เริ่มต้นจาก JWT payload ถ้ายังไม่มีใน user-db
async function getOrCreateProfile(user) {
  // user = { sub, email, username, role } จาก JWT
  let result = await pool.query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [user.sub]
  );

  if (result.rows.length === 0) {
    // ยังไม่มี profile → สร้างใหม่อัตโนมัติ
    result = await pool.query(
      `INSERT INTO user_profiles (user_id, username, email, role, display_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.sub, user.username, user.email, user.role, user.username]
    );
    await logToDB({
      level: 'INFO',
      event: 'PROFILE_AUTO_CREATED',
      userId: user.sub,
      message: `Auto-created profile for user_id=${user.sub}`,
      meta: { username: user.username }
    });
  }

  return result.rows[0];
}

// ─────────────────────────────────────────────
// GET /api/users/health  (ไม่ต้องมี JWT)
// ─────────────────────────────────────────────
router.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'user-service', time: new Date() })
);

// ─────────────────────────────────────────────
// ทุก route ต่อจากนี้ต้องมี JWT
// ─────────────────────────────────────────────
router.use(requireAuth);

// ─────────────────────────────────────────────
// GET /api/users/me  — ดู profile ตัวเอง
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user);
    res.json({ profile });
  } catch (err) {
    console.error('[USER] GET /me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/users/me  — แก้ไข profile ตัวเอง
// ─────────────────────────────────────────────
router.put('/me', async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;

  try {
    // ถ้ายังไม่มี profile ให้สร้างก่อน
    await getOrCreateProfile(req.user);

    const result = await pool.query(
      `UPDATE user_profiles
       SET display_name = COALESCE($1, display_name),
           bio          = COALESCE($2, bio),
           avatar_url   = COALESCE($3, avatar_url),
           updated_at   = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [display_name, bio, avatar_url, req.user.sub]
    );

    await logToDB({
      level: 'INFO',
      event: 'PROFILE_UPDATED',
      userId: req.user.sub,
      message: `Profile updated for user_id=${req.user.sub}`
    });

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('[USER] PUT /me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/users  — ดูรายชื่อผู้ใช้ทั้งหมด (admin only)
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin only' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles ORDER BY user_id ASC'
    );
    res.json({ users: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[USER] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
