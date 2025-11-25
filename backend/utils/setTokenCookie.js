export default function setTokenCookie(res, token) {
  res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',   // <- ESSENCIAL
  path: '/',
  maxAge: 60 * 60 * 3 * 1000,
});

}
