"use client";

import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrialExpiredModal({ open, org, setActiveTab }) {
  const router = useRouter()
  const { palette } = useOrganizationColors(org.slug_organization);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen flex items-center justify-center bg-black/50">
      
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        
        <h2 className="text-xl font-semibold text-gray-900">
          Período de teste encerrado
        </h2>

        <p className="mt-3 text-gray-600">
          Seu período de teste terminou. Para continuar utilizando todas as
          funcionalidades do sistema, escolha um plano.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setActiveTab("organization-subscriptions")}
            className="w-full rounded-lg px-4 py-2 font-medium text-white transition"
            style={{ backgroundColor: palette?.strong_color }}
          >
            Ver planos
          </button>
        </div>

      </div>
    </div>
  );
}