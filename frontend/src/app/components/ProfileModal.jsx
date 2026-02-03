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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${slug}/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
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
          <input
            type="date"
            name="aniversario"
            value={form.aniversario}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
          />

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
