import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from "../lib/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleGoogleAuth = (req, res, next) => {
  const organizationId = req.query.organization_id;
  req.session.organizationId = organizationId;
  next();
};

export const googleCallback = async (req, res) => {
  const user = req.user;

  // Buscar slug
  const { data: org } = await supabase
    .from("organizations")
    .select("slug_organization")
    .eq("id", user.organization_id)
    .single();

  const slug = org?.slug_organization;

  let redirectUrl = `/${slug}/logado`;

  if (user.tipo === "admin") {
    redirectUrl = `/${slug}/admin`;
  } else if (user.tipo === "funcionario") {
    redirectUrl = `/${slug}/funcionario`;
  }

  res.redirect(redirectUrl);
};