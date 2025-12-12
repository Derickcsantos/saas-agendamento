'use client';

import { useState } from "react";
import { FiSend, FiUpload } from "react-icons/fi";
import { toast } from "react-toastify";

export default function WhatsappSendTab() {
  const API = `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-send`;
  const primary = "#711b96";

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!file) {
      toast.error("Selecione uma planilha.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", message);
    formData.append("delay", delay);

    try {
      setLoading(true);

      const res = await fetch(API, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.log("Erro ao enviar mensagens");
      }

      const json = await res.json();
      toast.success(`Mensagens enviadas: ${json.total}`);

      setFile(null);
      setMessage("");
      setDelay(1);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar mensagens.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Envio de WhatsApp em Massa
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          Envie mensagens de WhatsApp a partir de uma planilha de leads,
          com controle de intervalo e total segurança.
        </p>
      </div>

      {/* FORM CARD */}
      <section className="bg-white border shadow-sm rounded-xl p-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* FILE UPLOAD */}
          <label className="block">
            <span className="text-sm font-medium text-gray-900">
              Planilha (.xlsx)
            </span>

            <div className="mt-2 flex items-center gap-4">
              <label
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                border border-gray-300 cursor-pointer
                hover:bg-gray-50 transition"
              >
                <FiUpload />
                <span>Selecionar arquivo</span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>

              {file && (
                <span className="text-sm text-gray-600 truncate">
                  {file.name}
                </span>
              )}
            </div>
          </label>

          {/* MESSAGE */}
          <label className="block">
            <span className="text-sm font-medium text-gray-900">
              Mensagem (opcional)
            </span>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Se deixar vazio, será usada a mensagem padrão."
              className="mt-2 w-full rounded-lg border border-gray-300
              px-3 py-2 text-gray-900 placeholder-gray-400
              focus:ring-2 focus:ring-purple-200 focus:border-purple-500
              outline-none transition shadow-sm resize-none"
            />
          </label>

          {/* DELAY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-900">
                Intervalo entre mensagens (segundos)
              </span>

              <input
                type="number"
                min="1"
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300
                px-3 py-2 text-gray-900
                focus:ring-2 focus:ring-purple-200 focus:border-purple-500
                outline-none transition shadow-sm"
              />
            </label>
          </div>

          {/* ACTION */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white
              shadow-md hover:shadow-lg transition-all
              ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: primary }}
            >
              <FiSend />
              {loading ? "Enviando..." : "Enviar mensagens"}
            </button>
          </div>

        </form>
      </section>
    </div>
  );
}
