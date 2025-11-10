"use client";
import { useEffect, useState } from "react";

export default function EmployeesTab({ org }) {
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    comissao: "",
    is_active: true,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [schedules, setSchedules] = useState([
    { day_of_week: 1, start_time: "08:00", end_time: "17:00" },
  ]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees`
    );
    const data = await res.json();
    setEmployees(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      for (const [k, v] of Object.entries(form)) formData.append(k, v);
      if (image) formData.append("image", image);

      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees/${editing}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees`;

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Erro ao salvar funcionário");
      const emp = await res.json();

      // salvar horários
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/schedules/${emp.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedules),
        }
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        comissao: "",
        is_active: true,
      });
      setImage(null);
      setPreview("");
      setEditing(null);
      setSchedules([{ day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);
      loadEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (emp) => {
    setEditing(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      comissao: emp.comissao,
      is_active: emp.is_active,
    });
    setPreview(emp.image_url || "");
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este funcionário?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees/${id}`,
      { method: "DELETE" }
    );
    loadEmployees();
  };

  const addSchedule = () => {
    setSchedules([...schedules, { day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Funcionário" : "Novo Funcionário"}
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
          <input
            type="email"
            placeholder="Email"
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
          <input
            type="number"
            placeholder="Comissão (%)"
            className="border p-2 rounded-md"
            value={form.comissao}
            onChange={(e) => setForm({ ...form, comissao: e.target.value })}
          />
          <label className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Ativo
          </label>
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

        {/* horários */}
        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Horários de Trabalho</h5>
          {schedules.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={s.day_of_week}
                onChange={(e) => {
                  const val = e.target.value;
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, day_of_week: val } : item
                    )
                  );
                }}
                className="border p-2 rounded-md"
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (d, idx) => (
                    <option key={idx} value={idx}>
                      {d}
                    </option>
                  )
                )}
              </select>
              <input
                type="time"
                value={s.start_time}
                onChange={(e) => {
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, start_time: e.target.value } : item
                    )
                  );
                }}
                className="border p-2 rounded-md"
              />
              <input
                type="time"
                value={s.end_time}
                onChange={(e) => {
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, end_time: e.target.value } : item
                    )
                  );
                }}
                className="border p-2 rounded-md"
              />
              <button
                type="button"
                onClick={() => removeSchedule(i)}
                className="text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSchedule}
            className="text-indigo-600 text-sm"
          >
            + Adicionar dia
          </button>
        </div>

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
                setForm({
                  name: "",
                  email: "",
                  phone: "",
                  comissao: "",
                  is_active: true,
                });
                setSchedules([
                  { day_of_week: 1, start_time: "08:00", end_time: "17:00" },
                ]);
              }}
              className="border px-4 py-2 rounded-md"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Tabela */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="font-semibold text-gray-700 mb-4">Funcionários</h4>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Telefone</th>
              <th className="px-3 py-2 text-left">Comissão</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="px-3 py-2">{e.name}</td>
                <td className="px-3 py-2">{e.email}</td>
                <td className="px-3 py-2">{e.phone}</td>
                <td className="px-3 py-2">{e.comissao}%</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      e.is_active ? "bg-green-100 text-green-700" : "bg-gray-200"
                    }`}
                  >
                    {e.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(e)}
                    className="text-blue-500 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-red-500 hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!employees.length && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  Nenhum funcionário cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
