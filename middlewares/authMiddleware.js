require('dotenv').config();
const express = require('express');
const { generateAccessToken } = require('../utils/jwt')
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  // tenta pegar o token do cookie
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

function extractOrganizationId(req, res, next) {
  // 1️⃣ Tenta pegar do header Authorization (Bearer token)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // guarda o payload inteiro
      req.organizationId = decoded.organization_id;
      return next();
    } catch (err) {
      console.error('Token inválido:', err.message);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  }

  // 2️⃣ Fallback (login inicial ou endpoints públicos)
  const orgId = req.query.organization_id || req.headers['organization-id'];
  if (orgId) {
    req.organizationId = orgId;
    return next();
  }

  return res.status(400).json({ error: 'Organization ID não encontrado' });
}


module.exports = {
    authenticateJWT,
    extractOrganizationId,
};
