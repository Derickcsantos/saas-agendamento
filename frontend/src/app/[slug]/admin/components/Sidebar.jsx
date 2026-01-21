"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import useOrganizationColors from "@/app/utils/useOrganizationColors";

export default function Sidebar({ org, slug, activeTab, setActiveTab }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { palette } = useOrganizationColors(org.slug_organization);

  const [mobileOpen, setMobileOpen] = useState(false);

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
    { name: "Clientes", key: "clients", icon: "bi-person-lines-fill" },
    { name: "Agendamentos", key: "appointments", icon: "bi-calendar-check" },
    { name: "Períodos fechados", key: "closed-periods", icon: "bi-calendar-check" },
    { name: "Agendamento rápido", key: "faster-schedule", icon: "bi-lightning" },
    { name: "Receitas", key: "revenues", icon: "bi-cash-coin" },
    { name: "Cupons", key: "coupons", icon: "bi-wallet2" },
    { name: "Usuários", key: "users", icon: "bi-person-badge" },
    { name: "Galeria", key: "gallery", icon: "bi-image" },
    { name: "Site", key: "site", icon: "bi-browser-chrome" },
    { name: 'Calendário do google', key: 'calendar-google', icon: 'bi-calendar-check' },
    { name: "Configurações", key: "settings", icon: "bi-gear" },
    { name: "Sair", key: "exit", icon: "bi bi-door-open" },
  ];

  // Páginas do dropdown "Outras páginas"
  const dropdownPages = [
    { name: "Agenda", path: `/${slug}/agendar`, icon: "bi-calendar-event" },
    { name: "Página do cliente", path: `/${slug}/minha-conta`, icon: "bi-person-circle" },
    { name: "Página do colaborador", path: `/${slug}/profissional`, icon: "bi-briefcase" },
  ];

  // Adicionar "Marketing" apenas se o slug for 'marcafy'
  if (slug === "marcafy") {
    dropdownPages.push({ name: "Marketing", path: "/marketing", icon: "bi-megaphone" });
  }

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

          {/* DROPDOWN "OUTRAS PÁGINAS" */}
          <div className="pt-2 border-t">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
            >
              <i className="bi bi-box-arrow-up-right text-lg"></i>
              {!collapsed && (
                <>
                  <span>Outras páginas</span>
                  <ChevronDown
                    size={16}
                    className={`ml-auto transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>

            {/* ITENS DO DROPDOWN */}
            {dropdownOpen && !collapsed && (
              <div className="pl-6 space-y-1 mt-1">
                {dropdownPages.map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      router.push(page.path);
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                  >
                    <i className={`bi ${page.icon} text-sm`}></i>
                    <span>{page.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
