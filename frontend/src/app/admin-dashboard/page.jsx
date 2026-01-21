"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import {
  FiHome,
  FiBarChart2,
  FiCreditCard,
  FiUsers,
  FiMenu,
  FiX,
  FiLogOut
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import WhatsappSendTab from "./components/WhatsappSenderTab";

const PagarmeTab = dynamic(() => import("./components/PagarmeTab"), { ssr: false });

export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    // 🔥 Limpa token do sessionStorage
    sessionStorage.removeItem('token');
    router.push(`/login`);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/marcafy/check`);
        const data = await res.json();

        if (!data.authenticated || data.user.tipo !== "master") {
          router.push(`/login`);
          return;
        }

        setUser(data.user);
      } catch {
        router.push(`/login`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const menu = [
    { key: "overview", label: "Visão Geral", icon: <FiHome size={18} /> },
    { key: "analytics", label: "Analytics", icon: <FiBarChart2 size={18} /> },
    { key: "whatsapp", label: "Whatsapp", icon: <FaWhatsapp size={18} /> },
    { key: "pagarme", label: "Pagar.me", icon: <FiCreditCard size={18} /> },
    { key: "users", label: "Usuários", icon: <FiUsers size={18} /> },
  ];

  if (loading) return <div className="p-10 text-gray-600">Carregando...</div>

  return (
    <div className="flex h-screen bg-gray-100">

      {/* BOTÃO MOBILE */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 bg-white shadow-lg p-3 rounded-xl"
        onClick={() => setSidebarOpen(true)}
      >
        <FiMenu size={22} />
      </button>

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full bg-white shadow-xl border-r border-gray-200
          transition-all duration-300 z-40 flex flex-col
          ${collapsed ? "w-20" : "w-72"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        
        {/* HEADER DO SIDEBAR */}
        <div className="flex items-center justify-between px-5 py-5 border-b">
          {!collapsed && (
            <h2 className="font-bold text-xl text-gray-800 tracking-tight">Admin</h2>
          )}

          <div className="flex gap-2 items-center">
            {/* COLAPSAR (DESKTOP) */}
            <button
              className="hidden md:block p-2 rounded-md hover:bg-gray-200 transition"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <FiMenu /> : <FiX />}
            </button>

            {/* FECHAR (MOBILE) */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-gray-200"
              onClick={() => setSidebarOpen(false)}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

          {menu.map((item) => {
            const active = section === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setSection(item.key);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                  transition-all
                  ${
                    active
                      ? "bg-[#711b96] text-white shadow"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}

          <button
            onClick={() => window.location.href = "/marcafy/admin"}
            className="w-full flex items-center gap-3 px-4  rounded-lg text-sm mt-3 
            text-gray-800 hover:bg-red-50 transition"
          >
            <img width="18" height="18" src="https://img.icons8.com/ios/50/combo-chart--v1.png" alt="combo-chart--v1"/>
            {!collapsed && <span>Painel admin</span>}
          </button>

          <button
            onClick={() => window.location.href = "/marketing"}
            className="w-full flex items-center gap-3 px-4  rounded-lg text-sm mt-3 
            text-gray-800 hover:bg-red-50 transition"
          >
            <img width="18" height="18" src="https://img.icons8.com/ios/50/combo-chart--v1.png" alt="combo-chart--v1"/>
            {!collapsed && <span>Painel de marketing</span>}
          </button>

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm mt-6 
            text-red-600 hover:bg-red-50 transition"
          >
            <FiLogOut size={18} />
            {!collapsed && <span>Sair</span>}
          </button>
        </nav>

      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {section === "overview" && <OverviewSection />}
        {section === "analytics" && <AnalyticsSection />}
        {section === "whatsapp" && <WhatsappSendTab />}
        {section === "pagarme" && <PagarmeTab />}
        {section === "users" && <UsersSection />}
      </main>
    </div>
  );
}

/* ————————————————————————————————
   COMPONENTES DAS SEÇÕES
——————————————————————————————— */

function OverviewSection() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-bold text-gray-900">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Clientes Ativos" value="423" />
        <StatCard label="Planos Ativos" value="12" />
        <StatCard label="Receita Mensal" value="R$ 32.450,00" />
      </div>

      <RevenueChart />
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart />
        <UsersChart />
      </div>
    </div>
  );
}

function UsersSection() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Usuários</h2>
      <p className="text-gray-600 mt-2">Gerencie permissões e colaboradores.</p>
    </div>
  );
}

/* ————————————————————————————————
   COMPONENTES UTILITÁRIOS
——————————————————————————————— */

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function RevenueChart() {
  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <h3 className="text-lg font-semibold mb-4">Receita Mensal</h3>

      <Chart
        type="area"
        height={300}
        options={{
          chart: { toolbar: { show: false } },
          colors: ["#711b96"],
          stroke: { width: 2, curve: "smooth" },
          dataLabels: { enabled: false },
          xaxis: { categories: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"] },
        }}
        series={[
          { name: "Receita", data: [15000, 18000, 22000, 25000, 27000, 32450] },
        ]}
      />
    </div>
  );
}

function UsersChart() {
  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <h3 className="text-lg font-semibold mb-4">Novos Usuários</h3>

      <Chart
        type="bar"
        height={300}
        options={{
          chart: { toolbar: { show: false } },
          colors: ["#711b96"],
          plotOptions: { bar: { borderRadius: 4 } },
          xaxis: { categories: ["Seg", "Ter", "Qua", "Qui", "Sex"] },
        }}
        series={[
          { name: "Usuários", data: [32, 45, 51, 62, 58] },
        ]}
      />
    </div>
  );
}
