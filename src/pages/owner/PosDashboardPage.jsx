import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock3, Download, FileText, Gift, ScissorsLineDashed, TicketPercent, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import PosReceipt from "../../components/PosReceipt";
import { useAuth } from "../../context/AuthContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { downloadFromApi } from "../../utils/download";
import { formatApiError } from "../../utils/apiError";
import "./PosDashboard.css";
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
          membershipId: mem.id !== "CUSTOM" ? mem.id : null,
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
      const [contextResponse, categoryResponse, settingsResponse] = await Promise.all([
        api.get("/owner/pos/context"),
        api.get("/owner/service-categories"),
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
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = { startDate, endDate };
      if (statusFilter) queryParams.status = statusFilter;

      const [invoiceResponse, summaryResponse] = await Promise.all([
        api.get("/owner/invoices", { params: queryParams }),
        api.get("/owner/invoices/reports/summary", { params: { startDate, endDate } })
      ]);

      setRows(invoiceResponse.data || []);
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
  }, [endDate, loadInvoiceDetail, params.id, startDate, statusFilter]);

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
  const salonName = auth?.membership?.salon?.name || auth?.membership?.salonName || "Skillify Salon";
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
    await downloadFromApi(`/owner/invoices/${invoiceId}/pdf`, {
      fallbackFilename: `invoice-${invoiceNumber || invoiceId}.pdf`
    });
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
    const currentValue = String(toAmount(invoiceDiscountDraft, 0));
    const nextValue = window.prompt("Enter invoice discount amount", currentValue);
    if (nextValue === null) return;
    const parsed = Math.max(0, toAmount(nextValue, 0));
    setInvoiceDiscountDraft(parsed);
    setStatus({ error: "", success: `Invoice discount set to ${formatMoney(parsed)}.` });
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
        sendInvoiceMessage: messageConfig.invoiceMessage,
        items: form.items.map((item) => ({
          id: item.id,
          itemType: item.itemType || (item.productId ? "PRODUCT" : "SERVICE"),
          serviceId: item.serviceId || null,
          productId: item.productId || null,
          membershipPlanId: item.membershipPlanId || null,
          packageId: item.packageId || null,
          serviceName: item.serviceName || item.productName || item.name || "Item",
          staffUserId: item.staffUserSalonId || item.staffUserId || null,
          staffName: item.staffName || null,
          qty: Number(item.qty || 1),
          unitPrice: Number(item.unitPrice || 0),
          discountPct: Number(item.discountPct || 0),
          discountAmt: Number(item.discountAmt || 0),
          taxPct: Number(item.taxPct || 0),
          tipAmount: Number(item.tipAmount || 0)
        }))
      });

      await load();
      await loadInvoiceDetail(invoiceId);
      setIsEditing(false);
      setPaymentDraft({ online: "", offline: "" });
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
    <div className="respark-pos-dashboard">
      <div className="pos-dash-header">
        <div className="pos-dash-header-left">
          <div className="pos-dash-date-picker" style={{ display: "flex", gap: "8px", alignItems: "center", background: "white", padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={{ border: "none", outline: "none", background: "transparent" }} />
            <span style={{ color: "#64748b" }}>-</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={{ border: "none", outline: "none", background: "transparent" }} />
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

            <div className="pos-detail-split-pane">
              <div className="pos-detail-left" style={{ opacity: isEditing ? 1 : 0.6, pointerEvents: isEditing ? "auto" : "none" }}>
                <div className="pos-detail-tabs">
                  <button className={posGender === "FEMALE" ? "active" : ""} onClick={() => setPosGender("FEMALE")}>Female</button>
                  <button className={posGender === "MALE" ? "active" : ""} onClick={() => setPosGender("MALE")}>Male</button>
                  <div className="pos-detail-search">
                    <input type="text" placeholder="Search Service" value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} />
                  </div>
                </div>

                <div className="pos-detail-cat-grid">
                  {(() => {
                    const catColors = [
                      { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", border: "#2563eb" },
                      { bg: "linear-gradient(135deg, #10b981, #059669)", border: "#059669" },
                      { bg: "linear-gradient(135deg, #f472b6, #db2777)", border: "#db2777" },
                      { bg: "linear-gradient(135deg, #a78bfa, #7c3aed)", border: "#7c3aed" },
                      { bg: "linear-gradient(135deg, #fb923c, #ea580c)", border: "#ea580c" },
                      { bg: "linear-gradient(135deg, #facc15, #ca8a04)", border: "#ca8a04" },
                    ];
                    const allActive = !serviceCategoryFilter;
                    const allStyle = allActive ? { background: catColors[0].bg, borderColor: catColors[0].border, color: "#fff" } : {};
                    return (
                      <>
                        <button className={allActive ? "active" : ""} style={!allActive ? { background: "#fff", border: "1px solid #cdd9ea", color: "#334155" } : allStyle} onClick={() => setServiceCategoryFilter("")}>ALL</button>
                        {(posContext.serviceCategories || []).slice(0, 6).map((category, idx) => {
                          const isActive = serviceCategoryFilter === category.name;
                          const c = catColors[(idx + 1) % catColors.length];
                          return (
                            <button key={category.id} className={isActive ? "active" : ""} style={isActive ? { background: c.bg, borderColor: c.border, color: "#fff" } : { background: "#fff", border: "1px solid #cdd9ea", color: "#334155" }} onClick={() => setServiceCategoryFilter(category.name)}>
                              {category.name}
                            </button>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                <div className="pos-detail-cat-list">
                  {posTab === "products" ? (
                    productTileGroups.length > 0 ? (
                      productTileGroups.map((group) => (
                        <div key={group.title}>
                          <div className="pos-detail-cat-title">{group.title}</div>
                          <div className="pos-detail-cat-grid" style={{ gridTemplateColumns: "1fr", gap: "8px", margin: "10px 0" }}>
                            {group.items.map((product) => (
                              <div key={product.id} className="pos-detail-mock-card" onClick={() => addQuickProduct(product)}>
                                <span>{product.name}</span>
                                <span className="pos-detail-mock-card-price"><span className="green">{product.sellingPrice || product.price || 0}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>No products found.</div>
                    )
                  ) : (
                    serviceTileGroups.length > 0 ? (
                      serviceTileGroups.map((group) => (
                        <div key={group.title}>
                          <div className="pos-detail-cat-title">{group.title}</div>
                          <div className="pos-detail-cat-grid" style={{ gridTemplateColumns: "1fr", gap: "8px", margin: "10px 0" }}>
                            {group.items.map((service) => (
                              <div key={service.id} className="pos-detail-mock-card" onClick={() => addQuickService(service)}>
                                <span>{service.name}</span>
                                <span className="pos-detail-mock-card-price"><span className="green">{service.salesPrice || service.price}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>No services found.</div>
                    )
                  )}
                </div>
              </div>

              <div className="pos-detail-right">
                <div className="pos-detail-top-tabs">
                  <button className={posTab === "billing" ? "active" : ""} onClick={() => setPosTab("billing")}>Add Service</button>
                  <button className={posTab === "products" ? "active" : ""} onClick={() => setPosTab("products")}>Add Product</button>
                  <button type="button" onClick={() => { setPkgModalPkg(null); setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] }); setShowPkgModal(true); }}>Add Package</button>
                  <button type="button" onClick={() => { setGcModalGc(null); setGcDraft({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0,10) }); setShowGcModal(true); }}>Add GiftCard</button>
                  <button type="button" onClick={() => { setMemModalMem(null); setMemDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] }); setShowMemModal(true); }}>Add Membership</button>
                </div>

                <div className="pos-detail-invoice-header" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <strong>Invoice</strong>
                  <span>{new Date(invoiceDetail?.createdAt || detail.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "12px", marginBottom: "12px" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><strong>Guest :</strong> <span style={{ flex: 1, borderBottom: '1px solid #e2e8f0', padding: '2px 4px' }}>{detail.customer?.name || "Walk-in"}</span></div>
                  <div><strong>DOB :</strong> NA</div>
                  <div><strong>Last Visited :</strong> NA</div>
                  <div><strong>Membership:</strong> NA</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><strong>Phone :</strong> <span style={{ flex: 1, borderBottom: '1px solid #e2e8f0', padding: '2px 4px' }}>{detail.customer?.phone || ""}</span></div>
                  <div><strong>Anniv :</strong> NA</div>
                  <div><strong>Due Bal :</strong> NA</div>
                  <div><strong>Package:</strong> NA</div>
                </div>

                {status.error || status.success ? (
                  <div style={{ margin: "12px 0", padding: "10px 12px", borderRadius: 10, background: status.error ? "#fee2e2" : "#dcfce7", color: status.error ? "#991b1b" : "#166534", fontWeight: 600 }}>
                    {status.error || status.success}
                  </div>
                ) : null}

                <div className="pos-detail-cart-table">
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
                  <button className="pos-btn-action" type="button">Apply Gift Card</button>
                  <button className="pos-btn-action" type="button">Add Tip</button>
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
                    Invoice update ke baad customer automation message ko yahin se control kar sakte ho.
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
                  return (
                    <div key={gc.id} onClick={() => {
                      setGcModalGc({ id: gc.id, name: gc.code || "Gift Card" });
                      setGcDraft({ staffId: "", price: String(gc.amount||0), validityDays: String(gc.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10) });
                    }} style={{ background: isSelected?"#fdf4ff":"#fdf4ff", border: isSelected?"2px solid #e879f9":"1px solid #fdf4ff", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ fontSize:"0.95rem", fontWeight:700, color: "var(--accent, #3b82f6)", marginBottom:8, textTransform:"uppercase" }}>{gc.code || "GIFT CARD"}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Fee: {formatMoney(Number(gc.amount||0))}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:12 }}>Validity: {gc.validityDays || 30} Days</div>
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
                  <input type="date" value={gcDraft.purchaseDate} onChange={e=>setGcDraft(d=>({...d,purchaseDate:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
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
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:10010, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowPkgModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(95vw,900px)", maxHeight:"90vh", overflowY:"auto", boxShadow: "none", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:"1.2rem", color:"#0f172a" }}>Add packages</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ position:"relative" }}>
                  <input placeholder="Search For Package" value={pkgSearch} onChange={e => setPkgSearch(e.target.value)} style={{ padding:"8px 12px", paddingRight:32, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", width:220 }} />
                  <span style={{ position:"absolute", right:10, top:8, color:"#94a3b8" }}>🔍</span>
                </div>
                <button onClick={() => setShowPkgModal(false)} style={{ background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"#94a3b8" }}>&#x2715;</button>
              </div>
            </div>
            
            <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:24, flex:1 }}>
              {/* Package Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(250px, 1fr))", gap:16, maxHeight:300, overflowY:"auto", paddingRight:8 }}>
                {(posContext.packages || []).filter(p => p.name.toLowerCase().includes(pkgSearch.toLowerCase())).map(pkg => {
                  const isSelected = pkgModalPkg?.id === pkg.id;
                  return (
                    <div key={pkg.id} onClick={() => {
                      setPkgModalPkg(pkg);
                      setPkgDraft({ staffId: "", price: String(pkg.price||0), validityDays: String(pkg.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10), customServices: (pkg.services||[]).map(s=>({id:s.service?.id||s.serviceId,name:s.service?.name, price: s.service?.salesPrice || s.service?.price || 0, qty:s.sessions||1})) });
                    }} style={{ background: isSelected?"#fdf4ff":"#f8fafc", border: isSelected?"2px solid #e879f9":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#4a044e", marginBottom:8, textTransform:"uppercase" }}>{pkg.name}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Fee: {formatMoney(Number(pkg.price||0))}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:12 }}>Validity: {pkg.validityDays} Days</div>
                      <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#0f172a", marginBottom:4 }}>Services:</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {(pkg.services||[]).map((s,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.8rem", color:"#475569" }}>
                            <span>{s.service?.name}</span>
                            <span style={{ fontWeight:600 }}>{s.sessions||1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div onClick={() => {
                  setPkgModalPkg({ id: "CUSTOM", name: "CUSTOM PACKAGE" });
                  setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] });
                }} style={{ background: pkgModalPkg?.id==="CUSTOM"?"#eff6ff":"#f8fafc", border: pkgModalPkg?.id==="CUSTOM"?"2px solid #3b82f6":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minHeight:150, transition:"all 0.2s" }}>
                  <div style={{ fontSize:"1rem", fontWeight:700, color:"#2563eb", textTransform:"uppercase" }}>CUSTOM PACKAGE</div>
                </div>
              </div>

              {/* Selected Services & Form */}
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginTop:8 }}>
                {/* Services List exactly like screenshot */}
                <div style={{ fontWeight:600, color:"#64748b", fontSize:"0.9rem", marginBottom:4 }}>Selected services</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {pkgDraft.customServices.map((svc, idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff" }}>
                      <span style={{ fontSize:"0.9rem", color:"#0f172a", fontWeight:500 }}>{svc.name} <span style={{color:"#64748b", fontSize:"0.8rem", marginLeft:8}}>({formatMoney(Number(svc.price||0) * Number(svc.qty||1))})</span></span>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <input type="number" min="1" value={svc.qty} onChange={e => { const n=[...pkgDraft.customServices]; n[idx]={...n[idx],qty:Number(e.target.value)}; const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d,customServices:n, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:60, padding:"8px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:"0.9rem", textAlign:"center" }} />
                        <button onClick={() => { const n=pkgDraft.customServices.filter((_,i)=>i!==idx); const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d,customServices:n, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background:"#fff", border:"1px solid #cbd5e1", borderRadius:6, cursor:"pointer", color:"#0f172a", fontWeight:600 }}>X</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Services Search Bar */}
                <div style={{ display:"flex", alignItems:"center", marginTop:8, gap:16 }}>
                  <div style={{ fontWeight:600, color:"#64748b", fontSize:"0.9rem", minWidth:100 }}>Add services</div>
                  <div style={{ position:"relative", flex:1, maxWidth:400 }}>
                    <input placeholder="Search Service By Category Or Name" value={pkgServiceSearch} onChange={e => setPkgServiceSearch(e.target.value)} style={{ width:"100%", padding:"10px 14px", paddingRight:36, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                    <span style={{ position:"absolute", right:12, top:10, color:"#000", fontWeight:700 }}>🔍</span>
                    {pkgServiceSearch.trim() && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", marginTop:4, zIndex:10, boxShadow: "none" }}>
                        {(posContext.services || []).filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase())).map(svc => (
                          <div key={svc.id} onClick={() => { if(!pkgDraft.customServices.find(c=>c.id===svc.id)) { const newSvc = [...pkgDraft.customServices, {id:svc.id, name:svc.name, price: svc.salesPrice || svc.price || 0, qty:1}]; const newTotal = newSvc.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d, customServices: newSvc, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); } setPkgServiceSearch(""); }} style={{ padding:"10px 16px", cursor:"pointer", fontSize:"0.9rem", color:"#334155", borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                            {svc.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* The Meta Form (Name, Validity, Price, Staff, Date) */}
                <div style={{ display:"flex", gap:16, alignItems:"flex-end", marginTop:16, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:150 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Name</label>
                    <input readOnly value={pkgModalPkg ? (pkgModalPkg.id==="CUSTOM" ? "CUSTOM" : pkgModalPkg.name) : ""} placeholder="Select above" style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", background:"#f8fafc", color:"#94a3b8", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1, minWidth:120 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Validity</label>
                    <input type="number" placeholder="Enter Validity" value={pkgDraft.validityDays} onChange={e=>setPkgDraft(d=>({...d,validityDays:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1, minWidth:120 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Price</label>
                    <input type="number" placeholder="Enter Price" value={pkgDraft.price} onChange={e=>setPkgDraft(d=>({...d,price:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ flex:1.2, minWidth:150 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Staff</label>
                    <select value={pkgDraft.staffId} onChange={e=>setPkgDraft(d=>({...d,staffId:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }}>
                      <option value="">Select Staff</option>
                      {(posContext.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Purchase date</label>
                    <input type="date" value={pkgDraft.purchaseDate} onChange={e=>setPkgDraft(d=>({...d,purchaseDate:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => setShowPkgModal(false)} style={{ padding:"10px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
              <button onClick={handleAddPkgToCart} disabled={!pkgModalPkg || !pkgDraft.staffId} style={{ padding:"10px 24px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:(pkgModalPkg && pkgDraft.staffId)?"pointer":"not-allowed", opacity:(pkgModalPkg && pkgDraft.staffId)?1:0.6 }}>Add Package</button>
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
                    <input type="date" value={memDraft.purchaseDate} onChange={e=>setMemDraft(d=>({...d,purchaseDate:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
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
