"use client";
import { useEffect, useState } from "react";
import { toast } from 'react-toastify'

export default function FasterScheduleTab({ org }) {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);

  const [selectedService, setSelectedService] = useState(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    category_id: "",
    service_id: "",
    employee_id: "",
    date: "",
    time_slot: "",
    final_price: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/categories/${org.slug_organization}`,
      { cache: "no-store" }
    );
    setCategories(await res.json());
  }

  async function loadServices(categoryId) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/services/${categoryId}/${org.slug_organization}`
    );
    setServices(await res.json());
  }

  async function loadEmployees(serviceId) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${serviceId}/${org.slug_organization}`
    );
    setEmployees(await res.json());
  }

  async function loadSlots() {
    if (!form.employee_id || !form.date || !selectedService?.duration) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/available-times/${org.slug_organization}?employeeId=${form.employee_id}&date=${form.date}&duration=${selectedService.duration}`;

    const res = await fetch(url);
    setSlots(await res.json());
  }

  const handleCategory = (val) => {
    setForm({ ...form, category_id: val, service_id: "", employee_id: "", time_slot: "" });
    setServices([]);
    setEmployees([]);
    setSlots([]);

    if (val) loadServices(val);
  };

  const handleService = (id) => {
    const service = services.find((s) => s.id === Number(id)) || null;

    setSelectedService(service);
    setForm({
      ...form,
      service_id: id,
      employee_id: "",
      time_slot: "",
      final_price: service ? service.price : "",
    });

    setEmployees([]);
    setSlots([]);

    if (id) loadEmployees(id);
  };

  const handleEmployee = (id) => {
    setForm({ ...form, employee_id: id, time_slot: "" });
    setSlots([]);

    if (id && form.date) loadSlots();
  };

  const handleDate = (date) => {
    setForm({ ...form, date, time_slot: "" });
    if (date && form.employee_id) loadSlots();
  };

  const submit = async (e) => {
    e.preventDefault();

    const [start_time, end_time] = form.time_slot.split("|");

    const payload = {
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      service_id: form.service_id,
      employee_id: form.employee_id,
      date: form.date,
      start_time,
      end_time,
      final_price: Number(form.final_price),
      original_price: Number(selectedService?.price || 0),
      coupon_code: null,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      toast.info("Erro ao agendar. Verifique os dados.");
      return;
    }

    toast.success("Agendamento realizado com sucesso!");

    setForm({
      client_name: "",
      client_email: "",
      client_phone: "",
      category_id: "",
      service_id: "",
      employee_id: "",
      date: "",
      time_slot: "",
      final_price: "",
    });

    setServices([]);
    setEmployees([]);
    setSlots([]);
    setSelectedService(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Agendamento Rápido</h2>

      <form onSubmit={submit} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="border p-2 rounded-md"
            placeholder="Nome do Cliente"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded-md"
            placeholder="E-mail"
            type="email"
            value={form.client_email}
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded-md"
            placeholder="Telefone"
            value={form.client_phone}
            onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
            required
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <select
            className="border p-2 rounded-md"
            value={form.category_id}
            onChange={(e) => handleCategory(e.target.value)}
            required
          >
            <option value="">Categoria...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="border p-2 rounded-md"
            value={form.service_id}
            onChange={(e) => handleService(e.target.value)}
            required
          >
            <option value="">Serviço...</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            className="border p-2 rounded-md"
            value={form.employee_id}
            onChange={(e) => handleEmployee(e.target.value)}
            required
          >
            <option value="">Funcionário...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="date"
            className="border p-2 rounded-md"
            value={form.date}
            onChange={(e) => handleDate(e.target.value)}
            required
          />

          <select
            className="border p-2 rounded-md"
            value={form.time_slot}
            onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
            required
          >
            <option value="">Horário...</option>
            {slots.map((slot, i) => (
              <option key={i} value={`${slot.start}|${slot.end}`}>
                {slot.start} - {slot.end}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="border p-2 rounded-md"
            placeholder="Preço Final"
            value={form.final_price}
            onChange={(e) => setForm({ ...form, final_price: e.target.value })}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Confirmar Agendamento
        </button>
      </form>
    </div>
  );
}
