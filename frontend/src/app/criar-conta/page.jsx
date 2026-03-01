/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { generateNormalizedText } from '../utils/normalizeText'

// Função para formatar CPF: 000.000.000-00
const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return numbers.slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{2})$/, '$1-$2');
};

// Função para formatar CNPJ: 00.000.000/0000-00
const formatCNPJ = (value) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 14) {
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  return numbers.slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{2})$/, '$1-$2');
};

// Função para formatar CEP: 00000-000
const formatCEP = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return numbers.replace(/(\d{5})(\d)/, '$1-$2');
};

// Função para detectar e formatar automaticamente
const formatDocument = (value) => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    return formatCPF(numbers);
  } else {
    return formatCNPJ(numbers);
  }
};

// Função para detectar o tipo de documento baseado no comprimento
const detectDocumentType = (value) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.length <= 11 ? 'cpf' : 'cnpj';
};

export default function CreateOrganization() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const [slugExists, setSlugExists] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState("");
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

  const [addressData, setAddressData] = useState({
    cep: "",
    number: "",
    street: "",
    city: "",
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

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleOrgChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'document_number') {
      // Remove formatação mantendo apenas números
      const numbersOnly = value.replace(/\D/g, '');
      setOrgData((prev) => ({ 
        ...prev, 
        document_number: numbersOnly
      }));
    } else {
      setOrgData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRepChange = (e) => {
    const { name, value } = e.target;
    setRepData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchAddressByCep = async (cepValue) => {
    const cepNumbers = cepValue.replace(/\D/g, '');

    if (cepNumbers.length !== 8) return;

    setIsFetchingCep(true);
    setCepError("");

    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cep/v2/${cepNumbers}`);

      setAddressData((prev) => ({
        ...prev,
        cep: formatCEP(data?.cep || cepNumbers),
        street: data?.street || prev.street,
        city: data?.city || prev.city,
      }));
    } catch {
      setCepError("Não foi possível localizar este CEP.");
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cep') {
      const formatted = formatCEP(value);
      const cepNumbers = formatted.replace(/\D/g, '');

      setAddressData((prev) => ({ ...prev, cep: formatted }));
      setCepError("");

      if (cepNumbers.length === 8) {
        fetchAddressByCep(cepNumbers);
      }

      return;
    }

    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    setOrgData((prev) => ({ ...prev, image: file }));
    setLogoPreview(URL.createObjectURL(file));
  };

  const submitAll = async () => {
    setIsSubmitting(true);
    try {
      const localSlug = orgData.name.toLowerCase().replace(/\s+/g, "-");
      const fullAddress = [
        addressData.street.trim(),
        addressData.number.trim() ? `Nº ${addressData.number.trim()}` : "",
        addressData.city.trim(),
        addressData.cep.trim() ? `CEP ${addressData.cep.trim()}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const formData = new FormData();

      if (orgData.image) {
        formData.append("image", orgData.image);
      }

      Object.keys(orgData).forEach((key) => {
        if (key === "image") return;

        if (key === "address") {
          formData.append("address", fullAddress);
          return;
        }

        formData.append(key, orgData[key]);
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

      const userId = userResponse.data?.id || 19;

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/representative-organization/${returnedSlug}`,
        { userId },
        { withCredentials: true }
      );

      const hasColors =
        orgData.strong_color.trim() !== "" ||
        orgData.light_color.trim() !== "";

      if (hasColors) {
        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${returnedSlug}`,
            {
              strong_color: orgData.strong_color || "#5E3BEE",
              light_color: orgData.light_color || "#FFFFFF",
            }
          );
        } catch {
          try {
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/organization-colors/${returnedSlug}`,
              {
                strong_color: orgData.strong_color || "#5E3BEE",
                light_color: orgData.light_color || "#FFFFFF",
              }
            );
          } catch {
            console.error("Falha ao tentar salvar cores novamente.");
          }
        }
      }

      toast.success("Conta criada com sucesso!");
      // router.push(`/escolher-plano/${returnedSlug}`);
      router.push(`/login`)
      setIsReviewOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    "Informações do Negócio",
    "Identidade Visual (Opcional)",
    "Endereço",
    "Representante",
  ];

  const checkSlugAvailability = async () => {
    const slug = generateNormalizedText(orgData.name)

    if (!slug) return;

    setCheckingSlug(true);

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/slug/${slug}`
      );

      if (res.data?.id) {
        setSlugExists(true);
      } else {
        setSlugExists(false);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setSlugExists(false);
      } else {
        console.error(err);
      }
    }

    setCheckingSlug(false);
  };


  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4">
      <div className="absolute top-1 left-4 w-10 h-10 ">
        <a href="/" >
        <img width="30" height="30" src="https://img.icons8.com/ios/50/left--v1.png" alt="left--v1"/>
        </a>
      </div>
      <div className="w-full max-w-xl bg-white shadow-2xl rounded-2xl p-6 sm:p-10 border border-black/5">

        {/* HEADER */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#5E3BEE]">
            Crie sua conta 
          </h1>
          <p className="text-gray-500 mt-2 text-xs sm:text-sm">
            Inovação, controle e otimização do seu tempo — tudo começa aqui.
          </p>
        </div>

        {/* STEPS */}
        <div className="flex justify-between mb-10 gap-2 sm:gap-4">
          {steps.map((label, index) => (
            <div key={index} className="flex flex-col items-center flex-1 min-w-[70px]">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold 
                ${
                  step === index + 1
                    ? "bg-[#5E3BEE] text-white shadow-lg"
                    : "bg-gray-200 text-gray-600"
                }
              `}
              >
                {index + 1}
              </div>
              <span className="text-[10px] sm:text-xs mt-2 text-gray-600 text-center">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* FORM STEPS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">Nome do Negócio</label>
                  <input
                    type="text"
                    name="name"
                    value={orgData.name}
                    onChange={handleOrgChange}
                    onBlur={checkSlugAvailability}
                    className="w-full mt-1 border border-black/10 rounded-lg p-3 placeholder-gray-400 shadow-sm text-gray-900 focus:ring-2 focus:ring-[#5E3BEE]/40 focus:outline-none"
                    placeholder="Digite o nome da sua empresa"
                  />
                  {orgData.name? (
                    <div className="flex justify-center mt-4">
                      <p className="text-gray-500" style={{fontSize: '12px'}}>www.marcafy.com.br/{generateNormalizedText(orgData.name)}
                      </p>
                    </div>
                    ) : (
                      ''
                    )}

                    {checkingSlug && (
                      <p className="text-blue-500 text-xs text-center mt-1">Verificando disponibilidade...</p>
                    )}

                    {!checkingSlug && slugExists && (
                      <p className="text-red-500 text-xs text-center mt-1">
                        ❌ Este nome já está em uso. Escolha outro.
                      </p>
                    )}

                    {!checkingSlug && !slugExists && orgData.name && (
                      <p className="text-green-600 text-xs text-center mt-1">
                        ✔ Nome disponível!
                      </p>
                    )}

                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Setor</label>
                  <select
                    name="setor"
                    value={orgData.setor}
                    onChange={handleOrgChange}
                    className="w-full mt-1 border border-black/10 rounded-lg p-3 text-gray-900 shadow-sm focus:ring-2 focus:ring-[#5E3BEE]/40 focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="Salao">Salão</option>
                    <option value="Estética">Estética</option>
                    <option value="Barbearia">Barbearia</option>
                    <option value="Atendimento">Atendimento</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Direito">Direito</option>
                    <option value="Prestador de servicos">Prestação de serviço</option>
                    <option value="Clinica">Clínica</option>
                    <option value="Educação">Educação</option>
                    <option value="financas">Finanças</option>
                    <option value="Esportivo">Esportivo</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">CPF ou CNPJ</label>
                  <div className="flex flex-col sm:flex-row gap-3 mt-1">
                    <select
                      name="document_type"
                      value={orgData.document_type}
                      onChange={handleOrgChange}
                      className="border border-black/10 text-gray-900 rounded-lg p-3 w-full sm:w-36 shadow-sm focus:ring-2 focus:ring-[#5E3BEE]/40 focus:outline-none"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                    </select>

                    <input
                      type="text"
                      name="document_number"
                      value={orgData.document_type === 'cpf' 
                        ? formatCPF(orgData.document_number) 
                        : formatCNPJ(orgData.document_number)}
                      onChange={handleOrgChange}
                      placeholder={orgData.document_type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                      maxLength={orgData.document_type === 'cpf' ? 14 : 18}
                      className="flex-1 border border-black/10 rounded-lg p-3 placeholder-gray-400 shadow-sm text-gray-900 focus:ring-2 focus:ring-[#5E3BEE]/40 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-lg font-semibold mt-4 hover:bg-[#4d2bcc] transition shadow-lg"
                >
                  Próximo
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <p className="text-gray-700 text-sm">Este passo é opcional. Você pode pular se quiser.</p>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Cor Primária</label>
                  <div className="relative mt-1">
                    <input
                      type="color"
                      name="strong_color"
                      value={orgData.strong_color || '#5E3BEE'}
                      onChange={handleOrgChange}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg border-2 border-black/10 cursor-pointer"
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="#5E3BEE"
                      name="strong_color"
                      value={orgData.strong_color}
                      onChange={handleOrgChange}
                      className="border border-black/10 p-3 pl-16 rounded-lg w-full shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Cor Secundária</label>
                  <div className="relative mt-1">
                    <input
                      type="color"
                      name="light_color"
                      value={orgData.light_color || '#FFFFFF'}
                      onChange={handleOrgChange}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg border-2 border-black/10 cursor-pointer"
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    />
                    <input
                      type="text"
                      placeholder="#FFFFFF"
                      name="light_color"
                      value={orgData.light_color}
                      onChange={handleOrgChange}
                      className="border border-black/10 p-3 pl-16 rounded-lg w-full shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Logo (opcional)</label>

                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      handleLogoUpload({ target: { files: [file] } });
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="mt-1 flex flex-col items-center justify-center w-full h-32 border border-dashed border-black/20 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer shadow-sm"
                  >
                    {!logoPreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                        <span className="text-gray-500 text-sm">Arraste uma imagem aqui</span>
                        <span className="text-gray-400 text-xs mt-1">ou clique para selecionar</span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg shadow-md border border-black/10"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={handleBack} className="text-gray-600 font-semibold">Voltar</button>

                  <div className="flex gap-3">
                    <button onClick={handleNext} className="text-[#5E3BEE] font-semibold">Pular</button>

                    <button
                      onClick={handleNext}
                      className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg hover:bg-[#4d2bcc] shadow-lg"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">Endereço da Organização</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    <input
                      type="text"
                      name="cep"
                      value={addressData.cep}
                      onChange={handleAddressChange}
                      onBlur={() => fetchAddressByCep(addressData.cep)}
                      placeholder="CEP (00000-000)"
                      maxLength={9}
                      required
                      className="w-full border border-black/10 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    />

                    <input
                      type="text"
                      name="number"
                      value={addressData.number}
                      onChange={handleAddressChange}
                      placeholder="Número"
                      required
                      className="w-full border border-black/10 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    />

                    <input
                      type="text"
                      name="street"
                      value={addressData.street}
                      onChange={handleAddressChange}
                      placeholder="Rua"
                      className="w-full border border-black/10 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    />

                    <input
                      type="text"
                      name="city"
                      value={addressData.city}
                      onChange={handleAddressChange}
                      placeholder="Cidade"
                      className="w-full border border-black/10 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    />
                  </div>

                  {isFetchingCep && (
                    <p className="text-xs text-blue-600 mt-2">Buscando endereço pelo CEP...</p>
                  )}

                  {!isFetchingCep && cepError && (
                    <p className="text-xs text-red-500 mt-2">{cepError}</p>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button onClick={handleBack} className="text-gray-600 font-semibold">Voltar</button>

                  <button
                    onClick={handleNext}
                    className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg hover:bg-[#4d2bcc] shadow-lg"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <label className="font-semibold text-gray-900 text-sm">Nome do Representante</label>
                  <input
                    type="text"
                    name="username"
                    value={repData.username}
                    onChange={handleRepChange}
                    className="w-full border border-black/10 mt-1 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Telefone</label>
                  <input
                    type="text"
                    name="phone"
                    value={repData.phone}
                    onChange={handleRepChange}
                    className="w-full border border-black/10 mt-1 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={repData.email}
                    onChange={handleRepChange}
                    className="w-full border border-black/10 mt-1 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-900 text-sm">Senha</label>
                  <input
                    type="password"
                    name="password"
                    value={repData.password}
                    onChange={handleRepChange}
                    className="w-full border border-black/10 mt-1 rounded-lg p-3 shadow-sm placeholder-gray-400 focus:ring-2 focus:ring-[#5E3BEE]/40"
                    placeholder="Crie uma senha segura"
                  />
                </div>

                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="w-full bg-[#5E3BEE] text-white py-3 rounded-lg font-semibold hover:bg-[#4d2bcc] transition shadow-lg"
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative border border-black/10">

            <h2 className="text-xl font-bold text-[#5E3BEE] mb-4">
              Revise suas informações
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>Slug:</strong>{" "}
                {orgData.name.toLowerCase().replace(/\s+/g, "-")}
              </p>

              <p><strong>Nome do Negócio:</strong> {orgData.name}</p>
              <p><strong>Setor:</strong> {orgData.setor}</p>
              <p>
                <strong>Documento:</strong>{" "}
                {orgData.document_type.toUpperCase()} -{" "}
                {orgData.document_number}
              </p>
              <p><strong>CEP:</strong> {addressData.cep}</p>
              <p><strong>Número:</strong> {addressData.number}</p>
              <p><strong>Rua:</strong> {addressData.street}</p>
              <p><strong>Cidade:</strong> {addressData.city}</p>

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
                    className="w-20 h-20 object-cover rounded-lg shadow border border-black/10 mt-2"
                  />
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
                disabled={isSubmitting}
                className="bg-[#5E3BEE] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4d2bcc] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Criando conta...
                  </span>
                ) : (
                  "Confirmar e Criar Conta"
                )}
              </button>
            </div>

          </div>
          
        </div>
      )}
      
    </div>
  );
}
