"use client";

import { useId, useState } from "react";

export default function ImageDropzone({
  valueFile,          // File | null (opcional)
  previewUrl,         // string | null (opcional)
  onChangeFile,       // (file: File|null, preview: string|null) => void
  paletteColor = "#5E3BEE",
  accept = "image/*",
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    const el = document.getElementById(inputId);
    el?.click();
  };

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;

    // garante que é imagem
    if (!file.type?.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    onChangeFile?.(file, url);
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

  const remove = () => {
    // se você quiser, pode dar URL.revokeObjectURL(previewUrl) aqui (quando trocar/remover)
    onChangeFile?.(null, null);
  };

  return (
    <div className="w-full">
      <input
        id={inputId}
        type="file"
        accept={accept}
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
        className={[
          "w-full rounded-xl border-2 border-dashed p-4 sm:p-5 transition",
          "bg-gray-50 dark:bg-gray-900",
          "flex items-center justify-center",
          "min-h-[120px]",
          isDragging ? "scale-[1.01]" : "",
        ].join(" ")}
        style={{
          borderColor: isDragging ? paletteColor : "rgba(148,163,184,0.6)",
          boxShadow: isDragging ? `0 0 0 4px ${paletteColor}20` : undefined,
        }}
      >
        {!previewUrl ? (
          <div className="text-center">
            <div
              className="mx-auto mb-2 h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${paletteColor}10`, color: paletteColor }}
            >
              {/* Ícone simples */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V8M12 8L9 11M12 8L15 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 16.5C20 18.433 18.433 20 16.5 20H7.5C5.567 20 4 18.433 4 16.5C4 14.567 5.567 13 7.5 13H8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Arraste e solte a imagem aqui
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ou <span style={{ color: paletteColor }} className="font-semibold">clique para selecionar</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              PNG, JPG, WEBP (imagem)
            </p>
          </div>
        ) : (
          <div className="w-full flex items-center gap-3">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {valueFile?.name || "Imagem selecionada"}
              </p>
              <p className="text-xs text-gray-500">
                Clique para trocar ou arraste outra por cima
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove();
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Remover
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
