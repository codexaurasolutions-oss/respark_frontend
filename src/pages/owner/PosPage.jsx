import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFromApi } from "../../utils/download";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import './PosPage.css';

const emptyServiceItem = { itemType: "SERVICE", serviceId: "", staffUserId: "", qty: 1, taxPct: 0, consumableItems: [] };
const emptyProductItem = { itemType: "PRODUCT", productId: "", qty: 1, taxPct: 0, batchNumber: "" };
const emptyMembershipItem = { itemType: "MEMBERSHIP", membershipPlanId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyPackageItem = { itemType: "PACKAGE", packageId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyPayment = { mode: "CASH", amount: 0, note: "" };
const emptyRedemption = { customerPackageId: "", serviceId: "", sessionsUsed: 1, note: "" };

const normalizeGender = (value = "") => String(value || "").trim().toLowerCase();
const normalizeCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const normalizeProductCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const genderMatches = (serviceGender, selectedGender) => {
  if (selectedGender === "ALL") return true;
  const gender = normalizeGender(serviceGender);
  const selected = normalizeGender(selectedGender);
  return !gender || gender === "both" || gender === "unisex" || gender === selected;
};

export default function PosPage() {
  const { formatMoney } = useSalonSettings();
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [tab, setTab] = useState("billing");
  const [context, setContext] = useState({ customers: [], branches: [], services: [], staffUsers: [], products: [], memberships: [], packages: [], coupons: [], giftCards: [], customerProfile: null, settings: null });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [result, setResult] = useState(null);
  const [dayClosing, setDayClosing] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestSearchInput, setGuestSearchInput] = useState("");
  const [posGender, setPosGender] = useState("ALL");
  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [membershipSearch, setMembershipSearch] = useState("");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [paymentLinkForm, setPaymentLinkForm] = useState({ gatewayName: "RAZORPAY_PLACEHOLDER", expiresAt: "", note: "" });
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  
  const [showGcModal, setShowGcModal] = useState(false);
  const [gcModalGc, setGcModalGc] = useState(null);
  const [gcDraft, setGcDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10) });
  const [gcSearch, setGcSearch] = useState("");

  const [showPkgModal, setShowPkgModal] = useState(false);
  const [pkgModalPkg, setPkgModalPkg] = useState(null);
  const [pkgDraft, setPkgDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [] });
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgServiceSearch, setPkgServiceSearch] = useState("");
  const [showMemModal, setShowMemModal] = useState(false);
  const [memModalMem, setMemModalMem] = useState(null);
  const [memDraft, setMemDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [] });
  const [memSearch, setMemSearch] = useState("");
  const [memServiceSearch, setMemServiceSearch] = useState("");
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [consumableItemIndex, setConsumableItemIndex] = useState(null);
  const [consumableItems, setConsumableItems] = useState([]);
  const [consumableSearch, setConsumableSearch] = useState("");

  const [newGuestForm, setNewGuestForm] = useState({ name: "", phone: "", email: "", gender: "FEMALE", alternatePhone: "", dateOfBirth: "", anniversary: "", gst: "", notes: "" });
  const [form, setForm] = useState({
    customerId: "",
    branchId: "",
    appliedMembershipId: "",
    discount: 0,
    tax: 0,
    couponCode: "",
    giftVoucherCode: "",
    loyaltyPointsUsed: 0,
    notes: "",
    items: [emptyServiceItem],
    packageRedemptions: [],
    payments: [emptyPayment],
    sendFeedbackMessage: true,
    sendInvoiceMessage: true
  });

  const applyContext = useCallback((contextResponse, closingResponse, catRes, customerId, branchId) => {
    const branches = contextResponse?.data?.branches || [];
    const defaultBranch = branches.find(b => b.name.toLowerCase().includes("main")) || branches[0];

    setContext({ ...(contextResponse?.data || {}), serviceCategories: catRes?.data || [] });
    setDayClosing(closingResponse?.data || null);
    setForm((current) => ({
      ...current,
      customerId: customerId ?? current.customerId,
      branchId: current.branchId || branchId || defaultBranch?.id || ""
    }));
    setLoading(false);
  }, []);

  const openConsumableModal = (itemIndex) => {
    setConsumableItemIndex(itemIndex);
    setConsumableItems(form.items[itemIndex]?.consumableItems || []);
    setConsumableSearch("");
    setShowConsumableModal(true);
  };

  const addConsumableProduct = (product) => {
    setConsumableItems(prev => [...prev, { productId: product.id, name: product.name, qty: 1, unit: product.unit || "pcs" }]);
    setConsumableSearch("");
  };

  const updateConsumableItem = (ciIndex, patch) => {
    setConsumableItems(prev => prev.map((ci, i) => i === ciIndex ? { ...ci, ...patch } : ci));
  };

  const removeConsumableItem = (ciIndex) => {
    setConsumableItems(prev => prev.filter((_, i) => i !== ciIndex));
  };

  const saveConsumableItems = () => {
    if (consumableItemIndex == null) return;
    updateItem(consumableItemIndex, { consumableItems });
    setShowConsumableModal(false);
  };

  const loadContext = useCallback(async (customerId = form.customerId, branchId = form.branchId) => {
    setLoading(true);
    try {
      const params = {};
      if (customerId) params.customerId = customerId;
      if (branchId) params.branchId = branchId;
      const [contextResponse, closingResponse, catRes] = await Promise.all([
        api.get("/owner/pos/context", { params }),
        api.get("/owner/pos/day-closing", { params: branchId ? { branchId } : {} }),
        api.get("/owner/service-categories")
      ]);
      applyContext(contextResponse, closingResponse, catRes, customerId, branchId);
      setStatus((current) => ({ ...current, error: "" }));
    } catch (error) {
      setLoading(false);
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not load POS workspace") }));
    }
  }, [applyContext, form.branchId, form.customerId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = {};
        if (form.customerId) params.customerId = form.customerId;
        if (form.branchId) params.branchId = form.branchId;
        const [contextResponse, closingResponse, catRes] = await Promise.all([
          api.get("/owner/pos/context", { params }),
          api.get("/owner/pos/day-closing", { params: form.branchId ? { branchId: form.branchId } : {} }),
          api.get("/owner/service-categories")
        ]);
        if (!active) return;
        applyContext(contextResponse, closingResponse, catRes, form.customerId, form.branchId);
        setStatus((current) => ({ ...current, error: "" }));
      } catch (error) {
        if (!active) return;
        setLoading(false);
        setStatus((current) => ({ ...current, error: formatApiError(error, "Could not load POS workspace") }));
      }
    })();
    return () => {
      active = false;
    };
  }, [applyContext, form.branchId, form.customerId]);

  useEffect(() => {
    if (tab !== "products") {
      setProductCategoryFilter("");
      setProductSearch("");
    }
    if (tab !== "billing") {
      setServiceCategoryFilter("");
      setServiceSearch("");
    }
    if (tab !== "packages") {
      setPackageSearch("");
    }
    if (tab !== "memberships") {
      setMembershipSearch("");
    }
  }, [tab]);

  const serviceLookup = useMemo(() => Object.fromEntries((context.services || []).map((service) => [service.id, service])), [context.services]);
  const productLookup = useMemo(() => Object.fromEntries((context.products || []).map((product) => [product.id, product])), [context.products]);
  const membershipLookup = useMemo(() => Object.fromEntries((context.memberships || []).map((m) => [m.id, m])), [context.memberships]);
  const packageLookup = useMemo(() => Object.fromEntries((context.packages || []).map((p) => [p.id, p])), [context.packages]);
  const selectedCoupon = useMemo(() => (context.coupons || []).find((coupon) => coupon.code === form.couponCode) || null, [context.coupons, form.couponCode]);
  const selectedGiftCard = useMemo(() => (context.giftCards || []).find((giftCard) => giftCard.code === form.giftVoucherCode) || null, [context.giftCards, form.giftVoucherCode]);

  useEffect(() => {
    if (context.branches?.length && !form.branchId) {
      const defaultBranch = context.branches.find(b => b.name.toLowerCase().includes("main")) || context.branches[0];
      setForm(f => ({ ...f, branchId: defaultBranch.id }));
    }
  }, [context.branches, form.branchId]);

  const serviceCategories = useMemo(() => {
    if (!context.serviceCategories) return [];
    return context.serviceCategories;
  }, [context.serviceCategories]);

  const serviceTileGroups = useMemo(() => {
    let list = context.services || [];
    if (posGender) {
      list = list.filter(s => genderMatches(s.gender, posGender));
    }
    if (serviceSearch) {
      list = list.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    }
    if (serviceCategoryFilter) {
      list = list.filter(s => normalizeCategoryId(s) === serviceCategoryFilter);
    }
    const grouped = {};
    list.forEach(s => {
      const cat = s.category?.name || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return Object.entries(grouped).map(([title, items]) => ({ title, items }));
  }, [context.services, posGender, serviceSearch, serviceCategoryFilter]);

  const productCategories = useMemo(() => {
    const cats = new Map();
    (context.products || []).forEach(p => {
      const key = normalizeProductCategoryId(p);
      if (!key) return;
      cats.set(key, p.category?.id ? p.category : { id: key, name: p.category?.name || key });
    });
    return Array.from(cats.values());
  }, [context.products]);

  const productTileGroups = useMemo(() => {
    let list = context.products || [];
    if (productSearch) {
      list = list.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }
    if (productCategoryFilter) {
      list = list.filter(p => normalizeProductCategoryId(p) === productCategoryFilter);
    }
    const grouped = {};
    list.forEach(p => {
      const cat = p.category?.name || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return Object.entries(grouped).map(([title, items]) => ({ title, items }));
  }, [context.products, productSearch, productCategoryFilter]);

  const membershipTileGroups = useMemo(() => {
    let items = context.memberships || [];
    if (membershipSearch) {
      items = items.filter(m => m.name.toLowerCase().includes(membershipSearch.toLowerCase()));
    }
    return items.length ? [{ title: "Memberships", items }] : [];
  }, [context.memberships, membershipSearch]);

  const packageTileGroups = useMemo(() => {
    let items = context.packages || [];
    if (packageSearch) {
      items = items.filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase()));
    }
    return items.length ? [{ title: "Packages", items }] : [];
  }, [context.packages, packageSearch]);

  const addQuickService = (service) => {
    const matchingStaff = (context.staffUsers || []).find((staffUser) => {
      if (form.branchId && staffUser.branchId && staffUser.branchId !== form.branchId) return false;
      const assignedServiceIds = (staffUser.serviceAssignments || []).map((assignment) => assignment.serviceId);
      return assignedServiceIds.length === 0 || assignedServiceIds.includes(service.id);
    });
    setForm(c => {
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
      const next = { ...c };
      next.items = [
        ...activeItems,
        {
          ...emptyServiceItem,
          serviceId: service.id,
          staffUserId: matchingStaff?.id || "",
          unitPrice: toAmount(service.price),
          originalUnitPrice: toAmount(service.price),
          discountPct: 0,
          discountAmt: 0,
          taxPct: service.taxPct || service.taxRate || 0
        }
      ];
      return next;
    });
  };

  const addQuickProduct = (product) => {
    setForm(c => {
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
      const next = { ...c };
      next.items = [...activeItems, {
        ...emptyProductItem,
        productId: product.id,
        unitPrice: toAmount(product.sellingPrice),
        originalUnitPrice: toAmount(product.sellingPrice),
        discountPct: 0,
        discountAmt: 0,
        taxPct: product.taxPct || product.taxRate || 0
      }];
      return next;
    });
  };
  
    const addQuickMembership = (m) => {
    setMemModalMem(m);
    setMemDraft({
      staffId: "",
      price: String(m.price || ""),
      validityDays: String(m.validityDays || "30"),
      purchaseDate: new Date().toISOString().slice(0, 10),
      customServices: (m.services || []).map(s => ({ id: s.service?.id || s.serviceId || "", name: s.service?.name || "", qty: s.sessions || 1 }))
    });
    setMemServiceSearch("");
    setShowMemModal(true);
  };

  const addQuickPackage = (p) => {
    setPkgModalPkg(p);
    setPkgDraft({
      staffId: "",
      price: String(p.price || ""),
      validityDays: String(p.validityDays || "30"),
      purchaseDate: new Date().toISOString().slice(0, 10),
      customServices: (p.services || []).map(s => ({ id: s.service?.id || s.serviceId || "", name: s.service?.name || "", qty: s.sessions || 1 }))
    });
    setPkgServiceSearch("");
    setShowPkgModal(true);
  };

  
  const handleAddGcToCart = () => {
    const gc = gcModalGc;
    setForm(c => ({
      ...c,
      items: [...c.items.filter(i => i.serviceId || i.productId || i.membershipPlanId || i.packageId || i.itemType === "GIFT_CARD"), {
        itemType: "GIFT_CARD",
        serviceName: gc?.name || "Custom Gift Card",
        staffUserSalonId: gcDraft.staffId || "",
        qty: 1,
        unitPrice: Number(gcDraft.price || 0),
        taxPct: 0,
        validityDays: Number(gcDraft.validityDays || 30),
        purchaseDate: gcDraft.purchaseDate,
        isCustom: true
      }]
    }));
    setShowGcModal(false);
  };

  const handleAddPkgToCart = () => {
    const pkg = pkgModalPkg;
    setForm(c => ({
      ...c,
      items: [...c.items.filter(i => i.serviceId || i.productId || i.membershipPlanId || i.packageId), {
        itemType: "PACKAGE",
        packageId: pkg?.id || "",
        name: pkg?.name || "Package",
        staffUserSalonId: pkgDraft.staffId || "",
        qty: 1,
        unitPrice: Number(pkgDraft.price || 0),
        originalUnitPrice: Number(pkgDraft.price || 0),
        discountPct: 0,
        discountAmt: 0,
        taxPct: 0,
        validityDays: Number(pkgDraft.validityDays || 30),
        purchaseDate: pkgDraft.purchaseDate,
        customServices: pkgDraft.customServices,
        isCustom: true
      }]
    }));
    setShowPkgModal(false);
  };

  const handleAddMemToCart = () => {
    const mem = memModalMem;
    setForm(c => ({
      ...c,
      items: [...c.items.filter(i => i.serviceId || i.productId || i.membershipPlanId || i.packageId), {
        itemType: "MEMBERSHIP",
        membershipPlanId: mem?.id || "",
        name: mem?.name || "Membership",
        staffUserSalonId: memDraft.staffId || "",
        qty: 1,
        unitPrice: Number(memDraft.price || 0),
        originalUnitPrice: Number(memDraft.price || 0),
        discountPct: 0,
        discountAmt: 0,
        taxPct: 0,
        validityDays: Number(memDraft.validityDays || 30),
        purchaseDate: memDraft.purchaseDate,
        customServices: memDraft.customServices,
        isCustom: true
      }]
    }));
    setShowMemModal(false);
  };

  const getCatalogBasePrice = useCallback((item) => {
    if (item.originalUnitPrice != null) return toAmount(item.originalUnitPrice);
    if (item.unitPrice != null) return toAmount(item.unitPrice);
    if (item.itemType === "PRODUCT") return toAmount(productLookup[item.productId]?.sellingPrice);
    if (item.itemType === "MEMBERSHIP") return toAmount(membershipLookup[item.membershipPlanId]?.price || membershipLookup[item.membershipPlanId]?.monthlyPrice);
    if (item.itemType === "PACKAGE") return toAmount(packageLookup[item.packageId]?.price);
    return toAmount(serviceLookup[item.serviceId]?.price);
  }, [membershipLookup, packageLookup, productLookup, serviceLookup]);

  const totals = useMemo(() => {
    const advancedSettings = context.settings?.advancedSettings && typeof context.settings.advancedSettings === "object" ? context.settings.advancedSettings : {};
    const isInclusive = advancedSettings?.taxMapping?.inclusiveTax === true;
    const subtotal = form.items.reduce((sum, item) => {
      const price = item.unitPrice != null ? toAmount(item.unitPrice) : getCatalogBasePrice(item);
      return sum + Number(item.qty || 0) * price;
    }, 0);
    const itemTax = form.items.reduce((sum, item) => {
      const price = item.unitPrice != null ? toAmount(item.unitPrice) : getCatalogBasePrice(item);
      const taxPct = Number(item.taxPct || 0);
      const linePreTax = Number(item.qty || 0) * price;
      if (isInclusive && taxPct > 0) {
        return sum + (linePreTax * taxPct) / (100 + taxPct);
      }
      return sum + (linePreTax * taxPct) / 100;
    }, 0);
    const extraTax = Number(form.tax || 0);
    const discount = Number(form.discount || 0);
    const total = subtotal + itemTax + extraTax - discount;
    const paid = form.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return { subtotal, itemTax, total, paid, due: Math.max(0, total - paid) };
  }, [form, getCatalogBasePrice, context.settings]);

  const getEligibleStaffUsers = useCallback((item) => {
    const selectedBranchId = form.branchId;
    return (context.staffUsers || []).filter((staffUser) => {
      if (selectedBranchId && staffUser.branchId && staffUser.branchId !== selectedBranchId) return false;
      if (item.itemType !== "SERVICE") return true;
      if (!item.serviceId) return true;
      const assignedServiceIds = (staffUser.serviceAssignments || []).map((assignment) => assignment.serviceId);
      return assignedServiceIds.length === 0 || assignedServiceIds.includes(item.serviceId);
    });
  }, [context.staffUsers, form.branchId]);

  const validateBeforeSubmit = useCallback((mode) => {
    if (!form.customerId) return "Please select a guest.";
    if (!form.branchId) return "Please select a branch.";
    const activeItems = form.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
    if (!activeItems.length) return "Please add at least one item to the invoice.";
    for (const item of activeItems) {
      if (item.itemType === "SERVICE") {
        if (!item.serviceId) return "Please select a valid service.";
        if (!item.staffUserId) return "Please assign a staff member for each service.";
      }
      if (item.itemType === "PRODUCT" && !item.productId) return "Please select a valid product.";
      if (item.itemType === "MEMBERSHIP" && !item.membershipPlanId) return "Please select a membership plan.";
      if (item.itemType === "PACKAGE" && !item.packageId) return "Please select a package.";
      if (Number(item.qty || 0) <= 0) return "Quantity must be greater than zero.";
    }
    if (mode === "complete") {
      const totalPaid = form.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      if (totalPaid <= 0) return "Please enter at least one payment amount (Cash or Online) before completing the invoice.";
      if (totalPaid > totals.total + 1) return "Payment amount exceeds invoice total. Please check the amounts.";
    }
    return "";
  }, [form, totals.total]);

  const buildInvoicePayload = useCallback((mode) => {
    const activeItems = form.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
    
    let finalPayments = [];
    if (mode === "complete") {
      finalPayments = form.payments.filter((payment) => Number(payment.amount) > 0).map((payment) => ({
        ...payment,
        amount: Number(payment.amount)
      }));
    }

    return {
      ...form,
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      loyaltyPointsUsed: Number(form.loyaltyPointsUsed || 0),
      items: activeItems.map((item) => ({
        ...item,
        qty: Number(item.qty || 1),
        taxPct: Number(item.taxPct || 0)
      })),
      packageRedemptions: form.packageRedemptions.map((item) => ({
        ...item,
        sessionsUsed: Number(item.sessionsUsed || 1)
      })),
      payments: finalPayments
    };
  }, [form]);

  const updateItem = (index, patch) => {
    const nextItems = [...form.items];
    nextItems[index] = { ...nextItems[index], ...patch };
    setForm((current) => ({ ...current, items: nextItems }));
  };

  const applyItemDiscountPatch = useCallback((item, patch = {}) => {
    const basePrice = getCatalogBasePrice(item);
    const nextDiscountPct = Math.max(0, Math.min(100, toAmount(patch.discountPct ?? item.discountPct)));
    const nextDiscountAmt = Math.max(0, toAmount(patch.discountAmt ?? item.discountAmt));
    const discountedUnitPrice = Math.max(
      0,
      basePrice - ((basePrice * nextDiscountPct) / 100) - nextDiscountAmt
    );
    return {
      ...patch,
      originalUnitPrice: basePrice,
      discountPct: nextDiscountPct,
      discountAmt: nextDiscountAmt,
      unitPrice: Number(discountedUnitPrice.toFixed(2))
    };
  }, [getCatalogBasePrice]);

  const updateRedemption = (index, patch) => {
    const next = [...form.packageRedemptions];
    next[index] = { ...next[index], ...patch };
    setForm((current) => ({ ...current, packageRedemptions: next }));
  };

  const submitInvoice = async (mode = "complete") => {
    setStatus({ error: "", success: "" });
    const validationError = validateBeforeSubmit(mode);
    if (validationError) {
      setStatus({ error: validationError, success: "" });
      return;
    }
    try {
      const response = await api.post("/owner/pos/invoices", buildInvoicePayload(mode));
      setResult(response.data);
      setStatus({ error: "", success: `Invoice ${response.data.invoiceNumber} ${mode === "complete" ? "created and completed" : "created"}.` });
      
      if (mode === "complete") {
        setCreatedInvoice(response.data);
        setShowSuccessModal(true);
      }

      setGuestSearchInput("");
      setForm({
        customerId: "",
        branchId: form.branchId,
        appliedMembershipId: "",
        discount: 0,
        tax: 0,
        couponCode: "",
        giftVoucherCode: "",
        loyaltyPointsUsed: 0,
        notes: "",
        items: [emptyServiceItem],
        packageRedemptions: [],
        payments: [emptyPayment]
      });
      await loadContext("", form.branchId);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create invoice"), success: "" });
    }
  };

  const generatePaymentLink = async () => {
    if (!result?.id) {
      setStatus({ error: "Create an invoice first to generate a payment link.", success: "" });
      return;
    }
    const response = await api.post(`/owner/invoices/${result.id}/payment-link`, paymentLinkForm);
    setPaymentLink(response.data);
    setStatus({ error: "", success: "Payment link placeholder generated." });
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const res = await api.post("/owner/customers", newGuestForm);
      setGuestSearchInput(res.data.name);
      setForm(c => ({ ...c, customerId: res.data.id }));
      setShowAddGuestModal(false);
      setNewGuestForm({ name: "", phone: "", email: "", gender: "FEMALE", alternatePhone: "", dateOfBirth: "", anniversary: "", gst: "", notes: "" });
      await loadContext(res.data.id, form.branchId);
      setStatus({ error: "", success: "Guest added successfully!" });
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to add guest"), success: "" });
    }
  };

  const logPaymentLinkStatus = async (linkStatus) => {
    if (!result?.id) return;
    await api.post(`/owner/invoices/${result.id}/payment-link/log`, {
      status: linkStatus,
      note: paymentLinkForm.note || `Marked ${linkStatus.toLowerCase()} from POS`,
      gatewayRef: paymentLink?.paymentLinkToken || ""
    });
    const invoiceResponse = await api.get(`/owner/invoices/${result.id}`);
    setResult(invoiceResponse.data);
    setPaymentLink((current) => current ? { ...current, paymentLinkStatus: linkStatus === "PAID_PLACEHOLDER" ? "PAID" : linkStatus } : current);
    setStatus({ error: "", success: `Payment link marked ${linkStatus.toLowerCase()}.` });
  };



  return (
    <div className="pos-layout">
      {/* TOP BAR */}
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <div className="pos-gender-toggles">
            <button className={`pos-gender-btn ${posGender === "ALL" ? "active" : ""}`} onClick={() => setPosGender("ALL")}>All</button>
            <button className={`pos-gender-btn ${posGender === "FEMALE" ? "active" : ""}`} onClick={() => setPosGender("FEMALE")}>Female</button>
            <button className={`pos-gender-btn ${posGender === "MALE" ? "active" : ""}`} onClick={() => setPosGender("MALE")}>Male</button>
          </div>
          <div className="pos-search-wrapper">
            <input 
              placeholder={tab === "billing" ? "Search Service" : tab === "products" ? "Search Product" : tab === "packages" ? "Search Package" : "Search Membership"} 
              value={
                  tab === 'billing' ? serviceSearch : 
                  tab === 'products' ? productSearch : 
                  tab === 'packages' ? packageSearch : 
                  membershipSearch
                } 
              onChange={(e) => {
                  const val = e.target.value;
                  if (tab === 'billing') setServiceSearch(val);
                  else if (tab === 'products') setProductSearch(val);
                  else if (tab === 'packages') setPackageSearch(val);
                  else setMembershipSearch(val);
                }} 
            />
            <svg className="pos-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="pos-topbar-right">
          <button className={`pos-top-tab ${tab === "billing" ? "active" : ""}`} onClick={() => setTab("billing")}>Add Service</button>
          <button className={`pos-top-tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>Add Product</button>
          <button className="pos-top-tab" onClick={() => { setPkgModalPkg(null); setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] }); setShowPkgModal(true); }}>Add Package</button>
            <button className="pos-top-tab" onClick={() => { setGcModalGc({ id: "CUSTOM", name: "CUSTOM GIFT CARD" }); setGcDraft({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0,10) }); setShowGcModal(true); }}>Add GiftCard</button>
          <button className="pos-top-tab" onClick={() => { setMemModalMem(null); setMemDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] }); setShowMemModal(true); }}>Add Membership</button>
        </div>
      </div>

      <div className="pos-body">
        {/* LEFT SIDEBAR (1-CLICK CATALOG) */}
        <div className="pos-sidebar">
          <div className="pos-cat-grid">
            {tab === "products" ? (
               <>
                 <button className={`pos-cat-btn ${!productCategoryFilter ? "active" : ""}`} onClick={() => setProductCategoryFilter("")}>ALL</button>
                 {productCategories.slice(0, 7).map(c => <button key={c.id || c.name} className={`pos-cat-btn ${productCategoryFilter === (c.id || c.name) ? "active" : ""}`} onClick={() => setProductCategoryFilter(c.id || c.name)}>{c.name}</button>)}
               </>
            ) : tab === "billing" ? (
               <>
                 <button className={`pos-cat-btn ${!serviceCategoryFilter ? "active" : ""}`} onClick={() => setServiceCategoryFilter("")}>ALL</button>
                 {serviceCategories.slice(0, 7).map(c => <button key={c.id} className={`pos-cat-btn ${serviceCategoryFilter === (c.id || c.name) ? "active" : ""}`} onClick={() => setServiceCategoryFilter(c.id || c.name)}>{c.name}</button>)}
               </>
            ) : (
              <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 13 }}>{tab === "packages" ? "Available Packages" : "Available Memberships"}</div>
            )}
          </div>

          <div className="pos-item-list-container">
            {tab === "products" ? (
               productTileGroups.length ? productTileGroups.map(group => (
                 <div key={group.title}>
                   <div className="pos-group-header">{group.title}</div>
                   <div className="pos-item-grid">
                     {group.items.map(product => (
                       <button type="button" key={product.id} className="pos-item-card" onClick={() => addQuickProduct(product)}>
                         <div className="pos-item-card-name">{product.name}</div>
                         <div className="pos-item-card-prices">
                           <span className="pos-item-card-price-new">{Number(product.sellingPrice || 0).toFixed(0)}</span>
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               )) : <EmptyState title="No products found" message="Try All, another product category, or clear product search." />
            ) : tab === "packages" ? (
              packageTileGroups.length ? packageTileGroups.map((group) => (
                <div key={group.title}>
                  <div className="pos-group-header">{group.title}</div>
                  <div className="pos-item-grid">
                    {group.items.map((pkg) => (
                      <button type="button" key={pkg.id} className="pos-item-card" onClick={() => addQuickPackage(pkg)}>
                        <div className="pos-item-card-name">{pkg.name}</div>
                        <div className="pos-item-card-prices">
                          <span className="pos-item-card-price-new">{Number(pkg.price || 0).toFixed(0)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )) : <EmptyState title="No packages found" message="Create active packages to sell them from POS." />
            ) : tab === "memberships" ? (
              membershipTileGroups.length ? membershipTileGroups.map((group) => (
                <div key={group.title}>
                  <div className="pos-group-header">{group.title}</div>
                  <div className="pos-item-grid">
                    {group.items.map((membership) => (
                      <button type="button" key={membership.id} className="pos-item-card" onClick={() => addQuickMembership(membership)}>
                        <div className="pos-item-card-name">{membership.name}</div>
                        <div className="pos-item-card-prices">
                          <span className="pos-item-card-price-new">{Number(membership.price || membership.monthlyPrice || 0).toFixed(0)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )) : <EmptyState title="No memberships found" message="Create active membership plans to sell them from POS." />
            ) : (
               serviceTileGroups.length ? serviceTileGroups.map(group => (
                 <div key={group.title}>
                   <div className="pos-group-header">{group.title}</div>
                   <div className="pos-item-grid">
                     {group.items.map(service => (
                       <button type="button" key={service.id} className="pos-item-card" onClick={() => addQuickService(service)}>
                         <div className="pos-item-card-name">{service.name}</div>
                         <div className="pos-item-card-prices">
                           {service.originalPrice && service.originalPrice > service.price && <span className="pos-item-card-price-old">{Number(service.originalPrice).toFixed(0)}</span>}
                           <span className="pos-item-card-price-new">{Number(service.price || 0).toFixed(0)}</span>
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               )) : <EmptyState title="No services found" message="Try All, switch Male/Female, or clear service search." />
            )}
          </div>
        </div>

        {/* RIGHT MAIN AREA */}
        <div className="pos-main">
          <div className="pos-invoice-section">
            <div className="pos-invoice-header">
              <h4>Invoice</h4>
              <div className="pos-invoice-date">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>

            <div className="pos-guest-row">
              <div className="pos-search-guest" style={{ maxWidth: 220 }}>
                <label>
                  Branch :
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((current) => ({ ...current, branchId: e.target.value }))}
                  >
                    <option value="">Select Branch</option>
                    {(context.branches || []).map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              
              <div className="pos-search-guest">
                <label>
                  Guest : 
                  <div style={{ position: "relative", flex: 1 }}>
                    <input 
                      type="text" 
                      placeholder="Search By Name Or No." 
                      value={guestSearchInput} 
                      onChange={(e) => {
                        setGuestSearchInput(e.target.value);
                        setShowCustomerDropdown(true);
                        const match = context.customers.find(c => c.name === e.target.value || c.phone === e.target.value);
                        if (match) {
                          setForm(current => ({ ...current, customerId: match.id }));
                        } else {
                          setForm(current => ({ ...current, customerId: "" }));
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    />
                    {showCustomerDropdown && guestSearchInput && (
                      <div className="pos-customer-dropdown" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "4px", maxHeight: "300px", overflowY: "auto", zIndex: 50, boxShadow: "none" }}>
                        {context.customers.filter(c => c.name.toLowerCase().includes(guestSearchInput.toLowerCase()) || c.phone.includes(guestSearchInput)).map(c => (
                          <div key={c.id} style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => {
                            setGuestSearchInput(c.name);
                            setForm(current => ({ ...current, customerId: c.id }));
                            setShowCustomerDropdown(false);
                          }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>{c.name}</div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{c.phone}</div>
                          </div>
                        ))}
                        {context.customers.filter(c => c.name.toLowerCase().includes(guestSearchInput.toLowerCase()) || c.phone.includes(guestSearchInput)).length === 0 && (
                          <div style={{ padding: "10px 12px", color: "#64748b", fontSize: "13px", textAlign: "center" }}>No matches found</div>
                        )}
                      </div>
                    )}
                    <svg style={{ position: "absolute", right: 8, top: 10, width: 16, height: 16, color: "#94a3b8", pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </label>
                {!form.customerId && <div className="pos-guest-error">Please select guest</div>}
              </div>
              <button type="button" className="pos-add-guest-btn" onClick={() => setShowAddGuestModal(true)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Add Guest
              </button>
            </div>

            {form.customerId && (() => {
              const customer = context.customers.find(c => c.id === form.customerId);
              if(!customer) return null;
              
              const activeMembership = customer.memberships?.find(m => String(m.status) === 'ACTIVE' && new Date(m.endsAt) > new Date());
              const activePackage = customer.packages?.find(p => String(p.status) === 'ACTIVE' && new Date(p.endsAt) > new Date());
              const dueBal = customer.invoices?.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL').reduce((sum, inv) => sum + Number(inv.balanceAmount || 0), 0) || 0;
              
              const dob = customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString("en-GB", {day:"2-digit", month:"short"}) : "NA";
              const anniv = customer.anniversary ? new Date(customer.anniversary).toLocaleDateString("en-GB", {month:"short", year:"2-digit"}) : "NA";
              const lastVisited = customer.lastVisitAt ? new Date(customer.lastVisitAt).toLocaleDateString("en-GB", {month:"short", day:"2-digit"}) : "NA";
              
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
                  <div style={{display: "flex", gap: "24px", width: "100%", justifyContent: "space-between"}}>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>Guest :</strong> {customer.name}</div>
                      <div><strong style={{color:"#0f172a"}}>Phone :</strong> {customer.phone}</div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>DOB :</strong> {dob}</div>
                      <div><strong style={{color:"#0f172a"}}>Anniv :</strong> {anniv}</div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>Last Visited :</strong> {lastVisited}</div>
                      <div><strong style={{color:"#0f172a"}}>Due Bal :</strong> {dueBal > 0 ? formatMoney(Number(dueBal.toFixed(0))) : "NA"}</div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>Adv :</strong> {activeMembership?.remainingWalletValue ? formatMoney(Number(activeMembership.remainingWalletValue).toFixed(0)) : "NA"}</div>
                      <div><strong style={{color:"#0f172a"}}>Package :</strong> {activePackage?.package?.name || "NA"}</div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>Membership :</strong> {activeMembership?.membershipPlan?.name || "NA"}</div>
                    </div>
                    <div style={{display: "flex", alignItems: "flex-start"}}>
                      <button style={{background: "none", border: "none", cursor: "pointer", color: "#3b82f6"}} onClick={() => window.open('/#/customers', '_blank')}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pos-cart-table-wrapper">

              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Staff</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Sub Total</th>
                    <th>Disc (%)</th>
                    <th>Disc (Flat)</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => {
                    if (!item.serviceId && !item.productId && !item.membershipPlanId && !item.packageId) return null;
                    const baseObj = item.itemType === "PRODUCT"
                      ? productLookup[item.productId]
                      : item.itemType === "MEMBERSHIP"
                        ? membershipLookup[item.membershipPlanId]
                        : item.itemType === "PACKAGE"
                          ? packageLookup[item.packageId]
                          : serviceLookup[item.serviceId];
                    if (!baseObj) return null;
                    const basePrice = getCatalogBasePrice(item);
                    const price = item.unitPrice != null ? toAmount(item.unitPrice) : basePrice;
                    const qty = Number(item.qty) || 1;
                    const subTotal = price * qty;
                    const tax = (subTotal * Number(item.taxPct || 0)) / 100;
                    const total = subTotal + tax;
                    return (
                      <tr key={index}>
                        <td style={{ color: "#334155" }}>{baseObj.name}</td>
                        <td>
                          {item.itemType === "SERVICE" || item.itemType === "PACKAGE" || item.itemType === "MEMBERSHIP" || item.itemType === "GIFT_CARD" ? (
                            <select className="pos-cart-select" value={item.staffUserSalonId || item.staffUserId || ""} onChange={(e) => updateItem(index, { staffUserSalonId: e.target.value, staffUserId: e.target.value })}>
                              <option value="">Assign staff</option>
                              {getEligibleStaffUsers(item).map((u) => <option key={u.id} value={u.id}>{u.user?.name}</option>)}
                            </select>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <input
                            className="pos-cart-input"
                            type="number"
                            min="1"
                            value={item.itemType === "MEMBERSHIP" || item.itemType === "PACKAGE" ? 1 : item.qty}
                            disabled={item.itemType === "MEMBERSHIP" || item.itemType === "PACKAGE"}
                            onChange={(e) => updateItem(index, { qty: Number(e.target.value || 1) })}
                          />
                        </td>
                        <td>{price.toFixed(0)}</td>
                        <td>{subTotal.toFixed(0)}</td>
                        <td>
                          <input
                            className="pos-cart-input"
                            style={{ width: 50 }}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discountPct ?? 0}
                            onChange={(e) => updateItem(index, applyItemDiscountPatch(item, { discountPct: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            className="pos-cart-input"
                            style={{ width: 60 }}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.discountAmt ?? 0}
                            onChange={(e) => updateItem(index, applyItemDiscountPatch(item, { discountAmt: e.target.value }))}
                          />
                        </td>
                        <td>{tax.toFixed(0)}</td>
                        <td>{total.toFixed(0)}</td>
                        <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {item.itemType === "SERVICE" && (
                            <button type="button" title="Add Consumable Items For Service" onClick={() => openConsumableModal(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, color: '#2563eb', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>📦</button>
                          )}
                          {item.itemType === "SERVICE" && (
                            <span title={`${item.consumableItems?.length || 0} consumable item(s)`} style={{ fontSize: 11, color: item.consumableItems?.length ? '#16a34a' : '#94a3b8', fontWeight: 600, cursor: 'default' }}>{item.consumableItems?.length || 0}</span>
                          )}
                          <button type="button" className="pos-cart-remove" onClick={() => setForm(c => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.filter(item => item.serviceId || item.productId || item.membershipPlanId || item.packageId).length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                        No items added yet. Click a service or product on the left to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pos-grand-total-row">
              <div className="pos-grand-total">
                Grand Total <strong>{formatMoney(totals.total.toFixed(0))}</strong>
              </div>
            </div>

            <div className="pos-instruction-row">
              <input placeholder="Add Order Instruction (Optional, Max 500 Characters)" value={form.notes} onChange={(e) => setForm(c => ({ ...c, notes: e.target.value }))} />
            </div>

            <div className="pos-payment-details">
              {form.customerId && (() => {
                const customer = context.customers.find(c => c.id === form.customerId);
                const loyaltyBal = Number(customer?.loyaltyPoints || 0);
                if (loyaltyBal <= 0) return null;
                return (
                  <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>Loyalty Points Available</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#166534' }}>{loyaltyBal} pts</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Redeem Points:</label>
                      <input
                        type="number"
                        min="0"
                        max={loyaltyBal}
                        placeholder="0"
                        value={form.loyaltyPointsUsed || ""}
                        onChange={(e) => setForm(c => ({ ...c, loyaltyPointsUsed: Number(e.target.value || 0) }))}
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                      {Number(form.loyaltyPointsUsed || 0) > 0 && (
                        <button type="button" onClick={() => setForm(c => ({ ...c, loyaltyPointsUsed: 0 }))} style={{ padding: '6px 10px', fontSize: '11px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer', color: '#166534', fontWeight: 600 }}>Clear</button>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0 }}>Payment Details:</h5>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Click Cash/Online to auto-fill full amount)</span>
              </div>
              <div className="pos-payment-grid">
                <div className="pos-payment-input">
                  <label style={{ cursor: 'pointer' }} onClick={() => {
                    const next = form.payments.filter((payment) => payment.mode !== "ONLINE");
                    next.push({ mode: "ONLINE", amount: totals.total, note: "" });
                    setForm((current) => ({ ...current, payments: next }));
                  }}><svg width="16" height="16" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Online</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "ONLINE")?.amount || ""} onChange={(e) => {
                    const amount = e.target.value;
                    const next = form.payments.filter((payment) => payment.mode !== "ONLINE");
                    next.push({ mode: "ONLINE", amount, note: "" });
                    setForm((current) => ({ ...current, payments: next }));
                  }} />
                </div>
                <div className="pos-payment-input">
                  <label style={{ cursor: 'pointer' }} onClick={() => {
                    const next = form.payments.filter((payment) => payment.mode !== "CASH");
                    next.unshift({ mode: "CASH", amount: totals.total, note: "" });
                    setForm(c => ({ ...c, payments: next }));
                  }}><svg width="16" height="16" style={{ color: "#64748b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Cash</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "CASH")?.amount || ""} onChange={(e) => {
                    const amount = e.target.value;
                    const next = form.payments.filter((payment) => payment.mode !== "CASH");
                    next.unshift({ mode: "CASH", amount, note: "" });
                    setForm(c => ({ ...c, payments: next }));
                  }} />
                </div>
                <div className="pos-payment-input">
                  <label style={{ cursor: 'pointer' }} onClick={() => {
                    const paidSoFar = form.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                    const balance = Math.max(0, totals.total - paidSoFar);
                    const next = form.payments.filter((payment) => payment.mode !== "BALANCE");
                    next.push({ mode: "BALANCE", amount: balance, note: "" });
                    setForm(c => ({ ...c, payments: next }));
                  }}><svg width="16" height="16" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Balance</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "BALANCE")?.amount || ""} onChange={(e) => {
                    const amount = e.target.value;
                    const next = form.payments.filter((payment) => payment.mode !== "BALANCE");
                    next.push({ mode: "BALANCE", amount, note: "" });
                    setForm(c => ({ ...c, payments: next }));
                  }} />
                </div>
              </div>

              <div className="pos-message-config">
                <h5>Message Configurations:</h5>
                <div className="pos-message-options">
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={form.sendFeedbackMessage !== false} onChange={(e) => setForm(c => ({ ...c, sendFeedbackMessage: e.target.checked }))} style={{ width: 16, height: 16, margin: 0, cursor: "pointer" }} /> Feedback Message
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={form.sendInvoiceMessage !== false} onChange={(e) => setForm(c => ({ ...c, sendInvoiceMessage: e.target.checked }))} style={{ width: 16, height: 16, margin: 0, cursor: "pointer" }} /> Invoice Message
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pos-footer-bar">
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              {status.error && <span style={{ color: "#ef4444", fontWeight: 500, fontSize: "13px" }}>{status.error}</span>}
              {status.success && <span style={{ color: "#10b981", fontWeight: 500, fontSize: "13px" }}>{status.success}</span>}
            </div>
            <button type="button" className="pos-btn-clear" onClick={() => setForm(c => ({ ...c, items: [] }))}>Clear</button>
            <button type="button" className="pos-btn-create" onClick={() => submitInvoice("draft")}>Create</button>
            <button type="button" className="pos-btn-complete" onClick={() => submitInvoice("complete")}>Create & Complete</button>
          </div>
        </div>
      </div>
      
      {showAddGuestModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "none" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, color: "#0f172a", fontSize: "18px" }}>Quick Add Guest</h3>
            <form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="Full Name *" required value={newGuestForm.name} onChange={e => setNewGuestForm(c => ({ ...c, name: e.target.value }))} />
              <IndianPhoneInput
                    required
                value={newGuestForm.phone}
                onChange={(phone) => setNewGuestForm(c => ({ ...c, phone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
              />
              <IndianPhoneInput
                value={newGuestForm.alternatePhone}
                onChange={(alternatePhone) => setNewGuestForm(c => ({ ...c, alternatePhone }))}
                placeholder="Alternate Phone"
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
              />
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} type="email" placeholder="Email (Optional)" value={newGuestForm.email} onChange={e => setNewGuestForm(c => ({ ...c, email: e.target.value }))} />
              <select style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.gender} onChange={e => setNewGuestForm(c => ({ ...c, gender: e.target.value }))}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="UNISEX">Other</option>
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", marginBottom: 4, fontWeight: 600 }}>Date of Birth</label>
                  <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", color: newGuestForm.dateOfBirth ? "#0f172a" : "#94a3b8" }} type="date" value={newGuestForm.dateOfBirth} onChange={e => setNewGuestForm(c => ({ ...c, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", marginBottom: 4, fontWeight: 600 }}>Anniversary</label>
                  <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", color: newGuestForm.anniversary ? "#0f172a" : "#94a3b8" }} type="date" value={newGuestForm.anniversary} onChange={e => setNewGuestForm(c => ({ ...c, anniversary: e.target.value }))} />
                </div>
              </div>
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="GST Number" value={newGuestForm.gst} onChange={e => setNewGuestForm(c => ({ ...c, gst: e.target.value }))} />
              <textarea style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", minHeight: 60, resize: "vertical", fontFamily: "inherit" }} placeholder="Notes" value={newGuestForm.notes} onChange={e => setNewGuestForm(c => ({ ...c, notes: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#475569" }} onClick={() => setShowAddGuestModal(false)}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "10px", background: "#0f172a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Save Guest</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccessModal && createdInvoice && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 32, borderRadius: 12, width: 400, boxShadow: "none", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="32" height="32" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 style={{ marginTop: 0, marginBottom: 8, color: "#0f172a", fontSize: "20px", fontWeight: 700 }}>Invoice Created</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: 24 }}>Invoice #{createdInvoice.invoiceNumber} has been generated successfully.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => navigate(`/admin/invoices/${createdInvoice.id}`)} style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                View Invoice
              </button>
              <button onClick={() => downloadFromApi(`/owner/invoices/${createdInvoice.id}/pdf`, { fallbackFilename: `invoice-${createdInvoice.invoiceNumber}.pdf` })} style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </button>
              <button onClick={() => downloadFromApi(`/owner/invoices/${createdInvoice.id}/receipt`, { fallbackFilename: `receipt-${createdInvoice.invoiceNumber}.html` })} style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Download Receipt
              </button>
              <button type="button" onClick={() => { setShowSuccessModal(false); setCreatedInvoice(null); setStatus({ error: "", success: "" }); }} style={{ padding: "12px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginTop: 8 }}>
                Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      
      
      {/* ======= FULL ADD GIFTCARD MODAL ======= */}
      {showGcModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowGcModal(false)}>
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
                {(context.giftCards || []).filter(g => g.code?.toLowerCase().includes(gcSearch.toLowerCase()) || "gift card".includes(gcSearch.toLowerCase())).map(gc => {
                  const isSelected = gcModalGc?.id === gc.id;
                  return (
                    <div key={gc.id} onClick={() => {
                      setGcModalGc({ id: gc.id, name: gc.code || "Gift Card" });
                      setGcDraft({ staffId: "", price: String(gc.amount||0), validityDays: String(gc.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10) });
                    }} style={{ background: isSelected?"#fdf4ff":"#fdf4ff", border: isSelected?"2px solid #e879f9":"1px solid #fdf4ff", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                      <div style={{ fontSize:"0.95rem", fontWeight:700, color:"#3b82f6", marginBottom:8, textTransform:"uppercase" }}>{gc.code || "GIFT CARD"}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Fee: {formatMoney(Number(gc.amount||0))}</div>
                      <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:12 }}>Validity: {gc.validityDays || 30} Days</div>
                    </div>
                  );
                })}
                <div onClick={() => {
                  setGcModalGc({ id: "CUSTOM", name: "CUSTOM GIFT CARD" });
                  setGcDraft({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0,10) });
                }} style={{ background: gcModalGc?.id==="CUSTOM"?"#fdf4ff":"#f8fafc", border: gcModalGc?.id==="CUSTOM"?"2px solid #e879f9":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minHeight:100, transition:"all 0.2s" }}>
                  <div style={{ fontSize:"1rem", fontWeight:700, color:"#e879f9", textTransform:"uppercase" }}>CUSTOM GIFT CARD</div>
                </div>
              </div>

              {/* Bottom Form */}
              <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:150 }}>
                  <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Name</label>
                  <input readOnly value={gcModalGc ? (gcModalGc.id==="CUSTOM" ? "CUSTOM GIFT CARD" : gcModalGc.name) : ""} placeholder="Enter Name" style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", background:"#f8fafc", color:"#94a3b8", boxSizing:"border-box" }} />
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
                    {(context.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
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
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowPkgModal(false)}>
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
                {(context.packages || []).filter(p => p.name.toLowerCase().includes(pkgSearch.toLowerCase())).map(pkg => {
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
                        {(context.services || []).filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase())).map(svc => (
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
                      {(context.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
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
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowMemModal(false)}>
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
                {(context.memberships || []).filter(m => m.name.toLowerCase().includes(memSearch.toLowerCase())).map(mem => {
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
                <div onClick={() => {
                  setMemModalMem({ id: "CUSTOM", name: "CUSTOM MEMBERSHIP" });
                  setMemDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] });
                }} style={{ background: memModalMem?.id==="CUSTOM"?"#eff6ff":"#f8fafc", border: memModalMem?.id==="CUSTOM"?"2px solid #3b82f6":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minHeight:150, transition:"all 0.2s" }}>
                  <div style={{ fontSize:"1rem", fontWeight:700, color:"#2563eb", textTransform:"uppercase" }}>CUSTOM MEMBERSHIP</div>
                </div>
              </div>

              {/* Selected Services & Form */}
              <div style={{ display:"flex", flexDirection:"column", gap:16, marginTop:8 }}>
                {/* Services List exactly like screenshot */}
                <div style={{ fontWeight:600, color:"#64748b", fontSize:"0.9rem", marginBottom:4 }}>Selected services</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {memDraft.customServices.map((svc, idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", border:"1px solid #e2e8f0", borderRadius:8, background:"#fff" }}>
                      <span style={{ fontSize:"0.9rem", color:"#0f172a", fontWeight:500 }}>{svc.name} <span style={{color:"#64748b", fontSize:"0.8rem", marginLeft:8}}>({formatMoney(Number(svc.price||0) * Number(svc.qty||1))})</span></span>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <input type="number" min="1" value={svc.qty} onChange={e => { const n=[...memDraft.customServices]; n[idx]={...n[idx],qty:Number(e.target.value)}; const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setMemDraft(d=>({...d,customServices:n, price: memModalMem?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:60, padding:"8px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:"0.9rem", textAlign:"center" }} />
                        <button onClick={() => { const n=memDraft.customServices.filter((_,i)=>i!==idx); const newTotal = n.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setMemDraft(d=>({...d,customServices:n, price: memModalMem?.id==="CUSTOM"?String(newTotal):d.price})); }} style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background:"#fff", border:"1px solid #cbd5e1", borderRadius:6, cursor:"pointer", color:"#0f172a", fontWeight:600 }}>X</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Services Search Bar */}
                <div style={{ display:"flex", alignItems:"center", marginTop:8, gap:16 }}>
                  <div style={{ fontWeight:600, color:"#64748b", fontSize:"0.9rem", minWidth:100 }}>Add services</div>
                  <div style={{ position:"relative", flex:1, maxWidth:400 }}>
                    <input placeholder="Search Service By Category Or Name" value={memServiceSearch} onChange={e => setMemServiceSearch(e.target.value)} style={{ width:"100%", padding:"10px 14px", paddingRight:36, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                    <span style={{ position:"absolute", right:12, top:10, color:"#000", fontWeight:700 }}>🔍</span>
                    {memServiceSearch.trim() && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", marginTop:4, zIndex:10, boxShadow: "none" }}>
                        {(context.services || []).filter(s => s.name.toLowerCase().includes(memServiceSearch.toLowerCase())).map(svc => (
                          <div key={svc.id} onClick={() => { if(!memDraft.customServices.find(c=>c.id===svc.id)) { const newSvc = [...memDraft.customServices, {id:svc.id, name:svc.name, price: svc.salesPrice || svc.price || 0, qty:1}]; const newTotal = newSvc.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setMemDraft(d=>({...d, customServices: newSvc, price: memModalMem?.id==="CUSTOM"?String(newTotal):d.price})); } setMemServiceSearch(""); }} style={{ padding:"10px 16px", cursor:"pointer", fontSize:"0.9rem", color:"#334155", borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
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
                      {(context.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
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

      {showConsumableModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowConsumableModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Update Consumable Items</h2>
              <button type="button" onClick={() => setShowConsumableModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {consumableItems.map((ci, ciIndex) => (
                <div key={ciIndex} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, color: '#64748b', minWidth: 20 }}>{ciIndex + 1}</span>
                  <div style={{ flex: 2, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search By Name"
                      value={ci.name || ""}
                      readOnly
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    />
                  </div>
                  <div style={{ flex: 0, position: 'relative' }}>
                    <input
                      type="number"
                      placeholder="qty"
                      min="0.01"
                      step="0.01"
                      value={ci.qty}
                      onChange={(e) => updateConsumableItem(ciIndex, { qty: Number(e.target.value) || 1 })}
                      style={{ width: 70, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="unit"
                    value={ci.unit || ""}
                    onChange={(e) => updateConsumableItem(ciIndex, { unit: e.target.value })}
                    style={{ width: 70, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
                  />
                  <button type="button" onClick={() => removeConsumableItem(ciIndex)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18, padding: 4 }}>🗑</button>
                </div>
              ))}

              <div style={{ position: 'relative', marginTop: 12 }}>
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={consumableSearch}
                  onChange={(e) => setConsumableSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
                {consumableSearch && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
                    {(context.products || [])
                      .filter(p => p.productType === "CONSUMABLE" || true)
                      .filter(p => (p.name || "").toLowerCase().includes(consumableSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => addConsumableProduct(p)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#334155' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          {p.name}
                        </div>
                      ))}
                    {context.products.filter(p => (p.name || "").toLowerCase().includes(consumableSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No products found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setShowConsumableModal(false)} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Close</button>
              <button type="button" onClick={saveConsumableItems} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
