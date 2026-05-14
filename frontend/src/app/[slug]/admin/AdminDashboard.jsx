"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DollarSign, Users, CalendarCheck, ReceiptText } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Card from "./components/Card";
import ChartCard from "./components/ChartCard";
import ServicesDoughnutChartCard from "./components/ServicesDoughnutChartCard";
import Table from "./components/Table";
import ScheduleLinkCard from "./components/ScheduleLinkCard";
import CategoriesTab from "./components/CategoriesTab";
import ServicesTab from "./components/ServicesTab";
import EmployeesTab from "./components/EmployeesTab";
import AppointmentsTab from "./components/AppointmentsTab";
import ClientsTab from "./components/ClientsTab";
import RevenuesTab from './components/RevenuesTab';
import CouponsTab from "./components/CouponsTab";
import UsersTab from "./components/UsersTab";
import FasterScheduleTab from "./components/FasterScheduleTab";
import SiteTab from "./components/SiteTab";
import SettingsTab from "./components/SettingsTab";
import PersonalCalendarTab from "./components/PersonalCalendarTab";
import GalleryTab from "./components/GalleryTab";
import ClosedPeriodsTab from './components/ClosedPeriods';
import EmployeeIntervalsTab from './components/EmployeeIntervalsTab';
import RevenueAreaChartCard from "./components/RevenueAreaChartCard";
import WhatsappTab from "./components/WhatsappTab";
import ExpensesTab from "./components/ExpensesTab";
import QueueTab from "@/app/[slug]/admin/components/QueueTab";
import OrganizationSubscriptionsTab from "./components/OrganizationSubscriptionsTab";

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export default function AdminDashboard({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [org, setOrg] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [appInstalled, setAppInstalled] = useState(false);
  const [palette, setPalette] = useState(null);

  // ======================
  // Autenticação
  // ======================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`);
        const data = await res.json();

        if (!data.authenticated) {
          router.push(`/${slug}/login`);
          return;
        }

        if (data.user.tipo === "comum") {
          router.push(`/${slug}/minha-conta`);
          return;
        }

        if (data.user.tipo === "funcionario") {
          router.push(`/${slug}/profissional`);
          return;
        }

        setUser(data.user);

        // ✅ Busca dados do usuário para verificar app_installed
        const userRes = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${slug}/${data.user.id}`);
        const userData = await userRes.json();
        setAppInstalled(userData?.app_installed || false);

      } catch {
        router.push(`/${slug}/login`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, slug]);

  useEffect(() => {
    if (searchParams?.get("calendar") === "connected") {
      setActiveTab("calendar-google");
      router.replace(`/${slug}/admin`);
    }
  }, [router, searchParams, slug]);

  useEffect(() => {
    if (activeTab === "exit") {
      logout();
    }
  }, [activeTab]);

  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { 
      method: "POST",
      credentials: "include"
    });

    // 🔥 Limpa token do sessionStorage
    sessionStorage.removeItem('token');
    router.push(`/${slug}/login`);
  };

  // ======================
  // Buscar dados
  // ======================
  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, statsRes, colorRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard/${slug}`, {
            credentials: "include",
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
            credentials: "include",
          }),
        ]);

        const orgData = await orgRes.json();
        const statsData = await statsRes.json();
        const colorData = await colorRes.json();

        setOrg(orgData);
        setStats(statsData);
        setPalette(colorData);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Carregando...
      </div>
    );

  if (!org)
    return (
      <div className="flex h-screen items-center justify-center bg-white text-gray-500">
        Sincronizando informações
      </div>
    );

  const renderContent = () => {
    switch (activeTab) {
      case "categories":
        return <CategoriesTab org={org} setActiveTab={setActiveTab} />;
      case "services":
        return <ServicesTab org={org} setActiveTab={setActiveTab} />;
      case "employees":
        return <EmployeesTab org={org} setActiveTab={setActiveTab} />;
      case "appointments":
        return <AppointmentsTab org={org} setActiveTab={setActiveTab} />;
      case "closed-periods":
        return <ClosedPeriodsTab org={org} setActiveTab={setActiveTab} />;
      case "employee-intervals":
        return <EmployeeIntervalsTab org={org} setActiveTab={setActiveTab} user={user} />;
      case "clients":
        return <ClientsTab org={org} setActiveTab={setActiveTab} />;
      case "revenues":
        return <RevenuesTab org={org} setActiveTab={setActiveTab} />;
      case "expenses":
        return <ExpensesTab org={org} setActiveTab={setActiveTab} />;
      case "queue":
        return <QueueTab org={org} setActiveTab={setActiveTab} />;
      case "gallery":
        return <GalleryTab org={org} setActiveTab={setActiveTab} />;
      case "coupons":
        return <CouponsTab org={org} setActiveTab={setActiveTab} />;
      case "users":
        return <UsersTab org={org} setActiveTab={setActiveTab} />;
      case "faster-schedule":
        return <FasterScheduleTab org={org} setActiveTab={setActiveTab} />;
      case "gallery":
        return <GalleryTab org={org} setActiveTab={setActiveTab} />;
      case "whatsapp":
        return <WhatsappTab org={org} setActiveTab={setActiveTab} />;
      case "site":
        return <SiteTab org={org} setActiveTab={setActiveTab} />;
      case "calendar-google":
        return <PersonalCalendarTab org={org} setActiveTab={setActiveTab} />;
      case "settings":
        return <SettingsTab org={org} />;
      case "organization-subscriptions":
        return <OrganizationSubscriptionsTab org={org} user={user} />;
      case "exit":
        return null;
      

      default:
        return (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Receita (30 dias)" value={formatBRL(stats?.totalRevenue)} org={org} icon={<DollarSign size={18} />} />
              <Card title="Agendamentos" value={stats?.totalAppointments} org={org} icon={<CalendarCheck size={18} />} />
              <Card title="Despesas (30 dias)" value={formatBRL(stats?.totalExpenses)} org={org} icon={<ReceiptText size={18} />} />
              <Card title="Clientes" value={stats?.totalClients} org={org} icon={<Users size={18} />} />
            </section>

            <section className="mt-6">
              <ScheduleLinkCard slug={slug} org={org} />
            </section>

              <section className="mt-6">
                <RevenueAreaChartCard org={org} />
              </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 w-full overflow-x-hidden">
              <ChartCard
                id="appointmentsChart"
                title="Agendamentos por mês"
                data={{
                  labels: stats?.monthlyAppointmentsLabels || ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
                  values: stats?.monthlyAppointments || [],
                }}
                org={org}
              />
              <ChartCard
                id="servicesChart"
                title="Serviços mais populares"
                data={{
                  labels: stats?.servicesPopularity?.map((s) => s.service) || [],
                  values: stats?.servicesPopularity?.map((s) => s.count) || [],
                }}
                org={org}
              />
              <ServicesDoughnutChartCard
                org={org}
                data={stats?.servicesPopularity || []}
              />
            </section>

            <section className="mt-6 space-y-6 overflow-hidden">
              <div className="overflow-x-auto">
                <Table
                  title="Últimos agendamentos"
                  columns={["Cliente", "Serviço", "Profissional", "Data", "Status"]}
                  data={stats?.latestAppointments || []}
                />
              </div>

              <div className="overflow-x-auto">
                <Table
                  title="Funcionários ativos"
                  columns={["Nome", "Email", "Telefone", "Status"]}
                  data={stats?.employeesList || []}
                />
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden"> 
      {/* Sidebar fixa sem deixar vazar */}
      <div className="shrink-0">
        <Sidebar org={org} slug={slug} setActiveTab={setActiveTab} activeTab={activeTab} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col max-w-full overflow-hidden">
        <Topbar
          org={org}
          slug={slug}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          user={user}
          appInstalled={appInstalled}
          onAppInstalled={() => setAppInstalled(true)}
          palette={palette}
        />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-full overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
