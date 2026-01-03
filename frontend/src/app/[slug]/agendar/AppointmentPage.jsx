"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'react-toastify'
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export default function AppointmentPage({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [palette, setPalette] = useState(null);
  const [org, setOrg] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [policies, setPolicies] = useState(null);

  // Steps
  const [step, setStep] = useState(1);

  // Data
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  // State principal
  const [selected, setSelected] = useState({
    category: null,
    service: null,
    employee: null,
    date: "",
    time: null,
    coupon: null,
  });

  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState({
    loading: false,
    valid: null,
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [appointmentResult, setAppointmentResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [appointmentData, setAppointmentData] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.authenticated && data.user) {
          setAuthenticated(true);
          setUser(data.user);
        } else setAuthenticated(false);
      } catch (e) {
        console.warn("Erro de autenticação:", e);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, colorRes, policiesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`, {
            credentials: 'include',
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${slug}`, {
            credentials: "include",
          }),
        ]);

        // Se alguma falhar, lança erro
        if (!orgRes.ok) throw new Error("Landing not found");
        if (!colorRes.ok) throw new Error("Palette not found");
        if (!policiesRes.ok) throw new Error("Policies not found");

        // Converte ambas as respostas
        const orgData = await orgRes.json();
        const paletteData = await colorRes.json();
        const policiesData = await policiesRes.json();

        // Armazena nos estados (ou constantes)
        setOrg(orgData);
        setPalette(paletteData); // <- crie um useState pra isso
        setPolicies(policiesData);

      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setNotFound(true);
      }
    }

    if (slug) fetchData();
  }, [slug]);
   

  // ================================
  // 3️⃣ LOAD CATEGORIES
  // ================================
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/categories/${slug}`
        );
        const data = await res.json();
        setCategories(
          (data || []).filter(
            (cat) => cat.name?.toLowerCase().trim() !== "serviços internos"
          )
        );
      } catch (e) {
        console.error("Erro ao carregar categorias:", e);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  // ================================
  // 4️⃣ LOAD SERVICES
  // ================================
  const loadServices = async (categoryId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/services/${categoryId}/${slug}`
      );
      const data = await res.json();
      setServices(data || []);
    } catch (e) {
      console.error("Erro ao carregar serviços:", e);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // 5️⃣ LOAD EMPLOYEES
  // ================================
  const loadEmployees = async (serviceId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/employees/${serviceId}/${slug}`
      );
      const data = await res.json();
      setEmployees((data || []).filter((e) => e.is_active));
    } catch (e) {
      console.error("Erro ao carregar funcionários:", e);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // 6️⃣ LOAD TIME SLOTS
  // ================================
  useEffect(() => {
  const loadAvailableTimes = async () => {
    if (!selected.employee || !selected.date || !selected.service) return;

    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/available-times/${slug}?employeeId=${selected.employee.id}&date=${selected.date}&duration=${selected.service.duration}`
      );

      const data = await res.json();
      setTimeSlots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao carregar horários:", e);
    } finally {
      setLoading(false);
    }
  };

  loadAvailableTimes();
}, [selected.employee, selected.date, selected.service, slug]);

  // ================================
  // 7️⃣ VALIDAR CUPOM
  // ================================
  const validateCoupon = async () => {
    if (!couponInput || !selected.service) {
      setCouponStatus({
        valid: false,
        message: "Digite o código e selecione um serviço antes.",
      });
      return;
    }

    try {
      setCouponStatus({ loading: true });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/coupons/validate-coupon/${slug}?code=${encodeURIComponent(
          couponInput
        )}&serviceId=${selected.service.id}`, {
          credentials: 'include'
        }
      );

      const result = await res.json();

      if (result.valid) {
        setSelected((prev) => ({
          ...prev,
          coupon: {
            code: couponInput,
            discount: result.discount,
            discountType: result.discountType,
            message: result.message,
          },
        }));
        setCouponStatus({
          loading: false,
          valid: true,
          message: result.message || "Cupom aplicado com sucesso!",
        });
      } else {
        setSelected((prev) => ({ ...prev, coupon: null }));
        setCouponStatus({
          loading: false,
          valid: false,
          message: result.message || "Cupom inválido ou expirado.",
        });
      }
    } catch (e) {
      console.error("Erro ao validar cupom:", e);
      setCouponStatus({
        loading: false,
        valid: false,
        message: "Erro interno ao validar cupom.",
      });
    }
  };

const sendWhatsappConfirmation = async () => {
  if (!appointmentData) return;

  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/contact/whatsapp/confirmedAppointment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: appointmentData.client,
          service: appointmentData.service,
          category: appointmentData.category,
          employee: appointmentData.employee,
          date: appointmentData.date,
          time: appointmentData.time,
          prices: {
            final: appointmentData.prices.final,
          },
          slug: slug
        }),
      }
    );

    toast.success('Mensagem enviada com sucesso')
  } catch (err) {
    console.error("Erro ao enviar WhatsApp:", err);
  }
};


  const handleConfirmAppointment = async (clientData) => {
    if (!selected.service || !selected.employee || !selected.time || !selected.date) {
      toast.info("Preencha todos os dados do agendamento antes de confirmar.");
      return;
    }

    try {
      setLoading(true);

      const coupon = selected.coupon;
      const originalPrice = selected.service?.price || 0;
      let finalPrice = originalPrice;

      if (coupon) {
        finalPrice =
          coupon.discountType === "percentage"
            ? originalPrice * (1 - coupon.discount / 100)
            : originalPrice - coupon.discount;
        finalPrice = Math.max(finalPrice, 0);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_name: clientData.name,
            client_email: clientData.email,
            client_phone: clientData.phone,
            service_id: selected.service.id,
            employee_id: selected.employee.id,
            date: selected.date,
            start_time: selected.time.start,
            end_time: selected.time.end,
            coupon_code: coupon?.code || null,
            original_price: originalPrice,
            final_price: finalPrice,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Erro ao criar agendamento:", data);
        toast.error("Erro ao confirmar o agendamento.");
        return;
      }

      setAppointmentData({
        category: selected.category,
        service: selected.service,
        employee: selected.employee,
        date: selected.date,
        time: selected.time,
        client: clientData,
        prices: {
          original: originalPrice,
          final: finalPrice,
          coupon: selected.coupon,
        }
      });

      setSelected({
        category: null,
        service: null,
        employee: null,
        date: "",
        time: null,
        coupon: null,
      });
      setCouponInput("");

      toast.success("Agendamento confirmado!");
      setShowModal(true);
    } catch (err) {
      console.error("Erro ao confirmar agendamento:", err);
      toast.error("Erro interno. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSelect = (field, value) => {
    setSelected((prev) => ({ ...prev, [field]: value }));
  };

  if (checkingAuth)
    return (
      <div className="h-screen flex bg-white items-center justify-center text-gray-500">
        Verificando autenticação...
      </div>
    );

  const steps = [
    "Categoria",
    "Serviço",
    "Profissional",
    "Data",
    "Horário",
    "Cupom",
    "Confirmação",
  ];

  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (policies?.max_schedule_days || 30));
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const formattedPrice = (value) =>
  value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const ModalConfirm = () => {
    if (!showModal || !appointmentData) return null;

    const a = appointmentData;

    const whatsappMessage = encodeURIComponent(
      `Olá! Aqui está a confirmação do seu agendamento:\n\n` +
      `• Serviço: ${a.service?.name}\n` +
      `• Categoria: ${a.category?.name}\n` +
      `• Profissional: ${a.employee?.name}\n` +
      `• Data: ${a.date}\n` +
      `• Horário: ${a.time?.start} - ${a.time?.end}\n` +
      `• Valor final: ${formattedPrice(a.prices.final)}\n\n`
    );

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn scale-[0.98]">
          
          {/* Header */}
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
            Agendamento Confirmado 🎉
          </h2>

          {/* Conteúdo */}
          <div className="space-y-2 text-gray-700">
            <p><strong>Cliente:</strong> {a.client?.name}</p>
            <p><strong>Serviço:</strong> {a.service?.name}</p>
            <p><strong>Profissional:</strong> {a.employee?.name}</p>
            <p><strong>Data:</strong> {a.date}</p>
            <p><strong>Horário:</strong> {a.time?.start} - {a.time?.end}</p>
            <p><strong>Valor:</strong> {formattedPrice(a.prices.final)}</p>

            {a.prices.coupon && (
              <p className="text-green-600"><strong>Cupom aplicado:</strong> {a.prices.coupon.code}</p>
            )}
          </div>

          {/* Botões */}
          <div className="mt-6 space-y-3">
            <button
              onClick={sendWhatsappConfirmation}
              className="block w-full text-center bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg shadow-md transition"
            >
              Enviar via WhatsApp
            </button>

            {/* <button
              onClick={() => window.location.href = `mailto:${a.client?.email}?subject=Confirmação de Agendamento&body=${whatsappMessage}`}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg shadow-md transition"
            >
              Enviar por Email
            </button>

            <button
              onClick={() => gerarPDF(a)}
              className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded-lg shadow-md transition"
            >
              Baixar Comprovante
            </button> */}
          </div>

          <button
            onClick={() => setShowModal(false)}
            className="mt-6 text-gray-500 hover:text-gray-700 block mx-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
        <div
          onClick={() => router.push(`/${slug}`)}
          className="text-xl font-semibold cursor-pointer flex items-center gap-2"
          style={{color: palette?.strong_color}}
        >
          <i className="bi bi-house-door"></i> {org?.name}
        </div>
        {authenticated? (
          <button
            onClick={() => router.push(`/${slug}/minha-conta`)}
            className="text-white px-4 py-2 rounded-lg transition-all"
            style={{backgroundColor: palette?.strong_color}}
          >
            Entrar
          </button>
        ) : (
          <button
            onClick={() => router.push(`/${slug}/login`)}
            className="text-white px-4 py-2 rounded-lg transition-all"
            style={{backgroundColor: palette?.strong_color}}
          >
            Login
          </button>
        )}
        
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">
          Agende seu horário
        </h1>

        {/* Progress bar */}
        <div className="flex justify-between mb-10">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className="h-2 rounded-full transition-all"
                  style={{
                    backgroundColor:
                      i + 1 <= step
                        ? palette?.strong_color || "#7e22ce"
                        : "#e5e7eb",
                  }}
              >
                
              </div>
              <p
                style={{color: palette?.strong_color}}
                className={`text-xs mt-2 ${
                  i + 1 <= step ? " font-semibold" : "text-gray-400"
                }`}
              >
                {s.title}
              </p>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 min-h-[420px]">
          <AnimatePresence mode="wait">
            {/* 1️⃣ Categoria */}
            {step === 1 && (
              <motion.div key="cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Selecione uma categoria
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        handleSelect("category", cat);
                        loadServices(cat.id);
                        next();
                      }}
                      className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                        selected.category?.id === cat.id
                          ? "border-gray-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <img
                        src={cat.imagem_category || "/placeholder.png"}
                        alt={cat.name}
                        className="w-16 h-16 mx-auto rounded-full object-cover mb-2"
                      />
                      <p className="font-medium text-sm text-gray-700">{cat.name}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2️⃣ Serviço */}
            {step === 2 && (
              <motion.div key="srv" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Selecione o serviço
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => {
                        handleSelect("service", srv);
                        loadEmployees(srv.id);
                        next();
                      }}
                      className={`cursor-pointer p-4 rounded-xl border transition-all ${
                        selected.service?.id === srv.id
                          ? "border-gray-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={srv.imagem_service || "/placeholder.png"}
                          alt={srv.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-700">{srv.name}</p>
                          <p className="text-sm text-gray-500">
                            R$ {srv.price?.toFixed(2)} • {srv.duration} min • Dura {srv.durability_days || 0} {srv.durability_days === 1 ? 'dia' : 'dias'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="emp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Selecione o profissional
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        handleSelect("employee", emp);
                        next();
                      }}
                      className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                        selected.employee?.id === emp.id
                          ? "border-gray-600 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <img
                        src={emp.imagem_funcionario || "/placeholder.png"}
                        alt={emp.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
                      />
                      <p className="font-medium text-gray-700">{emp.name}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="date" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Selecione a data
                </h2>

                <div 
                className="flex justify-center" 
                style={{
                  ["--rdp-accent-color"]: palette?.strong_color || "#7e22ce",

                  ["--rdp-background-color"]: palette?.strong_color || "#7e22ce",

                  ["--rdp-accent-color-dark"]: palette?.strong_color || "#6b21a8",
                }}
                >
                  <DayPicker
                    mode="single"
                    locale={ptBR}
                    selected={selected.date ? new Date(selected.date + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      if (!date) return;

                      // converte SEM UTC (evita bug de dia errado)
                      const formatted = format(date, "yyyy-MM-dd");

                      if (formatted > maxDateStr) {
                        toast.info(
                          `Esta organização permite agendamentos até ${policies.max_schedule_days} dias`
                        );
                        return;
                      }

                      handleSelect("date", formatted);
                      next(); // já avança para horários (UX melhor)
                    }}
                    disabled={{
                      before: new Date(minDate + "T00:00:00"),
                      after: new Date(maxDateStr + "T23:59:59"),
                    }}
                    className="bg-white rounded-xl border p-4 shadow"
                  />
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="time"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="min-h-[300px]"
              >
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Selecione o horário
                </h2>

                {/* Estado de carregamento */}
                {loading ? (
                  <p className="text-gray-500 animate-pulse">Carregando horários...</p>
                ) : timeSlots.length === 0 ? (
                  <p className="text-gray-500">
                    Nenhum horário disponível para esta data.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {timeSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          handleSelect("time", slot);
                          next(); 
                        }}
                        className={`px-4 py-2 text-gray-800 rounded-lg border transition-all ${
                          selected.time?.start === slot.start
                            ? "bg-gray-400 text-white border-gray-100"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {slot.start} - {slot.end}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="coupon"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h2 className="text-xl text-gray-800 font-semibold mb-4">
                  Adicione um cupom de desconto (opcional)
                </h2>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Digite o código"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="border text-gray-700 rounded-lg p-2 w-full"
                  />
                  <button
                    onClick={() => validateCoupon()}
                    disabled={couponStatus.loading}
                    style={{backgroundColor: palette?.strong_color}}
                    className={`px-4 rounded-lg text-white transition ${
                      couponStatus.loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {couponStatus.loading ? "Validando..." : "Aplicar"}
                  </button>
                </div>

                {couponStatus.message && (
                  <p
                    className={`text-sm ${
                      couponStatus.valid ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {couponStatus.message}
                  </p>
                )}

              </motion.div>
            )}

            {step === 7 && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Confirme seu agendamento</h2>

                <input
                  type="text"
                  placeholder="Nome completo"
                  value={selected.clientName || (user?.username || "")}
                  onChange={(e) => handleSelect("clientName", e.target.value)}
                  className="w-full text-gray-700 mb-2 border rounded-lg p-2"
                  disabled={authenticated && !!user?.username}
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={selected.clientEmail || (user?.email || "")}
                  onChange={(e) => handleSelect("clientEmail", e.target.value)}
                  className="w-full text-gray-700 mb-2 border rounded-lg p-2"
                  disabled={authenticated && !!user?.email}
                />
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={selected.clientPhone || (user?.phone || "")}
                  onChange={(e) => handleSelect("clientPhone", e.target.value)}
                  className="w-full text-gray-700 mb-4 border rounded-lg p-2"
                  disabled={authenticated && !!user?.phone}
                />

                <div className="text-gray-700 space-y-1 mb-4">
                  <p><strong>Categoria:</strong> {selected.category?.name}</p>
                  <p><strong>Serviço:</strong> {selected.service?.name}</p>
                  <p><strong>Profissional:</strong> {selected.employee?.name}</p>
                  <p><strong>Data:</strong> {selected.date}</p>
                  <p>
                    <strong>Horário:</strong>{" "}
                    {selected.time ? `${selected.time.start} - ${selected.time.end}` : ""}
                  </p>

                  <p>
                    <strong>Valor:</strong>{" "}
                    {selected.service && (
                      <>
                        <span className="line-through text-gray-400 mr-1">
                          R$ {selected.service.price.toFixed(2)}
                        </span>
                        {selected.coupon ? (
                          <span className="text-green-600 font-semibold">
                            R${" "}
                            {(
                              selected.service.price *
                              (1 -
                                (selected.coupon.discountType === "percentage"
                                  ? selected.coupon.discount / 100
                                  : selected.coupon.discount / selected.service.price))
                            ).toFixed(2)}{" "}
                            ({selected.coupon.discount}
                            {selected.coupon.discountType === "percentage" ? "%" : "R$"} de
                            desconto)
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-700">
                            R$ {selected.service.price.toFixed(2)}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                <button
                  onClick={() =>
                    handleConfirmAppointment({
                      name: selected.clientName || user?.username,
                      email: selected.clientEmail || user?.email,
                      phone: selected.clientPhone || user?.phone,
                    })
                  }
                  disabled={loading}
                  style={{backgroundColor: palette?.strong_color}}
                  className="mt-4 w-full text-white py-3 rounded-lg transition-all font-semibold"
                >
                  {loading ? "Confirmando..." : "Confirmar Agendamento"}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={back}
            disabled={step === 1}
            className={`px-6 py-2 rounded-lg border ${
              step === 1
                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                : "border-gray-600 text-gray-600 hover:bg-purple-50"
            }`}
          >
            Voltar
          </button>

          {step === 7 ? (
            <></>
          ) : (
            <button
              onClick={next}
              disabled={step === 7}
              className={`px-6 py-2 rounded-lg ${
                step === 7
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
              style={{backgroundColor: palette?.strong_color}}
            >
              Próximo
            </button>
          )}
        </div>
        <ModalConfirm />
      </main>
    </div>
  );
}