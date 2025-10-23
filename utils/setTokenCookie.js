export default function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // em dev pode ser false
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hora
  });
}
