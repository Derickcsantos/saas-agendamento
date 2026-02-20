"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function SignInPage({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite"); // 🆕 Pega código do convite da URL

  const [form, setForm] = useState({
    username: "",
    email: "",
    aniversario: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const { palette } = useOrganizationColors(slug);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [inviteData, setInviteData] = useState(null); // 🆕 Dados do convite
  const [validatingInvite, setValidatingInvite] = useState(false); // 🆕 Estado de validação

  // ==========================
  // 0️⃣ Valida convite (se houver)
  // ==========================
  useEffect(() => {
    if (!inviteCode) {
      setValidatingInvite(false);
      return;
    }

    const validateInvite = async () => {
      setValidatingInvite(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user-invites/${slug}/validate/${inviteCode}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const error = await res.json();
          setErrorMsg(error.error || "Convite inválido ou expirado");
          return;
        }

        const data = await res.json();
        setInviteData(data.invite);
        console.log("✅ Convite validado:", data.invite);
      } catch (err) {
        console.error("Erro ao validar convite:", err);
        setErrorMsg("Erro ao validar convite. Tente novamente.");
      } finally {
        setValidatingInvite(false);
      }
    };

    validateInvite();
  }, [inviteCode, slug]);

  // ==========================
  // 1️⃣ Verifica autenticação (cookie JWT)
  // ==========================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`,
          { credentials: "include" }
        );
        const data = await res.json();

        if (res.ok && data.authenticated && data.user) {
          const tipo = data.user.tipo;
          if (tipo === "admin") router.push(`/${slug}/admin`);
          else if (tipo === "funcionario") router.push(`/${slug}/funcionario`);
          else router.push(`/${slug}/logado`);
          return;
        }
      } catch {
        // não autenticado
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router, slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const { username, email, aniversario, phone, password, confirmPassword } =
      form;

    if (!username || !email || !password) {
      return setErrorMsg("Preencha todos os campos obrigatórios.");
    }

    if (password !== confirmPassword) {
      return setErrorMsg("As senhas não coincidem.");
    }

    // Normaliza data para YYYY-MM-DD
    let aniversarioFinal = aniversario;
    if (aniversario && aniversario.includes("/")) {
      // Converte DD/MM/AAAA para YYYY-MM-DD
      const [d, m, y] = aniversario.split("/");
      aniversarioFinal = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    setLoading(true);
    try {
      // 🆕 Se houver convite, resgatar via endpoint especial
      if (inviteCode && inviteData) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user-invites/${slug}/redeem/${inviteCode}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              email,
              aniversario: aniversarioFinal,
              phone,
              password,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao resgatar convite.");
        }

        setSuccessMsg("✅ Cadastro realizado com sucesso! Redirecionando...");
        setTimeout(() => router.push(`/${slug}/login`), 2000);
        return;
      }

      // Cadastro normal (sem convite)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/register/${slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            email,
            aniversario: aniversarioFinal,
            phone,
            password_plaintext: password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cadastrar.");
      }

      setSuccessMsg("Cadastro realizado com sucesso! Redirecionando...");
      setTimeout(() => router.push(`/${slug}/login`), 2000);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao cadastrar usuário.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth || validatingInvite) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-gray-700">
        {checkingAuth ? "Verificando autenticação..." : "Validando convite..."}
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-2" style={{color: palette?.strong_color}}>
          Criar Conta — {slug}
        </h1>

        {/* 🆕 Banner de convite */}
        {inviteData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-sm">
            <p className="text-green-800 font-medium">
              ✅ Você foi convidado como <strong>{inviteData.type}</strong>
            </p>
            <p className="text-green-700 text-xs mt-1">
              Criado por: {inviteData.organization_name}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-900 font-medium mb-1">Nome completo</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-900 font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite seu email"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-sm text-gray-900 font-medium mb-1">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="w-1/2 flex items-center gap-2">
              <label className="block text-sm text-gray-900 font-medium mb-1 w-full">Data de nascimento</label>
              <input
                type={form._showDatePicker ? "date" : "text"}
                value={form.aniversario}
                onChange={(e) => {
                  let val = e.target.value;
                  // Se for date, garantir formato YYYY-MM-DD
                  if (e.target.type === "date" && val) {
                    val = val.slice(0, 10);
                  }
                  setForm({ ...form, aniversario: val });
                }}
                className="w-full text-gray-900 border border-gray-300 rounded-md p-2"
                placeholder="DD/MM/AAAA"
                pattern="\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2}"
                onBlur={() => setForm({ ...form, _showDatePicker: false })}
              />
              <button
                type="button"
                title="Selecionar no calendário"
                className="ml-1 px-2 py-1 border rounded text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100"
                onClick={() => setForm({ ...form, _showDatePicker: true })}
                tabIndex={-1}
              >
                📅
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-900 text-sm font-medium mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <div>
            <label className="block text-gray-900 text-sm font-medium mb-1">Confirmar senha</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              className="w-full border text-gray-900 border-gray-300 rounded-md p-2"
              placeholder="Confirme sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full hover:bg-green-700 text-white py-2 rounded-md font-medium transition"
            style={{backgroundColor: palette?.strong_color}}
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        {errorMsg && (
          <p className="mt-4 text-red-600 text-sm text-center">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="mt-4 text-green-600 text-sm text-center">{successMsg}</p>
        )}

        <div className="text-center text-gray-900 mt-4 text-sm">
          Já tem conta?{" "}
          <button
            onClick={() => router.push(`/${slug}/login`)}
            className=" hover:underline"
            style={{color: palette?.strong_color}}
          >
            Faça login
          </button>
        </div>
      </div>
    </main>
  );
}
