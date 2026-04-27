"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Search, X } from "lucide-react";
import TrialExpiredModal from "./TrialExpireModal";

export default function FasterScheduleTab({ org, setActiveTab }) {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [slots, setSlots] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedService, setSelectedService] = useState(null);
  const [manualTimeMode, setManualTimeMode] = useState(false);
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");

  const [showPaywall, setShowPaywall] = useState(false);
  const [isEmailMandatory, setIsEmailMandatory] = useState(true);

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
    loadClients();
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) return;

      const data = await res.json();
      setIsEmailMandatory(data?.mandatory_email !== false);
    } catch (err) {
      console.error("Erro ao carregar políticas da organização:", err);
    }
  }

  async function loadCategories() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/categories/${org.slug_organization}`,
      {
        cache: "no-store",
        credentials: "include",
      }
    );

    setCategories(await res.json());
  }

  async function loadClients() {
    try {
      // Buscar usuários (com perfil completo)
      const usersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${org.slug_organization}`,
        { credentials: "include" }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const userData = await usersRes.json();
      const users = Array.isArray(userData) ? userData : [];

      // Buscar clientes de agendamentos (appointments)
      const appointmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}`,
        { credentials: "include" }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const appointmentsData = await appointmentsRes.json();

      // Extrair clientes únicos dos agendamentos
      const appointmentClients = [];
      const seenEmails = new Set();

      appointmentsData.forEach((appt) => {
        if (appt.client_email && !seenEmails.has(appt.client_email)) {
          seenEmails.add(appt.client_email);
          appointmentClients.push({
            id: `appt_${appt.client_email}`,
            type: "appointment_client",
            username: appt.client_name,
            email: appt.client_email,
            phone: appt.client_phone,
            imagem_perfil: null,
          });
        }
      });

      // Mesclar usuários e clientes de agendamentos (usuários primeiro, depois clientes)
      const mergedClients = [
        ...users.map((u) => ({ ...u, type: "user" })),
        ...appointmentClients.filter(
          (ac) => !users.some((u) => u.email === ac.email)
        ),
      ];

      setClients(mergedClients);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    }
  }

  const handleSearchClient = (query) => {
    setSearchQuery(query);
    setForm({ ...form, client_name: query });

    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.username?.toLowerCase().includes(lowerQuery) ||
          client.email?.toLowerCase().includes(lowerQuery) ||
          client.phone?.includes(query)
      );

      // Ordenar por relevância (começa com a query primeiro)
      const sorted = filtered.sort((a, b) => {
        const aStarts = a.username?.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.username?.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });

      setFilteredClients(sorted);
      setShowClientDropdown(true);
    } else {
      setFilteredClients([]);
      setShowClientDropdown(false);
    }
  };

  const selectClient = (client) => {
    setForm({
      ...form,
      client_name: client.username || "",
      client_email: client.email || "",
      client_phone: client.phone || "",
    });
    setSearchQuery(client.username || "");
    setShowClientDropdown(false);
    setFilteredClients([]);
  };

  async function loadServices(categoryId) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/services/${categoryId}/${org.slug_organization}`,
      {
        credentials: "include",
      }
    );

    setServices(await res.json());
  }

  async function loadEmployees(serviceId) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/employees/${serviceId}/${org.slug_organization}`,
      {
        credentials: "include",
      }
    );

    setEmployees(await res.json());
  }

  // 👉 AGORA RECEBE employeeId, date e duration
  async function loadSlots(employeeId, date, duration) {
    if (!employeeId || !date || !duration) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/available-times/${org.slug_organization}?employeeId=${employeeId}&date=${date}&duration=${duration}`;

    const res = await fetch(url, { credentials: "include" });

    const data = await res.json();
    setSlots(Array.isArray(data) ? data : []);
  }

  const handleCategory = (val) => {
    setForm({
      ...form,
      category_id: val,
      service_id: "",
      employee_id: "",
      time_slot: "",
      date: "",
    });
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
      date: "",
      final_price: service ? service.price : "",
    });

    setEmployees([]);
    setSlots([]);

    if (id) loadEmployees(id);
  };

  const handleEmployee = (id) => {
    const nextForm = { ...form, employee_id: id, time_slot: "" };
    setForm(nextForm);
    setSlots([]);

    if (id && nextForm.date && selectedService?.duration) {
      loadSlots(id, nextForm.date, selectedService.duration);
    }
  };

  const handleDate = (date) => {
    const nextForm = { ...form, date, time_slot: "" };
    setForm(nextForm);
    setSlots([]);

    if (date && nextForm.employee_id && selectedService?.duration) {
      loadSlots(nextForm.employee_id, date, selectedService.duration);
    }
  };

  const toggleManualTimeMode = () => {
    setManualTimeMode(!manualTimeMode);
    // Limpa os campos ao alternar modo
    setForm({ ...form, time_slot: "" });
    setManualStartTime("");
    setManualEndTime("");
  };

  const submit = async (e) => {
    e.preventDefault();

    const normalizedEmail = (form.client_email || "").trim();
    if (isEmailMandatory && !normalizedEmail) {
      toast.info("E-mail é obrigatório para esta organização.");
      return;
    }

    // Define horários baseado no modo (manual ou automático)
    let start_time, end_time;
    
    if (manualTimeMode) {
      start_time = manualStartTime;
      end_time = manualEndTime;
    } else {
      [start_time, end_time] = form.time_slot.split("|");
    }

    const payload = {
      client_name: form.client_name,
      client_email: normalizedEmail || null,
      client_phone: form.client_phone,
      service_id: form.service_id,
      employee_id: form.employee_id,
      date: form.date,
      start_time,
      end_time,
      final_price: Number(form.final_price),
      original_price: Number(selectedService?.price || 0),
      coupon_code: null,
      admin_override: manualTimeMode, // só permite bypass em modo manual
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${org.slug_organization}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.info(data?.details || data?.error || "Erro ao agendar. Verifique os dados.");
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
    setManualTimeMode(false);
    setManualStartTime("");
    setManualEndTime("");
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      <h2 className="text-lg font-semibold text-gray-700 mb-4">Agendamento Rápido</h2>

      {manualTimeMode && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 rounded">
          <div className="flex items-start gap-2">
            <span className="text-orange-500 text-xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-orange-800 text-sm">Modo Admin Ativo</h3>
              <p className="text-orange-700 text-xs mt-1">
                Você pode agendar em qualquer horário, mesmo fora do expediente do funcionário ou com conflitos. 
                Use com responsabilidade.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              className="border p-2 rounded-md w-full"
              placeholder="Nome, Email ou Telefone"
              value={searchQuery}
              onChange={(e) => handleSearchClient(e.target.value)}
              onFocus={() => searchQuery.trim().length > 0 && setShowClientDropdown(true)}
              required
            />

            {showClientDropdown && filteredClients.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-3 transition"
                  >
                    {client.imagem_perfil ? (
                      <img
                        src={client.imagem_perfil}
                        alt={client.username}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
                        {client.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {client.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {client.email}
                      </p>
                      {client.phone && (
                        <p className="text-xs text-gray-400 truncate">
                          {client.phone}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full shrink-0">
                      {client.type === "user" ? "Usuário" : "Cliente"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* {showClientDropdown && searchQuery.trim().length > 0 && filteredClients.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg px-4 py-3 text-sm text-gray-500">
                Nenhum cliente encontrado. Digite o nome, email ou telefone.
              </div>
            )} */}
          </div>

          <input
            className="border p-2 rounded-md"
            placeholder={isEmailMandatory ? "E-mail" : "E-mail (opcional)"}
            type="email"
            value={form.client_email}
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            required={isEmailMandatory}
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm text-gray-600">
                Modo de seleção de horário:
              </label>
              <button
                type="button"
                onClick={toggleManualTimeMode}
                className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                  manualTimeMode
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {manualTimeMode ? "Manual" : "Automático"}
              </button>
            </div>

            {!manualTimeMode ? (
              <select
                className="border p-2 rounded-md"
                value={form.time_slot}
                onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                required
              >
                <option value="">Horário disponível...</option>
                {slots.map((slot, i) => (
                  <option key={i} value={`${slot.start}|${slot.end}`}>
                    {slot.start} - {slot.end}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="time"
                  className="border p-2 rounded-md flex-1"
                  placeholder="Início"
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  required
                />
                <input
                  type="time"
                  className="border p-2 rounded-md flex-1"
                  placeholder="Fim"
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

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
