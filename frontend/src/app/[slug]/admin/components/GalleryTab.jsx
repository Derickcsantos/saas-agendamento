"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { fetchWithAuth } from "@/lib/fetchWithAuth"; // 🔥 IMPORTANTE
import { useConfirm } from "@/components/ConfirmDialogProvider";

export default function GalleryTab({ org }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [uploadFiles, setUploadFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const { confirm } = useConfirm()

  const [form, setForm] = useState({
    titulo: "",
    descricao: ""
  });

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

      const data = await res.json();
      setGalleryImages(data.imagens || []);
      setSelectedIds([]);
    } catch (err) {
      toast.error("Erro ao carregar galeria");
      console.error(err);
    }
  }

  // ======================
  // 2️⃣ DROPZONE
  // ======================
  const onDrop = (acceptedFiles) => {
    setUploadFiles(acceptedFiles);
    setPreviews(acceptedFiles.map((f) => URL.createObjectURL(f)));
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
    accept: { "image/*": [] }
  });

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
    <div className="space-y-10">

      {/* 📸 GALERIA */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-lg">Galeria</h4>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Excluir selecionadas ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {galleryImages.map((img) => (
            <div
              key={img.imagem_id}
              className={`relative border rounded-md overflow-hidden aspect-square cursor-pointer
              transition-all duration-150
              ${selectedIds.includes(img.imagem_id)
                  ? "ring-2 ring-red-500 scale-[0.97]"
                  : "hover:scale-[0.98]"
                }`}
              onClick={() => toggleSelect(img.imagem_id)}
            >
              <img
                src={img.imagem_url}
                alt={img.imagem_nome}
                className="w-full h-full object-cover"
              />

              <div className="absolute top-1 left-1 bg-white/80 rounded p-0.5">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(img.imagem_id)}
                  readOnly
                  className="w-3 h-3"
                />
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ➕ UPLOAD */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl space-y-6"
      >
        <h4 className="font-bold text-lg">Nova imagem</h4>

        <input
          type="text"
          placeholder="Título"
          value={form.titulo}
          onChange={(e) =>
            setForm({ ...form, titulo: e.target.value })
          }
          className="w-full p-3 border rounded"
          required
        />

        <textarea
          placeholder="Descrição"
          value={form.descricao}
          onChange={(e) =>
            setForm({ ...form, descricao: e.target.value })
          }
          className="w-full p-3 border rounded"
          required
        />

        <div
          {...getRootProps()}
          className="p-6 border-2 border-dashed rounded text-center cursor-pointer"
        >
          <input {...getInputProps()} />
          Arraste ou clique para selecionar imagens
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-md overflow-hidden border
                   hover:ring-2 hover:ring-indigo-500 transition-all duration-150"
              >
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge Preview */}
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Preview
                </span>
              </div>
            ))}
          </div>
        )}

        <button className="bg-indigo-600 text-white px-5 py-2 rounded">
          Salvar imagens
        </button>
      </form>
    </div>
  );
}
