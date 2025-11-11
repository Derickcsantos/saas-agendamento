"use client";
import { useEffect, useState } from "react";

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
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/categories`
    );
    const data = await res.json();
    setCategories(data);
  }

  async function loadServices() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services`
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
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services/${form.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services`;

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Erro ao salvar serviço");

      setForm({
        id: null,
        name: "",
        description: "",
        category_id: "",
        duration: "",
        price: "",
      });
      setPreview("");
      setImage(null);
      loadServices();
    } catch (err) {
      alert(err.message);
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
    });
    setPreview(service.imagem_service || "");
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este serviço?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services/${id}`,
      { method: "DELETE" }
    );
    loadServices();
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {form.id ? "Editar Serviço" : "Novo Serviço"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome"
            className="border p-2 rounded-md"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="border p-2 rounded-md"
            required
          >
            <option value="">Selecione categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Duração (min)"
            className="border p-2 rounded-md"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Preço (R$)"
            className="border p-2 rounded-md"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            step="0.01"
          />
          <textarea
            placeholder="Descrição"
            className="border p-2 rounded-md col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              setImage(file);
              setPreview(URL.createObjectURL(file));
            }}
          />
        </div>
        {preview && (
          <img src={preview} className="w-32 h-32 object-cover rounded-md" />
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
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
                })
              }
              className="border px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Serviços</h4>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Duração</th>
              <th className="px-3 py-2 text-left">Preço</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="px-3 py-2">{s.id}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2">{s.categories?.name || "-"}</td>
                <td className="px-3 py-2">{s.duration} min</td>
                <td className="px-3 py-2">R$ {s.price?.toFixed(2)}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-blue-500 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!services.length && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  Nenhum serviço cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
