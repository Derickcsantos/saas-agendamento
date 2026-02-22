"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import InviteModal from "@/app/[slug]/admin/components/InviteModal";
import TrialExpiredModal from "./TrialExpireModal";

export default function UsersTab({ org, setActiveTab }) {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { palette } = useOrganizationColors(org.slug_organization);

  const [showPaywall, setShowPaywall] = useState(false);

  const { confirm } = useConfirm()

  const [form, setForm] = useState({
    username: "",
    email: "",
    tipo: "comum",
    password: "",
    id_employee: "",
  });

  const API = process.env.NEXT_PUBLIC_API_URL;
  const orgSlug = org.slug_organization;

  // ======================
  // Carregar dados
  // ======================
  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/users/${orgSlug}`, { credentials: "include" });

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    const res = await fetch(`${API}/api/admin/employees/${orgSlug}`, {
      credentials: "include"
    });

    if (res.status === 402) {
      setShowPaywall(true);
      return;
    }

    const data = await res.json();
    setEmployees(data);
  };

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log(orgSlug)

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${API}/api/users/${orgSlug}/${editing}`
        : `${API}/api/users/${orgSlug}`;

      const body = {
        username: form.username,
        email: form.email,
        tipo: form.tipo,
        ...(form.password && { password: form.password }),
        ...(form.tipo === "funcionario" && form.id_employee && {
          id_employee: form.id_employee,
        }),
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success("Usuário salvo!");
      setEditing(null);
      setForm({ username: "", email: "", tipo: "comum", password: "", id_employee: "" });

      loadUsers();
    } catch {
      toast.error("Erro ao salvar usuário");
    }
  };

  const startEdit = (u) => {
    setEditing(u.id);
    setForm({
      username: u.username,
      email: u.email,
      tipo: u.tipo,
      password: "",
      id_employee: u.id_employee || "",
    });
  };

  const deleteUser = async (id) => {
    // if (!confirm("Deseja excluir este usuário?")) return;

    const confirmed = await confirm({
      title: "Excluir usuário",
      message: `Deseja excluir este usuário?`,
      confirmVariant: "danger"
    });

    if (!confirmed) return

    await fetch(`${API}/api/users/${orgSlug}/${id}`, {
      method: "DELETE",
      credentials: 'include'
    });

    toast.success("Usuário removido!");
    loadUsers();
  };

  return (
    <div className="space-y-8">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">
            {editing ? "Editar Usuário" : "Criar Usuário"}
          </h3>
          
          {/* 🆕 Botão de Compartilhamento */}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            style={{backgroundColor: palette?.strong_color}}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition"
          >
           <i className="bi bi-person-plus-fill"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            placeholder="Nome de usuário"
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />

          <input
            type="email"
            placeholder="Email"
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Senha (opcional)"
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <select
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="comum">Usuário Comum</option>
            <option value="admin">Administrador</option>
            <option value="funcionario">Funcionário</option>
          </select>
        </div>

        {(form.tipo === "funcionario" || form.tipo === "admin") && (
          <div>
            <label className="text-gray-600 dark:text-gray-300 text-sm">Vincular funcionário:</label>

            <select
              className="mt-1 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3 w-full"
              value={form.id_employee}
              onChange={(e) =>
                setForm({ ...form, id_employee: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className=" text-white px-5 py-2 rounded-lg shadow"
            style={{backgroundColor: palette?.strong_color}}
          >
            Salvar
          </button>

          {editing && (
            <button
              type="button"
              onClick={() =>
                setEditing(null) ||
                setForm({ username: "", email: "", tipo: "comum", password: "", id_employee: "" })
              }
              className="border px-5 py-2 rounded-lg dark:border-gray-700 shadow"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4">Usuários</h3>

        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-3">{u.username}</td>
                  <td className="px-4 py-3">{u.email}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full text-white
                      ${
                        u.tipo === "admin"
                          ? "bg-blue-600"
                          : u.tipo === "funcionario"
                          ? "bg-yellow-600"
                          : "bg-gray-500" 
                      }`}
                    >
                      {u.tipo}
                    </span>
                  </td>

                  <td className="px-4 py-3 flex gap-3 text-sm">
                    <button
                      onClick={() => startEdit(u)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}

              {!users.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* 🆕 Modal de Convite */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        org={org}
        palette={palette}
        onInviteCreated={loadUsers}
      />
    </div>
  );
}
