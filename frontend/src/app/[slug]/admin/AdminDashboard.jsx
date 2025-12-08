"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Card from "./components/Card";
import ChartCard from "./components/ChartCard";
import Table from "./components/Table";
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

export default function AdminDashboard({ slug }) {
  const router = useRouter();
  const [org, setOrg] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ======================
  // Autenticação
  // ======================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/${slug}/check`, {
          credentials: "include",
        });
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

      } catch {
        router.push(`/${slug}/login`);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, slug]);

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

    router.push(`/${slug}/login`);
  };

  // ======================
  // Buscar dados
  // ======================
  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, statsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard/${slug}`, {
            credentials: "include",
          }),
        ]);

        const orgData = await orgRes.json();
        const statsData = await statsRes.json();

        setOrg(orgData);
        setStats(statsData);

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
        return <CategoriesTab org={org} />;
      case "services":
        return <ServicesTab org={org} />;
      case "employees":
        return <EmployeesTab org={org} />;
      case "appointments":
        return <AppointmentsTab org={org} />;
      case "clients":
        return <ClientsTab org={org} />;
      case "revenues":
        return <RevenuesTab org={org} />;
      case "coupons":
        return <CouponsTab org={org} />;
      case "users":
        return <UsersTab org={org} />;
      case "faster-schedule":
        return <FasterScheduleTab org={org} />;
      case "site":
        return <SiteTab org={org} />;
      case "calendar-google":
        return <PersonalCalendarTab org={org} />;
      case "settings":
        return <SettingsTab org={org} />;
      case "exit":
        return null;
      

      default:
        return (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Serviços" value={stats?.totalServices} org={org} />
              <Card title="Funcionários" value={stats?.totalEmployees} org={org} />
              <Card title="Categorias" value={stats?.totalCategories} org={org} />
              <Card title="Agendamentos" value={stats?.totalAppointments} org={org} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 w-full overflow-x-hidden">
              <ChartCard
                id="appointmentsChart"
                title="Agendamentos por mês"
                data={{
                  labels: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
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
        <Topbar org={org} slug={slug} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-full overflow-x-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
