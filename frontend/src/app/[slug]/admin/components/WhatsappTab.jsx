"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { 
  Users, 
  MessageCircle, 
  Send, 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader,
  MessageSquare,
  Clock
} from "lucide-react";
import useOrganizationColors from "@/app/utils/useOrganizationColors";
import { QRCodeCanvas } from "qrcode.react";
import { useConfirm } from "@/components/ConfirmDialogProvider";

export default function WhatsappTab({ org }) {
  const { palette } = useOrganizationColors(org.slug_organization);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [qrSize, setQrSize] = useState(240);
  const qrContainerRef = useRef(null);

  // Contatos
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Envio de mensagens
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  // Modal de telefone para conectar
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [sessionNameInput, setSessionNameInput] = useState("");

  // Estatísticas
  const [statistics, setStatistics] = useState({
    totalContacts: 0,
    isConnected: false,
    connectedSince: null
  });

  // Modal de info de contato
  const [contactInfoModal, setContactInfoModal] = useState({ open: false, loading: false, data: null });
  const [contactEdit, setContactEdit] = useState({ name: '', observation: '', image: '' });
  const [savingContact, setSavingContact] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const slug = org.slug_organization;

  const strong = palette?.strong_color || "#25D366";
  const light = palette?.light_color || "#F5F5F5";

  const { confirm } = useConfirm()

  // Verificar status da conexão
  useEffect(() => {
    checkConnectionStatus();
    loadStatistics();
  }, [slug]);

  // Filtrar contatos por busca
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = contacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQuery) ||
          c.notify?.toLowerCase().includes(lowerQuery) ||
          c.number?.includes(searchQuery) ||
          c.jid?.includes(searchQuery)
      );
      setFilteredContacts(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, contacts]);

  // Ajusta o tamanho do QR de forma responsiva
  useEffect(() => {
    const updateQrSize = () => {
      if (!qrContainerRef.current) return;
      const width = qrContainerRef.current.offsetWidth;
      const nextSize = Math.max(180, Math.min(width - 48, 320));
      setQrSize(nextSize);
    };

    updateQrSize();

    const observer = new ResizeObserver(updateQrSize);
    if (qrContainerRef.current) observer.observe(qrContainerRef.current);

    return () => observer.disconnect();
  }, []);

  async function checkConnectionStatus() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/status`,
        {
          credentials: "include",
          cache: "no-store"
        }
      );
      const data = await res.json();

      if (res.ok && data.isConnected) {
        setIsConnected(true);
        setSessionId(data.sessionId);
        loadContacts();
      } else {
        setIsConnected(false);
        setSessionId(null);
        setContacts([]);
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/contacts`,
        {
          credentials: "include",
          cache: "no-store"
        }
      );
      const data = await res.json();

      if (res.ok) {
        // Mapear contatos para formato interno
        const mappedContacts = (data.contacts || []).map((c) => {
          const numberFromJid = c.jid?.split('@')[0] || c.phone || c.phone_contact || '';
          return {
            jid: c.jid,
            name: c.name || c.verifiedName || c.notify || "Sem nome",
            number: numberFromJid,
            notify: c.notify,
            verifiedName: c.verifiedName,
            imgUrl: c.image || c.imgUrl,
            status: c.status,
            observation: c.observation || null,
          };
        });
        setContacts(mappedContacts);
      }
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
    }
  }

  async function loadStatistics() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/statistics`,
        {
          credentials: "include",
          cache: "no-store"
        }
      );
      const data = await res.json();

      if (res.ok) {
        setStatistics(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/connect`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: phoneInput,
            session_name: sessionNameInput || `org_${slug}`,
          }),
        }
      );
      const data = await res.json();

      console.log("Connect Response:", { status: res.status, data });

      if (res.ok && data.success) {
        // Verificar se há QR code (pode vir como qrCode ou qr)
        const qrCodeData = data.qrCode || data.data?.qrCode || data.data?.qr || null;
        
        if (qrCodeData) {
          setQrCode(qrCodeData);
          setSessionId(data.sessionId);
          setShowPhoneModal(false);
          setPhoneInput("");
          setSessionNameInput("");
          toast.success("QR Code gerado! Escaneie com seu WhatsApp");

          // Verificar status a cada 3 segundos
          const intervalId = setInterval(async () => {
            try {
              const statusRes = await fetch(
                `${API_BASE_URL}/api/whatsapp-organization/${slug}/status`,
                { credentials: "include", cache: "no-store" }
              );
              const statusData = await statusRes.json();

              if (statusData.isConnected) {
                clearInterval(intervalId);
                setIsConnected(true);
                setQrCode(null);
                toast.success("WhatsApp conectado com sucesso!");
                loadContacts();
                loadStatistics();
              }
            } catch (err) {
              console.error("Erro ao verificar status:", err);
            }
          }, 3000);

          // Limpar verificação após 2 minutos
          setTimeout(() => clearInterval(intervalId), 120000);
        } else if (data.status === "NEED_SCAN" || data.status === "SCAN_QR_CODE") {
          // Tentar conectar novamente para obter QR code
          toast.warning("Gerando QR Code...");
          setTimeout(() => handleConnect(), 2000);
        } else if (data.status === "CONNECTED") {
          setIsConnected(true);
          setShowPhoneModal(false);
          toast.success("WhatsApp já está conectado!");
          loadContacts();
          loadStatistics();
        } else {
          toast.info(data.message || "Sessão inicializada");
          console.log("Status retornado:", data.status, data);
        }
      } else {
        // Mostrar detalhes do erro
        const errorMsg = data.error || data.details || "Erro ao conectar";
        console.error("Erro detalhado:", data);
        
        // Verificar se é erro de plano não ativo
        if (data.details && typeof data.details === 'object') {
          const detailsStr = JSON.stringify(data.details);
          if (detailsStr.includes("subscription") || detailsStr.includes("plan")) {
            toast.error("⚠️ Plano WaSender não ativo. Ative seu plano em wasenderapi.com");
          } else {
            toast.error(`Erro: ${data.details.message || detailsStr}`);
          }
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error("Erro ao conectar WhatsApp:", error);
      toast.error("Erro ao conectar WhatsApp: " + error.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    // if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;

    const confirmed = await confirm({
      title: "Desconectar WhatsApp",
      message: `Deseja realmente desconectar o WhatsApp?`,
      confirmVariant: "danger"
    });

    if (!confirmed) return

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/disconnect`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (res.ok) {
        toast.success("WhatsApp desconectado");
        setIsConnected(false);
        setSessionId(null);
        setContacts([]);
        setQrCode(null);
        loadStatistics();
      } else {
        toast.error("Erro ao desconectar");
      }
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      toast.error("Erro ao desconectar");
    }
  }

  async function handleSendMessage(number) {
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/send-message`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number, message })
        }
      );

      if (res.ok) {
        toast.success("Mensagem enviada!");
        setMessage("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  async function handleSendBulk() {
    if (selectedContacts.length === 0) {
      toast.error("Selecione pelo menos um contato");
      return;
    }

    if (selectedContacts.length > 100) {
      toast.error("Máximo de 100 contatos por envio");
      return;
    }

    if (!bulkMessage.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setSending(true);
    try {
      const numbers = selectedContacts.map((c) => c.jid);

      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/send-bulk`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numbers, message: bulkMessage })
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Mensagens enviadas!");
        setShowBulkModal(false);
        setSelectedContacts([]);
        setBulkMessage("");
      } else {
        toast.error(data.error || "Erro ao enviar mensagens");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagens em lote:", error);
      toast.error("Erro ao enviar mensagens");
    } finally {
      setSending(false);
    }
  }

  function toggleContactSelection(contact) {
    if (selectedContacts.find((c) => c.jid === contact.jid)) {
      setSelectedContacts(selectedContacts.filter((c) => c.jid !== contact.jid));
    } else {
      if (selectedContacts.length >= 100) {
        toast.error("Máximo de 100 contatos");
        return;
      }
      setSelectedContacts([...selectedContacts, contact]);
    }
  }

  function selectAllVisible() {
    const visibleContacts = paginatedContacts.filter(
      (c) => !selectedContacts.find((sc) => sc.jid === c.jid)
    );
    
    const totalAfter = selectedContacts.length + visibleContacts.length;
    if (totalAfter > 100) {
      toast.error("Máximo de 100 contatos");
      return;
    }

    setSelectedContacts([...selectedContacts, ...visibleContacts]);
  }

  function clearSelection() {
    setSelectedContacts([]);
  }

  async function openContactInfo(jid) {
    setContactInfoModal({ open: true, loading: true, data: null });
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/contacts/${encodeURIComponent(jid)}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json();

      if (res.ok && data?.contact) {
        const contactData = data.contact;
        setContactInfoModal({ open: true, loading: false, data: contactData });
        setContactEdit({
          name: contactData.name || '',
          observation: contactData.observation || '',
          image: contactData.image || '',
        });
      } else {
        toast.error(data.error || "Não foi possível carregar o contato");
        setContactInfoModal({ open: false, loading: false, data: null });
      }
    } catch (error) {
      console.error("Erro ao carregar contato:", error);
      toast.error("Erro ao carregar contato");
      setContactInfoModal({ open: false, loading: false, data: null });
    }
  }

  async function saveContactInfo() {
    if (!contactInfoModal.data?.jid) return;
    setSavingContact(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/whatsapp-organization/${slug}/contacts/${encodeURIComponent(contactInfoModal.data.jid)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contactEdit.name,
            observation: contactEdit.observation,
            image: contactEdit.image,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data?.contact) {
        setContacts((prev) => prev.map((c) =>
          c.jid === contactInfoModal.data.jid
            ? {
                ...c,
                name: contactEdit.name || c.name,
                observation: contactEdit.observation,
                imgUrl: contactEdit.image || c.imgUrl,
              }
            : c
        ));

        setContactInfoModal((prev) => ({ ...prev, data: {
          ...prev.data,
          name: contactEdit.name,
          observation: contactEdit.observation,
          image: contactEdit.image || prev.data.image,
        } }));

        toast.success("Contato atualizado");
      } else {
        toast.error(data.error || "Erro ao atualizar contato");
      }
    } catch (err) {
      console.error("Erro ao salvar contato:", err);
      toast.error("Erro ao salvar contato");
    } finally {
      setSavingContact(false);
    }
  }

  // Paginação
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="animate-spin" size={48} style={{ color: strong }} />
        <p className="ml-4 text-gray-600">Carregando WhatsApp...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status de Conexão */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Status</p>
              <p className={`text-xl font-bold mt-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? "Conectado" : "Desconectado"}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              {isConnected ? (
                <CheckCircle size={24} className="text-green-600" />
              ) : (
                <XCircle size={24} className="text-red-600" />
              )}
            </div>
          </div>
        </div>

        {/* Total de Contatos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Contatos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{contacts.length}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <Users size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>

        {/* Selecionados */}
        <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Selecionados</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {selectedContacts.length}/100
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: light }}>
              <MessageCircle size={24} style={{ color: strong }} />
            </div>
          </div>
        </div>
      </div>

      {/* CONEXÃO OU CONTEÚDO */}
      {!isConnected && !qrCode && (
        <div className="bg-white p-10 rounded-lg shadow-sm border text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 rounded-full inline-block mb-4" style={{ backgroundColor: light }}>
              <MessageSquare size={48} style={{ color: strong }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Conectar WhatsApp
            </h2>
            <p className="text-gray-600 mb-6">
              Conecte seu WhatsApp para gerenciar contatos e enviar mensagens em lote
            </p>
            <button
              onClick={() => setShowPhoneModal(true)}
              disabled={connecting}
              className="px-6 py-3 text-white rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: strong }}
            >
              {connecting ? "Conectando..." : "Conectar Agora"}
            </button>
          </div>
        </div>
      )}

      {/* QR CODE */}
      {qrCode && !isConnected && (
        <div className="bg-white p-10 rounded-lg shadow-sm border text-center">
          <div className="max-w-lg mx-auto space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Escaneie o QR Code
            </h2>
            <div
              ref={qrContainerRef}
              className="bg-white p-6 rounded-lg inline-block mb-4 w-full sm:w-auto shadow-inner"
            >
              <QRCodeCanvas
                value={qrCode}
                size={qrSize}
                style={{ width: "100%", height: "auto", maxWidth: 360 }}
              />
            </div>
            <p className="text-gray-600 mb-2">
              1. Abra o WhatsApp no seu celular
            </p>
            <p className="text-gray-600 mb-2">
              2. Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong>
            </p>
            <p className="text-gray-600 mb-6">
              3. Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>
            </p>
            <div className="flex items-center justify-center text-gray-500">
              <Clock size={18} className="mr-2" />
              <span className="text-sm">Aguardando conexão...</span>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE CONTATOS */}
      {isConnected && (
        <>
          {/* AÇÕES E BUSCA */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative w-full md:w-auto">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou número..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ focusColor: strong }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={selectAllVisible}
                  className="flex-1 md:flex-none px-4 py-2 border rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Selecionar Página
                </button>

                {selectedContacts.length > 0 && (
                  <>
                    <button
                      onClick={clearSelection}
                      className="flex-1 md:flex-none px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                    >
                      Limpar ({selectedContacts.length})
                    </button>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="flex-1 md:flex-none px-4 py-2 text-white rounded-lg font-medium transition text-sm"
                      style={{ backgroundColor: strong }}
                    >
                      Enviar em Lote
                    </button>
                  </>
                )}

                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE CONTATOS */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {paginatedContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum contato encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: light }}>
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700 w-12">
                        <input
                          type="checkbox"
                          checked={
                            paginatedContacts.length > 0 &&
                            paginatedContacts.every((c) =>
                              selectedContacts.find((sc) => sc.jid === c.jid)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllVisible();
                            } else {
                              const pageJids = paginatedContacts.map((c) => c.jid);
                              setSelectedContacts(
                                selectedContacts.filter((c) => !pageJids.includes(c.jid))
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Contato</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedContacts.map((contact, idx) => {
                      const isSelected = selectedContacts.find((c) => c.jid === contact.jid);
                      return (
                        <tr key={contact.jid || idx} className={`hover:bg-gray-50 transition ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => toggleContactSelection(contact)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            <button
                              onClick={() => openContactInfo(contact.jid)}
                              className="text-left w-full flex items-center gap-3 hover:text-blue-600"
                            >
                              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-600">
                                {contact.imgUrl ? (
                                  <img src={contact.imgUrl} alt={contact.name || "Contato"} className="w-full h-full object-cover" />
                                ) : (
                                  (contact.name || 'C').slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span>{contact.name || "Sem nome"}</span>
                                <span className="text-sm text-gray-600">({contact.number})</span>
                              </div>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                const msg = prompt("Digite a mensagem:");
                                if (msg) {
                                  setMessage(msg);
                                  handleSendMessage(contact.jid);
                                }
                              }}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Send size={14} />
                              Enviar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between bg-gray-50">
                <p className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages} ({filteredContacts.length} contatos)
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL INFO CONTATO */}
      {contactInfoModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setContactInfoModal({ open: false, loading: false, data: null })}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Informações do Contato</h3>

            {contactInfoModal.loading && (
              <div className="flex items-center gap-3 text-gray-600">
                <Loader className="animate-spin" size={20} />
                <span>Carregando...</span>
              </div>
            )}

            {!contactInfoModal.loading && contactInfoModal.data && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-600">
                    {contactInfoModal.data.image ? (
                      <img src={contactInfoModal.data.image} alt="Foto do contato" className="w-full h-full object-cover" />
                    ) : (
                      (contactEdit.name || contactInfoModal.data.name || 'C').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Número</p>
                    <p className="text-base text-gray-900">{(contactInfoModal.data.id || contactInfoModal.data.jid || '').split('@')[0]}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Nome</label>
                  <input
                    type="text"
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                    value={contactEdit.name}
                    onChange={(e) => setContactEdit((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500">Observação</label>
                  <textarea
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                    rows={3}
                    value={contactEdit.observation}
                    onChange={(e) => setContactEdit((p) => ({ ...p, observation: e.target.value }))}
                  />
                </div>

                {contactInfoModal.data.status && (
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-base text-gray-900">{contactInfoModal.data.status}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setContactInfoModal({ open: false, loading: false, data: null })}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                    disabled={savingContact}
                  >
                    Fechar
                  </button>
                  <button
                    onClick={saveContactInfo}
                    disabled={savingContact}
                    className="px-5 py-2 text-white rounded-lg font-medium transition disabled:opacity-50"
                    style={{ backgroundColor: strong }}
                  >
                    {savingContact ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE TELEFONE PARA CONECTAR */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Conectar WhatsApp
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Informe o número do WhatsApp em formato internacional (ex: +55 11 99999-9999)
            </p>

            <div className="space-y-4">
              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📱 Telefone (obrigatório)
                </label>
                <input
                  type="tel"
                  placeholder="+55 11 99999-9999"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E7EB" }}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +5511999999999 ou +55 11 99999-9999
                </p>
              </div>

              {/* Nome da sessão (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏷️ Nome da Sessão (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: WhatsApp Principal"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E7EB" }}
                  value={sessionNameInput}
                  onChange={(e) => setSessionNameInput(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se deixar em branco, usaremos um nome automático
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneInput("");
                  setSessionNameInput("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                disabled={connecting}
              >
                Cancelar
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || !phoneInput.trim()}
                className="px-6 py-2 text-white rounded-lg font-medium transition disabled:opacity-50"
                style={{ backgroundColor: strong }}
              >
                {connecting ? "Conectando..." : "Próximo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENVIO EM LOTE */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Enviar Mensagem em Lote
            </h3>
            <p className="text-gray-600 mb-4">
              Você está enviando para <strong>{selectedContacts.length}</strong> contatos
            </p>

            <textarea
              className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2"
              style={{ minHeight: "150px" }}
              placeholder="Digite sua mensagem aqui..."
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkMessage("");
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                onClick={handleSendBulk}
                disabled={sending || !bulkMessage.trim()}
                className="px-6 py-2 text-white rounded-lg font-medium transition disabled:opacity-50"
                style={{ backgroundColor: strong }}
              >
                {sending ? "Enviando..." : "Enviar Mensagens"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
