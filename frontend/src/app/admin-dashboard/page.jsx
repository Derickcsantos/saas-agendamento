'use client';

import { useState, useEffect } from 'react';
import { useRouter} from "next/navigation";
import { FiHome, FiBarChart2, FiCreditCard, FiUsers } from "react-icons/fi";
import dynamic from "next/dynamic";
const PagarmeTab = dynamic(() => import('./components/PagarmeTab'), { ssr: false });

export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/marcafy/check`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/login`);
          return;
        }

        if (data.user.tipo !== 'master') {
          router.push(`/login`)
          return
        }

        setUser(data.user);
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push(`/login`);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);
  

  return (
    <div className="flex min-h-screen bg-[#f7f7f7]">

      {/* SIDEBAR PREMIUM */}
      <aside className="w-72 bg-white border-r border-gray-200 px-6 py-8 flex flex-col gap-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>

        <nav className="flex flex-col gap-2">

          <SidebarItem
            icon={<FiHome size={18} />}
            label="Visão Geral"
            active={section === "overview"}
            onClick={() => setSection("overview")}
          />

          <SidebarItem
            icon={<FiBarChart2 size={18} />}
            label="Analytics"
            active={section === "analytics"}
            onClick={() => setSection("analytics")}
          />

          <SidebarItem
            icon={<FiCreditCard size={18} />}
            label="Pagar.me"
            active={section === "pagarme"}
            onClick={() => setSection("pagarme")}
          />

          <SidebarItem
            icon={<FiUsers size={18} />}
            label="Usuários"
            active={section === "users"}
            onClick={() => setSection("users")}
          />

        </nav>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 p-10">
        {section === "overview" && <OverviewSection />}
        {section === "analytics" && <AnalyticsSection />}
        {section === "pagarme" && <PagarmeTab />}
        {section === "users" && <UsersSection />}
      </main>

    </div>
  );
}

/* ================================
   SIDEBAR ITEM COMPONENT
================================ */
function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-all 
        text-sm font-medium
        ${active
          ? "bg-[#711b96] text-white shadow-sm"
          : "text-gray-700 hover:bg-gray-100"}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

/* ================================
   SEÇÃO: OVERVIEW (Padrão Stripe)
================================ */
function OverviewSection() {
  return (
    <div className="space-y-10">

      <h2 className="text-3xl font-bold text-gray-900">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <StatCard label="Clientes Ativos" value="423" />
        <StatCard label="Planos Ativos" value="12" />
        <StatCard label="Receita Mensal" value="R$ 32.450,00" />

      </div>

      {/* Gráfico de Receita */}
      <RevenueChart />

    </div>
  );
}

/* ================================
   SEÇÃO: ANALYTICS
================================ */
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

/* ================================
   SEÇÃO: USERS
================================ */
function UsersSection() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900">Usuários</h2>
      <p className="text-gray-600 mt-2">Gerencie permissões e colaboradores.</p>
    </div>
  );
}

/* ================================
   CARDS
================================ */
function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

/* ================================
   GRÁFICOS
================================ */

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function RevenueChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita Mensal</h3>

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
          {
            name: "Receita",
            data: [15000, 18000, 22000, 25000, 27000, 32450],
          },
        ]}
      />
    </div>
  );
}

function UsersChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Novos Usuários</h3>

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
          {
            name: "Usuários",
            data: [32, 45, 51, 62, 58],
          },
        ]}
      />
    </div>
  );
}
