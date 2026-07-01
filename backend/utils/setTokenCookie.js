export default function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',   // <- ESSENCIAL para cross-site quando precisar
    path: '/',
    maxAge: 60 * 60 * 24 * 7 * 1000,
  });

  // Envia também no header para fallback em clientes que bloqueiam cookie third-party
  res.setHeader('Authorization', `Bearer ${token}`);
}
