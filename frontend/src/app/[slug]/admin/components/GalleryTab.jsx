"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";

export default function GalleryTab({ org }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    name: "",
    description: ""
  });


  const [filters, setFilters] = useState({
    search: ""
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
  // 2️⃣ Salvar Imagem
  // ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(form)) formData.append(key, value);
      
      formData.append("imagem", uploadFile);

      const method = "POST";

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}/upload`;

      const res = await fetch(url, {
        method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Imagem salva com sucesso!");

      setForm({
        id: null,
        name: "",
        description: ""
      });

      setPreview("");
      setUploadFile(null);


      loadImages();


    } catch(err) {
      toast.error("Erro ao salvar imagem.");
      console.log("Eu sou o err", err)
    }
  };

  // ======================
  // 4️⃣ Excluir
  // ======================
  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir esssa imagem?")) return;

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}/${id}`,
      { method: "DELETE", credentials: "include" }
    );

    toast.success('Imagem excluida com sucesso');
    loadImages();
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] }
  });

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const applyFilters = useMemo(
    () =>
      debounce((newFilters) => {
        loadGallery(newFilters);
      }, 400),
    []
  );

  async function loadGallery(customFilters = filters) {
    setLoading(true);
    try {

      const params = new URLSearchParams(customFilters);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/galeria/${org.slug_organization}?${params}`,
        { credentials: "include" }
      );

      const data = await res.json();

      setGalleryImages(data.imagens);

    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  const updateFilter = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  return (
    <div className="space-y-8">

      {/* FORMULÁRIO */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
      >
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">
            Nova Imagem para Galeria
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            placeholder="Nome da Imagem"
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3 md:col-span-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <textarea
            placeholder="Descrição da Imagem"
            className="bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3 md:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          {/* Upload */}
          <div
            {...getRootProps()}
            className={`
              p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition md:col-span-2
              bg-gray-50 dark:bg-gray-900
              ${isDragActive
                ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                : "border-gray-300 dark:border-gray-700"}
            `}
          >
            <input {...getInputProps()} />

            <p className="text-gray-600 dark:text-gray-300">
              {isDragActive
                ? "Solte a imagem aqui..."
                : "Arraste uma imagem ou clique para selecionar"}
            </p>
          </div>
        </div>

        {preview && (
          <div className="flex justify-center">
            <img src={preview} className="w-32 h-32 object-cover rounded-md shadow-md" />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow"
          >
            Salvar
          </button>

        </div>
      </form>

      <div className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">  
        
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-200">
          Pesquisar Imagem por Nome
        </h4>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Pesquisar por Nome..."
            className="w-100 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border dark:border-gray-700 shadow-sm"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />

          <button
            className="rounded-lg px-3 py-2 text-sm bg-red-50 dark:bg-red-900/30 
                      text-red-700 dark:text-red-300 border border-red-200 
                      dark:border-red-700 shadow hover:bg-red-100 
                      dark:hover:bg-red-900/50 transition"
            onClick={() => {
              updateFilter("search", "")
              loadGallery({})
            }}
          >
            Limpar Pesquisa
          </button>
        </div>
      </div>

      {/* TABELA */}
      {galleryImages.length === 0 ? (
            <div className="text-center text-gray-500">
              <i className="far fa-images text-3xl"></i>
              <p className="mt-3">Nenhuma imagem encontrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryImages.map((img) => (
                <div
                  key={img.imagem_id}
                  className="relative group rounded-lg overflow-hidden"
                >
                  <img
                    src={img.imagem_url}
                    alt={img.imagem_nome}
                    className="w-full h-48 object-cover rounded-lg shadow-md transition duration-200 group-hover:brightness-50"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 bg-black/50 text-white text-sm p-2 w-full text-center truncate">
                    {img.imagem_nome}
                  </div>

                  <button
                      onClick={() => handleDelete(img.imagem_id)}
                      className="
                        absolute inset-0 flex items-center justify-center
                        text-white font-semibold
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                        cursor-pointer
                      "
                    >
                      Excluir
                  </button>

                </div>
              ))}
            </div>
          )}
    </div>

  );
}
