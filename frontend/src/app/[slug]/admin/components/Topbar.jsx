'use client'

export default function Topbar({ org }) {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center">
      <h1 className="text-lg font-semibold text-gray-700">
        Painel Administrativo — {org.name}
      </h1>
      <button
        onClick={() => {
          localStorage.removeItem("isLoggedIn");
          window.location.href = `/login?organization_id=${org.id}`;
        }}
        className="text-red-500 hover:text-red-700 font-medium"
      >
        Sair
      </button>
    </header>
  );
}
