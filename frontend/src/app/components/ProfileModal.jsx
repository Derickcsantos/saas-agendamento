"use client";

import { useState, useEffect } from "react";

export default function ProfileModal({ user, slug, setUser, onClose }) {
  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    phone: user.phone || "",
    aniversario: user.aniversario || "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [palette, setPalette] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    setForm({
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      aniversario: user?.aniversario || "",
    });
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
          credentials: "include",
        });

        const paletteData = await res.json();

        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Normaliza data para YYYY-MM-DD
      let aniversarioFinal = form.aniversario;
      if (aniversarioFinal && aniversarioFinal.includes("/")) {
        const [d, m, y] = aniversarioFinal.split("/");
        aniversarioFinal = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${slug}/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, aniversario: aniversarioFinal }),
          credentials: 'include'
        }
      );

      if (!res.ok) throw new Error("Erro ao atualizar perfil");

      const updated = await res.json();
      setUser(updated);
      setSuccess(true);
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-lg shadow-xl relative">
        <h2 style={{color: palette?.strong_color}} className="text-xl font-semibold mb-4dark:text-purple-300">
          Meu Perfil
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-gray-800 text-sm" htmlFor="username">Nome Completo</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Nome"
            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
          />
          <label className="text-gray-800 text-sm" htmlFor="email">E-mail</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
          />
          <label className="text-gray-800 text-sm" htmlFor="phone">Telefone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Telefone"
            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
          />
          <label className="text-gray-800 text-sm" htmlFor="aniversario">Data de nascimento</label>
          <div className="flex items-center gap-2">
            <input
              type={showDatePicker ? "date" : "text"}
              name="aniversario"
              value={form.aniversario}
              onChange={e => {
                let val = e.target.value;
                if (e.target.type === "date" && val) {
                  val = val.slice(0, 10);
                }
                setForm({ ...form, aniversario: val });
              }}
              className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
              placeholder="DD/MM/AAAA"
              pattern="\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2}"
              onBlur={() => setShowDatePicker(false)}
            />
            <button
              type="button"
              title="Selecionar no calendário"
              className="ml-1 px-2 py-1 border rounded text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100"
              onClick={() => setShowDatePicker(true)}
              tabIndex={-1}
            >
              📅
            </button>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-white"
              style={{backgroundColor: palette?.strong_color}}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>

          {success && (
            <p className="text-green-600 dark:text-green-400 text-center mt-2">
              Perfil atualizado com sucesso!
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
