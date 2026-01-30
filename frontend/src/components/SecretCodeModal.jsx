"use client";

import React, { useState, useCallback } from "react";
import { toast } from "react-toastify";

/**
 * Modal para entrada e verificação de secret code (4 dígitos)
 * Usado em transações sensíveis como saques e atualização de código
 */
export default function SecretCodeModal({
  isOpen,
  title,
  description,
  onVerify,
  onCancel,
  slug,
  isLoading = false,
  strongColor = "#5E3BEE",
  mode = "verify", // "verify" | "create" | "update"
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
}) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleCodeChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCode(value);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code || code.length !== 4) {
      toast.error("Código deve ter exatamente 4 dígitos");
      return;
    }

    setIsVerifying(true);

    try {
      // Se for modo verify, validar contra o backend
      if (mode === "verify" || mode === "update") {
        const res = await fetch(
          `${apiUrl}/api/organization-policies/${slug}/verify-secret-code`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ secret_code: code }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Código incorreto");
          setIsVerifying(false);
          return;
        }

        // Código verificado com sucesso
        toast.success("Código verificado!");
        onVerify(code);
        setCode("");
        setIsVerifying(false);
      } else if (mode === "create") {
        // Em modo create, simplesmente passar o código para validação no parent
        onVerify(code);
        setCode("");
        setIsVerifying(false);
      }
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      toast.error("Erro ao verificar código");
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {description && (
            <p className="text-gray-600 text-sm mt-2">{description}</p>
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* INPUT VISUAL COM DÍGITOS */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Código de segurança
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength="4"
              value={code}
              onChange={handleCodeChange}
              placeholder="0000"
              className="w-full text-center text-4xl font-bold tracking-widest border-2 border-gray-300 rounded-lg p-4 transition-all focus:outline-none"
              style={{
                borderColor: code.length === 4 ? strongColor : "#d1d5db",
                boxShadow:
                  code.length === 4
                    ? `0 0 0 3px ${strongColor}20`
                    : "none",
              }}
              disabled={isLoading || isVerifying}
            />
            <p className="text-xs text-gray-500 text-center">
              Digite os 4 dígitos do seu código de segurança
            </p>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              disabled={isLoading || isVerifying}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: strongColor }}
              disabled={code.length !== 4 || isLoading || isVerifying}
            >
              {isVerifying ? "Verificando..." : "Verificar"}
            </button>
          </div>
        </form>

        {/* INFO */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 Esse código de segurança foi criado para proteger operações sensíveis.
            Se você não lembra, atualize em Configurações.
          </p>
        </div>
      </div>
    </div>
  );
}
