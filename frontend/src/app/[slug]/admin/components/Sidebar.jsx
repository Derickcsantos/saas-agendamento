'use client'

export default function Sidebar({ org, activeTab, setActiveTab }) {
  const items = [
    { name: "Visão Geral", key: "overview", icon: "bi-house-door" },
    { name: "Categorias", key: "categories", icon: "bi-tags" },
    { name: "Serviços", key: "services", icon: "bi-scissors" },
    { name: "Funcionários", key: "employees", icon: "bi-people" },
    { name: "Agendamentos", key: "appointments", icon: "bi-calendar-check" },
    { name: "Clientes", key: "clients", icon: "bi-person" },
  ];

  return (
    <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
      <div className="p-4 border-b text-center">
        <img
          src={org.logo_url || "/default-logo.png"}
          alt="Logo"
          className="w-12 h-12 rounded-full mx-auto"
        />
        <h2 className="mt-2 font-semibold text-gray-800">{org.name}</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`w-full flex items-center gap-2 p-2 rounded-md transition ${
              activeTab === item.key
                ? "bg-indigo-100 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <i className={`bi ${item.icon}`}></i>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
