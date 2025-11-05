
export const checkAuth = (req, res, next) => {
  const token = req.cookies.token; // 🔥 Aqui pegamos o token JWT httpOnly

  if (!token) {
    return res.status(403).json({ error: 'Acesso negado. Token não encontrado.' });
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Decoded agora contém os dados do usuário, como id, tipo, organization_id
    if (decoded.tipo === 'admin' || decoded.tipo === 'funcionario') {
      req.user = decoded;
      req.organizationId = decoded.organization_id;
      next();
    } else {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }
  } catch (err) {
    console.error('Erro ao verificar token JWT:', err);
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};