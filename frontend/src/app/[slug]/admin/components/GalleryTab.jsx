"use client";

import { useEffect, useState, useId } from "react";
import { toast } from "react-toastify";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import TrialExpiredModal from "./TrialExpireModal";

export default function GalleryTab({ org, setActiveTab }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [uploadFiles, setUploadFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const { palette } = useOrganizationColors()

  const inputId = useId();
  const { confirm } = useConfirm();

  const [form, setForm] = useState({
    titulo: "",
    descricao: ""
  });

  const [showPaywall, setShowPaywall] = useState(false);

  // Cor primária da organização
  const PRIMARY = palette?.strong_color || "#5E3BEE";

  // ======================
  // 1️⃣ Carregar imagens
  // ======================
  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}`
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const data = await res.json();
      setGalleryImages(data.imagens || []);
      setSelectedIds([]);
    } catch (err) {
      toast.error("Erro ao carregar galeria");
      console.error(err);
    }
  }

  // ======================
  // 2️⃣ DRAG AND DROP
  // ======================
  const openPicker = () => {
    const el = document.getElementById(inputId);
    el?.click();
  };

  const handleFiles = (files) => {
    if (!files?.length) return;
    
    const imageFiles = Array.from(files).filter(f => f.type?.startsWith("image/"));
    setUploadFiles(prev => [...prev, ...imageFiles]);
    setPreviews(prev => [...prev, ...imageFiles.map(f => URL.createObjectURL(f))]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const removePreview = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ======================
  // 3️⃣ UPLOAD
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("titulo", form.titulo);
      formData.append("descricao", form.descricao);

      uploadFiles.forEach((file) => {
        formData.append("imagens[]", file);
      });

      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) throw new Error();

      toast.success("Imagens salvas com sucesso!");
      setUploadFiles([]);
      setPreviews([]);
      setForm({ titulo: "", descricao: "" });
      loadImages();
    } catch (err) {
      toast.error("Erro ao salvar imagens");
      console.error(err);
    }
  };

  // ======================
  // 4️⃣ SELEÇÃO
  // ======================
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  // ======================
  // 5️⃣ DELETE EM LOTE
  // ======================
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    // if (!confirm("Deseja excluir as imagens selecionadas?")) return;

    const confirmed = await confirm({
      title: "Excluir imagens",
      message: "Deseja realmente excluir estas imagens?",
      confirmVariant: "danger"
    });

    if (!confirmed) return

    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}/batch`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ids: selectedIds })
        }
      );

      if (res.status === 402) {
        setShowPaywall(true);
        return;
      }

      const text = await res.text();
      console.log("STATUS:", res.status);
      console.log("RESPOSTA:", text);

      if (!res.ok) {
        throw new Error(text || "Erro ao excluir imagens");
      }

      toast.success("Imagens excluídas com sucesso!");
      loadImages();
    } catch (err) {
      console.error("DELETE BATCH ERROR:", err);
      toast.error("Erro ao excluir imagens");
    }
  };


  return (
    <div className="space-y-8">

      <TrialExpiredModal
        open={showPaywall}
        org={org}
        setActiveTab={setActiveTab}
      />

      {/* ➕ UPLOAD FORM - NO TOPO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6"
      >
        <div>
          <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">
            Adicionar Imagens
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Envie múltiplas imagens para sua galeria
          </p>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Título
          </label>
          <input
            type="text"
            placeholder="Ex: Serviço de Beauty"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all"
            style={{ focusRingColor: `${PRIMARY}40` }}
            onFocus={(e) => e.target.style.borderColor = PRIMARY}
            onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Descrição
          </label>
          <textarea
            placeholder="Descreva as imagens ou o momento..."
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 transition-all resize-none"
            style={{ focusRingColor: `${PRIMARY}40` }}
            onFocus={(e) => e.target.style.borderColor = PRIMARY}
            onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
            rows={3}
            required
          />
        </div>

        {/* DRAG AND DROP */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Imagens
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          
          <div
            role="button"
            tabIndex={0}
            onClick={openPicker}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? openPicker() : null)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className="w-full rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-center"
            style={{
              borderColor: isDragging ? PRIMARY : "rgba(148,163,184,0.4)",
              boxShadow: isDragging ? `0 0 0 4px ${PRIMARY}20` : undefined,
            }}
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-transform"
              style={{ 
                backgroundColor: `${PRIMARY}15`, 
                color: PRIMARY,
                transform: isDragging ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16v-8m-4 4l4-4 4 4" />
                <path d="M20 16.5C20 18.433 18.433 20 16.5 20H7.5C5.567 20 4 18.433 4 16.5C4 14.567 5.567 13 7.5 13H8" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Arraste e solte imagens aqui
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ou <span style={{ color: PRIMARY }} className="font-semibold">clique para selecionar</span>
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
              PNG, JPG, WEBP - Múltiplas imagens aceitas
            </p>
          </div>
        </div>

        {/* PREVIEWS COM REMOÇÃO */}
        {previews.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imagens a enviar ({previews.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  setUploadFiles([]);
                  setPreviews([]);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Limpar tudo
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative group rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 aspect-square hover:border-gray-300 transition-all"
                >
                  <img
                    src={src}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com botão de remover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePreview(i)}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                      aria-label="Remover imagem"
                    >
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Badge */}
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={previews.length === 0 || !form.titulo || !form.descricao}
          style={{
            backgroundColor: PRIMARY,
            boxShadow: `0 4px 14px ${PRIMARY}40`,
          }}
          className="w-full text-white font-semibold py-3 rounded-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Enviar {previews.length > 0 ? `${previews.length} imagem(ns)` : ""}
        </button>
      </form>

      {/* 📸 GALERIA - NA BASE */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-bold text-2xl text-gray-900 dark:text-white mb-1">
              Galeria de Fotos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {galleryImages.length} imagem(ns) na galeria
            </p>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir selecionadas ({selectedIds.length})
            </button>
          )}
        </div>

        {galleryImages.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${PRIMARY}15` }}>
              <svg className="w-8 h-8" style={{ color: PRIMARY }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma imagem na galeria</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Envie imagens acima para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {galleryImages.map((img) => (
              <div
                key={img.imagem_id}
                className={`relative group rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition-all duration-200 ${
                  selectedIds.includes(img.imagem_id)
                    ? "ring-2 border-red-500 scale-[0.95]"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
                onClick={() => toggleSelect(img.imagem_id)}
              >
                <img
                  src={img.imagem_url}
                  alt={img.imagem_nome}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                />

                {/* Checkbox */}
                <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 rounded-lg p-1.5 transition-all">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(img.imagem_id)}
                    readOnly
                    className="w-4 h-4 accent-red-600"
                  />
                </div>

                {/* Overlay com info */}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-semibold truncate">
                    {img.imagem_nome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
