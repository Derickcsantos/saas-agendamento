import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function InviteModal({ isOpen, onClose, org, palette, onInviteCreated }) {
  const [step, setStep] = useState("form"); // 'form' | 'share'
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const [form, setForm] = useState({
    invited_name: "",
    invited_type: "comum",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const orgSlug = org.slug_organization;

  const handleCreateInvite = async (e) => {
    e.preventDefault();

    if (!form.invited_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/user-invites/${orgSlug}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invited_name: form.invited_name,
          invited_type: form.invited_type,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar convite");
      }

      const data = await res.json();
      setInviteData(data);
      setStep("share");
      onInviteCreated?.();

      console.log("✅ Convite criado:", data);
    } catch (error) {
      console.error("❌ Erro:", error);
      toast.error(error.message || "Erro ao criar convite");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setForm({ invited_name: "", invited_type: "comum" });
    setInviteData(null);
    setTimeLeft(null);
    onClose();
  };

  useEffect(() => {
    if (step !== "share" || !inviteData?.invite?.expires_at) return;

    const expiresAt = new Date(inviteData.invite.expires_at).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [step, inviteData]);

  const formatTime = (seconds) => {
    if (seconds == null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCopy = async () => {
    if (!inviteData?.invite_url) return;
    await navigator.clipboard.writeText(inviteData.invite_url);
    toast.success("Link copiado!");
  };

  const handleShare = async () => {
    if (!inviteData?.invite_url) return;

    const shareData = {
      title: "Convite de Cadastro",
      text: `Você foi convidado para acessar ${org?.name || "a plataforma"}.` ,
      url: inviteData.invite_url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      await handleCopy();
      toast.info("Compartilhamento não suportado. Link copiado.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-gray-200/60 dark:border-gray-700/60">
        {step === "form" && (
          <>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 tracking-tight">
              Convidar Novo Usuário
            </h2>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Pessoa
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
                  value={form.invited_name}
                  onChange={(e) =>
                    setForm({ ...form, invited_name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Usuário
                </label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
                  value={form.invited_type}
                  onChange={(e) =>
                    setForm({ ...form, invited_type: e.target.value })
                  }
                >
                  <option value="comum">Usuário Comum</option>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/70 border border-gray-200/70 dark:border-gray-700/60 p-3 rounded-lg">
                O link expira em 15 minutos.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: palette?.strong_color }}
                >
                  {loading ? "Gerando..." : "Gerar Convite"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "share" && inviteData && (
          <>
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100 tracking-tight">
              Convite criado
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800/70 border border-gray-200/70 dark:border-gray-700/60 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                    {inviteData.invite.invited_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tipo: {inviteData.invite.invited_type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expira em</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-700/60 rounded-xl p-3 mb-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Link do convite</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteData.invite_url}
                  className="w-full text-xs text-gray-800 dark:text-gray-100 bg-transparent outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label="Copiar link"
                  title="Copiar link"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleShare}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: palette?.strong_color }}
              >
                <ShareIcon />
                Compartilhar
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <CopyIcon />
                Copiar
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setStep("form");
                  setForm({ invited_name: "", invited_type: "comum" });
                  setInviteData(null);
                }}
                className="flex-1 px-4 py-2 text-white rounded-lg"
                style={{ backgroundColor: palette?.strong_color }}
              >
                Novo convite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v14" />
      <path d="M7 8l5-5 5 5" />
    </svg>
  );
}
