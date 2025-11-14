'use client';

import { useEffect, useState } from "react";
import { toast } from 'react-toastify'

export default function UsersTab({ org }) {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", tipo: "comum", password: "", id_employee: "" });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const orgSlug = org.slug_organization;


  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/users/${orgSlug}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar usuários");
      setUsers(data);
    } catch (err) {
      toast.error("Não foi possivel carregar os dados");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API}/api/employees/${orgSlug}`);
      const data = await res.json();
      setEmployees(data);
    } catch (_) {}
  };

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${API}/api/users/${editing}?organization_id=${org.id}`
        : `${API}/api/users?organization_id=${org.id}`;

      const body = {
        username: form.username,
        email: form.email,
        tipo: form.tipo,
        ...(form.password && { password_plaintext: form.password }),
        ...(form.tipo === "funcionario" && form.id_employee && { id_employee: form.id_employee })
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar usuário");

      toast.success("Sucesso na operação!");
      setEditing(null);
      setForm({ username: "", email: "", tipo: "comum", password: "", id_employee: "" });
      loadUsers();
    } catch (err) {
      toast.error("Falha ao enviar formulário");
      console.log(err.message)
    }
  };

  const startEdit = (u) => {
    setEditing(u.id);
    setForm({
      username: u.username,
      email: u.email,
      tipo: u.tipo,
      password: "",
      id_employee: u.id_employee || ""
    });
  };

  const deleteUser = async (id) => {
    if (!confirm("Deseja excluir este usuário?")) return;
    const res = await fetch(`${API}/api/users/${id}?organization_id=${org.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error("Falha ao deletar usuário");
    toast.success("Usuário excluído!");
    loadUsers();
  };

  return (
    <div className="space-y-6">
      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h3 className="font-semibold text-xl text-gray-700 flex items-center gap-2">
          {editing ? "Editar Usuário" : "Criar Usuário"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            className="p-2 border rounded-md"
            placeholder="Nome de usuário"
            value={form.username}
            required
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />

          <input
            type="email"
            className="p-2 border rounded-md"
            placeholder="Email"
            value={form.email}
            required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            type="password"
            className="p-2 border rounded-md"
            placeholder="Senha (opcional)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <select
            className="p-2 border rounded-md"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="comum">Usuário Comum</option>
            <option value="admin">Administrador</option>
            <option value="funcionario">Funcionário</option>
          </select>
        </div>

        {form.tipo === "funcionario" && (
          <div className="pt-2">
            <label className="text-sm text-gray-600">Vincular funcionário:</label>
            <select
              className="p-2 border rounded-md w-full"
              value={form.id_employee}
              onChange={(e) => setForm({ ...form, id_employee: e.target.value })}
            >
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-700">
            Salvar
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ username: "", email: "", tipo: "comum", password: "", id_employee: "" });
              }}
              className="border px-4 py-2 rounded-md shadow"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* ================= LIST ================= */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="font-semibold text-xl text-gray-700 mb-4">Usuários</h3>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left">Usuário</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-white ${u.tipo === "admin" ? "bg-blue-600" : u.tipo === "funcionario" ? "bg-yellow-500" : "bg-gray-500"}`}>{u.tipo}</span>
                  </td>
                  <td className="p-3 flex gap-3">
                    <button onClick={() => startEdit(u)} className="text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}

              {!users.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-400">Nenhum usuário encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
