// backend/routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";

export const checkAuth =  async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ authenticated: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ authenticated: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      path: "/", // 🔥 importante
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    return res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};
