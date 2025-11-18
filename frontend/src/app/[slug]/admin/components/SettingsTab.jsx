"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function SettingsTab({ org }) {
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState(null);
  const [palette, setPalette] = useState(null);

  // ORGANIZATION STATE
  const [settings, setSettings] = useState({
    name: "",
    slug_organization: "",
    email: "",
    phone: "",
    timezone: "",
    logo_organization: "",
  });

  // POLICIES STATE
  const [policies, setPolicies] = useState({
    max_schedule_days: 30,
    allow_same_day: true,
    min_hours_before_booking: 0,
  });

  const strongColor = palette?.strong_color || "#5E3BEE";

  // ============================
  // LOAD INITIAL DATA
  // ============================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [colorsRes, detailsRes, policiesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${org.slug_organization}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${org.slug_organization}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`)
        ]);

        const colorsData = await colorsRes.json();
        const detailsData = await detailsRes.json();
        const policiesData = await policiesRes.json();

        setPalette(colorsData);
        setSettings({
          name: detailsData.name,
          slug_organization: detailsData.slug_organization,
          email: detailsData.email,
          phone: detailsData.phone,
          timezone: detailsData.timezone || "America/Sao_Paulo",
          logo_organization: detailsData.logo_organization,
        });
        setPolicies(policiesData);

      } catch (e) {
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // ============================
  // SALVAR CAMPO INDIVIDUAL
  // ============================
  const updateField = async (key, value, api) => {
    try {
      setSavingField(key);

      const res = await fetch(api, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar");

      toast.success("Atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar campo.");
    } finally {
      setSavingField(null);
    }
  };

  // ============================
  // INPUT COMPONENT
  // (com focus na strong_color)
  // ============================
  const Input = ({ label, field, value, onChange, api }) => (
    <div className="flex flex-col gap-1">
      <label className="font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => updateField(field, value, api)}
        className="border rounded-lg p-2 transition-all outline-none"
        style={{
          borderColor: savingField === field ? strongColor : "#ddd",
          boxShadow: `0 0 0 1.5px ${
            savingField === field ? strongColor : "transparent"
          }`,
        }}
      />
    </div>
  );

  // ============================
  // UPLOAD DE LOGO
  // ============================
  const handleLogoUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      setSavingField("logo_organization");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/upload-logo/${org.slug_organization}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error();

      setSettings((prev) => ({
        ...prev,
        logo_organization: json.url,
      }));

      toast.success("Logo atualizada!");
    } catch (err) {
      toast.error("Falha no upload");
    } finally {
      setSavingField(null);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-gray-500 animate-pulse">
        Carregando configurações...
      </div>
    );

  return (
    <div className="p-8 space-y-10">
      {/* TITLE */}
      <h2 className="text-2xl font-bold text-gray-800">Configurações da Organização</h2>

      {/* GRID WRAPPER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* LEFT SIDE — ORGANIZATION INFO */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">Informações da Empresa</h3>

          {/* LOGO */}
          <div className="flex flex-col gap-3">
            <label className="font-medium text-gray-700">Logo</label>

            <div className="w-32 h-32 rounded-full border shadow flex items-center justify-center overflow-hidden relative group">
              {settings.logo_organization ? (
                <img
                  src={settings.logo_organization}
                  className="w-full h-full object-cover group-hover:opacity-40 transition"
                />
              ) : (
                <div className="text-gray-400">Sem logo</div>
              )}

              <label
                className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black bg-opacity-40 flex items-center justify-center text-white cursor-pointer text-sm transition"
              >
                Alterar
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <Input
            label="Nome da Organização"
            field="name"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/update/${org.slug_organization}`}
            value={settings.name}
            onChange={(v) => setSettings({ ...settings, name: v })}
          />

          <Input
            label="Slug da Organização"
            field="slug_organization"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/update/${org.slug_organization}`}
            value={settings.slug_organization}
            onChange={(v) => setSettings({ ...settings, slug_organization: v })}
          />

          <Input
            label="Email"
            field="email"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/update/${org.slug_organization}`}
            value={settings.email}
            onChange={(v) => setSettings({ ...settings, email: v })}
          />

          <Input
            label="Telefone"
            field="phone"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/update/${org.slug_organization}`}
            value={settings.phone}
            onChange={(v) => setSettings({ ...settings, phone: v })}
          />

          <Input
            label="Timezone"
            field="timezone"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/update/${org.slug_organization}`}
            value={settings.timezone}
            onChange={(v) => setSettings({ ...settings, timezone: v })}
          />
        </div>

        {/* RIGHT SIDE — POLICIES & PLAN */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">Políticas de Agendamento</h3>

          <Input
            label="Máximo de dias disponíveis para agendar"
            field="max_schedule_days"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`}
            value={policies.max_schedule_days}
            onChange={(v) => setPolicies({ ...policies, max_schedule_days: Number(v) })}
          />

          <Input
            label="Mínimo de horas antes para permitir agendamento"
            field="min_hours_before_booking"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`}
            value={policies.min_hours_before_booking}
            onChange={(v) => setPolicies({ ...policies, min_hours_before_booking: Number(v) })}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={policies.allow_same_day}
              onChange={(e) => {
                const val = e.target.checked;
                setPolicies({ ...policies, allow_same_day: val });
                updateField(
                  "allow_same_day",
                  val,
                  `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
                );
              }}
              style={{ accentColor: strongColor }}
            />
            <span className="text-gray-700">Permitir agendamento no mesmo dia</span>
          </div>

          {/* PLAN CARD */}
          <div className="p-6 border rounded-xl shadow-sm bg-gradient-to-br from-white to-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Plano Atual</h3>

            {/* Aqui você integra sua API real */}
            <p className="text-gray-600">Plano: <strong>Premium</strong></p>
            <p className="text-gray-600">Renovação: 12/03/2025</p>
            <p className="text-gray-600">Recursos liberados: Agendamentos ilimitados, branding completo</p>

            <button
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: strongColor }}
            >
              Ver planos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
