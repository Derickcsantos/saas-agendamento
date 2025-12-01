/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

export default function CreateOrganization() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const [orgData, setOrgData] = useState({
    name: "",
    setor: "",
    document_type: "cpf",
    document_number: "",
    strong_color: "",
    light_color: "",
    image: null,
    address: "",
  });

  const [repData, setRepData] = useState({
    username: "",
    phone: "",
    email: "",
    password: "",
    tipo: "admin",
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const slug = orgData.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleOrgChange = (e) => {
    const { name, value } = e.target;
    setOrgData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRepChange = (e) => {
    const { name, value } = e.target;
    setRepData((prev) => ({ ...prev, [name]: value }));
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setOrgData((prev) => ({ ...prev, image: file }));
    setLogoPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const submitAll = async () => {
    try {
      const localSlug = slug;

      const formData = new FormData();

      if (orgData.image) {
        formData.append("image", orgData.image);
      }

      Object.keys(orgData).forEach((key) => {
        if (key !== "image") {
          formData.append(key, orgData[key]);
        }
      });

      formData.append("slug_organization", localSlug);
      formData.append("phone", repData.phone);
      formData.append("email", repData.email);

      Object.keys(repData).forEach((key) => {
        formData.append(`representante_${key}`, repData[key]);
      });

      const orgResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations`,
        formData
      );

      const returnedSlug = orgResponse.data?.slug_organization || localSlug;

      const userResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${returnedSlug}`,
        repData
      );

      const userId = userResponse.data?.id;

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/representative-organization/${returnedSlug}`,
        { userId: userId },
        {
          withCredentials: true,
        }
      );

      const hasColors =
        orgData.strong_color.trim() !== "" ||
        orgData.light_color.trim() !== "";

      if (hasColors) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${returnedSlug}`,
          {
            strong_color: orgData.strong_color || "#5E3BEE",
            light_color: orgData.light_color || "#FFFFFF",
          }
        );
      }

      toast.success("Conta criada com sucesso!");
      router.push(`/escolher-plano/${returnedSlug}`);
      setIsReviewOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar conta.");
    }
  };

  const steps = [
    "Informações do Negócio",
    "Identidade Visual",
    "Endereço",
    "Representante",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl p-10 border border-gray-200/50 backdrop-blur-sm">

        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#5E3BEE] tracking-tight">
            Crie sua conta Marcafy
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Um onboarding de alto nível para uma operação de alto nível.
          </p>

          {slug && (
            <p className="mt-3 text-gray-700 text-sm font-semibold">
              Seu link:{" "}
              <span className="text-[#5E3BEE]">
                www.marcafy.com.br/{slug}
              </span>
            </p>
          )}
        </div>

        {/* STEPS */}
        <div className="flex justify-between mb-12">
          {steps.map((label, index) => (
            <div key={index} className="flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow ${
                  step === index + 1
                    ? "bg-[#5E3BEE] text-white shadow-lg"
                    : "bg-gray-200 text-gray-600"
                }`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {index + 1}
              </motion.div>
              <span className="text-xs mt-2 text-gray-600 w-20 text-center font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -25 }}
            transition={{ duration: 0.25 }}
          >
            {/* ===================== STEP 1 ===================== */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Nome do Negócio
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={orgData.name}
                    onChange={handleOrgChange}
                    className="w-full mt-1 border rounded-xl p-3 focus:ring-2 ring-[#5E3BEE] text-gray-900 shadow-sm transition"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Setor
                  </label>
                  <select
                    name="setor"
                    value={orgData.setor}
                    onChange={handleOrgChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  >
                    <option value="">Selecione...</option>
                    <option value="Beleza">Beleza</option>
                    <option value="Estética">Estética</option>
                    <option value="Barbearia">Barbearia</option>
                    <option value="Atendimento">Atendimento</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Clinica">Clínica</option>
                    <option value="Educação">Educação</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    CPF ou CNPJ
                  </label>
                  <div className="flex gap-3 mt-1">
                    <select
                      name="document_type"
                      value={orgData.document_type}
                      onChange={handleOrgChange}
                      className="border rounded-xl p-3 w-32 text-gray-900"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                    </select>

                    <input
                      type="text"
                      name="document_number"
                      value={orgData.document_number}
                      onChange={handleOrgChange}
                      placeholder="Digite o número"
                      className="flex-1 border rounded-xl p-3 shadow-sm text-gray-900"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-xl font-semibold mt-4 hover:bg-[#4b2bcc] shadow-md transition"
                >
                  Próximo
                </button>
              </div>
            )}

            {/* ===================== STEP 2 ===================== */}
            {step === 2 && (
              <div className="space-y-8">
                <p className="text-gray-600 text-sm">
                  Este passo é opcional, mas faz seu negócio brilhar.
                </p>

                {/* DRAG AND DROP */}
                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Logo da Marca
                  </label>

                  <div
                    {...getRootProps()}
                    className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                      isDragActive
                        ? "border-[#5E3BEE] bg-[#f7f5ff]"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <input {...getInputProps()} />

                    {!logoPreview ? (
                      <p className="text-gray-600">
                        Arraste a logo aqui ou clique para enviar
                      </p>
                    ) : (
                      <img
                        src={logoPreview}
                        className="w-24 h-24 mx-auto rounded-xl shadow object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* COLORS */}
                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Cor Primária
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      name="strong_color"
                      value={orgData.strong_color}
                      onChange={handleOrgChange}
                      className="w-14 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="#HEX"
                      name="strong_color"
                      value={orgData.strong_color}
                      onChange={handleOrgChange}
                      className="border rounded-xl p-3 flex-1 shadow text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Cor Secundária
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      name="light_color"
                      value={orgData.light_color}
                      onChange={handleOrgChange}
                      className="w-14 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="#HEX"
                      name="light_color"
                      value={orgData.light_color}
                      onChange={handleOrgChange}
                      className="border rounded-xl p-3 flex-1 shadow text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="text-gray-600 font-semibold"
                  >
                    Voltar
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={handleNext}
                      className="text-[#5E3BEE] font-semibold"
                    >
                      Pular
                    </button>

                    <button
                      onClick={handleNext}
                      className="bg-[#5E3BEE] text-white px-6 py-3 rounded-xl hover:bg-[#4b2bcc] shadow-md transition"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== STEP 3 ===================== */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Endereço
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={orgData.address}
                    onChange={handleOrgChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="text-gray-600 font-semibold"
                  >
                    Voltar
                  </button>

                  <button
                    onClick={handleNext}
                    className="bg-[#5E3BEE] text-white px-6 py-3 rounded-xl hover:bg-[#4b2bcc] shadow-md transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* ===================== STEP 4 ===================== */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Nome do Representante
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={repData.username}
                    onChange={handleRepChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={repData.phone}
                    onChange={handleRepChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={repData.email}
                    onChange={handleRepChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">
                    Senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={repData.password}
                    onChange={handleRepChange}
                    className="w-full mt-1 border rounded-xl p-3 shadow-sm text-gray-900"
                  />
                </div>

                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-xl font-semibold mt-4 hover:bg-[#4b2bcc] shadow-md transition"
                >
                  Revisar Informações
                </button>

                <button
                  onClick={handleBack}
                  className="text-gray-600 font-semibold w-full mt-3"
                >
                  Voltar
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ======================= REVIEW MODAL ======================= */}
      {isReviewOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative"
          >
            <h2 className="text-xl font-bold text-[#5E3BEE] mb-4">
              Revise suas informações
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>URL:</strong>{" "}
                www.marcafy.com.br/{slug}
              </p>
              <p>
                <strong>Nome do Negócio:</strong> {orgData.name}
              </p>
              <p>
                <strong>Setor:</strong> {orgData.setor}
              </p>
              <p>
                <strong>Documento:</strong>{" "}
                {orgData.document_type.toUpperCase()} -{" "}
                {orgData.document_number}
              </p>
              <p>
                <strong>Endereço:</strong> {orgData.address}
              </p>

              {orgData.strong_color && (
                <p>
                  <strong>Cor Primária:</strong> {orgData.strong_color}
                </p>
              )}

              {orgData.light_color && (
                <p>
                  <strong>Cor Secundária:</strong> {orgData.light_color}
                </p>
              )}

              {logoPreview && (
                <div className="mt-3">
                  <p className="font-semibold">Logo:</p>
                  <img
                    src={logoPreview}
                    className="w-20 h-20 object-cover rounded-xl shadow"
                  />
                </div>
              )}

              <hr className="my-4" />

              <h3 className="font-bold text-[#5E3BEE]">Representante:</h3>
              <p>
                <strong>Nome:</strong> {repData.username}
              </p>
              <p>
                <strong>Telefone:</strong> {repData.phone}
              </p>
              <p>
                <strong>Email:</strong> {repData.email}
              </p>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setIsReviewOpen(false)}
                className="text-gray-600 font-semibold"
              >
                Voltar
              </button>

              <button
                onClick={submitAll}
                className="bg-[#5E3BEE] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#4b2bcc] shadow-md transition"
              >
                Confirmar e Criar Conta
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
