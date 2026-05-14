"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Share2, Sparkles, Check } from "lucide-react";
import { toast } from "react-toastify";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function ScheduleLinkCard({ slug, org }) {
  const { palette } = useOrganizationColors(org?.slug_organization || slug);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setShareUrl(`${window.location.origin}/${slug}/agendar`);
  }, [slug]);

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link de agendamento copiado!");

      window.clearTimeout(window.__scheduleLinkCopiedTimer);
      window.__scheduleLinkCopiedTimer = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    const shareData = {
      title: `Agendamento - ${org?.name || "Organização"}`,
      text: "Compartilhe este link para receber agendamentos online.",
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Erro ao compartilhar:", error);
      }
    }

    await handleCopy();
    toast.info("Compartilhamento nativo indisponível. O link foi copiado.");
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border shadow-xl"
      style={{
        borderColor: `${palette?.strong_color || "#5E3BEE"}22`,
        background: `linear-gradient(135deg, ${palette?.strong_color || "#5E3BEE"} 0%, ${palette?.medium_color || "#111827"} 100%)`,
      }}
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_35%)]" />

      <div className="relative p-5 sm:p-6 lg:p-7 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Link público
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Link de agendamento da organização
              </h2>
              <p className="text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                Use este endereço para enviar clientes diretamente para a página de agendamento da sua organização.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/10 p-3 backdrop-blur-sm sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                    URL de agendamento
                  </p>
                  <p className="truncate font-mono text-sm sm:text-[15px] text-white/95">
                    {shareUrl || "Carregando link..."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:flex-none">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!shareUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/12 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!shareUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ color: palette?.strong_color || "#111827" }}
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}