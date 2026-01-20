"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";

export default function GalleryTab({ org }) {
  const [galleryImages, setGalleryImages] = useState([]);

  // 🔥 AGORA É ARRAY
  const [uploadFiles, setUploadFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    titulo: "",
    descricao: ""
  });

  // ======================
  // 1️⃣ Carregar dados
  // ======================
  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}`,
      { credentials: "include" }
    );
    const data = await res.json();
    setGalleryImages(data.imagens || []);
  }

  // ======================
  // 2️⃣ DROPZONE (FIX)
  // ======================
  const onDrop = (acceptedFiles) => {
    if (!acceptedFiles.length) return;

    setUploadFiles(acceptedFiles);

    const previewUrls = acceptedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviews(previewUrls);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "image/*": [] }
  });

  // ======================
  // 3️⃣ SUBMIT (ENVIA TODAS)
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      formData.append("titulo", form.titulo);
      formData.append("descricao", form.descricao);

      // 🔥 ENVIA TODAS
      uploadFiles.forEach((file) => {
        formData.append("imagens[]", file);
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}/upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include"
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Imagens salvas com sucesso!");

      setForm({ id: null, titulo: "", descricao: "" });
      setUploadFiles([]);
      setPreviews([]);

      loadImages();
    } catch (err) {
      toast.error("Erro ao salvar imagens.");
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl space-y-6"
      >
        <h4 className="text-lg font-bold">Nova Imagem para Galeria</h4>

        <input
          type="text"
          placeholder="Nome da Imagem"
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          required
          className="w-full p-3 border rounded"
        />

        <textarea
          placeholder="Descrição"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          required
          className="w-full p-3 border rounded"
        />

        {/* DROPZONE */}
        <div
          {...getRootProps()}
          className={`p-6 border-2 border-dashed rounded text-center cursor-pointer ${isDragActive ? "border-blue-500" : "border-gray-300"
            }`}
        >
          <input {...getInputProps()} />
          <p>
            {isDragActive
              ? "Solte as imagens aqui..."
              : "Arraste ou clique para selecionar imagens"}
          </p>
        </div>

        {/* 🔥 PREVIEW MULTIPLO */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {previews.map((src, index) => (
              <div
                key={index}
                className="border rounded-lg p-2 flex items-center justify-center bg-gray-50"
              >
                <img
                  src={src}
                  alt={`Preview ${index}`}
                  className="max-h-40 w-auto object-contain rounded"
                />
              </div>
            ))}
          </div>
        )}


        <button
          type="submit"
          className="bg-indigo-600 text-white px-5 py-2 rounded"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
