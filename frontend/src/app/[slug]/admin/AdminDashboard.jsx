"use client";

import { useEffect, useState } from "react";
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

export default function AdminDashboard({ slug }) {
  const [org, setOrg] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // ======================
  // Buscar dados iniciais
  // ======================
  useEffect(() => {
    async function fetchData() {
      try {
        const [orgRes, statsRes] = await Promise.all([
          fetch(`http://localhost:3000/api/organizations/slug/beleza-pura`),
          fetch(`http://localhost:3000/api/admin/dashboard/beleza-pura`),
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
        Organização não encontrada.
      </div>
    );

  // ======================
  // Renderização por abas
  // ======================
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
      default:
        return (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Serviços" value={stats?.totalServices} />
              <Card title="Funcionários" value={stats?.totalEmployees} />
              <Card title="Categorias" value={stats?.totalCategories} />
              <Card title="Agendamentos" value={stats?.totalAppointments} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ChartCard title="Agendamentos por mês" id="appointmentsChart" />
              <ChartCard title="Serviços mais populares" id="servicesChart" />
            </section>

            <section className="mt-6 space-y-6">
              <Table
                title="Últimos agendamentos"
                columns={["Cliente", "Serviço", "Profissional", "Data", "Status"]}
                data={stats?.latestAppointments || []}
              />
              <Table
                title="Funcionários ativos"
                columns={["Nome", "Email", "Telefone", "Status"]}
                data={stats?.employeesList || []}
              />
            </section>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar org={org} setActiveTab={setActiveTab} activeTab={activeTab} />
      <div className="flex-1 flex flex-col">
        <Topbar org={org} />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
