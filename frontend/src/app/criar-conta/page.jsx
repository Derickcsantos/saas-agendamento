/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'react-toastify'
import { useRouter } from "next/navigation";

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
    tipo: 'admin',
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    setOrgData((prev) => ({ ...prev, image: file }));
    setLogoPreview(URL.createObjectURL(file));
  };

  const submitAll = async () => {
    try {
      // GERA SLUG LOCALMENTE
      const localSlug = orgData.name.toLowerCase().replace(/\s+/g, "-");

      // ----------------------------
      // 1️⃣ ENVIO DA ORGANIZAÇÃO
      // ----------------------------
      const formData = new FormData();

      // LOGO
      if (orgData.image) {
        formData.append("image", orgData.image);
      }

      // CAMPOS DA ORGANIZAÇÃO
      Object.keys(orgData).forEach((key) => {
        if (key !== "image") {
          formData.append(key, orgData[key]);
        }
      });

      // ENVIAR TAMBÉM O SLUG NO BODY
      formData.append("slug_organization", localSlug);
      formData.append("phone", repData.phone);
      formData.append("email", repData.email);

      // CAMPOS DO REPRESENTANTE COMO PARTE DA ORGANIZAÇÃO
      Object.keys(repData).forEach((key) => {
        formData.append(`representante_${key}`, repData[key]);
      });

      // ENVIAR ORGANIZAÇÃO
      const orgResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations`,
        formData
      );

      const returnedSlug = orgResponse.data?.slug_organization || localSlug;


      const userResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/${returnedSlug}`,
        repData
      );

      const userId = userResponse.data?.id || 19;

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/representative-organization/${returnedSlug}`,
        { userId: userId }, 
        {
          withCredentials: true 
        }
      );

      const hasColors =
        orgData.strong_color.trim() !== "" ||
        orgData.light_color.trim() !== "";

      if (hasColors) {
        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${returnedSlug}`,
            {
              strong_color: orgData.strong_color || '#5E3BEE',
              light_color: orgData.light_color || '#FFFFFF',
            }
          );
        } catch (err) {
          console.warn("Falha ao salvar cores, tentando novamente...");

          // 🔁 SEGUNDA TENTATIVA
          try {
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${returnedSlug}`,
              {
                strong_color: orgData.strong_color || '#5E3BEE',
                light_color: orgData.light_color || '#FFFFFF',
              }
            );
          } catch (err2) {
            console.error("Falha ao salvar cores mesmo após nova tentativa.");
          }
        }
      }


      toast.success("Conta criada com sucesso!");
      router.push(`/escolher-plano/${returnedSlug}`)
      setIsReviewOpen(false);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar conta.");
    }
  };



  const steps = [
    "Informações do Negócio",
    "Identidade Visual (Opcional)",
    "Endereço",
    "Representante",
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-10 border border-gray-100">

        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#5E3BEE]">Crie sua conta Marcafy</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Inovação, controle e otimização do seu tempo — tudo começa aqui.
          </p>
        </div>

        {/* STEPS INDICATOR */}
        <div className="flex justify-between mb-10">
          {steps.map((label, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === index + 1
                    ? "bg-[#5E3BEE] text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {index + 1}
              </div>
              <span className="text-xs mt-2 text-gray-600 w-20 text-center">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* FORM CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 1 - NEGÓCIO */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-gray-950 text-sm">Nome do Negócio</label>
                  <input
                    type="text"
                    name="name"
                    value={orgData.name}
                    onChange={handleOrgChange}
                    className="w-full text-gray-950 mt-1 border rounded-lg p-3 focus:outline-[#5E3BEE]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Setor</label>
                  <select
                    name="setor"
                    value={orgData.setor}
                    onChange={handleOrgChange}
                    className="w-full  text-gray-950 mt-1 border rounded-lg p-3"
                  >
                    <option value="">Selecione...</option>
                    <option value="Beleza">Beleza</option>
                    <option value="Estética">Estética</option>
                    <option value="Barbearia">Barbearia</option>
                    <option value="Atendimento">Atendimento</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Clinica">Clinica</option>
                    <option value="Educação">Educação</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">CPF ou CNPJ</label>
                  <div className="flex gap-3 mt-1">
                    <select
                      name="document_type"
                      value={orgData.document_type}
                      onChange={handleOrgChange}
                      className="border text-gray-950 rounded-lg p-3 w-32"
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
                      className="flex-1 text-gray-950 border rounded-lg p-3"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-lg font-semibold mt-4 hover:bg-[#4d2bcc] transition"
                >
                  Próximo
                </button>
              </div>
            )}

            {/* STEP 2 - IDENTIDADE VISUAL */}
            {step === 2 && (
              <div className="space-y-6">
                <p className="text-gray-700 text-sm">
                  Este passo é opcional. Você pode pular se quiser.
                </p>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Cor Primária</label>
                  <input
                    type="color"
                    name="strong_color"
                    value={orgData.strong_color}
                    onChange={handleOrgChange}
                    className="w-16 text-gray-950 h-10 mt-1 rounded"
                  />
                  <input
                    type="text"
                    placeholder="#HEX"
                    name="strong_color"
                    value={orgData.strong_color}
                    onChange={handleOrgChange}
                    className="border text-gray-950 p-3 rounded-lg w-full mt-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Cor Secundária</label>
                  <input
                    type="color"
                    name="light_color"
                    value={orgData.light_color}
                    onChange={handleOrgChange}
                    className="w-16 text-gray-950 h-10 mt-1 rounded"
                  />
                  <input
                    type="text"
                    placeholder="#HEX"
                    name="light_color"
                    value={orgData.light_color}
                    onChange={handleOrgChange}
                    className="border text-gray-950 p-3 rounded-lg w-full mt-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Logo (opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full border text-gray-950 rounded-lg p-3 mt-1"
                  />
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover mt-3 rounded-lg shadow"
                    />
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleBack}
                    className="text-gray-600 font-semibold"
                  >
                    Voltar
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={handleNext}
                      className="text-[#5E3BEE] font-semibold"
                    >
                      Pular
                    </button>

                    <button
                      onClick={handleNext}
                      className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg hover:bg-[#4d2bcc]"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 - ENDEREÇO */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-gray-950 text-sm">Endereço</label>
                  <input
                    type="text"
                    name="address"
                    value={orgData.address}
                    onChange={handleOrgChange}
                    className="w-full mt-1 text-gray-950 border rounded-lg p-3"
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
                    className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg hover:bg-[#4d2bcc]"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 - REPRESENTANTE */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-gray-950 text-sm">Nome do Representante</label>
                  <input
                    type="text"
                    name="username"
                    value={repData.username}
                    onChange={handleRepChange}
                    className="w-full mt-1 text-gray-950 border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Telefone</label>
                  <input
                    type="text"
                    name="phone"
                    value={repData.phone}
                    onChange={handleRepChange}
                    className="w-full text-gray-950 mt-1 border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={repData.email}
                    onChange={handleRepChange}
                    className="w-full text-gray-950 mt-1 border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-950 text-sm">Senha</label>
                  <input
                    type="password"
                    name="password"
                    value={repData.password}
                    onChange={handleRepChange}
                    className="w-full text-gray-950 mt-1 border rounded-lg p-3"
                  />
                </div>

                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-lg font-semibold mt-4 hover:bg-[#4d2bcc] transition"
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

      {/* REVIEW MODAL */}
      {isReviewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full relative">
            <h2 className="text-xl font-bold text-[#5E3BEE] mb-4">
              Revise suas informações
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Slug:</strong> {orgData.name.toLowerCase().replace(/\s+/g, "-")}</p>
              <p><strong>Nome do Negócio:</strong> {orgData.name}</p>
              <p><strong>Setor:</strong> {orgData.setor}</p>
              <p><strong>Documento:</strong> {orgData.document_type.toUpperCase()} - {orgData.document_number}</p>
              <p><strong>Endereço:</strong> {orgData.address}</p>

              {orgData.strong_color && (
                <p><strong>Cor Primária:</strong> {orgData.strong_color}</p>
              )}

              {orgData.light_color && (
                <p><strong>Cor Secundária:</strong> {orgData.light_color}</p>
              )}

              {logoPreview && (
                <div className="mt-3">
                  <p className="font-semibold">Logo:</p>
                  <img src={logoPreview} className="w-20 h-20 object-cover rounded-lg shadow mt-2" />
                </div>
              )}

              <hr className="my-4" />

              <h3 className="font-bold text-[#5E3BEE]">Representante:</h3>
              <p><strong>Nome:</strong> {repData.username}</p>
              <p><strong>Telefone:</strong> {repData.phone}</p>
              <p><strong>Email:</strong> {repData.email}</p>
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
                className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4d2bcc]"
              >
                Confirmar e Criar Conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
