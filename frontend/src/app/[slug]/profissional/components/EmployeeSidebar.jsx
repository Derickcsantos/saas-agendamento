"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmployeeSidebar({ org, slug, activeTab, setActiveTab, palette }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleOutsideClick(e) {
      const sidebar = document.getElementById("employee-sidebar");
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
    { name: "Dashboard", key: "overview", icon: "bi-house-door" },
    { name: "Meus Agendamentos", key: "appointments", icon: "bi-calendar-check" },
    { name: "Calendário Google", key: "calendar", icon: "bi-google" },
    { name: "Meu Perfil", key: "profile", icon: "bi-person-circle" },
    { name: "Sair", key: "exit", icon: "bi-door-open" },
  ];

  const strong = palette?.strong_color || "#5E3BEE";

  return (
    <>
      {/* BOTÃO MOBILE */}
      <button
        className="md:hidden fixed top-3 right-4 z-[55] bg-white p-2 rounded-lg shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
          setMobileOpen(true);
        }}
      >
        <i className="bi bi-list text-xl"></i>
      </button>

      {/* BACKDROP MOBILE */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40"></div>
      )}

      {/* SIDEBAR */}
      <aside
        id="employee-sidebar"
        className={`
          fixed md:static top-0 left-0 h-screen border-r bg-white shadow-sm
          flex flex-col transition-all duration-300 z-50

          ${collapsed ? "w-20" : "w-64"}

          md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-64"}
        `}
      >
        {/* LOGO + COLAPSAR */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <img
              src={org?.logo_organization || "/marcafy-logo.jpg"}
              className="w-10 h-10 rounded-full object-cover"
              alt="Logo"
            />

            {!collapsed && !mobileOpen && (
              <h2 className="font-semibold text-gray-900 truncate hidden md:block">
                {org?.name}
              </h2>
            )}
          </div>

          {/* Botão desktop colapsar */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-200 transition hidden md:block"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Botão mobile fechar */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md hover:bg-gray-200 transition md:hidden"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* MENU */}
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
                  ${isActive ? "hover:opacity-90" : "text-gray-800 hover:bg-gray-100"}
                `}
                style={{
                  background: isActive ? strong : "transparent",
                  color: isActive
                    ? palette?.text_light_color || "#ffffff"
                    : palette?.text_dark_color || "#1f2937",
                }}
              >
                <i className={`bi ${item.icon} text-lg`}></i>

                {!collapsed && (
                  <span className="md:inline">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-4 text-center border-t text-xs font-medium text-gray-600">
          {collapsed || mobileOpen ? "👤" : "Painel Profissional"}
        </div>
      </aside>
    </>
  );
}
