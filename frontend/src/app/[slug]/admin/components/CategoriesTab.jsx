"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function CategoriesTab({ org }) {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const { palette } = useOrganizationColors(org.slug_organization);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}`,
        { credentials: "include" }
      );

      const data = await res.json();
      setCategories(data);
    } catch (err) {
      toast.error("Não foi possível carregar categorias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", name);
      if (image) formData.append("image", image);

      const method = editing ? "PUT" : "POST";

      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}/${categoryId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}`;

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Categoria salva com sucesso!");

      setEditing(null);
      setName("");
      setImage(null);
      setPreview("");

      loadCategories();
    } catch {
      toast.error("Erro ao salvar categoria.");
    }
  };


  const handleEdit = (cat) => {
    setEditing(true);
    setCategoryId(cat.id);
    setName(cat.name);
    setPreview(cat.imagem_category);
  };


  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir esta categoria?")) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}/${id}`,
      { method: "DELETE", credentials: "include" }
    );

    loadCategories();
  };

  return (
    <div className="space-y-8">

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
      >
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">
          {editing ? "Editar Categoria" : "Nova Categoria"}
        </h4>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex-1 text-sm focus:ring focus:ring-purple-200 outline-none"
            placeholder="Nome da categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="file"
            accept="image/*"
            className="border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-sm"
            onChange={(e) => {
              const file = e.target.files[0];
              setImage(file);
              setPreview(URL.createObjectURL(file));
            }}
          />
        </div>

        {preview && (
          <div className="flex justify-center">
            <img src={preview} className="w-32 h-32 object-cover rounded-lg shadow" />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className=" text-white px-5 py-2 rounded-lg shadow transition"
            style={{backgroundColor: palette?.strong_color}}
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
              className="px-5 py-2 rounded-lg border shadow-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">Categorias</h4>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm bg-white dark:bg-gray-800 rounded-lg">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Imagem</th>
                  <th className="px-4 py-3 text-left">Ações</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-4 py-3">{cat.id}</td>
                    <td className="px-4 py-3">{cat.name}</td>
                    <td className="px-4 py-3">
                      {cat.imagem_category ? (
                        <img
                          src={cat.imagem_category}
                          className="w-12 h-12 rounded-md object-cover shadow-sm"
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 flex gap-4 text-sm">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}

                {!categories.length && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-6">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
