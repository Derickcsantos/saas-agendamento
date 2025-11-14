// src/app/components/ToastProvider.jsx
"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Importe o CSS do toastify

export default function ToastProvider() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      style={{ marginTop: "80px", zIndex: 100000 }} // z-index é parte do style
    />
  );
}