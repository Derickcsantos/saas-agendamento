"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import SecretCodeModal from "@/components/SecretCodeModal";

const Input = React.memo(function Input({
  label,
  field,
  value,
  onChange,
  onBlur,
  savingField,
  strongColor,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium text-gray-700">{label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
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
});

export default function SettingsTab({ org }) {
  const router = useRouter();
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
    appointment_prepayment: false,
    prepayment_type: "percent",
    prepayment_value: "",
    pix_key: "",
    secret_code: "",
  });

  // SECRET CODE STATE
  const [hasSecretCode, setHasSecretCode] = useState(false);
  const [secretCodeModal, setSecretCodeModal] = useState(false);
  const [secretCodeMode, setSecretCodeMode] = useState("set"); // "verify" | "set"
  const [verifiedSecretCode, setVerifiedSecretCode] = useState("");

  const strongColor = palette?.strong_color || "#5E3BEE";

  // ============================
  // LOAD INITIAL DATA
  // ============================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [colorsRes, detailsRes, policiesRes, hasSecretRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${org.slug_organization}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${org.slug_organization}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}/has-secret-code`)
        ]);

        const colorsData = await colorsRes.json();
        const detailsData = await detailsRes.json();
        const policiesData = await policiesRes.json();
        const hasSecretData = await hasSecretRes.json();

        setPalette(colorsData);
        setSettings({
          name: detailsData.name,
          slug_organization: detailsData.slug_organization,
          email: detailsData.email,
          phone: detailsData.phone,
          timezone: detailsData.timezone || "America/Sao_Paulo",
          logo_organization: detailsData.logo_organization,
        });
        setPolicies({
          ...policies,
          ...policiesData,
        });
        setHasSecretCode(hasSecretData.hasSecretCode);

      } catch (e) {
        toast.error("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [org.slug_organization]);

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

      const json = await res.json();

      // ✅ SE FOI ATUALIZADO O SLUG E RECEBEMOS newSlug, REDIRECIONAR
      if (key === "slug_organization" && json?.newSlug) {
        toast.success("Slug atualizado! Redirecionando...");
        
        // Usar window.location.href para forçar reload completo
        setTimeout(() => {
          window.location.href = `/${json.newSlug}/admin`;
        }, 1500);
      } else {
        toast.success("Atualizado!");
      }
    } catch (err) {
      toast.error("Erro ao atualizar campo.");
      console.error("Erro ao atualizar:", err);
    } finally {
      setSavingField(null);
    }
  };

  // ============================
  // HANDLERS COM useCallback
  // ============================
  const handleSettingChange = useCallback(
    (key) => (v) => {
      setSettings((prev) => ({ ...prev, [key]: v }));
    },
    []
  );

  const handlePolicyChange = useCallback(
    (key) => (v) => {
      setPolicies((prev) => ({ ...prev, [key]: v }));
    },
    []
  );

  // ============================
  // SECRET CODE HANDLERS
  // ============================
  const handleSecretCodeClick = () => {
    if (hasSecretCode) {
      setSecretCodeMode("verify");
      setSecretCodeModal(true);
    } else {
      setSecretCodeMode("set");
      setSecretCodeModal(true);
    }
  };

  const handleSecretCodeVerify = async (code) => {
    // Etapa 1: validar o código atual
    if (secretCodeMode === "verify") {
      toast.success("Código confirmado. Defina o novo código.");
      setVerifiedSecretCode(code);
      setSecretCodeMode("set");
      return;
    }

    // Etapa 2: salvar o novo código
    try {
      setSavingField("secret_code");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            secret_code: code,
            ...(hasSecretCode ? { current_secret_code: verifiedSecretCode } : {}),
          }),
        }
      );

      if (!res.ok) throw new Error("Erro ao atualizar código");

      setHasSecretCode(true);
      setSecretCodeModal(false);
      setVerifiedSecretCode("");
      toast.success(`Código de segurança ${hasSecretCode ? "atualizado" : "criado"}!`);
    } catch (err) {
      toast.error("Erro ao atualizar código");
      console.error("Erro:", err);
    } finally {
      setSavingField(null);
    }
  };

  // ============================
  // UPLOAD DE LOGO
  // ============================
  const handleLogoUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      setSavingField("logo_organization");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`,
        {
          method: "PUT",
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
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`}
            value={settings.name}
            onChange={handleSettingChange("name")}
            onBlur={() =>
              updateField(
                "name",
                settings.name,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <Input
            label="Slug da Organização"
            field="slug_organization"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`}
            value={settings.slug_organization}
            onChange={handleSettingChange("slug_organization")}
            onBlur={() =>
              updateField(
                "slug_organization",
                settings.slug_organization,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <Input
            label="Email"
            field="email"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`}
            value={settings.email}
            onChange={handleSettingChange("email")}
            onBlur={() =>
              updateField(
                "email",
                settings.email,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <Input
            label="Telefone"
            field="phone"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`}
            value={settings.phone}
            onChange={handleSettingChange("phone")}
            onBlur={() =>
              updateField(
                "phone",
                settings.phone,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <Input
            label="Timezone"
            field="timezone"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`}
            value={settings.timezone}
            onChange={handleSettingChange("timezone")}
            onBlur={() =>
              updateField(
                "timezone",
                settings.timezone,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
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
            onChange={handlePolicyChange("max_schedule_days")}
            onBlur={() =>
              updateField(
                "max_schedule_days",
                policies.max_schedule_days,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <Input
            label="Mínimo de horas antes para permitir agendamento"
            field="min_hours_before_booking"
            api={`${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`}
            value={policies.min_hours_before_booking}
            onChange={handlePolicyChange("min_hours_before_booking")}
            onBlur={() =>
              updateField(
                "min_hours_before_booking",
                policies.min_hours_before_booking,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
              )
            }
            savingField={savingField}
            strongColor={strongColor}
          />

          <label htmlFor="google_calendar_sync">Sincronização com google calendário</label>
          <select
            id="google_calendar_sync"
            value={policies.sync_google_calendar ? "true" : "false"}
            onChange={(e) =>
              handlePolicyChange("sync_google_calendar")(
                e.target.value === "true"
              )
            }
            onBlur={() =>
              updateField(
                "sync_google_calendar",
                policies.sync_google_calendar,
                `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
              )
            }
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>

          <div className="border rounded-xl p-4 shadow-sm bg-white space-y-3">
            <h4 className="text-base font-semibold text-gray-800">Pagamento antecipado</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Exigir pré-pagamento?</label>
                <select
                  value={policies.appointment_prepayment ? "true" : "false"}
                  onChange={(e) => handlePolicyChange("appointment_prepayment")(e.target.value === "true")}
                  onBlur={() =>
                    updateField(
                      "appointment_prepayment",
                      policies.appointment_prepayment,
                      `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-600">Tipo</label>
                <select
                  value={policies.prepayment_type || "percent"}
                  onChange={(e) => handlePolicyChange("prepayment_type")(e.target.value)}
                  onBlur={() =>
                    updateField(
                      "prepayment_type",
                      policies.prepayment_type,
                      `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                  disabled={!policies.appointment_prepayment}
                >
                  <option value="percent">Percentual do serviço</option>
                  <option value="value">Valor fixo (R$)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">Valor / Percentual</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={policies.prepayment_value ?? ""}
                  onChange={(e) => handlePolicyChange("prepayment_value")(e.target.value)}
                  onBlur={() =>
                    updateField(
                      "prepayment_value",
                      Number(policies.prepayment_value || 0),
                      `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                  disabled={!policies.appointment_prepayment}
                />
                <p className="text-xs text-gray-500">Ex: 50.00 para valor fixo ou 30 para 30%.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-600">Chave PIX para recebimentos</label>
                <input
                  type="text"
                  value={policies.pix_key ?? ""}
                  onChange={(e) => handlePolicyChange("pix_key")(e.target.value)}
                  onBlur={() =>
                    updateField(
                      "pix_key",
                      policies.pix_key,
                      `${process.env.NEXT_PUBLIC_API_URL}/api/organization-policies/${org.slug_organization}`
                    )
                  }
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="email, CPF, telefone ou chave aleatória"
                />
                <p className="text-xs text-gray-500">Usada para saques e identificação de recebimentos.</p>
              </div>
            </div>
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

          {/* SECRET CODE CARD */}
          <div className="p-6 border rounded-xl shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">🔐 Código de Segurança</h3>

            <p className="text-sm text-gray-600 mb-4">
              {hasSecretCode
                ? "Você já possui um código de segurança. Clique para atualizar."
                : "Crie um código de 4 dígitos para proteger operações sensíveis como saques."}
            </p>

            <button
              onClick={handleSecretCodeClick}
              className="px-4 py-2 rounded-lg text-white transition"
              style={{ backgroundColor: strongColor }}
            >
              {hasSecretCode ? "Atualizar Código" : "Criar Código"}
            </button>

            <p className="text-xs text-gray-500 mt-3">
              ℹ️ O código será solicitado antes de operações importantes como saques.
            </p>
          </div>
        </div>
      </div>

      {/* SECRET CODE MODAL */}
      <SecretCodeModal
        isOpen={secretCodeModal}
        title={secretCodeMode === "set" ? "Definir Código de Segurança" : "Confirmar Código Atual"}
        description={
          secretCodeMode === "set"
            ? "Defina um código de 4 dígitos para proteger operações sensíveis."
            : "Digite seu código atual para confirmar a alteração."
        }
        onVerify={handleSecretCodeVerify}
        onCancel={() => {
          setSecretCodeModal(false);
          setSecretCodeMode("set");
          setVerifiedSecretCode("");
        }}
        slug={org.slug_organization}
        isLoading={savingField === "secret_code"}
        strongColor={strongColor}
        mode={secretCodeMode === "set" ? "create" : "verify"}
      />
    </div>
  );
}
