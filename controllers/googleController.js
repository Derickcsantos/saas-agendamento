import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleGoogleAuth = (req, res, next) => {
  const organizationId = req.query.organization_id;
  req.session.organizationId = organizationId;
  next();
};

export const googleCallback = (req, res) => {
  const userData = {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    aniversario: req.user.aniversario,
    phone: req.user.phone,
    organization_id: req.user.organization_id,
    tipo: req.user.tipo,
  };

  let redirectUrl = `/logado?organization_id=${userData.organization_id}`;
  if (userData.tipo === 'admin') {
    redirectUrl = `/admin?organization_id=${userData.organization_id}`;
  } else if (userData.tipo === 'funcionario') {
    redirectUrl = `/funcionario?organization_id=${userData.organization_id}`;
  }

  res.redirect(redirectUrl);
};
