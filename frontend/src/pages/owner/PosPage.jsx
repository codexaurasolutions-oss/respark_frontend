import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFromApi } from "../../utils/download";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import './PosPage.css';

const emptyServiceItem = { itemType: "SERVICE", serviceId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyProductItem = { itemType: "PRODUCT", productId: "", qty: 1, taxPct: 0 };
const emptyMembershipItem = { itemType: "MEMBERSHIP", membershipPlanId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyPackageItem = { itemType: "PACKAGE", packageId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyPayment = { mode: "CASH", amount: 0, note: "" };
const emptyRedemption = { customerPackageId: "", serviceId: "", sessionsUsed: 1, note: "" };

const normalizeGender = (value = "") => String(value || "").trim().toLowerCase();
const normalizeCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const normalizeProductCategoryId = (item) => item.categoryId || item.category?.id || item.category?.name || "";
const genderMatches = (serviceGender, selectedGender) => {
  if (selectedGender === "ALL") return true;
  const gender = normalizeGender(serviceGender);
  const selected = normalizeGender(selectedGender);
  return !gender || gender === "both" || gender === "unisex" || gender === selected;
};

export default function PosPage() {
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
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [paymentLinkForm, setPaymentLinkForm] = useState({ gatewayName: "RAZORPAY_PLACEHOLDER", expiresAt: "", note: "" });
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [newGuestForm, setNewGuestForm] = useState({ name: "", phone: "", email: "", gender: "FEMALE" });
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
    payments: [emptyPayment]
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
    const items = context.memberships || [];
    return items.length ? [{ title: "Memberships", items }] : [];
  }, [context.memberships]);

  const packageTileGroups = useMemo(() => {
    const items = context.packages || [];
    return items.length ? [{ title: "Packages", items }] : [];
  }, [context.packages]);

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
      next.items = [...activeItems, { ...emptyProductItem, productId: product.id, taxPct: product.taxPct || product.taxRate || 0 }];
      return next;
    });
  };
  
  const addQuickMembership = (m) => {
    setForm(c => {
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
      const nextItems = [...activeItems, { ...emptyMembershipItem, membershipPlanId: m.id, qty: 1 }];
      return { ...c, items: nextItems };
    });
  };

  const addQuickPackage = (p) => {
    setForm(c => {
      const activeItems = c.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
      const nextItems = [...activeItems, { ...emptyPackageItem, packageId: p.id, qty: 1 }];
      return { ...c, items: nextItems };
    });
  };

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      let basePrice = 0;
        if (item.itemType === "PRODUCT") basePrice = Number(productLookup[item.productId]?.sellingPrice || 0);
        else if (item.itemType === "MEMBERSHIP") basePrice = Number(membershipLookup[item.membershipPlanId]?.price || 0);
        else if (item.itemType === "PACKAGE") basePrice = Number(packageLookup[item.packageId]?.price || 0);
        else basePrice = Number(serviceLookup[item.serviceId]?.price || 0);
      return sum + Number(item.qty || 0) * basePrice;
    }, 0);
    const itemTax = form.items.reduce((sum, item) => {
      let basePrice = 0;
        if (item.itemType === "PRODUCT") basePrice = Number(productLookup[item.productId]?.sellingPrice || 0);
        else if (item.itemType === "MEMBERSHIP") basePrice = Number(membershipLookup[item.membershipPlanId]?.price || 0);
        else if (item.itemType === "PACKAGE") basePrice = Number(packageLookup[item.packageId]?.price || 0);
        else basePrice = Number(serviceLookup[item.serviceId]?.price || 0);
      return sum + ((Number(item.qty || 0) * basePrice) * Number(item.taxPct || 0)) / 100;
    }, 0);
    const extraTax = Number(form.tax || 0);
    const discount = Number(form.discount || 0);
    const total = subtotal + itemTax + extraTax - discount;
    const paid = form.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return { subtotal, itemTax, total, paid, due: Math.max(0, total - paid) };
  }, [form, membershipLookup, packageLookup, productLookup, serviceLookup]);

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
    // Validation removed: If they don't enter a payment amount, we will automatically assume full CASH payment.
    return "";
  }, [form]);

  const buildInvoicePayload = useCallback((mode) => {
    const activeItems = form.items.filter((item) => item.serviceId || item.productId || item.membershipPlanId || item.packageId);
    
    let finalPayments = [];
    if (mode === "complete") {
      finalPayments = form.payments.filter((payment) => Number(payment.amount) > 0).map((payment) => ({
        ...payment,
        amount: Number(payment.amount)
      }));
      // Auto-fill full amount as CASH if user didn't enter any payments
      if (finalPayments.length === 0 && totals.total > 0) {
        finalPayments = [{ mode: "CASH", amount: totals.total, note: "Auto-filled full amount" }];
      }
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
  }, [form, totals.total]);

  const updateItem = (index, patch) => {
    const nextItems = [...form.items];
    nextItems[index] = { ...nextItems[index], ...patch };
    setForm((current) => ({ ...current, items: nextItems }));
  };

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
      setNewGuestForm({ name: "", phone: "", email: "", gender: "FEMALE" });
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
              value={tab === 'billing' ? serviceSearch : productSearch} 
              onChange={(e) => tab === 'billing' ? setServiceSearch(e.target.value) : setProductSearch(e.target.value)} 
            />
            <svg className="pos-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="pos-topbar-right">
          <button className={`pos-top-tab ${tab === "billing" ? "active" : ""}`} onClick={() => setTab("billing")}>Add Service</button>
          <button className={`pos-top-tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>Add Product</button>
          <button className={`pos-top-tab ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>Add Package</button>
          <button className={`pos-top-tab ${tab === "memberships" ? "active" : ""}`} onClick={() => setTab("memberships")}>Add Membership</button>
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
                      <div className="pos-customer-dropdown" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "4px", maxHeight: "300px", overflowY: "auto", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
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
                    <th>Split</th>
                    <th>Batch</th>
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
                    const price = Number(
                      item.itemType === "PRODUCT"
                        ? baseObj.sellingPrice
                        : item.itemType === "MEMBERSHIP"
                          ? (baseObj.price || baseObj.monthlyPrice)
                          : baseObj.price
                    ) || 0;
                    const qty = Number(item.qty) || 1;
                    const subTotal = price * qty;
                    const tax = (subTotal * Number(item.taxPct || 0)) / 100;
                    const total = subTotal + tax;
                    return (
                      <tr key={index}>
                        <td style={{ color: "#334155" }}>{baseObj.name}</td>
                        <td>
                          {item.itemType === "SERVICE" ? (
                            <select className="pos-cart-select" value={item.staffUserId || ""} onChange={(e) => updateItem(index, { staffUserId: e.target.value })}>
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
                            onChange={(e) => updateItem(index, { qty: e.target.value })}
                          />
                        </td>
                        <td>{price.toFixed(0)}</td>
                        <td>{subTotal.toFixed(0)}</td>
                        <td><input className="pos-cart-input" style={{ width: 50 }} placeholder="0" /></td>
                        <td><input className="pos-cart-input" style={{ width: 60 }} placeholder="0" /></td>
                        <td>{tax.toFixed(0)}</td>
                        <td>{total.toFixed(0)}</td>
                        <td><input className="pos-cart-input" style={{ width: 50 }} placeholder="0" /></td>
                        <td><span style={{ color: "#94a3b8" }}>N/A</span></td>
                        <td>
                          <button type="button" className="pos-cart-remove" onClick={() => setForm(c => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.filter(item => item.serviceId || item.productId || item.membershipPlanId || item.packageId).length === 0 && (
                    <tr>
                      <td colSpan="12" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                        No items added yet. Click a service or product on the left to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pos-grand-total-row">
              <div className="pos-grand-total">
                Grand Total <strong>₹{totals.total.toFixed(0)}</strong>
              </div>
            </div>

            <div className="pos-instruction-row">
              <input placeholder="Add Order Instruction (Optional, Max 500 Characters)" value={form.notes} onChange={(e) => setForm(c => ({ ...c, notes: e.target.value }))} />
            </div>

            <div className="pos-payment-details">
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
              </div>

              <div className="pos-message-config">
                <h5>Message Configurations:</h5>
                <div className="pos-message-options">
                  <label><input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", margin: 0, cursor: "pointer" }} /> Feedback Message</label>
                  <label><input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", margin: 0, cursor: "pointer" }} /> Invoice Message</label>
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
          <div style={{ background: "white", padding: 24, borderRadius: 12, width: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
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
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} type="email" placeholder="Email (Optional)" value={newGuestForm.email} onChange={e => setNewGuestForm(c => ({ ...c, email: e.target.value }))} />
              <select style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.gender} onChange={e => setNewGuestForm(c => ({ ...c, gender: e.target.value }))}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="UNISEX">Other</option>
              </select>
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
          <div style={{ background: "white", padding: 32, borderRadius: 12, width: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", textAlign: "center" }}>
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
    </div>
  );
}
