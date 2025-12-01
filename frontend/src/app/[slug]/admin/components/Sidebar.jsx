"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({ org, slug, activeTab, setActiveTab }) {
  const [palette, setPalette] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { name: "Visão Geral", key: "overview", icon: "bi-house-door" },
    { name: "Categorias", key: "categories", icon: "bi-tags" },
    { name: "Serviços", key: "services", icon: "bi-grid" },
    { name: "Funcionários", key: "employees", icon: "bi-people" },
    { name: "Agendamentos", key: "appointments", icon: "bi-calendar-check" },
    { name: "Agendamento rápido", key: "faster-schedule", icon: "bi-lightning" },
    { name: "Receitas", key: "revenues", icon: "bi-cash-coin" },
    { name: "Cupons", key: "coupons", icon: "bi-wallet2" },
    { name: "Usuários", key: "users", icon: "bi-person-badge" },
    { name: "Site", key: "site", icon: "bi-browser-chrome" },
    { name: "Configurações", key: "settings", icon: "bi-gear" },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const colorRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`,
          { credentials: "include" }
        );
        if (!colorRes.ok) throw new Error("Palette not found");

        const paletteData = await colorRes.json();
        setPalette(paletteData);
      } catch (err) {
        console.error("Erro ao buscar paleta:", err);
      }
    }

    if (slug) fetchData();
  }, [slug]);

  const strong = palette?.strong_color || "#5E3BEE";
  const light = palette?.light_color || "#F5F5F5";
  const textStrong = palette?.text_strong_color || "#333";

  return (
    <aside
      className={`h-screen border-r bg-white shadow-sm transition-all duration-300 flex flex-col ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* LOGO + BOTÃO DE COLAPSAR */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <img
            src={org.logo_organization || "/marcafy-logo.jpg"}
            className="w-10 h-10 rounded-full object-cover"
          />
          {!collapsed && (
            <h2 className="font-semibold text-gray-900 truncate">
              {org.name}
            </h2>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-gray-200 transition"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-all
                ${isActive ? "text-white" : "text-gray-700 hover:bg-gray-100"}
              `}
              style={{
                background: isActive ? strong : "transparent",
              }}
            >
              <i
                className={`bi ${item.icon} text-lg`}
                style={{ opacity: collapsed ? 1 : 0.9 }}
              ></i>

              {!collapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* FOOTER INDICADOR DO CLIENTE */}
      <div
        className="p-4 text-center border-t text-xs font-medium"
        style={{
          color: textStrong,
        }}
      >
        {!collapsed ? org.name : org.name.substring(0, 1)}
      </div>
    </aside>
  );
}
