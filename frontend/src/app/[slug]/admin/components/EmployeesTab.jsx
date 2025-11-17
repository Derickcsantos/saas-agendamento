"use client";
import { useEffect, useState } from "react";
import { toast } from 'react-toastify'

export default function EmployeesTab({ org }) {
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [employeeServices, setEmployeeServices] = useState([]);
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

    // Modal de serviços
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [searchService, setSearchService] = useState("");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`, {
        credentials: 'include'
      }
    );
    const data = await res.json();
    setEmployees(data);
  };

   const loadEmployeeServices = async (employeeId) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employee-services/${employeeId}`
    );
    const data = await res.json();
    setEmployeeServices(data);
  };

  const loadAllServices = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services`
    );
    const data = await res.json();
    setAllServices(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      for (const [k, v] of Object.entries(form)) formData.append(k, v);
      if (image) formData.append("image", image);

      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}/${editing}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`;

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) throw new Error("Erro ao salvar funcionário");
      const emp = await res.json();

      // salvar horários
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/schedules/${org.slug_organization}/${emp.id}`,
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
      toast.error('Erro ao enviar dados');
      console.log('Erro ao enviar dados', err)
    }
  };

  const handleEdit = async (emp) => {
    setEditing(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      comissao: emp.comissao,
      is_active: emp.is_active,
    });

    setPreview(emp.image_url || "");

    // Load schedules
    const res = await fetch(`${api}/api/admin/${org.slug_organization}/schedules/${emp.id}`);
    const sched = await res.json();
    setSchedules(sched.length ? sched : [{ day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);

    // Load employee services
    await loadEmployeeServices(emp.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este funcionário?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees/${id}`,
      { method: "DELETE" }
    );
    loadEmployees();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      comissao: "",
      is_active: true,
    });
    setImage(null);
    setPreview("");
    setSchedules([{ day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);
    setEmployeeServices([]);
  };

  const addSchedule = () => {
    setSchedules([...schedules, { day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);
  };

  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const toggleService = (serviceId) => {
    const exists = employeeServices.some((s) => s.service_id === serviceId);

    if (exists) {
      setEmployeeServices(employeeServices.filter((s) => s.service_id !== serviceId));
    } else {
      setEmployeeServices([...employeeServices, { service_id: serviceId }]);
    }
  };

  const saveEmployeeServices = async () => {
    await fetch(
      `${api}/api/employee-services/${editing}?organization_id=${org.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeServices),
      }
    );

    toast.success("Serviços atualizados com sucesso!");
    setShowServicesModal(false);
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  return (
    <div>
      {/* ====================== FORM ====================== */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Funcionário" : "Novo Funcionário"}
        </h4>

        {/* INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" required placeholder="Nome" className="border p-2 rounded-md"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <input type="email" placeholder="Email" className="border p-2 rounded-md"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <input type="tel" placeholder="Telefone" className="border p-2 rounded-md"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <input type="number" placeholder="Comissão (%)" className="border p-2 rounded-md"
            value={form.comissao} onChange={(e) => setForm({ ...form, comissao: e.target.value })} />

          <label className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Ativo
          </label>

          <input type="file" accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              setImage(file);
              setPreview(URL.createObjectURL(file));
            }} />
        </div>

        {preview && <img src={preview} className="w-32 h-32 object-cover rounded-md" />}

        {/* SCHEDULES */}
        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Horários de Trabalho</h5>

          {schedules.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={s.day_of_week}
                onChange={(e) => {
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, day_of_week: e.target.value } : item
                    )
                  );
                }}
                className="border p-2 rounded-md"
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, idx) => (
                  <option key={idx} value={idx}>{d}</option>
                ))}
              </select>

              <input type="time" className="border p-2 rounded-md"
                value={s.start_time}
                onChange={(e) =>
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, start_time: e.target.value } : item
                    )
                  )
                } />

              <input type="time" className="border p-2 rounded-md"
                value={s.end_time}
                onChange={(e) =>
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, end_time: e.target.value } : item
                    )
                  )
                } />

              <button type="button" className="text-red-500" onClick={() => removeSchedule(i)}>✕</button>
            </div>
          ))}

          <button type="button" onClick={addSchedule} className="text-indigo-600 text-sm">
            + Adicionar dia
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md">Salvar</button>

          {editing && (
            <>
              <button
                type="button"
                onClick={() => setShowServicesModal(true)}
                className="bg-yellow-500 text-white px-4 py-2 rounded-md"
              >
                Gerenciar Serviços
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="border px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      {/* ====================== EMPLOYEES LIST ====================== */}
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
                  <span className={`px-2 py-1 text-xs rounded-full ${e.is_active ? "bg-green-100 text-green-700" : "bg-gray-200"}`}>
                    {e.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>

                <td className="px-3 py-2 flex gap-2">
                  <button onClick={() => handleEdit(e)} className="text-blue-500 hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(e.id)} className="text-red-500 hover:underline">
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

      {/* ====================== MODAL: SERVICES ====================== */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6">
            <h4 className="font-semibold text-gray-700 mb-3">Serviços do Funcionário</h4>

            <input
              type="text"
              placeholder="Pesquisar serviço..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              className="border p-2 rounded-md w-full mb-3"
            />

            <div className="max-h-64 overflow-auto space-y-2">
              {filteredServices.map((s) => {
                const checked = employeeServices.some((es) => es.service_id === s.id);

                return (
                  <div
                    key={s.id}
                    className="flex justify-between items-center border p-2 rounded-md"
                  >
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.description || "Sem descrição"}</p>
                    </div>

                    <button
                      onClick={() => toggleService(s.id)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        checked ? "bg-red-500 text-white" : "bg-green-500 text-white"
                      }`}
                    >
                      {checked ? "Remover" : "Adicionar"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="bg-gray-300 px-4 py-2 rounded-md"
                onClick={() => setShowServicesModal(false)}
              >
                Fechar
              </button>
              <button
                className="bg-indigo-600 text-white px-4 py-2 rounded-md"
                onClick={saveEmployeeServices}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}