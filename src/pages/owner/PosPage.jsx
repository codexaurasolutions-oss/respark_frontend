import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, AlarmClock, Gift, Droplet, X } from "lucide-react";
import { downloadFromApi } from "../../utils/download";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { useBranch } from '../../context/BranchContext';
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

const normalizeCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const normalizeProductCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const clampMoneyInput = (value, max = Number.POSITIVE_INFINITY) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [whole = "", ...fractionParts] = cleaned.split(".");
  const normalized = fractionParts.length ? `${whole}.${fractionParts.join("")}` : whole;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  const capped = Number.isFinite(max) ? Math.min(parsed, Math.max(0, max)) : parsed;
  return String(Number(capped.toFixed(2)));
};

const determineGender = (item) => {
  if (item?.gender) {
    const g = String(item.gender).toLowerCase().trim();
    if (g === "female" || g === "f") return "FEMALE";
    if (g === "male" || g === "m") return "MALE";
    return "UNISEX";
  }
  const name = String(item?.name || "").toLowerCase();
  const categoryName = String(item?.category?.name || "").toLowerCase();
  const fullText = `${name} ${categoryName}`;
  const isMale = /\b(beard|grooming|men|male|boy|shave|mustache|guy|gent|gents)\b/.test(fullText);
  const isFemale = /\b(female|women|bridal|makeup|nail|waxing|lady|girl|blush|eyelash|nude|lips|lipstick|pedicure|manicure|threading|braid|lash|hair color & treatments|makeup & bridal|nails, hands & feet)\b/.test(fullText);
  if (isMale && !isFemale) return "MALE";
  if (isFemale && !isMale) return "FEMALE";
  return "UNISEX";
};
const genderMatches = (item, selectedGender) => {
  if (selectedGender === "ALL") return true;
  const itemGender = determineGender(item);
  if (itemGender === "UNISEX") return true;
  return itemGender === selectedGender;
};

export default function PosPage() {
  const { formatMoney } = useSalonSettings();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [tab, setTab] = useState("billing");
  const [context, setContext] = useState({ customers: [], branches: [], services: [], staffUsers: [], products: [], memberships: [], packages: [], customerPackages: [], coupons: [], giftCards: [], customerProfile: null, settings: null });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [toastMessage, setToastMessage] = useState(null);
  
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
  const [gcDraft, setGcDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), online: "", offline: "", code: "", remark: "" });
  const [submittingGc, setSubmittingGc] = useState(false);
  const [gcSearch, setGcSearch] = useState("");

  const [showPkgModal, setShowPkgModal] = useState(false);
  const [pkgModalPkg, setPkgModalPkg] = useState(null);
  const [pkgDraft, setPkgDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [], customProducts: [], balance: "", online: "", offline: "", remark: "" });
  const [pkgSearch, setPkgSearch] = useState("");
  const [pkgServiceSearch, setPkgServiceSearch] = useState("");
  const [pkgProductSearch, setPkgProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingPkg, setSubmittingPkg] = useState(false);
  const [submittingMem, setSubmittingMem] = useState(false);
  const [showPkgDetailModal, setShowPkgDetailModal] = useState(null);
  const [showMemModal, setShowMemModal] = useState(false);
  const [memModalMem, setMemModalMem] = useState(null);
  const [memDraft, setMemDraft] = useState({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0, 10), customServices: [] });
  const [memSearch, setMemSearch] = useState("");
  const [memServiceSearch, setMemServiceSearch] = useState("");
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [consumableItemIndex, setConsumableItemIndex] = useState(null);
  const [consumableItems, setConsumableItems] = useState([]);
  const [consumableSearch, setConsumableSearch] = useState("");
  const [consumableOverrides, setConsumableOverrides] = useState({});
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeModalDraft, setTimeModalDraft] = useState({ index: null, startTime: "", endTime: "" });
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderModalDraft, setReminderModalDraft] = useState({ index: null, serviceId: "", serviceName: "", reminderDays: "" });
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountDraft, setDiscountDraft] = useState({ type: "FIX", value: "" });
  const [showApplyMembershipModal, setShowApplyMembershipModal] = useState(false);
  const [selectedMembershipForApply, setSelectedMembershipForApply] = useState(null);
  const [showMembershipItemsModal, setShowMembershipItemsModal] = useState(false);
  const [membershipItemsDraft, setMembershipItemsDraft] = useState([]);
  const [showApplyPkgRedemptionModal, setShowApplyPkgRedemptionModal] = useState(false);
  const [customerPackages, setCustomerPackages] = useState([]);
  const [loadingCustomerPkgs, setLoadingCustomerPkgs] = useState(false);
  const [showGcRedemptionModal, setShowGcRedemptionModal] = useState(false);
  const [gcRedemptionCode, setGcRedemptionCode] = useState("");
  const [gcRedemptionResult, setGcRedemptionResult] = useState(null);
  const [gcRedemptionLoading, setGcRedemptionLoading] = useState(false);
  const [giftCardDiscount, setGiftCardDiscount] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipDraft, setTipDraft] = useState({ staffId: "", amount: "", paymentMode: "CASH" });
  const [tipEntries, setTipEntries] = useState([]);

  const [couponValidating, setCouponValidating] = useState(false);
  const [couponValidation, setCouponValidation] = useState(null);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [affiliateWallet, setAffiliateWallet] = useState(null);
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

  // === Apply Discount ===
  const openDiscountModal = () => {
    const eligibleItems = form.items.filter(item =>
      (item.serviceId || item.productId) && Number(item.unitPrice || 0) > 0
    );
    if (eligibleItems.length === 0) {
      setToastMessage({ type: "error", title: "No Eligible Items", message: "No eligible items for discount" });
      return;
    }
    setDiscountDraft({ type: "FIX", value: String(form.discount || "") });
    setShowDiscountModal(true);
  };

  const confirmDiscount = () => {
    const val = Number(discountDraft.value || 0);
    if (val < 0) {
      setToastMessage({ type: "error", title: "Invalid Discount", message: "Discount cannot be negative." });
      return;
    }
    const maxDiscount = totals.subtotal + totals.itemTax;
    let finalDiscount = 0;
    if (discountDraft.type === "PERCENT") {
      const pct = Math.min(100, Math.max(0, val));
      finalDiscount = Number(((totals.subtotal + totals.itemTax) * pct / 100).toFixed(2));
    } else {
      finalDiscount = Math.min(val, maxDiscount);
    }
    if (finalDiscount === 0) {
      setForm(c => ({ ...c, discount: 0 }));
      setShowDiscountModal(false);
      setToastMessage({ type: "success", title: "Discount Removed", message: "Discount has been cleared." });
      return;
    }
    setForm(c => ({ ...c, discount: finalDiscount }));
    setShowDiscountModal(false);
    setToastMessage({ type: "success", title: "Discount Applied", message: `${discountDraft.type === "PERCENT" ? discountDraft.value + "% off" : formatMoney(finalDiscount)} discount applied successfully.` });
  };

  // === Apply Coupon ===
  const applyCoupon = async () => {
    const code = couponCodeInput.trim();
    if (!code) {
      setToastMessage({ type: "error", title: "Coupon Code Required", message: "Please enter a coupon code." });
      return;
    }
    setCouponValidating(true);
    setCouponValidation(null);
    try {
      const itemDrafts = form.items
        .filter(item => item.serviceId || item.productId)
        .map((item, index) => ({
          index,
          type: item.itemType === "PRODUCT" ? "product" : "service",
          serviceId: item.serviceId || null,
          productId: item.productId || null,
          categoryId: item.categoryId || null,
          name: item.name || "Item",
          qty: Number(item.qty || 1),
          unitPrice: Number(item.unitPrice || 0),
        }));
      const response = await api.post("/owner/referrals/coupons/validate", {
        code,
        branchId: form.branchId,
        customerId: form.customerId || undefined,
        itemDrafts,
      });
      const data = response.data;
      setCouponValidation(data);
      setForm(c => ({ ...c, couponCode: code }));
      setToastMessage({
        type: "success",
        title: "Coupon Applied",
        message: `${data.coupon.title || data.coupon.code} — ${formatMoney(data.totalDiscount)} discount on ${data.eligibleItems.filter(i => i.isEligible).length} eligible item(s).${data.totalPartnerCredits > 0 ? ` Partner earns ${data.totalPartnerCredits.toFixed(1)} credits.` : ""}`,
      });
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to validate coupon.";
      setToastMessage({ type: "error", title: "Coupon Invalid", message: msg });
      setCouponValidation(null);
      setForm(c => ({ ...c, couponCode: "" }));
    } finally {
      setCouponValidating(false);
    }
  };

  const removeCoupon = () => {
    setForm(c => ({ ...c, couponCode: "" }));
    setCouponValidation(null);
    setCouponCodeInput("");
    setToastMessage({ type: "success", title: "Coupon Removed", message: "Coupon has been removed." });
  };

  useEffect(() => {
    let active = true;
    if (!form.customerId) {
      setAffiliateWallet(null);
      return undefined;
    }
    api.get(`/owner/referrals/wallets/${form.customerId}`)
      .then((res) => {
        if (active) setAffiliateWallet(res.data?.wallet || null);
      })
      .catch(() => {
        if (active) setAffiliateWallet(null);
      });
    return () => { active = false; };
  }, [form.customerId]);

  // === Apply Package ===
  const loadCustomerPackagesForRedemption = async () => {
    if (!form.customerId) {
      setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
      return;
    }
    setLoadingCustomerPkgs(true);
    try {
      const response = await api.get(`/owner/customers/${form.customerId}/packages`);
      const activePkgs = (response.data || []).filter(p => p.status === "ACTIVE" && new Date(p.endsAt) > new Date());
      setCustomerPackages(activePkgs);
      if (activePkgs.length === 0) {
        setToastMessage({ type: "error", title: "No Active Packages", message: "No active packages found for this guest." });
      } else {
        setShowApplyPkgRedemptionModal(true);
      }
    } catch (err) {
      setToastMessage({ type: "error", title: "Error", message: formatApiError(err, "Could not load customer packages") });
    } finally {
      setLoadingCustomerPkgs(false);
    }
  };

  const applyPackageService = async (customerPkg, serviceEntry) => {
    const svcId = serviceEntry.serviceId || serviceEntry.service?.id;
    const remaining = (serviceEntry.sessions || 0) - (serviceEntry.sessionsUsed || 0) - form.packageRedemptions.filter(r => r.customerPackageId === customerPkg.id && r.serviceId === svcId).length;
    if (remaining <= 0) {
      setToastMessage({ type: "error", title: "No Sessions Left", message: `No remaining sessions for "${serviceEntry.service?.name || serviceEntry.serviceId}".` });
      return;
    }

    const svcObj = serviceEntry.service || {};
    const matchedItemIndex = form.items.findIndex(item => item.serviceId === svcId);
    let nextItems = [...form.items];

    if (matchedItemIndex >= 0) {
      const item = form.items[matchedItemIndex];
      if (Number(item.unitPrice || 0) <= 0) {
        setToastMessage({ type: "info", title: "Already Applied", message: `"${svcObj.name || serviceEntry.serviceId}" is already free.` });
        return;
      }
      const discountAmt = Number(item.unitPrice || 0);
      nextItems[matchedItemIndex] = {
        ...nextItems[matchedItemIndex],
        unitPrice: 0,
        originalUnitPrice: Number(item.originalUnitPrice || item.unitPrice || 0),
        discountPct: 0,
        discountAmt: discountAmt
      };
    } else {
      nextItems = [
        ...form.items,
        {
          itemType: "SERVICE",
          serviceId: svcId,
          staffUserId: "",
          qty: 1,
          unitPrice: 0,
          originalUnitPrice: toAmount(svcObj.price || 0),
          discountPct: 0,
          discountAmt: toAmount(svcObj.price || 0),
          taxPct: svcObj.taxPct || svcObj.taxRate || 0,
          consumableItems: []
        }
      ];
    }

    setForm(c => ({
      ...c,
      items: nextItems,
      packageRedemptions: [
        ...c.packageRedemptions,
        { customerPackageId: customerPkg.id, serviceId: svcId, sessionsUsed: 1 }
      ]
    }));
    setToastMessage({ type: "success", title: "Package Applied", message: `${svcObj.name || "Service"} applied from package.` });

    try {
      const response = await api.get(`/owner/customers/${form.customerId}/packages`);
      const activePkgs = (response.data || []).filter(p => p.status === "ACTIVE" && new Date(p.endsAt) > new Date());
      setCustomerPackages(activePkgs);
    } catch (_) {}
  };

  const openPackageDetails = async (customerPkg) => {
    if (!customerPkg) return;
    if (!form.customerId) {
      setShowPkgDetailModal(customerPkg);
      return;
    }

    try {
      const response = await api.get(`/owner/customers/${form.customerId}/packages`);
      const packages = Array.isArray(response.data) ? response.data : [];
      const freshPackage = packages.find((pkg) => pkg.id === customerPkg.id) || customerPkg;
      setShowPkgDetailModal(freshPackage);
    } catch (_) {
      setShowPkgDetailModal(customerPkg);
    }
  };

  // === Apply Gift Card ===
  const validateGiftCard = async () => {
    if (!gcRedemptionCode.trim()) {
      setToastMessage({ type: "error", title: "Code Required", message: "Please enter a gift card code." });
      return;
    }
    setGcRedemptionLoading(true);
    setGcRedemptionResult(null);
    try {
      const response = await api.post("/owner/gift-cards/validate", { code: gcRedemptionCode.trim(), customerId: form.customerId || undefined });
      setGcRedemptionResult(response.data);
    } catch (err) {
      setGcRedemptionResult(null);
      setToastMessage({ type: "error", title: "Invalid Gift Card", message: formatApiError(err, "Gift card is invalid or expired.") });
    } finally {
      setGcRedemptionLoading(false);
    }
  };

  const applyGiftCard = () => {
    if (!gcRedemptionResult) return;
    const gcAmount = Number(gcRedemptionResult.balanceAmount || 0);
    const billTotal = totals.total;
    const applyAmount = Math.min(gcAmount, billTotal);
    setForm(c => ({ ...c, giftVoucherCode: gcRedemptionResult.code }));
    setGiftCardDiscount(applyAmount);
    setShowGcRedemptionModal(false);
    setGcRedemptionCode("");
    setToastMessage({ type: "success", title: "Gift Card Applied", message: `${formatMoney(applyAmount)} will be deducted from gift card at checkout.` });
  };

  const removeGiftCard = () => {
    setForm(c => ({ ...c, giftVoucherCode: "" }));
    setGiftCardDiscount(0);
    setGcRedemptionResult(null);
    setGcRedemptionCode("");
  };

  // === Apply Membership ===
  const openApplyMembershipModal = () => {
    if (!form.customerId) {
      setToastMessage({ type: "error", title: "Select Guest", message: "Please select a guest first to apply membership." });
      return;
    }
    const customer = context.customers.find(c => c.id === form.customerId);
    if (!customer?.memberships?.length) {
      setToastMessage({ type: "error", title: "No Membership", message: "This guest does not have any active memberships." });
      return;
    }
    const activeMemberships = customer.memberships.filter(m => m.status === "ACTIVE" && new Date(m.endsAt) > new Date());
    if (!activeMemberships.length) {
      setToastMessage({ type: "error", title: "No Active Membership", message: "This guest does not have any active memberships." });
      return;
    }
    setSelectedMembershipForApply(null);
    setShowApplyMembershipModal(true);
  };

  const selectMembershipForApply = (membership) => {
    setSelectedMembershipForApply(membership);
    setShowApplyMembershipModal(false);
    
    // Prepare items draft
    const eligibleDrafts = form.items.map((item, idx) => {
      let isEligible = false;
      let eligibleAmount = 0;
      if (item.itemType === "SERVICE" && item.serviceId) {
        if (!membership.membershipPlan?.serviceSpecificOnly || membership.membershipPlan?.services?.some(s => s.serviceId === item.serviceId)) {
          isEligible = true;
          eligibleAmount = Number(item.unitPrice || 0) * Number(item.qty || 1);
        }
      }
      return {
        ...item,
        cartIndex: idx,
        isEligible,
        walletDeduction: isEligible ? eligibleAmount : 0,
        apply: isEligible
      };
    });
    setMembershipItemsDraft(eligibleDrafts);
    setShowMembershipItemsModal(true);
  };

  const confirmMembershipItemsApply = () => {
    let totalDeduction = 0;
    const newItems = [...form.items];
    
    membershipItemsDraft.forEach(draft => {
      if (draft.apply && draft.isEligible) {
        const amount = Number(draft.walletDeduction || 0);
        newItems[draft.cartIndex].membershipWalletUsed = amount;
        totalDeduction += amount;
      } else {
        newItems[draft.cartIndex].membershipWalletUsed = 0;
      }
    });

    if (totalDeduction > Number(selectedMembershipForApply?.remainingWalletValue || 0)) {
       setToastMessage({ type: "error", title: "Insufficient Balance", message: "Deduction exceeds remaining wallet balance." });
       return;
    }

    setForm(c => {
      const preservedPaid = (c.payments || []).filter(p => !["WALLET", "BALANCE"].includes(p.mode)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      let newPayments = (c.payments || []).filter(p => p.mode !== "WALLET" && p.mode !== "BALANCE");
      if (totalDeduction > 0) {
        newPayments.push({ mode: "WALLET", amount: totalDeduction, note: `Membership applied` });
      }
      
      const paidSoFar = newPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balanceNeeded = Math.max(0, totals.total - paidSoFar);
      if (balanceNeeded > 0) {
        newPayments.push({ mode: "BALANCE", amount: balanceNeeded, note: "" });
      }

      return {
        ...c,
        items: newItems,
        appliedMembershipId: totalDeduction > 0 ? selectedMembershipForApply.id : "",
        payments: newPayments
      };
    });
    
    setShowMembershipItemsModal(false);
    setToastMessage({ type: "success", title: "Membership Applied", message: `Membership wallet applied successfully.` });
  };

  // === Add Tip ===
  const addTipEntry = () => {
    const amount = Number(tipDraft.amount || 0);
    if (amount <= 0) {
      setToastMessage({ type: "error", title: "Invalid Amount", message: "Tip amount must be greater than zero." });
      return;
    }
    if (!tipDraft.staffId) {
      setToastMessage({ type: "error", title: "Staff Required", message: "Please select a staff member for the tip." });
      return;
    }
    const staffName = (context.staffUsers || []).find(s => s.id === tipDraft.staffId)?.user?.name || "Staff";
    setTipEntries(prev => [...prev, { staffId: tipDraft.staffId, staffName, amount, paymentMode: tipDraft.paymentMode }]);
    setTipDraft({ staffId: "", amount: "", paymentMode: "CASH" });
    setToastMessage({ type: "success", title: "Tip Added", message: `${formatMoney(amount)} tip added for ${staffName}.` });
  };

  const removeTipEntry = (index) => {
    setTipEntries(prev => prev.filter((_, i) => i !== index));
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
        api.get("/owner/service-categories", { params: branchId ? { branchId } : {} })
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
          api.get("/owner/service-categories", { params: form.branchId ? { branchId: form.branchId } : {} })
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
  const affiliateServiceCreditValue = useMemo(() => {
    const value = Number(context.settings?.advancedSettings?.referralSettings?.affiliateServiceCreditValue || 1);
    return value > 0 ? value : 1;
  }, [context.settings]);
  const pkgPaymentTotal = Math.max(0, Number(pkgDraft.price || pkgModalPkg?.price || 0));
  const pkgPaymentOnline = Math.max(0, Math.min(pkgPaymentTotal, Number(pkgDraft.online || 0)));
  const pkgPaymentOffline = Math.max(0, Math.min(pkgPaymentTotal - pkgPaymentOnline, Number(pkgDraft.offline || 0)));
  const pkgPaymentBalance = Math.max(0, Number((pkgPaymentTotal - pkgPaymentOnline - pkgPaymentOffline).toFixed(2)));

  const packageStaffUsers = useMemo(() => {
    const selectedBranchId = form.branchId;
    return (context.staffUsers || []).filter((staffUser) => {
      if (selectedBranchId && staffUser.branchId && staffUser.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [context.staffUsers, form.branchId]);

  const pkgDraftCanSubmit = Boolean(
    pkgModalPkg &&
    pkgDraft.staffId &&
    pkgPaymentTotal > 0 &&
    form.customerId &&
    form.branchId &&
    (pkgModalPkg?.id !== "CUSTOM" || pkgDraft.customServices.length || pkgDraft.customProducts.length)
  );

  useEffect(() => {
    if (!showPkgModal) return;
    setPkgDraft((current) => {
      const total = Math.max(0, Number(current.price || pkgModalPkg?.price || 0));
      const online = clampMoneyInput(current.online, total);
      const offline = clampMoneyInput(current.offline, Math.max(0, total - Number(online || 0)));
      const balance = Math.max(0, Number((total - Number(online || 0) - Number(offline || 0)).toFixed(2)));
      if (String(current.online || "") === String(online || "") && String(current.offline || "") === String(offline || "") && String(current.balance || "") === String(balance)) {
        return current;
      }
      return { ...current, online, offline, balance: String(balance) };
    });
  }, [pkgDraft.price, pkgModalPkg?.price, showPkgModal]);

  useEffect(() => {
    if (context.branches?.length && !form.branchId) {
      const defaultBranch = context.branches.find(b => b.name.toLowerCase().includes("main")) || context.branches[0];
      setForm(f => ({ ...f, branchId: defaultBranch.id }));
    }
  }, [context.branches, form.branchId]);

  useEffect(() => {
    if (selectedBranchId) {
      setForm(prev => ({...prev, branchId: selectedBranchId}));
    }
  }, [selectedBranchId]);

  // Auto-apply advance: when a customer with advance is selected and items exist,
  // auto-fill the ADVANCE payment up to min(advance, total). Only fills if the user
  // hasn't already entered a different non-advance payment.
  useEffect(() => {
    if (!form.customerId) return;
    const customer = context.customers.find(c => c.id === form.customerId);
    if (!customer) return;
    const adv = Number(customer.advanceAmount || 0);
    if (adv <= 0) return;
    // Only auto-apply if there are items and the total > 0
    const itemsCount = (form.items || []).filter(i => i.serviceId || i.productId || i.membershipPlanId || i.packageId || i.giftCardId || i.itemType === "GIFT_CARD").length;
    if (itemsCount === 0) return;
    setForm((current) => {
      // Recompute total from current items to avoid stale closure
      const advancedSettings = context.settings?.advancedSettings && typeof context.settings.advancedSettings === "object" ? context.settings.advancedSettings : {};
      const isInclusive = advancedSettings?.taxMapping?.inclusiveTax === true;
      const subtotal = (current.items || []).reduce((sum, item) => {
        const price = item.unitPrice != null ? Number(item.unitPrice) : Number(getCatalogBasePrice(item) || 0);
        return sum + Number(item.qty || 0) * price;
      }, 0);
      const itemTax = (current.items || []).reduce((sum, item) => {
        const price = item.unitPrice != null ? Number(item.unitPrice) : Number(getCatalogBasePrice(item) || 0);
        const taxPct = Number(item.taxPct || 0);
        const linePreTax = Number(item.qty || 0) * price;
        if (isInclusive && taxPct > 0) {
          return sum + (linePreTax * taxPct) / (100 + taxPct);
        }
        return sum + (linePreTax * taxPct) / 100;
      }, 0);
      const extraTax = Number(current.tax || 0);
      const discount = Number(current.discount || 0);
      const total = subtotal + itemTax + extraTax - discount;
      if (total <= 0) return current;
      // Check existing non-advance payments — if user has already entered CASH/ONLINE/BALANCE, don't auto-apply
      const nonAdvancePayments = (current.payments || []).filter(p => p.mode !== "ADVANCE" && Number(p.amount || 0) > 0);
      if (nonAdvancePayments.length > 0) return current;
      // Check if user has already set an advance amount — if yes, don't override
      const existingAdvance = (current.payments || []).find(p => p.mode === "ADVANCE");
      if (existingAdvance && Number(existingAdvance.amount || 0) > 0) return current;
      // Auto-apply advance up to min(advance, total)
      const useAdv = Math.min(adv, total);
      const newPayments = (current.payments || []).filter(p => p.mode !== "ADVANCE");
      newPayments.push({ mode: "ADVANCE", amount: useAdv, note: "Advance auto-applied" });
      return { ...current, payments: newPayments };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.customerId, context.customers, form.items?.length, context.settings, form.discount]);

  const serviceCategories = useMemo(() => {
    if (!context.serviceCategories) return [];
    return context.serviceCategories;
  }, [context.serviceCategories]);

  const serviceTileGroups = useMemo(() => {
    let list = context.services || [];
    if (posGender) {
      list = list.filter(s => genderMatches(s, posGender));
    }
    if (serviceSearch) {
      list = list.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    }
    if (serviceCategoryFilter) {
      list = list.filter(s => {
        const catId = s.categoryId || s.category?.id || "";
        const parentId = s.category?.parentId || "";
        return catId === serviceCategoryFilter || parentId === serviceCategoryFilter;
      });
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
    if (posGender) {
      list = list.filter(p => genderMatches(p, posGender));
    }
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
    return Object.entries(grouped).map(([title, items]) => ({
      title,
      items: [...items].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    }));
  }, [context.products, productSearch, productCategoryFilter, posGender]);

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
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId || item.giftCardId || item.itemType === "GIFT_CARD");
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
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId || item.giftCardId || item.itemType === "GIFT_CARD");
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
    if (!form.customerId) {
      setStatus({ error: "Please select a guest first.", success: "" });
      setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
      return;
    }
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

  const addQuickPackage = (pkg) => {
    if (!form.customerId) {
      setStatus({ error: "Please select a guest first.", success: "" });
      setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
      return;
    }
    setPkgModalPkg(pkg);
    setPkgDraft({
      staffId: "",
      price: String(pkg.price || 0),
      validityDays: String(pkg.validityDays || 30),
      purchaseDate: new Date().toISOString().slice(0, 10),
      customServices: (pkg.services || []).map(s => ({
        id: s.service?.id || s.serviceId || "",
        name: s.service?.name || "",
        price: s.service?.salesPrice || s.service?.price || 0,
        qty: s.sessions || 1
      })),
      customProducts: [],
      balance: "",
      online: "",
      offline: "",
      remark: ""
    });
    setPkgServiceSearch("");
    setPkgProductSearch("");
    setShowPkgModal(true);
  };

  const handleAddPkgToCart = async () => {
    const pkg = pkgModalPkg;
    const price = Number(pkgDraft.price || pkg?.price || 0);
    if (!pkg) {
      setStatus({ error: "Please select a package first.", success: "" });
      return;
    }
    if (!form.customerId) {
      setStatus({ error: "Please select a guest first.", success: "" });
      return;
    }
    if (!form.branchId) {
      setStatus({ error: "Please select a branch first.", success: "" });
      return;
    }
    if (!pkgDraft.staffId) {
      setStatus({ error: "Please select staff before proceeding.", success: "" });
      return;
    }
    if (price <= 0) {
      setStatus({ error: "Package price must be greater than zero.", success: "" });
      return;
    }
    if (pkg?.id === "CUSTOM" && !pkgDraft.customServices.length && !pkgDraft.customProducts.length) {
      setStatus({ error: "Please add at least one service or product to the custom package.", success: "" });
      return;
    }

    const online = clampMoneyInput(pkgDraft.online, price);
    const offline = clampMoneyInput(pkgDraft.offline, Math.max(0, price - Number(online || 0)));
    const balance = Math.max(0, Number((price - Number(online || 0) - Number(offline || 0)).toFixed(2)));

    const totalPaid = Number(online || 0) + Number(offline || 0);
    if (price > 0 && totalPaid <= 0) {
      setStatus({ error: "Please enter at least one payment amount (Online or Offline) before purchasing the package.", success: "" });
      return;
    }

    if (totalPaid > price + 0.01) {
      setStatus({ error: "Payment amount exceeds package price. Please check the amounts.", success: "" });
      return;
    }

    // Ensure total payments + balance equals exactly the price
    const totalPaymentsCovered = Number(online) + Number(offline) + Number(balance);
    if (Math.abs(totalPaymentsCovered - price) > 0.01) {
      setStatus({ error: `Payment allocation error. Expected total: ${price}, actual: ${totalPaymentsCovered.toFixed(2)}`, success: "" });
      return;
    }

    setSubmittingPkg(true);
    setStatus({ error: "", success: "" });

    const finalPayments = [];
    if (Number(online) > 0) {
      finalPayments.push({
        mode: "ONLINE",
        amount: Number(online),
        note: `Online payment for package: ${pkg?.name || "Custom Package"}`
      });
    }
    if (Number(offline) > 0) {
      finalPayments.push({
        mode: "CASH",
        amount: Number(offline),
        note: `Offline payment for package: ${pkg?.name || "Custom Package"}`
      });
    }

    const payload = {
      customerId: form.customerId,
      branchId: form.branchId,
      appliedMembershipId: "",
      discount: 0,
      tax: 0,
      couponCode: "",
      giftVoucherCode: "",
      loyaltyPointsUsed: 0,
      notes: pkgDraft.remark || "",
      items: [
        {
          itemType: "PACKAGE",
          packageId: pkg?.id === "CUSTOM" ? "CUSTOM" : pkg?.id || "CUSTOM",
          name: pkg?.name || "Custom Package",
          staffUserId: pkgDraft.staffId || "",
          staffUserSalonId: pkgDraft.staffId || "",
          qty: 1,
          unitPrice: price,
          originalUnitPrice: price,
          discountPct: 0,
          discountAmt: 0,
          taxPct: 0,
          validityDays: Number(pkgDraft.validityDays || pkg?.validityDays || 30),
          purchaseDate: pkgDraft.purchaseDate || new Date().toISOString().slice(0, 10),
          customServices: (pkgDraft.customServices || []).map(s => ({
            id: s.id || s.serviceId || "",
            serviceId: s.id || s.serviceId || "",
            name: s.name || "",
            price: Number(s.price || 0),
            qty: Number(s.qty || 1)
          })),
          customProducts: (pkgDraft.customProducts || []).map(p => ({
            id: p.id || p.productId || "",
            productId: p.id || p.productId || "",
            name: p.name || "",
            price: Number(p.price || 0),
            qty: Number(p.qty || 1)
          })),
          paymentBreakup: {
            balance: Number(balance),
            online: Number(online),
            offline: Number(offline)
          },
          remark: pkgDraft.remark || "",
          isCustom: pkg?.id === "CUSTOM" || !pkg
        }
      ],
      packageRedemptions: [],
      payments: finalPayments,
      sendFeedbackMessage: form.sendFeedbackMessage !== false,
      sendInvoiceMessage: form.sendInvoiceMessage !== false
    };

    try {
      const response = await api.post("/owner/pos/invoices", payload);
      setResult(response.data);
      setStatus({ error: "", success: `Invoice ${response.data.invoiceNumber} created and completed successfully.` });
      
      setCreatedInvoice(response.data);
      setShowSuccessModal(true);

      // Reset main POS form
      setGuestSearchInput("");
      setCouponValidation(null);
      setCouponCodeInput("");
      setForm(current => ({
        customerId: "",
        branchId: current.branchId,
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
      }));

      setGiftCardDiscount(0);

      // Reset package modal draft values
      setPkgDraft({
        staffId: "",
        price: "",
        validityDays: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        customServices: [],
        customProducts: [],
        balance: "",
        online: "",
        offline: "",
        remark: ""
      });

      // Reload POS context
      await loadContext("", form.branchId);
      
      // Close modal
      setShowPkgModal(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create package purchase invoice"), success: "" });
    } finally {
      setSubmittingPkg(false);
    }
  };

  const handleBuyMembershipDirect = async () => {
    const mem = memModalMem;
    if (!mem || !memDraft.staffId) {
      setStatus({ error: "Please select a membership and staff.", success: "" });
      return;
    }
    if (!form.customerId) {
      setStatus({ error: "Guest selection is required before purchase. Please select a guest on the main POS screen.", success: "" });
      return;
    }
    if (!form.branchId) {
      setStatus({ error: "Branch selection is required before purchase.", success: "" });
      return;
    }

    const price = Number(memDraft.price || 0);
    const online = Number(memDraft.online || 0);
    const offline = Number(memDraft.offline || 0);
    const balance = Number(memDraft.balance || 0);

    const totalPaid = online + offline;
    if (totalPaid > price + 0.01) {
      setStatus({ error: "Payment amount exceeds membership price. Please check the amounts.", success: "" });
      return;
    }

    const totalPaymentsCovered = online + offline + balance;
    if (Math.abs(totalPaymentsCovered - price) > 0.01) {
      setStatus({ error: `Payment allocation error. Expected total: ${price}, actual: ${totalPaymentsCovered.toFixed(2)}`, success: "" });
      return;
    }

    setSubmittingMem(true);
    setStatus({ error: "", success: "" });

    const finalPayments = [];
    if (online > 0) {
      finalPayments.push({ mode: "ONLINE", amount: online, note: `Online payment for membership: ${mem.name}` });
    }
    if (offline > 0) {
      finalPayments.push({ mode: "CASH", amount: offline, note: `Cash payment for membership: ${mem.name}` });
    }

    const payload = {
      customerId: form.customerId,
      branchId: form.branchId,
      appliedMembershipId: "",
      discount: 0,
      tax: 0,
      couponCode: "",
      giftVoucherCode: "",
      loyaltyPointsUsed: 0,
      notes: memDraft.remark || "",
      items: [
        {
          itemType: "MEMBERSHIP",
          membershipPlanId: mem.id === "CUSTOM" ? "CUSTOM" : mem.id || "CUSTOM",
          name: mem.name || "Custom Membership",
          staffUserId: memDraft.staffId || "",
          staffUserSalonId: memDraft.staffId || "",
          qty: 1,
          unitPrice: price,
          originalUnitPrice: price,
          discountPct: 0,
          discountAmt: 0,
          taxPct: 0,
          validityDays: Number(memDraft.validityDays || 30),
          purchaseDate: memDraft.purchaseDate || new Date().toISOString().slice(0, 10),
          customServices: (memDraft.customServices || []).map(s => ({
            id: s.id || s.serviceId || "",
            serviceId: s.id || s.serviceId || "",
            name: s.name || "",
            price: Number(s.price || 0),
            qty: Number(s.qty || 1)
          })),
          paymentBreakup: {
            balance: balance,
            online: online,
            offline: offline
          },
          remark: memDraft.remark || "",
          isCustom: mem?.id === "CUSTOM" || !mem
        }
      ],
      packageRedemptions: [],
      payments: finalPayments,
      sendFeedbackMessage: form.sendFeedbackMessage !== false,
      sendInvoiceMessage: form.sendInvoiceMessage !== false
    };

    try {
      const response = await api.post("/owner/pos/invoices", payload);
      setResult(response.data);
      setStatus({ error: "", success: `Invoice ${response.data.invoiceNumber} created successfully.` });
      
      setCreatedInvoice(response.data);
      setShowSuccessModal(true);

      // Reset main POS form
      setGuestSearchInput("");
      setCouponValidation(null);
      setCouponCodeInput("");
      setForm(current => ({
        ...current,
        customerId: "",
        items: [emptyServiceItem],
        packageRedemptions: [],
        payments: [emptyPayment]
      }));
      setGiftCardDiscount(0);

      setShowMemModal(false);
      await loadContext("", form.branchId);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create membership purchase invoice"), success: "" });
    } finally {
      setSubmittingMem(false);
    }
  };

  const handleAddGiftCard = async () => {
    if (!form.customerId) {
      setStatus({ error: "Please select a guest to purchase the gift card.", success: "" });
      return;
    }
    const gc = gcModalGc;
    const price = Number(gcDraft.price || 0);
    const online = Number(gcDraft.online || 0);
    const offline = Number(gcDraft.offline || 0);
    const balance = Math.max(0, price - online - offline);

    const totalPaid = online + offline;
    if (totalPaid > price + 0.01) {
      setStatus({ error: "Payment amount exceeds gift card price. Please check the amounts.", success: "" });
      return;
    }

    setSubmittingGc(true);
    setStatus({ error: "", success: "" });

    const finalPayments = [];
    if (online > 0) {
      finalPayments.push({ mode: "ONLINE", amount: online, note: `Online payment for gift card: ${gc.name}` });
    }
    if (offline > 0) {
      finalPayments.push({ mode: "CASH", amount: offline, note: `Cash payment for gift card: ${gc.name}` });
    }

    const payload = {
      customerId: form.customerId,
      branchId: form.branchId,
      appliedMembershipId: "",
      discount: 0,
      tax: 0,
      couponCode: "",
      giftVoucherCode: "",
      loyaltyPointsUsed: 0,
      notes: gcDraft.remark || "",
      items: [
        {
          itemType: "GIFT_CARD",
          giftCardId: gc?.id === "CUSTOM" ? "" : (gc?.id || ""),
          name: gc?.name || "Gift Card",
          staffUserId: gcDraft.staffId || "",
          staffUserSalonId: gcDraft.staffId || "",
          qty: 1,
          unitPrice: price,
          originalUnitPrice: price,
          discountPct: 0,
          discountAmt: 0,
          taxPct: 0,
          validityDays: Number(gcDraft.validityDays || 30),
          purchaseDate: gcDraft.purchaseDate || new Date().toISOString().slice(0, 10),
          gcCode: gcDraft.code || undefined,
          paymentBreakup: {
            balance: balance,
            online: online,
            offline: offline
          },
          remark: gcDraft.remark || "",
          isCustom: gc?.id === "CUSTOM" || !gc
        }
      ],
      packageRedemptions: [],
      payments: finalPayments,
      sendFeedbackMessage: form.sendFeedbackMessage !== false,
      sendInvoiceMessage: form.sendInvoiceMessage !== false
    };

    try {
      const response = await api.post("/owner/pos/invoices", payload);
      setResult(response.data);
      setStatus({ error: "", success: `Invoice ${response.data.invoiceNumber} created successfully.` });
      
      setCreatedInvoice(response.data);
      setShowSuccessModal(true);

      // Reset main POS form
      setGuestSearchInput("");
      setCouponValidation(null);
      setCouponCodeInput("");
      setForm(current => ({
        ...current,
        customerId: "",
        items: [emptyServiceItem],
        packageRedemptions: [],
        payments: [emptyPayment]
      }));
      setGiftCardDiscount(0);

      setShowGcModal(false);
      await loadContext("", form.branchId);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create gift card invoice"), success: "" });
    } finally {
      setSubmittingGc(false);
    }
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
    // Note: form.tax is part of the API payload (extra tax) but always 0 in this UI; per-item taxPct handles all tax.
    const discount = Number(form.discount || 0);
    const couponDiscount = Number(couponValidation?.totalDiscount || 0);
    const gcDiscount = Number(giftCardDiscount || 0);
    const membershipWalletUsed = form.items.reduce((sum, item) => sum + Number(item.membershipWalletUsed || 0), 0);
    const total = subtotal + itemTax - discount - couponDiscount - gcDiscount - membershipWalletUsed;
    const paid = form.payments.filter(p => p.mode !== "BALANCE" && p.mode !== "WALLET").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return { subtotal, itemTax, total, paid, due: Math.max(0, total - paid), couponDiscount, gcDiscount, membershipWalletUsed };
  }, [form, getCatalogBasePrice, context.settings, couponValidation, giftCardDiscount]);

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
    const activeItems = form.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId || item.giftCardId || item.itemType === "GIFT_CARD");
    if (!activeItems.length) return "Please add at least one item to the invoice.";
    for (const item of activeItems) {
      if (item.itemType === "SERVICE") {
        if (!item.serviceId) return "Please select a valid service.";
        if (!item.staffUserId) return "Please assign a staff member for each service.";
      }
      if (item.itemType === "PRODUCT" && !item.productId) return "Please select a valid product.";
      if (item.itemType === "MEMBERSHIP" && !item.membershipPlanId) return "Please select a membership plan.";
      if (item.itemType === "PACKAGE" && !item.packageId) return "Please select a package.";
      if (item.itemType === "GIFT_CARD" && !item.giftCardId) return "Please select a gift card.";
      if (Number(item.qty || 0) <= 0) return "Quantity must be greater than zero.";
    }
    if (mode === "complete") {
      const grandTotal = Math.max(0, totals.total);
      if (grandTotal > 0) {
        const totalPaid = form.payments.filter(p => p.mode !== "BALANCE").reduce((sum, p) => sum + Number(p.amount || 0), 0);
        if (totalPaid <= 0) return "Please enter at least one payment amount (Cash or Online) before completing the invoice.";
        if (totalPaid > grandTotal + 0.01) return "Payment amount exceeds invoice total. Please check the amounts.";
      }
    }
    return "";
  }, [form, totals.total]);

  const buildInvoicePayload = useCallback((mode) => {
    const activeItems = form.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId || item.giftCardId || item.itemType === "GIFT_CARD");
    
    let finalPayments = [];
    let affiliateCreditRedemptions = [];
    if (mode === "complete") {
      affiliateCreditRedemptions = form.payments
        .filter((payment) => payment.mode === "AFFILIATE_CREDIT" && Number(payment.amount) > 0)
        .map((payment) => ({
          partnerId: form.customerId,
          amount: Number(payment.amount),
          credits: Number((Number(payment.amount) / affiliateServiceCreditValue).toFixed(2)),
          note: payment.note || "POS service redemption"
        }));
      finalPayments = form.payments.filter((payment) => !["BALANCE", "AFFILIATE_CREDIT"].includes(payment.mode) && Number(payment.amount) > 0).map((payment) => ({
        ...payment,
        amount: Number(payment.amount)
      }));
    }

    return {
      ...form,
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      loyaltyPointsUsed: Number(form.loyaltyPointsUsed || 0),
      consumableOverrides,
      items: activeItems.map((item) => ({
        ...item,
        qty: Number(item.qty || 1),
        taxPct: Number(item.taxPct || 0)
      })),
      packageRedemptions: form.packageRedemptions.map((item) => ({
        ...item,
        sessionsUsed: Number(item.sessionsUsed || 1)
      })),
      affiliateCreditRedemptions,
      payments: finalPayments
    };
  }, [affiliateServiceCreditValue, form]);

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
    if (submitting) return;
    setStatus({ error: "", success: "" });
    const validationError = validateBeforeSubmit(mode);
    if (validationError) {
      setToastMessage({ type: "error", title: "Validation Failed", message: validationError });
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post("/owner/pos/invoices", buildInvoicePayload(mode));
      setResult(response.data);
      setToastMessage({ type: "success", title: "Invoice Created", message: `${response.data.invoiceNumber} ${mode === "complete" ? "created & completed" : "created"}.` });
      
      const invoiceId = response.data.id;
      let tipErrors = [];
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
            tipErrors.push(tip.staffName || "Staff");
          }
        }
      }
      setTipEntries([]);
      if (tipErrors.length > 0) {
        setToastMessage({ type: "error", title: "Tip Failed", message: `Tip could not be saved for: ${tipErrors.join(", ")}. Invoice was created successfully.` });
      }

      if (mode === "complete") {
        setCreatedInvoice(response.data);
        setShowSuccessModal(true);
      }

      setGuestSearchInput("");
      setCouponValidation(null);
      setCouponCodeInput("");
      setForm(current => ({
        customerId: "",
        branchId: current.branchId,
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
      }));
      setGiftCardDiscount(0);
      await loadContext("", form.branchId);
    } catch (error) {
      setToastMessage({ type: "error", title: "Invoice Failed", message: formatApiError(error, "Could not create invoice") });
    } finally {
      setSubmitting(false);
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
      const res = await api.post("/owner/customers", { ...newGuestForm, branchId: form.branchId || undefined });
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
          <button className="pos-top-tab" onClick={() => {
            if (!form.customerId) {
              setStatus({ error: "Please select a guest first.", success: "" });
              setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
              return;
            }
            setPkgModalPkg(null);
            setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [], customProducts: [], balance: "", online: "", offline: "", remark: "" });
            setShowPkgModal(true);
          }}>Add Package</button>
          <button className="pos-top-tab" onClick={() => {
            if (!form.customerId) {
              setStatus({ error: "Please select a guest first.", success: "" });
              setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
              return;
            }
            setMemModalMem(null);
            setMemDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [] });
            setShowMemModal(true);
          }}>Add Membership</button>
          <button className="pos-top-tab" onClick={() => {
            if (!form.customerId) {
              setStatus({ error: "Please select a guest first.", success: "" });
              setToastMessage({ type: "error", title: "Guest Required", message: "Please select a guest first." });
              return;
            }
            setGcModalGc(null);
            setGcDraft({ staffId: "", price: "", validityDays: "30", purchaseDate: new Date().toISOString().slice(0,10) });
            setShowGcModal(true);
          }}>Add Gift Card</button>
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
                          {product.featured && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 4, fontWeight: 700, lineHeight: "14px" }}>★</div>}
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
              const cartPackage = form.items.find(i => i.itemType === 'PACKAGE');
              const dueBal = customer.invoices?.filter(inv => inv.status === 'UNPAID' || inv.status === 'PARTIAL').reduce((sum, inv) => sum + Number(inv.balanceAmount || 0), 0) || 0;
              const standaloneAdvance = Number(customer.advanceAmount || 0);
              
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
                      <div><strong style={{color:"#0f172a"}}>Adv :</strong> {standaloneAdvance > 0 ? <span style={{color: "#10b981", fontWeight: 700}}>{formatMoney(Number(standaloneAdvance.toFixed(0)))}</span> : "NA"}</div>
                      <div><strong style={{color:"#0f172a"}}>Package :</strong> {activePackage ? <span style={{color:"#2563eb", cursor:"pointer"}} onClick={() => void openPackageDetails(activePackage)}>{activePackage?.package?.name || "NA"}</span> : cartPackage ? <span style={{color:"#10b981", fontWeight:"600"}}>{cartPackage.name} (In Cart)</span> : "NA"} {activePackage && <span title="Package Details" onClick={() => void openPackageDetails(activePackage)} style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:"#e2e8f0", color:"#475569", fontSize:11, fontWeight:700, cursor:"pointer", marginLeft:4, verticalAlign:"middle"}}>&#9432;</span>}</div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
                      <div><strong style={{color:"#0f172a"}}>Membership :</strong> {activeMembership?.membershipPlan?.name || "NA"}</div>
                    </div>
                    <div style={{display: "flex", alignItems: "flex-start"}}>
                      <button style={{background: "none", border: "none", cursor: "pointer", color: "var(--accent, #3b82f6)"}} onClick={() => window.open(`/admin/customers/${customer.id}`, '_blank')}>
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
                    if (!item.serviceId && !item.productId && !item.membershipPlanId && !item.packageId && !item.giftCardId && item.itemType !== "GIFT_CARD") return null;
                    const baseObj = item.itemType === "PRODUCT"
                      ? productLookup[item.productId]
                      : item.itemType === "MEMBERSHIP"
                        ? membershipLookup[item.membershipPlanId]
                        : item.itemType === "PACKAGE"
                          ? packageLookup[item.packageId]
                          : item.itemType === "GIFT_CARD"
                            ? { name: item.name || "Gift Card" }
                            : serviceLookup[item.serviceId];
                    if (!baseObj) return null;
                    const basePrice = getCatalogBasePrice(item);
                    const originalPrice = basePrice;
                    const discountedPrice = item.unitPrice != null ? toAmount(item.unitPrice) : basePrice;
                    const qty = Number(item.qty) || 1;
                    const subTotal = discountedPrice * qty;
                    const tax = (subTotal * Number(item.taxPct || 0)) / 100;
                    const total = subTotal + tax;
                    return (
                      <tr key={index}>
                        <td style={{ color: "#334155" }}>
                          <div style={{ fontWeight: 600 }}>{baseObj.name}</div>
                          {couponValidation?.eligibleItems?.find(ei => ei.index === index && ei.isEligible) && (
                            <span style={{ display: "inline-block", marginTop: 2, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#dcfce7", color: "#166534", whiteSpace: "nowrap" }}>
                              {couponValidation.coupon.code}
                            </span>
                          )}
                          {item.itemType === 'SERVICE' && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                              {(serviceLookup[item.serviceId]?.consumables || baseObj.consumables || [])?.map((c, ci) => {
                                const overrideKey = `${item.serviceId}:${c.productId}`;
                                const currentVal = consumableOverrides[overrideKey] !== undefined ? consumableOverrides[overrideKey] : c.reqdQty;
                                const unit = c.product?.unit || (c.product?.productType === 'CONSUMABLE' ? 'ml' : 'pcs');
                                return (
                                  <div key={ci} style={{ fontSize: 11, color: "#334155", display: "flex", alignItems: "center", gap: 4, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                                    <span style={{ color: "#2563eb", fontWeight: 600 }}>🧪 {c.product?.name || "Consumable"}:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentVal}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setConsumableOverrides(prev => ({ ...prev, [overrideKey]: val }));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ width: 44, padding: "1px 3px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 11, textAlign: "center", fontWeight: 700, background: "#fff" }}
                                      title="Edit quantity of consumable used for this client"
                                    />
                                    <span style={{ fontWeight: 600, color: "#64748b" }}>{unit}</span>
                                  </div>
                                );
                              })}
                              {item.consumableItems?.map((ci, cidx) => (
                                <div key={`extra-${cidx}`} style={{ fontSize: 11, color: "#16a34a", display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                                  <span style={{ fontWeight: 600 }}>➕ {ci.name}:</span>
                                  <span style={{ fontWeight: 700 }}>{ci.qty} {ci.unit || 'pcs'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
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
                            value={item.itemType === "MEMBERSHIP" || item.itemType === "PACKAGE" || item.itemType === "GIFT_CARD" ? 1 : item.qty}
                            disabled={item.itemType === "MEMBERSHIP" || item.itemType === "PACKAGE" || item.itemType === "GIFT_CARD"}
                            onChange={(e) => updateItem(index, { qty: Number(e.target.value || 1) })}
                          />
                        </td>
                        <td>{originalPrice.toFixed(0)}</td>
                        <td>{subTotal.toFixed(0)}</td>
                        <td>
                          <input
                            className="pos-cart-input"
                            style={{ width: 50 }}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discountPct === 0 ? "" : (item.discountPct ?? "")}
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
                            value={item.discountAmt === 0 ? "" : (item.discountAmt ?? "")}
                            onChange={(e) => updateItem(index, applyItemDiscountPatch(item, { discountAmt: e.target.value }))}
                          />
                        </td>
                        <td>{tax.toFixed(0)}</td>
                        <td>{Math.max(0, total - Number(item.membershipWalletUsed || 0)).toFixed(0)}</td>
                        <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {item.itemType === "SERVICE" && (
                            <button type="button" title="Update Service Reminder" onClick={() => { setShowReminderModal(true); setReminderModalDraft({ index, serviceId: item.serviceId, serviceName: baseObj.name, reminderDays: String(baseObj.serviceRemainderDays || 0) }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
                              <AlarmClock size={20} />
                            </button>
                          )}
                          {(item.itemType === "SERVICE" || item.itemType === "PRODUCT") && (
                            <button type="button" title="Mark as Complimentary" onClick={() => {
                              const isGift = !item.isGift;
                              updateItem(index, isGift ? { isGift, discountPct: 100, discountAmt: 0 } : { isGift, discountPct: 0 });
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: item.isGift ? '#3b82f6' : '#94a3b8' }}>
                              <Gift size={20} />
                            </button>
                          )}
                          {item.itemType === "SERVICE" && (
                            <button type="button" title="Add Consumables" onClick={() => openConsumableModal(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: item.consumableItems?.length ? '#16a34a' : '#3b82f6' }}>
                              <Droplet size={20} />
                            </button>
                          )}
                          <button type="button" className="pos-cart-remove" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }} onClick={() => setForm(c => {
                            const removedItem = c.items[index];
                            const nextItems = c.items.filter((_, i) => i !== index);
                            let nextRedemptions = c.packageRedemptions;
                            if (removedItem && removedItem.unitPrice === 0 && removedItem.itemType === "SERVICE") {
                              const matchedRedemptionIdx = c.packageRedemptions.findIndex(r => r.serviceId === removedItem.serviceId);
                              if (matchedRedemptionIdx !== -1) {
                                nextRedemptions = c.packageRedemptions.filter((_, i) => i !== matchedRedemptionIdx);
                              }
                            }
                            return { ...c, items: nextItems, packageRedemptions: nextRedemptions };
                          })}><X size={20} /></button>
                        </td>
                      </tr>
                    );
                  })}
                   {form.items.filter(item => item.serviceId || item.productId || item.membershipPlanId || item.packageId || item.giftCardId || item.itemType === "GIFT_CARD").length === 0 && (
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
              <div className="pos-grand-total" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, width: "100%" }}>
                {(() => {
                  const advancePayment = (form.payments || []).find(p => p.mode === "ADVANCE");
                  const advanceUsed = Number(advancePayment?.amount || 0);
                  const hasAdvance = advanceUsed > 0;
                  if (hasAdvance) {
                    const due = Math.max(0, totals.total - totals.paid);
                    return (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#64748b" }}>
                          <span>Subtotal:</span>
                          <span style={{ textDecoration: "line-through" }}>{formatMoney(totals.total.toFixed(0))}</span>
                          <span style={{ background: "#d1fae5", color: "#065f46", fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span>−</span>Advance: {formatMoney(advanceUsed.toFixed(0))}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Payable:</span>
                          <strong style={{ color: due === 0 ? "#10b981" : "#0f172a", fontSize: 18 }}>{formatMoney(due.toFixed(0))}</strong>
                          {due === 0 && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, background: "#d1fae5", padding: "2px 8px", borderRadius: 10 }}>FULLY PAID VIA ADVANCE</span>}
                        </div>
                      </>
                    );
                  }
                  return (
                    <div>
                      {totals.couponDiscount > 0 && <div style={{ fontSize: 12, color: "#2563eb", marginBottom: 2 }}>Coupon: −{formatMoney(totals.couponDiscount.toFixed(0))}</div>}
                      {totals.gcDiscount > 0 && <div style={{ fontSize: 12, color: "#7c3aed", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>Gift Card: −{formatMoney(totals.gcDiscount.toFixed(0))} <button type="button" onClick={removeGiftCard} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, padding: 0, fontWeight: 700 }}>Remove</button></div>}
                      {Number(form.discount || 0) > 0 && <div style={{ fontSize: 12, color: "#16a34a", marginBottom: 2 }}>Discount: −{formatMoney(Number(form.discount || 0).toFixed(0))}</div>}
                      Grand Total <strong>{formatMoney(totals.total.toFixed(0))}</strong>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pos-instruction-row">
              <input placeholder="Add Order Instruction (Optional, Max 500 Characters)" value={form.notes} onChange={(e) => setForm(c => ({ ...c, notes: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 0" }}>
              <button type="button" onClick={openApplyMembershipModal} style={{ padding: "8px 18px", background: "#fff", border: "1px solid var(--accent, #3b82f6)", borderRadius: 20, cursor: "pointer", fontWeight: 600, color: "var(--accent, #3b82f6)", fontSize: 13, whiteSpace: "nowrap" }}>Apply Membership</button>
              <button type="button" onClick={openDiscountModal} style={{ padding: "8px 18px", background: "#fff", border: "1px solid var(--accent, #3b82f6)", borderRadius: 20, cursor: "pointer", fontWeight: 600, color: "var(--accent, #3b82f6)", fontSize: 13, whiteSpace: "nowrap" }}>Apply Discount</button>
              <button type="button" onClick={loadCustomerPackagesForRedemption} disabled={loadingCustomerPkgs} style={{ padding: "8px 18px", background: "#fff", border: "1px solid var(--accent, #3b82f6)", borderRadius: 20, cursor: loadingCustomerPkgs ? "not-allowed" : "pointer", fontWeight: 600, color: "var(--accent, #3b82f6)", fontSize: 13, whiteSpace: "nowrap", opacity: loadingCustomerPkgs ? 0.6 : 1 }}>{loadingCustomerPkgs ? "Loading..." : "Apply Package"}</button>
              <button type="button" onClick={() => { setGcRedemptionCode(""); setGcRedemptionResult(null); setShowGcRedemptionModal(true); }} style={{ padding: "8px 18px", background: "#fff", border: "1px solid var(--accent, #3b82f6)", borderRadius: 20, cursor: "pointer", fontWeight: 600, color: "var(--accent, #3b82f6)", fontSize: 13, whiteSpace: "nowrap" }}>Apply Gift Card</button>
              <button type="button" onClick={() => setShowTipModal(true)} style={{ padding: "8px 18px", background: "#fff", border: "1px solid var(--accent, #3b82f6)", borderRadius: 20, cursor: "pointer", fontWeight: 600, color: "var(--accent, #3b82f6)", fontSize: 13, whiteSpace: "nowrap" }}>Add Tip</button>
            </div>

            {form.couponCode && couponValidation ? (
              <div style={{ margin: "4px 0 8px", padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e40af" }}>
                    Coupon: {couponValidation.coupon.code}
                    {couponValidation.coupon.title ? ` — ${couponValidation.coupon.title}` : ""}
                  </span>
                  <button type="button" onClick={removeCoupon} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0 }}>Remove</button>
                </div>
                <div style={{ fontSize: 12, color: "#334155" }}>
                  {couponValidation.coupon.discountType === "PERCENT"
                    ? `${couponValidation.coupon.discountValue}% off`
                    : `${formatMoney(couponValidation.coupon.discountValue)} off`} — Eligible: {couponValidation.eligibleItems.filter(i => i.isEligible).length} item(s)
                </div>
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {couponValidation.eligibleItems
                    .filter((item) => item.isEligible && Number(item.discount || 0) > 0)
                    .map((item) => (
                      <div key={`${item.index}-${item.serviceId || item.productId || item.name}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, color: "#1d4ed8", background: "#dbeafe", borderRadius: 6, padding: "5px 8px" }}>
                        <span>{item.name} x{item.qty}</span>
                        <strong>-{formatMoney(item.discount)}</strong>
                      </div>
                    ))}
                  {Number(couponValidation.totalDiscount || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "#0f172a", fontWeight: 700, borderTop: "1px solid #bfdbfe", paddingTop: 6 }}>
                      <span>Coupon discount total</span>
                      <span>-{formatMoney(couponValidation.totalDiscount)}</span>
                    </div>
                  )}
                </div>
                {couponValidation.totalPartnerCredits > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                    Partner earns {couponValidation.totalPartnerCredits.toFixed(2)} credits — {couponValidation.partnerCreditNote}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, margin: "4px 0 8px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none" }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponValidating || !couponCodeInput.trim()}
                  style={{ padding: "8px 16px", background: "var(--button-bg-solid, #0f172a)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: couponValidating || !couponCodeInput.trim() ? "not-allowed" : "pointer", opacity: couponValidating || !couponCodeInput.trim() ? 0.6 : 1, whiteSpace: "nowrap" }}
                >
                  {couponValidating ? "Checking..." : "Apply Coupon"}
                </button>
              </div>
            )}

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
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Click amount field to auto-fill remaining balance)</span>
              </div>
              <div className="pos-payment-grid">
                {form.payments.find(p => p.mode === "WALLET") && (
                  <div className="pos-payment-input" style={{ gridColumn: "1 / -1" }}>
                    <label><svg width="16" height="16" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Membership</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="number" readOnly value={form.payments.find((payment) => payment.mode === "WALLET")?.amount || ""} style={{ background: "#f1f5f9", cursor: "not-allowed", flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                      <button type="button" onClick={() => {
                        setForm(c => {
                          const newPayments = (c.payments || []).filter(p => p.mode !== "WALLET");
                          const newItems = (c.items || []).map(item => ({ ...item, membershipWalletUsed: 0 }));
                          
                          const paidSoFar = newPayments.filter(p => p.mode !== "BALANCE").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                          const balanceNeeded = Math.max(0, totals.total - paidSoFar);
                          const balanceEntry = newPayments.find(p => p.mode === "BALANCE");
                          if (balanceEntry) {
                            balanceEntry.amount = balanceNeeded;
                          } else if (balanceNeeded > 0) {
                            newPayments.push({ mode: "BALANCE", amount: balanceNeeded, note: "" });
                          }

                          return { ...c, payments: newPayments, items: newItems, appliedMembershipId: "" };
                        });
                      }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700, padding: "0 8px", fontSize: 13 }}>Remove</button>
                    </div>
                  </div>
                )}
                <div className="pos-payment-input">
                  <label><svg width="16" height="16" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Online</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "ONLINE")?.amount || ""} onFocus={() => {
                    setForm((current) => {
                      const preservedPayments = (current.payments || []).filter(p => !["ONLINE", "CASH", "BALANCE", "WALLET"].includes(p.mode));
                      const preservedPaid = preservedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const maxOnline = Math.max(0, totals.total - preservedPaid);
                      let newPayments = (current.payments || []).filter(p => p.mode !== "ONLINE" && p.mode !== "CASH" && p.mode !== "BALANCE");
                      newPayments.push({ mode: "ONLINE", amount: maxOnline, note: "" });
                      const remainingAfter = Math.max(0, totals.total - preservedPaid - maxOnline);
                      if (remainingAfter > 0) {
                        newPayments.push({ mode: "BALANCE", amount: remainingAfter, note: "" });
                      }
                      return { ...current, payments: newPayments };
                    });
                  }} onChange={(e) => {
                    const preservedPaid = (form.payments || []).filter(p => !["ONLINE", "BALANCE", "WALLET"].includes(p.mode)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                    const maxOnline = Math.max(0, totals.total - preservedPaid);
                    const amount = Math.min(Number(e.target.value) || 0, maxOnline);
                    setForm((current) => {
                      const newPayments = (current.payments || []).filter(p => p.mode !== "ONLINE");
                      newPayments.push({ mode: "ONLINE", amount, note: "" });
                      const paidSoFar = newPayments.filter(p => p.mode !== "BALANCE" && p.mode !== "WALLET").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const balanceNeeded = Math.max(0, totals.total - paidSoFar);
                      const balanceEntry = newPayments.find(p => p.mode === "BALANCE");
                      if (balanceEntry) {
                        balanceEntry.amount = balanceNeeded;
                      } else if (balanceNeeded > 0) {
                        newPayments.push({ mode: "BALANCE", amount: balanceNeeded, note: "" });
                      }
                      return { ...current, payments: newPayments };
                    });
                  }} />
                </div>
                <div className="pos-payment-input">
                  <label><svg width="16" height="16" style={{ color: "#64748b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Cash</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "CASH")?.amount || ""} onFocus={() => {
                    setForm((current) => {
                      const preservedPayments = (current.payments || []).filter(p => !["ONLINE", "CASH", "BALANCE", "WALLET"].includes(p.mode));
                      const preservedPaid = preservedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const maxCash = Math.max(0, totals.total - preservedPaid);
                      let newPayments = (current.payments || []).filter(p => p.mode !== "ONLINE" && p.mode !== "CASH" && p.mode !== "BALANCE");
                      newPayments.push({ mode: "CASH", amount: maxCash, note: "" });
                      const remainingAfter = Math.max(0, totals.total - preservedPaid - maxCash);
                      if (remainingAfter > 0) {
                        newPayments.push({ mode: "BALANCE", amount: remainingAfter, note: "" });
                      }
                      return { ...current, payments: newPayments };
                    });
                  }} onChange={(e) => {
                    const preservedPaid = (form.payments || []).filter(p => !["CASH", "BALANCE", "WALLET"].includes(p.mode)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                    const maxCash = Math.max(0, totals.total - preservedPaid);
                    const amount = Math.min(Number(e.target.value) || 0, maxCash);
                    setForm((current) => {
                      const newPayments = (current.payments || []).filter(p => p.mode !== "CASH");
                      newPayments.push({ mode: "CASH", amount, note: "" });
                      const paidSoFar = newPayments.filter(p => p.mode !== "BALANCE" && p.mode !== "WALLET").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const balanceNeeded = Math.max(0, totals.total - paidSoFar);
                      const balanceEntry = newPayments.find(p => p.mode === "BALANCE");
                      if (balanceEntry) {
                        balanceEntry.amount = balanceNeeded;
                      } else if (balanceNeeded > 0) {
                        newPayments.push({ mode: "BALANCE", amount: balanceNeeded, note: "" });
                      }
                      return { ...current, payments: newPayments };
                    });
                  }} />
                </div>
                <div className="pos-payment-input">
                  <label><svg width="16" height="16" style={{ color: "#f59e0b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> Balance</label>
                  <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "BALANCE")?.amount || ""} onFocus={() => {
                    setForm((current) => {
                      const paidSoFar = (current.payments || []).filter(p => p.mode !== "BALANCE" && p.mode !== "WALLET").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const balance = Math.max(0, totals.total - paidSoFar);
                      const newPayments = (current.payments || []).filter(p => p.mode !== "BALANCE");
                      newPayments.push({ mode: "BALANCE", amount: balance, note: "" });
                      return { ...current, payments: newPayments };
                    });
                  }} onChange={(e) => {
                    const advAmount = Number((form.payments || []).find(p => p.mode === "ADVANCE")?.amount || 0);
                    const maxBalance = Math.max(0, totals.total - advAmount);
                    const amount = Math.min(Number(e.target.value) || 0, maxBalance);
                    setForm((current) => {
                      const newPayments = (current.payments || []).filter(p => p.mode !== "BALANCE");
                      newPayments.push({ mode: "BALANCE", amount, note: "" });
                      return { ...current, payments: newPayments };
                    });
                  }} />
                </div>
                {form.customerId && (() => {
                  const customer = context.customers.find(c => c.id === form.customerId);
                  const adv = Number(customer?.advanceAmount || 0);
                  if (adv <= 0) return null;
                  return (
                    <div className="pos-payment-input">
                      <label style={{ color: "#10b981" }} title={`Available advance: ${formatMoney(adv)}`}>
                        <svg width="16" height="16" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Advance ({formatMoney(adv)})
                      </label>
                      <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "ADVANCE")?.amount || ""} onFocus={() => {
                        const nonAdvancePaid = (form.payments || []).filter(p => p.mode !== "ADVANCE" && p.mode !== "WALLET").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                        const remaining = Math.max(0, totals.total - nonAdvancePaid);
                        const useAdv = Math.min(remaining, adv);
                        setForm((current) => ({ ...current, payments: [...(current.payments || []).filter(p => p.mode !== "ADVANCE"), { mode: "ADVANCE", amount: useAdv, note: "Advance used" }] }));
                      }} onChange={(e) => {
                        const nonAdvancePaid = (form.payments || []).filter(p => p.mode !== "ADVANCE" && p.mode !== "WALLET").reduce((sum, p) => sum + Number(p.amount || 0), 0);
                        const maxAdv = Math.max(0, Math.min(adv, totals.total - nonAdvancePaid));
                        const amount = Math.min(Number(e.target.value) || 0, maxAdv);
                        setForm((current) => ({ ...current, payments: [...(current.payments || []).filter(p => p.mode !== "ADVANCE"), { mode: "ADVANCE", amount, note: "Advance used" }] }));
                      }} />
                    </div>
                  );
                })()}
                {form.customerId && affiliateWallet && Number(affiliateWallet.balance || 0) > 0 && (
                  <div className="pos-payment-input">
                    <label style={{ color: "#7c3aed" }} title={`Available affiliate credits: ${Number(affiliateWallet.balance || 0).toFixed(2)}`}>
                      <svg width="16" height="16" style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M4 7h16M4 17h16" /></svg>
                      Affiliate Credits ({Number(affiliateWallet.balance || 0).toFixed(2)} cr)
                    </label>
                    <input type="number" placeholder="0.0" value={form.payments.find((payment) => payment.mode === "AFFILIATE_CREDIT")?.amount || ""} onFocus={() => {
                      const walletBalance = Number(affiliateWallet.balance || 0) * affiliateServiceCreditValue;
                      const nonAffiliatePaid = (form.payments || []).filter(p => !["AFFILIATE_CREDIT", "BALANCE", "WALLET"].includes(p.mode)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const useCredits = Math.min(walletBalance, Math.max(0, totals.total - nonAffiliatePaid));
                      setForm((current) => ({ ...current, payments: [...(current.payments || []).filter(p => p.mode !== "AFFILIATE_CREDIT"), { mode: "AFFILIATE_CREDIT", amount: useCredits, note: "Affiliate service credit used" }] }));
                    }} onChange={(e) => {
                      const walletBalance = Number(affiliateWallet.balance || 0) * affiliateServiceCreditValue;
                      const nonAffiliatePaid = (form.payments || []).filter(p => !["AFFILIATE_CREDIT", "BALANCE", "WALLET"].includes(p.mode)).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const maxCredits = Math.max(0, Math.min(walletBalance, totals.total - nonAffiliatePaid));
                      const amount = Math.min(Number(e.target.value) || 0, maxCredits);
                      setForm((current) => ({ ...current, payments: [...(current.payments || []).filter(p => p.mode !== "AFFILIATE_CREDIT"), { mode: "AFFILIATE_CREDIT", amount, note: "Affiliate service credit used" }] }));
                    }} />
                    <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>1 credit = {formatMoney(affiliateServiceCreditValue)} service discount</div>
                  </div>
                )}
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
                  {totals.membershipWalletUsed > 0 && (
                    <div style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600, marginTop: 8 }}>
                      Payment done by: <span style={{ color: "#0f172a" }}>Membership ₹{totals.membershipWalletUsed.toFixed(0)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pos-footer-bar">
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              {status.error && <span style={{ color: "#ef4444", fontWeight: 500, fontSize: "13px" }}>{status.error}</span>}
              {status.success && <span style={{ color: "#10b981", fontWeight: 500, fontSize: "13px" }}>{status.success}</span>}
            </div>
            <button type="button" className="pos-btn-clear" onClick={() => { setForm(c => ({ ...c, items: [], discount: 0, giftVoucherCode: "", couponCode: "", packageRedemptions: [] })); setTipEntries([]); setCouponValidation(null); setCouponCodeInput(""); setGiftCardDiscount(0); }}>Clear</button>
            <button type="button" className="pos-btn-create" disabled={submitting} onClick={() => !submitting && submitInvoice("draft")}>Create</button>
            <button type="button" className="pos-btn-complete" disabled={submitting} onClick={() => !submitting && submitInvoice("complete")}>Create & Complete</button>
          </div>
        </div>
      </div>
      
      {showAddGuestModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1199, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", color: newGuestForm.dateOfBirth ? "#0f172a" : "#94a3b8" }} type="date" max={new Date().toISOString().slice(0, 10)} value={newGuestForm.dateOfBirth} onChange={e => setNewGuestForm(c => ({ ...c, dateOfBirth: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", marginBottom: 4, fontWeight: 600 }}>Anniversary</label>
                  <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none", color: newGuestForm.anniversary ? "#0f172a" : "#94a3b8" }} type="date" max={new Date().toISOString().slice(0, 10)} value={newGuestForm.anniversary} onChange={e => setNewGuestForm(c => ({ ...c, anniversary: e.target.value }))} />
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
              <button type="button" onClick={() => { setShowSuccessModal(false); setCreatedInvoice(null); setStatus({ error: "", success: "" }); }} style={{ padding: "12px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, marginTop: 8 }}>
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
                 {(() => {
                   const raw = context.settings?.advancedSettings;
                   const adv = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : (raw || {});
                   const templates = (adv?.giftCardSettings?.templates && adv.giftCardSettings.templates.length)
                     ? adv.giftCardSettings.templates
                     : [
                         { name: "Birthday Voucher", description: "Special birthday gift card for loyal customers", amount: 1000, validityDays: 90, renewalReminderDays: 7 },
                         { name: "Festive Special", description: "Limited edition festive season gift card", amount: 2500, validityDays: 180, renewalReminderDays: 14 },
                         { name: "Premium Package", description: "High-value gift card for premium services", amount: 5000, validityDays: 365, renewalReminderDays: 30 }
                       ];
                   const filtered = templates.filter(g => (g.name || "").toLowerCase().includes(gcSearch.toLowerCase()));
                   return (
                     <>
                       {filtered.map((gc, idx) => {
                         const isSelected = gcModalGc?.name === gc.name && gcModalGc?.id !== "CUSTOM";
                         return (
                           <div key={idx} onClick={() => {
                             setGcModalGc({ id: `tpl-${idx}`, name: gc.name });
                             setGcDraft({ staffId: gcDraft.staffId || "", price: String(gc.amount || ""), validityDays: String(gc.validityDays || 30), purchaseDate: new Date().toISOString().slice(0,10), code: "" });
                           }} style={{ background: isSelected?"#fdf4ff":"#f8fafc", border: isSelected?"2px solid #e879f9":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s" }}>
                             <div style={{ fontSize:"0.95rem", fontWeight:700, color: "var(--accent, #3b82f6)", marginBottom:8, textTransform:"uppercase" }}>{gc.name || "GIFT CARD"}</div>
                             <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Amount: {formatMoney(Number(gc.amount || 0))}</div>
                             <div style={{ fontSize:"0.85rem", color:"#475569", marginBottom:4 }}>Validity: {gc.validityDays || 30} Days</div>
                           </div>
                         );
                       })}
                       <div onClick={() => {
                         setGcModalGc({ id: "CUSTOM", name: "Custom Gift Card" });
                         setGcDraft({ staffId: gcDraft.staffId || "", price: "", validityDays: "365", purchaseDate: new Date().toISOString().slice(0,10), code: "" });
                       }} style={{ background: gcModalGc?.id === "CUSTOM"?"#eff6ff":"#f8fafc", border: gcModalGc?.id === "CUSTOM"?"2px solid #3b82f6":"1px solid #e2e8f0", borderRadius:12, padding:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", minHeight:80, transition:"all 0.2s" }}>
                         <div style={{ fontSize:"1rem", fontWeight:700, color:"#2563eb", textTransform:"uppercase" }}>CUSTOM GIFT CARD</div>
                       </div>
                     </>
                   );
                 })()}
               </div>

               {/* Bottom Form */}
               <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap" }}>
                 <div style={{ flex:1, minWidth:150 }}>
                   <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Name</label>
                   <input 
                     readOnly={gcModalGc?.id !== "CUSTOM"} 
                     value={gcModalGc ? gcModalGc.name : ""} 
                     onChange={e => {
                       const val = e.target.value;
                       setGcModalGc(prev => prev ? { ...prev, name: val } : null);
                     }}
                     placeholder="Enter Name" 
                     style={{ 
                       width:"100%", 
                       padding:"10px 12px", 
                       border:"1px solid #cbd5e1", 
                       borderRadius:8, 
                       fontSize:"0.9rem", 
                       background: gcModalGc?.id === "CUSTOM" ? "#fff" : "#f8fafc", 
                       color: gcModalGc?.id === "CUSTOM" ? "#0f172a" : "#94a3b8", 
                       boxSizing:"border-box" 
                     }} 
                   />
                 </div>
                 <div style={{ flex:1, minWidth:120 }}>
                   <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Validity (Days)</label>
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
                   <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Card Code (Optional)</label>
                   <input placeholder="Auto-generated" value={gcDraft.code || ""} onChange={e=>setGcDraft(d=>({...d,code:e.target.value}))} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
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

               {/* GiftCard Payments */}
               <div style={{ marginTop: 16, padding: "16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                   <div style={{ fontWeight: 600, color: "#0f172a" }}>Payment Breakup</div>
                   <div style={{ fontWeight: 700, color: "var(--accent, #3b82f6)" }}>Total: {formatMoney(Number(gcDraft.price || 0))}</div>
                 </div>
                 <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                   <div style={{ flex: 1, minWidth: 120 }}>
                     <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Online Amount</label>
                     <input type="number" placeholder="0" value={gcDraft.online} onChange={e => setGcDraft(d => ({ ...d, online: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                   </div>
                   <div style={{ flex: 1, minWidth: 120 }}>
                     <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Cash Amount</label>
                     <input type="number" placeholder="0" value={gcDraft.offline} onChange={e => setGcDraft(d => ({ ...d, offline: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                   </div>
                   <div style={{ flex: 1, minWidth: 120 }}>
                     <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Balance</label>
                     <input readOnly value={Math.max(0, Number(gcDraft.price || 0) - Number(gcDraft.online || 0) - Number(gcDraft.offline || 0))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", background: "#f1f5f9", color: "#64748b" }} />
                   </div>
                 </div>
               </div>

             <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 }}>
               <button onClick={() => setShowGcModal(false)} style={{ padding:"10px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
               <button onClick={handleAddGiftCard} disabled={!gcModalGc || !gcDraft.staffId || submittingGc} style={{ padding:"10px 24px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:(gcModalGc && gcDraft.staffId && !submittingGc)?"pointer":"not-allowed", opacity:(gcModalGc && gcDraft.staffId && !submittingGc)?1:0.6 }}>{submittingGc ? "Processing..." : "Create Invoice"}</button>
             </div>
          </div>
        </div>
      )}

  {/* ======= FULL ADD PACKAGE MODAL ======= */}
      {showPkgModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.65)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={() => setShowPkgModal(false)}>
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
                {(context.packages || []).filter(p => p.name.toLowerCase().includes(pkgSearch.toLowerCase())).map(pkg => {
                  const isSelected = pkgModalPkg?.id === pkg.id;
                  return (
                    <div key={pkg.id} onClick={() => {
                      setPkgModalPkg(pkg);
                      setPkgDraft({ staffId: "", price: String(pkg.price||0), validityDays: String(pkg.validityDays||30), purchaseDate: new Date().toISOString().slice(0,10), customServices: (pkg.services||[]).map(s=>({id:s.service?.id||s.serviceId,name:s.service?.name, price: s.service?.salesPrice || s.service?.price || 0, qty:s.sessions||1})), customProducts: [], balance: "", online: "", offline: "", remark: "" });
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
                  setPkgDraft({ staffId: "", price: "", validityDays: "", purchaseDate: new Date().toISOString().slice(0,10), customServices: [], customProducts: [], balance: "", online: "", offline: "", remark: "" });
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

                {/* Add Services & Products Area */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  {/* Add Services Search Bar */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <label style={{ fontWeight:700, color:"#334155", fontSize:"0.9rem" }}>Add Services to Package</label>
                    <div style={{ position:"relative" }}>
                      <input placeholder="Search Service By Category Or Name..." value={pkgServiceSearch} onChange={e => setPkgServiceSearch(e.target.value)} style={{ width:"100%", padding:"12px 16px", paddingRight:40, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                      <span style={{ position:"absolute", right:14, top:12, color:"#94a3b8", fontWeight:700 }}>🔍</span>
                      {pkgServiceSearch.trim() && (
                        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", marginTop:6, zIndex:20, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                          {(context.services || []).filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase())).map(svc => (
                            <div key={svc.id} onClick={() => { if(!pkgDraft.customServices.find(c=>c.id===svc.id)) { const newSvc = [...pkgDraft.customServices, {id:svc.id, name:svc.name, price: svc.salesPrice || svc.price || 0, qty:1}]; const newTotal = newSvc.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); setPkgDraft(d=>({...d, customServices: newSvc, price: pkgModalPkg?.id==="CUSTOM"?String(newTotal):d.price})); } setPkgServiceSearch(""); }} style={{ padding:"12px 16px", cursor:"pointer", fontSize:"0.95rem", color:"#334155", borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.color="#0f172a"; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#334155"; }}>
                              {svc.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Products Search Bar */}
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <label style={{ fontWeight:700, color:"#334155", fontSize:"0.9rem" }}>Add Products to Package</label>
                    <div style={{ position:"relative" }}>
                      <input placeholder="Search Product By Category Or Name..." value={pkgProductSearch} onChange={e => setPkgProductSearch(e.target.value)} style={{ width:"100%", padding:"12px 16px", paddingRight:40, border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                      <span style={{ position:"absolute", right:14, top:12, color:"#94a3b8", fontWeight:700 }}>🔍</span>
                      {pkgProductSearch.trim() && (
                        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, maxHeight:200, overflowY:"auto", marginTop:6, zIndex:20, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                          {(context.products || []).filter(p => p.name.toLowerCase().includes(pkgProductSearch.toLowerCase())).map(prod => (
                            <div key={prod.id} onClick={() => { if(!pkgDraft.customProducts.find(c=>c.id===prod.id)) { const newProd = [...pkgDraft.customProducts, {id:prod.id, name:prod.name, price: prod.sellingPrice || prod.salesPrice || prod.price || 0, qty:1}]; const svcTotal = pkgDraft.customServices.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); const prodTotal = newProd.reduce((acc,p)=>acc+(Number(p.price||0)*Number(p.qty||1)),0); setPkgDraft(d=>({...d, customProducts: newProd, price: pkgModalPkg?.id==="CUSTOM"?String(svcTotal+prodTotal):d.price})); } setPkgProductSearch(""); }} style={{ padding:"12px 16px", cursor:"pointer", fontSize:"0.95rem", color:"#334155", borderBottom:"1px solid #f1f5f9" }} onMouseEnter={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.color="#0f172a"; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#334155"; }}>
                              {prod.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Products */}
                {pkgDraft.customProducts.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontWeight:700, color:"#0f172a", fontSize:"1rem", marginBottom:12, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>Selected Products</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {pkgDraft.customProducts.map((prod, idx) => (
                        <div key={idx} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", border:"1px solid #e2e8f0", borderRadius:10, background:"#f8fafc" }}>
                          <span style={{ fontSize:"0.95rem", color:"#0f172a", fontWeight:600 }}>{prod.name} <span style={{color:"#64748b", fontSize:"0.85rem", marginLeft:8, fontWeight: 500}}>({formatMoney(Number(prod.price||0) * Number(prod.qty||1))})</span></span>
                          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Qty</span>
                              <input type="number" min="1" value={prod.qty} onChange={e => { const n=[...pkgDraft.customProducts]; n[idx]={...n[idx],qty:Number(e.target.value)}; const svcTotal = pkgDraft.customServices.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); const prodTotal = n.reduce((acc,p)=>acc+(Number(p.price||0)*Number(p.qty||1)),0); setPkgDraft(d=>({...d,customProducts:n, price: pkgModalPkg?.id==="CUSTOM"?String(svcTotal+prodTotal):d.price})); }} style={{ width:70, padding:"8px", border:"1px solid #cbd5e1", borderRadius:6, fontSize:"0.95rem", textAlign:"center", outline: "none" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                            </div>
                            <button onClick={() => { const n=pkgDraft.customProducts.filter((_,i)=>i!==idx); const svcTotal = pkgDraft.customServices.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0); const prodTotal = n.reduce((acc,p)=>acc+(Number(p.price||0)*Number(p.qty||1)),0); setPkgDraft(d=>({...d,customProducts:n, price: pkgModalPkg?.id==="CUSTOM"?String(svcTotal+prodTotal):d.price})); }} style={{ width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", background:"#fee2e2", border:"none", borderRadius:6, cursor:"pointer", color:"#ef4444", fontWeight:700, fontSize: "1.1rem", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background="#fecaca"} onMouseLeave={e => e.currentTarget.style.background="#fee2e2"}>&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div style={{ display:"flex", gap:32, alignItems:"center", marginTop:12, padding:"20px 24px", background:"#f1f5f9", borderRadius:12, border: "1px dashed #cbd5e1" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color:"#475569", fontWeight:600, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: 4 }}>Total Service Value</div> 
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize: "1.2rem" }}>{formatMoney(pkgDraft.customServices.reduce((acc,s)=>acc+(Number(s.price||0)*Number(s.qty||1)),0))}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color:"#475569", fontWeight:600, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: 4 }}>Total Product Value</div> 
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize: "1.2rem" }}>{formatMoney(pkgDraft.customProducts.reduce((acc,p)=>acc+(Number(p.price||0)*Number(p.qty||1)),0))}</div>
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
                      {packageStaffUsers.map((staffUser) => (
                        <option key={staffUser.id} value={staffUser.id}>
                          {staffUser.user?.name || staffUser.user?.email || staffUser.id}
                        </option>
                      ))}
                    </select>
                    {!packageStaffUsers.length ? (
                      <div style={{ marginTop:8, fontSize:"0.8rem", color:"#dc2626", fontWeight: 500 }}>
                        No active staff found for the selected branch.
                      </div>
                    ) : null}
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

                {/* Payment Details */}
                <div style={{ marginTop:24, padding: "24px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize:"1.1rem" }}>Payment Details</div>
                    <div style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>Amount to Pay: <span style={{ color: "#0f172a", fontSize: "1.2rem", marginLeft: 4 }}>{formatMoney(Number(pkgDraft.price || pkgModalPkg?.price || 0))}</span></div>
                  </div>
                  
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:20 }}>
                    <div>
                      <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Online (📱)</label>
                      <input type="number" min="0" step="0.01" inputMode="decimal" max={pkgPaymentTotal} placeholder="0.0" value={pkgDraft.online} onFocus={() => {
                        const total = Math.max(0, Number(pkgDraft.price || pkgModalPkg?.price || 0));
                        setPkgDraft(d => ({ ...d, online: String(total), offline: "", balance: "0" }));
                      }} onChange={e=>setPkgDraft(d=>{ const total = Math.max(0, Number(d.price || pkgModalPkg?.price || 0)); const offline = Math.max(0, Number(d.offline || 0)); const online = clampMoneyInput(e.target.value, Math.max(0, total - offline)); const nextBalance = Math.max(0, Number((total - Number(online || 0) - offline).toFixed(2))); return { ...d, online, balance: String(nextBalance) }; })} style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"1rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                    </div>
                    <div>
                      <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Offline / Cash (💵)</label>
                      <input type="number" min="0" step="0.01" inputMode="decimal" max={Math.max(0, pkgPaymentTotal - pkgPaymentOnline)} placeholder="0.0" value={pkgDraft.offline} onFocus={() => {
                        const total = Math.max(0, Number(pkgDraft.price || pkgModalPkg?.price || 0));
                        setPkgDraft(d => ({ ...d, offline: String(total), online: "", balance: "0" }));
                      }} onChange={e=>setPkgDraft(d=>{ const total = Math.max(0, Number(d.price || pkgModalPkg?.price || 0)); const online = Math.max(0, Number(d.online || 0)); const offline = clampMoneyInput(e.target.value, Math.max(0, total - online)); const nextBalance = Math.max(0, Number((total - online - Number(offline || 0)).toFixed(2))); return { ...d, offline, balance: String(nextBalance) }; })} style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"1rem", boxSizing:"border-box", outline: "none", transition: "border-color 0.2s" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                    </div>
                    <div>
                      <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Remaining Balance</label>
                      <input type="number" placeholder="0.0" value={pkgPaymentBalance.toFixed(2)} readOnly style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"1rem", boxSizing:"border-box", background:"#f1f5f9", color: "#64748b", outline: "none" }} />
                    </div>
                  </div>
                </div>

                {/* Remark */}
                <div style={{ marginTop:16 }}>
                  <label style={{ fontSize:"0.85rem", fontWeight:700, color:"#334155", display:"block", marginBottom:8 }}>Internal Remark <span style={{ fontWeight: 400, color: "#94a3b8" }}>(Optional)</span></label>
                  <textarea placeholder="Add any notes about this package purchase..." value={pkgDraft.remark} onChange={e=>setPkgDraft(d=>({...d,remark:e.target.value}))} rows={2} style={{ width:"100%", padding:"12px 16px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.95rem", boxSizing:"border-box", resize:"vertical", outline: "none", transition: "border-color 0.2s", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor="#3b82f6"} onBlur={e => e.target.style.borderColor="#cbd5e1"} />
                </div>

                {/* Warning / Error details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {!form.customerId ? (
                    <div style={{ fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> Guest selection is required before purchase. Please select a guest on the main POS screen.
                    </div>
                  ) : null}
                  {!form.branchId ? (
                    <div style={{ fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> Branch selection is required before purchase. Please select a branch on the main POS screen.
                    </div>
                  ) : null}
                  {!pkgDraft.staffId ? (
                    <div style={{ fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> Staff selection is required before purchase.
                    </div>
                  ) : null}
                  {status.error ? (
                    <div style={{ fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600, padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> {status.error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={{ padding:"20px 28px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:16, background: "#f8fafc", position: "sticky", bottom: 0, borderRadius: "0 0 16px 16px", zIndex: 10 }}>
              <button onClick={() => { setShowPkgModal(false); setStatus({ error: "", success: "" }); }} style={{ padding:"12px 28px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:700, cursor:"pointer", color:"#475569", fontSize: "0.95rem", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.borderColor="#94a3b8"; }} onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#cbd5e1"; }}>Cancel</button>
              <button onClick={handleAddPkgToCart} disabled={!pkgDraftCanSubmit || submittingPkg} style={{ padding:"12px 28px", background:"#10b981", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:(pkgDraftCanSubmit && !submittingPkg)?"pointer":"not-allowed", opacity:(pkgDraftCanSubmit && !submittingPkg)?1:0.6, fontSize: "0.95rem", boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.3)", transition: "all 0.2s" }} onMouseEnter={e => { if(pkgDraftCanSubmit && !submittingPkg) { e.currentTarget.style.background="#059669"; e.currentTarget.style.transform="translateY(-1px)"; } }} onMouseLeave={e => { if(pkgDraftCanSubmit && !submittingPkg) { e.currentTarget.style.background="#10b981"; e.currentTarget.style.transform="translateY(0)"; } }}>
                {submittingPkg ? "Processing..." : "Confirm Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= PACKAGE DETAILS MODAL ======= */}
      {showPkgDetailModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:9500, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowPkgDetailModal(null)}>
          <div style={{ background:"#fff", borderRadius:16, width:"min(95vw,500px)", maxHeight:"80vh", overflowY:"auto", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ fontWeight:700, fontSize:"1.2rem", color:"#0f172a", textAlign:"center", flex:1 }}>Package Details</div>
              <button onClick={() => setShowPkgDetailModal(null)} style={{ background:"none", border:"none", fontSize:"1.4rem", cursor:"pointer", color:"#94a3b8" }}>&#x2715;</button>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ fontSize:"1rem", fontWeight:600, color:"#0f172a", marginBottom:16 }}>Guest Name: {context.customers.find(c => c.id === form.customerId)?.name || "N/A"}</div>
              <div style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:16, background:"#f8fafc" }}>
                <div style={{ marginBottom:8 }}><strong>Active Package:</strong> {showPkgDetailModal?.package?.name || "N/A"}</div>
                <div style={{ marginBottom:8 }}><strong>Package Type:</strong> Base</div>
                <div style={{ marginBottom:8 }}><strong>Purchase Date:</strong> {showPkgDetailModal?.startsAt ? new Date(showPkgDetailModal.startsAt).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}).replace(/ /g, "-") : "N/A"}</div>
                <div style={{ marginBottom:16 }}><strong>Expiry Date:</strong> {showPkgDetailModal?.endsAt ? new Date(showPkgDetailModal.endsAt).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}).replace(/ /g, "-") : "N/A"}</div>
                <div style={{ fontWeight:600, marginBottom:8 }}>services:</div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #e2e8f0" }}>
                      <th style={{ textAlign:"left", padding:"6px 8px", color:"#475569" }}>Name</th>
                      <th style={{ textAlign:"right", padding:"6px 8px", color:"#475569" }}>Avl</th>
                      <th style={{ textAlign:"right", padding:"6px 8px", color:"#475569" }}>Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showPkgDetailModal?.package?.services || []).map((s, i) => {
                      const totalSessions = Number(s.sessions || 1);
                      const savedUsed = Number(s.sessionsUsed || 0);
                      const pendingUsed = form.packageRedemptions.filter(
                        (r) => r.customerPackageId === showPkgDetailModal?.id && r.serviceId === (s.serviceId || s.service?.id)
                      ).length;
                      const used = savedUsed + pendingUsed;
                      const available = Math.max(0, totalSessions - used);
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                          <td style={{ padding:"6px 8px", color:"#334155" }}>- {s.service?.name || s.serviceId}</td>
                          <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600 }}>{available}</td>
                          <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600 }}>{used}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(!showPkgDetailModal?.package?.services || showPkgDetailModal.package.services.length === 0) && (
                  <div style={{ color:"#64748b", fontSize:"0.85rem", padding:"6px 0" }}>No services found</div>
                )}
                {showPkgDetailModal?.soldInvoice?.items?.filter(item => item.itemType === 'PRODUCT').length > 0 && (
                  <>
                    <div style={{ fontWeight:600, marginBottom:8, marginTop:16 }}>products:</div>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.9rem" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid #e2e8f0" }}>
                          <th style={{ textAlign:"left", padding:"6px 8px", color:"#475569" }}>Name</th>
                          <th style={{ textAlign:"right", padding:"6px 8px", color:"#475569" }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showPkgDetailModal.soldInvoice.items.filter(item => item.itemType === 'PRODUCT').map((p, i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                            <td style={{ padding:"6px 8px", color:"#334155" }}>- {p.serviceName || p.product?.name || "Product"}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600 }}>{p.qty || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
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
                  const price = Number(mem.price || 0);
                  const validity = mem.validityDays;
                  const isFixed = mem.benefitType === "WALLET_VALUE";
                  const benefitAmt = isFixed
                    ? (Number(mem.walletValue || 0) - price)
                    : Number(mem.discountValue || 0);

                  const dealText = isFixed
                    ? `Pay ₹ ${price} and get ${Number(mem.walletValue || 0)}. Benefit: ₹ ${benefitAmt} Extra.`
                    : `Pay ₹ ${price} and get ${benefitAmt}% Discount on services.`;

                  const benefitLabel = isFixed
                    ? `₹ ${benefitAmt} Extra`
                    : `${benefitAmt}% Discount`;

                  return (
                    <div
                      key={mem.id}
                      onClick={() => {
                        setMemModalMem(mem);
                        setMemDraft({
                          staffId: "",
                          price: String(price),
                          validityDays: String(validity),
                          purchaseDate: new Date().toISOString().slice(0, 10),
                          customServices: (mem.services || []).map(s => ({
                            id: s.service?.id || s.serviceId,
                            name: s.service?.name,
                            price: s.service?.salesPrice || s.service?.price || 0,
                            qty: 1
                          })),
                          online: "",
                          offline: "",
                          balance: "0",
                          remark: ""
                        });
                      }}
                      style={{
                        background: isSelected ? "#eff6ff" : "#ffffff",
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 20,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.02)"
                      }}
                    >
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: isSelected ? "#1e40af" : "#0f172a", textTransform: "uppercase" }}>
                        {mem.name}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, lineHeight: "1.4" }}>
                        {dealText}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                        <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                          <strong>Fee:</strong> ₹ {price}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                          <strong>Validity:</strong> {validity} Days
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: 700 }}>
                          <strong>Benefit:</strong> {benefitLabel}
                        </div>
                      </div>
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
                      {(context.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:1, minWidth:140 }}>
                    <label style={{ fontSize:"0.82rem", fontWeight:600, color:"#475569", display:"block", marginBottom:6 }}>Purchase date</label>
                    <input type="date" value={memDraft.purchaseDate} onChange={e=>setMemDraft(d=>({...d,purchaseDate:e.target.value}))} max={new Date().toISOString().slice(0, 10)} style={{ width:"100%", padding:"10px 12px", border:"1px solid #cbd5e1", borderRadius:8, fontSize:"0.9rem", boxSizing:"border-box" }} />
                  </div>
                </div>

                {/* Membership Payments */}
                <div style={{ marginTop: 16, padding: "16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>Payment Split</div>
                    <div style={{ fontWeight: 700, color: "#2563eb", fontSize: "1.1rem" }}>Total: ₹{memDraft.price || 0}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Balance</label>
                      <input type="number" readOnly value={memDraft.balance || 0} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", background: "#e2e8f0", color: "#64748b", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Online</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.2rem" }}>📱</span>
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.0" value={memDraft.online} onFocus={() => {
                          const total = Math.max(0, Number(memDraft.price || 0));
                          setMemDraft(d => ({ ...d, online: String(total), offline: "", balance: "0" }));
                        }} onChange={e => setMemDraft(d => { const total = Math.max(0, Number(d.price || 0)); const offline = Math.max(0, Number(d.offline || 0)); const online = clampMoneyInput(e.target.value, Math.max(0, total - offline)); const nextBalance = Math.max(0, Number((total - Number(online || 0) - offline).toFixed(2))); return { ...d, online, balance: String(nextBalance) }; })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Offline</label>
                      <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.0" value={memDraft.offline} onFocus={() => {
                        const total = Math.max(0, Number(memDraft.price || 0));
                        setMemDraft(d => ({ ...d, offline: String(total), online: "", balance: "0" }));
                      }} onChange={e => setMemDraft(d => { const total = Math.max(0, Number(d.price || 0)); const online = Math.max(0, Number(d.online || 0)); const offline = clampMoneyInput(e.target.value, Math.max(0, total - online)); const nextBalance = Math.max(0, Number((total - online - Number(offline || 0)).toFixed(2))); return { ...d, offline, balance: String(nextBalance) }; })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>

                {/* Remark */}
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Remark:</label>
                  <textarea placeholder="Add remark..." value={memDraft.remark} onChange={e => setMemDraft(d => ({ ...d, remark: e.target.value }))} rows={2} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", resize: "vertical" }} />
                </div>

                {/* Warning / Error details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {!form.customerId ? (
                    <div style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>
                      ⚠️ Guest selection is required before purchase. Please select a guest on the main POS screen.
                    </div>
                  ) : null}
                  {!form.branchId ? (
                    <div style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>
                      ⚠️ Branch selection is required before purchase. Please select a branch on the main POS screen.
                    </div>
                  ) : null}
                  {!memDraft.staffId ? (
                    <div style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>
                      ⚠️ Staff selection is required before purchase.
                    </div>
                  ) : null}
                  {status.error ? (
                    <div style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: 600, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                      ⚠️ {status.error}
                    </div>
                  ) : null}
                </div>

              </div>
            </div>

            <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 }}>
              <button onClick={() => { setShowMemModal(false); setStatus({ error: "", success: "" }); }} style={{ padding:"10px 24px", background:"#fff", border:"1px solid #cbd5e1", borderRadius:8, fontWeight:600, cursor:"pointer", color:"#475569" }}>Cancel</button>
              <button onClick={handleBuyMembershipDirect} disabled={!memModalMem || !memDraft.staffId || submittingMem} style={{ padding:"10px 24px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:(memModalMem && memDraft.staffId && !submittingMem)?"pointer":"not-allowed", opacity:(memModalMem && memDraft.staffId && !submittingMem)?1:0.6 }}>
                {submittingMem ? "Purchasing..." : "Purchase Membership"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReminderModal && reminderModalDraft.index !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowReminderModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Update service reminder</h2>
              <button onClick={() => setShowReminderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '0 24px 20px', flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: "0.9rem", color: "#475569", marginBottom: 12 }}>
                Set reminder for service (In days):- {reminderModalDraft.serviceName}
              </p>
              <input
                type="number"
                min="0"
                value={reminderModalDraft.reminderDays}
                onChange={(e) => setReminderModalDraft({ ...reminderModalDraft, reminderDays: e.target.value })}
                placeholder="Enter Reminder In Days"
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 6, boxSizing: "border-box", fontSize: "0.9rem" }}
              />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: 12, background: '#f8fafc' }}>
              <button type="button" onClick={() => setShowReminderModal(false)} style={{ padding: '10px 24px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={async () => {
                try {
                  await api.patch(`/owner/services/${reminderModalDraft.serviceId}`, {
                    name: reminderModalDraft.serviceName,
                    serviceRemainderDays: Number(reminderModalDraft.reminderDays)
                  });
                  setContext(prev => {
                    if (!prev || !prev.services) return prev;
                    return {
                      ...prev,
                      services: prev.services.map(s => s.id === reminderModalDraft.serviceId ? { ...s, serviceRemainderDays: Number(reminderModalDraft.reminderDays) } : s)
                    };
                  });
                  setShowReminderModal(false);
                } catch (error) {
                  alert("Failed to update reminder: " + (error.response?.data?.message || error.message));
                }
              }} style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--button-bg-solid, #3b82f6)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Update Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimeModal && timeModalDraft.index !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowTimeModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>Service Time</h2>
              <button type="button" onClick={() => setShowTimeModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Start Time</label>
                <input type="time" value={timeModalDraft.startTime} onChange={e => setTimeModalDraft(d => ({ ...d, startTime: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>End Time</label>
                <input type="time" value={timeModalDraft.endTime} onChange={e => setTimeModalDraft(d => ({ ...d, endTime: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setShowTimeModal(false)} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button type="button" onClick={() => {
                updateItem(timeModalDraft.index, { startTime: timeModalDraft.startTime, endTime: timeModalDraft.endTime });
                setShowTimeModal(false);
              }} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Save Time</button>
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

            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', position: 'relative', zIndex: 1000 }}>
              <input
                type="text"
                placeholder="Search products by name..."
                value={consumableSearch}
                onChange={(e) => setConsumableSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
              {consumableSearch && (
                <div style={{ position: 'absolute', top: '100%', left: 24, right: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto', zIndex: 1010 }}>
                  {(context.products || [])
                    .filter(p => p.productType === "CONSUMABLE")
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
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" onClick={() => setShowConsumableModal(false)} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Close</button>
              <button type="button" onClick={saveConsumableItems} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {/* Toast CSS Animation */}
      <style>{`
        @keyframes slideInToast {
          from {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Premium Custom Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 99999,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          border: toastMessage.type === "error" ? "1px solid #fee2e2" : "1px solid #dcfce7",
          borderLeft: toastMessage.type === "error" ? "5px solid #ef4444" : "5px solid #22c55e",
          borderRadius: 12,
          padding: "16px 20px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          minWidth: 320,
          animation: "slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: toastMessage.type === "error" ? "#fef2f2" : "#f0fdf4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            {toastMessage.type === "error"
              ? <AlertCircle size={18} color="#ef4444" />
              : <CheckCircle2 size={18} color="#22c55e" />
            }
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>{toastMessage.title}</h4>
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>{toastMessage.message}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showDiscountModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowDiscountModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 420px)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Discount:</strong>
              <button type="button" onClick={() => setShowDiscountModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>&#x2715;</button>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>Fix</label>
                <input type="number" min="0" placeholder={formatMoney(0)} value={discountDraft.type === "FIX" ? discountDraft.value : ""} onFocus={() => setDiscountDraft(d => ({ ...d, type: "FIX" }))} onChange={e => setDiscountDraft(d => ({ ...d, value: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: discountDraft.type === "FIX" ? "2px solid var(--accent, #3b82f6)" : "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", paddingBottom: 4, fontWeight: 700, color: "#64748b" }}>OR</div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 6 }}>Percentage</label>
                <input type="number" min="0" max="100" placeholder="%" value={discountDraft.type === "PERCENT" ? discountDraft.value : ""} onFocus={() => setDiscountDraft(d => ({ ...d, type: "PERCENT" }))} onChange={e => setDiscountDraft(d => ({ ...d, value: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: discountDraft.type === "PERCENT" ? "2px solid var(--accent, #3b82f6)" : "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }} />
              </div>
            </div>
            <button type="button" onClick={confirmDiscount} style={{ width: "100%", padding: "12px", background: "var(--button-bg-solid, #0f172a)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>Apply</button>
          </div>
        </div>
      )}

      {showApplyPkgRedemptionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowApplyPkgRedemptionModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 560px)", maxHeight: "85vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Apply Packages</strong>
              <button type="button" onClick={() => setShowApplyPkgRedemptionModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>&#x2715;</button>
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
                          {(cp.package?.services || []).map((svc, idx) => {
                            const svcId = svc.serviceId || svc.service?.id;
                            const pendingUsed = form.packageRedemptions.filter(r => r.customerPackageId === cp.id && r.serviceId === svcId).length;
                            const totalUsed = (svc.sessionsUsed || 0) + pendingUsed;
                            const available = Math.max(0, (svc.sessions || 0) - totalUsed);
                            const isInCart = form.items.some(item => item.serviceId === svcId);
                            const isFree = form.items.some(item => item.serviceId === svcId && Number(item.unitPrice || 0) <= 0);
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px 0", color: isFree ? "#16a34a" : isInCart ? "#2563eb" : "#0f172a" }}>{svc.service?.name || svc.serviceId}</td>
                                <td style={{ padding: "8px 0", textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{available}</td>
                                <td style={{ padding: "8px 0", textAlign: "right", color: "#64748b" }}>{totalUsed}</td>
                                <td style={{ padding: "8px 0", textAlign: "right" }}>
                                  {available > 0 && !isFree && (
                                    <button type="button" onClick={() => applyPackageService(cp, svc)} style={{ padding: "4px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" }}>Apply</button>
                                  )}
                                  {isFree && (
                                    <span style={{ padding: "4px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem" }}>Applied</span>
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

      {showGcRedemptionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowGcRedemptionModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 440px)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Apply Gift Card</strong>
              <button type="button" onClick={() => setShowGcRedemptionModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>&#x2715;</button>
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
              <button type="button" onClick={() => { setShowGcRedemptionModal(false); setGcRedemptionCode(""); setGcRedemptionResult(null); }} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Close</button>
              {gcRedemptionResult ? (
                <button type="button" onClick={applyGiftCard} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Apply</button>
              ) : (
                <button type="button" onClick={validateGiftCard} disabled={gcRedemptionLoading || !gcRedemptionCode.trim()} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: gcRedemptionLoading || !gcRedemptionCode.trim() ? "not-allowed" : "pointer", opacity: gcRedemptionLoading || !gcRedemptionCode.trim() ? 0.6 : 1 }}>{gcRedemptionLoading ? "Validating..." : "Validate & Apply"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showTipModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTipModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 560px)", maxHeight: "85vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Tip</strong>
              <button type="button" onClick={() => setShowTipModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>&#x2715;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tipEntries.map((entry, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <span style={{ color: "#64748b" }}>{idx + 1})</span>
                  <span style={{ flex: 1, fontWeight: 600, color: "#0f172a" }}>{entry.staffName || (context.staffUsers || []).find(s => s.id === entry.staffId)?.user?.name || "Staff"}</span>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>{formatMoney(Number(entry.amount))}</span>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{entry.paymentMode}</span>
                  <button type="button" onClick={() => removeTipEntry(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>&#x2715;</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end", padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Staff</span>
                  <select value={tipDraft.staffId} onChange={e => setTipDraft(d => ({ ...d, staffId: e.target.value }))} style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem" }}>
                    <option value="">Select staff</option>
                    {(context.staffUsers || []).map(s => <option key={s.id} value={s.id}>{s.user?.name || s.user?.email || s.id}</option>)}
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
                <button type="button" onClick={addTipEntry} style={{ padding: "8px 12px", background: "var(--button-bg-solid, #2563eb)", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap" }}>Add</button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => setShowTipModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button type="button" onClick={() => { setShowTipModal(false); setStatus({ error: "", success: `Total tips: ${formatMoney(tipEntries.reduce((s, e) => s + Number(e.amount || 0), 0))}` }); }} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Select Membership to Apply Modal */}
      {showApplyMembershipModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowApplyMembershipModal(false)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 600px)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Select Membership to Apply</strong>
              <button type="button" onClick={() => setShowApplyMembershipModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>&#x2715;</button>
            </div>
            <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12 }}>
              {(context.customers.find(c => c.id === form.customerId)?.memberships || [])
                .filter(m => m.status === "ACTIVE" && new Date(m.endsAt) > new Date())
                .map(membership => {
                  const daysLeft = Math.ceil((new Date(membership.endsAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  const isSelected = form.appliedMembershipId === membership.id;
                  return (
                    <div key={membership.id} style={{ minWidth: 280, padding: "20px", border: isSelected ? "1px solid #e2e8f0" : "1px solid #f1f5f9", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Membership ID: <span style={{ fontWeight: 600, color: "#0f172a" }}>{membership.id.slice(0,8).toUpperCase()}</span></div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Active Membership: <span style={{ fontWeight: 600, color: "#0f172a" }}>{membership.membershipPlan?.name}</span></div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Membership Type: <span style={{ fontWeight: 600, color: "#0f172a" }}>{membership.membershipPlan?.benefitType === "WALLET_VALUE" ? "Fixed" : "Discount"}</span></div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Expiry Date: <span style={{ fontWeight: 600, color: "#0f172a" }}>{new Date(membership.endsAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).replace(/ /g, '-')}</span></div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Expires In: <span style={{ fontWeight: 600, color: "#0f172a" }}>{daysLeft} days</span></div>
                      <div style={{ fontSize: "0.9rem", color: "#475569" }}>Balance Amount: <span style={{ fontWeight: 600, color: "#0f172a" }}>₹ {Number(membership.remainingWalletValue || 0)}</span></div>
                      
                      <button type="button" onClick={() => !isSelected && selectMembershipForApply(membership)} style={{ marginTop: 12, padding: "10px", background: isSelected ? "#fff" : "var(--button-bg-solid, #3b82f6)", color: isSelected ? "#0f172a" : "#fff", border: isSelected ? "1px solid #e2e8f0" : "none", borderRadius: 6, fontWeight: 600, cursor: isSelected ? "default" : "pointer", boxShadow: isSelected ? "none" : "0 4px 6px -1px rgba(59, 130, 246, 0.3)" }}>{isSelected ? "Selected" : "Select"}</button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Select Items For Membership Modal */}
      {showMembershipItemsModal && selectedMembershipForApply && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 650px)", maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 20, color: "#0f172a" }}>Select Items For Membership</strong>
            </div>
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#166534", fontWeight: 600 }}>
              Available Balance: {formatMoney(Number(selectedMembershipForApply.remainingWalletValue || 0))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {membershipItemsDraft.map((draft, idx) => (
                <div key={idx} style={{ padding: "14px", border: draft.isEligible ? "1px solid #cbd5e1" : "1px solid #f1f5f9", borderRadius: 10, background: draft.isEligible ? "#fff" : "#f8fafc", opacity: draft.isEligible ? 1 : 0.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: draft.apply ? 12 : 0 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{draft.serviceName || "Item"}</div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Amount: {formatMoney(Number(draft.unitPrice || 0) * Number(draft.qty || 1))}</div>
                      {!draft.isEligible && <div style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: 4 }}>Not eligible for this membership</div>}
                    </div>
                    {draft.isEligible && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setMembershipItemsDraft(prev => prev.map((p, i) => i === idx ? { ...p, apply: !p.apply } : p));
                        }} 
                        style={{ padding: "6px 16px", background: draft.apply ? "#ef4444" : "#16a34a", color: "#fff", border: "none", borderRadius: 20, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        {draft.apply ? "Remove" : "Apply"}
                      </button>
                    )}
                  </div>
                  {draft.apply && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", background: "#f8fafc", borderRadius: 8, marginTop: 10 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Amount to Deduct:</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={draft.walletDeduction} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setMembershipItemsDraft(prev => prev.map((p, i) => i === idx ? { ...p, walletDeduction: val } : p));
                        }} 
                        style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, width: "100px" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" onClick={() => setShowMembershipItemsModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button type="button" onClick={confirmMembershipItemsApply} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #2563eb)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Confirm & Apply</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
