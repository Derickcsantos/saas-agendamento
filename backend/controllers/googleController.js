import { supabase } from "../lib/supabase.js";
import generateAccessToken from "../utils/jwt.js";
import setTokenCookie from "../utils/setTokenCookie.js";

export const googleCallback = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.redirect("/login?error=unauthorized");
  }

  // Buscar slug da organização
  const { data: org } = await supabase
    .from("organizations")
    .select("slug_organization")
    .eq("id", user.organization_id)
    .single();

  const slug = org.slug_organization;

  // Gerar JWT igual ao login normal
  const token = generateAccessToken({
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    aniversario: user.aniversario,
    organization_id: user.organization_id,
    tipo: user.tipo,
  });

  // Set cookie httpOnly igual login normal
  setTokenCookie(res, token);

  // Redirecionamento por tipo
  let redirectUrl = `${process.env.FRONTEND_URL}/${slug}/minha-conta`;

  if (user.tipo === "admin") redirectUrl = `${process.env.FRONTEND_URL}/${slug}/admin`;
  if (user.tipo === "funcionario") redirectUrl = `${process.env.FRONTEND_URL}/${slug}/profissional`;

  return res.redirect(redirectUrl);
};
