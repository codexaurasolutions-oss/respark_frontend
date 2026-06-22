import { useEffect, useRef, useState, useMemo } from "react";
import { Search, Filter, Plus, Download, Upload, MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, ChevronDown, Trash2, GitMerge, MessageCircle, User, FileText, CreditCard, Gift, Wallet, AlertCircle, Package, Users, UserCog, Tag, Phone, StickyNote, Edit3, CheckCircle, Circle, Eye, Monitor } from "lucide-react";
import { api } from "../../api/client";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import { normalizeIndianPhoneInputDigits } from "../../utils/phone";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import PosReceipt from "../../components/PosReceipt";


const EMPTY_ADVANCED_FILTERS = {
  gender: "",
  specialDay: "",
  lastVisitedStart: "",
  lastVisitedEnd: "",
  nonReturningDays: "",
  advanceState: "",
  balanceState: "",
  clientRetention: "",
  totalPurchaseMin: "",
  totalPurchaseMax: "",
  averagePurchaseMin: "",
  averagePurchaseMax: "",
  membershipState: "",
  loyaltyState: "",
  packageState: "",
  visitType: "all"
};

const getNow = () => Date.now();


const FILTER_SECTIONS = [
  { key: "gender", label: "Gender" },
  { key: "specialDay", label: "Special Day" },
  { key: "lastVisited", label: "Last Visited" },
  { key: "nonReturning", label: "Non-Returning" },
  { key: "advance", label: "Advance" },
  { key: "balance", label: "Balance" },
  { key: "clientRetention", label: "Client Retention" },
  { key: "totalPurchaseAmount", label: "Total Purchase Amount" },
  { key: "avgPurchaseAmount", label: "Avg Purchase Amount" },
  { key: "membership", label: "Membership" },
  { key: "loyalty", label: "Loyalty" },
  { key: "package", label: "Package" }
];

const formatCompactDate = (value, withYear = true) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {})
  }).replace(/ /g, "-");
};

const isWithinDateRange = (value, start, end) => {
  if (!value) return false;
  const current = new Date(value);
  if (start && current < new Date(start)) return false;
  if (end) {
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    if (current > endDate) return false;
  }
  return true;
};

export default function CustomersPage() {
  const { formatMoney, currencyCode, settings } = useSalonSettings();
  const { auth } = useAuth();
  const [selectedBillInvoice, setSelectedBillInvoice] = useState(null);
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState("Saving changes...");
  const [query, setQuery] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [activeFilterSection, setActiveFilterSection] = useState("gender");
  const [draftFilters, setDraftFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_ADVANCED_FILTERS);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [activeMenuRowId, setActiveMenuRowId] = useState("");
  const [mergeSourceRow, setMergeSourceRow] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("profile");
  const [showAssignMembershipModal, setShowAssignMembershipModal] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [customProducts, setCustomProducts] = useState([]);
  const [pkgProductSearch, setPkgProductSearch] = useState("");
  const [pkgServiceSearch, setPkgServiceSearch] = useState("");
  const [memServiceSearch, setMemServiceSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [membershipForm, setMembershipForm] = useState({ validityDays: "", price: "", staffId: "", online: "", offline: "", balance: "", advance: "", remarks: "", purchaseDate: new Date().toISOString().slice(0, 10) });
  const [membershipSearch, setMembershipSearch] = useState("");
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: "", mode: "Online", remark: "" });
  const [staffUsers, setStaffUsers] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [customerAdvances, setCustomerAdvances] = useState([]);
  const [updateForm, setUpdateForm] = useState({ name: "", phone: "", email: "", gender: "", dateOfBirth: "", anniversary: "" });
  const [nowTime] = useState(getNow);
  const assignMembershipBalanceVal = Number(membershipForm.price || 0) - (Number(membershipForm.online || 0) + Number(membershipForm.offline || 0) + Number(membershipForm.advance || 0));
  const [notes, setNotes] = useState("");
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [giftCardForm, setGiftCardForm] = useState({ code: "", title: "", amount: "", validityDays: 30 });
  const [giftCardSearch, setGiftCardSearch] = useState("");
  const [showGiftCardDropdown, setShowGiftCardDropdown] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packagePlans, setPackagePlans] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({ validityDays: "", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10), online: "", offline: "", balance: "", remark: "" });
  const [packageSearch, setPackageSearch] = useState("");
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: "", phone: "", relation: "" });
  const [familyError, setFamilyError] = useState("");
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  const [familySearchResults, setFamilySearchResults] = useState([]);
  const [familySearchLoading, setFamilySearchLoading] = useState(false);
  const [selectedFamilyGuest, setSelectedFamilyGuest] = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ date: "", time: "", message: "", type: "email", staffUserId: "" });
  const [invoiceSuccessData, setInvoiceSuccessData] = useState(null); // { type, name, invoice }
  const [membershipError, setMembershipError] = useState("");
  const [packageError, setPackageError] = useState("");
  const [giftCardError, setGiftCardError] = useState("");
  const actionMenuRef = useRef(null);
  const [formData, setFormData] = useState({
    phone: "",
    alternatePhone: "",
    name: "",
    email: "",
    dateOfBirth: "",
    anniversary: "",
    gst: "",
    gender: "female"
  });

  const load = async (searchText = query, selectedFilter = filterType) => {
    setLoading(true);
    try {
      const response = await api.get("/owner/customers", { params: { q: searchText, filter: selectedFilter } });
      setRows(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterType]);

  useEffect(() => {
    if (!activeMenuRowId) return undefined;
    const handleOutsideClick = (event) => {
      if (!actionMenuRef.current?.contains(event.target)) setActiveMenuRowId("");
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenuRowId]);

  const openWhatsAppForCustomer = (row) => {
    const digits = String(row.phone || "").replace(/\D/g, "");
    if (!digits) {
      alert("Customer phone number is missing");
      return;
    }
    const whatsappDigits = digits.startsWith("91") ? digits : `91${digits}`;
    window.open(`https://wa.me/${whatsappDigits}`, "_blank", "noopener,noreferrer");
    setActiveMenuRowId("");
  };

  const openCustomerDetail = async (row) => {
    setSelectedCustomer(row);
    setDetailTab("profile");
    setCustomerDetail(null);
    setCustomerDetailLoading(true);
    setShowAssignMembershipModal(false);
    setShowAddAdvanceModal(false);
    setSelectedPlan(null);
    setAdvanceForm({ amount: "", mode: "Online", remark: "" });
    setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "", balance: "", advance: "", remarks: "" });
    setNotes("");
    try {
      const res = await api.get(`/owner/customers/${row.id}`);
      setCustomerDetail(res.data);
      setUpdateForm({
        name: res.data?.name || row.name || "",
        phone: res.data?.phone || row.phone || "",
        email: res.data?.email || "",
        gender: res.data?.gender || "",
        dateOfBirth: res.data?.dateOfBirth ? res.data.dateOfBirth.substring(0, 10) : "",
        anniversary: res.data?.anniversary ? res.data.anniversary.substring(0, 10) : "",
      });
      setNotes(res.data?.notes || "");
    } catch (e) {
      console.error(e);
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const closeCustomerDetail = () => {
    setSelectedCustomer(null);
    setCustomerDetail(null);
    setDetailTab("profile");
    setShowAssignMembershipModal(false);
    setShowAddAdvanceModal(false);
    setSelectedPlan(null);
  };

  const fetchMembershipPlans = async () => {
    try {
      const res = await api.get("/owner/memberships");
      setMembershipPlans(res.data || []);
    } catch (e) {
      console.error("Failed to load membership plans", e);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get("/owner/staff-users");
      setStaffUsers(res.data || []);
    } catch (e) {
      console.error("Failed to load staff", e);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get("/owner/services");
      setServices(res.data || []);
    } catch (e) {
      console.error("Failed to load services", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/owner/inventory/products");
      setProducts(res.data || []);
    } catch (e) {
      console.error("Failed to load products", e);
    }
  };

  const fetchCustomerGiftCards = async (customerId) => {
    try {
      const res = await api.get(`/owner/customers/${customerId}/gift-cards`);
      setCustomerGiftCards(res.data || []);
    } catch (e) {
      console.error("Failed to load gift cards", e);
    }
  };

  const fetchGiftCards = async () => {
    try {
      const res = await api.get("/owner/gift-cards");
      setGiftCards(res.data || []);
    } catch (e) {
      console.error("Failed to load gift cards", e);
    }
  };

  const fetchCustomerAdvances = async (customerId) => {
    try {
      const res = await api.get(`/owner/customers/${customerId}/advance-payments`);
      setCustomerAdvances(res.data || []);
    } catch (e) {
      console.error("Failed to load advance payments", e);
    }
  };

  const handleAssignMembership = async () => {
    if (!selectedPlan || !selectedCustomer) return;
    const priceVal = Number(membershipForm.price || 0);
    if (priceVal <= 0) {
      setMembershipError("Please enter a valid membership price greater than 0.");
      return;
    }
    const onlineVal = Number(membershipForm.online || 0);
    const offlineVal = Number(membershipForm.offline || 0);
    const advanceVal = Number(membershipForm.advance || 0);
    const totalPayment = onlineVal + offlineVal + advanceVal;
    if (totalPayment <= 0) {
      setMembershipError("Please enter a payment amount (Online, Offline, or Advance).");
      return;
    }
    if (totalPayment > priceVal) {
      setMembershipError("Total payment amount cannot exceed the membership price.");
      return;
    }
    setSavingMessage("Assigning Membership...");
    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        membershipPlanId: selectedPlan.id,
        validityDays: membershipForm.validityDays ? Number(membershipForm.validityDays) : undefined,
        price: membershipForm.price ? Number(membershipForm.price) : undefined,
        staffId: membershipForm.staffId || undefined,
        online: membershipForm.online ? Number(membershipForm.online) : undefined,
        offline: membershipForm.offline ? Number(membershipForm.offline) : undefined,
        balance: assignMembershipBalanceVal,
        advance: membershipForm.advance ? Number(membershipForm.advance) : undefined,
        remarks: membershipForm.remarks || undefined,
        startsAt: membershipForm.purchaseDate || undefined,
      };
      if (selectedPlan.id === "CUSTOM") {
        payload.isCustom = true;
        payload.name = selectedPlan.name || "Custom Membership";
        payload.customServices = customServices.map(s => s.id);
      }
      const res = await api.post("/owner/memberships/assign", payload);
      setShowAssignMembershipModal(false);
      setSelectedPlan(null);
      setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "", balance: "", advance: "", remarks: "", purchaseDate: new Date().toISOString().slice(0, 10) });
      const detail = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(detail.data);
      const invoice = res.data?.invoice || null;
      const planName = res.data?.assignment?.membershipPlan?.name || selectedPlan?.name || "Membership";
      setInvoiceSuccessData({ type: "Membership", name: planName, invoice });
    } catch (e) {
      alert("Failed to assign membership");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceForm.amount || !selectedCustomer) return;
    setSavingMessage("Adding Advance Payment...");
    setSaving(true);
    try {
      await api.post("/owner/advance-payments", {
        customerId: selectedCustomer.id,
        amount: Number(advanceForm.amount),
        mode: advanceForm.mode,
        remark: advanceForm.remark,
      });
      setShowAddAdvanceModal(false);
      setAdvanceForm({ amount: "", mode: "Online", remark: "" });
      fetchCustomerAdvances(selectedCustomer.id);
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to add advance");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedCustomer) return;
    setSavingMessage("Updating Profile...");
    setSaving(true);
    try {
      await api.patch(`/owner/customers/${selectedCustomer.id}`, {
        name: updateForm.name,
        phone: updateForm.phone,
        email: updateForm.email,
        gender: updateForm.gender,
        dateOfBirth: updateForm.dateOfBirth || undefined,
        anniversary: updateForm.anniversary || undefined,
      });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
      setSelectedCustomer((prev) => prev ? { ...prev, name: updateForm.name, phone: updateForm.phone } : prev);
      setDetailTab("profile");
    } catch (e) {
      alert("Failed to update profile");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setSavingMessage("Saving Notes...");
    setSaving(true);
    try {
      await api.patch(`/owner/customers/${selectedCustomer.id}`, { notes });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to save notes");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const fetchPackagePlans = async () => {
    try {
      const res = await api.get("/owner/packages");
      setPackagePlans(res.data || []);
    } catch (e) {
      console.error("Failed to load package plans", e);
    }
  };

  useEffect(() => {
    if (!selectedCustomer) return;
    if (detailTab === "membership" && membershipPlans.length === 0) {
      fetchMembershipPlans();
      fetchStaffUsers();
    }
    if (detailTab === "giftcard") {
      fetchCustomerGiftCards(selectedCustomer.id);
      fetchGiftCards();
      fetchStaffUsers();
    }
    if (detailTab === "advance") {
      fetchCustomerAdvances(selectedCustomer.id);
    }
    if (detailTab === "duebalance") {
      fetchCustomerAdvances(selectedCustomer.id);
    }
    if (detailTab === "packages" && packagePlans.length === 0) {
      fetchPackagePlans();
      fetchStaffUsers();
    }
  }, [detailTab, selectedCustomer, membershipPlans.length, packagePlans.length]);

  useEffect(() => {
    if (selectedPlan?.id === "CUSTOM") {
      const sum = customServices.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
      setMembershipForm(prev => ({ ...prev, price: String(sum) }));
    }
  }, [customServices, selectedPlan?.id]);

  useEffect(() => {
    if (selectedPackage?.id === "CUSTOM") {
      const sum = customServices.reduce((acc, curr) => acc + (Number(curr.price || 0) * (curr.sessions || 1)), 0);
      setPackageForm(prev => ({ ...prev, price: String(sum) }));
    }
  }, [customServices, selectedPackage?.id]);

  const handleIssueGiftCard = async () => {
    setGiftCardError("");
    try {
      if (!selectedCustomer) return;

      if (!giftCardForm.staffId) {
        setGiftCardError("Please select a staff member.");
        return;
      }

      const amountVal = Number(giftCardForm.amount || 0);
      if (amountVal <= 0) {
        setGiftCardError("Please enter a valid gift card amount greater than 0.");
        return;
      }

      const onlineVal = Number(giftCardForm.online || 0);
      const offlineVal = Number(giftCardForm.offline || 0);
      const balanceVal = Number(giftCardForm.balance || 0);
      const totalPayment = onlineVal + offlineVal + balanceVal;

      if (totalPayment !== amountVal) {
        setGiftCardError(`Total payments (Online: ₹${onlineVal} + Offline: ₹${offlineVal} + Balance: ₹${balanceVal} = ₹${totalPayment}) must be equal to the gift card amount (₹${amountVal}).`);
        return;
      }

      const activationDate = giftCardForm.activationDate ? new Date(giftCardForm.activationDate) : new Date();
      const expiresAt = new Date(activationDate);
      expiresAt.setDate(expiresAt.getDate() + (Number(giftCardForm.validityDays) || 30));

      const payloadCode = giftCardForm.code || "GC-" + Math.floor(100000 + Math.random() * 900000);

      setSavingMessage("Issuing Gift Card...");
      setSaving(true);
      await api.post("/owner/gift-cards", {
        customerId: selectedCustomer.id,
        code: payloadCode,
        title: giftCardForm.title || "Gift Card",
        originalAmount: amountVal,
        expiresAt: expiresAt.toISOString().split("T")[0],
      });
      setShowGiftCardModal(false);
      setGiftCardForm({ code: "", title: "", amount: "", validityDays: 30, activationDate: new Date().toISOString().slice(0, 10), staffId: "", online: "", offline: "", balance: "" });
      fetchCustomerGiftCards(selectedCustomer.id);
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.response?.data?.errors?.[0]?.message || "Failed to issue gift card";
      setGiftCardError(errorMsg);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPackage = async () => {
    setPackageError("");
    try {
      if (!selectedCustomer) return;

      if (!packageForm.staffId) {
        setPackageError("Please select a staff member.");
        return;
      }

      const priceVal = Number(packageForm.price || 0);
      if (priceVal <= 0) {
        setPackageError("Please enter a valid package price greater than 0.");
        return;
      }

      const onlineVal = Number(packageForm.online || 0);
      const offlineVal = Number(packageForm.offline || 0);
      const balanceVal = Number(packageForm.balance || 0);
      const totalPayment = onlineVal + offlineVal + balanceVal;

      if (totalPayment !== priceVal) {
        setPackageError(`Total payments (Online: ₹${onlineVal} + Offline: ₹${offlineVal} + Balance: ₹${balanceVal} = ₹${totalPayment}) must be equal to the package price (₹${priceVal}).`);
        return;
      }

      const payload = {
        customerId: selectedCustomer.id,
        packageId: selectedPackage ? selectedPackage.id : "CUSTOM",
        validityDays: packageForm.validityDays ? Number(packageForm.validityDays) : undefined,
        price: priceVal,
        staffId: packageForm.staffId || undefined,
        startsAt: packageForm.purchaseDate || undefined,
        online: onlineVal,
        offline: offlineVal,
        balance: balanceVal,
        remark: packageForm.remark || undefined,
      };
      if (!selectedPackage || selectedPackage.id === "CUSTOM") {
        payload.isCustom = true;
        payload.name = (selectedPackage && selectedPackage.name) || "Custom Package";
        payload.customServices = customServices.map(s => ({ serviceId: s.id, sessions: s.sessions }));
        if (customProducts.length > 0) {
          payload.remark = `${payload.remark ? payload.remark + '\n' : ''}Included Products: ${customProducts.map(p => p.name).join(', ')}`;
        }
      }
      setSavingMessage("Assigning Package...");
      setSaving(true);
      const res = await api.post("/owner/packages/assign", payload);
      setShowPackageModal(false);
      setSelectedPackage(null);
      setPackageForm({ validityDays: "", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10), online: "", offline: "", balance: "", remark: "" });
      const detail = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(detail.data);
      const invoice = res.data?.invoice || null;
      const packName = res.data?.assignment?.package?.name || selectedPackage?.name || "Package";
      setInvoiceSuccessData({ type: "Package", name: packName, invoice });
    } catch (e) {
      const errorMsg = e.response?.data?.message || e.response?.data?.errors?.[0]?.message || "Failed to assign package";
      setPackageError(errorMsg);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleFamilySearch = async (queryVal) => {
    setFamilySearchQuery(queryVal);
    if (!queryVal.trim()) {
      setFamilySearchResults([]);
      return;
    }
    setFamilySearchLoading(true);
    try {
      const response = await api.get("/owner/customers", { params: { q: queryVal } });
      const filtered = (response.data || []).filter(c => c.id !== selectedCustomer?.id);
      setFamilySearchResults(filtered);
    } catch (e) {
      console.error("Failed to search guests", e);
    } finally {
      setFamilySearchLoading(false);
    }
  };

  const handleSelectFamilyGuest = (guest) => {
    setSelectedFamilyGuest(guest);
    setFamilyForm(prev => ({
      ...prev,
      name: guest.name || "",
      phone: guest.phone || "",
    }));
    setFamilySearchResults([]);
    setFamilySearchQuery("");
  };

  const handleAddFamilyMember = async () => {
    setFamilyError("");
    if (!selectedCustomer) {
      setFamilyError("No customer selected");
      return;
    }
    if (!selectedFamilyGuest) {
      setFamilyError("Please search and select a guest");
      return;
    }
    if (!familyForm.relation || !familyForm.relation.trim()) {
      setFamilyError("Relation is required");
      return;
    }

    setSavingMessage("Linking Family Member...");
    setSaving(true);
    try {
      const existingNotes = selectedFamilyGuest.notes || "";
      const familyTag = `familyMemberOf:${selectedCustomer.id} relation:${familyForm.relation.trim().toLowerCase()}`;
      
      let updatedNotes = existingNotes;
      if (!existingNotes.includes(`familyMemberOf:${selectedCustomer.id}`)) {
        updatedNotes = existingNotes ? `${existingNotes} ${familyTag}` : familyTag;
      } else {
        const regex = new RegExp(`familyMemberOf:${selectedCustomer.id}\\s+relation:\\S+`, 'g');
        if (regex.test(existingNotes)) {
          updatedNotes = existingNotes.replace(regex, familyTag);
        } else {
          updatedNotes = `${existingNotes} ${familyTag}`;
        }
      }

      await api.patch(`/owner/customers/${selectedFamilyGuest.id}`, {
        notes: updatedNotes
      });

      setShowFamilyModal(false);
      setSelectedFamilyGuest(null);
      setFamilySearchQuery("");
      setFamilySearchResults([]);
      setFamilyForm({ name: "", phone: "", relation: "" });
      familyError && setFamilyError("");
      
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      setFamilyError(formatApiError(e, "Failed to add family member"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFamilyMember = async (fm) => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Are you sure you want to unlink ${fm.name} from family members?`)) return;
    setSavingMessage("Unlinking Family Member...");
    setSaving(true);
    try {
      const existingNotes = fm.notes || "";
      const regex = new RegExp(`familyMemberOf:${selectedCustomer.id}\\s+relation:\\S+`, 'g');
      const updatedNotes = existingNotes.replace(regex, "").trim();

      await api.patch(`/owner/customers/${fm.id}`, {
        notes: updatedNotes
      });

      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to remove family member");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpForm.date || !followUpForm.message || !followUpForm.staffUserId || !selectedCustomer) return;
    setSavingMessage("Adding Follow Up...");
    setSaving(true);
    try {
      await api.post("/owner/follow-ups", {
        customerId: selectedCustomer.id,
        staffUserId: followUpForm.staffUserId,
        date: followUpForm.date,
        time: followUpForm.time || undefined,
        message: followUpForm.message,
        type: followUpForm.type,
      });
      setShowFollowUpModal(false);
      setFollowUpForm({ date: "", time: "", message: "", type: "email", staffUserId: "" });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to add follow-up");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const openFollowUpModal = async () => {
    if (staffUsers.length === 0) {
      await fetchStaffUsers();
    }
    setFollowUpForm({ date: "", time: "", message: "", type: "email", staffUserId: "" });
    setShowFollowUpModal(true);
  };

  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      await downloadFromApi(`/owner/customers/export?format=${format}`, { fallbackFilename: `Customers.${format}` });
    } catch {
      alert("Could not export customers");
    }
  };

  const handleAddGuest = async (event) => {
    event.preventDefault();
    setSavingMessage("Creating Customer Profile...");
    setSaving(true);
    try {
      await api.post("/owner/customers", formData);
      setShowAddGuest(false);
      setFormData({
        phone: "",
        alternatePhone: "",
        name: "",
        email: "",
        dateOfBirth: "",
        anniversary: "",
        gst: "",
        gender: "female"
      });
      await load();
    } catch (error) {
      alert(formatApiError(error, "Failed to add guest"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (row) => {
    if (!window.confirm(`Delete ${row.name || "this customer"}? If linked history exists, the system will block deletion.`)) return;
    setActionBusy(row.id);
    setSavingMessage("Deleting Customer...");
    setSaving(true);
    try {
      await api.delete(`/owner/customers/${row.id}`);
      setRows((current) => current.filter((entry) => entry.id !== row.id));
      setActiveMenuRowId("");
    } catch (error) {
      alert(formatApiError(error, "Could not delete customer"));
    } finally {
      setActionBusy("");
      setSaving(false);
    }
  };

  const handleMergeCustomer = async () => {
    if (!mergeSourceRow?.id || !mergeTargetId) {
      alert("Please select the target customer");
      return;
    }
    setActionBusy(mergeSourceRow.id);
    setSavingMessage("Merging Customer Profiles...");
    setSaving(true);
    try {
      await api.post("/owner/customers/merge", {
        sourceCustomerId: mergeSourceRow.id,
        targetCustomerId: mergeTargetId
      });
      setMergeSourceRow(null);
      setMergeTargetId("");
      setActiveMenuRowId("");
      await load();
    } catch (error) {
      alert(formatApiError(error, "Could not merge customers"));
    } finally {
      setActionBusy("");
      setSaving(false);
    }
  };

  const visibleRows = rows.filter((row) => {
    const genderValue = String(row.gender || "").toLowerCase();
    const totalPurchase = Number(row.totalSpend || 0);
    const averagePurchase = Number(row.averageSpend || 0);
    const totalOrders = Number(row.totalOrders || 0);
    const advanceAmount = Number(row.advanceAmount || 0);
    const balanceAmount = Number(row.balanceAmount || 0);
    const loyalty = Number(row.loyalty || row.loyaltyPoints || 0);
    const membershipCount = Number(row.membershipCount || 0);
    const activeMembershipCount = Number(row.activeMembershipCount || 0);
    const packageCount = Number(row.packageCount || 0);

    if (query) {
      const haystack = `${row.name || ""} ${row.phone || ""} ${row.email || ""}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    if (appliedFilters.gender && genderValue !== appliedFilters.gender) return false;
    if (appliedFilters.specialDay === "birthday" && !isWithinDateRange(row.dateOfBirth, appliedFilters.lastVisitedStart, appliedFilters.lastVisitedEnd)) return false;
    if (appliedFilters.specialDay === "anniversary" && !isWithinDateRange(row.anniversary, appliedFilters.lastVisitedStart, appliedFilters.lastVisitedEnd)) return false;
    if ((appliedFilters.lastVisitedStart || appliedFilters.lastVisitedEnd) && !isWithinDateRange(row.lastVisitAt, appliedFilters.lastVisitedStart, appliedFilters.lastVisitedEnd)) return false;
    if (appliedFilters.nonReturningDays) {
      const thresholdTime = nowTime - (Number(appliedFilters.nonReturningDays) * 24 * 60 * 60 * 1000);
      const lastVisitTime = row.lastVisitAt ? new Date(row.lastVisitAt).getTime() : 0;
      if (lastVisitTime > thresholdTime) return false;
    }
    if (appliedFilters.advanceState === "yes" && advanceAmount <= 0) return false;
    if (appliedFilters.advanceState === "no" && advanceAmount > 0) return false;
    if (appliedFilters.balanceState === "yes" && balanceAmount <= 0) return false;
    if (appliedFilters.balanceState === "no" && balanceAmount > 0) return false;
    if (appliedFilters.clientRetention === "new" && totalOrders > 1) return false;
    if (appliedFilters.clientRetention === "repeat" && totalOrders < 2) return false;
    if (appliedFilters.visitType === "new" && totalOrders > 1) return false;
    if (appliedFilters.visitType === "repeat" && totalOrders < 2) return false;
    if (appliedFilters.totalPurchaseMin && totalPurchase < Number(appliedFilters.totalPurchaseMin)) return false;
    if (appliedFilters.totalPurchaseMax && totalPurchase > Number(appliedFilters.totalPurchaseMax)) return false;
    if (appliedFilters.averagePurchaseMin && averagePurchase < Number(appliedFilters.averagePurchaseMin)) return false;
    if (appliedFilters.averagePurchaseMax && averagePurchase > Number(appliedFilters.averagePurchaseMax)) return false;
    if (appliedFilters.membershipState === "active" && activeMembershipCount <= 0) return false;
    if (appliedFilters.membershipState === "any" && membershipCount <= 0) return false;
    if (appliedFilters.membershipState === "none" && membershipCount > 0) return false;
    if (appliedFilters.loyaltyState === "yes" && loyalty <= 0) return false;
    if (appliedFilters.loyaltyState === "no" && loyalty > 0) return false;
    if (appliedFilters.packageState === "yes" && packageCount <= 0) return false;
    if (appliedFilters.packageState === "no" && packageCount > 0) return false;
    return true;
  });

  const totalPages = Math.ceil(visibleRows.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [visibleRows.length, currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return visibleRows.slice(startIndex, startIndex + pageSize);
  }, [visibleRows, currentPage, pageSize]);

  const renderFilterContent = () => {
    switch (activeFilterSection) {
      case "gender":
        return (
          <div className="form-group">
            <label>Gender</label>
            <select value={draftFilters.gender} onChange={(event) => setDraftFilters((current) => ({ ...current, gender: event.target.value }))}>
              <option value="">All</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        );
      case "specialDay":
        return (
          <>
            <div className="form-group">
              <label>Special Day</label>
              <select value={draftFilters.specialDay} onChange={(event) => setDraftFilters((current) => ({ ...current, specialDay: event.target.value }))}>
                <option value="">All</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
              </select>
            </div>
            <div className="form-group">
              <label>Starting Date</label>
              <input type="date" value={draftFilters.lastVisitedStart} onChange={(event) => setDraftFilters((current) => ({ ...current, lastVisitedStart: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Ending Date</label>
              <input type="date" value={draftFilters.lastVisitedEnd} onChange={(event) => setDraftFilters((current) => ({ ...current, lastVisitedEnd: event.target.value }))} />
            </div>
          </>
        );
      case "lastVisited":
        return (
          <>
            <div className="form-group">
              <label>Starting Date</label>
              <input type="date" value={draftFilters.lastVisitedStart} onChange={(event) => setDraftFilters((current) => ({ ...current, lastVisitedStart: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Ending Date</label>
              <input type="date" value={draftFilters.lastVisitedEnd} onChange={(event) => setDraftFilters((current) => ({ ...current, lastVisitedEnd: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Visit Type</label>
              <div className="radio-column">
                <label><input type="radio" name="visitType" checked={draftFilters.visitType === "all"} onChange={() => setDraftFilters((current) => ({ ...current, visitType: "all" }))} /> All</label>
                <label><input type="radio" name="visitType" checked={draftFilters.visitType === "new"} onChange={() => setDraftFilters((current) => ({ ...current, visitType: "new" }))} /> New Guest</label>
                <label><input type="radio" name="visitType" checked={draftFilters.visitType === "repeat"} onChange={() => setDraftFilters((current) => ({ ...current, visitType: "repeat" }))} /> Repetitive Guest</label>
              </div>
            </div>
          </>
        );
      case "nonReturning":
        return (
          <div className="form-group">
            <label>Days Since Last Visit</label>
            <input type="number" min="1" placeholder="90" value={draftFilters.nonReturningDays} onChange={(event) => setDraftFilters((current) => ({ ...current, nonReturningDays: event.target.value }))} />
          </div>
        );
      case "advance":
        return (
          <div className="form-group">
            <label>Advance Status</label>
            <select value={draftFilters.advanceState} onChange={(event) => setDraftFilters((current) => ({ ...current, advanceState: event.target.value }))}>
              <option value="">All</option>
              <option value="yes">Has Advance</option>
              <option value="no">No Advance</option>
            </select>
          </div>
        );
      case "balance":
        return (
          <div className="form-group">
            <label>Balance Status</label>
            <select value={draftFilters.balanceState} onChange={(event) => setDraftFilters((current) => ({ ...current, balanceState: event.target.value }))}>
              <option value="">All</option>
              <option value="yes">Has Balance</option>
              <option value="no">No Balance</option>
            </select>
          </div>
        );
      case "clientRetention":
        return (
          <div className="form-group">
            <label>Retention Type</label>
            <select value={draftFilters.clientRetention} onChange={(event) => setDraftFilters((current) => ({ ...current, clientRetention: event.target.value }))}>
              <option value="">All</option>
              <option value="new">New Guest</option>
              <option value="repeat">Repetitive Guest</option>
            </select>
          </div>
        );
      case "totalPurchaseAmount":
        return (
          <>
            <div className="form-group">
              <label>Minimum Amount</label>
              <input type="number" min="0" value={draftFilters.totalPurchaseMin} onChange={(event) => setDraftFilters((current) => ({ ...current, totalPurchaseMin: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Maximum Amount</label>
              <input type="number" min="0" value={draftFilters.totalPurchaseMax} onChange={(event) => setDraftFilters((current) => ({ ...current, totalPurchaseMax: event.target.value }))} />
            </div>
          </>
        );
      case "avgPurchaseAmount":
        return (
          <>
            <div className="form-group">
              <label>Minimum Amount</label>
              <input type="number" min="0" value={draftFilters.averagePurchaseMin} onChange={(event) => setDraftFilters((current) => ({ ...current, averagePurchaseMin: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Maximum Amount</label>
              <input type="number" min="0" value={draftFilters.averagePurchaseMax} onChange={(event) => setDraftFilters((current) => ({ ...current, averagePurchaseMax: event.target.value }))} />
            </div>
          </>
        );
      case "membership":
        return (
          <div className="form-group">
            <label>Membership Status</label>
            <select value={draftFilters.membershipState} onChange={(event) => setDraftFilters((current) => ({ ...current, membershipState: event.target.value }))}>
              <option value="">All</option>
              <option value="active">Active Membership</option>
              <option value="any">Has Membership</option>
              <option value="none">No Membership</option>
            </select>
          </div>
        );
      case "loyalty":
        return (
          <div className="form-group">
            <label>Loyalty Status</label>
            <select value={draftFilters.loyaltyState} onChange={(event) => setDraftFilters((current) => ({ ...current, loyaltyState: event.target.value }))}>
              <option value="">All</option>
              <option value="yes">Has Loyalty</option>
              <option value="no">No Loyalty</option>
            </select>
          </div>
        );
      case "package":
        return (
          <div className="form-group">
            <label>Package Status</label>
            <select value={draftFilters.packageState} onChange={(event) => setDraftFilters((current) => ({ ...current, packageState: event.target.value }))}>
              <option value="">All</option>
              <option value="yes">Has Package</option>
              <option value="no">No Package</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "10px 16px", background: "#f8fafc", minHeight: "100%", width: "100%" }}>
      <style>
        {`
          .crm-toolbar { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; }
          .crm-search { display:flex; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:20px; padding:5px 12px; width:260px; box-shadow: none; }
          .crm-search input { border:none; outline:none; margin-left:6px; font-size:0.8rem; width:100%; color:#334155; background:transparent; min-height:unset; }
          .crm-actions { display:flex; gap:8px; flex-wrap:wrap; }
          .crm-btn { display:flex; align-items:center; gap:5px; background:#3b82f6; color:#fff; border:none; padding:7px 12px; border-radius:6px; font-size:0.78rem; font-weight:600; cursor:pointer; box-shadow: none; min-height:unset; }
          .crm-btn:hover { background:#2563eb; transform:none; filter:none; }
          .crm-btn-light { background:#f8fafc; color:#2563eb; border:1px solid #bfdbfe; box-shadow:none; }
          .crm-btn-light:hover { background:#eff6ff; }
          .crm-table-container { background:#fff; border-radius:8px; box-shadow: none; overflow:auto; }
          .crm-table { width:100%; border-collapse:collapse; white-space:nowrap; }
          .crm-table th { background:#f8fafc; color:#475569; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; padding:8px 12px; text-align:left; border-bottom:2px solid #e2e8f0; }
          .crm-table td { padding:8px 12px; font-size:0.78rem; color:#334155; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
          .crm-table tr:hover { background:#f8fafc; }
          .crm-table-checkbox { width:14px; height:14px; accent-color:#3b82f6; min-height:unset; }
          .crm-pagination { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-top:1px solid #e2e8f0; color:#64748b; font-size:0.78rem; gap:10px; }
          .crm-pagination button { background:none; border:none; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:3px; min-height:unset; box-shadow:none; }
          .crm-pagination button:hover { color:#0f172a; transform:none; filter:none; }
          .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.4); backdrop-filter:blur(4px); z-index:3000; display:flex; align-items:center; justify-content:center; }
          .modal-content { background:#fff; border-radius:12px; width:min(90vw,520px); max-height:90vh; overflow-y:auto; box-shadow: none; }
          .modal-header { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #f1f5f9; }
          .modal-header h3 { margin:0; font-size:1rem; color:#0f172a; }
          .modal-close { background:none; border:none; cursor:pointer; color:#64748b; min-height:unset; box-shadow:none; padding:4px; }
          .modal-body { padding:16px 18px; display:grid; gap:12px; }
          .modal-footer { padding:12px 18px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px; }
          .form-group { display:flex; flex-direction:column; gap:4px; }
          .form-group label { font-size:0.8rem; font-weight:600; color:#475569; }
          .form-group input, .form-group select { padding:7px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:0.82rem; background:#fff; min-height:unset; }
          .radio-group { display:flex; gap:12px; align-items:center; }
          .radio-group label, .radio-column label { display:flex; align-items:center; gap:6px; font-weight:500; cursor:pointer; font-size:0.8rem; }
          .radio-column { display:flex; flex-direction:column; align-items:flex-start; gap:8px; }
          .export-dropdown { position:relative; display:inline-block; }
          .export-menu { position:absolute; top:calc(100% + 4px); right:0; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow: none; min-width:130px; z-index:50; overflow:hidden; }
          .export-item { width:100%; text-align:left; padding:8px 12px; border:none; background:none; cursor:pointer; font-size:0.8rem; color:#475569; min-height:unset; }
          .export-item:hover { background:#f8fafc; color:#0f172a; }
          .sidebar-modal { position:fixed; top:0; right:0; bottom:0; width:min(92vw,520px); background:#fff; box-shadow: none; z-index:1050; display:flex; flex-direction:column; animation:slideIn 0.28s forwards; }
          @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
          .sidebar-modal-header { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #f1f5f9; }
          .sidebar-modal-body { flex:1; display:flex; overflow:hidden; }
          .filter-categories { width:180px; background:#f8fafc; border-right:1px solid #f1f5f9; overflow-y:auto; }
          .filter-category-btn { width:100%; text-align:left; padding:10px 12px; background:none; border:none; font-size:0.82rem; color:#475569; cursor:pointer; border-bottom:1px solid #e2e8f0; min-height:unset; }
          .filter-category-btn.active { background:#fff; color:#0f766e; font-weight:700; border-left:3px solid #0f766e; }
          .filter-options { flex:1; padding:16px; overflow-y:auto; display:grid; gap:12px; }
          .sidebar-modal-footer { padding:12px 18px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:8px; }
          .crm-row-action { position:relative; overflow:visible; }
          .crm-row-action-trigger { width:32px; height:32px; border-radius:6px; border:1px solid #e2e8f0; background:#f8fafc; color:#475569; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; min-height:unset; box-shadow:none; }
          .crm-row-action-trigger:hover { background:#eff6ff; color:#2563eb; border-color:#bfdbfe; transform:none; filter:none; }
          .crm-row-menu { position:absolute; top:calc(100% + 4px); right:0; min-width:170px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; box-shadow: none; padding:6px; z-index:3000; }
          .crm-row-menu button { width:100%; border:none; background:#fff; border-radius:8px; display:flex; align-items:center; gap:8px; padding:9px 12px; font-size:0.82rem; color:#0f172a; cursor:pointer; margin-bottom:4px; min-height:unset; box-shadow:none; }
          .crm-row-menu button:last-child { margin-bottom:0; }
          .crm-row-menu button:hover { background:#f8fafc; transform:none; filter:none; }
          .crm-row-menu .danger { color:#dc2626; }
          .crm-count-badge { display:inline-flex; align-items:center; justify-content:center; min-width:22px; padding:2px 7px; border-radius:999px; background:#eff6ff; color:#2563eb; font-weight:700; font-size:0.72rem; }
          /* Customer Detail Slide-out Panel – Two-column layout */
          .cust-detail-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.25); backdrop-filter:blur(2px); z-index:2000; }
          .cust-detail-panel { position:fixed; top:0; right:0; bottom:0; width:min(95vw,900px); background:#fff; color:#0f172a; display:flex; flex-direction:column; z-index:2001; box-shadow:-8px 0 30px rgba(0,0,0,0.12); animation:slideInRight 0.25s ease-out; }
          @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
          .cust-detail-layout { display:flex; height:100%; overflow:hidden; }
          .cust-detail-sidebar { width:35%; background:#1e293b; color:#fff; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; }
          .cust-detail-sidebar::-webkit-scrollbar { width:4px; }
          .cust-detail-sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
          .cust-detail-sidebar-info { padding:20px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
          .cust-detail-sidebar-info-header { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
          .cust-detail-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#3b82f6,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:700; color:#fff; flex-shrink:0; }
          .cust-detail-name { font-size:1rem; font-weight:700; color:#fff; }
          .cust-detail-phone { font-size:0.8rem; color:#94a3b8; }
          .cust-detail-edit-btn { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#94a3b8; border-radius:6px; padding:5px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; margin-left:auto; flex-shrink:0; }
          .cust-detail-edit-btn:hover { background:rgba(255,255,255,0.15); color:#e2e8f0; }
          .cust-detail-sidebar-fields { display:flex; flex-direction:column; gap:6px; }
          .cust-detail-field { display:flex; flex-direction:column; gap:1px; }
          .cust-detail-field-label { font-size:0.6rem; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
          .cust-detail-field-val { font-size:0.8rem; color:#cbd5e1; font-weight:500; }
          .cust-detail-sidebar-nav { display:flex; flex-direction:column; gap:2px; padding:8px; }
          .cust-detail-nav-btn { display:flex; align-items:center; gap:10px; padding:12px 16px; border:none; background:transparent; color:#94a3b8; font-size:0.82rem; font-weight:600; cursor:pointer; border-radius:8px; transition:all .15s; text-align:left; width:100%; }
          .cust-detail-nav-btn:hover { background:rgba(255,255,255,0.05); color:#e2e8f0; }
          .cust-detail-nav-btn.active { background:rgba(59,130,246,0.2); color:#60a5fa; }
          .cust-detail-content { flex:1; display:flex; flex-direction:column; overflow:hidden; }
          .cust-detail-content-header { padding:16px 20px; border-bottom:1px solid #e2e8f0; font-size:1.1rem; font-weight:700; color:#0f172a; display:flex; justify-content:space-between; align-items:center; background:#fff; flex-shrink:0; }
          .cust-detail-close { background:none; border:none; color:#94a3b8; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
          .cust-detail-close:hover { color:#dc2626; background:#fee2e2; }
          .cust-detail-content-body { flex:1; overflow-y:auto; padding:16px 20px; background:#fff; }
          .cust-detail-content-body::-webkit-scrollbar { width:4px; }
          .cust-detail-content-body::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
          .cust-detail-section { margin-bottom:20px; }
          .cust-detail-section-title { font-size:0.7rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; font-weight:700; }
          .cust-profile-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:0.82rem; }
          .cust-profile-row:last-child { border-bottom:none; }
          .cust-profile-label { color:#64748b; font-weight:500; }
          .cust-profile-val { color:#0f172a; font-weight:600; text-align:right; max-width:55%; word-break:break-all; }
          .cust-order-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; transition:box-shadow .15s; }
          .cust-order-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.06); }
          .cust-order-card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
          .cust-order-invoice { font-size:0.82rem; font-weight:700; color:#2563eb; }
          .cust-order-date { font-size:0.72rem; color:#94a3b8; }
          .cust-order-amount { font-size:0.9rem; font-weight:700; color:#16a34a; }
          .cust-order-status { font-size:0.65rem; padding:2px 8px; border-radius:999px; font-weight:700; }
          .cust-order-status.PAID { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
          .cust-order-status.UNPAID { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
          .cust-order-status.PARTIAL { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
          .cust-order-status.CANCELLED { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }
          .cust-order-items { display:flex; flex-direction:column; gap:4px; }
          .cust-order-item { display:flex; justify-content:space-between; font-size:0.75rem; color:#475569; padding:3px 0; border-bottom:1px solid #f1f5f9; }
          .cust-order-item:last-child { border-bottom:none; }
          .cust-order-item-staff { font-size:0.65rem; color:#94a3b8; }
          .cust-membership-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
          .cust-mem-name { font-size:0.9rem; font-weight:700; color:#0f172a; }
          .cust-mem-status { font-size:0.65rem; padding:2px 8px; border-radius:999px; font-weight:700; display:inline-flex; }
          .cust-mem-status.ACTIVE { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
          .cust-mem-status.EXPIRED { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }
          .cust-mem-meta { font-size:0.75rem; color:#64748b; margin-top:4px; }
          .cust-pkg-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
          .cust-pkg-name { font-size:0.9rem; font-weight:700; color:#0f172a; }
          .cust-pkg-sessions { font-size:0.8rem; color:#d97706; font-weight:600; margin-top:4px; }
          .cust-pkg-meta { font-size:0.75rem; color:#64748b; margin-top:4px; }
          .cust-gift-card { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #bbf7d0; }
          .cust-gift-card.expired { background:#f8fafc; border-color:#e2e8f0; opacity:0.7; }
          .cust-gift-balance { font-size:1.1rem; font-weight:700; color:#16a34a; margin-top:6px; }
          .cust-advance-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
          .cust-due-card { background:#fef2f2; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #fecaca; }
          .cust-empty-state { color:#64748b; font-size:0.85rem; text-align:center; padding:40px 20px; }
          .cust-assign-btn { background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; margin-top:12px; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
          .cust-assign-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,0.3); }
          .cust-add-btn { background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
          .cust-add-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,0.3); }
          /* Membership modal plan cards */
          /* Advance paymode toggle */
          .cust-paymode-toggle { display:flex; gap:0; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; }
          .cust-paymode-btn { flex:1; padding:8px 16px; border:none; background:#f8fafc; color:#64748b; font-size:0.82rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .15s; }
          .cust-paymode-btn.active { background:#2563eb; color:#fff; }
          .cust-paymode-btn:hover:not(.active) { background:#f1f5f9; }
          @media (max-width: 768px) {
            .crm-toolbar { flex-direction:column; align-items:stretch; }
            .crm-search { width:100%; }
            .crm-actions { overflow-x:auto; padding-bottom:8px; }
            .filter-categories { width:160px; }
            .cust-detail-panel { width:100vw; }
          }
        `}
      </style>

      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="sidebar-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sidebar-modal-header">
              <h3>Filters</h3>
              <button className="modal-close" onClick={() => setShowFilters(false)}><X size={20} /></button>
            </div>
            <div className="sidebar-modal-body">
              <div className="filter-categories">
                {FILTER_SECTIONS.map((section) => (
                  <button key={section.key} className={`filter-category-btn ${activeFilterSection === section.key ? "active" : ""}`} onClick={() => setActiveFilterSection(section.key)}>
                    {section.label}
                  </button>
                ))}
              </div>
              <div className="filter-options">
                <div className="form-group">
                  <label>Quick Filter</label>
                  <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                    <option value="">All Customers</option>
                    <option value="high_spender">High Spenders (INR 10k+)</option>
                    <option value="lost_customer">Non-Returning (90+ Days)</option>
                    <option value="active_membership">Active Membership</option>
                    <option value="active_package">Active Package</option>
                    <option value="birthday_month">Birthday This Month</option>
                    <option value="anniversary_month">Anniversary This Month</option>
                  </select>
                </div>
                {renderFilterContent()}
              </div>
            </div>
            <div className="sidebar-modal-footer">
              <button
                className="crm-btn"
                onClick={() => {
                  setFilterType("");
                  setDraftFilters(EMPTY_ADVANCED_FILTERS);
                  setAppliedFilters(EMPTY_ADVANCED_FILTERS);
                  setShowFilters(false);
                }}
              >
                Clear
              </button>
              <button
                className="crm-btn"
                onClick={() => {
                  setAppliedFilters(draftFilters);
                  setShowFilters(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeSourceRow && (
        <div className="modal-overlay" onClick={() => { setMergeSourceRow(null); setMergeTargetId(""); }}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Merge Customer</h3>
              <button className="modal-close" onClick={() => { setMergeSourceRow(null); setMergeTargetId(""); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Source Customer</label>
                <input value={`${mergeSourceRow.name || "-"} (${mergeSourceRow.phone || "-"})`} disabled />
              </div>
              <div className="form-group">
                <label>Target Customer</label>
                <select value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}>
                  <option value="">Select target customer</option>
                  {rows.filter((row) => row.id !== mergeSourceRow.id).map((row) => (
                    <option key={row.id} value={row.id}>{row.name || "-"} ({row.phone || "-"})</option>
                  ))}
                </select>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.92rem" }}>
                Linked invoices, appointments, memberships, packages, loyalty, notifications, timeline, and WhatsApp logs will move into the target customer.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="crm-btn" onClick={() => { setMergeSourceRow(null); setMergeTargetId(""); }}>Cancel</button>
              <button type="button" className="crm-btn" onClick={handleMergeCustomer} disabled={!mergeTargetId || actionBusy === mergeSourceRow.id}>
                {actionBusy === mergeSourceRow.id ? "Merging..." : "Merge Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGuest && (
        <div className="modal-overlay" onClick={() => setShowAddGuest(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Guest</h3>
              <button className="modal-close" onClick={() => setShowAddGuest(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddGuest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <IndianPhoneInput required value={formData.phone} onChange={(phone) => setFormData((current) => ({ ...current, phone }))} />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input required type="text" value={formData.name} placeholder="Guest Name" onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <div className="radio-group">
                    <label><input type="radio" name="gender" checked={formData.gender === "female"} onChange={() => setFormData((current) => ({ ...current, gender: "female" }))} /> Female</label>
                    <label><input type="radio" name="gender" checked={formData.gender === "male"} onChange={() => setFormData((current) => ({ ...current, gender: "male" }))} /> Male</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Alternate Mobile Number</label>
                  <IndianPhoneInput value={formData.alternatePhone} onChange={(alternatePhone) => setFormData((current) => ({ ...current, alternatePhone }))} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>DOB</label>
                  <input type="date" value={formData.dateOfBirth} onChange={(event) => setFormData((current) => ({ ...current, dateOfBirth: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Anniversary Date</label>
                  <input type="date" value={formData.anniversary} onChange={(event) => setFormData((current) => ({ ...current, anniversary: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input type="text" value={formData.gst} onChange={(event) => setFormData((current) => ({ ...current, gst: event.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="crm-btn" onClick={() => setShowAddGuest(false)}>Cancel</button>
                <button type="submit" className="crm-btn">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="crm-toolbar">
        <div className="crm-search">
          <Search size={18} color="#94a3b8" />
          <input type="text" placeholder="Name Or Number" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load(query, filterType)} />
        </div>
        <div className="crm-actions">
          <button className="crm-btn crm-btn-light" onClick={() => setShowFilters(true)}><Filter size={16} /> Filters</button>
          <button className="crm-btn" onClick={() => setShowAddGuest(true)}><Plus size={16} /> Add Guest</button>
          <button className="crm-btn"><Download size={16} /> Import</button>
          <div className="export-dropdown">
            <button className="crm-btn" onClick={() => setShowExportMenu((current) => !current)}><Upload size={16} /> Export <ChevronDown size={16} /></button>
            {showExportMenu && (
              <div className="export-menu">
                <button className="export-item" onClick={() => handleExport("xlsx")}>Export as XLSX</button>
                <button className="export-item" onClick={() => handleExport("xls")}>Export as XLS</button>
                <button className="export-item" onClick={() => handleExport("csv")}>Export as CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crm-table-container">
        {loading ? (
          <PageLoader title="Loading Customers..." message="Please wait while we fetch your CRM data." />
        ) : (
          <>
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" className="crm-table-checkbox" /></th>
                  <th>MOBILE NO.</th>
                  <th>NAME</th>
                  <th>GENDER</th>
                  <th>LAST VISITED</th>
                  <th>TOTAL<br />ORDERS</th>
                  <th>TOTAL<br />PURCHASE AMOUNT</th>
                  <th>AVERAGE<br />PURCHASE AMOUNT</th>
                  <th>ONLINE<br />VISITS</th>
                  <th>LOYALTY</th>
                  <th>REFERRAL<br />CODE</th>
                  <th>ADVANCE</th>
                  <th>BALANCE</th>
                  <th>MEMBERSHIP<br />COUNT</th>
                  <th>PACKAGE<br />COUNT</th>
                  <th>BIRTH<br />DATE</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={(event) => {
                      const target = event.target;
                      if (target instanceof Element && target.closest(".crm-row-action")) return;
                      openCustomerDetail(row);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td><input type="checkbox" className="crm-table-checkbox" /></td>
                    <td style={{ color: "#0f172a", fontWeight: 600 }}>{row.phone || "-"}</td>
                    <td style={{ fontWeight: 600 }}>{row.name || "-"}</td>
                    <td>{row.gender ? `${row.gender.charAt(0).toUpperCase()}${row.gender.slice(1).toLowerCase()}` : "-"}</td>
                    <td>{formatCompactDate(row.lastVisitAt)}</td>
                    <td><span className="crm-count-badge">{Number(row.totalOrders || 0)}</span></td>
                    <td>{Number(row.totalSpend || 0) ? formatMoney(row.totalSpend) : "-"}</td>
                    <td>{Number(row.averageSpend || 0) ? formatMoney(row.averageSpend) : "-"}</td>
                    <td>{Number(row.onlineVisits || 0) || "-"}</td>
                    <td>{Number(row.loyaltyPoints ?? row.loyalty ?? 0)}</td>
                    <td>{row.referralCode || "-"}</td>
                    <td>{Number(row.advanceAmount || 0) ? formatMoney(row.advanceAmount) : "-"}</td>
                    <td>{Number(row.balanceAmount || 0) ? formatMoney(row.balanceAmount) : "-"}</td>
                    <td>{Number(row.membershipCount || 0) || "-"}</td>
                    <td>{Number(row.packageCount || 0) || "-"}</td>
                    <td>{formatCompactDate(row.dateOfBirth, false)}</td>
                    <td className="crm-row-action" onClick={(e) => e.stopPropagation()}>
                      <button className="crm-row-action-trigger" onClick={(e) => { e.stopPropagation(); setActiveMenuRowId((current) => current === row.id ? "" : row.id); }}>
                        <MoreVertical size={18} />
                      </button>
                      {activeMenuRowId === row.id && (
                        <div className="crm-row-menu" ref={actionMenuRef}>
                          <button className="danger" onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(row); }} disabled={actionBusy === row.id}>
                            <Trash2 size={16} /> {actionBusy === row.id ? "Working..." : "Delete"}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setMergeSourceRow(row); setMergeTargetId(""); setActiveMenuRowId(""); }}>
                            <GitMerge size={16} /> Merge
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openWhatsAppForCustomer(row); }}>
                            <MessageCircle size={16} /> Whatsapp
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan="17" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      No customers found for the current search or filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="crm-pagination">
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1}
                  style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronsLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                  disabled={currentPage === 1}
                  style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                >
                  <ChevronLeft size={18} />
                </button>
                
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                  disabled={currentPage === totalPages}
                  style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages}
                  style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
                {visibleRows.length > 0 ? (
                  `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, visibleRows.length)} of ${visibleRows.length}`
                ) : (
                  "0-0 of 0"
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Customer Detail Slide-out Panel – Two-Column Layout */}
      {selectedCustomer && (
        <>
          <div className="cust-detail-overlay" onClick={closeCustomerDetail} />
          <div className="cust-detail-panel">
            <div className="cust-detail-layout">
              {/* Left Sidebar */}
              <div className="cust-detail-sidebar">
                <div className="cust-detail-sidebar-info">
                  <div className="cust-detail-sidebar-info-header">
                    <div className="cust-detail-avatar">{(selectedCustomer.name || "?")[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cust-detail-name">{selectedCustomer.name || "-"}</div>
                      <div className="cust-detail-phone">{selectedCustomer.phone}</div>
                    </div>
                    <button className="cust-detail-edit-btn" onClick={() => setDetailTab("updateprofile")} title="Edit Profile">
                      <Edit3 size={16} />
                    </button>
                  </div>
                  <div className="cust-detail-sidebar-fields">
                    {customerDetail && [
                      { label: "Email", val: customerDetail.email || "Not given" },
                      { label: "GSTIN", val: customerDetail.gst || "-" },
                      { label: "Gender", val: customerDetail.gender ? customerDetail.gender.charAt(0).toUpperCase() + customerDetail.gender.slice(1) : "-" },
                      { label: "Birth Date", val: customerDetail.dateOfBirth ? formatCompactDate(customerDetail.dateOfBirth) : "Not given" },
                      { label: "Anniversary", val: customerDetail.anniversary ? formatCompactDate(customerDetail.anniversary) : "Not given" },
                      { label: "Last Visited", val: customerDetail.lastVisitAt ? formatCompactDate(customerDetail.lastVisitAt) : "Not visited" },
                      { label: "Lifetime Visits", val: Number(customerDetail.totalOrders || 0) },
                      { label: "Loyalty Points", val: Number(customerDetail.loyaltyPoints || customerDetail.loyalty || 0) },
                      { label: "Referral Code", val: customerDetail.referralCode || "-" },
                    ].map(({ label, val }) => (
                      <div key={label} className="cust-detail-field">
                        <span className="cust-detail-field-label">{label}</span>
                        <span className="cust-detail-field-val">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <nav className="cust-detail-sidebar-nav">
                  {[
                    { key: "profile", icon: User, label: "Profile Info" },
                    { key: "orders", icon: FileText, label: "Orders" },
                    { key: "membership", icon: CreditCard, label: "Membership" },
                    { key: "giftcard", icon: Gift, label: "Gift Card" },
                    { key: "advance", icon: Wallet, label: "Advance" },
                    { key: "duebalance", icon: AlertCircle, label: "Due Balances" },
                    { key: "packages", icon: Package, label: "Packages" },
                    { key: "family", icon: Users, label: "Family Members" },
                    { key: "updateprofile", icon: UserCog, label: "Update Profile" },
                    { key: "segments", icon: Tag, label: "Segments" },
                    { key: "followup", icon: Phone, label: "Follow Up" },
                    { key: "notes", icon: StickyNote, label: "Notes" },
                  ].map(({ key, icon: Icon, label }) => (
                    <button key={key} className={`cust-detail-nav-btn${detailTab === key ? " active" : ""}`} onClick={() => setDetailTab(key)}>
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right Content Panel */}
              <div className="cust-detail-content">
                <div className="cust-detail-content-header">
                  <span>
                    {[
                      { key: "profile", label: "Profile Info" },
                      { key: "orders", label: "Orders" },
                      { key: "membership", label: "Membership" },
                      { key: "giftcard", label: "Gift Card" },
                      { key: "advance", label: "Advance" },
                      { key: "duebalance", label: "Due Balances" },
                      { key: "packages", label: "Packages" },
                      { key: "family", label: "Family Members" },
                      { key: "updateprofile", label: "Update Profile" },
                      { key: "segments", label: "Segments" },
                      { key: "followup", label: "Follow Up" },
                      { key: "notes", label: "Notes" },
                    ].find(t => t.key === detailTab)?.label || "Details"}
                  </span>
                  <button className="cust-detail-close" onClick={closeCustomerDetail}>
                    <X size={20} />
                  </button>
                </div>
                <div className="cust-detail-content-body">
                  {customerDetailLoading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading...</div>
                  ) : !customerDetail ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Could not load data</div>
                  ) : (
                    <>
                      {/* Profile Info Tab */}
                      {detailTab === "profile" && (
                        <div className="cust-detail-section">
                          {[
                            { label: "Name", val: customerDetail.name || "-" },
                            { label: "Phone", val: customerDetail.phone || "-" },
                            { label: "Email", val: customerDetail.email || "Not given yet!" },
                            { label: "GSTIN", val: customerDetail.gst || "-" },
                            { label: "Gender", val: customerDetail.gender ? customerDetail.gender.charAt(0).toUpperCase() + customerDetail.gender.slice(1) : "-" },
                            { label: "Birth Date", val: customerDetail.dateOfBirth ? formatCompactDate(customerDetail.dateOfBirth) : "Not given yet!" },
                            { label: "Anniversary", val: customerDetail.anniversary ? formatCompactDate(customerDetail.anniversary) : "Not given yet!" },
                            { label: "Last Visited", val: customerDetail.lastVisitAt ? formatCompactDate(customerDetail.lastVisitAt) : "Not visited yet!" },
                            { label: "Lifetime Visit Count", val: Number(customerDetail.totalOrders || 0) },
                            { label: "Loyalty Points", val: Number(customerDetail.loyaltyPoints || 0) },
                            { label: "Referral Code", val: customerDetail.referralCode || "-" },
                          ].map(({ label, val }) => (
                            <div key={label} className="cust-profile-row">
                              <span className="cust-profile-label">{label}</span>
                              <span className="cust-profile-val">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Orders Tab */}
                      {detailTab === "orders" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Order History ({(customerDetail.invoices || []).length})</div>
                          {(customerDetail.invoices || []).length === 0 ? (
                            <div className="cust-empty-state">No orders yet</div>
                          ) : (
                            (customerDetail.invoices || []).map(inv => (
                              <div key={inv.id} className="cust-order-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                  <div>
                                    <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#0f172a" }}>Invoice No: {inv.invoiceNumber}</div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>{new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}</div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <button 
                                      type="button" 
                                      onClick={() => setSelectedBillInvoice(inv)} 
                                      style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", color: "#475569", width: "36px", height: "36px", minWidth: "36px", minHeight: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                                      title="View Bill Invoice"
                                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                                    >
                                      <FileText size={20} />
                                    </button>
                                    <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#475569" }}>{formatMoney(inv.total)}</div>
                                  </div>
                                </div>

                                <div style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: "700", marginBottom: "8px" }}>Services</div>
                                
                                {(inv.items || []).length > 0 && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                                    {inv.items.map((item, i) => {
                                      const itemDiscountPct = Number(item.discountPct || 0);
                                      const itemDiscountAmt = Number(item.discountValue || 0) || (item.price && item.qty ? (item.price * item.qty * itemDiscountPct / 100) : 0);
                                      return (
                                        <div key={i} style={{ display: "flex", flexDirection: "column", fontSize: "0.8rem", borderBottom: i < inv.items.length - 1 ? "1px solid #f1f5f9" : "none", paddingBottom: i < inv.items.length - 1 ? "12px" : "0" }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ color: "#1e293b", fontWeight: "600", flex: 1 }}>{item.serviceName || item.productName || "Item"}</div>
                                            {item.staffName && (
                                              <div style={{ color: "#475569", fontSize: "0.78rem", paddingRight: "16px" }}>{item.staffName}</div>
                                            )}
                                            <div style={{ color: "#475569", fontWeight: "500", minWidth: "60px", textAlign: "right" }}>{formatMoney(item.lineTotal || 0)}</div>
                                          </div>
                                          {item.categoryName && (
                                            <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>{item.categoryName}</div>
                                          )}
                                          {itemDiscountPct > 0 && (
                                            <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "500", marginTop: "4px" }}>
                                              Discount applied of {Number(itemDiscountPct).toFixed(2)}%
                                            </div>
                                          )}
                                          {itemDiscountAmt > 0 && (
                                            <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "500", marginTop: "2px" }}>
                                              Discount applied Amount {formatMoney(itemDiscountAmt)}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.78rem", borderTop: "1px solid #e2e8f0", paddingTop: "12px", color: "#64748b" }}>
                                  {inv.paymode && (
                                    <div>
                                      Paymode: {inv.paymode} ({inv.total}),
                                    </div>
                                  )}

                                  {inv.discountAmount > 0 && (
                                    <div>
                                      Total Discount: {inv.discountAmount} ₹.
                                    </div>
                                  )}

                                  {inv.notes && (
                                    <div style={{ color: "#d97706", fontWeight: "500", marginTop: "4px", background: "#fffbeb", padding: "6px 10px", borderRadius: "6px", border: "1px solid #fef3c7" }}>
                                      Instruction: {inv.notes}
                                    </div>
                                  )}

                                  {Number(inv.balanceAmount || 0) > 0 && (
                                    <div style={{ marginTop: "4px", padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#991b1b", fontWeight: "600" }}>
                                      Balance Due: {formatMoney(inv.balanceAmount)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Membership Tab */}
                      {detailTab === "membership" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Active Memberships</div>
                          {(customerDetail.memberships || []).length === 0 ? (
                            <div className="cust-empty-state">No active memberships</div>
                          ) : (
                            (customerDetail.memberships || []).map(m => {
                              const isActive = m.status === "ACTIVE" && new Date(m.endsAt) > new Date();
                              return (
                                <div key={m.id} className="cust-membership-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div className="cust-mem-name">{m.membershipPlan?.name || "Membership"}</div>
                                    <span className={`cust-mem-status ${isActive ? "ACTIVE" : "EXPIRED"}`}>{isActive ? "ACTIVE" : m.status}</span>
                                  </div>
                                  <div className="cust-mem-meta">
                                    Valid: {new Date(m.startsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })} → {new Date(m.endsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                                  </div>
                                  {m.remainingWalletValue != null && (
                                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                                      Wallet Balance: {formatMoney(m.remainingWalletValue)}
                                    </div>
                                  )}
                                  {m.remarks && (
                                    <div style={{ marginTop: "8px", fontSize: "0.78rem", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", fontStyle: "italic" }}>
                                      Note: {m.remarks}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <button className="cust-assign-btn" onClick={() => { fetchMembershipPlans(); fetchStaffUsers(); fetchServices(); setSelectedPlan(null); setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "", balance: "", advance: "", remarks: "", purchaseDate: new Date().toISOString().slice(0, 10) }); setMembershipSearch(""); setCustomServices([]); setMembershipError(""); setShowAssignMembershipModal(true); }}>
                            <CreditCard size={16} /> Assign Membership
                          </button>
                        </div>
                      )}

                      {/* Gift Card Tab */}
                      {detailTab === "giftcard" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Gift Cards</div>
                          {customerGiftCards.length === 0 ? (
                            <div className="cust-empty-state">No gift cards found</div>
                          ) : (
                            customerGiftCards.map((gc) => (
                              <div key={gc.id} className={`cust-gift-card${gc.status !== "ACTIVE" ? " expired" : ""}`}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{gc.code || "Gift Card"}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                                      {gc.expiresAt ? `Expires: ${formatCompactDate(gc.expiresAt)}` : "No expiry"}
                                    </div>
                                  </div>
                                  <span className={`cust-mem-status ${gc.status === "ACTIVE" ? "ACTIVE" : "EXPIRED"}`}>{gc.status || "UNKNOWN"}</span>
                                </div>
                                <div className="cust-gift-balance">Balance: {formatMoney(gc.balance || 0)}</div>
                              </div>
                            ))
                          )}
                          <button className="cust-assign-btn" onClick={() => {
                            setGiftCardForm({
                              code: "GC-" + Math.floor(100000 + Math.random() * 900000),
                              title: "Gift Card",
                              amount: "",
                              validityDays: 30,
                              activationDate: new Date().toISOString().slice(0, 10),
                              staffId: "",
                              online: "",
                              offline: "",
                              balance: ""
                            });
                            setGiftCardError("");
                            setShowGiftCardModal(true);
                          }}>
                            <Gift size={16} /> Issue Gift Card
                          </button>
                        </div>
                      )}

                      {/* Advance Tab */}
                      {detailTab === "advance" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Advance Balance</div>
                          <div className="cust-advance-card">
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Current Advance</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
                              {formatMoney(customerDetail.advanceAmount || 0)}
                            </div>
                          </div>
                          {customerAdvances.length > 0 && (
                            <>
                              <div className="cust-detail-section-title" style={{ marginTop: "16px" }}>History</div>
                              {customerAdvances.map((adv) => (
                                <div key={adv.id} className="cust-advance-card">
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatMoney(adv.amount)}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatCompactDate(adv.createdAt)}</div>
                                  </div>
                                  {adv.mode && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>Mode: {adv.mode}</div>}
                                  {adv.remark && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>{adv.remark}</div>}
                                </div>
                              ))}
                            </>
                          )}
                          <button className="cust-add-btn" style={{ marginTop: "12px" }} onClick={() => setShowAddAdvanceModal(true)}>
                            <Plus size={16} /> Add Advance
                          </button>
                        </div>
                      )}

                      {/* Due Balances Tab */}
                      {detailTab === "duebalance" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Due Balances</div>
                          {(() => {
                            const unpaidInvoices = (customerDetail.invoices || []).filter(inv => Number(inv.balanceAmount || 0) > 0);
                            if (unpaidInvoices.length === 0) {
                              return <div className="cust-empty-state">No outstanding balances</div>;
                            }
                            return unpaidInvoices.map(inv => (
                              <div key={inv.id} className="cust-due-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>Invoice #{inv.invoiceNumber}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatCompactDate(inv.createdAt)}</div>
                                  </div>
                                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>{formatMoney(inv.balanceAmount)}</div>
                                </div>
                              </div>
                            ));
                          })()}
                          {customerAdvances.filter(a => a.type === "due" || a.balance > 0).length > 0 && (
                            <>
                              <div className="cust-detail-section-title" style={{ marginTop: "16px" }}>Advance Balance</div>
                              <div className="cust-advance-card">
                                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#16a34a" }}>
                                  {formatMoney(customerDetail.advanceAmount || 0)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Packages Tab */}
                      {detailTab === "packages" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Packages ({(customerDetail.packages || []).length})</div>
                          {(customerDetail.packages || []).length === 0 ? (
                            <div className="cust-empty-state">No packages</div>
                          ) : (
                            (customerDetail.packages || []).map(p => {
                              const isActive = String(p.status) === "ACTIVE" && new Date(p.endsAt) > new Date();
                              return (
                                <div key={p.id} className="cust-pkg-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div className="cust-pkg-name">{p.package?.name || "Package"}</div>
                                    <span className={`cust-mem-status ${isActive ? "ACTIVE" : "EXPIRED"}`}>{isActive ? "ACTIVE" : p.status}</span>
                                  </div>
                                  <div className="cust-pkg-sessions">Sessions Remaining: {p.remainingSessions ?? "-"}</div>
                                  <div className="cust-pkg-meta">
                                    Valid: {new Date(p.startsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })} → {new Date(p.endsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                                  </div>
                                  {(p.package?.services || []).length > 0 && (
                                    <div style={{ marginTop: "10px" }}>
                                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase" }}>Services</div>
                                      {p.package.services.map((svc, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #e2e8f0" }}>
                                          <span>{svc.service?.name || "-"}</span>
                                          <span>{svc.sessions || 1} session{svc.sessions > 1 ? "s" : ""}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <button className="cust-assign-btn" onClick={() => { fetchPackagePlans(); fetchStaffUsers(); fetchServices(); fetchProducts(); setSelectedPackage(null); setPackageForm({ validityDays: "30", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10), online: "", offline: "", balance: "", remark: "" }); setPackageSearch(""); setCustomServices([]); setCustomProducts([]); setPackageError(""); setShowPackageModal(true); }}>
                            <Package size={16} /> Assign Package
                          </button>
                        </div>
                      )}

                      {/* Family Members Tab */}
                      {detailTab === "family" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Family Members</div>
                          {(customerDetail.familyMembers || []).length === 0 ? (
                            <div className="cust-empty-state">
                              <Users size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                              <div>No family members linked yet</div>
                            </div>
                          ) : (
                            (customerDetail.familyMembers || []).map((fm) => {
                              const fmNotes = fm.notes || "";
                              const match = fmNotes.match(new RegExp(`familyMemberOf:${selectedCustomer.id}\\s+relation:(\\S+)`));
                              const relation = match && match[1] ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : "Linked";
                              return (
                                <div key={fm.id} className="cust-membership-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{fm.name}</div>
                                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fm.phone}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <span className="cust-mem-status ACTIVE" style={{ textTransform: "capitalize" }}>{relation}</span>
                                      <button 
                                        onClick={() => handleRemoveFamilyMember(fm)} 
                                        style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                                        title="Unlink family member"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <button className="cust-assign-btn" onClick={() => setShowFamilyModal(true)}>
                            <Users size={16} /> Add Family Member
                          </button>
                        </div>
                      )}

                      {/* Update Profile Tab */}
                      {detailTab === "updateprofile" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Update Profile</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div className="form-group">
                              <label>Name</label>
                              <input type="text" value={updateForm.name} onChange={(e) => setUpdateForm(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label>Phone</label>
                              <IndianPhoneInput value={updateForm.phone} onChange={(phone) => setUpdateForm(prev => ({ ...prev, phone }))} />
                            </div>
                            <div className="form-group">
                              <label>Email</label>
                              <input type="email" value={updateForm.email} onChange={(e) => setUpdateForm(prev => ({ ...prev, email: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label>Gender</label>
                              <select value={updateForm.gender} onChange={(e) => setUpdateForm(prev => ({ ...prev, gender: e.target.value }))}>
                                <option value="">Select</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Date of Birth</label>
                              <input type="date" value={updateForm.dateOfBirth} onChange={(e) => setUpdateForm(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
                            </div>
                            <div className="form-group">
                              <label>Anniversary</label>
                              <input type="date" value={updateForm.anniversary} onChange={(e) => setUpdateForm(prev => ({ ...prev, anniversary: e.target.value }))} />
                            </div>
                            <button className="cust-assign-btn" onClick={handleUpdateProfile} style={{ marginTop: "8px" }}>
                              <CheckCircle size={16} /> Save Changes
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Segments Tab */}
                      {detailTab === "segments" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Segments</div>
                          {(customerDetail.segments || []).length === 0 ? (
                            <div className="cust-empty-state">
                              <Tag size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                              <div>No segments assigned</div>
                            </div>
                          ) : (
                            (customerDetail.segments || []).map((seg, i) => (
                              <div key={i} className="cust-membership-card">
                                <div className="cust-mem-name">{seg.name || seg}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Follow Up Tab */}
                      {detailTab === "followup" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Follow Up History</div>
                          {(customerDetail.followUps || []).length === 0 ? (
                            <div className="cust-empty-state">
                              <Phone size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                              <div>No follow-ups scheduled</div>
                            </div>
                          ) : (
                            (customerDetail.followUps || []).map((fu, i) => (
                              <div key={i} className="cust-membership-card">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>{fu.message || fu.note || "Follow Up"}</div>
                                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatCompactDate(fu.createdAt || fu.date)}</div>
                                </div>
                                {fu.status && <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>Status: {fu.status}</div>}
                              </div>
                            ))
                          )}
                          <button className="cust-assign-btn" onClick={openFollowUpModal}>
                            <Phone size={16} /> Add Follow Up
                          </button>
                        </div>
                      )}

                      {/* Notes Tab */}
                      {detailTab === "notes" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Notes</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add notes about this customer..."
                              rows={6}
                              style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                            />
                            <button className="cust-assign-btn" onClick={handleSaveNotes}>
                              <CheckCircle size={16} /> Save Notes
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Assign Membership Modal */}
      {/* Assign Membership Modal */}
      {showAssignMembershipModal && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 9999 }}>
          <div className="modal-content" style={{ width: "min(95vw, 950px)", borderRadius: 20, padding: 0, overflow: "hidden", background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "85vh", height: "auto" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "#0f172a", letterSpacing: "-0.02em" }}>Assign Membership</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>Assign a membership plan to {selectedCustomer?.name}</div>
              </div>
              <button onClick={() => setShowAssignMembershipModal(false)} style={{ background: "#f1f5f9", border: "none", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "28px", display: "flex", gap: "28px", flex: 1, minHeight: 0, overflow: "hidden" }}>
              {/* Left Column: Search & Membership Plan Cards */}
              <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: "18px", borderRight: "1px solid #f1f5f9", paddingRight: "28px", minHeight: 0 }}>
                <div style={{ position: "relative" }}>
                  <input 
                    placeholder="Search membership plans..." 
                    value={membershipSearch} 
                    onChange={(e) => setMembershipSearch(e.target.value)} 
                    style={{ 
                      width: "100%", 
                      padding: "12px 14px 12px 40px", 
                      border: "1px solid #cbd5e1", 
                      borderRadius: 10, 
                      fontSize: "0.9rem", 
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "all 0.2s",
                      fontFamily: "inherit"
                    }} 
                    onFocus={(e) => e.target.style.borderColor = "#2563eb"}
                    onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
                  />
                  <span style={{ position: "absolute", left: 14, top: 13, color: "#94a3b8" }}>
                    <Search size={16} />
                  </span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", paddingRight: "6px" }}>
                  {membershipPlans.length === 0 ? null : (
                    membershipPlans
                      .filter((plan) => plan.name.toLowerCase().includes(membershipSearch.toLowerCase()))
                      .map((plan) => {
                        const isSelected = selectedPlan?.id === plan.id;
                        return (
                          <div 
                            key={plan.id} 
                            onClick={() => {
                              setSelectedPlan(plan);
                              setMembershipForm((prev) => ({
                                ...prev,
                                validityDays: String(plan.validityDays || ""),
                                price: String(plan.price || ""),
                                online: "",
                                offline: "",
                                advance: "",
                              }));
                              setMembershipError("");
                            }} 
                            style={{ 
                              background: isSelected ? "#eff6ff" : "#fff", 
                              border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0", 
                              borderRadius: 12, 
                              padding: "16px", 
                              cursor: "pointer", 
                              transition: "all 0.2s",
                              boxShadow: isSelected ? "0 4px 12px rgba(37,99,235,0.08)" : "0 1px 3px rgba(0,0,0,0.02)"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: isSelected ? "#1e40af" : "#1e293b", textTransform: "uppercase", letterSpacing: "0.02em" }}>{plan.name}</div>
                              <div style={{ fontSize: "1rem", fontWeight: 800, color: isSelected ? "#2563eb" : "#0f172a" }}>{formatMoney(Number(plan.price || 0))}</div>
                            </div>
                            <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: "#64748b" }}>
                              <div>Validity: <span style={{ fontWeight: 600, color: "#334155" }}>{plan.validityDays} Days</span></div>
                              {plan.rewardPointsMultiplier && <div>Points: <span style={{ fontWeight: 600, color: "#10b981" }}>{plan.rewardPointsMultiplier}x</span></div>}
                              {plan.walletAmount > 0 && <div>Wallet: <span style={{ fontWeight: 600, color: "#10b981" }}>{formatMoney(plan.walletAmount)}</span></div>}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Configuration & Services */}
              <div style={{ width: "50%", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", paddingRight: "6px" }}>
                {selectedPlan ? (
                  <>
                    {/* Selected Plan Details Header */}
                    <div>
                      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>Selected Plan</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>{selectedPlan.name}</div>
                    </div>

                    {/* Form Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Validity (Days)</label>
                        <input 
                          type="number" 
                          placeholder="Enter Validity" 
                          value={membershipForm.validityDays} 
                          onChange={(e) => setMembershipForm((prev) => ({ ...prev, validityDays: e.target.value }))} 
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Price (₹)</label>
                        <input 
                          type="number" 
                          placeholder="Enter Price" 
                          value={membershipForm.price} 
                          onChange={(e) => setMembershipForm((prev) => ({ ...prev, price: e.target.value }))} 
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} 
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Staff</label>
                        <select 
                          value={membershipForm.staffId} 
                          onChange={(e) => setMembershipForm((prev) => ({ ...prev, staffId: e.target.value }))} 
                          style={{ 
                            width: "100%", 
                            padding: "10px 12px", 
                            border: !membershipForm.staffId ? "1px solid #f59e0b" : "1px solid #cbd5e1", 
                            borderRadius: 8, 
                            fontSize: "0.9rem", 
                            boxSizing: "border-box", 
                            outline: "none", 
                            background: !membershipForm.staffId ? "#fffbeb" : "#fff",
                            color: "#0f172a"
                          }}
                        >
                          <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Select Staff</option>
                          {staffUsers.map((s) => (
                            <option key={s.id} value={s.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{s.user?.name || s.name || s.id}</option>
                          ))}
                        </select>
                        {!membershipForm.staffId && (
                          <div style={{ color: "#d97706", fontSize: "0.75rem", fontWeight: 500, marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <AlertCircle size={12} /> Staff selection is required
                          </div>
                        )}
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Purchase Date</label>
                        <input 
                          type="date" 
                          value={membershipForm.purchaseDate} 
                          onChange={(e) => setMembershipForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} 
                          style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }} 
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>Payment Breakdown</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr", gap: "12px" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Online Payment</label>
                          <input 
                            type="number" 
                            placeholder="Online amount" 
                            value={membershipForm.online} 
                            onChange={(e) => {
                              setMembershipError("");
                              const val = e.target.value;
                              if (val === "") {
                                setMembershipForm((prev) => ({ ...prev, online: "" }));
                                return;
                              }
                              const num = Number(val);
                              const price = Number(membershipForm.price || 0);
                              const offline = Number(membershipForm.offline || 0);
                              const advance = Number(membershipForm.advance || 0);
                              const maxAllowed = Math.max(0, price - (offline + advance));
                              setMembershipForm((prev) => ({ ...prev, online: String(Math.max(0, Math.min(num, maxAllowed))) }));
                            }} 
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Offline Payment</label>
                          <input 
                            type="number" 
                            placeholder="Offline amount" 
                            value={membershipForm.offline} 
                            onChange={(e) => {
                              setMembershipError("");
                              const val = e.target.value;
                              if (val === "") {
                                setMembershipForm((prev) => ({ ...prev, offline: "" }));
                                return;
                              }
                              const num = Number(val);
                              const price = Number(membershipForm.price || 0);
                              const online = Number(membershipForm.online || 0);
                              const advance = Number(membershipForm.advance || 0);
                              const maxAllowed = Math.max(0, price - (online + advance));
                              setMembershipForm((prev) => ({ ...prev, offline: String(Math.max(0, Math.min(num, maxAllowed))) }));
                            }} 
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Advance</label>
                          <input 
                            type="number" 
                            placeholder="Advance" 
                            value={membershipForm.advance} 
                            onChange={(e) => {
                              setMembershipError("");
                              const val = e.target.value;
                              if (val === "") {
                                setMembershipForm((prev) => ({ ...prev, advance: "" }));
                                return;
                              }
                              const num = Number(val);
                              const price = Number(membershipForm.price || 0);
                              const online = Number(membershipForm.online || 0);
                              const offline = Number(membershipForm.offline || 0);
                              const maxAllowed = Math.max(0, price - (online + offline));
                              setMembershipForm((prev) => ({ ...prev, advance: String(Math.max(0, Math.min(num, maxAllowed))) }));
                            }} 
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }} 
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: 8, marginTop: "12px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>Remaining Balance:</span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: assignMembershipBalanceVal > 0 ? "#ef4444" : "#10b981" }}>
                          {formatMoney(assignMembershipBalanceVal)}
                        </span>
                      </div>
                      {membershipError && (
                        <div style={{ color: "#ef4444", fontSize: "0.82rem", fontWeight: 600, marginTop: "12px", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                          <AlertCircle size={14} /> {membershipError}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginTop: "12px", margin: 0 }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>Remarks / Notes</label>
                      <textarea 
                        placeholder="Add membership notes or comments..." 
                        value={membershipForm.remarks} 
                        onChange={(e) => setMembershipForm((prev) => ({ ...prev, remarks: e.target.value }))} 
                        rows={2}
                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box", outline: "none", resize: "none", fontFamily: "inherit" }} 
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: "12px", border: "2px dashed #e2e8f0", borderRadius: 16, padding: "32px", background: "#fafafa" }}>
                    <CreditCard size={48} style={{ opacity: 0.5, color: "#2563eb" }} />
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Select a Membership Plan</div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>Choose a plan from the left list to configure pricing, validity and staff assignment details.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12, background: "#f8fafc" }}>
              <button onClick={() => setShowAssignMembershipModal(false)} style={{ padding: "10px 20px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: "0.9rem", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>Cancel</button>
              <button 
                onClick={handleAssignMembership} 
                disabled={!selectedPlan || !membershipForm.staffId} 
                style={{ 
                  padding: "10px 24px", 
                  background: (selectedPlan && membershipForm.staffId) ? "#2563eb" : "#cbd5e1", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: 8, 
                  fontWeight: 700, 
                  cursor: (selectedPlan && membershipForm.staffId) ? "pointer" : "not-allowed", 
                  fontSize: "0.9rem", 
                  transition: "all 0.2s", 
                  boxShadow: (selectedPlan && membershipForm.staffId) ? "0 4px 12px rgba(37,99,235,0.2)" : "none" 
                }} 
                onMouseEnter={(e) => { if (selectedPlan && membershipForm.staffId) e.currentTarget.style.background = "#1d4ed8"; }} 
                onMouseLeave={(e) => { if (selectedPlan && membershipForm.staffId) e.currentTarget.style.background = "#2563eb"; }}
              >
                Add Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Advance Modal */}
      {showAddAdvanceModal && (
        <div className="modal-overlay" onClick={() => setShowAddAdvanceModal(false)}>
          <div className="modal-content" style={{ width: "min(90vw, 440px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Advance</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>Add advance to {selectedCustomer.name}</div>
              </div>
              <button className="modal-close" onClick={() => setShowAddAdvanceModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Total Amount</label>
                <input
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              <div className="form-group">
                <label>Paymode</label>
                <div className="cust-paymode-toggle">
                  <button
                    className={`cust-paymode-btn${advanceForm.mode === "Online" ? " active" : ""}`}
                    onClick={() => setAdvanceForm(prev => ({ ...prev, mode: "Online" }))}
                  >
                    <Wallet size={14} /> Online
                  </button>
                  <button
                    className={`cust-paymode-btn${advanceForm.mode === "Offline" ? " active" : ""}`}
                    onClick={() => setAdvanceForm(prev => ({ ...prev, mode: "Offline" }))}
                  >
                    <Wallet size={14} /> Offline
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Remark</label>
                <textarea
                  value={advanceForm.remark}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, remark: e.target.value }))}
                  placeholder="Add a remark..."
                  rows={3}
                  style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="crm-btn" onClick={() => setShowAddAdvanceModal(false)}>Close</button>
              <button className="crm-btn" onClick={handleAddAdvance} disabled={!advanceForm.amount}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Gift Card Modal */}
      {showGiftCardModal && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 9999 }}>
          <div className="modal-content" style={{ width: "min(95vw, 850px)", borderRadius: 12, padding: "24px", overflow: "hidden", background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>Add Gift Card</div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <input 
                    type="text" 
                    placeholder="Search For Card" 
                    value={giftCardSearch}
                    onChange={(e) => {
                      setGiftCardSearch(e.target.value);
                      setShowGiftCardDropdown(true);
                    }}
                    onFocus={() => setShowGiftCardDropdown(true)}
                    onBlur={() => setTimeout(() => setShowGiftCardDropdown(false), 200)}
                    style={{ padding: "8px 12px", paddingRight: "32px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", width: "200px", outline: "none", color: "#0f172a", backgroundColor: "#ffffff" }} 
                  />
                  <Search size={14} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  {showGiftCardDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, marginTop: "4px", maxHeight: "220px", overflowY: "auto", zIndex: 99999, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", width: "200px" }}>
                      {giftCards
                        .filter(gc => gc.title && gc.title.toLowerCase().includes(giftCardSearch.toLowerCase()))
                        .map(gc => (
                          <div 
                            key={gc.id} 
                            style={{ padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}
                            onMouseDown={() => {
                              setGiftCardForm(prev => ({
                                ...prev,
                                title: gc.title,
                                amount: String(gc.originalAmount),
                                validityDays: gc.expiresAt ? Math.max(1, Math.round((new Date(gc.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : 30,
                              }));
                              setGiftCardSearch("");
                            }}
                          >
                            <div style={{ fontWeight: "bold", color: "#1e293b" }}>{gc.title}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>₹{gc.originalAmount}</div>
                          </div>
                        ))}
                      {giftCards.filter(gc => gc.title && gc.title.toLowerCase().includes(giftCardSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: "10px 12px", fontSize: "0.85rem", color: "#94a3b8", textAlign: "center" }}>No cards found</div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowGiftCardModal(false)} style={{ background: "#0f172a", color: "white", border: "none", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preview Card */}
            <div style={{ background: "#fdf4ff", border: "1px solid #fbcfe8", borderRadius: 8, padding: "16px", marginBottom: "24px", width: "300px" }}>
              <div style={{ color: "var(--accent, #3b82f6)", fontWeight: 800, fontSize: "0.85rem", marginBottom: "8px", textTransform: "uppercase" }}>
                {giftCardForm.title || `${settings?.salonName || "SALON"} - GIFT CARD`}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>Fee: ₹ {giftCardForm.amount || "1000"}</div>
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Validity: {giftCardForm.validityDays || 30} Days</div>
            </div>

            {/* Inputs Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Name</label>
                <input type="text" placeholder="Enter Name" value={giftCardForm.title || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, title: e.target.value}))} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#ffffff" }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Validity</label>
                <input type="number" placeholder="Enter Validity" value={giftCardForm.validityDays || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, validityDays: e.target.value}))} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#ffffff" }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Card Activated From</label>
                <input type="date" value={giftCardForm.activationDate || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, activationDate: e.target.value}))} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#ffffff" }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Purchase Amount</label>
                <input type="number" placeholder="Enter Price" value={giftCardForm.amount || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, amount: e.target.value}))} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#ffffff" }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>Staff</label>
                <select value={giftCardForm.staffId || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, staffId: e.target.value}))} style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", color: "#0f172a", backgroundColor: "#ffffff" }}>
                  <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Select Staff</option>
                  {staffUsers.map(s => (
                    <option key={s.id} value={s.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                      {s.user?.name || s.name || s.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Details */}
            <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "16px", marginBottom: "24px" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>Payment Details:</div>
              <div style={{ display: "flex", gap: "24px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "6px", display: "block" }}>Online</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                    <Monitor size={18} color="#10b981" style={{ marginRight: "8px" }} />
                    <input type="number" placeholder="0.0" value={giftCardForm.online || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, online: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem", color: "#0f172a", backgroundColor: "#ffffff" }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "6px", display: "block" }}>Offline</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                    <input type="number" placeholder="0.0" value={giftCardForm.offline || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, offline: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem", color: "#0f172a", backgroundColor: "#ffffff" }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "6px", display: "block" }}>Balance</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                    <Wallet size={18} color="#10b981" style={{ marginRight: "8px" }} />
                    <input type="number" placeholder="0.0" value={giftCardForm.balance || ""} onChange={(e) => setGiftCardForm(prev => ({...prev, balance: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem", color: "#0f172a", backgroundColor: "#ffffff" }} />
                  </div>
                </div>
              </div>
            </div>

            {giftCardError && (
              <div style={{ color: "#ef4444", fontSize: "0.82rem", fontWeight: 600, marginBottom: "16px", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} /> {giftCardError}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
              <button onClick={() => setShowGiftCardModal(false)} style={{ padding: "10px 24px", border: "1px solid #cbd5e1", background: "white", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#475569" }}>Cancel</button>
              <button onClick={handleIssueGiftCard} disabled={!giftCardForm.amount || !giftCardForm.title} style={{ padding: "10px 24px", border: "none", background: "var(--button-bg-solid, #3b82f6)", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "white" }}>Add Gift Card</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Package Modal */}
      {showPackageModal && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 9999 }}>
          <div className="modal-content" style={{ width: "min(95vw, 650px)", borderRadius: 12, padding: 0, overflow: "hidden", background: "#fff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>Add packages</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative", width: "200px" }}>
                  <input 
                    placeholder="Search For Package" 
                    value={packageSearch} 
                    onChange={(e) => {
                      setPackageSearch(e.target.value);
                      setShowPackageDropdown(true);
                    }} 
                    onFocus={() => setShowPackageDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPackageDropdown(false), 200)}
                    style={{ width: "100%", padding: "8px 32px 8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                  <Search size={14} style={{ position: "absolute", right: 10, top: 10, color: "#94a3b8" }} />
                  {showPackageDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, marginTop: "4px", maxHeight: "220px", overflowY: "auto", zIndex: 99999, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                      <div 
                        style={{ padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", color: "#2563eb", fontWeight: "bold" }}
                        onMouseDown={() => {
                          setSelectedPackage({ id: "CUSTOM", name: "Custom Package" });
                          setPackageForm(prev => ({ ...prev, price: "", validityDays: "30" }));
                          setCustomServices([]);
                          setPackageSearch("");
                        }}
                      >
                        🛠️ Build Custom Package (On the fly)
                      </div>
                      {packagePlans
                        .filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase()))
                        .map(p => (
                          <div 
                            key={p.id} 
                            style={{ padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                            onMouseDown={() => {
                              setSelectedPackage(p);
                              setPackageSearch("");
                              setPackageForm(prev => ({ ...prev, price: p.price, validityDays: p.validityDays }));
                              
                              const mapped = (p.services || []).map(s => {
                                const svcObj = services.find(x => x.id === s.serviceId) || {};
                                return {
                                  id: s.serviceId,
                                  name: svcObj.name || s.service?.name || "Predefined Service",
                                  price: svcObj.price || s.service?.price || 0,
                                  sessions: s.sessions || 1
                                };
                              });
                              setCustomServices(mapped);
                            }}
                          >
                            <div style={{ fontWeight: "bold", color: "#1e293b" }}>{p.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>₹{p.price} | {p.validityDays} Days</div>
                          </div>
                        ))}
                      {packagePlans.filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: "12px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No packages found</div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowPackageModal(false)} style={{ background: "#0f172a", border: "none", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
              
              {/* Selected Package Display if user selected a predefined one */}
              {selectedPackage && selectedPackage.id !== "CUSTOM" && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.95rem" }}>{selectedPackage.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#3b82f6" }}>Validity: {selectedPackage.validityDays} Days</div>
                  </div>
                  <button onClick={() => setSelectedPackage({ id: "CUSTOM", name: "Custom Package" })} style={{ fontSize: "0.8rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear</button>
                </div>
              )}

              {/* Select from Packages Horizontal Scroll */}
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: "12px" }}>Select from Predefined Packages</div>
                <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "thin" }}>
                  {packagePlans.map(p => {
                    const isSelected = selectedPackage?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => {
                          setSelectedPackage(p);
                          setPackageForm(prev => ({ ...prev, price: p.price, validityDays: p.validityDays }));
                          
                          const mapped = (p.services || []).map(s => {
                            const svcObj = services.find(x => x.id === s.serviceId) || {};
                            return {
                              id: s.serviceId,
                              name: svcObj.name || s.service?.name || "Predefined Service",
                              price: svcObj.price || s.service?.price || 0,
                              sessions: s.sessions || 1
                            };
                          });
                          setCustomServices(mapped);
                        }}
                        style={{
                          minWidth: "150px",
                          maxWidth: "150px",
                          background: isSelected ? "#eff6ff" : "#ffffff",
                          border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          flexShrink: 0,
                          boxShadow: isSelected ? "0 4px 6px -1px rgba(37, 99, 235, 0.1)" : "none"
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: isSelected ? "#1e3a8a" : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2563eb", marginTop: "6px" }}>₹{p.price}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>{p.validityDays} Days Validity</div>
                      </div>
                    );
                  })}
                  {packagePlans.length === 0 && (
                    <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>No packages configured</div>
                  )}
                </div>
              </div>

              {/* Add Services Section */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ width: "120px", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", paddingTop: "10px" }}>Add services</div>
                <div style={{ flex: 1 }}>
                  <div style={{ position: "relative" }}>
                    <input 
                      placeholder="Search Service By Category Or Name" 
                      value={pkgServiceSearch}
                      onChange={(e) => setPkgServiceSearch(e.target.value)}
                      style={{ width: "100%", padding: "10px 32px 10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
                    />
                    <Search size={16} style={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }} />
                    {pkgServiceSearch.trim() !== "" && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, marginTop: "4px", maxHeight: "150px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                        {services.filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase())).map(s => {
                          const alreadyAdded = customServices.some(added => added.id === s.id);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => {
                                if (!alreadyAdded) setCustomServices(prev => [...prev, { ...s, sessions: 1 }]);
                                setPkgServiceSearch("");
                                setSelectedPackage({ id: "CUSTOM", name: "Custom Package" });
                              }}
                              style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: alreadyAdded ? "#f8fafc" : "#fff" }}
                            >
                              <span style={{ fontWeight: 600, color: "#334155" }}>{s.name}</span>
                              <span style={{ color: "#64748b" }}>{s.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "8px" }}>({customServices.length} Items Selected)</div>
                  
                  {/* Selected Services Tags */}
                  {customServices.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                      {customServices.map((s, idx) => (
                        <div key={idx} style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#334155" }}>
                          <span>{s.name}</span>
                          <span style={{ fontWeight: 700, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>x{s.sessions}</span>
                          <button onClick={() => setCustomServices(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "flex" }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Products Section */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ width: "120px", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", paddingTop: "10px" }}>Add products</div>
                <div style={{ flex: 1 }}>
                  <div style={{ position: "relative" }}>
                    <input 
                      placeholder="Search Product By Category Or Name" 
                      value={pkgProductSearch}
                      onChange={(e) => setPkgProductSearch(e.target.value)}
                      style={{ width: "100%", padding: "10px 32px 10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box", outline: "none" }}
                    />
                    <Search size={16} style={{ position: "absolute", right: 12, top: 12, color: "#94a3b8" }} />
                    {pkgProductSearch.trim() !== "" && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, marginTop: "4px", maxHeight: "150px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                        {products.filter(p => p.name.toLowerCase().includes(pkgProductSearch.toLowerCase())).map(p => {
                          const alreadyAdded = customProducts.some(added => added.id === p.id);
                          return (
                            <div 
                              key={p.id} 
                              onClick={() => {
                                if (!alreadyAdded) setCustomProducts(prev => [...prev, { ...p }]);
                                setPkgProductSearch("");
                                setSelectedPackage({ id: "CUSTOM", name: "Custom Package" });
                              }}
                              style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: alreadyAdded ? "#f8fafc" : "#fff" }}
                            >
                              <span style={{ fontWeight: 600, color: "#334155" }}>{p.name}</span>
                              <span style={{ color: "#64748b" }}>{p.sellingPrice}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {customProducts.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                      {customProducts.map((p, idx) => (
                        <div key={idx} style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#334155" }}>
                          <span>{p.name}</span>
                          <button onClick={() => setCustomProducts(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "flex" }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginBottom: "16px" }}>Payment Details:</div>
                <div style={{ display: "flex", gap: "24px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block" }}>Balance</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                      <Wallet size={18} color="#10b981" style={{ marginRight: "8px" }} />
                      <input type="number" placeholder="0.0" value={packageForm.balance} onChange={(e) => setPackageForm(prev => ({...prev, balance: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block" }}>Online</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                      <Monitor size={18} color="#10b981" style={{ marginRight: "8px" }} />
                      <input type="number" placeholder="0.0" value={packageForm.online} onChange={(e) => setPackageForm(prev => ({...prev, online: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem" }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block" }}>Offline</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px" }}>
                      <input type="number" placeholder="0.0" value={packageForm.offline} onChange={(e) => setPackageForm(prev => ({...prev, offline: e.target.value}))} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.9rem" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Details (Price, Validity) that were missing in the screenshot but necessary for backend */}
              <div style={{ display: "flex", gap: "16px" }}>
                 <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block", fontWeight: 700 }}>Total Price</label>
                    <input type="number" placeholder="0.0" value={packageForm.price} onChange={(e) => setPackageForm(prev => ({...prev, price: e.target.value}))} style={{ border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", width: "100%", padding: "10px", fontSize: "0.9rem", boxSizing: "border-box" }} />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block", fontWeight: 700 }}>Validity (Days)</label>
                    <input type="number" placeholder="30" value={packageForm.validityDays} onChange={(e) => setPackageForm(prev => ({...prev, validityDays: e.target.value}))} style={{ border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", width: "100%", padding: "10px", fontSize: "0.9rem", boxSizing: "border-box" }} />
                 </div>
                 <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.8rem", color: "#0f172a", marginBottom: "6px", display: "block", fontWeight: 700 }}>Staff Assignment</label>
                    <select value={packageForm.staffId} onChange={(e) => setPackageForm(prev => ({...prev, staffId: e.target.value}))} style={{ border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", width: "100%", padding: "10px", fontSize: "0.9rem", boxSizing: "border-box", background: "#fff", color: "#0f172a" }}>
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>Select Staff</option>
                      {staffUsers.map(s => <option key={s.id} value={s.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{s.user?.name || s.name || s.id}</option>)}
                    </select>
                 </div>
              </div>

              {/* Remark */}
              <div>
                <label style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginBottom: "8px", display: "block" }}>Remark:</label>
                <textarea 
                  value={packageForm.remark}
                  onChange={(e) => setPackageForm(prev => ({...prev, remark: e.target.value}))}
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px", minHeight: "80px", outline: "none", boxSizing: "border-box", fontSize: "0.9rem" }}
                  placeholder="Enter remarks..."
                />
              </div>

              {packageError && (
                <div style={{ color: "#ef4444", fontSize: "0.82rem", fontWeight: 600, marginTop: "12px", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fca5a5", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} /> {packageError}
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowPackageModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, fontWeight: 600, cursor: "pointer", color: "#475569", fontSize: "0.9rem" }}>Cancel</button>
              <button onClick={handleAssignPackage} style={{ padding: "10px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>Add Package</button>
            </div>
          </div>
        </div>
      )}


      {/* Add Family Member Modal */}
      {showFamilyModal && (
        <div className="modal-overlay" onClick={() => { setShowFamilyModal(false); setFamilyError(""); setSelectedFamilyGuest(null); setFamilySearchQuery(""); setFamilySearchResults([]); }}>
          <div className="modal-content" style={{ width: "min(90vw, 440px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Family Member</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>Link to {selectedCustomer?.name}</div>
              </div>
              <button className="modal-close" onClick={() => { setShowFamilyModal(false); setFamilyError(""); setSelectedFamilyGuest(null); setFamilySearchQuery(""); setFamilySearchResults([]); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {familyError && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {familyError}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Guest *</label>
                {!selectedFamilyGuest ? (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={familySearchQuery}
                      onChange={(e) => handleFamilySearch(e.target.value)}
                      placeholder="Search By Name Or No."
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }}
                    />
                    {familySearchLoading && (
                      <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#64748b" }}>Searching...</div>
                    )}
                    {familySearchResults.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, marginTop: "4px", maxHeight: "200px", overflowY: "auto", zIndex: 1000, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" }}>
                        {familySearchResults.map((guest) => (
                          <div
                            key={guest.id}
                            onClick={() => handleSelectFamilyGuest(guest)}
                            style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                          >
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{guest.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{guest.phone}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{selectedFamilyGuest.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{selectedFamilyGuest.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedFamilyGuest(null); setFamilyForm(prev => ({ ...prev, name: "", phone: "" })); }}
                      style={{ padding: "4px 8px", background: "#fee2e2", border: "none", color: "#991b1b", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Relation *</label>
                <input
                  type="text"
                  value={familyForm.relation}
                  onChange={(e) => { setFamilyForm(prev => ({ ...prev, relation: e.target.value })); setFamilyError(""); }}
                  placeholder="Mother,Father,Brother...Etc"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="crm-btn" onClick={() => { setShowFamilyModal(false); setFamilyError(""); setSelectedFamilyGuest(null); setFamilySearchQuery(""); setFamilySearchResults([]); }}>Cancel</button>
              <button className="crm-btn" onClick={handleAddFamilyMember}>+ Add Guest</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Follow Up Modal */}
      {showFollowUpModal && (
        <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div className="modal-content" style={{ width: "min(90vw, 440px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Follow Up</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>Schedule for {selectedCustomer?.name}</div>
              </div>
              <button className="modal-close" onClick={() => setShowFollowUpModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={followUpForm.date} onChange={(e) => setFollowUpForm(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" value={followUpForm.time} onChange={(e) => setFollowUpForm(prev => ({ ...prev, time: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Assigned Staff *</label>
                <select value={followUpForm.staffUserId} onChange={(e) => setFollowUpForm(prev => ({ ...prev, staffUserId: e.target.value }))}>
                  <option value="">Select Staff</option>
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>{s.user?.name || s.name || s.user?.email || s.id}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={followUpForm.type} onChange={(e) => setFollowUpForm(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  value={followUpForm.message}
                  onChange={(e) => setFollowUpForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Follow up message..."
                  rows={3}
                  style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="crm-btn" onClick={() => setShowFollowUpModal(false)}>Cancel</button>
              <button className="crm-btn" onClick={handleAddFollowUp} disabled={!followUpForm.date || !followUpForm.message || !followUpForm.staffUserId}>Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Success Modal */}
      {invoiceSuccessData && (
        <div className="modal-overlay" onClick={() => setInvoiceSuccessData(null)} style={{ zIndex: 4000 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "20px", width: "min(92vw, 440px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", animation: "modalPop .3s cubic-bezier(.34,1.56,.64,1)" }}
          >
            <style>{`@keyframes modalPop { from { transform:scale(.92); opacity:0; } to { transform:scale(1); opacity:1; } }`}</style>
            <div style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)", padding: "30px 24px 24px", textAlign: "center", position: "relative" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <CheckCircle size={28} style={{ color: "#fff" }} />
              </div>
              <div style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.01em" }}>{invoiceSuccessData.type} Assigned!</div>
              <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", marginTop: 6, fontWeight: 500 }}>{invoiceSuccessData.name}</div>
              <button onClick={() => setInvoiceSuccessData(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>×</button>
            </div>
            <div style={{ padding: "24px" }}>
              {invoiceSuccessData.invoice ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                    <FileText size={20} style={{ color: "#0284c7" }} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: "0.9rem", color: "#0369a1" }}>Invoice Generated</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{invoiceSuccessData.invoice.invoiceNumber} · ₹{Number(invoiceSuccessData.invoice.total || 0).toLocaleString("en-IN")}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontWeight: 700, fontSize: "0.75rem", padding: "4px 10px", borderRadius: 8, background: invoiceSuccessData.invoice.status === "PAID" ? "#e0f2fe" : "#fef9c3", color: invoiceSuccessData.invoice.status === "PAID" ? "#0369a1" : "#92400e" }}>{invoiceSuccessData.invoice.status}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button
                      onClick={() => {
                        const authData = localStorage.getItem("respark_auth");
                        const token = authData ? JSON.parse(authData).accessToken : "";
                        const base = api.defaults.baseURL?.replace(/\/api\/v1$/, "") || "";
                        window.open(`${base}/api/v1/owner/invoices/${invoiceSuccessData.invoice.id}/receipt?token=${token}`, "_blank", "noopener,noreferrer");
                      }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 4px 12px rgba(14,165,233,0.2)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(14,165,233,0.3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.2)"; }}
                    >
                      <Eye size={16} /> View Invoice
                    </button>
                    <button
                      onClick={async () => {
                        try { await downloadFromApi(`/owner/invoices/${invoiceSuccessData.invoice.id}/pdf`, { fallbackFilename: `Invoice-${invoiceSuccessData.invoice.invoiceNumber}.pdf` }); }
                        catch { alert("Could not download PDF"); }
                      }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "background 0.2s, transform 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.transform = "none"; }}
                    >
                      <Download size={16} /> Download PDF
                    </button>
                    <button onClick={() => setInvoiceSuccessData(null)} style={{ background: "transparent", color: "#64748b", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"} onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.9rem", marginBottom: 20 }}>Assignment successful! Invoice could not be auto-generated — create one from POS.</div>
                  <button onClick={() => setInvoiceSuccessData(null)} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(14,165,233,0.2)", transition: "transform 0.15s, box-shadow 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(14,165,233,0.3)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.2)"; }}>Done</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedBillInvoice && (
        <PosReceipt
          invoice={selectedBillInvoice}
          salonName={auth?.membership?.salon?.name || auth?.membership?.salonName || "Skillify Salon"}
          salonAddress={auth?.membership?.salon?.address || selectedBillInvoice?.branch?.address || selectedBillInvoice?.branch?.name || "Main branch"}
          salonPhone={auth?.membership?.salon?.phone || selectedBillInvoice?.branch?.phone || ""}
          currencyCode={currencyCode}
          onClose={() => setSelectedBillInvoice(null)}
          onPrint={() => window.print()}
          onDownload={async () => {
            if (!selectedBillInvoice?.id) return;
            await downloadFromApi(`/owner/invoices/${selectedBillInvoice.id}/pdf`, {
              fallbackFilename: `invoice-${selectedBillInvoice.invoiceNumber}.pdf`
            });
          }}
        />
      )}

      {saving && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          <div style={{
            background: "#ffffff",
            padding: "24px 32px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid #f1f5f9",
              borderTop: "4px solid var(--accent, #3b82f6)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <div style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#0f172a",
              textAlign: "center"
            }}>{savingMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}
