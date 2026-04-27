import 'dotenv/config';
import express from 'express';
import generateAccessToken from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

/**
 * Extrai o token do httpOnly cookie ou do header Authorization
 * Retorna null se não encontrar (sem bloquear a requisição)
 */
export function extractTokenSafely(req) {
  try {
    // Prioriza cookie (first-party). Se indisponível, cai para header.
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    return token || null;
  } catch (err) {
    console.error('❌ Erro ao extrair token:', err.message);
    return null;
  }
}

/**
 * Extrai as informações do usuário do token de forma segura
 * Retorna { user, isValid } ou { user: null, isValid: false } se inválido
 */
export function getUserFromTokenSafely(req) {
  try {
    const token = extractTokenSafely(req);
    if (!token) {
      return { user: null, isValid: false };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded, isValid: true };
  } catch (err) {
    console.error('❌ Erro ao decodificar token:', err.message);
    return { user: null, isValid: false };
  }
}

/**
 * Verifica se o usuário é admin
 * Retorna true apenas se token é válido E role é 'admin'
 */
export function isUserAdmin(req) {
  try {
    const { user, isValid } = getUserFromTokenSafely(req);
    if (!isValid || !user) {
      return false;
    }
    // Compat: alguns lugares usam `tipo` no token (p.ex. 'admin'|'funcionario'|'comum')
    const roleField = (user.role || user.tipo || '').toString().toLowerCase();
    return roleField === 'admin' || roleField === 'master';
  } catch (err) {
    console.error('❌ Erro ao verificar admin status:', err.message);
    return false;
  }
}

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
