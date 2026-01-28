"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

export default function PWAInstallButton({ userId, slug, palette, onInstallSuccess }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Captura o evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("PWA não disponível para instalação neste navegador.");
      return;
    }

    setLoading(true);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        await updateAppInstalled(userId);
        setShowPrompt(false);
        setDeferredPrompt(null);
        if (onInstallSuccess) onInstallSuccess();
      }
    } catch (error) {
      console.error("Erro ao instalar PWA:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  const updateAppInstalled = async (userId) => {
    try {
      if (!slug) {
        console.warn("Slug não fornecido ao PWAInstallButton");
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${slug}/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_installed: true }),
      });

      if (!response.ok) {
        console.error("Erro ao atualizar app_installed no banco");
      }
    } catch (error) {
      console.error("Erro ao chamar API de atualização:", error);
    }
  };

  if (!showPrompt) return null;

  const primary = palette?.strong_color || "#5E3BEE";
  const secondary = palette?.medium_color || "#7B6CF6";
  const soft = palette?.soft_color || "#F4F1FF";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8">
      {/* Blur + overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl border border-white/20"
        style={{ background: `linear-gradient(135deg, ${soft}, #ffffff)` }}
      >
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${primary}20, transparent 35%), radial-gradient(circle at 80% 0%, ${secondary}25, transparent 40%)`,
          }}
        />

        <div className="relative p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg text-white"
              style={{ backgroundColor: primary }}
            >
              <Smartphone size={22} />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Instale o app para acesso rápido</h2>
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Adicione o Marcafy à tela inicial e acesse seu painel com um toque. Mais rápido, mais seguro e com experiência de app.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDismiss}
              className="w-full px-4 py-3 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              style={{ borderColor: `${primary}33` }}
            >
              Agora não
            </button>

            <button
              onClick={handleInstallClick}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-white shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
              style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Download size={18} />
                {loading ? "Instalando..." : "Instalar agora"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
