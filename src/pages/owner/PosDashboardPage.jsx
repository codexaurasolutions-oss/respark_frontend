import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock3, Download, FileText, Gift, ScissorsLineDashed, TicketPercent, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import PosReceipt from "../../components/PosReceipt";
import { useAuth } from "../../context/AuthContext";
import { useBranch } from "../../context/BranchContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { downloadFromApi } from "../../utils/download";
import { formatApiError } from "../../utils/apiError";
import "./PosDashboard.css";
import "./PosPage.css";
const invoiceLabel = (item) => item?.serviceName || item?.productName || item?.name || "Item";
const invoiceStatusClass = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PAID") return "paid";
  if (normalized === "PARTIAL") return "partial";
  if (normalized === "UNPAID") return "unpaid";
  if (normalized === "CANCELLED") return "cancelled";
  return "default";
};
const STRUCTURED_META_START = "[SYSTEM_POS_META]";
const STRUCTURED_META_END = "[/SYSTEM_POS_META]";

const stripStructuredMeta = (value) => {
  const raw = String(value || "");
  const startIndex = raw.indexOf(STRUCTURED_META_START);
  if (startIndex === -1) return raw.trim();
  const endIndex = raw.indexOf(STRUCTURED_META_END, startIndex);
  const before = raw.slice(0, startIndex);
  const after = endIndex === -1 ? "" : raw.slice(endIndex + STRUCTURED_META_END.length);
  return `${before}\n${after}`.trim();
};

const toAmount = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export default function PosDashboardPage() {
  const { auth } = useAuth();
  const { selectedBranchId } = useBranch();
  const { formatMoney, currencyCode } = useSalonSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billLoading, setBillLoading] = useState(false);
  const [invoiceDiscountDraft, setInvoiceDiscountDraft] = useState(0);

  const [showPkgModal, setShowPkgModal] = useState(false);
  const [pkgModalPkg, setPkgModalPkg] = useState(null);
  const [pkgDraft, setPkgDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [] });
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgServiceSearch, setPkgServiceSearch] = useState("");

  const [showGcModal, setShowGcModal] = useState(false);
  const [gcModalGc, setGcModalGc] = useState(null);
  const [gcDraft, setGcDraft] = useState({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0, 10) });
  const [gcSearch, setGcSearch] = useState("");

  const [showMemModal, setShowMemModal] = useState(false);
  const [memModalMem, setMemModalMem] = useState(null);
  const [memDraft, setMemDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [] });
  const [memSearch, setMemSearch] = useState("");
  const [memServiceSearch, setMemServiceSearch] = useState("");
  

  const handleAddPkgToCart = () => {
    const pkg = pkgModalPkg;
    setForm(c => ({
      ...c,
      items: [
        ...c.items,
        {
          id: `TEMP_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          itemType: "PACKAGE",
          packageId: pkg.id !== "CUSTOM" ? pkg.id : null,
          name: pkg.name,
          qty: 1,
          unitPrice: Number(pkgDraft.price || 0),
          originalUnitPrice: Number(pkgDraft.price || 0),
          discountAmt: 0,
          discountPct: 0,
          taxPct: pkg.taxPct || 0,
          staffUserId: pkgDraft.staffId || "",
          staffUserSalonId: pkgDraft.staffId || "",
          metaData: pkgDraft
        }
      ]
    }));
    setShowPkgModal(false);
  };

  const handleAddGcToCart = () => {
    const gc = gcModalGc;
    setForm(c => ({
      ...c,
      items: [
        ...c.items,
        {
          id: `TEMP_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          itemType: "GIFT_CARD",
          giftCardId: gc.id !== "CUSTOM" ? gc.id : null,
          name: gc.name,
          qty: 1,
          unitPrice: Number(gcDraft.price || 0),
          originalUnitPrice: Number(gcDraft.price || 0),
          discountAmt: 0,
          discountPct: 0,
          taxPct: 0,
          staffUserId: gcDraft.staffId || "",
          staffUserSalonId: gcDraft.staffId || "",
          metaData: gcDraft
        }
      ]
    }));
    setShowGcModal(false);
  };

  const handleAddMemToCart = () => {
    const mem = memModalMem;
    setForm(c => ({
      ...c,
      items: [
        ...c.items,
        {
          id: `TEMP_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          itemType: "MEMBERSHIP",
          membershipPlanId: mem.id !== "CUSTOM" ? mem.id : null,
          name: mem.name,
          qty: 1,
          unitPrice: Number(memDraft.price || 0),
          originalUnitPrice: Number(memDraft.price || 0),
          discountAmt: 0,
          discountPct: 0,
          taxPct: mem.taxPct || 0,
          staffUserId: memDraft.staffId || "",
          staffUserSalonId: memDraft.staffId || "",
          metaData: memDraft
        }
      ]
    }));
    setShowMemModal(false);
  };

  const [billInvoice, setBillInvoice] = useState(null);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState({ error: "", success: "" });

  const [posContext, setPosContext] = useState({
    customers: [],
    branches: [],
    services: [],
    staffUsers: [],
    products: [],
    memberships: [],
    packages: [],
    coupons: [],
    giftCards: [],
    serviceCategories: []
  });
  const [posSettings, setPosSettings] = useState(null);

  const [posTab, setPosTab] = useState("billing");
  const [posGender, setPosGender] = useState("FEMALE");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("NEW");
  const [messageConfig, setMessageConfig] = useState({ invoiceMessage: true });
  const [paymentDraft, setPaymentDraft] = useState({ online: "", offline: "" });
  const [form, setForm] = useState({ items: [], payments: [] });
  const [reminderModal, setReminderModal] = useState({ open: false, index: -1, date: "", note: "" });
  const [consumableModal, setConsumableModal] = useState({ open: false, index: -1, rows: [{ name: "", qty: 1, cost: 0 }] });

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountDraft, setDiscountDraft] = useState({ type: "FIX", value: "" });
  const [showApplyPkgModal, setShowApplyPkgModal] = useState(false);
  const [customerPackages, setCustomerPackages] = useState([]);
  const [loadingCustomerPkgs, setLoadingCustomerPkgs] = useState(false);
  const [showApplyGcModal, setShowApplyGcModal] = useState(false);
  const [gcRedemptionCode, setGcRedemptionCode] = useState("");
  const [gcRedemptionResult, setGcRedemptionResult] = useState(null);
  const [gcRedemptionLoading, setGcRedemptionLoading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipDraft, setTipDraft] = useState({ staffId: "", amount: "", paymentMode: "CASH" });
  const [tipEntries, setTipEntries] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const returnPath = useMemo(() => {
    const from = new URLSearchParams(location.search).get("from");
    return from || "/admin/pos-dashboard";
  }, [location.search]);

  const loadInvoiceDetail = useCallback(async (invoiceId) => {
    if (!invoiceId) {
      setInvoiceDetail(null);
      return null;
    }
    const response = await api.get(`/owner/invoices/${invoiceId}`);
    setInvoiceDetail(response.data);
    return response.data;
  }, []);

  const loadPosContext = useCallback(async () => {
    try {
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [contextResponse, categoryResponse, settingsResponse] = await Promise.all([
        api.get("/owner/pos/context", { params: branchParams }),
        api.get("/owner/service-categories", { params: branchParams }),
        api.get("/owner/settings")
      ]);
      setPosContext({
        ...contextResponse.data,
        serviceCategories: categoryResponse.data || []
      });
      setPosSettings(settingsResponse.data || null);
    } catch (error) {
      console.error(error);
    }
  }, [selectedBranchId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = { startDate, endDate };
      if (statusFilter) queryParams.status = statusFilter;
      if (selectedBranchId) queryParams.branchId = selectedBranchId;

      const [invoiceResponse, summaryResponse] = await Promise.all([
        api.get("/owner/invoices", { params: queryParams }),
        api.get("/owner/invoices/reports/summary", { params: { startDate, endDate, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } })
      ]);

      setRows(invoiceResponse.data?.data || invoiceResponse.data || []);
      setSummary(summaryResponse.data || null);

      if (params.id) {
        const detailResponse = await api.get(`/owner/invoices/${params.id}`);
        setDetail(detailResponse.data);
        setInvoiceDetail(detailResponse.data);
      } else {
        setDetail(null);
        setInvoiceDetail(null);
      }
    } catch (error) {
      console.error("DASHBOARD LOAD ERROR:", error);
      setStatus({ error: formatApiError(error, "Could not load the POS dashboard"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [endDate, loadInvoiceDetail, params.id, startDate, statusFilter, selectedBranchId]);

  useEffect(() => {
    void load();
    void loadPosContext();
  }, [load, loadPosContext]);

  useEffect(() => {
    const sourceItems = invoiceDetail?.items || detail?.items || [];
    if (!detail && !invoiceDetail) return;

    setDetailStatus(invoiceDetail?.status || detail?.status || "NEW");
    setDetailNote(stripStructuredMeta(invoiceDetail?.notes || detail?.note || ""));
    setPaymentDraft({ online: "", offline: "" });
    setInvoiceDiscountDraft(toAmount(invoiceDetail?.discount ?? detail?.discount, 0));
    setStatus({ error: "", success: "" });
    setForm({
      items: sourceItems.map((item) => ({
        ...item,
        itemType: item.itemType || (item.productId ? "PRODUCT" : "SERVICE"),
        staffUserSalonId: item.staffUserSalonId || item.staffUserId || "",
        qty: Number(item.qty || 1),
        unitPrice: Number(item.unitPrice || 0),
        originalUnitPrice: Number(item.originalUnitPrice || item.unitPrice || 0),
        discountPct: toAmount(item.discountPct, 0),
        discountAmt: toAmount(item.discountAmt, 0),
        taxPct: Number(item.taxPct || 0),
        tipAmount: Number(item.tipAmount || 0),
        complimentary: Number(item.unitPrice || 0) === 0,
        serviceReminder: item.serviceReminder || null,
        consumables: Array.isArray(item.consumables) ? item.consumables : []
      })),
      payments: invoiceDetail?.payments || []
    });
  }, [detail, invoiceDetail]);

  const activeInvoiceId = invoiceDetail?.id || detail?.id || null;
  const salonName = auth?.membership?.salon?.name || auth?.membership?.salonName || "";
  const salonPhone = auth?.membership?.salon?.phone || "";
  const salonAddress = auth?.membership?.salon?.address || detail?.branch?.address || detail?.branch?.name || "Main branch";

  const productCategories = useMemo(() => {
    const cats = new Map();
    (posContext.products || []).forEach(p => {
      if (p.category) {
        const key = p.category.id || p.category.name;
        if (!cats.has(key)) cats.set(key, { id: key, name: p.category.name });
      }
    });
    return Array.from(cats.values());
  }, [posContext.products]);

  const productTileGroups = useMemo(() => {
    let list = posContext.products || [];
    if (productSearch) {
      list = list.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }
    if (productCategoryFilter) {
      const normalizeProductCategoryId = (product) => product.category?.id || product.category?.name || "Uncategorized";
      list = list.filter(p => normalizeProductCategoryId(p) === productCategoryFilter);
    }
    const grouped = {};
    list.forEach(p => {
      const cat = p.category?.name || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return Object.entries(grouped).map(([title, items]) => ({ title, items }));
  }, [posContext.products, productSearch, productCategoryFilter]);

  const addQuickProduct = (product) => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `TEMP_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          itemType: "PRODUCT",
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.sellingPrice || 0,
          originalUnitPrice: product.sellingPrice || 0,
          discountAmt: 0,
          discountPct: 0,
          taxPct: product.taxPct || 0,
          staffUserId: "",
          staffUserSalonId: ""
        }
      ]
    }));
  };

  const serviceTileGroups = useMemo(() => {
    let list = posContext.services || [];
    if (posGender) list = list.filter((service) => !service.gender || ["UNISEX", "BOTH", "ALL"].includes(service.gender.toUpperCase()) || service.gender.toUpperCase() === posGender);
    if (serviceSearch) list = list.filter((service) => service.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    if (serviceCategoryFilter) list = list.filter((service) => service.category?.name === serviceCategoryFilter);

    const grouped = {};
    list.forEach((service) => {
      const category = service.category?.name || "Other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(service);
    });
    return Object.entries(grouped).map(([title, items]) => ({ title, items }));
  }, [posContext.services, posGender, serviceSearch, serviceCategoryFilter]);

  const getDetailBasePrice = useCallback((item) => {
    const original = toAmount(item.originalUnitPrice, NaN);
    if (Number.isFinite(original) && original > 0) return original;
    return toAmount(item.unitPrice, 0);
  }, []);

  const applyDetailItemDiscountPatch = useCallback((item, patch = {}) => {
    const basePrice = getDetailBasePrice(item);
    const discountPct = Math.max(0, toAmount(
      Object.prototype.hasOwnProperty.call(patch, "discountPct") ? patch.discountPct : item.discountPct,
      0
    ));
    const discountAmt = Math.max(0, toAmount(
      Object.prototype.hasOwnProperty.call(patch, "discountAmt") ? patch.discountAmt : item.discountAmt,
      0
    ));
    const discountedPrice = Math.max(0, basePrice - ((basePrice * discountPct) / 100) - discountAmt);
    return {
      ...item,
      ...patch,
      originalUnitPrice: basePrice,
      discountPct,
      discountAmt,
      unitPrice: Number(discountedPrice.toFixed(2))
    };
  }, [getDetailBasePrice]);

  const totals = useMemo(() => {
    const advancedSettings = posSettings?.advancedSettings && typeof posSettings.advancedSettings === "object" ? posSettings.advancedSettings : {};
    const isInclusive = advancedSettings?.taxMapping?.inclusiveTax === true;
    const subtotal = form.items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.qty || 0)), 0);
    const tax = form.items.reduce((sum, item) => {
      const line = Number(item.unitPrice || 0) * Number(item.qty || 0);
      const tp = Number(item.taxPct || 0);
      if (isInclusive && tp > 0) return sum + (line * tp) / (100 + tp);
      return sum + (line * tp) / 100;
    }, 0);
    const total = Math.max(0, subtotal + tax - toAmount(invoiceDiscountDraft, 0));
    return {
      subtotal,
      tax,
      total,
      balance: Math.max(0, total - Number(invoiceDetail?.paidAmount || 0))
    };
  }, [form.items, invoiceDetail?.paidAmount, invoiceDiscountDraft, posSettings]);

  const paidOnline = useMemo(() => (
    (invoiceDetail?.payments || [])
      .filter((payment) => payment.mode === "ONLINE")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  ), [invoiceDetail]);

  const paidOffline = useMemo(() => (
    (invoiceDetail?.payments || [])
      .filter((payment) => payment.mode !== "ONLINE")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  ), [invoiceDetail]);

  const openInvoice = (id) => {
    setBillInvoice(null);
    const basePath = location.pathname.startsWith("/admin/order-dashboard") ? "/admin/order-dashboard" : "/admin/pos-dashboard";
    navigate(`${basePath}/${id}?from=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const downloadInvoiceFromCard = async (event, invoiceId, invoiceNumber) => {
    event.stopPropagation();
    event.preventDefault();
    try {
      await downloadFromApi(`/owner/invoices/${invoiceId}/pdf`, {
        fallbackFilename: `invoice-${invoiceNumber || invoiceId}.pdf`
      });
    } catch (err) {
      console.error("PDF download failed:", err);
    }
  };

  const closeDetail = () => {
    setBillInvoice(null);
    navigate(returnPath);
  };

  const addQuickService = (service) => {
    if (!isEditing) return;
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          itemType: "SERVICE",
          serviceId: service.id,
          serviceName: service.name,
          staffUserSalonId: "",
          qty: 1,
          unitPrice: Number(service.price || 0),
          originalUnitPrice: Number(service.price || 0),
          taxPct: Number(service.taxRate || 0),
          tipAmount: 0,
          complimentary: false
        }
      ]
    }));
  };

  const updateItem = (index, patch) => {
    if (!isEditing) return;
    setForm((current) => {
      const items = [...current.items];
      items[index] = applyDetailItemDiscountPatch(items[index], patch);
      return { ...current, items };
    });
  };

  const removeItem = (index) => {
    if (!isEditing) return;
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const toggleComplimentary = (index) => {
    if (!isEditing) return;
    setForm((current) => {
      const items = [...current.items];
      const nextItem = { ...items[index] };
      const basePrice = getDetailBasePrice(nextItem);
      if (nextItem.complimentary) {
        const discountPct = toAmount(nextItem.discountPct, 0);
        const discountAmt = toAmount(nextItem.discountAmt, 0);
        nextItem.unitPrice = Number(Math.max(0, basePrice - ((basePrice * discountPct) / 100) - discountAmt).toFixed(2));
        nextItem.complimentary = false;
      } else {
        nextItem.originalUnitPrice = basePrice;
        nextItem.unitPrice = 0;
        nextItem.complimentary = true;
      }
      items[index] = nextItem;
      return { ...current, items };
    });
  };

  const applyInvoiceLevelDiscount = () => {
    if (!isEditing) return;
    setDiscountDraft({ type: "FIX", value: String(toAmount(invoiceDiscountDraft, 0) || "") });
    setShowDiscountModal(true);
  };

  const confirmDiscount = () => {
    const val = Number(discountDraft.value || 0);
    if (val < 0) {
      setStatus({ error: "Discount cannot be negative.", success: "" });
      return;
    }
    let finalDiscount = 0;
    if (discountDraft.type === "PERCENT") {
      const pct = Math.min(100, Math.max(0, val));
      finalDiscount = Number(((totals.subtotal + totals.tax) * pct / 100).toFixed(2));
    } else {
      finalDiscount = val;
    }
    setInvoiceDiscountDraft(finalDiscount);
    setShowDiscountModal(false);
    setStatus({ error: "", success: `Discount of ${formatMoney(finalDiscount)} applied.` });
  };

  const loadCustomerPackages = async () => {
    if (!invoiceDetail?.customerId) {
      setStatus({ error: "No customer linked to this invoice.", success: "" });
      return;
    }
    setLoadingCustomerPkgs(true);
    try {
      const response = await api.get(`/owner/customers/${invoiceDetail.customerId}/packages`);
      setCustomerPackages((response.data || []).filter(p => p.status === "ACTIVE" && new Date(p.endsAt) > new Date()));
      setShowApplyPkgModal(true);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load customer packages"), success: "" });
    } finally {
      setLoadingCustomerPkgs(false);
    }
  };

  const applyPackageService = (customerPkg, serviceEntry) => {
    const matchedItemIndex = form.items.findIndex(item => 
      item.serviceId === serviceEntry.serviceId && Number(item.unitPrice || 0) > 0
    );
    if (matchedItemIndex === -1) {
      setStatus({ error: `Service "${serviceEntry.service?.name || serviceEntry.serviceId}" not found in cart or already free.`, success: "" });
      return;
    }
    const remaining = (serviceEntry.sessions || 0) - (serviceEntry.sessionsUsed || 0);
    if (remaining <= 0) {
      setStatus({ error: `No remaining sessions for "${serviceEntry.service?.name || serviceEntry.serviceId}".`, success: "" });
      return;
    }
    const item = form.items[matchedItemIndex];
    const discountAmt = Number(item.unitPrice || 0);
    updateItem(matchedItemIndex, {
      unitPrice: 0,
      discountPct: 0,
      discountAmt: discountAmt,
      appliedBenefitType: "PACKAGE",
      appliedBenefitValue: customerPkg.id,
      packageSessionsUsed: 1
    });
    setStatus({ error: "", success: "Package applied successfully" });
    setShowApplyPkgModal(false);
  };

  const validateGiftCard = async () => {
    if (!gcRedemptionCode.trim()) {
      setStatus({ error: "Please enter a gift card code.", success: "" });
      return;
    }
    setGcRedemptionLoading(true);
    setGcRedemptionResult(null);
    try {
      const response = await api.post("/owner/gift-cards/validate", { code: gcRedemptionCode.trim() });
      setGcRedemptionResult(response.data);
    } catch (err) {
      setGcRedemptionResult(null);
      setStatus({ error: formatApiError(err, "Invalid gift card"), success: "" });
    } finally {
      setGcRedemptionLoading(false);
    }
  };

  const applyGiftCard = async () => {
    if (!gcRedemptionResult || !activeInvoiceId) {
      setStatus({ error: "Please save the invoice first before applying a gift card.", success: "" });
      return;
    }
    try {
      setGcRedemptionLoading(true);
      const response = await api.post(`/owner/invoices/${activeInvoiceId}/apply-gift-card`, { giftCardCode: gcRedemptionResult.code });
      const { applyAmount, newGcBalance } = response.data;
      setShowApplyGcModal(false);
      setGcRedemptionCode("");
      setGcRedemptionResult(null);
      setStatus({ error: "", success: `Gift card applied: ${formatMoney(applyAmount)}. Remaining GC balance: ${formatMoney(newGcBalance)}` });
      await loadInvoiceDetail(activeInvoiceId);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to apply gift card"), success: "" });
    } finally {
      setGcRedemptionLoading(false);
    }
  };

  const addTipEntry = () => {
    const amount = Number(tipDraft.amount || 0);
    if (amount <= 0) {
      setStatus({ error: "Tip amount must be greater than zero.", success: "" });
      return;
    }
    if (!tipDraft.staffId) {
      setStatus({ error: "Please select a staff member for the tip.", success: "" });
      return;
    }
    const staffName = (posContext.staffUsers || []).find(s => s.id === tipDraft.staffId)?.user?.name || "Staff";
    setTipEntries(prev => [...prev, { staffId: tipDraft.staffId, staffName, amount, paymentMode: tipDraft.paymentMode }]);
    setTipDraft({ staffId: "", amount: "", paymentMode: "CASH" });
    setStatus({ error: "", success: `Tip of ${formatMoney(amount)} added for ${staffName}.` });
  };

  const removeTipEntry = (index) => {
    setTipEntries(prev => prev.filter((_, i) => i !== index));
  };

  const confirmTips = () => {
    setShowTipModal(false);
    setStatus({ error: "", success: `Total tips: ${formatMoney(tipEntries.reduce((s, e) => s + Number(e.amount || 0), 0))}` });
  };

  const buildStructuredMeta = (items) => {
    const lines = [];
    items.forEach((item) => {
      const itemName = invoiceLabel(item);
      if (item.serviceReminder?.date) {
        lines.push(`Reminder | ${itemName} | ${item.serviceReminder.date} | ${item.serviceReminder.note || "No note"}`);
      }
      if (Array.isArray(item.consumables) && item.consumables.length) {
        item.consumables.forEach((entry) => {
          lines.push(`Consumable | ${itemName} | ${entry.name} | qty=${entry.qty} | cost=${entry.cost}`);
        });
      }
      if (item.complimentary) {
        lines.push(`Complimentary | ${itemName}`);
      }
    });
    if (!lines.length) return "";
    return `${STRUCTURED_META_START}\n${lines.join("\n")}\n${STRUCTURED_META_END}`;
  };

  const openReminderModal = (index) => {
    const currentReminder = form.items[index]?.serviceReminder || null;
    setReminderModal({
      open: true,
      index,
      date: currentReminder?.date || "",
      note: currentReminder?.note || ""
    });
  };

  const saveReminder = () => {
    if (reminderModal.index < 0 || !reminderModal.date) {
      setStatus({ error: "Reminder date is required.", success: "" });
      return;
    }
    updateItem(reminderModal.index, {
      serviceReminder: {
        date: reminderModal.date,
        note: reminderModal.note.trim()
      }
    });
    setReminderModal({ open: false, index: -1, date: "", note: "" });
    setStatus({ error: "", success: `Reminder saved for ${invoiceLabel(form.items[reminderModal.index])}.` });
  };

  const openConsumableModal = (index) => {
    const currentConsumables = form.items[index]?.consumables?.length
      ? form.items[index].consumables.map((entry) => ({ ...entry }))
      : [{ name: "", qty: 1, cost: 0 }];
    setConsumableModal({ open: true, index, rows: currentConsumables });
  };

  const saveConsumables = () => {
    const nextRows = consumableModal.rows
      .map((entry) => ({ name: String(entry.name || "").trim(), qty: Number(entry.qty || 1), cost: Number(entry.cost || 0) }))
      .filter((entry) => entry.name);
    updateItem(consumableModal.index, { consumables: nextRows });
    setConsumableModal({ open: false, index: -1, rows: [{ name: "", qty: 1, cost: 0 }] });
    setStatus({ error: "", success: `Consumables updated for ${invoiceLabel(form.items[consumableModal.index])}.` });
  };

  const updateInvoice = async () => {
    try {
      const invoiceId = activeInvoiceId;
      if (!invoiceId) {
        setStatus({ error: "This invoice could not be resolved.", success: "" });
        return;
      }

      const additionalPayments = [];
      const diffOnline = Math.max(0, Number(paymentDraft.online || 0) - paidOnline);
      const diffOffline = Math.max(0, Number(paymentDraft.offline || 0) - paidOffline);
      if (diffOnline > 0) additionalPayments.push({ mode: "ONLINE", amount: diffOnline });
      if (diffOffline > 0) additionalPayments.push({ mode: "CASH", amount: diffOffline });

      await api.patch(`/owner/invoices/${invoiceId}`, {
        notes: [stripStructuredMeta(detailNote), buildStructuredMeta(form.items)].filter(Boolean).join("\n\n"),
        discount: Number(invoiceDiscountDraft || 0),
        additionalPayments,
        items: form.items.map((item) => ({
          id: item.id,
          itemType: item.itemType,
          serviceId: item.serviceId,
          productId: item.productId,
          productName: item.productName,
          serviceName: item.serviceName,
          staffUserSalonId: item.staffUserSalonId,
          qty: Number(item.qty || 1),
          unitPrice: Number(item.unitPrice || 0),
          taxPct: Number(item.taxPct || 0),
          discountPct: Number(item.discountPct || 0),
          discountAmt: Number(item.discountAmt || 0),
          tipAmount: Number(item.tipAmount || 0),
          complimentary: item.complimentary,
          appliedBenefitType: item.appliedBenefitType,
          appliedBenefitValue: item.appliedBenefitValue,
          packageSessionsUsed: item.packageSessionsUsed,
          metaData: item.serviceReminder || item.consumables?.length ? { serviceReminder: item.serviceReminder, consumables: item.consumables } : undefined
        }))
      });

      for (const tip of tipEntries) {
        if (Number(tip.amount || 0) > 0 && tip.staffId) {
          try {
            await api.post(`/owner/invoices/${invoiceId}/tip`, {
              amount: Number(tip.amount),
              mode: tip.paymentMode,
              staffId: tip.staffId,
              note: `Tip for ${tip.staffName}`
            });
          } catch (tipErr) {
            console.error("Tip failed:", tipErr);
          }
        }
      }
      setTipEntries([]);

      await loadInvoiceDetail(invoiceId);
      setIsEditing(false);
      setStatus({ error: "", success: "Invoice updated successfully." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update invoice"), success: "" });
    }
  };

  const openBillPreview = async () => {
    if (invoiceDetail) {
      setBillInvoice(invoiceDetail);
      return;
    }
    if (detail) {
      setBillInvoice(detail);
    }
  };

  const downloadBill = async () => {
    if (!billInvoice?.id) return;
    await downloadFromApi(`/owner/invoices/${billInvoice.id}/pdf`, {
      fallbackFilename: `invoice-${billInvoice.invoiceNumber}.pdf`
    });
  };

  const showAllOrders = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("");
  };

  return (
    <div className="respark-pos-dashboard page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "2.2rem" }}>POS Dashboard</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "1rem" }}>
              Unified billing and point-of-sale overview for your salon.
            </p>
          </div>
        </div>
      </div>
      <div className="pos-dash-header">
        <div className="pos-dash-header-left">
          <div className="pos-dash-date-picker">
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} max={endDate || undefined} style={{ border: "none", outline: "none", background: "transparent" }} />
            <span style={{ color: "#64748b" }}>-</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} min={startDate || undefined} style={{ border: "none", outline: "none", background: "transparent" }} />
          </div>
          <button className="pos-dash-show-btn" onClick={load}>Show Orders</button>
          <button className="pos-dash-show-btn" style={{ background: "#64748b" }} onClick={showAllOrders}>All Orders</button>
        </div>

        <div className="pos-dash-header-right">
          <button className={`pos-dash-filter-pill ${statusFilter === "UNPAID" ? "active" : ""}`} onClick={() => setStatusFilter("UNPAID")}>Unpaid <span>{summary?.unpaidInvoices || 0}</span></button>
          <button className={`pos-dash-filter-pill ${statusFilter === "PARTIAL" ? "active" : ""}`} onClick={() => setStatusFilter("PARTIAL")}>Partial <span>{summary?.partialInvoices || 0}</span></button>
          <button className={`pos-dash-filter-pill ${statusFilter === "PAID" ? "active" : ""}`} onClick={() => setStatusFilter("PAID")}>Paid <span>{summary?.paidInvoices || 0}</span></button>
          <button className={`pos-dash-filter-pill ${statusFilter === "CANCELLED" ? "active" : ""}`} onClick={() => setStatusFilter("CANCELLED")}>Cancelled <span>{summary?.cancelledInvoices || 0}</span></button>
          <button className={`pos-dash-filter-pill ${!statusFilter ? "active" : ""}`} onClick={() => setStatusFilter("")}>Total <span>{summary?.totalInvoices || 0}</span></button>
        </div>
      </div>

      {loading ? (
        <PageLoader title="Loading Invoices" message="Preparing POS dashboard billing board..." />
      ) : (
        <div className="pos-dash-grid">
          {rows.map((row) => {
            const dateStr = new Date(row.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
            const timeStr = new Date(row.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={row.id} className="pos-dash-card" onClick={() => openInvoice(row.id)}>
                <div className="pos-dash-card-actions">
                  {(row.status === "PAID" || row.status === "PARTIAL") ? (
                    <button
                      type="button"
                      className="pos-dash-download-btn"
                      title="Download Invoice"
                      onClick={(event) => downloadInvoiceFromCard(event, row.id, row.invoiceNumber)}
                    >
                      <Download size={16} />
                    </button>
                  ) : null}
                  <div className="pos-dash-card-icon">
                    <FileText size={16} />
                  </div>
                </div>
                <div className="pos-dash-card-id">{row.invoiceNumber}</div>
                <div className="pos-dash-card-name">{row.customer?.name || "Walk-in"}</div>
                <div className="pos-dash-card-phone">{row.customer?.phone || "N/A"}</div>
                <div className="pos-dash-card-items">
                  {(row.items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="pos-dash-card-item">
                      <span>{item.serviceName || item.productName || "Item"}{Number(item.qty || 1) > 1 ? ` x${item.qty}` : ""}</span>
                    </div>
                  ))}
                  {row.items?.length > 3 ? <div className="pos-dash-card-item"><span>+{row.items.length - 3} more items</span></div> : null}
                </div>
                <div className="pos-dash-card-footer">
                  <div className="pos-dash-card-meta">
                    {dateStr}, {timeStr}, Total : {formatMoney(row.total)}
                  </div>
                  <span className={`pos-dash-card-pickup pos-dash-card-status-${(row.status || "default").toLowerCase()}`}>
                    {row.status === "PAID" ? "Paid" : row.status === "PARTIAL" ? "Partial" : row.status === "UNPAID" ? "Unpaid" : row.status === "CANCELLED" ? "Cancelled" : row.status || "N/A"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !rows.length ? (
        <EmptyState title="No invoices found" message="No POS invoices match the current filter." />
      ) : null}

      {detail ? (
        <div className="premium-modal-overlay" onClick={closeDetail} style={{ zIndex: 9999, background: "rgba(0,0,0,0.6)" }}>
          <div className="premium-modal-content pos-dashboard-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pos-detail-header-strip" style={{ position: 'relative' }}>
              <span style={{ color: '#ec4899', fontWeight: 'bold', margin: '0 auto', fontSize: '15px' }}>Update Bill ({invoiceDetail?.status || detailStatus || detail.status}) Invoice Id: {invoiceDetail?.invoiceNumber || detail?.invoiceNumber || "-"}</span>
              <button type="button" onClick={closeDetail} style={{ position: 'absolute', right: 0, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '50%', cursor: 'pointer', padding: '6px', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>

            <div className="pos-layout" style={{ height: "calc(95vh - 50px)", margin: 0, padding: 0, borderRadius: "0 0 16px 16px" }}>
              {/* TOP BAR */}
              <div className="pos-topbar" style={{ padding: "12px 20px" }}>
                <div className="pos-topbar-left">
                  <div className="pos-gender-toggles">
                    <button className={`pos-gender-btn ${posGender === "ALL" ? "active" : ""}`} onClick={() => setPosGender("ALL")}>All</button>
                    <button className={`pos-gender-btn ${posGender === "FEMALE" ? "active" : ""}`} onClick={() => setPosGender("FEMALE")}>Female</button>
                    <button className={`pos-gender-btn ${posGender === "MALE" ? "active" : ""}`} onClick={() => setPosGender("MALE")}>Male</button>
                  </div>
                  <div className="pos-search-wrapper">
                    <input 
                      placeholder={posTab === "billing" ? "Search Service" : "Search Product"} 
                      value={posTab === "billing" ? serviceSearch : productSearch} 
                      onChange={(e) => {
                          const val = e.target.value;
                          if (posTab === "billing") setServiceSearch(val);
                          else setProductSearch(val);
                        }} 
                    />
                    <svg className="pos-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
                <div className="pos-topbar-right">
                  <button className={`pos-top-tab ${posTab === "billing" ? "active" : ""}`} onClick={() => setPosTab("billing")}>Add Service</button>
                  <button className={`pos-top-tab ${posTab === "products" ? "active" : ""}`} onClick={() => setPosTab("products")}>Add Product</button>
                  <button className="pos-top-tab" onClick={() => { setPkgModalPkg(null); setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [], customProducts: [], balance: "", online: "", offline: "", remark: "" }); setShowPkgModal(true); }}>Add Package</button>
                  <button className="pos-top-tab" onClick={() => { setGcModalGc(null); setGcDraft({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0,10) }); setShowGcModal(true); }}>Add GiftCard</button>
                  <button className="pos-top-tab" onClick={() => { setMemModalMem(null); setMemDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] }); setShowMemModal(true); }}>Add Membership</button>
                </div>
              </div>

              <div className="pos-body" style={{ height: "calc(100% - 65px)" }}>
                {/* LEFT SIDEBAR */}
                <div className="pos-sidebar" style={{ opacity: isEditing ? 1 : 0.6, pointerEvents: isEditing ? "auto" : "none" }}>
                  <div className="pos-cat-grid">
                    {posTab === "products" ? (
                      <>
                        <button className={`pos-cat-btn ${!productCategoryFilter ? "active" : ""}`} onClick={() => setProductCategoryFilter("")}>ALL</button>
                        {(posContext.productCategories || []).slice(0, 6).map(c => <button key={c.id || c.name} className={`pos-cat-btn ${productCategoryFilter === (c.id || c.name) ? "active" : ""}`} onClick={() => setProductCategoryFilter(c.id || c.name)}>{c.name}</button>)}
                      </>
                    ) : (
                      <>
                        <button className={`pos-cat-btn ${!serviceCategoryFilter ? "active" : ""}`} onClick={() => setServiceCategoryFilter("")}>ALL</button>
                        {(posContext.serviceCategories || []).slice(0, 6).map(c => <button key={c.id} className={`pos-cat-btn ${serviceCategoryFilter === (c.name) ? "active" : ""}`} onClick={() => setServiceCategoryFilter(c.name)}>{c.name}</button>)}
                      </>
                    )}
                  </div>

                  <div className="pos-item-list-container">
                    {posTab === "products" ? (
                      productTileGroups.length > 0 ? (
                        productTileGroups.map((group) => (
                          <div key={group.title}>
                            <div className="pos-group-header">{group.title}</div>
                            <div className="pos-item-grid">
                              {group.items.map((product) => (
                                <button type="button" key={product.id} className="pos-item-card" onClick={() => addQuickProduct(product)}>
                                  <div className="pos-item-card-name">{product.name}</div>
                                  <div className="pos-item-card-prices">
                                    <span className="pos-item-card-price-new">{Number(product.sellingPrice || product.price || 0).toFixed(0)}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "0.9rem" }}>No products found.</div>
                      )
                    ) : (
                      serviceTileGroups.length > 0 ? (
                        serviceTileGroups.map((group) => (
                          <div key={group.title}>
                            <div className="pos-group-header">{group.title}</div>
                            <div className="pos-item-grid">
                              {group.items.map((service) => (
                                <button type="button" key={service.id} className="pos-item-card" onClick={() => addQuickService(service)}>
                                  <div className="pos-item-card-name">{service.name}</div>
                                  <div className="pos-item-card-prices">
                                    <span className="pos-item-card-price-new">{Number(service.salesPrice || service.price || 0).toFixed(0)}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "0.9rem" }}>No services found.</div>
                      )
                    )}
                  </div>
                </div>

                <div className="pos-main">
                  <div className="pos-invoice-section" style={{ height: "100%", overflowY: "auto", padding: "20px" }}>
                    <div className="pos-invoice-header">
                      <h4>Invoice</h4>
                      <div className="pos-invoice-date">
                        {new Date(invoiceDetail?.createdAt || detail.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
                      <div style={{display: "flex", gap: "24px", width: "100%", justifyContent: "space-between"}}>
                        <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                          <div><strong style={{color:"#0f172a"}}>Guest :</strong> {detail.customer?.name || "Walk-in"}</div>
                          <div><strong style={{color:"#0f172a"}}>Phone :</strong> {detail.customer?.phone || ""}</div>
                        </div>
                        <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                          <div><strong style={{color:"#0f172a"}}>DOB :</strong> NA</div>
                          <div><strong style={{color:"#0f172a"}}>Anniv :</strong> NA</div>
                        </div>
                        <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                          <div><strong style={{color:"#0f172a"}}>Last Visited :</strong> NA</div>
                          <div><strong style={{color:"#0f172a"}}>Due Bal :</strong> NA</div>
                        </div>
                        <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                          <div><strong style={{color:"#0f172a"}}>Membership:</strong> NA</div>
                          <div><strong style={{color:"#0f172a"}}>Package:</strong> NA</div>
                        </div>
                      </div>
                    </div>

                    {status.error || status.success ? (
                      <div style={{ margin: "12px 0", padding: "12px 16px", borderRadius: 8, background: status.error ? "#fef2f2" : "#ecfdf5", color: status.error ? "#991b1b" : "#065f46", fontWeight: 600, border: `1px solid ${status.error ? "#fecaca" : "#a7f3d0"}` }}>
                        {status.error || status.success}
                      </div>
                    ) : null}

                    <div className="pos-cart-table">
                      <div className="cart-table-head">
                    <div>Name</div>
                    <div>Staff</div>
                    <div>Qty</div>
                    <div>Price</div>
                    <div>Sub Total</div>
                    <div>Disc%</div>
                    <div>Disc</div>
                    <div>Tax</div>
                    <div>Total</div>
                    <div>Actions</div>
                  </div>

                  <div className="cart-table-body">
                    {form.items.map((item, index) => {
                      const qty = Number(item.qty || 1);
                      const price = Number(item.unitPrice || 0);
                      const subTotal = price * qty;
                      const tp = Number(item.taxPct || 0);
                      const advSettings = posSettings?.advancedSettings && typeof posSettings.advancedSettings === "object" ? posSettings.advancedSettings : {};
                      const isInc = advSettings?.taxMapping?.inclusiveTax === true;
                      const taxAmount = isInc && tp > 0 ? (subTotal * tp) / (100 + tp) : (subTotal * tp) / 100;
                      const basePrice = getDetailBasePrice(item);
                      const discountPercent = item.complimentary ? 100 : toAmount(item.discountPct, 0);
                      const discountAmount = item.complimentary ? basePrice * qty : toAmount(item.discountAmt, 0) * qty;
                      return (
                        <div key={item.id || `${item.serviceId || item.productId || "item"}-${index}`} className="cart-table-row" style={{ gridTemplateColumns: "2fr 2fr 1fr 1fr 1.5fr 1fr 1fr 1fr 1.5fr 2fr" }}>
                          <div>
                            <div>{invoiceLabel(item)}</div>
                            {item.serviceReminder?.date ? (
                              <div style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>
                                Reminder: {new Date(item.serviceReminder.date).toLocaleDateString("en-GB")} {item.serviceReminder.note ? `- ${item.serviceReminder.note}` : ""}
                              </div>
                            ) : null}
                            {item.consumables?.length ? (
                              <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                                Consumables: {item.consumables.map((entry) => `${entry.name} x${entry.qty}`).join(", ")}
                              </div>
                            ) : null}
                          </div>
                          <div>
                            <select value={item.staffUserSalonId || ""} onChange={(event) => updateItem(index, { staffUserSalonId: event.target.value })} style={{ width: "100%", padding: 4, borderRadius: 4, border: "1px solid #cbd5e1" }} disabled={!isEditing}>
                              <option value="">Select Staff</option>
                              {(posContext.staffUsers || []).map((userSalon) => (
                                <option key={userSalon.id} value={userSalon.id}>{userSalon.user?.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input type="number" min="1" value={item.qty} onChange={(event) => updateItem(index, { qty: Number(event.target.value || 1) })} style={{ width: 52, padding: 4, borderRadius: 4, border: "1px solid #cbd5e1" }} disabled={!isEditing} />
                          </div>
                          <div>{basePrice.toFixed(0)}</div>
                          <div>{subTotal.toFixed(0)}</div>
                          <div>
                            {isEditing && !item.complimentary ? (
                              <input
                                type="number"
                                min="0"
                                value={discountPercent}
                                onChange={(event) => updateItem(index, { discountPct: Math.max(0, toAmount(event.target.value, 0)) })}
                                style={{ width: 56, padding: 4, borderRadius: 4, border: "1px solid #cbd5e1" }}
                              />
                            ) : (
                              discountPercent
                            )}
                          </div>
                          <div>
                            {isEditing && !item.complimentary ? (
                              <input
                                type="number"
                                min="0"
                                value={toAmount(item.discountAmt, 0)}
                                onChange={(event) => updateItem(index, { discountAmt: Math.max(0, toAmount(event.target.value, 0)) })}
                                style={{ width: 56, padding: 4, borderRadius: 4, border: "1px solid #cbd5e1" }}
                              />
                            ) : (
                              discountAmount.toFixed(0)
                            )}
                          </div>
                          <div>{taxAmount.toFixed(0)}</div>
                          <div>{(subTotal + taxAmount).toFixed(0)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" title="Split Service" onClick={() => setStatus({ error: "", success: "Split service workflow is reserved for the next pass." })} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent, #3b82f6)" }} disabled={!isEditing}><ScissorsLineDashed size={16} /></button>
                            <button type="button" title="Service Reminder" onClick={() => openReminderModal(index)} style={{ background: "transparent", border: "none", cursor: "pointer", color: item.serviceReminder?.date ? "#16a34a" : "#111827" }} disabled={!isEditing}><Clock3 size={16} /></button>
                            <button type="button" title="Complimentary" onClick={() => toggleComplimentary(index)} style={{ background: "transparent", border: "none", cursor: "pointer", color: item.complimentary ? "#16a34a" : "#3b82f6" }} disabled={!isEditing}><Gift size={16} /></button>
                            <button type="button" title="Add Consumable Items For Service" onClick={() => openConsumableModal(index)} style={{ background: "transparent", border: "none", cursor: "pointer", color: item.consumables?.length ? "#16a34a" : "#3b82f6" }} disabled={!isEditing}><TicketPercent size={16} /></button>
                            {isEditing ? <button type="button" title="Remove Item" onClick={() => removeItem(index)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                <div className="cart-table-footer">
                  <span>Grand Total</span>
                  <span>{formatMoney(totals.total)}</span>
                </div>
              </div>

              <div className="pos-detail-mid-actions">
                  <input type="text" className="pos-instruction-input" placeholder="Add Order Instruction (Optional, Max 500 Characters)" disabled={!isEditing} value={detailNote} onChange={(event) => setDetailNote(event.target.value)} />
                  <button className="pos-btn-action" type="button" onClick={applyInvoiceLevelDiscount} disabled={!isEditing}>Apply Discount</button>
                  <button className="pos-btn-action" type="button" onClick={() => { if (!isEditing) return; loadCustomerPackages(); }} disabled={!isEditing || loadingCustomerPkgs}>{loadingCustomerPkgs ? "Loading..." : "Apply Package"}</button>
                  <button className="pos-btn-action" type="button" onClick={() => { if (!isEditing) return; setGcRedemptionCode(""); setGcRedemptionResult(null); setShowApplyGcModal(true); }} disabled={!isEditing}>Apply Gift Card</button>
                  <button className="pos-btn-action" type="button" onClick={() => { if (!isEditing) return; setShowTipModal(true); }} disabled={!isEditing}>Add Tip</button>
                </div>

                {!isEditing ? (
                  <div className="pos-detail-edit-shield">
                    <button className="btn-edit-shield" onClick={() => { setIsEditing(true); setPaymentDraft({ online: String(paidOnline), offline: String(paidOffline) }); }}>CLICK HERE TO EDIT</button>
                  </div>
                ) : null}

                <div className="pos-detail-payment-section">
                  <div className="payment-title">Payment Details:</div>
                  <div style={{ marginBottom: 10, color: "#475569", fontWeight: 600 }}>
                    Invoice Discount: <span style={{ color: "#0f172a" }}>{formatMoney(invoiceDiscountDraft)}</span>
                  </div>
                  <div className="payment-inputs">
                    <div className="payment-box">
                      <span>Online Collected</span>
                      <input
                        type="number"
                        min={paidOnline}
                        disabled={!isEditing}
                        value={isEditing ? paymentDraft.online : paidOnline.toFixed(0)}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (val === "") {
                            setPaymentDraft((current) => ({ ...current, online: "" }));
                            return;
                          }
                          const numVal = Number(val);
                          const maxOnline = Math.max(paidOnline, totals.total - Number(paymentDraft.offline || 0));
                          if (numVal <= maxOnline) {
                            setPaymentDraft((current) => ({ ...current, online: val }));
                          } else {
                            setPaymentDraft((current) => ({ ...current, online: String(maxOnline) }));
                          }
                        }}
                      />
                    </div>
                    <div className="payment-box">
                      <span>Offline Collected</span>
                      <input
                        type="number"
                        min={paidOffline}
                        disabled={!isEditing}
                        value={isEditing ? paymentDraft.offline : paidOffline.toFixed(0)}
                        onChange={(event) => {
                          const val = event.target.value;
                          if (val === "") {
                            setPaymentDraft((current) => ({ ...current, offline: "" }));
                            return;
                          }
                          const numVal = Number(val);
                          const maxOffline = Math.max(paidOffline, totals.total - Number(paymentDraft.online || 0));
                          if (numVal <= maxOffline) {
                            setPaymentDraft((current) => ({ ...current, offline: val }));
                          } else {
                            setPaymentDraft((current) => ({ ...current, offline: String(maxOffline) }));
                          }
                        }}
                      />
                    </div>
                    <div className="payment-box">
                      <span>Balance</span>
                      <input
                        type="number"
                        disabled
                        value={Math.max(
                          0,
                          totals.total - 
                          (isEditing ? Number(paymentDraft.online || 0) : paidOnline) - 
                          (isEditing ? Number(paymentDraft.offline || 0) : paidOffline)
                        ).toFixed(0)}
                      />
                    </div>
                  </div>
                  <div className="payment-done">
                    Payment done by: <span className="muted">Paid {formatMoney(isEditing ? Number(paymentDraft.online || 0) + Number(paymentDraft.offline || 0) : (invoiceDetail?.paidAmount || 0))} | Balance {formatMoney(Math.max(0, totals.total - (isEditing ? Number(paymentDraft.online || 0) + Number(paymentDraft.offline || 0) : (invoiceDetail?.paidAmount || 0))))}</span>
                  </div>
                </div>

                <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 14, border: "1px solid #dbeafe", background: "#f8fbff" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Message Configurations</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#334155", fontWeight: 600 }}>
                    <input type="checkbox" checked={messageConfig.invoiceMessage} onChange={(event) => setMessageConfig({ invoiceMessage: event.target.checked })} disabled={!isEditing} />
                    Invoice Message
                  </label>
                  <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
                    You can control the customer automation message here after updating the invoice.
                  </div>
                </div>

                <div className="pos-detail-bottom-actions">
                  <button className="btn-view-bill" onClick={() => { setIsEditing(false); closeDetail(); }}>Clear</button>
                  <button className="btn-view-bill" onClick={updateInvoice} disabled={!isEditing}>Update</button>
                  <button className="btn-clear" style={{ background: "white", color: "var(--accent, #3b82f6)", border: "1px solid var(--accent, #3b82f6)" }} onClick={() => { setIsEditing(false); setPaymentDraft({ online: "", offline: "" }); }}>Cancel Edit</button>
                  <button className="btn-view-bill" onClick={openBillPreview} disabled={billLoading}>{billLoading ? "Loading..." : "View Bill"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null}

      {reminderModal.open ? (
        <div className="premium-modal-overlay" onClick={() => setReminderModal({ open: false, index: -1, date: "", note: "" })} style={{ zIndex: 10010, background: "rgba(0,0,0,0.55)" }}>
          <div className="premium-modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <strong style={{ fontSize: 20 }}>Service Reminder</strong>
              <button type="button" onClick={() => setReminderModal({ open: false, index: -1, date: "", note: "" })} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Reminder Date</span>
                <input type="date" value={reminderModal.date} onChange={(event) => setReminderModal((current) => ({ ...current, date: event.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#334155" }}>Reminder Note</span>
                <textarea value={reminderModal.note} onChange={(event) => setReminderModal((current) => ({ ...current, note: event.target.value }))} rows={4} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", resize: "vertical" }} placeholder="e.g. Revisit after 30 days for touch-up" />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <button type="button" className="btn-clear" onClick={() => setReminderModal({ open: false, index: -1, date: "", note: "" })}>Cancel</button>
              <button type="button" className="btn-view-bill" onClick={saveReminder}>Save Reminder</button>
            </div>
          </div>
        </div>
      ) : null}

      {consumableModal.open ? (
        <div className="premium-modal-overlay" onClick={() => setConsumableModal({ open: false, index: -1, rows: [{ name: "", qty: 1, cost: 0 }] })} style={{ zIndex: 10010, background: "rgba(0,0,0,0.55)" }}>
          <div className="premium-modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 620, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <strong style={{ fontSize: 20 }}>Consumable Items</strong>
              <button type="button" onClick={() => setConsumableModal({ open: false, index: -1, rows: [{ name: "", qty: 1, cost: 0 }] })} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {consumableModal.rows.map((entry, entryIndex) => (
                <div key={entryIndex} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>Item Name</span>
                    <input type="text" value={entry.name} onChange={(event) => setConsumableModal((current) => ({ ...current, rows: current.rows.map((row, rowIndex) => rowIndex === entryIndex ? { ...row, name: event.target.value } : row) }))} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>Qty</span>
                    <input type="number" min="1" value={entry.qty} onChange={(event) => setConsumableModal((current) => ({ ...current, rows: current.rows.map((row, rowIndex) => rowIndex === entryIndex ? { ...row, qty: Number(event.target.value || 1) } : row) }))} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>Cost</span>
                    <input type="number" min="0" value={entry.cost} onChange={(event) => setConsumableModal((current) => ({ ...current, rows: current.rows.map((row, rowIndex) => rowIndex === entryIndex ? { ...row, cost: Number(event.target.value || 0) } : row) }))} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </label>
                  <button type="button" className="btn-clear" onClick={() => setConsumableModal((current) => ({ ...current, rows: current.rows.length === 1 ? [{ name: "", qty: 1, cost: 0 }] : current.rows.filter((_, rowIndex) => rowIndex !== entryIndex) }))}>Remove</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
              <button type="button" className="btn-clear" onClick={() => setConsumableModal((current) => ({ ...current, rows: [...current.rows, { name: "", qty: 1, cost: 0 }] }))}>Add Row</button>
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="btn-clear" onClick={() => setConsumableModal({ open: false, index: -1, rows: [{ name: "", qty: 1, cost: 0 }] })}>Cancel</button>
                <button type="button" className="btn-view-bill" onClick={saveConsumables}>Save Consumables</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      

      {/* ======= FULL ADD GIFTCARD MODAL ======= */}
      {showGcModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:10010, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowGcModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(95vw,900px)", maxHeight:"90vh", overflowY:"auto", boxShadow: "none", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:"1.2rem", color:"#0f172a" }}>Add Gift Card</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <input placeholder="Search For Card" value={gcSearch} onChange={e => setGcSearch(e.target.value)} style={{ padding:"8px 12px", paddingRight:32, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", width:220 }} />
                  <span style={{ position:"absolute", right:10, top:8, color:"#94a3b8" }}>🔍</span>
                </div>
                <button onClick={() => setShowGcModal(false)} style={{ background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"#94a3b8" }}>&#x2715;</button>
              </div>
            </div>
            
            <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:24, flex:1 }}>
              {/* GiftCard Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:16, maxHeight:300, overflowY:"auto", paddingRight:8 }}>
                 {(posContext.giftCards || []).filter(g => g.code?.toLowerCase().includes(gcSearch.toLowerCase()) || "gift card".includes(gcSearch.toLowerCase())).map(gc => {
                  const isSelected = gcModalGc?.id === gc.id;
                  const gcAmount = Number(gc.originalAmount || gc.balanceAmount || 0);
                  const gcValidity = gc.expiresAt ? Math.max(0, Math.ceil((new Date(gc.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 30;
                  return (
                    <div key={gc.id} onClick={() => {
                      setGcModalGc({ id: gc.id, name: gc.code || "Gift Card" });
                      setGcDraft({ staffId: "", price: String(gcAmount), validityDays: String(gcValidity || 30), purchaseDate: new Date().toISOString().slice(0,10) });
                    }} style={{ background: isSelected?"#fdf4ff":"#fdf4ff", border: isSelected?"2px solid #e879f9":"1px solid #fdf4ff", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ fontSize:"0.95rem", fontWeight:700, color: "var(--accent, #3b82f6)", marginBottom:8, textTransform:"uppercase" }}>{gc.code || "GIFT CARD"}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Fee: {formatMoney(gcAmount)}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:12 }}>Validity: {gcValidity} Days</div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Form */}
              <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:150 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Name</label>
                  <input readOnly value={gcModalGc ? gcModalGc.name : ""} placeholder="Enter Name" style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", background:"#f8fafc", color:"#94a3b8", boxSizing:"border-box" }} />
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Validity</label>
                  <input type="number" placeholder="Enter Validity" value={gcDraft.validityDays} onChange={e=>setGcDraft(d=>({...d,validityDays:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Card Activated From</label>
                  <input type="date" value={gcDraft.purchaseDate} onChange={e=>setGcDraft(d=>({...d,purchaseDate:e.target.value}))} max={new Date().toISOString().slice(0, 10)} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Purchase Amount</label>
                  <input type="number" placeholder="Enter Price" value={gcDraft.price} onChange={e=>setGcDraft(d=>({...d,price:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                </div>
                <div style={{ flex:1.2, minWidth:150 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Staff</label>
                  <select value={gcDraft.staffId} onChange={e=>setGcDraft(d=>({...d,staffId:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }}>
                    <option value="">Select Staff</option>
                    {(posContext.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowGcModal(false)} style={{ padding:"10px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
              <button onClick={handleAddGcToCart} disabled={!gcModalGc || !gcDraft.staffId} style={{ padding:"10px 24px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:(gcModalGc && gcDraft.staffId)?"pointer":"not-allowed", opacity:(gcModalGc && gcDraft.staffId)?1:0.6 }}>Add Gift Card</button>
            </div>
          </div>
        </div>
      )}

  {/* ======= FULL ADD PACKAGE MODAL ======= */}
      {showPkgModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.65)", zIndex:10010, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={() => setShowPkgModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(95vw,1000px)", maxHeight:"90vh", overflowY:"auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"20px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, background:"#fff", zIndex:10 }}>
              <div style={{ fontWeight:800, fontSize:"1.3rem", color:"#0f172a" }}>Add packages</div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ position:"relative" }}>
                  <input placeholder="Search For Package" value={pkgSearch} onChange={e => setPkgSearch(e.target.value)} style={{ padding:"10px 14px", paddingRight:36, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", width:240, outline:"none", transition:"border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                  <span style={{ position:"absolute", right:12, top:10, color:"#94a3b8" }}>🔍</span>
                </div>
                <button onClick={() => setShowPkgModal(false)} style={{ background:"#f1f5f9", border:"none", width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", cursor:"pointer", color:"#64748b", transition:"background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background="#f1f5f9"}>&#x2715;</button>
              </div>
            </div>
            
            <div style={{ padding:"28px", display:"flex", flexDirection:"column", gap:32, flex:1 }}>
              {/* Package Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:20, maxHeight:320, overflowY:"auto", paddingRight:8 }}>
                {(posContext.packages || []).filter(p => p.name.toLowerCase().includes(pkgSearch.toLowerCase())).map(pkg => {
                  const isSelected = pkgModalPkg?.id === pkg.id;
                  return (
                    <div key={pkg.id} onClick={() => {
                      setPkgModalPkg(pkg);
                      setPkgDraft({ staffId: "", price: String(pkg.price||0), validityDays: String(pkg.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10), customServices: (pkg.services||[]).map(s=>({id:s.service?.id||s.serviceId,name:s.service?.name, price: s.service?.salesPrice || s.service?.price || 0, qty:s.sessions||1})) });
                    }} style={{ background: isSelected?"#fdf4ff":"#ffffff", border: isSelected?"2px solid #e879f9":"1px solid #e2e8f0", borderRadius:12, padding:"20px", cursor:"pointer", transition:"all 0.2s", boxShadow: isSelected ? "0 4px 6px -1px rgba(232, 121, 249, 0.1)" : "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }} onMouseEnter={e => { if(!isSelected) e.currentTarget.style.borderColor="#cbd5e1" }} onMouseLeave={e => { if(!isSelected) e.currentTarget.style.borderColor="#e2e8f0" }}>
                      <div style={{ fontSize:"1.05rem", fontWeight:800, color:"#4a044e", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.5px" }}>{pkg.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #e2e8f0" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize:"0.75rem", color:"#64748b", textTransform:"uppercase", fontWeight:700 }}>Fee</span>
                          <span style={{ fontSize:"0.95rem", fontWeight:700, color:"#0f172a" }}>{formatMoney(Number(pkg.price||0))}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <span style={{ fontSize:"0.75rem", color:"#64748b", textTransform:"uppercase", fontWeight:700 }}>Validity</span>
                          <span style={{ fontSize:"0.95rem", fontWeight:700, color:"#0f172a" }}>{pkg.validityDays} Days</span>
                        </div>
                      </div>
                      <div style={{ fontSize:"0.8rem", fontWeight:700, color:"#475569", marginBottom:8, textTransform:"uppercase" }}>Included Services</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, flex: 1 }}>
                        {(pkg.services||[]).map((s,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems: "center", fontSize:"0.85rem", color:"#334155", background: "#f8fafc", padding: "6px 10px", borderRadius: 6 }}>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{s.service?.name}</span>
                            <span style={{ fontWeight:700, color: "#0f172a", background: "#e2e8f0", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem" }}>x{s.sessions||1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div onClick={() => {
                  setPkgModalPkg({ id: "CUSTOM", name: "CUSTOM PACKAGE" });
                  setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] });
                }} style={{ background: pkgModalPkg?.id==="CUSTOM"?"#eff6ff":"#f8fafc", border: pkgModalPkg?.id==="CUSTOM"?"2px solid #3b82f6":"1px dashed #cbd5e1", borderRadius:12, padding:20, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:200, transition:"all 0.2s" }} onMouseEnter={e => { if(pkgModalPkg?.id!=="CUSTOM") e.currentTarget.style.borderColor="#94a3b8" }} onMouseLeave={e => { if(pkgModalPkg?.id!=="CUSTOM") e.currentTarget.style.borderColor="#cbd5e1" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: pkgModalPkg?.id==="CUSTOM"?"#dbeafe":"#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: pkgModalPkg?.id==="CUSTOM"?"#2563eb":"#64748b", fontSize: "1.5rem" }}>+</div>
                  <div style={{ fontSize:"1.05rem", fontWeight:800, color:pkgModalPkg?.id==="CUSTOM"?"#2563eb":"#475569", textTransform:"uppercase", letterSpacing:"0.5px" }}>Create Custom</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 8, textAlign: "center" }}>Build a package from scratch</div>
                </div>
              </div>

              {/* Selected Services & Form */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                {/* Services List */}
                {pkgDraft.customServices.length > 0 && (
                  <div>
                    <div style={{ fontWeight:700, color:"#0f172a", fontSize:"1rem", marginBottom:12, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>Selected Services</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {pkgDraft.customServices.map((svc, idx) => (
                        <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", border:"1px solid #e2e8f0", borderRadius:10, background:"#f8fafc" }}>
                          <span style={{ fontSize:"0.95rem", color:"#0f172a", fontWeight:600 }}>{svc.name} <span style={{color:"#64748b", fontSize:"0.85rem", marginLeft:8, fontWeight: 500}}>({formatMoney(Number(svc.price||0) * Number(svc.qty||1))})</span></span>
                          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Qty</span>
                              <input type="number" min="1" value={svc.qty} onChange={e => { const n=[...pkgDraft.customServices]; n[idx]={...n[idx],qty:Number(e.target.value)}; const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d,customServices:n, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:70, padding:"8px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:"0.95rem", textAlign:"center", outline: "none" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                            </div>
                            <button onClick={() => { const n=pkgDraft.customServices.filter((_,i)=>i!==idx); const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d,customServices:n, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background:"#fee2e2", border:"none", borderRadius:6, cursor:"pointer", color:"#ef4444", fontWeight:700, fontSize: "1.1rem", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#fecaca"} onMouseLeave={e => e.currentTarget.style.background="#fee2e2"}>&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Services Search Bar */}
                <div style={{ display:"flex", flexDirection:"column", gap:8, background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <label style={{ fontWeight:700, color:"#334155", fontSize:"0.9rem" }}>Add Services to Package</label>
                  <div style={{ position:"relative" }}>
                    <input placeholder="Search Service By Category Or Name..." value={pkgServiceSearch} onChange={e => setPkgServiceSearch(e.target.value)} style={{ width:"100%", padding:"12px 16px", paddingRight:40, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                    <span style={{ position:"absolute", right:14, top:12, color:"#94a3b8", fontWeight:700 }}>🔍</span>
                    {pkgServiceSearch.trim() && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", marginTop:6, zIndex:20, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                        {(posContext.services || []).filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase())).map(svc => (
                          <div key={svc.id} onClick={() => { if(!pkgDraft.customServices.find(c=>c.id===svc.id)) { const newSvc = [...pkgDraft.customServices, {id:svc.id, name:svc.name, price: svc.salesPrice || svc.price || 0, qty:1}]; const newTotal = newSvc.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d, customServices: newSvc, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); } setPkgServiceSearch(""); }} style={{ padding:"12px 16px", cursor:"pointer", fontSize:"0.95rem", color:"#334155", borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.color="#0f172a"; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#334155"; }}>
                            {svc.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div style={{ display:"flex", gap:32, alignItems:"center", marginTop:12, padding:"20px 24px", background:"#f1f5f9", borderRadius:12, border: "1px dashed #cbd5e1" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color:"#475569", fontWeight:600, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: 4 }}>Total Service Value</div> 
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize: "1.2rem" }}>{formatMoney(pkgDraft.customServices.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0))}</div>
                  </div>
                  <div style={{ flex: 1, borderLeft: "2px solid #cbd5e1", paddingLeft: 32 }}>
                    <div style={{ color:"#3b82f6", fontWeight:800, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: 4 }}>Package Price</div> 
                    <div style={{ fontWeight:800, color:"#1d4ed8", fontSize: "1.5rem" }}>{formatMoney(Number(pkgDraft.price || pkgModalPkg?.price || 0))}</div>
                  </div>
                </div>

                {/* Staff, Purchase Date, Validity Days */}
                <div style={{ display:"flex", gap:20, alignItems:"flex-end", marginTop:16, flexWrap:"wrap" }}>
                  <div style={{ flex:1.5, minWidth:200 }}>
                    <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Assign Staff <span style={{color: "#ef4444"}}>*</span></label>
                    <select
                      value={pkgDraft.staffId}
                      onChange={e => setPkgDraft(d => ({ ...d, staffId: e.target.value }))}
                      style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", backgroundColor: "#fff", cursor: "pointer", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"}
                    >
                      <option value="">Select Staff</option>
                      {(posContext.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1, minWidth:160 }}>
                    <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Purchase Date</label>
                    <input
                      type="date"
                      value={pkgDraft.purchaseDate}
                      onChange={e => setPkgDraft(d => ({ ...d, purchaseDate: e.target.value }))}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"}
                    />
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Validity (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={pkgDraft.validityDays}
                      onChange={e => setPkgDraft(d => ({ ...d, validityDays: String(Math.max(1, Number(e.target.value) || 1)) }))}
                      style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }}
                      onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:"16px 28px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:16, background: "#f8fafc", borderRadius: "0 0 16px 16px" }}>
              <button onClick={() => setShowPkgModal(false)} style={{ padding:"12px 28px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:700, cursor:"pointer", color:"#475569", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.borderColor="#94a3b8"; }} onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#cbd5e1"; }}>Cancel</button>
              <button onClick={handleAddPkgToCart} disabled={!pkgModalPkg || !pkgDraft.staffId} style={{ padding:"12px 32px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:(pkgModalPkg && pkgDraft.staffId)?"pointer":"not-allowed", opacity:(pkgModalPkg && pkgDraft.staffId)?1:0.5, boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)", transition: "all 0.2s" }} onMouseEnter={e => { if(pkgModalPkg && pkgDraft.staffId) { e.currentTarget.style.background="#1d4ed8"; e.currentTarget.style.boxShadow="0 6px 8px -1px rgba(37, 99, 235, 0.3)"; } }} onMouseLeave={e => { if(pkgModalPkg && pkgDraft.staffId) { e.currentTarget.style.background="#2563eb"; e.currentTarget.style.boxShadow="0 4px 6px -1px rgba(37, 99, 235, 0.2)"; } }}>Add Package</button>
            </div>
          </div>
        </div>
      )}

      {/* ======= FULL ADD MEMBERSHIP MODAL ======= */}
      {showMemModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:10010, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowMemModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(95vw,900px)", maxHeight:"90vh", overflowY:"auto", boxShadow: "none", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:"1.2rem", color:"#0f172a" }}>Add membership</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <input placeholder="Search For Membership" value={memSearch} onChange={e => setMemSearch(e.target.value)} style={{ padding:"8px 12px", paddingRight:32, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", width:220 }} />
                  <span style={{ position:"absolute", right:10, top:8, color:"#94a3b8" }}>🔍</span>
                </div>
                <button onClick={() => setShowMemModal(false)} style={{ background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"#94a3b8" }}>&#x2715;</button>
              </div>
            </div>
            
            <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:24, flex:1 }}>
              {/* Membership Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:16, maxHeight:300, overflowY:"auto", paddingRight:8 }}>
                {(posContext.memberships || []).filter(m => m.name.toLowerCase().includes(memSearch.toLowerCase())).map(mem => {
                  const isSelected = memModalMem?.id === mem.id;
                  return (
                    <div key={mem.id} onClick={() => {
                      setMemModalMem(mem);
                      setMemDraft({ staffId: "", price: String(mem.price||mem.monthlyPrice||0), validityDays: String(mem.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10), customServices: (mem.services||[]).map(s=>({id:s.service?.id||s.serviceId,name:s.service?.name, price: s.service?.salesPrice || s.service?.price || 0, qty:1})) });
                    }} style={{ background: isSelected?"#eff6ff":"#f8fafc", border: isSelected?"2px solid #3b82f6":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#1e40af", marginBottom:8, textTransform:"uppercase" }}>{mem.name}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Fee: {formatMoney(Number(mem.price||mem.monthlyPrice||0))}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:12 }}>Validity: {mem.validityDays} Days</div>
                      {mem.rewardPointsMultiplier && <div style={{ fontSize:"0.8rem", color:"#059669", fontWeight:600 }}>Earn {mem.rewardPointsMultiplier}x Points</div>}
                      {mem.walletAmount > 0 && <div style={{ fontSize:"0.8rem", color:"#059669", fontWeight:600 }}>Wallet: {formatMoney(mem.walletAmount)}</div>}
                    </div>
                  );
                })}
              </div>

              {/* Selected Services & Form */}
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginTop:8 }}>
                {/* Services List exactly like screenshot */}
                {memDraft.customServices.length > 0 && (
                  <>
                    <div style={{ fontWeight:600, color:"#64748b", fontSize:"0.9rem", marginBottom:4 }}>Selected services</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {memDraft.customServices.map((svc, idx) => (
                        <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff" }}>
                          <span style={{ fontSize:"0.9rem", color:"#0f172a", fontWeight:500 }}>{svc.name}</span>
                          <span style={{ fontSize:"0.9rem", color:"#64748b" }}>Qty: {svc.qty}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* The Meta Form (Name, Validity, Price, Staff, Date) */}
                <div style={{ display:"flex", gap:16, alignItems:"flex-end", marginTop:16, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:150 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Name</label>
                    <input readOnly value={memModalMem ? (memModalMem.id==="CUSTOM" ? "CUSTOM" : memModalMem.name) : ""} placeholder="Select above" style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", background:"#f8fafc", color:"#94a3b8", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1, minWidth:120 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Validity</label>
                    <input type="number" placeholder="Enter Validity" value={memDraft.validityDays} onChange={e=>setMemDraft(d=>({...d,validityDays:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1, minWidth:120 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Price</label>
                    <input type="number" placeholder="Enter Price" value={memDraft.price} onChange={e=>setMemDraft(d=>({...d,price:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1.2, minWidth:150 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Staff</label>
                    <select value={memDraft.staffId} onChange={e=>setMemDraft(d=>({...d,staffId:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }}>
                      <option value="">Select Staff</option>
                      {(posContext.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Purchase date</label>
                    <input type="date" value={memDraft.purchaseDate} onChange={e=>setMemDraft(d=>({...d,purchaseDate:e.target.value}))} max={new Date().toISOString().slice(0, 10)} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowMemModal(false)} style={{ padding:"10px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
              <button onClick={handleAddMemToCart} disabled={!memModalMem || !memDraft.staffId} style={{ padding:"10px 24px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:(memModalMem && memDraft.staffId)?"pointer":"not-allowed", opacity:(memModalMem && memDraft.staffId)?1:0.6 }}>Add Membership</button>
            </div>
          </div>
        </div>
      )}

      {/* ======= APPLY DISCOUNT MODAL ======= */}
      {showDiscountModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDiscountModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 420px)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Discount:</strong>
              <button type="button" onClick={() => setShowDiscountModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>Fix</label>
                <input type="number" min="0" placeholder={formatMoney(0)} value={discountDraft.type === "FIX" ? discountDraft.value : ""} onFocus={() => setDiscountDraft(d => ({ ...d, type: "FIX" }))} onChange={e => setDiscountDraft(d => ({ ...d, value: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: discountDraft.type === "FIX" ? "2px solid #3b82f6" : "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingBottom: 4, fontWeight: 700, color: "#64748b" }}>OR</div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>Percentage</label>
                <input type="number" min="0" max="100" placeholder="%" value={discountDraft.type === "PERCENT" ? discountDraft.value : ""} onFocus={() => setDiscountDraft(d => ({ ...d, type: "PERCENT" }))} onChange={e => setDiscountDraft(d => ({ ...d, value: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: discountDraft.type === "PERCENT" ? "2px solid #3b82f6" : "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }} />
              </div>
            </div>
            <button type="button" onClick={confirmDiscount} style={{ width: "100%", padding: "12px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>Apply</button>
          </div>
        </div>
      )}

      {/* ======= APPLY PACKAGE MODAL ======= */}
      {showApplyPkgModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowApplyPkgModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 560px)", maxHeight: "85vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Apply Packages</strong>
              <button type="button" onClick={() => setShowApplyPkgModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
            </div>
            {customerPackages.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No active packages found for this customer.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {customerPackages.map((cp) => (
                  <div key={cp.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "1rem" }}>{cp.package?.name || "CUSTOM"}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Valid Till: {cp.endsAt ? new Date(cp.endsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</div>
                    </div>
                    <div style={{ padding: "8px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#334155", marginBottom: 8 }}>Services:</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ textAlign: "left", padding: "6px 0", color: "#475569" }}>Name</th>
                            <th style={{ textAlign: "right", padding: "6px 0", color: "#475569" }}>Avl</th>
                            <th style={{ textAlign: "right", padding: "6px 0", color: "#475569" }}>Used</th>
                            <th style={{ textAlign: "right", padding: "6px 0" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(cp.services || []).map((svc, idx) => {
                            const available = (svc.sessions || 0) - (svc.sessionsUsed || 0);
                            const isInCart = form.items.some(item => item.serviceId === svc.serviceId && Number(item.unitPrice || 0) > 0);
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 0", color: isInCart ? "#16a34a" : "#0f172a" }}>{svc.service?.name || svc.serviceId}</td>
                                <td style={{ padding: "8px 0", textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{available}</td>
                                <td style={{ padding: "8px 0", textAlign: "right", color: "#64748b" }}>{svc.sessionsUsed || 0}</td>
                                <td style={{ padding: "8px 0", textAlign: "right" }}>
                                  {available > 0 && isInCart && (
                                    <button type="button" onClick={() => applyPackageService(cp, svc)} style={{ padding: "4px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" }}>Apply</button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======= APPLY GIFT CARD MODAL ======= */}
      {showApplyGcModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowApplyGcModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 440px)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Apply Gift Card</strong>
              <button type="button" onClick={() => setShowApplyGcModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
            </div>
            <div style={{ textAlign: "center", marginBottom: 16, color: "#475569" }}>Enter gift card number</div>
            <input type="text" value={gcRedemptionCode} onChange={e => setGcRedemptionCode(e.target.value)} placeholder="Gift card code" style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "1rem", boxSizing: "border-box", marginBottom: 16, textAlign: "center", letterSpacing: 2 }} />
            {gcRedemptionResult && (
              <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: "#166534" }}>Gift Card Found</div>
                <div style={{ color: "#15803d", fontSize: "0.9rem" }}>Balance: {formatMoney(Number(gcRedemptionResult.balanceAmount || 0))}</div>
                <div style={{ color: "#15803d", fontSize: "0.85rem" }}>Expires: {gcRedemptionResult.expiresAt ? new Date(gcRedemptionResult.expiresAt).toLocaleDateString("en-GB") : "No expiry"}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowApplyGcModal(false); setGcRedemptionCode(""); setGcRedemptionResult(null); }} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Close</button>
              {gcRedemptionResult ? (
                <button type="button" onClick={applyGiftCard} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Apply</button>
              ) : (
                <button type="button" onClick={validateGiftCard} disabled={gcRedemptionLoading || !gcRedemptionCode.trim()} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: gcRedemptionLoading || !gcRedemptionCode.trim() ? "not-allowed" : "pointer", opacity: gcRedemptionLoading || !gcRedemptionCode.trim() ? 0.6 : 1 }}>{gcRedemptionLoading ? "Validating..." : "Validate & Apply"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======= ADD TIP MODAL ======= */}
      {showTipModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTipModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 560px)", maxHeight: "85vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Tip</strong>
              <button type="button" onClick={() => setShowTipModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tipEntries.map((entry, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <span style={{ color: "#64748b" }}>{idx + 1})</span>
                  <span style={{ flex: 1, fontWeight: 600, color: "#0f172a" }}>{entry.staffName || (posContext.staffUsers || []).find(s => s.id === entry.staffId)?.user?.name || "Staff"}</span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>{formatMoney(Number(entry.amount))}</span>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{entry.paymentMode}</span>
                  <button type="button" onClick={() => removeTipEntry(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={16} /></button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end", padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Staff</span>
                  <select value={tipDraft.staffId} onChange={e => setTipDraft(d => ({ ...d, staffId: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem" }}>
                    <option value="">Select staff</option>
                    {(posContext.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Amount</span>
                  <input type="number" min="0" value={tipDraft.amount} onChange={e => setTipDraft(d => ({ ...d, amount: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem" }} />
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Payment</span>
                  <select value={tipDraft.paymentMode} onChange={e => setTipDraft(d => ({ ...d, paymentMode: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem" }}>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </label>
                <button type="button" onClick={addTipEntry} style={{ padding: "8px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}>Add</button>
              </div>

            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => setShowTipModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button type="button" onClick={confirmTips} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {billInvoice ? (
        <PosReceipt
          invoice={billInvoice}
          salonName={salonName}
          salonAddress={salonAddress}
          salonPhone={salonPhone}
          currencyCode={currencyCode}
          onClose={() => setBillInvoice(null)}
          onPrint={() => window.print()}
          onDownload={downloadBill}
        />
      ) : null}
    </div>
  );
}
