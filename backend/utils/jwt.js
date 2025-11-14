import 'dotenv/config';
import jwt from 'jsonwebtoken';

export default function generateAccessToken(userData) {
  return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '3h' });
}


