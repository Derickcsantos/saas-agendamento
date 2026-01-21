import 'dotenv/config';
import express from 'express';
import generateAccessToken from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

export function authenticateJWT(req, res, next) {
  // Prioriza cookie (first-party). Se indisponível (p.ex. bloqueio de third-party), cai para header.
  let token = req.cookies.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.organizationId = decoded.organization_id;
    // Mantém o token disponível para handlers posteriores, caso precisem reenviar
    req.token = token;
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
