"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({ org, slug, activeTab, setActiveTab }) {
  const [palette, setPalette] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // MOBILE: abre/fecha o menu lateral
  const [mobileOpen, setMobileOpen] = useState(false);

  // FECHAR AO CLICAR FORA NO MOBILE
  useEffect(() => {
    function handleOutsideClick(e) {
      const sidebar = document.getElementById("sidebar-wrapper");
      if (sidebar && !sidebar.contains(e.target)) {
        setMobileOpen(false);
      }
    }

    if (mobileOpen) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => document.removeEventListener("click", handleOutsideClick);
  }, [mobileOpen]);

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
    { name: 'Calendário do google', key: 'calendar-google', icon: 'bi-calendar-check' },
    { name: "Configurações", key: "settings", icon: "bi-gear" },
    { name: "Sair", key: "exit", icon: "bi-door" },
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
    <>
      {/* BOTÃO MOBILE */}
      <button
        className="md:hidden fixed top-3 right-4 z-[55] bg-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <i className="bi bi-list text-xl"></i>
      </button>

      {/* BACKDROP MOBILE */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40"></div>
      )}

      {/* SIDEBAR */}
      <aside
        id="sidebar-wrapper"
        className={`
          fixed md:static top-0 left-0 h-screen border-r bg-white shadow-sm
          flex flex-col transition-all duration-300 z-50

          ${collapsed ? "w-20" : "w-64"}

          /* MOBILE: off-canvas */
          md:translate-x-0
          ${mobileOpen ? "translate-x-0 w-20" : "-translate-x-64 w-20"}
        `}
      >
        {/* LOGO + COLAPSAR */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={org.logo_organization || "/marcafy-logo.jpg"}
              className="w-10 h-10 rounded-full object-cover"
            />

            {/* TEXTO ORIGINAL (SEM ALTERAR) */}
            {!collapsed && (
              <h2 className="font-semibold text-gray-900 truncate hidden md:block">
                {org.name}
              </h2>
            )}
          </div>

          {/* botão desktop de colapsar */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-200 transition hidden md:block"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* botão mobile para fechar */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md hover:bg-gray-200 transition md:hidden"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* MENU - estilo ORIGINAL RESTAURADO */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  setMobileOpen(false);
                }}
                className={`		
	                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium		
	                transition-all		
	                ${isActive ? "text-white" : "text-gray-700 hover:bg-gray-100"}		
	              `}		
	              style={{		
	               background: isActive ? strong : "transparent",		
	              }}
              >
                {/* ícone NORMAL = igual antes */}
                <i className={`bi ${item.icon} text-lg`}></i>

                {/* TEXTO ORIGINAL - volta 100% */}
                {!collapsed && (
                  <span className="md:inline ">
                    {item.name}
                  </span>
                )}
              </button>

            );
          })}
        </nav>

        {/* FOOTER */}
        <div
          className="p-4 text-center border-t text-xs font-medium"
          style={{ color: textStrong }}
        >
          {collapsed || mobileOpen ? org.name : org.name}
        </div>
      </aside>
    </>
  );
}
