"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import ImageDropzone from "./ImageDropzone"
import { useConfirm } from "@/components/ConfirmDialogProvider";
import TrialExpiredModal from "./TrialExpireModal";

export default function ServicesTab({ org, setActiveTab }) {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const formRef = useRef(null); 
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
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 Search state
  const { palette } = useOrganizationColors(org.slug_organization);
  const [showPaywall, setShowPaywall] = useState(false);

  const { confirm } = useConfirm()

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

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

    const data = await res.json();
    setCategories(data);
  }

  async function loadServices(search = "") {
    const url = new URL(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/slug/${org.slug_organization}`
    );
    
    // Adiciona parâmetro de search se fornecido
    if (search) {
      url.searchParams.append("name", search);
    }

    const res = await fetch(url.toString(), { credentials: "include" });

    if (res.status === 402) {
      setShowPaywall(true);
      return;
    }

    const data = await res.json();
    setServices(data);
  }

  // 🔍 Efeito para buscar ao digitar (com delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadServices(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      for (const [key, value] of Object.entries(form)) {
        if (key === "id") {
          continue; // Não enviar o ID no FormData
        }
        if (key === "is_online") {
          formData.append("is_online", value ? "1" : "0");
        } else {
          formData.append(key, value);
        }
      }

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

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

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

      loadServices(searchQuery); // 🔍 Mantém a busca após salvar
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
      duration: service.duration ?? "",
      price: service.price ?? "",
      is_online: !!service.is_online,
      durability_days: service.durability_days ?? 0,
    });
    setPreview(service.imagem_service || "");
    setImage(null)

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const handleDelete = async (id) => {
    // if (!confirm("Deseja realmente excluir este serviço?")) return;

    const confirmed = await confirm({
      title: "Excluir serviço",
      message: "Deseja realmente excluir este serviço?",
      confirmVariant: "danger"
    });

    if (!confirmed) return

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${org.slug_organization}/${id}`,
      { method: "DELETE", credentials: "include" }
    );

    if (res.status === 402) {
      setShowPaywall(true);
      return;
    }

    loadServices(searchQuery); // 🔍 Mantém a busca após deletar
  };

  return (
    <div className="space-y-8">
      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
      >
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">
          {form.id ? "Editar Serviço" : "Novo Serviço"}
        </h4>

        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">

          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="name">Nome do Serviço</label>
            <input
              id="name"
              type="text"
              placeholder="Nome do serviço"
              className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="category">Categoria</label>
            <select
              id="category"
              className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              required
            >
              <option value="">Selecione categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="duration">Duração (min)</label>
            <input
              id="duration"
              type="number"
              placeholder="Duração (min)"
              className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              required
            />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="price">Preço (R$)</label>
            <input
              id="price"
              type="number"
              placeholder="Preço (R$)"
              className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.price}
              step="0.01"
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div className="w-full">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="description">Descrição</label>
            <textarea
              id="description"
              placeholder="Descrição do serviço"
              className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-gray-700 dark:text-gray-200 text-sm block mb-2">Imagem do Serviço</label>
            <ImageDropzone
              key={form.id || "new"}
              valueFile={image}
              previewUrl={preview}
              paletteColor={palette?.strong_color}
              onChangeFile={(file, url) => {
                setImage(file);
                setPreview(url);
              }}
            />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-700 dark:text-gray-200 text-sm" htmlFor="durability">Durabilidade (dias)</label>
            <input
              id="durability"
              type="number"
              placeholder="Durabilidade do serviço (em dias)"
              className="w-full bg-gray-50 dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
              value={form.durability_days}
              step="0.01"
              onChange={(e) => setForm({ ...form, durability_days: e.target.value })}
            />
          </div>

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

        {/* 🔍 Search Input */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="flex-1 border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm focus:ring focus:ring-purple-200 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Limpar
            </button>
          )}
        </div>

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
