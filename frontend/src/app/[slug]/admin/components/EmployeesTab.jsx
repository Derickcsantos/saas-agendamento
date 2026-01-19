"use client";
import { useEffect, useState, useRef } from "react";
import { toast } from 'react-toastify'
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import ImageDropzone from "./ImageDropzone";

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
    salary: '',
    is_active: true,
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [schedules, setSchedules] = useState([
    { day_of_week: 1, start_time: "08:00", end_time: "17:00" },
  ]);

  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [allServices, setAllServices] = useState([]);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [searchService, setSearchService] = useState("");
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const { palette } = useOrganizationColors(org.slug_organization);

  useEffect(() => {
    loadEmployees();
    loadAvailableColors();
  }, []);

  const loadAvailableColors = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar-colors/${org.slug_organization}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setAvailableColors(data);
      }
    } catch (err) {
      console.log('Erro ao carregar cores:', err);
    }
  };

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
      `${process.env.NEXT_PUBLIC_API_URL}/api/employee-services/${org.slug_organization}/${employeeId}`, {
        credentials: 'include'
      }
    );
    const data = await res.json();
    setEmployeeServices(data);
  };

  const loadAllServices = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/slug/${org.slug_organization}`, {
        credentials: 'include'
      }
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
      if (selectedColorId) formData.append("calendar_color_id", selectedColorId);

      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}/${editing}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}`;

      const res = await fetch(url, { 
        method,
        credentials: 'include', 
        body: formData 
      });
      if (!res.ok) throw new Error("Erro ao salvar funcionário");
      const emp = await res.json();

      // salvar horários
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/schedules/${org.slug_organization}/${emp.id}`,
        {
          method: "PUT",
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedules),
        }
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        comissao: "",
        salary: '',
        is_active: true,
      });
      setImage(null);
      setPreview("");
      setEditing(null);
      setSelectedColorId(null);
      setSchedules([{ day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);
      toast.success('Funcionário cadastrado com sucesso');
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
      salary: emp.salary,
      comissao: emp.comissao,
      is_active: emp.is_active,
    });
    setSelectedColorId(emp.calendar_color_id || null);

    setPreview(emp.image_url);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedules/${org.slug_organization}/${emp.id}`, {
      credentials: 'include'
    });
    const sched = await res.json();
    setSchedules(sched.length ? sched : [{ day_of_week: 1, start_time: "08:00", end_time: "17:00" }]);

    await loadEmployeeServices(emp.id);
    await loadAllServices(); 
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este funcionário?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${org.slug_organization}/${id}`,
      { method: "DELETE", credentials: 'include' }
    );
    toast.success('Funcionário excluido com sucesso');
    loadEmployees();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      comissao: "",
      salary: '',
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
      `${process.env.NEXT_PUBLIC_API_URL}/api/employee-services/${org.slug_organization}/${editing}`,
      {
        method: "PUT",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeServices),
      }
    );

    toast.success("Serviços atualizados com sucesso!");
    setShowServicesModal(false);
  };

  const filteredServices = allServices.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded-lg shadow-sm border mb-6 space-y-4"
      >
        <h4 className="font-semibold text-gray-700">
          {editing ? "Editar Funcionário" : "Novo Funcionário"}
        </h4>

        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
          <div className="w-full md:basis-[calc(50%-0.5rem)] ">
            <label className="text-gray-800 text-sm" htmlFor="username">Nome Completo</label>
            <input type="text" required placeholder="Nome" className="border p-2 rounded-md w-full md:basis-[calc(50%-0.5rem)] "
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)] ">
            <label className="text-gray-800 text-sm" htmlFor="username">E-mail</label>
            <input type="email" placeholder="Email" className="border p-2 rounded-md w-full md:basis-[calc(50%-0.5rem)] "
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)] ">
            <label className="text-gray-800 text-sm" htmlFor="username">Telefone</label>
            <input type="tel" placeholder="Telefone" className="border p-2 rounded-md w-full md:basis-[calc(50%-0.5rem)] "
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="w-full md:basis-[calc(50%-0.5rem)] ">
            <label className="text-gray-800 text-sm" htmlFor="username">Comissão</label>
            <input type="number" placeholder="Comissão (%)" className="border p-2 rounded-md w-full md:basis-[calc(50%-0.5rem)] "
            value={form.comissao} onChange={(e) => setForm({ ...form, comissao: e.target.value })} />
          </div>


          <div className="w-full md:basis-[calc(50%-0.5rem)]">
            <label className="text-gray-800 text-sm" htmlFor="username">Salário</label>
            <input type="number" placeholder="Salário" className="border p-2 rounded-md w-full md:basis-[calc(50%-0.5rem)] "
            value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Ativo
          </label>

          <div className="md:col-span-2 w-full ">
            <ImageDropzone
              valueFile={image}
              previewUrl={preview}
              paletteColor={palette?.strong_color}
              onChangeFile={(file, url) => {
                setImage(file);
                setPreview(url);
              }}
            />
          </div>
          
        
        </div>

        {preview && <img src={preview} className="w-32 h-32 object-cover rounded-md" />}

        <div className="space-y-2">
          <label className="font-medium text-gray-700">Cor do Evento do Calendário</label>
          <select
            value={selectedColorId === null ? '' : selectedColorId}
            onChange={(e) => setSelectedColorId(e.target.value ? parseInt(e.target.value) : null)}
            className="border p-2 rounded-md w-full"
          >
            <option value="">Sem cor</option>
            {availableColors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.color_name || `Cor ${color.id}`} - {color.hex_color}
              </option>
            ))}
          </select>
          {selectedColorId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Cor selecionada:</span>
              <div
                className="w-8 h-8 rounded-md border border-gray-300"
                style={{ 
                  backgroundColor: availableColors.find(c => c.id === selectedColorId)?.hex_color || '#000000'
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h5 className="font-medium text-gray-700">Horários de Trabalho</h5>
          {schedules.map((s, i) => (
            <div key={i} className="border p-3 rounded-md space-y-2">
              <select value={s.day_of_week}
                onChange={(e) => {
                  setSchedules(
                    schedules.map((item, idx) =>
                      idx === i ? { ...item, day_of_week: e.target.value } : item
                    )
                  );
                }}
                className="border p-2 rounded-md w-full"
              >
                {["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].map((d, idx) => (
                  <option key={idx} value={idx}>{d}</option>
                ))}
              </select>

              <div className="flex gap-2 items-center">
                <input type="time" className="border p-2 rounded-md flex-1"
                  value={s.start_time}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((item, idx) =>
                        idx === i ? { ...item, start_time: e.target.value } : item
                      )
                    )
                  } />

                <input type="time" className="border p-2 rounded-md flex-1"
                  value={s.end_time}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((item, idx) =>
                        idx === i ? { ...item, end_time: e.target.value } : item
                      )
                    )
                  } />

                <button type="button" className="text-red-500 text-lg font-bold flex-shrink-0 w-8 h-8 flex items-center justify-center" onClick={() => removeSchedule(i)}>✕</button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addSchedule} className="text-indigo-600 text-sm">
            + Adicionar dia
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            type="submit" 
            className=" text-white px-4 py-2 rounded-md"
            style={{backgroundColor: palette?.strong_color}}
          >
            Salvar
          </button>

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

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-700 mb-4">Funcionários</h4>
        <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Telefone</th>
                <th className="px-3 py-2 text-left">Salário</th>
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
                  <td className="px-3 py-2">{e.salary}</td>
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
        
      </div>

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
                className=" text-white px-4 py-2 rounded-md"
                onClick={saveEmployeeServices}
                style={{backgroundColor: palette?.strong_color}}
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