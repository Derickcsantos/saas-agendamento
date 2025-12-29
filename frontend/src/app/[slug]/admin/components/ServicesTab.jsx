"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function ServicesTab({ org }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    category_id: "",
    duration: "",
    price: "",
    is_online: false,
    durability_days: 0,
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const { palette } = useOrganizationColors(org.slug_organization);

  // ======================
  // 1️⃣ Carregar dados
  // ======================
  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}`,
      { credentials: "include" }
    );
    const data = await res.json();
    setCategories(data);
  }

  async function loadServices() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/slug/${org.slug_organization}`,
      { credentials: "include" }
    );
    const data = await res.json();
    setServices(data);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(form)) formData.append(key, value);
      if (image) formData.append("image", image);

      const method = form.id ? "PUT" : "POST";

      const url = form.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${org.slug_organization}/${form.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${org.slug_organization}`;

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Serviço salvo com sucesso!");

      setForm({
        id: null,
        name: "",
        description: "",
        category_id: "",
        duration: "",
        price: "",
        is_online: false,
        durability_days: 0,
      });

      setPreview("");
      setImage(null);

      loadServices();
    } catch {
      toast.error("Erro ao salvar serviço.");
    }
  };

  const handleEdit = (service) => {
    setForm({
      id: service.id,
      name: service.name,
      description: service.description || "",
      category_id: service.category_id || "",
      duration: service.duration || "",
      price: service.price || "",
      is_online: service.is_online || false,
      durability_days: service.durability_days || 0,
    });
    setPreview(service.imagem_service || "");
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este serviço?")) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${org.slug_organization}/${id}`,
      { method: "DELETE", credentials: "include" }
    );

    loadServices();
  };

  return (
    <div className="space-y-8">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
      >
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">
          {form.id ? "Editar Serviço" : "Novo Serviço"}
        </h4>

        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">

          <input
            type="text"
            placeholder="Nome do serviço"
            className="w-full md:basis-[calc(50%-0.5rem)] border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <select
            className="w-full md:basis-[calc(50%-0.5rem)] bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            required
          >
            <option value="">Selecione categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Duração (min)"
            className="w-full md:basis-[calc(50%-0.5rem)] bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            required
          />

          <input
            type="number"
            placeholder="Preço (R$)"
            className="w-full md:basis-[calc(50%-0.5rem)] bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.price}
            step="0.01"
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <textarea
            placeholder="Descrição do serviço"
            className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3 md:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* Upload - sempre full width */}
          <div className="md:col-span-2 w-full md:basis-[calc(50%-0.5rem)]">
            <input
              type="file"
              accept="image/*"
              className="w-full md:basis-[calc(50%-0.5rem)] overflow-hidden p-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImage(file);
                setPreview(URL.createObjectURL(file));
              }}
            />
          </div>

          <input
            type="number"
            placeholder="Durabilidade do serviço (em dias)"
            className="w-full md:basis-[calc(50%-0.5rem)] bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.durability_days}
            step="0.01"
            onChange={(e) => setForm({ ...form, durability_days: e.target.value })}
          />

          <label className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={form.is_online}
              onChange={(e) => setForm({ ...form, is_online: e.target.checked })} />
            É online?
          </label>
        </div>

        {preview && (
          <div className="flex justify-center">
            <img src={preview} className="w-32 h-32 object-cover rounded-md shadow-md" />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="text-white px-5 py-2 rounded-lg shadow"
            style={{backgroundColor: palette?.strong_color}}
          >
            Salvar
          </button>

          {form.id && (
            <button
              type="button"
              onClick={() =>
                setForm({
                  id: null,
                  name: "",
                  description: "",
                  category_id: "",
                  duration: "",
                  price: "",
                  is_online: false,
                  durability_days: 0,
                })
              }
              className="border px-5 py-2 rounded-lg dark:border-gray-700 shadow"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* TABELA */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">Serviços</h4>

        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Duração</th>
                <th className="px-4 py-3 text-left">Preço</th>
                <th className="px-4 py-3 text-left">É online ?</th>
                <th className="px-4 py-3 text-left">Durabilidade</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>

            <tbody>
              {services.map((s) => (
                <tr
                  key={s.id}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-3">{s.id}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.categories?.name || "-"}</td>
                  <td className="px-4 py-3">{s.duration} min</td>
                  <td className="px-4 py-3">R$ {s.price?.toFixed(2)}</td>
                  <td className="px-4 py-3">{s.is_online? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">{s.durability_days} {s.durability_days === 1 ? 'dia' : 'dias'}</td>
                  <td className="px-4 py-3 flex gap-3">
                    <button
                      onClick={() => handleEdit(s)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}

              {!services.length && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-6">
                    Nenhum serviço cadastrado.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
