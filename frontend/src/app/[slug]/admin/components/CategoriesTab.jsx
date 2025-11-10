"use client";
import { useEffect, useState } from "react";

export default function CategoriesTab({ org }) {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  // ======== Carregar categorias ========
  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/categories`
      );
      if (!res.ok) throw new Error("Erro ao carregar categorias");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // ======== Submeter categoria ========
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (image) formData.append("image", image);

      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/categories/${editing}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/categories`;

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Erro ao salvar categoria");

      setName("");
      setImage(null);
      setPreview("");
      setEditing(null);
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  // ======== Editar / Excluir ========
  const handleEdit = (cat) => {
    setEditing(cat.id);
    setName(cat.name);
    setPreview(cat.imagem_category || "");
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/categories/${id}`,
      { method: "DELETE" }
    );
    loadCategories();
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Categoria" : "Nova Categoria"}
        </h4>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            className="border rounded-md p-2 flex-1"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-md"
          />
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            Salvar
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setName("");
                setPreview("");
              }}
              className="border px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Categorias</h4>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Imagem</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b">
                  <td className="px-3 py-2">{cat.id}</td>
                  <td className="px-3 py-2">{cat.name}</td>
                  <td className="px-3 py-2">
                    {cat.imagem_category ? (
                      <img
                        src={cat.imagem_category}
                        alt={cat.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="text-blue-500 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-500 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!categories.length && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-4">
                    Nenhuma categoria cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
