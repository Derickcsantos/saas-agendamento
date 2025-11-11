"use client";
import { useEffect, useState } from "react";

export default function ClientsTab({ org }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // ==========================
  // Funções utilitárias
  // ==========================
  const apiBase = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/clients`;

  async function loadClients(query = "") {
    setLoading(true);
    try {
      const url = query ? `${apiBase}?search=${encodeURIComponent(query)}` : apiBase;
      const res = await fetch(url);
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  // ==========================
  // Handlers CRUD
  // ==========================
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("O nome do cliente é obrigatório.");
      return;
    }

    try {
      const method = editing ? "PUT" : "POST";
      const endpoint = editing ? `${apiBase}/${editing}` : apiBase;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erro ao salvar cliente");
      await loadClients();
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar cliente: " + err.message);
    }
  }

  function handleEdit(client) {
    setEditing(client.id);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
    });
  }

  async function handleDelete(id) {
    if (!confirm("Deseja realmente excluir este cliente?")) return;

    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir cliente");
      await loadClients();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert("Erro ao excluir cliente: " + err.message);
    }
  }

  function resetForm() {
    setForm({ name: "", email: "", phone: "", notes: "" });
    setEditing(null);
  }

  async function handleSearch(e) {
    e.preventDefault();
    await loadClients(search);
  }

  // ==========================
  // JSX
  // ==========================
  return (
    <div className="space-y-6">
      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Cliente" : "Cadastrar Cliente"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome completo *"
            className="border p-2 rounded-md"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            className="border p-2 rounded-md"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="tel"
            placeholder="Telefone"
            className="border p-2 rounded-md"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <textarea
            placeholder="Observações"
            className="border p-2 rounded-md col-span-1 md:col-span-2"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          ></textarea>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            {editing ? "Atualizar" : "Salvar"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Busca */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar cliente..."
          className="border p-2 rounded-md flex-1 min-w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md"
        >
          Buscar
        </button>
        <button
          onClick={() => {
            setSearch("");
            loadClients();
          }}
          className="border px-4 py-2 rounded-md"
        >
          Limpar
        </button>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Clientes</h4>

        {loading ? (
          <p className="text-gray-500 text-center py-4">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">E-mail</th>
                  <th className="px-3 py-2 text-left">Telefone</th>
                  <th className="px-3 py-2 text-left">Observações</th>
                  <th className="px-3 py-2 text-left w-[120px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.length ? (
                  clients.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.email || "-"}</td>
                      <td className="px-3 py-2">{c.phone || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {c.notes?.slice(0, 60) || "-"}
                      </td>
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="text-blue-500 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-500 hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-4">
                      Nenhum cliente encontrado
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
