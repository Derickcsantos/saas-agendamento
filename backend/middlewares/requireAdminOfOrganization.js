// middlewares/requireAdminOfOrganization.js
import { supabase } from "../lib/supabase.js";

export const requireAdminOfOrganization = async (req, res, next) => {
  try {
    // Slug que identifica o tenant alvo da rota
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({
        error: "Slug da organização não informado."
      });
    }

    // Usuário já deve estar autenticado via cookie HttpOnly
    const user = req.user; // populado pelo authenticateJWT
    const userOrgId = req.organizationId;

    if (!user) {
      return res.status(401).json({
        error: "Usuário não autenticado."
      });
    }

    // Política corporativa: apenas ADMIN ou MASTER passam
    if (user.tipo !== "admin" && user.tipo !== "master") {
      return res.status(403).json({
        error: "Acesso negado. Perfil sem privilégios administrativos."
      });
    }

    // Carrega a organização real do Supabase (fonte de verdade)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, slug_organization")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      console.error("Organização não encontrada pelo slug:", slug);
      return res.status(404).json({
        error: "Organização não encontrada."
      });
    }

    // Aqui garantimos a isolação multi-tenant:
    // O admin só acessa a organização à qual pertence
    if (userOrgId !== org.id) {
      console.warn(
        `ACESSO BLOQUEADO: user=${user.id}, tipo=${user.tipo}, pertenceOrg=${userOrgId}, tentouAcessarOrg=${org.id}`
      );

      return res.status(403).json({
        error: "Acesso negado. Você não é administrador desta organização."
      });
    }

    // Tudo certo → libera fluxo downstream
    req.organizationId = org.id;
    return next();

  } catch (err) {
    console.error("Erro no middleware requireAdminOfOrganization:", err);
    return res.status(500).json({
      error: "Erro interno no middleware de validação organizacional."
    });
  }
};
