require('dotenv').config();
const jwt = require('jsonwebtoken');

function generateAccessToken(userData) {
  return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { generateAccessToken };
