"use client";
import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import ClientLanding from "@/app/[slug]/ClientLanding"; // IMPORT CONFIRMADO

export default function SiteTab({ org }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [palette, setPalette] = useState(null);

  const [previewMode, setPreviewMode] = useState("desktop");
  const previewRef = useRef();

  /* =======================================================
      FORM INITIAL STATE (reflete todo o conteúdo do landing)
  ======================================================= */
  const [form, setForm] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    whatsapp: "",
    instagram: "",
    email: "",
    telefone: "",
    endereco: "",
    hero_title: "",
    hero_subtitle: "",
    hero_button_text: "",
    hero_button_url: "",
    hero_image_url: "",
    about_title: "",
    about_text: "",
    about_image_url: "",
    services_title: "",
    gallery_title: "",
    gallery_subtitle: "",
    testimonials_title: "",
    testimonials_subtitle: "",
    team_title: "",
    team_subtitle: "",
    show_gallery: false,
    show_testimonials: false,
    show_team: false,
    background_image_url: "",
    background_blur: "0",
    background_opacity: "1",
  });

  /* =====================================================================
      LOAD LANDING PAGE + PALETTE (colors)
  ===================================================================== */
  const loadLanding = async () => {
    try {
      setLoading(true);

      const [landingRes, paletteRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${org.slug_organization}`,
          { credentials: "include" }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${org.slug_organization}`,
          { credentials: "include" }
        ),
      ]);

      if (!landingRes.ok) throw new Error("Erro ao carregar Landing Page");
      if (!paletteRes.ok) throw new Error("Erro ao carregar Paleta");

      const landingData = await landingRes.json();
      const paletteData = await paletteRes.json();

      setPalette(paletteData);
      setForm(landingData);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLanding();
  }, []);

  /* =====================================================================
      Update form & auto-update Preview
  ===================================================================== */
  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* =====================================================================
      HANDLE IMAGE UPLOAD (hero + about + background)
  ===================================================================== */
  const uploadImage = async (file, field) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/landing/upload-image/${org.slug_organization}`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    if (!res.ok) {
      toast.error("Erro ao enviar imagem");
      return;
    }

    const { url } = await res.json();
    setForm((prev) => ({ ...prev, [field]: url }));
    toast.success("Imagem atualizada!");
  };

  /* =====================================================================
      SAVE TO BACKEND
  ===================================================================== */
  const save = async () => {
    try {
      setSaving(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page/${org.slug_organization}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) throw new Error("Falha ao salvar");

      toast.success("Site atualizado com sucesso!");
      loadLanding();
    } catch (err) {
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================================
      FORM INPUT UI — dynamic focus color
  ===================================================================== */
  const inputStyle =
    palette && palette.strong_color
      ? {
          "--focus-color": palette.strong_color,
        }
      : {};

  const inputClass =
    "w-full border p-2 rounded outline-none transition-all focus:ring-2 focus:ring-[var(--focus-color)]";

  /* =====================================================================
      LIVE PREVIEW — FULL CLIENT LANDING RENDER
  ===================================================================== */
  const Preview = () => (
    <div
      className={`transition-all duration-300 border rounded-xl overflow-auto shadow-xl bg-white ${
        previewMode === "mobile"
          ? "max-w-[420px] mx-auto"
          : "w-full"
      }`}
      style={{ height: previewMode === "desktop" ? "800px" : "750px" }}
    >
      <div className={previewMode === "mobile" ? "scale-[0.85] origin-top" : ""}>
        <ClientLanding
          slug={org.slug_organization}
          injectedLanding={form}
          injectedPalette={palette}
          isPreview
        />
      </div>
    </div>
  );

  /* =====================================================================
      RENDER
  ===================================================================== */
  if (loading || !palette)
    return (
      <div className="text-center py-20 text-gray-500 animate-pulse">
        Carregando configurações...
      </div>
    );

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* ============================ LEFT FORM ============================ */}
      <div className="w-full xl:w-[480px] 2xl:w-[520px] shrink-0">
        <h2 className="text-2xl font-semibold">Configurações do Site</h2>

        {/* SEO */}
        <section className="bg-white p-5 rounded-xl shadow border space-y-3">
          <h3 className="font-semibold text-gray-700 text-lg">SEO</h3>

          <input
            style={inputStyle}
            className={inputClass}
            placeholder="Meta Title"
            value={form.meta_title}
            onChange={(e) => update("meta_title", e.target.value)}
          />

          <textarea
            style={inputStyle || ''}
            className={inputClass}
            placeholder="Meta Description"
            rows={3}
            value={form.meta_description}
            onChange={(e) => update("meta_description", e.target.value)}
          />

          <input
            style={inputStyle}
            className={inputClass}
            placeholder="Meta Keywords"
            value={form.meta_keywords}
            onChange={(e) => update("meta_keywords", e.target.value)}
          />
        </section>

        {/* HERO */}
        <section className="bg-white p-5 rounded-xl shadow border space-y-3">
          <h3 className="font-semibold text-gray-700 text-lg">Hero</h3>

          <input
            style={inputStyle}
            className={inputClass}
            placeholder="Título"
            value={form.hero_title}
            onChange={(e) => update("hero_title", e.target.value)}
          />

          <textarea
            style={inputStyle}
            className={inputClass}
            placeholder="Subtítulo"
            value={form.hero_subtitle}
            rows={3}
            onChange={(e) => update("hero_subtitle", e.target.value)}
          />

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Imagem do Hero</label>
            <input
              type="file"
              accept="image/*"
              className="w-full"
              onChange={(e) => uploadImage(e.target.files[0], "hero_image_url")}
            />
            {form.hero_image_url && (
              <img
                src={form.hero_image_url}
                className="w-28 h-28 rounded shadow object-cover border"
              />
            )}
          </div>
        </section>

        {/* ABOUT */}
        <section className="bg-white p-5 rounded-xl shadow border space-y-3">
          <h3 className="font-semibold text-gray-700 text-lg">Sobre</h3>

          <input
            style={inputStyle}
            className={inputClass}
            placeholder="Título"
            value={form.about_title}
            onChange={(e) => update("about_title", e.target.value)}
          />

          <textarea
            style={inputStyle}
            className={inputClass}
            rows={4}
            placeholder="Texto"
            value={form.about_text}
            onChange={(e) => update("about_text", e.target.value)}
          />

          <div className="space-y-2">
            <label className="text-sm text-gray-500">Imagem da seção</label>
            <input
              type="file"
              accept="image/*"
              className="w-full"
              onChange={(e) => uploadImage(e.target.files[0], "about_image_url")}
            />
            {form.about_image_url && (
              <img
                src={form.about_image_url}
                className="w-28 h-28 rounded shadow object-cover border"
              />
            )}
          </div>
        </section>

        {/* SERVICES */}
        <section className="bg-white p-5 rounded-xl shadow border space-y-3">
          <h3 className="font-semibold text-gray-700 text-lg">Serviços</h3>
          <input
            style={inputStyle}
            className={inputClass}
            placeholder="Título da seção"
            value={form.services_title}
            onChange={(e) => update("services_title", e.target.value)}
          />
        </section>

        {/* CONTATO */}
        <section className="bg-white p-5 rounded-xl shadow border space-y-3">
          <h3 className="font-semibold text-gray-700 text-lg">Contato</h3>

          {["email", "telefone", "whatsapp", "instagram", "endereco"].map(
            (field) => (
              <input
                key={field}
                style={inputStyle}
                className={inputClass}
                placeholder={field.toUpperCase()}
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
              />
            )
          )}
        </section>

        <button
          onClick={save}
          className={`w-full py-3 rounded-lg text-white font-semibold shadow transition ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {/* ============================ RIGHT PREVIEW ============================ */}
      <div className="w-full flex-1">
        <div className="flex justify-between px-2 mb-3">
          <h3 className="text-lg font-semibold">Preview ao vivo</h3>

          <div className="flex gap-2">
            {["desktop", "mobile"].map((mode) => (
              <button
                key={mode}
                className={`px-4 py-1 rounded-md transition ${
                  previewMode === mode
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200"
                }`}
                onClick={() => setPreviewMode(mode)}
              >
                {mode === "desktop" ? "Desktop" : "Mobile"}
              </button>
            ))}
          </div>
        </div>

        <Preview />
      </div>
    </div>
  );
}
