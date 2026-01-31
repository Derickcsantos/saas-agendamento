"use client";

import PWAInstallButton from "@/components/PWAInstallButton";

export default function EmployeeTopbar({ user, slug, palette, appInstalled, onAppInstalled }) {
  return (
    <header className="bg-white border-b shadow-sm px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Olá, {user?.username} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bem-vindo ao seu painel profissional
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ Botão PWA Install */}
          {!appInstalled && user && (
            <PWAInstallButton 
              userId={user.id}
              slug={slug}
              palette={palette}
              onInstallSuccess={onAppInstalled}
            />
          )}

          <div className="hidden md:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: palette?.strong_color || "#5E3BEE" }}
            ></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
