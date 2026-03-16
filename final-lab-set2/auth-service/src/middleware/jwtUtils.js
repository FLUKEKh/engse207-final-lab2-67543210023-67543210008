const jwt = require('jsonwebtoken');

const JWT_SECRET   = process.env.JWT_SECRET   || 'dev-shared-secret';
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '1h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
