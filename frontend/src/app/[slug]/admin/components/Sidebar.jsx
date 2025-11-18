'use client'

import { useState, useEffect } from 'react'

export default function Sidebar({ org, slug, activeTab, setActiveTab }) {
  const items = [
    { name: "Visão Geral", key: "overview", icon: "bi-house-door" },
    { name: "Categorias", key: "categories", icon: "bi-tags" },
    { name: "Serviços", key: "services", icon: "bi-grid" },
    { name: "Funcionários", key: "employees", icon: "bi-people" },
    { name: "Agendamentos", key: "appointments", icon: "bi-calendar-check" },
    { name: "Agendamento rápido", key: "faster-schedule", icon: "bi-calendar-check" },
    { name: "Clientes", key: "clients", icon: "bi-person" },
    { name: "Receitas", key: "revenues", icon: "bi bi-cash-coin" },
    { name: "Cupons", key: "coupons", icon: "bi bi-wallet" },
    { name: "Usuários", key: "users", icon: "bi-people" },
    { name: "Site", key: "site", icon: "bi bi-wallet" },
    { name: "Configurações", key: "settings", icon: "bi bi-wallet" },
  ];
  const [palette, setPalette] = useState(null);

  useEffect(() => {
  async function fetchData() {
    try {
      // Executa ambas as chamadas em paralelo
      const [colorRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${slug}`, {
          credentials: "include",
        }),
      ]);

      if (!colorRes.ok) throw new Error("Palette not found");

      const paletteData = await colorRes.json();

      setPalette(paletteData); 

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setNotFound(true);
    }
  }

  if (slug) fetchData();
}, [slug]);


  return (
    <aside className="w-64 shadow-sm hidden md:flex flex-col" style={{backgroundColor: palette?.strong_color || "#dfdfdf"}}>
      <div className="p-4  text-center">
        <img
          src={org.logo_organization || "/marcafy-logo.jpg"}
          alt="Logo"
          className="w-12 h-12 rounded-full mx-auto"
        />
        <h2 className="mt-2 font-semibold" style={{color: palette?.text_light_color || '#ffffff'}}>{org.name}</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`w-full flex items-center gap-2 p-2 rounded-md transition`}
            style={{
              backgroundColor: palette?.light_color || '#f4f4f4f4 ', 
              color: palette?.text_ligth_color || '#ffffff'}}
          >
            <i className={`bi ${item.icon}`}></i>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
