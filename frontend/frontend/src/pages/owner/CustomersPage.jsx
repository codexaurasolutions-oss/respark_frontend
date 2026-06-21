import { useEffect, useRef, useState } from "react";
import { Search, Filter, Plus, Download, Upload, MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, ChevronDown, Trash2, GitMerge, MessageCircle, User, FileText, CreditCard, Gift, Wallet, AlertCircle, Package, Users, UserCog, Tag, Phone, StickyNote, Edit3, CheckCircle, Circle } from "lucide-react";
import { api } from "../../api/client";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import { normalizeIndianPhoneInputDigits } from "../../utils/phone";


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
  const { formatMoney } = useSalonSettings();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [membershipForm, setMembershipForm] = useState({ validityDays: "", price: "", staffId: "", online: "", offline: "", purchaseDate: new Date().toISOString().slice(0, 10) });
  const [membershipSearch, setMembershipSearch] = useState("");
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ amount: "", mode: "Online", remark: "" });
  const [staffUsers, setStaffUsers] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [customerAdvances, setCustomerAdvances] = useState([]);
  const [updateForm, setUpdateForm] = useState({ name: "", phone: "", email: "", gender: "", dateOfBirth: "", anniversary: "" });
  const [notes, setNotes] = useState("");
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [giftCardForm, setGiftCardForm] = useState({ code: "", title: "", amount: "", validityDays: 30 });
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packagePlans, setPackagePlans] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageForm, setPackageForm] = useState({ validityDays: "", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10) });
  const [packageSearch, setPackageSearch] = useState("");
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyForm, setFamilyForm] = useState({ name: "", phone: "", relation: "" });
  const [familyError, setFamilyError] = useState("");
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ date: "", time: "", message: "", type: "call" });
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

  useEffect(() => {
    if (!selectedCustomer) return;
    if (detailTab === "membership" && membershipPlans.length === 0) {
      fetchMembershipPlans();
      fetchStaffUsers();
    }
    if (detailTab === "giftcard") {
      fetchCustomerGiftCards(selectedCustomer.id);
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
  }, [detailTab, selectedCustomer]);

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
    setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "" });
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
      const res = await api.get("/owner/memberships/plans");
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

  const fetchCustomerGiftCards = async (customerId) => {
    try {
      const res = await api.get(`/owner/customers/${customerId}/gift-cards`);
      setCustomerGiftCards(res.data || []);
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
    try {
      await api.post("/owner/memberships/assign", {
        customerId: selectedCustomer.id,
        membershipPlanId: selectedPlan.id,
        validityDays: membershipForm.validityDays ? Number(membershipForm.validityDays) : undefined,
        price: membershipForm.price ? Number(membershipForm.price) : undefined,
        staffId: membershipForm.staffId || undefined,
        online: membershipForm.online ? Number(membershipForm.online) : undefined,
        offline: membershipForm.offline ? Number(membershipForm.offline) : undefined,
        startsAt: membershipForm.purchaseDate || undefined,
      });
      setShowAssignMembershipModal(false);
      setSelectedPlan(null);
      setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "", purchaseDate: new Date().toISOString().slice(0, 10) });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to assign membership");
      console.error(e);
    }
  };

  const handleAddAdvance = async () => {
    if (!advanceForm.amount || !selectedCustomer) return;
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
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedCustomer) return;
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
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    try {
      await api.patch(`/owner/customers/${selectedCustomer.id}`, { notes });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to save notes");
      console.error(e);
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

  const handleIssueGiftCard = async () => {
    if (!giftCardForm.code || !giftCardForm.amount || !selectedCustomer) return;
    try {
      await api.post("/owner/gift-cards", {
        customerId: selectedCustomer.id,
        code: giftCardForm.code,
        title: giftCardForm.title || "Gift Card",
        originalAmount: Number(giftCardForm.amount),
        validityDays: Number(giftCardForm.validityDays) || 30,
      });
      setShowGiftCardModal(false);
      setGiftCardForm({ code: "", title: "", amount: "", validityDays: 30 });
      fetchCustomerGiftCards(selectedCustomer.id);
    } catch (e) {
      alert("Failed to issue gift card");
      console.error(e);
    }
  };

  const handleAssignPackage = async () => {
    if (!selectedPackage || !selectedCustomer) return;
    try {
      await api.post("/owner/packages/assign", {
        customerId: selectedCustomer.id,
        packageId: selectedPackage.id,
        validityDays: packageForm.validityDays ? Number(packageForm.validityDays) : undefined,
        price: packageForm.price ? Number(packageForm.price) : undefined,
        staffId: packageForm.staffId || undefined,
        startsAt: packageForm.purchaseDate || undefined,
      });
      setShowPackageModal(false);
      setSelectedPackage(null);
      setPackageForm({ validityDays: "", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10) });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to assign package");
      console.error(e);
    }
  };

  const handleAddFamilyMember = async () => {
    setFamilyError("");
    if (!selectedCustomer) {
      setFamilyError("No customer selected");
      return;
    }
    if (!familyForm.name || familyForm.name.trim().length < 2) {
      setFamilyError("Name must be at least 2 characters");
      return;
    }
    const phoneDigits = normalizeIndianPhoneInputDigits(familyForm.phone);
    if (phoneDigits.length !== 10) {
      setFamilyError("Phone number must be exactly 10 digits");
      return;
    }
    if (!familyForm.relation) {
      setFamilyError("Please select a relation");
      return;
    }
    try {
      await api.post("/owner/customers", {
        phone: `+91${phoneDigits}`,
        name: familyForm.name.trim(),
        gender: "female",
        notes: `familyMemberOf:${selectedCustomer.id} relation:${familyForm.relation || "other"}`,
      });
      setShowFamilyModal(false);
      setFamilyForm({ name: "", phone: "", relation: "" });
      setFamilyError("");
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      setFamilyError(formatApiError(e, "Failed to add family member"));
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpForm.date || !followUpForm.message || !selectedCustomer) return;
    try {
      await api.post("/owner/follow-ups", {
        customerId: selectedCustomer.id,
        date: followUpForm.date,
        time: followUpForm.time || undefined,
        message: followUpForm.message,
        type: followUpForm.type,
      });
      setShowFollowUpModal(false);
      setFollowUpForm({ date: "", time: "", message: "", type: "call" });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
    } catch (e) {
      alert("Failed to add follow-up");
      console.error(e);
    }
  };

  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      await downloadFromApi(`/owner/customers/export?format=${format}`, { fallbackFilename: `Customers.${format}` });
    } catch (error) {
      alert("Could not export customers");
    }
  };

  const handleAddGuest = async (event) => {
    event.preventDefault();
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
    }
  };

  const handleDeleteCustomer = async (row) => {
    if (!window.confirm(`Delete ${row.name || "this customer"}? If linked history exists, the system will block deletion.`)) return;
    setActionBusy(row.id);
    try {
      await api.delete(`/owner/customers/${row.id}`);
      setRows((current) => current.filter((entry) => entry.id !== row.id));
      setActiveMenuRowId("");
    } catch (error) {
      alert(formatApiError(error, "Could not delete customer"));
    } finally {
      setActionBusy("");
    }
  };

  const handleMergeCustomer = async () => {
    if (!mergeSourceRow?.id || !mergeTargetId) {
      alert("Please select the target customer");
      return;
    }
    setActionBusy(mergeSourceRow.id);
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
      const thresholdTime = Date.now() - (Number(appliedFilters.nonReturningDays) * 24 * 60 * 60 * 1000);
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
          <label className="crm-btn" style={{ cursor: "pointer" }}>
            <Download size={16} /> Import
            <input
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("file", file);
                try {
                  const res = await api.post("/owner/customers/import", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  alert(res.data.message);
                  await load();
                } catch (error) {
                  alert(formatApiError(error, "Could not import customers"));
                }
              }}
            />
          </label>
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
                {visibleRows.map((row) => (
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
                <button><ChevronsLeft size={18} /></button>
                <button><ChevronLeft size={18} /></button>
                <button><ChevronRight size={18} /></button>
                <button><ChevronsRight size={18} /></button>
              </div>
              <div>1-{visibleRows.length || 0} of {visibleRows.length || 0}</div>
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
                              <div key={inv.id} className="cust-order-card">
                                <div className="cust-order-card-head">
                                  <div>
                                    <div className="cust-order-invoice">Invoice #{inv.invoiceNumber}</div>
                                    <div className="cust-order-date">{new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                    <div className="cust-order-amount">{formatMoney(inv.total)}</div>
                                    <span className={`cust-order-status ${inv.status}`}>{inv.status}</span>
                                  </div>
                                </div>
                                {(inv.items || []).length > 0 && (
                                  <div className="cust-order-items">
                                    {inv.items.map((item, i) => (
                                      <div key={i} className="cust-order-item">
                                        <div>
                                          <div>{item.serviceName || item.productName || "Item"}</div>
                                          {item.staffName && <div className="cust-order-item-staff">Staff: {item.staffName}</div>}
                                        </div>
                                        <div>{formatMoney(item.lineTotal)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {inv.discountAmount > 0 && (
                                  <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#94a3b8" }}>
                                    Discount: {formatMoney(inv.discountAmount)}
                                  </div>
                                )}
                                {inv.paymode && (
                                  <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#94a3b8" }}>
                                    Paymode: {inv.paymode}
                                  </div>
                                )}
                                {Number(inv.balanceAmount || 0) > 0 && (
                                  <div style={{ marginTop: "8px", padding: "4px 8px", background: "#7f1d1d", borderRadius: "6px", fontSize: "0.72rem", color: "#fca5a5" }}>
                                    Balance Due: {formatMoney(inv.balanceAmount)}
                                  </div>
                                )}
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
                                </div>
                              );
                            })
                          )}
                          <button className="cust-assign-btn" onClick={() => { fetchMembershipPlans(); fetchStaffUsers(); setSelectedPlan(null); setMembershipForm({ validityDays: "", price: "", staffId: "", online: "", offline: "", purchaseDate: new Date().toISOString().slice(0, 10) }); setMembershipSearch(""); setShowAssignMembershipModal(true); }}>
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
                          <button className="cust-assign-btn" onClick={() => setShowGiftCardModal(true)}>
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
                          <button className="cust-assign-btn" onClick={() => { fetchPackagePlans(); fetchStaffUsers(); setSelectedPackage(null); setPackageForm({ validityDays: "", price: "", staffId: "", purchaseDate: new Date().toISOString().slice(0, 10) }); setPackageSearch(""); setShowPackageModal(true); }}>
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
                            (customerDetail.familyMembers || []).map((fm) => (
                              <div key={fm.id} className="cust-membership-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{fm.name}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fm.phone}</div>
                                  </div>
                                  <span className="cust-mem-status ACTIVE">Linked</span>
                                </div>
                              </div>
                            ))
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
                              <input type="text" value={updateForm.phone} onChange={(e) => setUpdateForm(prev => ({ ...prev, phone: e.target.value }))} />
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
                          <button className="cust-assign-btn" onClick={() => setShowFollowUpModal(true)}>
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
      {showAssignMembershipModal && (
        <div className="modal-overlay" onClick={() => setShowAssignMembershipModal(false)}>
          <div className="modal-content" style={{ width: "min(95vw, 900px)", borderRadius: 16, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0f172a" }}>Assign Membership</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <input placeholder="Search For Membership" value={membershipSearch} onChange={(e) => setMembershipSearch(e.target.value)} style={{ padding: "8px 12px", paddingRight: 32, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", width: 220 }} />
                  <span style={{ position: "absolute", right: 10, top: 8, color: "#94a3b8" }}>&#128269;</span>
                </div>
                <button onClick={() => setShowAssignMembershipModal(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94a3b8" }}>&#x2715;</button>
              </div>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24, flex: 1, maxHeight: "70vh", overflowY: "auto" }}>
              {membershipPlans.length === 0 ? (
                <div className="cust-empty-state">No membership plans available</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, maxHeight: 300, overflowY: "auto", paddingRight: 8 }}>
                  {membershipPlans.filter((plan) => plan.name.toLowerCase().includes(membershipSearch.toLowerCase())).map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <div key={plan.id} onClick={() => {
                        setSelectedPlan(plan);
                        setMembershipForm((prev) => ({
                          ...prev,
                          validityDays: String(plan.validityDays || ""),
                          price: String(plan.price || ""),
                        }));
                      }} style={{ background: isSelected ? "#eff6ff" : "#f8fafc", border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: isSelected ? "#1e40af" : "#334155", marginBottom: 8, textTransform: "uppercase" }}>{plan.name}</div>
                        <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 4 }}>Fee: {formatMoney(Number(plan.price || 0))}</div>
                        <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 12 }}>Validity: {plan.validityDays} Days</div>
                        {plan.rewardPointsMultiplier && <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Earn {plan.rewardPointsMultiplier}x Points</div>}
                        {plan.walletAmount > 0 && <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Wallet: {formatMoney(plan.walletAmount)}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Name</label>
                  <input readOnly value={selectedPlan ? selectedPlan.name : ""} placeholder="Select above" style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", background: "#f8fafc", color: "#94a3b8", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Validity (Days)</label>
                  <input type="number" placeholder="Enter Validity" value={membershipForm.validityDays} onChange={(e) => setMembershipForm((prev) => ({ ...prev, validityDays: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Price</label>
                  <input type="number" placeholder="Enter Price" value={membershipForm.price} onChange={(e) => setMembershipForm((prev) => ({ ...prev, price: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1.2, minWidth: 150 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Staff</label>
                  <select value={membershipForm.staffId} onChange={(e) => setMembershipForm((prev) => ({ ...prev, staffId: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }}>
                    <option value="">Select Staff</option>
                    {staffUsers.map((s) => (
                      <option key={s.id} value={s.id}>{s.user?.name || s.name || s.id}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Purchase date</label>
                  <input type="date" value={membershipForm.purchaseDate} onChange={(e) => setMembershipForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowAssignMembershipModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button onClick={handleAssignMembership} disabled={!selectedPlan} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: selectedPlan ? "pointer" : "not-allowed", opacity: selectedPlan ? 1 : 0.6 }}>Add Membership</button>
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
        <div className="modal-overlay" onClick={() => setShowGiftCardModal(false)}>
          <div className="modal-content" style={{ width: "min(90vw, 480px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Issue Gift Card</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>Issue gift card to {selectedCustomer?.name}</div>
              </div>
              <button className="modal-close" onClick={() => setShowGiftCardModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Card Code *</label>
                  <input type="text" value={giftCardForm.code} onChange={(e) => setGiftCardForm(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. GC-001" />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={giftCardForm.title} onChange={(e) => setGiftCardForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Gift Card" />
                </div>
                <div className="form-group">
                  <label>Amount *</label>
                  <input type="number" value={giftCardForm.amount} onChange={(e) => setGiftCardForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="1000" />
                </div>
                <div className="form-group">
                  <label>Validity (Days)</label>
                  <input type="number" value={giftCardForm.validityDays} onChange={(e) => setGiftCardForm(prev => ({ ...prev, validityDays: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="crm-btn" onClick={() => setShowGiftCardModal(false)}>Cancel</button>
              <button className="crm-btn" onClick={handleIssueGiftCard} disabled={!giftCardForm.code || !giftCardForm.amount}>Issue Card</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Package Modal */}
      {showPackageModal && (
        <div className="modal-overlay" onClick={() => setShowPackageModal(false)}>
          <div className="modal-content" style={{ width: "min(95vw, 900px)", borderRadius: 16, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0f172a" }}>Assign Package</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <input placeholder="Search For Package" value={packageSearch} onChange={(e) => setPackageSearch(e.target.value)} style={{ padding: "8px 12px", paddingRight: 32, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", width: 220 }} />
                  <span style={{ position: "absolute", right: 10, top: 8, color: "#94a3b8" }}>&#128269;</span>
                </div>
                <button onClick={() => setShowPackageModal(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#94a3b8" }}>&#x2715;</button>
              </div>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24, flex: 1, maxHeight: "70vh", overflowY: "auto" }}>
              {packagePlans.length === 0 ? (
                <div className="cust-empty-state">No package plans available</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, maxHeight: 300, overflowY: "auto", paddingRight: 8 }}>
                  {packagePlans.filter((pkg) => pkg.name.toLowerCase().includes(packageSearch.toLowerCase())).map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <div key={pkg.id} onClick={() => {
                        setSelectedPackage(pkg);
                        setPackageForm((prev) => ({
                          ...prev,
                          validityDays: String(pkg.validityDays || ""),
                          price: String(pkg.price || ""),
                        }));
                      }} style={{ background: isSelected ? "#eff6ff" : "#f8fafc", border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0", borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: isSelected ? "#1e40af" : "#334155", marginBottom: 8, textTransform: "uppercase" }}>{pkg.name}</div>
                        <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 4 }}>Fee: {formatMoney(Number(pkg.price || 0))}</div>
                        <div style={{ fontSize: "0.85rem", color: "#475569", marginBottom: 12 }}>Validity: {pkg.validityDays} Days</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Services:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {(pkg.services || []).map((s, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569" }}>
                              <span>{s.service?.name || s.name}</span>
                              <span style={{ fontWeight: 600 }}>{s.sessions || 1}</span>
                            </div>
                          ))}
                          {(pkg.services || []).length === 0 && <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>No services included</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedPackage && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontWeight: 600, color: "#64748b", fontSize: "0.9rem" }}>Selected services</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(selectedPackage.services || []).map((s, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
                        <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 500 }}>{s.service?.name || s.name}</span>
                        <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Qty: {s.sessions || 1}</span>
                      </div>
                    ))}
                    {(selectedPackage.services || []).length === 0 && <div style={{ padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#94a3b8", fontSize: "0.9rem" }}>No services included in this package</div>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Name</label>
                  <input readOnly value={selectedPackage ? selectedPackage.name : ""} placeholder="Select above" style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", background: "#f8fafc", color: "#94a3b8", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Validity (Days)</label>
                  <input type="number" placeholder="Enter Validity" value={packageForm.validityDays} onChange={(e) => setPackageForm((prev) => ({ ...prev, validityDays: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Price</label>
                  <input type="number" placeholder="Enter Price" value={packageForm.price} onChange={(e) => setPackageForm((prev) => ({ ...prev, price: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1.2, minWidth: 150 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Staff</label>
                  <select value={packageForm.staffId} onChange={(e) => setPackageForm((prev) => ({ ...prev, staffId: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }}>
                    <option value="">Select Staff</option>
                    {staffUsers.map((s) => (
                      <option key={s.id} value={s.id}>{s.user?.name || s.name || s.id}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>Purchase date</label>
                  <input type="date" value={packageForm.purchaseDate} onChange={(e) => setPackageForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setShowPackageModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}>Cancel</button>
              <button onClick={handleAssignPackage} disabled={!selectedPackage} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: selectedPackage ? "pointer" : "not-allowed", opacity: selectedPackage ? 1 : 0.6 }}>Assign Package</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showFamilyModal && (
        <div className="modal-overlay" onClick={() => { setShowFamilyModal(false); setFamilyError(""); }}>
          <div className="modal-content" style={{ width: "min(90vw, 440px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Family Member</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>Link to {selectedCustomer?.name}</div>
              </div>
              <button className="modal-close" onClick={() => { setShowFamilyModal(false); setFamilyError(""); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {familyError && (
                <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} /> {familyError}
                </div>
              )}
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={familyForm.name}
                  onChange={(e) => { setFamilyForm(prev => ({ ...prev, name: e.target.value })); setFamilyError(""); }}
                  placeholder="Family member name"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }}
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <IndianPhoneInput
                  value={familyForm.phone}
                  onChange={(v) => { setFamilyForm(prev => ({ ...prev, phone: v })); setFamilyError(""); }}
                  placeholder="9876543210"
                />
              </div>
              <div className="form-group">
                <label>Relation *</label>
                <select
                  value={familyForm.relation}
                  onChange={(e) => { setFamilyForm(prev => ({ ...prev, relation: e.target.value })); setFamilyError(""); }}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.95rem", boxSizing: "border-box" }}
                >
                  <option value="">Select Relation</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="crm-btn" onClick={() => { setShowFamilyModal(false); setFamilyError(""); }}>Cancel</button>
              <button className="crm-btn" onClick={handleAddFamilyMember}>Add Member</button>
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
                <label>Type</label>
                <select value={followUpForm.type} onChange={(e) => setFollowUpForm(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="call">Call</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="visit">Visit</option>
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
              <button className="crm-btn" onClick={handleAddFollowUp} disabled={!followUpForm.date || !followUpForm.message}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
