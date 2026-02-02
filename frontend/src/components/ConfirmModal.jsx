'use client';

import React from "react";

export default function ConfirmModal({
  open,
  title = "Confirmação",
  message,
  onConfirm,
  onCancel,
  confirmVariant = "primary",
  confirmColor
}) {
  if (!open) return null;

  const confirmButtonClass =
    confirmVariant === "danger"
      ? "bg-red-700 hover:bg-red-800 text-white"
      : "text-white";

  const confirmButtonStyle =
    confirmVariant === "primary" && confirmColor
      ? { backgroundColor: confirmColor }
      : undefined

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      {/* Modal box */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6">
        {/* Título */}
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
          {title}
        </h3>

        {/* Mensagem */}
        <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition ${confirmButtonClass}`}
            style={confirmButtonStyle}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
