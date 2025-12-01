// backend/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase.js";

export const checkAuth = async (req, res) => {
  try {
    const slug = req.params.slug; // <- slug da URL (tenant)
    const token = req.cookies?.token;

    if (!slug) {
      return res.status(400).json({
        authenticated: false,
        error: "Slug da organização não informado."
      });
    }

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    // 1. Decodifica usuário
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ authenticated: false });
    }

    // decoded precisa ter o organization_id
    const userOrgId = decoded.organization_id;

    if (!userOrgId) {
      return res.status(401).json({
        authenticated: false,
        error: "Token inválido: usuário sem organização atribuída."
      });
    }

    // 2. Busca a organização real pelo slug (fonte de verdade)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, slug_organization")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({
        authenticated: false,
        error: "Organização não encontrada."
      });
    }

    // 3. Isolamento multi-tenant: impede acessar org errada
    if (org.id !== userOrgId) {
      return res.status(403).json({
        authenticated: false,
        error: "Acesso negado: você não pertence a esta organização."
      });
    }

    // 4. Autenticação OK
    return res.json({
      authenticated: true,
      user: decoded,
      organizationId: org.id
    });

  } catch (err) {
    console.error("Erro no checkAuth:", err);
    return res.status(500).json({
      authenticated: false,
      error: "Erro interno no servidor."
    });
  }
};


export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });
    return res.status(200).json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    return res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};
