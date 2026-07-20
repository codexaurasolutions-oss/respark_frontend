import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import "./MembershipsPage.css";

const emptyMembership = {
  membershipType: "Fixed", // 'Fixed' or 'Percentage'
  name: "",
  isActive: true,
  price: "",
  validityDays: "",
  renewalReminder: "",
  isSharable: false,
  applySelectedDays: false,
  applySelectedServices: false,
  description: "",
  benefits: [{ label: "", value: "" }],
  benefitType: "WALLET_VALUE", // We will set this dynamically based on membershipType
  discountValue: "",
  walletValue: "",
  serviceIds: []
};
const emptyPackage = { name: "", price: 0, totalSessions: 5, validityDays: 60, services: [], products: [], includeProducts: false, selectedCategoryId: "" };
const emptyPackageRedeem = { customerPackageId: "", serviceId: "", sessionsUsed: 1, note: "" };
const normalizeRows = (value) => Array.isArray(value) ? value : value?.items || value?.rows || [];
const normalizeBenefits = (value) => {
  const rows = Array.isArray(value) ? value : [];
  return rows.length ? rows.map((item) => ({ label: item.label || "", value: item.value || "" })) : [{ label: "", value: "" }];
};
const cleanBenefits = (value) => normalizeBenefits(value).map((item) => ({
  label: String(item.label || "").trim(),
  value: String(item.value || "").trim()
})).filter((item) => item.label);

export default function MembershipsPage() {
  const location = useLocation();
  const { id: routeId } = useParams();
  const { formatMoney } = useSalonSettings();
  const { selectedBranchId } = useBranch();
  const customerId = location.pathname.includes("/customers/") ? routeId : "";
  const editableMembershipId = location.pathname.includes("/admin/memberships/") && location.pathname.includes("/edit") ? routeId : "";
  const editablePackageId = location.pathname.includes("/admin/packages/") && location.pathname.includes("/edit") ? routeId : "";
  const [memberships, setMemberships] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [membershipForm, setMembershipForm] = useState(emptyMembership);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [assignMembershipForm, setAssignMembershipForm] = useState({ customerId: customerId || "", membershipPlanId: "", startsAt: "" });
  const [assignPackageForm, setAssignPackageForm] = useState({ customerId: customerId || "", packageId: "", startsAt: "" });
  const [redeemForm, setRedeemForm] = useState(emptyPackageRedeem);
  const [membershipLifecycleForm, setMembershipLifecycleForm] = useState({ customerMembershipId: "", topUpAmount: 0, upgradePlanId: "", transferCustomerId: "", note: "" });
  const [packageLifecycleForm, setPackageLifecycleForm] = useState({ customerPackageId: "", additionalSessions: 0, transferCustomerId: "", note: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const applyWorkspaceData = useCallback(async ({
    membershipResponse,
    packageResponse,
    serviceResponse,
    serviceCategoryResponse,
    productResponse,
    customerResponse,
    activeCustomerId = "",
    active = true,
    membershipId = editableMembershipId,
    packageId = editablePackageId
  }) => {
    if (!active) return;

    const nextMemberships = membershipResponse.status === "fulfilled" ? normalizeRows(membershipResponse.value.data) : [];
    const nextPackages = packageResponse.status === "fulfilled" ? normalizeRows(packageResponse.value.data) : [];
    const nextServices = serviceResponse.status === "fulfilled" ? normalizeRows(serviceResponse.value.data) : [];
    const nextServiceCategories = serviceCategoryResponse?.status === "fulfilled" ? normalizeRows(serviceCategoryResponse.value.data) : [];
    const nextProducts = productResponse?.status === "fulfilled" ? normalizeRows(productResponse.value.data) : [];
    const nextCustomers = customerResponse.status === "fulfilled" ? normalizeRows(customerResponse.value.data) : [];

    setMemberships(nextMemberships);
    setPackages(nextPackages);
    setServices(nextServices);
    setServiceCategories(nextServiceCategories);
    setProducts(nextProducts);
    setCustomers(nextCustomers);

    if (activeCustomerId) {
      try {
        const historyResponse = await api.get(`/owner/customers/${activeCustomerId}/history`);
        if (!active) return;
        setSelectedCustomerHistory(historyResponse.data);
      } catch {
        if (!active) return;
        setSelectedCustomerHistory(null);
      }
    } else {
      setSelectedCustomerHistory(null);
    }

    if (membershipId) {
      try {
        const membershipDetail = await api.get(`/owner/memberships/${membershipId}`);
        if (!active) return;
        setMembershipForm({
          membershipType: membershipDetail.data.benefitType === "DISCOUNT_PERCENT" ? "Percentage" : "Fixed",
          name: membershipDetail.data.name || "",
          isActive: true, // Assuming true by default if no active flag
          description: membershipDetail.data.description || "",
          benefits: normalizeBenefits(membershipDetail.data.benefits),
          price: membershipDetail.data.price || "",
          validityDays: membershipDetail.data.validityDays || "",
          renewalReminder: "", // not in db yet?
          isSharable: false, // not in db yet?
          applySelectedDays: false,
          applySelectedServices: (membershipDetail.data.services || []).length > 0,
          benefitType: membershipDetail.data.benefitType || "WALLET_VALUE",
          discountValue: membershipDetail.data.discountValue || "",
          walletValue: membershipDetail.data.walletValue || "",
          serviceIds: (membershipDetail.data.services || []).map((item) => item.serviceId)
        });
      } catch {
        if (!active) return;
      }
    }

    if (packageId) {
      try {
        const packageDetail = await api.get(`/owner/packages/${packageId}`);
        if (!active) return;
        setPackageForm({
          name: packageDetail.data.name || "",
          price: packageDetail.data.price || 0,
          totalSessions: packageDetail.data.totalSessions || 5,
          validityDays: packageDetail.data.validityDays || 60,
          services: (packageDetail.data.services || []).map((item) => ({
            serviceId: item.serviceId,
            sessions: item.sessions || 1
          })),
          products: (packageDetail.data.products || []).map((item) => ({
            productId: item.productId,
            quantity: item.quantity || 1
          })),
          includeProducts: (packageDetail.data.products || []).length > 0,
          selectedCategoryId: ""
        });
      } catch {
        if (!active) return;
      }
    }

    const failedCoreLoads = [membershipResponse, packageResponse, serviceResponse, customerResponse].filter((entry) => entry.status !== "fulfilled");
    if (failedCoreLoads.length) {
      setStatus((current) => ({
        ...current,
        error: "Some memberships workspace data could not be loaded completely. Available lists are still usable."
      }));
    } else {
      setStatus((current) => ({ ...current, error: "" }));
    }
  }, [editableMembershipId, editablePackageId]);

  const loadAll = async (activeCustomerId = customerId || assignMembershipForm.customerId || assignPackageForm.customerId || "") => {
    setLoading(true);
    try {
      const [membershipResponse, packageResponse, serviceResponse, serviceCategoryResponse, productResponse, customerResponse] = await Promise.allSettled([
        api.get("/owner/memberships", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/packages", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/services", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/service-categories", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/inventory/products", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/customers", { params: { branchId: selectedBranchId || undefined } })
      ]);
      await applyWorkspaceData({ membershipResponse, packageResponse, serviceResponse, serviceCategoryResponse, productResponse, customerResponse, activeCustomerId });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load memberships, packages, customers, or services"), success: "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [membershipResponse, packageResponse, serviceResponse, serviceCategoryResponse, productResponse, customerResponse] = await Promise.allSettled([
          api.get("/owner/memberships", { params: { branchId: selectedBranchId || undefined } }),
          api.get("/owner/packages", { params: { branchId: selectedBranchId || undefined } }),
          api.get("/owner/services", { params: { branchId: selectedBranchId || undefined } }),
          api.get("/owner/service-categories", { params: { branchId: selectedBranchId || undefined } }),
          api.get("/owner/inventory/products", { params: { branchId: selectedBranchId || undefined } }),
          api.get("/owner/customers", { params: { branchId: selectedBranchId || undefined } })
        ]);
        await applyWorkspaceData({
          membershipResponse,
          packageResponse,
          serviceResponse,
          serviceCategoryResponse,
          productResponse,
          customerResponse,
          activeCustomerId: customerId,
          active,
          membershipId: editableMembershipId,
          packageId: editablePackageId
        });
      } catch (error) {
        if (!active) return;
        setStatus({ error: formatApiError(error, "Could not load memberships workspace"), success: "" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applyWorkspaceData, customerId, editableMembershipId, editablePackageId, selectedBranchId]);

  const toggleMembershipService = (serviceId) => {
    setMembershipForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId) ? current.serviceIds.filter((id) => id !== serviceId) : [...current.serviceIds, serviceId]
    }));
  };

  const updateMembershipBenefit = (index, patch) => {
    setMembershipForm((current) => ({
      ...current,
      benefits: normalizeBenefits(current.benefits).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  };

  const addMembershipBenefit = () => {
    setMembershipForm((current) => ({
      ...current,
      benefits: [...normalizeBenefits(current.benefits), { label: "", value: "" }]
    }));
  };

  const removeMembershipBenefit = (index) => {
    setMembershipForm((current) => {
      const nextBenefits = normalizeBenefits(current.benefits).filter((_, itemIndex) => itemIndex !== index);
      return { ...current, benefits: nextBenefits.length ? nextBenefits : [{ label: "", value: "" }] };
    });
  };

  const togglePackageService = (serviceId) => {
    setPackageForm((current) => ({
      ...current,
      services: current.services.some((item) => item.serviceId === serviceId)
        ? current.services.filter((item) => item.serviceId !== serviceId)
        : [...current.services, { serviceId, sessions: 1 }]
    }));
  };

  const togglePackageProduct = (productId) => {
    setPackageForm((current) => ({
      ...current,
      products: current.products.some((item) => item.productId === productId)
        ? current.products.filter((item) => item.productId !== productId)
        : [...current.products, { productId, quantity: 1 }]
    }));
  };

  const collectCategoryServiceIds = (categoryId) => {
    const cat = serviceCategories.find((c) => c.id === categoryId);
    if (!cat) return [];
    const ids = new Set();
    (cat.services || []).forEach((s) => ids.add(s.id));
    (cat.children || []).forEach((child) => {
      (child.services || []).forEach((s) => ids.add(s.id));
    });
    return Array.from(ids);
  };

  const handleCategorySelect = (categoryId) => {
    if (!categoryId) {
      setPackageForm((current) => ({ ...current, selectedCategoryId: "" }));
      return;
    }
    const serviceIds = collectCategoryServiceIds(categoryId);
    setPackageForm((current) => {
      const existingIds = new Set(current.services.map((s) => s.serviceId));
      const merged = [...current.services];
      serviceIds.forEach((id) => {
        if (!existingIds.has(id)) {
          merged.push({ serviceId: id, sessions: 1 });
        }
      });
      return { ...current, selectedCategoryId: categoryId, services: merged };
    });
  };

  const removePackageService = (serviceId) => {
    setPackageForm((current) => ({
      ...current,
      services: current.services.filter((item) => item.serviceId !== serviceId)
    }));
  };

  const [serviceSearch, setServiceSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const activeSection = location.pathname.includes("/packages") ? "packages" : "memberships";
  const customerMembershipMode = location.pathname.includes("/customers/") && location.pathname.includes("/memberships");
  const customerPackageMode = location.pathname.includes("/customers/") && location.pathname.includes("/packages");
  const membershipEditMode = Boolean(editableMembershipId);
  const packageEditMode = Boolean(editablePackageId);
  const customerScopeLabel = customerId ? "Customer linked" : "All customers";
  const customerPackageOptions = useMemo(
    () => (selectedCustomerHistory?.packages || []).filter((item) => item.status === "ACTIVE" && Number(item.remainingSessions || 0) > 0),
    [selectedCustomerHistory]
  );
  const effectiveCustomerPackageId = redeemForm.customerPackageId || customerPackageOptions[0]?.id || "";
  const customerOptions = customers.map((customer) => (
    <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `- ${customer.phone}` : ""}</option>
  ));

  // Branch-wise filtering on the client side
  const filteredMemberships = selectedBranchId
    ? memberships.filter(m => !m.branchId || m.branchId === selectedBranchId)
    : memberships;
  const filteredPackages = selectedBranchId
    ? packages.filter(p => !p.branchId || p.branchId === selectedBranchId)
    : packages;

  return (
    <div className="mem-page" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {status.error && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "#fef2f2", color: "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
          {status.error}
          <button onClick={() => setStatus({...status, error: ""})} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}
      {status.success && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "#ecfdf5", color: "#059669", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
          ✓ {status.success}
          <button onClick={() => setStatus({...status, success: ""})} style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}
      <div className="page-shell">
      {customerId ? (
        <ModuleTabs
          title="Customer Timeline"
          description="Complete CRM view with service history, billing, memberships, packages, and event trail."
          items={[
            { label: "Customer List", to: "/admin/customers", hint: "Back" },
            { label: "History View", to: `/admin/customers/${customerId}/history`, hint: "Profile" },
            { label: "Memberships", to: `/admin/customers/${customerId}/memberships`, hint: "Loyalty" },
            { label: "Packages", to: `/admin/customers/${customerId}/packages`, hint: "Prepaid" }
          ]}
          actions={<Link to="/admin/customers" className="module-tab">Back to Customers</Link>}
        />
      ) : (
        <ModuleTabs
          title="Memberships & Packages"
          description="Control recurring loyalty products, prepaid sessions, and service access in one revenue workspace."
          items={[
            { label: "Membership Plans", to: "/admin/memberships", hint: "Recurring" },
            { label: "Create Membership", to: "/admin/memberships/create", hint: "New" },
            { label: "Packages", to: "/admin/packages", hint: "Prepaid" },
            { label: "Create Package", to: "/admin/packages/create", hint: "New" }
          ]}
        />
      )}
      <div className="settings-section-grid">
        {(activeSection === "memberships") && <div className="panel-card">
          <h3>{customerMembershipMode ? "Assigned Memberships" : "Membership Plans"}</h3>
          {loading ? <PageLoader compact title="Loading memberships" message="Preparing plans, assignments, and customer usage balances." /> : null}
          <div className="list-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {(customerMembershipMode ? (selectedCustomerHistory?.memberships || []) : filteredMemberships).map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{customerMembershipMode ? item.membershipPlan?.name : item.name}</strong>
                  <span className="badge">{customerMembershipMode ? item.status : `${formatMoney(Number(item.price || 0))}`}</span>
                </div>
                <div className="item-meta">
                  {customerMembershipMode
                    ? `Ends ${String(item.endsAt).slice(0, 10)} · Wallet ${formatMoney(Number(item.remainingWalletValue || 0))}`
                    : `${item.benefitType === "WALLET_VALUE" ? "Fixed Wallet" : "Percentage Discount"} · ${item.validityDays} days`}
                </div>
                {(customerMembershipMode ? item.membershipPlan?.description : item.description) ? (
                  <p className="muted" style={{ margin: "8px 0 0" }}>{customerMembershipMode ? item.membershipPlan.description : item.description}</p>
                ) : null}
                {cleanBenefits(customerMembershipMode ? item.membershipPlan?.benefits : item.benefits).length ? (
                  <div className="badge-row" style={{ marginTop: 10 }}>
                    {cleanBenefits(customerMembershipMode ? item.membershipPlan?.benefits : item.benefits).map((benefit) => (
                      <span key={`${benefit.label}-${benefit.value}`} className="badge">{benefit.label}{benefit.value ? `: ${benefit.value}` : ""}</span>
                    ))}
                  </div>
                ) : null}
                {!customerMembershipMode && (
                  <div className="inline-actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <Link to={`/admin/memberships/${item.id}/edit`} className="cta-secondary">Edit</Link>
                    <button type="button" className="cta-secondary" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }} disabled={deletingId === item.id} onClick={async () => {
                      if (!window.confirm(`Delete membership plan "${item.name}"?`)) return;
                      try {
                        setDeletingId(item.id);
                        await api.delete(`/owner/memberships/${item.id}`);
                        setStatus({ error: "", success: "Membership plan deleted." });
                        setTimeout(() => setStatus({ error: "", success: "" }), 3000);
                        await loadAll(customerId);
                      } catch (error) {
                        setStatus({ error: formatApiError(error, "Could not delete membership plan"), success: "" });
                      } finally {
                        setDeletingId(null);
                      }
                    }}>{deletingId === item.id ? "Deleting..." : <Trash2 size={14} />}</button>
                  </div>
                )}
                {customerMembershipMode && (
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="secondary-button" onClick={() => setMembershipLifecycleForm((current) => ({ ...current, customerMembershipId: item.id }))}>Manage Lifecycle</button>
                  </div>
                )}
              </div>
            ))}
            {customerMembershipMode && !loading && !selectedCustomerHistory?.memberships?.length && <EmptyState title="No memberships assigned yet" message="Assign a membership to start tracking customer benefits and renewal activity." />}
            {!customerMembershipMode && !loading && !filteredMemberships.length && <EmptyState title="No membership plans yet" message="Create your first membership plan to launch recurring loyalty offers." />}
          </div>
        </div>}

        {(activeSection === "packages") && <div className="panel-card">
          <h3>{customerPackageMode ? "Assigned Packages" : "Packages"}</h3>
          <div className="list-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {(customerPackageMode ? (selectedCustomerHistory?.packages || []) : filteredPackages).map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{customerPackageMode ? item.package?.name : item.name}</strong>
                  <span className="badge">{customerPackageMode ? item.status : formatMoney(Number(item.price || 0))}</span>
                </div>
                <div className="item-meta">
                  {customerPackageMode
                    ? `Remaining ${item.remainingSessions} sessions · Ends ${String(item.endsAt).slice(0, 10)}`
                    : `${item.totalSessions} sessions · ${item.validityDays} days validity`}
                </div>
                {!customerPackageMode && (
                  <div className="inline-actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <Link to={`/admin/packages/${item.id}/edit`} className="cta-secondary">Edit</Link>
                    <button type="button" className="cta-secondary" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }} disabled={deletingId === item.id} onClick={async () => {
                      if (!window.confirm(`Delete package "${item.name}"?`)) return;
                      try {
                        setDeletingId(item.id);
                        await api.delete(`/owner/packages/${item.id}`);
                        setStatus({ error: "", success: "Package deleted." });
                        setTimeout(() => setStatus({ error: "", success: "" }), 3000);
                        await loadAll(customerId);
                      } catch (error) {
                        setStatus({ error: formatApiError(error, "Could not delete package"), success: "" });
                      } finally {
                        setDeletingId(null);
                      }
                    }}>{deletingId === item.id ? "Deleting..." : <Trash2 size={14} />}</button>
                  </div>
                )}
                {customerPackageMode && (
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="secondary-button" onClick={() => setPackageLifecycleForm((current) => ({ ...current, customerPackageId: item.id }))}>Manage Lifecycle</button>
                  </div>
                )}
              </div>
            ))}
            {customerPackageMode && !loading && !selectedCustomerHistory?.packages?.length && <EmptyState title="No packages assigned yet" message="Assign a package to start tracking prepaid sessions for this customer." />}
            {!customerPackageMode && !loading && !filteredPackages.length && <EmptyState title="No packages yet" message="Create your first package to launch prepaid session bundles." />}
          </div>
        </div>}

      {(activeSection === "memberships") && !customerMembershipMode && (
          <div className="panel-card">
            <h3 style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 14, marginBottom: 20 }}>
              {membershipEditMode ? "✏️ Edit Membership Plan" : "✦ Create Membership Plan"}
            </h3>
            
            <form onSubmit={async (event) => {
              event.preventDefault();
              setStatus({ error: "", success: "" });
              try {
                if (!membershipForm.name.trim()) throw new Error("Membership name is required.");
                const isFixed = membershipForm.membershipType === "Fixed";
                const payload = {
                  ...membershipForm,
                  name: membershipForm.name.trim(),
                  description: membershipForm.description.trim(),
                  benefits: cleanBenefits(membershipForm.benefits),
                  price: Number(membershipForm.price),
                  validityDays: Number(membershipForm.validityDays),
                  benefitType: isFixed ? "WALLET_VALUE" : "DISCOUNT_PERCENT",
                  walletValue: isFixed ? Number(membershipForm.walletValue || 0) : 0,
                  discountValue: !isFixed ? Number(membershipForm.discountValue || 0) : 0,
                  // Pass new fields incase backend accepts them, otherwise they are ignored safely
                  renewalReminder: Number(membershipForm.renewalReminder || 0),
                  isSharable: membershipForm.isSharable,
                  applySelectedDays: membershipForm.applySelectedDays,
                  applySelectedServices: membershipForm.applySelectedServices,
                  serviceIds: membershipForm.applySelectedServices ? membershipForm.serviceIds : [],
                  branchId: selectedBranchId || null
                };
                if (membershipEditMode) {
                  await api.patch(`/owner/memberships/${editableMembershipId}`, payload);
                } else {
                  await api.post("/owner/memberships", payload);
                }
                setMembershipForm(emptyMembership);
                await loadAll();
                setStatus({ error: "", success: membershipEditMode ? "Membership updated." : "Membership created." });
              } catch (error) {
                setStatus({ error: formatApiError(error, "Could not save membership"), success: "" });
              }
            }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Membership Type Radio */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Membership Type:</label>
                <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem", color: "#0f172a" }}>
                    <input 
                      type="radio" 
                      name="membershipType" 
                      value="Fixed" 
                      checked={membershipForm.membershipType === "Fixed"} 
                      onChange={() => setMembershipForm({ ...membershipForm, membershipType: "Fixed" })}
                      style={{ accentColor: "#e11d48", width: "16px", height: "16px" }}
                    />
                    Fixed
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem", color: "#0f172a" }}>
                    <input 
                      type="radio" 
                      name="membershipType" 
                      value="Percentage" 
                      checked={membershipForm.membershipType === "Percentage"} 
                      onChange={() => setMembershipForm({ ...membershipForm, membershipType: "Percentage" })}
                      style={{ accentColor: "#e11d48", width: "16px", height: "16px" }}
                    />
                    Percentage
                  </label>
                </div>
              </div>

              {/* Name & Active */}
              <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter Name" 
                    value={membershipForm.name} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, name: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px" }}>
                  <input 
                    type="checkbox" 
                    checked={membershipForm.isActive} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, isActive: e.target.checked })}
                    style={{ accentColor: "var(--accent, #3b82f6)", width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Active</span>
                </div>
              </div>

              {/* Fees, Validity, Renewal Reminder, Standard Discount */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Fees</label>
                  <input 
                    type="number" 
                    placeholder="Enter Fee" 
                    value={membershipForm.price} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, price: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Validity</label>
                  <input 
                    type="number" 
                    placeholder="In Days" 
                    value={membershipForm.validityDays} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, validityDays: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Renewal Reminder</label>
                  <input 
                    type="number" 
                    placeholder="In Days" 
                    value={membershipForm.renewalReminder} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, renewalReminder: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                {membershipForm.membershipType === "Percentage" && (
                  <div>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Standard Discount '%'</label>
                    <input 
                      type="number" 
                      placeholder="Enter %" 
                      value={membershipForm.discountValue} 
                      onChange={(e) => setMembershipForm({ ...membershipForm, discountValue: e.target.value })} 
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                )}
              </div>

              {/* Benefit Amount (Fixed Only) */}
              {membershipForm.membershipType === "Fixed" && (
                <div style={{ width: "200px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Benefit Amount</label>
                  <input 
                    type="number" 
                    placeholder="Enter Amount" 
                    value={membershipForm.walletValue} 
                    onChange={(e) => setMembershipForm({ ...membershipForm, walletValue: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              )}

              {/* Toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "fit-content" }}>
                  <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>Membership Sharable</span>
                  <div style={{ position: "relative", width: "36px", height: "20px", background: membershipForm.isSharable ? "#3b82f6" : "#cbd5e1", borderRadius: "20px", transition: "background 0.3s" }}>
                    <div style={{ position: "absolute", top: "2px", left: membershipForm.isSharable ? "18px" : "2px", width: "16px", height: "16px", background: "white", borderRadius: "50%", transition: "left 0.3s" }}></div>
                  </div>
                  <input type="checkbox" checked={membershipForm.isSharable} onChange={e => setMembershipForm({...membershipForm, isSharable: e.target.checked})} style={{ display: "none" }} />
                </label>
                
                {membershipForm.membershipType === "Percentage" && (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "fit-content" }}>
                      <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>Apply Membership For Selected Days</span>
                      <div style={{ position: "relative", width: "36px", height: "20px", background: membershipForm.applySelectedDays ? "#3b82f6" : "#cbd5e1", borderRadius: "20px", transition: "background 0.3s" }}>
                        <div style={{ position: "absolute", top: "2px", left: membershipForm.applySelectedDays ? "18px" : "2px", width: "16px", height: "16px", background: "white", borderRadius: "50%", transition: "left 0.3s" }}></div>
                      </div>
                      <input type="checkbox" checked={membershipForm.applySelectedDays} onChange={e => setMembershipForm({...membershipForm, applySelectedDays: e.target.checked})} style={{ display: "none" }} />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "fit-content" }}>
                      <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>Apply Membership On Selected Services</span>
                      <div style={{ position: "relative", width: "36px", height: "20px", background: membershipForm.applySelectedServices ? "#3b82f6" : "#cbd5e1", borderRadius: "20px", transition: "background 0.3s" }}>
                        <div style={{ position: "absolute", top: "2px", left: membershipForm.applySelectedServices ? "18px" : "2px", width: "16px", height: "16px", background: "white", borderRadius: "50%", transition: "left 0.3s" }}></div>
                      </div>
                      <input type="checkbox" checked={membershipForm.applySelectedServices} onChange={e => setMembershipForm({...membershipForm, applySelectedServices: e.target.checked})} style={{ display: "none" }} />
                    </label>
                  </>
                )}
              </div>

              {/* Service Selection for Percentage (If enabled) */}
              {membershipForm.membershipType === "Percentage" && membershipForm.applySelectedServices && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Select Services</label>
                  <input 
                    type="text" 
                    placeholder="Search services..." 
                    value={serviceSearch} 
                    onChange={(e) => setServiceSearch(e.target.value)} 
                    style={{ marginBottom: "12px", padding: "8px 12px", width: "100%", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "0.8rem", outline: "none" }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                    {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((service) => {
                      const isSelected = membershipForm.serviceIds.includes(service.id);
                      return (
                        <button 
                          type="button" 
                          key={service.id} 
                          onClick={() => {
                            setMembershipForm(cur => ({
                              ...cur,
                              serviceIds: isSelected ? cur.serviceIds.filter(id => id !== service.id) : [...cur.serviceIds, service.id]
                            }));
                          }}
                          style={{
                            padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                            background: isSelected ? "#3b82f6" : "white",
                            color: isSelected ? "white" : "#475569",
                            border: isSelected ? "1px solid #3b82f6" : "1px solid #cbd5e1"
                          }}
                        >
                          {service.name}
                        </button>
                      );
                    })}
                    {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No services found</span>}
                  </div>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "10px 0" }} />

              {/* Bottom Totals */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ alignSelf: "flex-end", fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                  Total Amount To Pay: <span style={{ color: "#0f172a", fontWeight: 800 }}>{formatMoney(membershipForm.price || 0)}</span>
                </div>
                
                {membershipForm.membershipType === "Fixed" && (
                  <div style={{ background: "#e2e8f0", padding: "12px", borderRadius: "4px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span style={{ fontSize: "0.9rem", color: "#334155" }}>Final benefit amount is: <strong style={{ color: "var(--accent, #3b82f6)" }}>{formatMoney(membershipForm.walletValue || 0)}</strong></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button type="button" onClick={() => setMembershipForm(emptyMembership)} style={{ padding: "8px 24px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 32px", borderRadius: "6px", border: "none", background: "var(--button-bg-solid, #3b82f6)", color: "white", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" }}>Save</button>
              </div>

            </form>
          </div>
        )}

        {(activeSection === "packages") && !customerPackageMode && (
          <div className="panel-card">
            <h3 style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 14, marginBottom: 20 }}>
              {packageEditMode ? "✏️ Edit Package" : "✦ Create Package"}
            </h3>
            <form onSubmit={async (event) => {
              event.preventDefault();
              setStatus({ error: "", success: "" });
              try {
                if (!packageForm.name.trim()) throw new Error("Package name is required.");
                if (!packageForm.services.length) throw new Error("Select at least one service for this package.");
                const payload = {
                  ...packageForm,
                  name: packageForm.name.trim(),
                  price: Number(packageForm.price),
                  totalSessions: Number(packageForm.totalSessions),
                  validityDays: Number(packageForm.validityDays),
                  branchId: selectedBranchId || undefined,
                  services: packageForm.services.map((item) => ({
                    serviceId: item.serviceId,
                    sessions: Number(item.sessions || 1)
                  })),
                  products: packageForm.includeProducts ? packageForm.products.map((item) => ({
                    productId: item.productId,
                    quantity: Number(item.quantity || 1)
                  })) : []
                };
                delete payload.selectedCategoryId;
                if (packageEditMode) {
                  await api.patch(`/owner/packages/${editablePackageId}`, payload);
                } else {
                  await api.post("/owner/packages", payload);
                }
                setPackageForm(emptyPackage);
                setServiceSearch("");
                setProductSearch("");
                await loadAll();
                setStatus({ error: "", success: packageEditMode ? "Package updated." : "Package created." });
              } catch (error) {
                setStatus({ error: formatApiError(error, "Could not save package"), success: "" });
              }
            }} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Name & Active */}
              <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Package name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bridal Package" 
                    value={packageForm.name} 
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px" }}>
                  <input 
                    type="checkbox" 
                    defaultChecked={true}
                    style={{ accentColor: "var(--accent, #3b82f6)", width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Active</span>
                </div>
              </div>

              {/* Price, Total Sessions, Validity */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Price</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0" 
                    value={packageForm.price} 
                    onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Total sessions</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="5" 
                    value={packageForm.totalSessions} 
                    onChange={(e) => setPackageForm({ ...packageForm, totalSessions: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "6px" }}>Validity (Days)</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="60" 
                    value={packageForm.validityDays} 
                    onChange={(e) => setPackageForm({ ...packageForm, validityDays: e.target.value })} 
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", width: "fit-content" }}>
                  <span style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 600 }}>Does this package include physical products?</span>
                  <div style={{ position: "relative", width: "36px", height: "20px", background: packageForm.includeProducts ? "#3b82f6" : "#cbd5e1", borderRadius: "20px", transition: "background 0.3s" }}>
                    <div style={{ position: "absolute", top: "2px", left: packageForm.includeProducts ? "18px" : "2px", width: "16px", height: "16px", background: "white", borderRadius: "50%", transition: "left 0.3s" }}></div>
                  </div>
                  <input type="checkbox" checked={packageForm.includeProducts} onChange={e => setPackageForm({...packageForm, includeProducts: e.target.checked})} style={{ display: "none" }} />
                </label>
              </div>

              {/* Service Category + Selected Services + Individual Services */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Service Category</label>
                <select
                  value={packageForm.selectedCategoryId}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none", marginBottom: "12px" }}
                >
                  <option value="">Select a category to auto-add services</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {packageForm.services.length > 0 && (
                  <>
                    <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>
                      Included Services ({packageForm.services.length})
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto", marginBottom: "16px" }}>
                      {packageForm.services.map((item) => {
                        const svc = services.find((s) => s.id === item.serviceId);
                        if (!svc) return null;
                        return (
                          <div key={item.serviceId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "white", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 500 }}>
                              {svc.name}
                              {svc.category ? <span style={{ color: "#94a3b8", marginLeft: "6px" }}>({svc.category.name})</span> : null}
                              {svc.price ? <span style={{ color: "#64748b", marginLeft: "6px" }}>— {formatMoney(svc.price)}</span> : null}
                            </span>
                            <button type="button" onClick={() => removePackageService(item.serviceId)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, padding: "2px 6px" }}>
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 12px 0" }} />

                <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Add Individual Services</label>
                <input
                  type="text"
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  style={{ marginBottom: "12px", padding: "8px 12px", width: "100%", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "0.8rem", outline: "none" }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                  {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((service) => {
                    const isSelected = packageForm.services.some((item) => item.serviceId === service.id);
                    return (
                      <button
                        type="button"
                        key={service.id}
                        onClick={() => togglePackageService(service.id)}
                        style={{
                          padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                          background: isSelected ? "#3b82f6" : "white",
                          color: isSelected ? "white" : "#475569",
                          border: isSelected ? "1px solid #3b82f6" : "1px solid #cbd5e1"
                        }}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                  {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No services found</span>}
                </div>
              </div>

              {/* Product Selection */}
              {packageForm.includeProducts && (
                <div style={{ background: "#fdf8f5", padding: "16px", borderRadius: "8px", border: "1px solid #f0e1df" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: "8px" }}>Included Products</label>
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={productSearch} 
                    onChange={(e) => setProductSearch(e.target.value)} 
                    style={{ marginBottom: "12px", padding: "8px 12px", width: "100%", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "0.8rem", outline: "none" }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((product) => {
                      const isSelected = packageForm.products.some((item) => item.productId === product.id);
                      return (
                        <button 
                          type="button" 
                          key={product.id} 
                          onClick={() => togglePackageProduct(product.id)}
                          style={{
                            padding: "6px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                            background: isSelected ? "#f97316" : "white",
                            color: isSelected ? "white" : "#475569",
                            border: isSelected ? "1px solid #f97316" : "1px solid #cbd5e1"
                          }}
                        >
                          {product.name}
                        </button>
                      );
                    })}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No products found</span>}
                  </div>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "10px 0" }} />

              {/* Bottom Totals */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ alignSelf: "flex-end", fontSize: "0.9rem", color: "#475569", fontWeight: 600 }}>
                  Total Amount To Pay: <span style={{ color: "#0f172a", fontWeight: 800 }}>{formatMoney(packageForm.price || 0)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button type="button" onClick={() => { setPackageForm(emptyPackage); setServiceSearch(""); setProductSearch(""); }} style={{ padding: "8px 24px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 32px", borderRadius: "6px", border: "none", background: "var(--button-bg-solid, #3b82f6)", color: "white", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" }}>Save</button>
              </div>

            </form>
          </div>
        )}

        {(activeSection === "memberships") && <div className="panel-card">
          <h3>Assign Membership</h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>{customerScopeLabel}</p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setStatus({ error: "", success: "" });
            try {
              await api.post("/owner/memberships/assign", {
                ...assignMembershipForm,
                customerId: customerId || assignMembershipForm.customerId,
                startsAt: assignMembershipForm.startsAt || undefined
              });
              await loadAll(customerId || assignMembershipForm.customerId);
              setAssignMembershipForm({ customerId: customerId || "", membershipPlanId: "", startsAt: "" });
              setStatus({ error: "", success: "Membership assigned." });
              setTimeout(() => setStatus({ error: "", success: "" }), 3000);
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not assign membership"), success: "" });
            }
          }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!customerId && (
              <label>
                <span className="muted">Customer</span>
                <select value={assignMembershipForm.customerId} onChange={async (event) => {
                  const nextCustomerId = event.target.value;
                  setAssignMembershipForm((current) => ({ ...current, customerId: nextCustomerId }));
                  if (nextCustomerId) await loadAll(nextCustomerId);
                }}>
                  <option value="">Select customer</option>
                  {loading ? <option value="" disabled>Loading customers...</option> : null}
                  {!loading && !customers.length ? <option value="" disabled>No customers found</option> : null}
                  {customerOptions}
                </select>
              </label>
            )}
            <label>
              <span className="muted">Membership plan</span>
              <select value={assignMembershipForm.membershipPlanId} onChange={(event) => setAssignMembershipForm((current) => ({ ...current, membershipPlanId: event.target.value }))}>
                <option value="">Select membership plan</option>
                {filteredMemberships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Start Date</span>
              <input type="date" value={assignMembershipForm.startsAt} onChange={(event) => setAssignMembershipForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Assign Membership</button>
            </div>
          </form>
        </div>}

        {(activeSection === "packages") && <div className="panel-card">
          <h3>Assign Package</h3>
          <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>{customerScopeLabel}</p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setStatus({ error: "", success: "" });
            try {
              await api.post("/owner/packages/assign", {
                ...assignPackageForm,
                customerId: customerId || assignPackageForm.customerId,
                startsAt: assignPackageForm.startsAt || undefined
              });
              await loadAll(customerId || assignPackageForm.customerId);
              setAssignPackageForm({ customerId: customerId || "", packageId: "", startsAt: "" });
              setStatus({ error: "", success: "Package assigned." });
              setTimeout(() => setStatus({ error: "", success: "" }), 3000);
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not assign package"), success: "" });
            }
          }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!customerId && (
              <label>
                <span className="muted">Customer</span>
                <select value={assignPackageForm.customerId} onChange={async (event) => {
                  const nextCustomerId = event.target.value;
                  setAssignPackageForm((current) => ({ ...current, customerId: nextCustomerId }));
                  if (nextCustomerId) await loadAll(nextCustomerId);
                }}>
                  <option value="">Select customer</option>
                  {loading ? <option value="" disabled>Loading customers...</option> : null}
                  {!loading && !customers.length ? <option value="" disabled>No customers found</option> : null}
                  {customerOptions}
                </select>
              </label>
            )}
            <label>
              <span className="muted">Package</span>
              <select value={assignPackageForm.packageId} onChange={(event) => setAssignPackageForm((current) => ({ ...current, packageId: event.target.value }))}>
                <option value="">Select package</option>
                {filteredPackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Start Date</span>
              <input type="date" value={assignPackageForm.startsAt} onChange={(event) => setAssignPackageForm((current) => ({ ...current, startsAt: event.target.value }))} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Assign Package</button>
            </div>
          </form>
        </div>}
      </div>

      {activeSection === "packages" && (
        <div className="panel-card" style={{ marginTop: 18 }}>
          <h3>Redeem Package Session</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Use this when a customer consumes prepaid sessions without a direct POS redemption flow.
          </p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setStatus({ error: "", success: "" });
            try {
              await api.post("/owner/packages/redeem", {
                ...redeemForm,
                customerPackageId: effectiveCustomerPackageId,
                sessionsUsed: Number(redeemForm.sessionsUsed)
              });
              await loadAll(customerId || assignPackageForm.customerId);
              setRedeemForm(emptyPackageRedeem);
              setStatus({ error: "", success: "Package session redeemed." });
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not redeem package"), success: "" });
            }
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Customer package</span>
              <select value={effectiveCustomerPackageId} onChange={(event) => setRedeemForm((current) => ({ ...current, customerPackageId: event.target.value }))}>
              <option value="">Select customer package</option>
              {customerPackageOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.package?.name} - {selectedCustomerHistory?.name || "Customer"} ({item.remainingSessions} left)
                </option>
              ))}
            </select>
            </label>
            <label>
              <span className="muted">Service</span>
              <select value={redeemForm.serviceId} onChange={(event) => setRedeemForm((current) => ({ ...current, serviceId: event.target.value }))}>
              <option value="">Select service</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
            </label>
            <input type="number" min="1" value={redeemForm.sessionsUsed} onChange={(event) => setRedeemForm((current) => ({ ...current, sessionsUsed: event.target.value }))} placeholder="Sessions used" />
            <textarea rows="3" value={redeemForm.note} onChange={(event) => setRedeemForm((current) => ({ ...current, note: event.target.value }))} placeholder="Redemption note" />
            <button disabled={!customerPackageOptions.length}>Redeem Package</button>
          </form>
        </div>
      )}

      {selectedCustomerHistory && (
        <div className="settings-section-grid" style={{ marginTop: 18 }}>
          <div className="panel-card">
            <h3>Customer Membership History</h3>
            <div className="list-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
              {(selectedCustomerHistory.memberships || []).map((item) => (
                <div key={item.id} className="list-item">
                  <div className="item-head">
                    <strong>{item.membershipPlan?.name}</strong>
                    <span className="badge">{item.status}</span>
                  </div>
                  <div className="item-meta">Ends {String(item.endsAt).slice(0, 10)} | Wallet {Number(item.remainingWalletValue || 0).toFixed(2)}</div>
                  <div className="item-meta">Usage records {(item.usageLogs || []).length}</div>
                </div>
              ))}
              {!loading && !selectedCustomerHistory.memberships?.length && <EmptyState title="No membership history yet" message="Once memberships are assigned, customer history and usage logs will appear here." />}
            </div>
          </div>
          <div className="panel-card">
            <h3>Customer Package History</h3>
            <div className="list-stack">
              {(selectedCustomerHistory.packages || []).map((item) => (
                <div key={item.id} className="list-item">
                  <div className="item-head">
                    <strong>{item.package?.name}</strong>
                    <span className="badge">{item.status}</span>
                  </div>
                  <div className="item-meta">Remaining {item.remainingSessions} | Ends {String(item.endsAt).slice(0, 10)}</div>
                  <div className="item-meta">Usage records {(item.usageLogs || []).length}</div>
                </div>
              ))}
              {!loading && !selectedCustomerHistory.packages?.length && <EmptyState title="No package history yet" message="Assigned packages and redemption usage will appear here once active." />}
            </div>
          </div>
        </div>
      )}

      {(customerMembershipMode || customerPackageMode) && (
        <div className="settings-section-grid" style={{ marginTop: 18 }}>
          {customerMembershipMode && (
            <div className="panel-card">
              <h3>Membership Lifecycle</h3>
              <form style={{ display: "grid", gap: 10 }}>
                <label>
              <span className="muted">Assigned membership</span>
              <select value={membershipLifecycleForm.customerMembershipId} onChange={(event) => setMembershipLifecycleForm((current) => ({ ...current, customerMembershipId: event.target.value }))}>
                  <option value="">Select assigned membership</option>
                  {(selectedCustomerHistory?.memberships || []).map((item) => (
                    <option key={item.id} value={item.id}>{item.membershipPlan?.name} - {item.status}</option>
                  ))}
                </select>
            </label>
                <label>
              <span className="muted">Wallet top-up amount</span>
              <input type="number" min="0" value={membershipLifecycleForm.topUpAmount} placeholder="Wallet top-up amount" onChange={(event) => setMembershipLifecycleForm((current) => ({ ...current, topUpAmount: event.target.value }))} />
            </label>
                <label>
              <span className="muted">Upgrade to plan</span>
              <select value={membershipLifecycleForm.upgradePlanId} onChange={(event) => setMembershipLifecycleForm((current) => ({ ...current, upgradePlanId: event.target.value }))}>
                  <option value="">Upgrade to plan</option>
                  {filteredMemberships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
            </label>
                <label>
              <span className="muted">Transfer to another customer</span>
              <select value={membershipLifecycleForm.transferCustomerId} onChange={(event) => setMembershipLifecycleForm((current) => ({ ...current, transferCustomerId: event.target.value }))}>
                  <option value="">Transfer to another customer</option>
                  {customers.filter((customer) => customer.id !== customerId).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
            </label>
                <textarea rows="3" value={membershipLifecycleForm.note} placeholder="Lifecycle note" onChange={(event) => setMembershipLifecycleForm((current) => ({ ...current, note: event.target.value }))} />
                <div className="inline-actions">
                  <button type="button" className="secondary-button" onClick={async () => {
                    await api.post(`/owner/customer-memberships/${membershipLifecycleForm.customerMembershipId}/renew`, { note: membershipLifecycleForm.note });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Membership renewed." });
                  }}>Renew</button>
                  <button type="button" className="secondary-button" onClick={async () => {
                    await api.post(`/owner/customer-memberships/${membershipLifecycleForm.customerMembershipId}/top-up`, {
                      amount: Number(membershipLifecycleForm.topUpAmount || 0),
                      note: membershipLifecycleForm.note
                    });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Membership top-up posted." });
                  }}>Top Up</button>
                  <button type="button" className="secondary-button" onClick={async () => {
                    await api.post(`/owner/customer-memberships/${membershipLifecycleForm.customerMembershipId}/upgrade`, {
                      membershipPlanId: membershipLifecycleForm.upgradePlanId,
                      note: membershipLifecycleForm.note
                    });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Membership upgraded." });
                  }}>Upgrade</button>
                  <button type="button" onClick={async () => {
                    await api.post(`/owner/customer-memberships/${membershipLifecycleForm.customerMembershipId}/transfer`, {
                      customerId: membershipLifecycleForm.transferCustomerId,
                      note: membershipLifecycleForm.note
                    });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Membership transferred." });
                  }}>Transfer</button>
                </div>
              </form>
            </div>
          )}

          {customerPackageMode && (
            <div className="panel-card">
              <h3>Package Lifecycle</h3>
              <form style={{ display: "grid", gap: 10 }}>
                <label>
              <span className="muted">Assigned package</span>
              <select value={packageLifecycleForm.customerPackageId} onChange={(event) => setPackageLifecycleForm((current) => ({ ...current, customerPackageId: event.target.value }))}>
                  <option value="">Select assigned package</option>
                  {(selectedCustomerHistory?.packages || []).map((item) => (
                    <option key={item.id} value={item.id}>{item.package?.name} - {item.status}</option>
                  ))}
                </select>
            </label>
                <label>
              <span className="muted">Extra sessions on renewal</span>
              <input type="number" min="0" value={packageLifecycleForm.additionalSessions} placeholder="Extra sessions on renewal" onChange={(event) => setPackageLifecycleForm((current) => ({ ...current, additionalSessions: event.target.value }))} />
            </label>
                <label>
              <span className="muted">Transfer to another customer</span>
              <select value={packageLifecycleForm.transferCustomerId} onChange={(event) => setPackageLifecycleForm((current) => ({ ...current, transferCustomerId: event.target.value }))}>
                  <option value="">Transfer to another customer</option>
                  {customers.filter((customer) => customer.id !== customerId).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
            </label>
                <textarea rows="3" value={packageLifecycleForm.note} placeholder="Lifecycle note" onChange={(event) => setPackageLifecycleForm((current) => ({ ...current, note: event.target.value }))} />
                <div className="inline-actions">
                  <button type="button" className="secondary-button" onClick={async () => {
                    await api.post(`/owner/customer-packages/${packageLifecycleForm.customerPackageId}/renew`, {
                      additionalSessions: Number(packageLifecycleForm.additionalSessions || 0),
                      note: packageLifecycleForm.note
                    });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Package renewed." });
                  }}>Renew</button>
                  <button type="button" onClick={async () => {
                    await api.post(`/owner/customer-packages/${packageLifecycleForm.customerPackageId}/transfer`, {
                      customerId: packageLifecycleForm.transferCustomerId,
                      note: packageLifecycleForm.note
                    });
                    await loadAll(customerId);
                    setStatus({ error: "", success: "Package transferred." });
                  }}>Transfer</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Status toasts are shown at top of page now */}
    </div>
    </div>
  );
}

