// middlewares/requireAdminOfOrganization.js
import { supabase } from "../lib/supabase.js";

export const requireAdminOfOrganization = async (req, res, next) => {
  try {
    const slug = req.params.slug;

    if (!slug) {
      return res.status(400).json({
        error: "Slug da organização não informado."
      });
    }

    const user = req.user;
    const userOrgId =  user.organization_id;

    if (!user) {
      return res.status(401).json({
        error: "Usuário não autenticado."
      });
    }

    if (user.tipo !== "admin" && user.tipo !== "master") {
      return res.status(403).json({
        error: "Acesso negado. Perfil sem privilégios administrativos."
      });
    }

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

    if (userOrgId !== org.id) {
      console.warn(
        `ACESSO BLOQUEADO: user=${user.id}, tipo=${user.tipo}, pertenceOrg=${userOrgId}, tentouAcessarOrg=${org.id}`
      );

      return res.status(403).json({
        error: "Acesso negado. Você não é administrador desta organização."
      });
    }

    req.organizationId = org.id;
    return next();

  } catch (err) {
    console.error("Erro no middleware requireAdminOfOrganization:", err);
    return res.status(500).json({
      error: "Erro interno no middleware de validação organizacional."
    });
  }
};
