// backend/controllers/loginController.js
import { supabase } from '../lib/supabase.js';
import generateAccessToken from '../utils/jwt.js';
import setTokenCookie from '../utils/setTokenCookie.js';
import { verifyPassword } from '../utils/password.js';


export const login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
  }

  if (!req.organizationId) {
    return res.status(400).json({ error: 'Organização não identificada.' });
  }

  try {

    const loginValue = String(login || "").trim();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, email, aniversario, password, phone, tipo")
      .eq("organization_id", req.organizationId)
      // ILIKE sem % funciona como "igual ignorando maiúsc/minúsc"
      .or(`username.ilike.${loginValue},email.ilike.${loginValue}`)
      .maybeSingle(); // não explode se não achar (mas ainda pode acusar múltiplos)


    if (error) {
      console.warn("Login query error:", error);
      // se for múltiplos, é porque username não é único
      return res.status(401).json({ error: "Credenciais inválidas." });
    }


    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      aniversario: user.aniversario,
      email: user.email,
      phone: user.phone,
      organization_id: req.organizationId,
      tipo: user.tipo,
    };

    const token = generateAccessToken(userData);
    setTokenCookie(res, token); // define cookie HttpOnly

    return res.status(200).json({
      success: true,
      message: 'Login bem-sucedido.',
      user: userData,
    });
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const loginBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (error || !org) {
      return res.status(404).json({ error: "Organização não encontrada." });
    }

    req.organizationId = org.id;
    return login(req, res);
  } catch (err) {
    console.error("Erro ao processar login multi-tenant:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};
