"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiTrash2,
  FiRefreshCcw,
  FiEdit2,
  FiCheck,
  FiX,
  FiCopy,
  FiDownload,
  FiFilter,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiDollarSign,
  FiCreditCard,
  FiUsers,
  FiFileText,
  FiShoppingCart,
  FiTag,
  FiBarChart2,
  FiTrendingUp,
  FiCalendar,
  FiClock,
  FiActivity,
  FiEye,
  FiSend,
  FiPause,
  FiPlay,
  FiStopCircle,
  FiAlertCircle,
  FiCheckCircle,
  FiPercent,
  FiShoppingBag,
  FiLayers,
  FiCreditCard as FiCard,
  FiGlobe,
  FiDollarSign as FiDollar,
  FiBarChart,
  FiPieChart,
  FiDownloadCloud,
  FiUploadCloud,
  FiSettings,
  FiMoreVertical,
  FiExternalLink,
  FiArrowUpRight,
  FiArrowDownRight,
  FiUserCheck,
  FiUserX,
  FiRepeat,
  FiHash,
  FiMail,
  FiPhone,
  FiMapPin,
  FiGlobe as FiWorld,
  FiDatabase,
  FiShield,
  FiLock,
  FiUnlock,
  FiBell,
  FiMessageSquare,
  FiHelpCircle,
  FiStar,
  FiAward,
  FiTarget,
  FiBox,
  FiPackage,
  FiTruck,
  FiArchive,
  FiInbox,
  FiServer,
  FiCpu,
  FiWifi,
  FiWifiOff,
  FiLink,
  FiLink2,
  FiUnlink,
  FiKey,
  FiCodesandbox,
  FiCloud,
  FiCloudRain,
  FiSun,
  FiMoon,
  FiWatch,
  FiWatch as FiWatchIcon,
  FiHeart,
  FiBookmark,
  FiShare2,
  FiThumbsUp,
  FiThumbsDown,
  FiFlag,
  FiFlag as FiFlagIcon,
  FiAlertTriangle,
  FiAlertOctagon,
  FiAnchor,
  FiAtSign,
  FiBluetooth,
  FiBluetooth as FiBluetoothIcon,
  FiBluetoothConnected,
  FiBluetoothConnected as FiBluetoothConnectedIcon,
  FiBluetoothOff,
  FiBluetoothOff as FiBluetoothOffIcon,
  FiBluetoothSearching,
  FiBluetoothSearching as FiBluetoothSearchingIcon,
  FiBluetooth as FiBluetoothIcon2,
  FiBluetooth as FiBluetoothIcon3,
  FiBluetooth as FiBluetoothIcon4,
  FiBluetooth as FiBluetoothIcon5,
} from "react-icons/fi";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import * as XLSX from "xlsx";

export default function StripeDashboardPremium() {
  const API = `${process.env.NEXT_PUBLIC_API_URL}/api/stripe`;
  const primaryColor = "#6366F1";
  const successColor = "#10B981";
  const warningColor = "#F59E0B";
  const dangerColor = "#EF4444";
  const infoColor = "#3B82F6";
  const purpleColor = "#8B5CF6";

  const { confirm } = useConfirm();

  // ==================== STATES ====================
  // Data Collections
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [balance, setBalance] = useState(null);
  const [balanceTransactions, setBalanceTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [charges, setCharges] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [checkoutSessions, setCheckoutSessions] = useState([]);

  // Editing States
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [expandedSection, setExpandedSection] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({
    status: "all",
    dateRange: "30d",
    currency: "all",
  });
  const [viewMode, setViewMode] = useState("grid");
  const [selectedItems, setSelectedItems] = useState([]);

  // Forms
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    active: true,
    metadata: {},
    statement_descriptor: "",
    unit_label: "",
  });

  const [newPrice, setNewPrice] = useState({
    product_id: "",
    currency: "brl",
    unit_amount: "",
    recurring: {
      interval: "month",
      interval_count: 1,
    },
    nickname: "",
    metadata: {},
    tax_behavior: "inclusive",
  });

  const [newCustomer, setNewCustomer] = useState({
    email: "",
    name: "",
    phone: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "BR",
    },
    metadata: {},
  });

  const [newCoupon, setNewCoupon] = useState({
    percent_off: "",
    amount_off: "",
    currency: "brl",
    duration: "once",
    duration_in_months: "",
    name: "",
    metadata: {},
    max_redemptions: "",
    redeem_by: "",
  });

  const [newPromoCode, setNewPromoCode] = useState({
    coupon: "",
    code: "",
    active: true,
    metadata: {},
    max_redemptions: "",
    expires_at: "",
  });

  const [newSubscription, setNewSubscription] = useState({
    customer: "",
    items: [{ price: "", quantity: 1 }],
    coupon: "",
    promotion_code: "",
    trial_end: "",
    metadata: {},
  });

  const [newInvoice, setNewInvoice] = useState({
    customer: "",
    description: "",
    metadata: {},
    auto_advance: false,
    collection_method: "send_invoice",
    days_until_due: 30,
  });

  const [newRefund, setNewRefund] = useState({
    payment_intent: "",
    charge: "",
    amount: "",
    reason: "",
    metadata: {},
  });

  const [newPayout, setNewPayout] = useState({
    amount: "",
    currency: "brl",
    description: "",
    method: "standard",
    metadata: {},
  });

  const [newCheckoutSession, setNewCheckoutSession] = useState({
    mode: "payment",
    line_items: [],
    customer: "",
    success_url: `${window.location.origin}/success`,
    cancel_url: `${window.location.origin}/cancel`,
    metadata: {},
  });

  // Metrics & Stats
  const [metrics, setMetrics] = useState({
    revenue: {
      currentMonth: 0,
      previousMonth: 0,
      trend: 0,
    },
    subscriptions: {
      active: 0,
      trialing: 0,
      canceled: 0,
      total: 0,
    },
    customers: {
      total: 0,
      newThisMonth: 0,
      churnRate: 0,
    },
    conversions: {
      checkoutSuccess: 0,
      checkoutFailure: 0,
      rate: 0,
    },
    topCustomers: [],
  });

  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [chartData, setChartData] = useState(null);

  // ==================== UTILITY FUNCTIONS ====================
  const formatCurrency = (amount, currency = "brl") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateId = (id) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a área de transferência");
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success("Exportado com sucesso!");
  };

  // ==================== API CALLS ====================
  const apiCall = async (method, endpoint, body = null) => {
    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(`${API}${endpoint}`, options);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Erro ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (error) {
      toast.error(error.message || "Erro na conexão com a API");
      throw error;
    }
  };

  // ==================== DATA FETCHING ====================
  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      const [
        productsRes,
        pricesRes,
        subsRes,
        customersRes,
        paymentsRes,
        invoicesRes,
        invoiceItemsRes,
        couponsRes,
        promoRes,
        balanceRes,
        transRes,
        payoutsRes,
        chargesRes,
        refundsRes,
        disputesRes,
        sessionsRes,
        metricsRevenueRes,
        metricsSubsRes,
        metricsCustomersRes,
      ] = await Promise.all([
        apiCall("GET", "/products"),
        apiCall("GET", "/prices"),
        apiCall("GET", "/subscriptions?status=all"),
        apiCall("GET", "/customers"),
        apiCall("GET", "/payment-intents"),
        apiCall("GET", "/invoices"),
        apiCall("GET", "/invoice-items"),
        apiCall("GET", "/coupons"),
        apiCall("GET", "/promo-codes"),
        apiCall("GET", "/balance"),
        apiCall("GET", "/balance/transactions"),
        apiCall("GET", "/payouts"),
        apiCall("GET", "/charges"),
        apiCall("GET", "/refunds"),
        apiCall("GET", "/disputes"),
        Promise.resolve({ data: [] }),
        apiCall("GET", "/metrics/revenue"),
        apiCall("GET", "/metrics/subscriptions"),
        apiCall("GET", "/metrics/top-customers"),
      ]);

      if (productsRes?.data) setProducts(productsRes.data);
      if (pricesRes?.data) setPrices(pricesRes.data);
      if (subsRes?.data) setSubscriptions(subsRes.data);
      if (customersRes?.data) setCustomers(customersRes.data);
      if (paymentsRes?.data) setPaymentIntents(paymentsRes.data);
      if (invoicesRes?.data) setInvoices(invoicesRes.data);
      if (invoiceItemsRes?.data) setInvoiceItems(invoiceItemsRes.data);
      if (couponsRes?.data) setCoupons(couponsRes.data);
      if (promoRes?.data) setPromoCodes(promoRes.data);
      if (balanceRes) setBalance(balanceRes);
      if (transRes?.data) setBalanceTransactions(transRes.data);
      if (payoutsRes?.data) setPayouts(payoutsRes.data);
      if (chargesRes?.data) setCharges(chargesRes.data);
      if (refundsRes?.data) setRefunds(refundsRes.data);
      if (disputesRes?.data) setDisputes(disputesRes.data);
      if (sessionsRes?.data) setCheckoutSessions(sessionsRes.data);

      // Update metrics
      const activeSubs = subsRes?.data?.filter(s => s.status === "active").length || 0;
      const trialingSubs = subsRes?.data?.filter(s => s.status === "trialing").length || 0;
      const canceledSubs = subsRes?.data?.filter(s => s.status === "canceled").length || 0;

      setMetrics({
        revenue: metricsRevenueRes || {
          currentMonth: balanceRes?.available?.[0]?.amount || 0,
          previousMonth: 0,
          trend: 0,
        },
        subscriptions: {
          active: activeSubs,
          trialing: trialingSubs,
          canceled: canceledSubs,
          total: subsRes?.data?.length || 0,
        },
        customers: metricsCustomersRes || {
          total: customersRes?.data?.length || 0,
          newThisMonth: 0,
          churnRate: 0,
        },
        conversions: {
          checkoutSuccess: sessionsRes?.data?.filter(s => s.payment_status === "paid").length || 0,
          checkoutFailure: sessionsRes?.data?.filter(s => s.payment_status !== "paid").length || 0,
          rate: 0,
        },
        topCustomers: metricsCustomersRes?.topCustomers || [],
      });

      toast.success("Dados atualizados com sucesso! 🎉");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ==================== CRUD OPERATIONS ====================

  // PRODUCTS
  const createProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    try {
      const res = await apiCall("POST", "/products", newProduct);
      if (res) {
        setProducts([...products, res]);
        setNewProduct({
          name: "",
          description: "",
          active: true,
          metadata: {},
          statement_descriptor: "",
          unit_label: "",
        });
        toast.success("🎉 Produto criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const updateProduct = async () => {
    if (!editingProduct?.name) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    try {
      const res = await apiCall("PATCH", `/products/${editingProduct.id}`, editingProduct);
      if (res) {
        setProducts(products.map(p => p.id === res.id ? res : p));
        setEditingProduct(null);
        toast.success("✅ Produto atualizado!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const archiveProduct = async (id) => {
    if (await confirm({
      title: "Arquivar Produto",
      message: "Tem certeza que deseja arquivar este produto?",
      confirmText: "Arquivar",
      cancelText: "Cancelar",
    })) {
      try {
        const res = await apiCall("DELETE", `/products/${id}`);
        if (res) {
          setProducts(products.filter(p => p.id !== id));
          toast.info("📦 Produto arquivado");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  // PRICES
  const createPrice = async (e) => {
    e.preventDefault();
    if (!newPrice.product_id || !newPrice.unit_amount) {
      toast.error("Produto e valor são obrigatórios");
      return;
    }

    try {
      const res = await apiCall("POST", "/prices", newPrice);
      if (res) {
        setPrices([...prices, res]);
        setNewPrice({
          product_id: "",
          currency: "brl",
          unit_amount: "",
          recurring: { interval: "month", interval_count: 1 },
          nickname: "",
          metadata: {},
          tax_behavior: "inclusive",
        });
        toast.success("💰 Preço criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const updatePrice = async () => {
    try {
      const res = await apiCall("PATCH", `/prices/${editingPrice.id}`, {
        nickname: editingPrice.nickname,
        metadata: editingPrice.metadata,
      });
      if (res) {
        setPrices(prices.map(p => p.id === res.id ? res : p));
        setEditingPrice(null);
        toast.success("✅ Preço atualizado!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const archivePrice = async (id) => {
    if (await confirm({
      title: "Arquivar Preço",
      message: "Tem certeza que deseja arquivar este preço?",
      confirmText: "Arquivar",
      cancelText: "Cancelar",
    })) {
      try {
        const res = await apiCall("DELETE", `/prices/${id}`);
        if (res) {
          setPrices(prices.filter(p => p.id !== id));
          toast.info("💰 Preço arquivado");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  // CUSTOMERS
  const createCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.email) {
      toast.error("Email é obrigatório");
      return;
    }

    try {
      const res = await apiCall("POST", "/customers", newCustomer);
      if (res) {
        setCustomers([...customers, res]);
        setNewCustomer({
          email: "",
          name: "",
          phone: "",
          address: { line1: "", line2: "", city: "", state: "", postal_code: "", country: "BR" },
          metadata: {},
        });
        toast.success("👤 Cliente criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const updateCustomer = async () => {
    try {
      const res = await apiCall("PATCH", `/customers/${editingCustomer.id}`, {
        email: editingCustomer.email,
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        metadata: editingCustomer.metadata,
      });
      if (res) {
        setCustomers(customers.map(c => c.id === res.id ? res : c));
        setEditingCustomer(null);
        toast.success("✅ Cliente atualizado!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const deleteCustomer = async (id) => {
    if (await confirm({
      title: "Deletar Cliente",
      message: "Esta ação é irreversível. Tem certeza?",
      confirmText: "Deletar",
      cancelText: "Cancelar",
      confirmColor: "red",
    })) {
      try {
        const res = await apiCall("DELETE", `/customers/${id}`);
        if (res) {
          setCustomers(customers.filter(c => c.id !== id));
          toast.warning("🗑️ Cliente deletado");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  // COUPONS & PROMO CODES
  const createCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.percent_off && !newCoupon.amount_off) {
      toast.error("Percentual ou valor de desconto é obrigatório");
      return;
    }

    const payload = {
      ...newCoupon,
      percent_off: newCoupon.percent_off ? Number(newCoupon.percent_off) : undefined,
      amount_off: newCoupon.amount_off ? Number(newCoupon.amount_off) : undefined,
      duration_in_months: newCoupon.duration_in_months ? Number(newCoupon.duration_in_months) : undefined,
      max_redemptions: newCoupon.max_redemptions ? Number(newCoupon.max_redemptions) : undefined,
    };

    try {
      const res = await apiCall("POST", "/coupons", payload);
      if (res) {
        setCoupons([...coupons, res]);
        setNewCoupon({
          percent_off: "",
          amount_off: "",
          currency: "brl",
          duration: "once",
          duration_in_months: "",
          name: "",
          metadata: {},
          max_redemptions: "",
          redeem_by: "",
        });
        toast.success("🎫 Cupom criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const createPromoCode = async (e) => {
    e.preventDefault();
    if (!newPromoCode.coupon || !newPromoCode.code) {
      toast.error("Cupom e código são obrigatórios");
      return;
    }

    try {
      const res = await apiCall("POST", "/promo-codes", newPromoCode);
      if (res) {
        setPromoCodes([...promoCodes, res]);
        setNewPromoCode({
          coupon: "",
          code: "",
          active: true,
          metadata: {},
          max_redemptions: "",
          expires_at: "",
        });
        toast.success("🏷️ Código promocional criado!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const deleteCoupon = async (id) => {
    if (await confirm({
      title: "Deletar Cupom",
      message: "Tem certeza que deseja deletar este cupom?",
      confirmText: "Deletar",
      cancelText: "Cancelar",
    })) {
      try {
        const res = await apiCall("DELETE", `/coupons/${id}`);
        if (res) {
          setCoupons(coupons.filter(c => c.id !== id));
          toast.info("🗑️ Cupom deletado");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  // SUBSCRIPTIONS
  const createSubscription = async (e) => {
    e.preventDefault();
    if (!newSubscription.customer || newSubscription.items.length === 0) {
      toast.error("Cliente e itens são obrigatórios");
      return;
    }

    try {
      const res = await apiCall("POST", "/subscriptions", newSubscription);
      if (res) {
        setSubscriptions([...subscriptions, res]);
        setNewSubscription({
          customer: "",
          items: [{ price: "", quantity: 1 }],
          coupon: "",
          promotion_code: "",
          trial_end: "",
          metadata: {},
        });
        toast.success("📅 Assinatura criada com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const cancelSubscription = async (subscriptionId) => {
    if (await confirm({
      title: "Cancelar Assinatura",
      message: "Tem certeza que deseja cancelar esta assinatura?",
      confirmText: "Cancelar",
      cancelText: "Manter",
      confirmColor: "red",
    })) {
      try {
        const res = await apiCall("POST", `/subscriptions/${subscriptionId}/cancel`);
        if (res) {
          setSubscriptions(subscriptions.map(s => s.id === res.id ? res : s));
          toast.warning("⏹️ Assinatura cancelada");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  const pauseSubscription = async (subscriptionId) => {
    if (await confirm({
      title: "Pausar Assinatura",
      message: "Deseja pausar esta assinatura?",
      confirmText: "Pausar",
      cancelText: "Continuar",
    })) {
      try {
        const res = await apiCall("POST", `/subscriptions/${subscriptionId}/pause`);
        if (res) {
          setSubscriptions(subscriptions.map(s => s.id === res.id ? res : s));
          toast.info("⏸️ Assinatura pausada");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  const resumeSubscription = async (subscriptionId) => {
    try {
      const res = await apiCall("POST", `/subscriptions/${subscriptionId}/resume`);
      if (res) {
        setSubscriptions(subscriptions.map(s => s.id === res.id ? res : s));
        toast.success("▶️ Assinatura retomada");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  // INVOICES
  const createInvoice = async (e) => {
    e.preventDefault();
    if (!newInvoice.customer) {
      toast.error("Cliente é obrigatório");
      return;
    }

    try {
      const res = await apiCall("POST", "/invoices", newInvoice);
      if (res) {
        setInvoices([...invoices, res]);
        setNewInvoice({
          customer: "",
          description: "",
          metadata: {},
          auto_advance: false,
          collection_method: "send_invoice",
          days_until_due: 30,
        });
        toast.success("🧾 Fatura criada com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const finalizeInvoice = async (invoiceId) => {
    try {
      const res = await apiCall("POST", `/invoices/${invoiceId}/finalize`);
      if (res) {
        setInvoices(invoices.map(i => i.id === res.id ? res : i));
        toast.success("✅ Fatura finalizada");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const payInvoice = async (invoiceId) => {
    if (await confirm({
      title: "Pagar Fatura",
      message: "Deseja marcar esta fatura como paga?",
      confirmText: "Pagar",
      cancelText: "Cancelar",
    })) {
      try {
        const res = await apiCall("POST", `/invoices/${invoiceId}/pay`);
        if (res) {
          setInvoices(invoices.map(i => i.id === res.id ? res : i));
          toast.success("💳 Fatura paga");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  const voidInvoice = async (invoiceId) => {
    if (await confirm({
      title: "Anular Fatura",
      message: "Tem certeza que deseja anular esta fatura?",
      confirmText: "Anular",
      cancelText: "Cancelar",
      confirmColor: "red",
    })) {
      try {
        const res = await apiCall("POST", `/invoices/${invoiceId}/void`);
        if (res) {
          setInvoices(invoices.map(i => i.id === res.id ? res : i));
          toast.warning("🚫 Fatura anulada");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  const sendInvoice = async (invoiceId) => {
    try {
      const res = await apiCall("POST", `/invoices/${invoiceId}/send`);
      if (res) {
        setInvoices(invoices.map(i => i.id === res.id ? res : i));
        toast.success("📧 Fatura enviada");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  const deleteDraftInvoice = async (invoiceId) => {
    if (await confirm({
      title: "Deletar Rascunho",
      message: "Deseja deletar este rascunho de fatura?",
      confirmText: "Deletar",
      cancelText: "Cancelar",
    })) {
      try {
        const res = await apiCall("DELETE", `/invoices/${invoiceId}`);
        if (res) {
          setInvoices(invoices.filter(i => i.id !== invoiceId));
          toast.info("🗑️ Rascunho deletado");
        }
      } catch (error) {
        // Error handled by apiCall
      }
    }
  };

  // PAYMENTS & REFUNDS
  const createRefund = async (e) => {
    e.preventDefault();
    if (!newRefund.payment_intent && !newRefund.charge) {
      toast.error("PaymentIntent ou Charge é obrigatório");
      return;
    }

    try {
      const res = await apiCall("POST", "/refunds", newRefund);
      if (res) {
        setRefunds([...refunds, res]);
        setNewRefund({
          payment_intent: "",
          charge: "",
          amount: "",
          reason: "",
          metadata: {},
        });
        toast.success("🔄 Reembolso criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  // PAYOUTS
  const createPayout = async (e) => {
    e.preventDefault();
    if (!newPayout.amount) {
      toast.error("Valor é obrigatório");
      return;
    }

    try {
      const res = await apiCall("POST", "/payouts", newPayout);
      if (res) {
        setPayouts([...payouts, res]);
        setNewPayout({
          amount: "",
          currency: "brl",
          description: "",
          method: "standard",
          metadata: {},
        });
        toast.success("💸 Saque criado com sucesso!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  // CHECKOUT SESSIONS
  const createCheckoutSession = async (mode = "payment") => {
    setNewCheckoutSession(prev => ({ ...prev, mode }));
    
    if (mode === "subscription" && newCheckoutSession.line_items.length === 0) {
      toast.error("Adicione itens para a assinatura");
      return;
    }

    try {
      const endpoint = mode === "subscription" 
        ? "/checkout/subscription" 
        : "/checkout/one-time";
      
      const res = await apiCall("POST", endpoint, newCheckoutSession);
      if (res?.url) {
        window.open(res.url, "_blank");
        toast.success("🛒 Sessão de checkout criada!");
      }
    } catch (error) {
      // Error handled by apiCall
    }
  };

  // ==================== UI COMPONENTS ====================
  const StatCard = ({ title, value, change, icon: Icon, color, suffix, loading: isLoading }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
            </div>
          )}
          {change !== undefined && !isLoading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <FiTrendingUp size={14} /> : <FiTrendingUp size={14} className="rotate-180" />}
              <span>{Math.abs(change)}%</span>
              <span className="text-gray-500">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${color}15` }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
    </div>
  );

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm font-medium text-gray-700 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );

  const StatusBadge = ({ status, size = "sm" }) => {
    const config = {
      active: { color: "bg-green-100 text-green-800", label: "Ativo" },
      trialing: { color: "bg-blue-100 text-blue-800", label: "Teste" },
      paused: { color: "bg-yellow-100 text-yellow-800", label: "Pausado" },
      canceled: { color: "bg-red-100 text-red-800", label: "Cancelado" },
      unpaid: { color: "bg-orange-100 text-orange-800", label: "Não pago" },
      paid: { color: "bg-green-100 text-green-800", label: "Pago" },
      draft: { color: "bg-gray-100 text-gray-800", label: "Rascunho" },
      open: { color: "bg-blue-100 text-blue-800", label: "Aberto" },
      void: { color: "bg-red-100 text-red-800", label: "Anulado" },
      uncollectible: { color: "bg-purple-100 text-purple-800", label: "Incoletável" },
      requires_action: { color: "bg-yellow-100 text-yellow-800", label: "Requer ação" },
      requires_capture: { color: "bg-orange-100 text-orange-800", label: "Requer captura" },
      succeeded: { color: "bg-green-100 text-green-800", label: "Sucesso" },
      pending: { color: "bg-gray-100 text-gray-800", label: "Pendente" },
      failed: { color: "bg-red-100 text-red-800", label: "Falhou" },
    };

    const { color, label } = config[status] || { color: "bg-gray-100 text-gray-800", label: status };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
    );
  };

  const DataTable = ({ columns, data, onRowClick, actions, loading: isLoading }) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.title}
                </th>
              ))}
              {actions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const SectionCard = ({ title, icon: Icon, children, headerAction, className = "" }) => (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}20` }}>
                <Icon size={20} style={{ color: primaryColor }} />
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {headerAction}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const FormInput = ({ label, type = "text", value, onChange, placeholder, required, ...props }) => (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required && ' *'}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
        {...props}
      />
    </div>
  );

  const FormSelect = ({ label, value, onChange, options, placeholder, required }) => (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required && ' *'}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
      >
        <option value="">{placeholder || 'Selecione...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const ActionButton = ({ children, onClick, variant = "primary", size = "md", disabled, icon: Icon, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    const variants = {
      primary: `bg-[${primaryColor}] text-white hover:bg-[${primaryColor}]/90 focus:ring-[${primaryColor}]/20`,
      secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-200",
      success: `bg-[${successColor}] text-white hover:bg-[${successColor}]/90 focus:ring-[${successColor}]/20`,
      warning: `bg-[${warningColor}] text-white hover:bg-[${warningColor}]/90 focus:ring-[${warningColor}]/20`,
      danger: `bg-[${dangerColor}] text-white hover:bg-[${dangerColor}]/90 focus:ring-[${dangerColor}]/20`,
      outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        {...props}
      >
        {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
        {children}
      </button>
    );
  };

  // ==================== FILTERED DATA ====================
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const filteredSubscriptions = useMemo(() => {
    let filtered = subscriptions;
    if (selectedFilters.status !== 'all') {
      filtered = filtered.filter(s => s.status === selectedFilters.status);
    }
    return filtered.filter(s =>
      s.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subscriptions, searchQuery, selectedFilters.status]);

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando painel Stripe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${purpleColor})` }}>
                <FiCreditCard size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stripe Dashboard</h1>
                <p className="text-gray-600 text-sm">Gerenciamento completo de pagamentos</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={() => exportToExcel(products, 'stripe-products')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
              >
                <FiDownload size={16} />
                Exportar
              </button>
              <button
                onClick={fetchAllData}
                disabled={refreshing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <FiRefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Receita Mensal"
            value={formatCurrency(metrics.revenue.currentMonth)}
            change={metrics.revenue.trend}
            icon={FiDollarSign}
            color={primaryColor}
            loading={loading}
          />
          <StatCard
            title="Assinaturas Ativas"
            value={metrics.subscriptions.active}
            change={10}
            icon={FiUsers}
            color={successColor}
            loading={loading}
          />
          <StatCard
            title="Clientes"
            value={metrics.customers.total}
            change={5}
            icon={FiUserCheck}
            color={infoColor}
            loading={loading}
          />
          <StatCard
            title="Taxa de Conversão"
            value={`${metrics.conversions.rate}%`}
            change={2.5}
            icon={FiTrendingUp}
            color={warningColor}
            loading={loading}
          />
        </div>

        {/* Balance Overview */}
        {balance && (
          <SectionCard title="Saldo" icon={FiBarChart2} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                <p className="text-sm font-medium text-blue-700 mb-2">Disponível</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(balance.available?.[0]?.amount || 0, balance.available?.[0]?.currency)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Para saque</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                <p className="text-sm font-medium text-green-700 mb-2">Pendente</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(balance.pending?.[0]?.amount || 0, balance.pending?.[0]?.currency)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Em processamento</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                <p className="text-sm font-medium text-purple-700 mb-2">Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(
                    (balance.available?.[0]?.amount || 0) + (balance.pending?.[0]?.amount || 0),
                    balance.available?.[0]?.currency
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-2">Saldo total</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <ActionButton
              variant="primary"
              onClick={() => setActiveTab("products")}
              icon={FiPlus}
            >
              Novo Produto
            </ActionButton>
            <ActionButton
              variant="success"
              onClick={() => setActiveTab("customers")}
              icon={FiUserCheck}
            >
              Novo Cliente
            </ActionButton>
            <ActionButton
              variant="warning"
              onClick={() => createCheckoutSession("payment")}
              icon={FiShoppingCart}
            >
              Checkout
            </ActionButton>
            <ActionButton
              variant="info"
              onClick={() => setActiveTab("invoices")}
              icon={FiFileText}
            >
              Criar Fatura
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => setActiveTab("subscriptions")}
              icon={FiRepeat}
            >
              Nova Assinatura
            </ActionButton>
            <ActionButton
              variant="outline"
              onClick={() => setActiveTab("coupons")}
              icon={FiTag}
            >
              Novo Cupom
            </ActionButton>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar produtos, clientes, assinaturas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, status: e.target.value })}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="trialing">Teste</option>
                <option value="paused">Pausado</option>
                <option value="canceled">Cancelado</option>
              </select>
              <select
                value={selectedFilters.dateRange}
                onChange={(e) => setSelectedFilters({ ...selectedFilters, dateRange: e.target.value })}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
              <button className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                <FiFilter size={18} />
                Mais Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: FiActivity },
              { id: "products", label: "Produtos", icon: FiPackage },
              { id: "prices", label: "Preços", icon: FiDollar },
              { id: "customers", label: "Clientes", icon: FiUsers },
              { id: "subscriptions", label: "Assinaturas", icon: FiRepeat },
              { id: "invoices", label: "Faturas", icon: FiFileText },
              { id: "payments", label: "Pagamentos", icon: FiCreditCard },
              { id: "coupons", label: "Cupons", icon: FiTag },
              { id: "checkout", label: "Checkout", icon: FiShoppingCart },
              { id: "payouts", label: "Saques", icon: FiDownloadCloud },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Top Customers */}
            <SectionCard title="Principais Clientes" icon={FiAward}>
              <DataTable
                columns={[
                  { key: "name", title: "Cliente", render: (val, row) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {row.name?.charAt(0) || row.email?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{row.name || "Sem nome"}</p>
                        <p className="text-sm text-gray-500">{row.email}</p>
                      </div>
                    </div>
                  )},
                  { key: "total_spent", title: "Total Gasto", render: (val) => formatCurrency(val) },
                  { key: "subscriptions", title: "Assinaturas", render: (val) => val || 0 },
                  { key: "last_purchase", title: "Última Compra", render: (val) => formatDate(val) },
                ]}
                data={metrics.topCustomers}
                loading={loading}
              />
            </SectionCard>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SectionCard title="Atividade Recente" icon={FiClock}>
                <div className="space-y-4">
                  {[...charges, ...invoices, ...subscriptions]
                    .sort((a, b) => b.created - a.created)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.object === 'charge' && `Pagamento de ${formatCurrency(item.amount)}`}
                            {item.object === 'invoice' && `Fatura ${item.number}`}
                            {item.object === 'subscription' && `Assinatura ${item.id.slice(-8)}`}
                          </p>
                          <p className="text-sm text-gray-500">{formatDate(item.created)}</p>
                        </div>
                        <StatusBadge status={item.status || item.payment_status} />
                      </div>
                    ))}
                </div>
              </SectionCard>

              <SectionCard title="Estatísticas Rápidas" icon={FiBarChart}>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Conversões Checkout</span>
                      <span className="text-sm font-bold text-gray-900">{metrics.conversions.rate}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(metrics.conversions.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Churn Rate</span>
                      <span className="text-sm font-bold text-gray-900">{metrics.customers.churnRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(metrics.customers.churnRate, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{subscriptions.filter(s => s.status === 'trialing').length}</p>
                      <p className="text-sm text-gray-600 mt-1">Em Teste</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{charges.filter(c => c.paid).length}</p>
                      <p className="text-sm text-gray-600 mt-1">Pagamentos</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-8">
            <SectionCard 
              title="Criar Novo Produto" 
              icon={FiPlus}
              headerAction={
                <ActionButton variant="outline" size="sm" onClick={() => exportToExcel(products, 'stripe-products')}>
                  <FiDownload size={14} /> Exportar
                </ActionButton>
              }
            >
              <form onSubmit={createProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Nome do Produto"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ex: Plano Premium"
                    required
                  />
                  <FormInput
                    label="Descrição"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Descrição do produto"
                  />
                  <FormInput
                    label="Descriptor de Extrato"
                    value={newProduct.statement_descriptor}
                    onChange={(e) => setNewProduct({ ...newProduct, statement_descriptor: e.target.value })}
                    placeholder="Aparece no extrato do cliente"
                    maxLength={22}
                  />
                  <FormInput
                    label="Unidade de Medida"
                    value={newProduct.unit_label}
                    onChange={(e) => setNewProduct({ ...newProduct, unit_label: e.target.value })}
                    placeholder="Ex: unidade, licença"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newProduct.active}
                      onChange={(e) => setNewProduct({ ...newProduct, active: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Produto ativo</span>
                  </label>
                </div>
                <ActionButton type="submit" variant="primary" size="lg">
                  <FiPlus size={16} /> Criar Produto
                </ActionButton>
              </form>
            </SectionCard>

            <SectionCard title="Produtos" icon={FiPackage}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 hover:border-gray-300 transition">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{product.name}</h4>
                          <p className="text-sm text-gray-600 mt-1 truncate">{product.description || "Sem descrição"}</p>
                        </div>
                        <StatusBadge status={product.active ? "active" : "canceled"} />
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p className="truncate">ID: {truncateId(product.id)}</p>
                        {product.unit_label && <p>Unidade: {product.unit_label}</p>}
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex gap-2">
                          <ActionButton
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(product)}
                          >
                            <FiEdit2 size={14} /> Editar
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            size="sm"
                            onClick={() => archiveProduct(product.id)}
                          >
                            <FiTrash2 size={14} /> Arquivar
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === "customers" && (
          <div className="space-y-8">
            <SectionCard title="Adicionar Cliente" icon={FiUserCheck}>
              <form onSubmit={createCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="cliente@exemplo.com"
                    required
                  />
                  <FormInput
                    label="Nome"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                  <FormInput
                    label="Telefone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                  <FormSelect
                    label="País"
                    value={newCustomer.address.country}
                    onChange={(e) => setNewCustomer({
                      ...newCustomer,
                      address: { ...newCustomer.address, country: e.target.value }
                    })}
                    options={[
                      { value: "BR", label: "Brasil" },
                      { value: "US", label: "Estados Unidos" },
                      { value: "PT", label: "Portugal" },
                      { value: "ES", label: "Espanha" },
                    ]}
                  />
                </div>
                <ActionButton type="submit" variant="primary" size="lg">
                  <FiUserCheck size={16} /> Criar Cliente
                </ActionButton>
              </form>
            </SectionCard>

            <SectionCard title="Clientes" icon={FiUsers}>
              <DataTable
                columns={[
                  { key: "name", title: "Cliente", render: (val, row) => (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {val?.charAt(0) || row.email?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{val || "Sem nome"}</p>
                        <p className="text-sm text-gray-500">{row.email}</p>
                      </div>
                    </div>
                  )},
                  { key: "phone", title: "Telefone", render: (val) => val || "—" },
                  { key: "created", title: "Cadastro", render: (val) => formatDate(val) },
                  { key: "subscriptions", title: "Assinaturas", render: (_, row) => 
                    subscriptions.filter(s => s.customer === row.id).length
                  },
                ]}
                data={filteredCustomers}
                actions={(row) => (
                  <div className="flex gap-2">
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(row);
                      }}
                    >
                      <FiEdit2 size={14} />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomer(row.id);
                      }}
                    >
                      <FiTrash2 size={14} />
                    </ActionButton>
                  </div>
                )}
                onRowClick={(row) => {
                  // Implement customer detail view
                  toast.info(`Detalhes do cliente: ${row.name || row.email}`);
                }}
              />
            </SectionCard>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === "subscriptions" && (
          <div className="space-y-8">
            <SectionCard title="Criar Assinatura" icon={FiRepeat}>
              <form onSubmit={createSubscription} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect
                    label="Cliente"
                    value={newSubscription.customer}
                    onChange={(e) => setNewSubscription({ ...newSubscription, customer: e.target.value })}
                    options={customers.map(c => ({ value: c.id, label: c.name || c.email }))}
                    required
                  />
                  <FormSelect
                    label="Preço"
                    value={newSubscription.items[0].price}
                    onChange={(e) => setNewSubscription({
                      ...newSubscription,
                      items: [{ ...newSubscription.items[0], price: e.target.value }]
                    })}
                    options={prices.map(p => ({ 
                      value: p.id, 
                      label: `${p.nickname || "Preço"} - ${formatCurrency(p.unit_amount, p.currency)}/${p.recurring?.interval === "month" ? "mês" : "ano"}`
                    }))}
                    required
                  />
                  <FormInput
                    label="Data de Término do Trial (opcional)"
                    type="datetime-local"
                    value={newSubscription.trial_end}
                    onChange={(e) => setNewSubscription({ ...newSubscription, trial_end: e.target.value })}
                  />
                  <FormSelect
                    label="Cupom (opcional)"
                    value={newSubscription.coupon}
                    onChange={(e) => setNewSubscription({ ...newSubscription, coupon: e.target.value })}
                    options={[
                      { value: "", label: "Nenhum" },
                      ...coupons.map(c => ({ value: c.id, label: c.name || `Cupom ${c.id.slice(-8)}` }))
                    ]}
                  />
                </div>
                <ActionButton type="submit" variant="primary" size="lg">
                  <FiRepeat size={16} /> Criar Assinatura
                </ActionButton>
              </form>
            </SectionCard>

            <SectionCard title="Assinaturas" icon={FiRepeat}>
              <DataTable
                columns={[
                  { key: "customer", title: "Cliente", render: (val, row) => {
                    const customer = customers.find(c => c.id === row.customer);
                    return customer?.name || customer?.email || row.customer;
                  }},
                  { key: "status", title: "Status", render: (val) => <StatusBadge status={val} /> },
                  { key: "current_period_end", title: "Próxima Cobrança", render: (val) => formatDate(val) },
                  { key: "items", title: "Valor", render: (val) => {
                    const price = val?.data?.[0]?.price;
                    return price ? formatCurrency(price.unit_amount, price.currency) : "—";
                  }},
                  { key: "created", title: "Criada em", render: (val) => formatDate(val) },
                ]}
                data={filteredSubscriptions}
                actions={(row) => (
                  <div className="flex gap-2">
                    {row.status === "active" && (
                      <ActionButton
                        variant="warning"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          pauseSubscription(row.id);
                        }}
                      >
                        <FiPause size={14} />
                      </ActionButton>
                    )}
                    {row.status === "paused" && (
                      <ActionButton
                        variant="success"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeSubscription(row.id);
                        }}
                      >
                        <FiPlay size={14} />
                      </ActionButton>
                    )}
                    {row.status !== "canceled" && (
                      <ActionButton
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelSubscription(row.id);
                        }}
                      >
                        <FiStopCircle size={14} />
                      </ActionButton>
                    )}
                  </div>
                )}
              />
            </SectionCard>
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SectionCard title="Criar Cupom" icon={FiTag}>
                <form onSubmit={createCoupon} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Desconto %"
                      type="number"
                      min="1"
                      max="100"
                      value={newCoupon.percent_off}
                      onChange={(e) => setNewCoupon({ 
                        ...newCoupon, 
                        percent_off: e.target.value,
                        amount_off: "" // Clear amount if percent is set
                      })}
                      placeholder="Ex: 20"
                    />
                    <div className="relative">
                      <FormInput
                        label="Valor Desconto"
                        type="number"
                        value={newCoupon.amount_off}
                        onChange={(e) => setNewCoupon({ 
                          ...newCoupon, 
                          amount_off: e.target.value,
                          percent_off: "" // Clear percent if amount is set
                        })}
                        placeholder="Em centavos"
                      />
                      <span className="absolute right-3 top-8 text-gray-500 text-sm">centavos</span>
                    </div>
                  </div>
                  <FormInput
                    label="Nome do Cupom"
                    value={newCoupon.name}
                    onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
                    placeholder="Ex: BLACKFRIDAY2024"
                  />
                  <FormSelect
                    label="Duração"
                    value={newCoupon.duration}
                    onChange={(e) => setNewCoupon({ ...newCoupon, duration: e.target.value })}
                    options={[
                      { value: "once", label: "Uma vez" },
                      { value: "repeating", label: "Repetido" },
                      { value: "forever", label: "Para sempre" },
                    ]}
                  />
                  {newCoupon.duration === "repeating" && (
                    <FormInput
                      label="Meses de Duração"
                      type="number"
                      min="1"
                      value={newCoupon.duration_in_months}
                      onChange={(e) => setNewCoupon({ ...newCoupon, duration_in_months: e.target.value })}
                    />
                  )}
                  <ActionButton type="submit" variant="primary" size="lg">
                    <FiTag size={16} /> Criar Cupom
                  </ActionButton>
                </form>
              </SectionCard>

              <SectionCard title="Criar Código Promocional" icon={FiPercent}>
                <form onSubmit={createPromoCode} className="space-y-6">
                  <FormSelect
                    label="Cupom Base"
                    value={newPromoCode.coupon}
                    onChange={(e) => setNewPromoCode({ ...newPromoCode, coupon: e.target.value })}
                    options={coupons.map(c => ({ value: c.id, label: c.name || `Cupom ${c.id.slice(-8)}` }))}
                    required
                  />
                  <FormInput
                    label="Código"
                    value={newPromoCode.code}
                    onChange={(e) => setNewPromoCode({ ...newPromoCode, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: WELCOME50"
                    required
                  />
                  <FormInput
                    label="Data de Expiração (opcional)"
                    type="datetime-local"
                    value={newPromoCode.expires_at}
                    onChange={(e) => setNewPromoCode({ ...newPromoCode, expires_at: e.target.value })}
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPromoCode.active}
                        onChange={(e) => setNewPromoCode({ ...newPromoCode, active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Ativo</span>
                    </label>
                  </div>
                  <ActionButton type="submit" variant="success" size="lg">
                    <FiPercent size={16} /> Criar Código
                  </ActionButton>
                </form>
              </SectionCard>
            </div>

            <SectionCard title="Cupons e Códigos" icon={FiCodesandbox}>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Cupons ({coupons.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-semibold text-gray-900">{coupon.name || "Cupom"}</h5>
                            <p className="text-sm text-gray-500">ID: {truncateId(coupon.id)}</p>
                          </div>
                          <StatusBadge status={coupon.valid ? "active" : "canceled"} />
                        </div>
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {coupon.percent_off ? `${coupon.percent_off}%` : formatCurrency(coupon.amount_off, coupon.currency)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Duração: {coupon.duration === "once" ? "Uma vez" : 
                                  coupon.duration === "repeating" ? `${coupon.duration_in_months} meses` : 
                                  "Para sempre"}
                        </p>
                        <ActionButton
                          variant="danger"
                          size="sm"
                          onClick={() => deleteCoupon(coupon.id)}
                        >
                          <FiTrash2 size={14} /> Remover
                        </ActionButton>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Códigos Promocionais ({promoCodes.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cupom</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Redenções</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira em</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {promoCodes.map((promo) => (
                          <tr key={promo.id}>
                            <td className="px-4 py-3">
                              <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {promo.code}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {coupons.find(c => c.id === promo.coupon)?.name || truncateId(promo.coupon)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={promo.active ? "active" : "canceled"} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {promo.times_redeemed || 0} / {promo.max_redemptions || "∞"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {promo.expires_at ? formatDate(promo.expires_at) : "Não expira"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Checkout Tab */}
        {activeTab === "checkout" && (
          <div className="space-y-8">
            <SectionCard title="Criar Sessão de Checkout" icon={FiShoppingCart}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect
                    label="Modo"
                    value={newCheckoutSession.mode}
                    onChange={(e) => setNewCheckoutSession({ ...newCheckoutSession, mode: e.target.value })}
                    options={[
                      { value: "payment", label: "Pagamento Único" },
                      { value: "subscription", label: "Assinatura" },
                      { value: "setup", label: "Setup" },
                    ]}
                  />
                  <FormSelect
                    label="Cliente (opcional)"
                    value={newCheckoutSession.customer}
                    onChange={(e) => setNewCheckoutSession({ ...newCheckoutSession, customer: e.target.value })}
                    options={[
                      { value: "", label: "Novo Cliente" },
                      ...customers.map(c => ({ value: c.id, label: c.name || c.email }))
                    ]}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Itens</label>
                  <div className="space-y-3">
                    {newCheckoutSession.line_items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <select
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...newCheckoutSession.line_items];
                            newItems[idx].price = e.target.value;
                            setNewCheckoutSession({ ...newCheckoutSession, line_items: newItems });
                          }}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none"
                        >
                          <option value="">Selecione um preço</option>
                          {prices.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nickname || "Preço"} - {formatCurrency(p.unit_amount, p.currency)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...newCheckoutSession.line_items];
                            newItems[idx].quantity = parseInt(e.target.value);
                            setNewCheckoutSession({ ...newCheckoutSession, line_items: newItems });
                          }}
                          className="w-20 px-3 py-2 rounded-lg border border-gray-300 focus:border-blue-500 outline-none"
                          placeholder="Qtd"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = newCheckoutSession.line_items.filter((_, i) => i !== idx);
                            setNewCheckoutSession({ ...newCheckoutSession, line_items: newItems });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewCheckoutSession({
                        ...newCheckoutSession,
                        line_items: [...newCheckoutSession.line_items, { price: "", quantity: 1 }]
                      })}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <FiPlus size={14} /> Adicionar Item
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <ActionButton
                    variant="primary"
                    onClick={() => createCheckoutSession("payment")}
                    disabled={newCheckoutSession.line_items.length === 0}
                  >
                    <FiShoppingCart size={16} /> Criar Checkout Pagamento
                  </ActionButton>
                  <ActionButton
                    variant="success"
                    onClick={() => createCheckoutSession("subscription")}
                    disabled={newCheckoutSession.line_items.length === 0}
                  >
                    <FiRepeat size={16} /> Criar Checkout Assinatura
                  </ActionButton>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Sessões Recentes" icon={FiClock}>
              <DataTable
                columns={[
                  { key: "id", title: "ID", render: (val) => truncateId(val) },
                  { key: "mode", title: "Modo", render: (val) => (
                    <span className="capitalize">{val}</span>
                  )},
                  { key: "payment_status", title: "Status", render: (val) => <StatusBadge status={val} /> },
                  { key: "amount_total", title: "Valor", render: (val) => formatCurrency(val) },
                  { key: "created", title: "Criada em", render: (val) => formatDate(val) },
                  { key: "success_url", title: "URL", render: (val) => (
                    <button
                      onClick={() => window.open(val, '_blank')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <FiExternalLink size={14} />
                    </button>
                  )},
                ]}
                data={checkoutSessions.slice(0, 10)}
              />
            </SectionCard>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-8">
            <SectionCard title="Criar Fatura" icon={FiFileText}>
              <form onSubmit={createInvoice} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect
                    label="Cliente"
                    value={newInvoice.customer}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                    options={customers.map(c => ({ value: c.id, label: c.name || c.email }))}
                    required
                  />
                  <FormSelect
                    label="Método de Cobrança"
                    value={newInvoice.collection_method}
                    onChange={(e) => setNewInvoice({ ...newInvoice, collection_method: e.target.value })}
                    options={[
                      { value: "charge_automatically", label: "Cobrar Automaticamente" },
                      { value: "send_invoice", label: "Enviar Fatura" },
                    ]}
                  />
                  {newInvoice.collection_method === "send_invoice" && (
                    <FormInput
                      label="Dias para Vencimento"
                      type="number"
                      min="1"
                      value={newInvoice.days_until_due}
                      onChange={(e) => setNewInvoice({ ...newInvoice, days_until_due: parseInt(e.target.value) })}
                    />
                  )}
                  <FormInput
                    label="Descrição"
                    value={newInvoice.description}
                    onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                    placeholder="Descrição da fatura"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newInvoice.auto_advance}
                      onChange={(e) => setNewInvoice({ ...newInvoice, auto_advance: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Finalizar automaticamente</span>
                  </label>
                </div>
                <ActionButton type="submit" variant="primary" size="lg">
                  <FiFileText size={16} /> Criar Fatura
                </ActionButton>
              </form>
            </SectionCard>

            <SectionCard title="Faturas" icon={FiFileText}>
              <DataTable
                columns={[
                  { key: "number", title: "Número" },
                  { key: "customer", title: "Cliente", render: (val, row) => {
                    const customer = customers.find(c => c.id === row.customer);
                    return customer?.name || customer?.email || truncateId(val);
                  }},
                  { key: "status", title: "Status", render: (val) => <StatusBadge status={val} /> },
                  { key: "amount_paid", title: "Valor", render: (val) => formatCurrency(val) },
                  { key: "due_date", title: "Vencimento", render: (val) => val ? formatDate(val) : "—" },
                  { key: "created", title: "Criada em", render: (val) => formatDate(val) },
                ]}
                data={invoices}
                actions={(row) => (
                  <div className="flex gap-2">
                    {row.status === "draft" && (
                      <ActionButton
                        variant="success"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          finalizeInvoice(row.id);
                        }}
                      >
                        Finalizar
                      </ActionButton>
                    )}
                    {row.status === "open" && (
                      <>
                        <ActionButton
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendInvoice(row.id);
                          }}
                        >
                          <FiSend size={14} />
                        </ActionButton>
                        <ActionButton
                          variant="warning"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            payInvoice(row.id);
                          }}
                        >
                          Pagar
                        </ActionButton>
                      </>
                    )}
                    {row.status !== "paid" && row.status !== "void" && (
                      <ActionButton
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          voidInvoice(row.id);
                        }}
                      >
                        Anular
                      </ActionButton>
                    )}
                  </div>
                )}
              />
            </SectionCard>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SectionCard title="Criar Reembolso" icon={FiRefreshCcw}>
                <form onSubmit={createRefund} className="space-y-6">
                  <div className="space-y-4">
                    <FormInput
                      label="Payment Intent ID"
                      value={newRefund.payment_intent}
                      onChange={(e) => setNewRefund({ 
                        ...newRefund, 
                        payment_intent: e.target.value,
                        charge: "" // Clear charge if payment intent is set
                      })}
                      placeholder="pi_xxx"
                    />
                    <div className="text-center text-gray-500 text-sm">OU</div>
                    <FormInput
                      label="Charge ID"
                      value={newRefund.charge}
                      onChange={(e) => setNewRefund({ 
                        ...newRefund, 
                        charge: e.target.value,
                        payment_intent: "" // Clear payment intent if charge is set
                      })}
                      placeholder="ch_xxx"
                    />
                  </div>
                  <FormInput
                    label="Valor (opcional - deixa vazio para reembolsar tudo)"
                    type="number"
                    value={newRefund.amount}
                    onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                    placeholder="Em centavos"
                  />
                  <FormSelect
                    label="Motivo"
                    value={newRefund.reason}
                    onChange={(e) => setNewRefund({ ...newRefund, reason: e.target.value })}
                    options={[
                      { value: "", label: "Selecione um motivo" },
                      { value: "duplicate", label: "Duplicado" },
                      { value: "fraudulent", label: "Fraudulento" },
                      { value: "requested_by_customer", label: "Solicitado pelo cliente" },
                    ]}
                  />
                  <ActionButton type="submit" variant="warning" size="lg">
                    <FiRefreshCcw size={16} /> Criar Reembolso
                  </ActionButton>
                </form>
              </SectionCard>

              <SectionCard title="Estatísticas de Pagamento" icon={FiBarChart2}>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">
                        {paymentIntents.filter(p => p.status === 'succeeded').length}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Pagamentos Bem-sucedidos</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
                      <p className="text-sm text-gray-600 mt-1">Reembolsos</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Status de Pagamentos</h4>
                    <div className="space-y-2">
                      {['succeeded', 'processing', 'requires_action', 'canceled'].map(status => {
                        const count = paymentIntents.filter(p => p.status === status).length;
                        const percentage = paymentIntents.length > 0 ? (count / paymentIntents.length) * 100 : 0;
                        return (
                          <div key={status}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize text-gray-700">{status}</span>
                              <span className="font-medium text-gray-900">{count} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Histórico de Pagamentos" icon={FiCreditCard}>
              <DataTable
                columns={[
                  { key: "id", title: "ID", render: (val) => truncateId(val) },
                  { key: "amount", title: "Valor", render: (val) => formatCurrency(val) },
                  { key: "status", title: "Status", render: (val) => <StatusBadge status={val} /> },
                  { key: "customer", title: "Cliente", render: (val, row) => {
                    const customer = customers.find(c => c.id === row.customer);
                    return customer?.name || customer?.email || "—";
                  }},
                  { key: "created", title: "Data", render: (val) => formatDate(val) },
                  { key: "receipt_url", title: "Recibo", render: (val) => val && (
                    <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                      <FiExternalLink size={14} />
                    </a>
                  )},
                ]}
                data={charges.slice(0, 20)}
              />
            </SectionCard>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <div className="space-y-8">
            <SectionCard title="Criar Saque" icon={FiDownloadCloud}>
              <form onSubmit={createPayout} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormInput
                    label="Valor"
                    type="number"
                    value={newPayout.amount}
                    onChange={(e) => setNewPayout({ ...newPayout, amount: e.target.value })}
                    placeholder="Em centavos"
                    required
                  />
                  <FormSelect
                    label="Moeda"
                    value={newPayout.currency}
                    onChange={(e) => setNewPayout({ ...newPayout, currency: e.target.value })}
                    options={[
                      { value: "brl", label: "BRL (Real)" },
                      { value: "usd", label: "USD (Dólar)" },
                      { value: "eur", label: "EUR (Euro)" },
                    ]}
                  />
                  <FormSelect
                    label="Método"
                    value={newPayout.method}
                    onChange={(e) => setNewPayout({ ...newPayout, method: e.target.value })}
                    options={[
                      { value: "standard", label: "Padrão (3-5 dias)" },
                      { value: "instant", label: "Instantâneo" },
                    ]}
                  />
                  <FormInput
                    label="Descrição (opcional)"
                    value={newPayout.description}
                    onChange={(e) => setNewPayout({ ...newPayout, description: e.target.value })}
                    placeholder="Descrição do saque"
                  />
                </div>
                {balance && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-1">Saldo disponível para saque:</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(balance.available?.[0]?.amount || 0, balance.available?.[0]?.currency)}
                    </p>
                  </div>
                )}
                <ActionButton type="submit" variant="primary" size="lg">
                  <FiDownloadCloud size={16} /> Criar Saque
                </ActionButton>
              </form>
            </SectionCard>

            <SectionCard title="Histórico de Saques" icon={FiDownloadCloud}>
              <DataTable
                columns={[
                  { key: "id", title: "ID", render: (val) => truncateId(val) },
                  { key: "amount", title: "Valor", render: (val) => formatCurrency(val) },
                  { key: "status", title: "Status", render: (val) => <StatusBadge status={val} /> },
                  { key: "arrival_date", title: "Data de Chegada", render: (val) => formatDate(val) },
                  { key: "method", title: "Método", render: (val) => (
                    <span className="capitalize">{val}</span>
                  )},
                  { key: "created", title: "Criado em", render: (val) => formatDate(val) },
                ]}
                data={payouts}
              />
            </SectionCard>
          </div>
        )}

        {/* Loading State for Other Tabs */}
        {!['dashboard', 'products', 'customers', 'subscriptions', 'coupons', 'checkout', 'invoices', 'payments', 'payouts'].includes(activeTab) && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando {activeTab}...</p>
            <p className="text-sm text-gray-500 mt-2">Esta funcionalidade está em desenvolvimento</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <FiCreditCard size={16} className="text-white" />
              </div>
              <span className="text-sm text-gray-600">Stripe Dashboard v1.0</span>
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition">Documentação</button>
              <button className="text-sm text-gray-600 hover:text-gray-900 transition">Suporte</button>
              <button className="text-sm text-gray-600 hover:text-gray-900 transition">Status</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Edit Modals */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Editar Produto</h3>
                <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX size={20} />
                </button>
              </div>
              <form className="space-y-6">
                <FormInput
                  label="Nome"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  required
                />
                <FormInput
                  label="Descrição"
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  as="textarea"
                  rows={3}
                />
                <div className="flex gap-3">
                  <ActionButton type="button" variant="primary" onClick={updateProduct}>
                    Salvar Alterações
                  </ActionButton>
                  <ActionButton type="button" variant="outline" onClick={() => setEditingProduct(null)}>
                    Cancelar
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Editar Cliente</h3>
                <button onClick={() => setEditingCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FiX size={20} />
                </button>
              </div>
              <form className="space-y-6">
                <FormInput
                  label="Nome"
                  value={editingCustomer.name || ""}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={editingCustomer.email}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  required
                />
                <FormInput
                  label="Telefone"
                  value={editingCustomer.phone || ""}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                />
                <div className="flex gap-3">
                  <ActionButton type="button" variant="primary" onClick={updateCustomer}>
                    Salvar Alterações
                  </ActionButton>
                  <ActionButton type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                    Cancelar
                  </ActionButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}