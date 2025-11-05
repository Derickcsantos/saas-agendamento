import 'dotenv/config';
import express from 'express';
import generateAccessToken from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

export function authenticateJWT(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.organizationId = decoded.organization_id;
    next();
  } catch (err) {
    console.error('Token inválido:', err.message);
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

export function extractOrganizationId(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.organizationId = decoded.organization_id;
      return next();
    } catch (err) {
      console.error('Token inválido:', err.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  }

  const orgId = req.query.organization_id || req.headers['organization-id'];
  if (orgId) {
    req.organizationId = orgId;
    return next();
  }

  return res.status(400).json({ error: 'Organization ID não encontrado' });
}
