import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyMembership = {
  name: "",
  description: "",
  benefits: [{ label: "", value: "" }],
  price: 0,
  validityDays: 30,
  benefitType: "DISCOUNT_PERCENT",
  discountValue: 10,
  walletValue: 0,
  serviceIds: []
};
const emptyPackage = { name: "", price: 0, totalSessions: 5, validityDays: 60, services: [] };
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
  const customerId = location.pathname.includes("/customers/") ? routeId : "";
  const editableMembershipId = location.pathname.includes("/admin/memberships/") && location.pathname.includes("/edit") ? routeId : "";
  const editablePackageId = location.pathname.includes("/admin/packages/") && location.pathname.includes("/edit") ? routeId : "";
  const [memberships, setMemberships] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
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

  const applyWorkspaceData = useCallback(async ({
    membershipResponse,
    packageResponse,
    serviceResponse,
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
    const nextCustomers = customerResponse.status === "fulfilled" ? normalizeRows(customerResponse.value.data) : [];

    setMemberships(nextMemberships);
    setPackages(nextPackages);
    setServices(nextServices);
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
          name: membershipDetail.data.name || "",
          description: membershipDetail.data.description || "",
          benefits: normalizeBenefits(membershipDetail.data.benefits),
          price: membershipDetail.data.price || 0,
          validityDays: membershipDetail.data.validityDays || 30,
          benefitType: membershipDetail.data.benefitType || "DISCOUNT_PERCENT",
          discountValue: membershipDetail.data.discountValue || 0,
          walletValue: membershipDetail.data.walletValue || 0,
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
          }))
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
      const [membershipResponse, packageResponse, serviceResponse, customerResponse] = await Promise.allSettled([
        api.get("/owner/memberships"),
        api.get("/owner/packages"),
        api.get("/owner/services"),
        api.get("/owner/customers")
      ]);
      await applyWorkspaceData({ membershipResponse, packageResponse, serviceResponse, customerResponse, activeCustomerId });
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
        const [membershipResponse, packageResponse, serviceResponse, customerResponse] = await Promise.allSettled([
          api.get("/owner/memberships"),
          api.get("/owner/packages"),
          api.get("/owner/services"),
          api.get("/owner/customers")
        ]);
        await applyWorkspaceData({
          membershipResponse,
          packageResponse,
          serviceResponse,
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
  }, [applyWorkspaceData, customerId, editableMembershipId, editablePackageId]);

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

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Memberships & Packages"
        description="Control recurring loyalty products, prepaid sessions, and service access in one revenue workspace."
        items={[
          { label: "Membership Plans", to: "/admin/memberships", hint: "Recurring" },
          { label: "Create Membership", to: "/admin/memberships/create", hint: "New" },
          { label: "Packages", to: "/admin/packages", hint: "Prepaid" },
          { label: "Create Package", to: "/admin/packages/create", hint: "New" },
          ...(customerId ? [
            { label: "Customer Memberships", to: `/admin/customers/${customerId}/memberships`, hint: "Assigned" },
            { label: "Customer Packages", to: `/admin/customers/${customerId}/packages`, hint: "Balance" }
          ] : [])
        ]}
        actions={customerId ? <Link to={`/admin/customers/${customerId}/history`} className="module-tab">Back to CRM</Link> : null}
      />
      <div className="settings-section-grid">
        {(activeSection === "memberships") && !customerMembershipMode && <div className="panel-card">
          <h3>{membershipEditMode ? "Edit Membership Plan" : "Membership Plan"}</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setStatus({ error: "", success: "" });
            try {
              if (!membershipForm.name.trim()) throw new Error("Membership name is required.");
              const payload = {
                ...membershipForm,
                name: membershipForm.name.trim(),
                description: membershipForm.description.trim(),
                benefits: cleanBenefits(membershipForm.benefits),
                price: Number(membershipForm.price),
                validityDays: Number(membershipForm.validityDays),
                discountValue: Number(membershipForm.discountValue || 0),
                walletValue: Number(membershipForm.walletValue || 0)
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
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Membership name</span>
              <input value={membershipForm.name} placeholder="Membership name" onChange={(event) => setMembershipForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Plan summary</span>
              <textarea
                rows="3"
                value={membershipForm.description}
                placeholder="Explain this membership for staff and customers"
                onChange={(event) => setMembershipForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label>
              <span className="muted">Price</span>
              <input type="number" min="0" value={membershipForm.price} placeholder="Price" onChange={(event) => setMembershipForm((current) => ({ ...current, price: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Validity days</span>
              <input type="number" min="1" value={membershipForm.validityDays} placeholder="Validity days" onChange={(event) => setMembershipForm((current) => ({ ...current, validityDays: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Discount %</span>
              <select value={membershipForm.benefitType} onChange={(event) => setMembershipForm((current) => ({ ...current, benefitType: event.target.value }))}>
              <option value="DISCOUNT_PERCENT">Discount %</option>
              <option value="DISCOUNT_AMOUNT">Discount Amount</option>
              <option value="WALLET_VALUE">Wallet Value</option>
            </select>
            </label>
            <label>
              <span className="muted">Discount value</span>
              <input type="number" min="0" value={membershipForm.discountValue} placeholder="Discount value" onChange={(event) => setMembershipForm((current) => ({ ...current, discountValue: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Wallet value</span>
              <input type="number" min="0" value={membershipForm.walletValue} placeholder="Wallet value" onChange={(event) => setMembershipForm((current) => ({ ...current, walletValue: event.target.value }))} />
            </label>
            <div className="panel-card" style={{ padding: 16, margin: 0, background: "#f8fbff" }}>
              <div className="item-head">
                <div>
                  <strong>What this membership includes</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Admin yahan khud add karega ke membership mein kya kya mil raha hai.</p>
                </div>
                <button type="button" className="secondary-button" onClick={addMembershipBenefit}>Add Benefit</button>
              </div>
              <div className="list-stack" style={{ marginTop: 12 }}>
                {normalizeBenefits(membershipForm.benefits).map((benefit, index) => (
                  <div key={`${index}-${benefit.label}`} className="form-grid" style={{ alignItems: "end" }}>
                    <label>
                      <span className="muted">Benefit title</span>
                      <input value={benefit.label} placeholder="e.g. Haircut discount" onChange={(event) => updateMembershipBenefit(index, { label: event.target.value })} />
                    </label>
                    <label>
                      <span className="muted">Details</span>
                      <input value={benefit.value} placeholder="e.g. 20% off every visit" onChange={(event) => updateMembershipBenefit(index, { value: event.target.value })} />
                    </label>
                    <button type="button" className="secondary-button" onClick={() => removeMembershipBenefit(index)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="badge-row">
              {services.map((service) => (
                <button type="button" key={service.id} className={membershipForm.serviceIds.includes(service.id) ? "" : "secondary-button"} onClick={() => toggleMembershipService(service.id)}>
                  {service.name}
                </button>
              ))}
            </div>
            <button>{membershipEditMode ? "Save Membership" : "Create Membership"}</button>
          </form>
        </div>}

        {(activeSection === "packages") && !customerPackageMode && <div className="panel-card">
          <h3>{packageEditMode ? "Edit Package" : "Package"}</h3>
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
                services: packageForm.services.map((item) => ({
                  serviceId: item.serviceId,
                  sessions: Number(item.sessions || 1)
                }))
              };
              if (packageEditMode) {
                await api.patch(`/owner/packages/${editablePackageId}`, payload);
              } else {
                await api.post("/owner/packages", payload);
              }
              setPackageForm(emptyPackage);
              await loadAll();
              setStatus({ error: "", success: packageEditMode ? "Package updated." : "Package created." });
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not save package"), success: "" });
            }
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Package name</span>
              <input value={packageForm.name} placeholder="Package name" onChange={(event) => setPackageForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Price</span>
              <input type="number" min="0" value={packageForm.price} placeholder="Price" onChange={(event) => setPackageForm((current) => ({ ...current, price: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Total sessions</span>
              <input type="number" min="1" value={packageForm.totalSessions} placeholder="Total sessions" onChange={(event) => setPackageForm((current) => ({ ...current, totalSessions: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Validity days</span>
              <input type="number" min="1" value={packageForm.validityDays} placeholder="Validity days" onChange={(event) => setPackageForm((current) => ({ ...current, validityDays: event.target.value }))} />
            </label>
            <div className="badge-row">
              {services.map((service) => (
                <button type="button" key={service.id} className={packageForm.services.some((item) => item.serviceId === service.id) ? "" : "secondary-button"} onClick={() => togglePackageService(service.id)}>
                  {service.name}
                </button>
              ))}
            </div>
            <button>{packageEditMode ? "Save Package" : "Create Package"}</button>
          </form>
        </div>}
      </div>

      <div className="settings-section-grid" style={{ marginTop: 18 }}>
      {(activeSection === "memberships") && <div className="panel-card">
          <h3>{customerMembershipMode ? "Assigned Memberships" : "Membership Plans"}</h3>
          {loading ? <PageLoader compact title="Loading memberships" message="Preparing plans, assignments, and customer usage balances." /> : null}
          <div className="list-stack">
            {(customerMembershipMode ? (selectedCustomerHistory?.memberships || []) : memberships).map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{customerMembershipMode ? item.membershipPlan?.name : item.name}</strong>
                  <span className="badge">{customerMembershipMode ? item.status : Number(item.price || 0).toFixed(2)}</span>
                </div>
                <div className="item-meta">
                  {customerMembershipMode
                    ? `Ends ${String(item.endsAt).slice(0, 10)} | Wallet ${Number(item.remainingWalletValue || 0).toFixed(2)}`
                    : `${item.benefitType} | ${item.validityDays} days`}
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
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <Link to={`/admin/memberships/${item.id}/edit`} className="cta-secondary">Edit</Link>
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
            {!customerMembershipMode && !loading && !memberships.length && <EmptyState title="No membership plans yet" message="Create your first membership plan to launch recurring loyalty offers." />}
          </div>
        </div>}

        {(activeSection === "packages") && <div className="panel-card">
          <h3>{customerPackageMode ? "Assigned Packages" : "Packages"}</h3>
          <div className="list-stack">
            {(customerPackageMode ? (selectedCustomerHistory?.packages || []) : packages).map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{customerPackageMode ? item.package?.name : item.name}</strong>
                  <span className="badge">{customerPackageMode ? item.status : Number(item.price || 0).toFixed(2)}</span>
                </div>
                <div className="item-meta">
                  {customerPackageMode
                    ? `Remaining ${item.remainingSessions} | Ends ${String(item.endsAt).slice(0, 10)}`
                    : `${item.totalSessions} sessions | ${item.validityDays} days`}
                </div>
                {!customerPackageMode && (
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <Link to={`/admin/packages/${item.id}/edit`} className="cta-secondary">Edit</Link>
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
            {!customerPackageMode && !loading && !packages.length && <EmptyState title="No packages yet" message="Create your first package to launch prepaid session bundles." />}
          </div>
        </div>}
      </div>

      <div className="settings-section-grid" style={{ marginTop: 18 }}>
        {(activeSection === "memberships") && <div className="panel-card">
          <h3>Assign Membership</h3>
          <div className="item-meta" style={{ marginBottom: 10 }}>{customerScopeLabel}</div>
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
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not assign membership"), success: "" });
            }
          }} style={{ display: "grid", gap: 10 }}>
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
              {memberships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            </label>
            <input type="date" value={assignMembershipForm.startsAt} onChange={(event) => setAssignMembershipForm((current) => ({ ...current, startsAt: event.target.value }))} />
            <button>Assign Membership</button>
          </form>
        </div>}

        {(activeSection === "packages") && <div className="panel-card">
          <h3>Assign Package</h3>
          <div className="item-meta" style={{ marginBottom: 10 }}>{customerScopeLabel}</div>
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
            } catch (error) {
              setStatus({ error: formatApiError(error, "Could not assign package"), success: "" });
            }
          }} style={{ display: "grid", gap: 10 }}>
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
              {packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            </label>
            <input type="date" value={assignPackageForm.startsAt} onChange={(event) => setAssignPackageForm((current) => ({ ...current, startsAt: event.target.value }))} />
            <button>Assign Package</button>
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
            <div className="list-stack">
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

      {(status.error || status.success) && (
        <div className="panel-card" style={{ marginTop: 18 }}>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
      )}

      <div className="three-col" style={{ marginTop: 18 }}>
        <div className="panel-card">
          <h3>Membership Variants</h3>
          <p className="muted">Current live engine supports discount, fixed-value, wallet-value, and service-specific memberships. Group/family and hourly memberships remain clearly isolated placeholders so plan architecture is ready without unstable billing rules in this phase.</p>
          <div className="badge-row">
            <span className="badge">Group / Family Placeholder</span>
            <span className="badge">Hourly Placeholder</span>
          </div>
        </div>
        <div className="panel-card">
          <h3>Package Bundles</h3>
          <p className="muted">Service-session packages are live. Mixed product + service bundle packaging is intentionally held as a placeholder to keep current redemption logic transaction-safe and predictable.</p>
          <div className="badge-row">
            <span className="badge">Service Packages Live</span>
            <span className="badge">Bundle Placeholder</span>
          </div>
        </div>
        <div className="panel-card">
          <h3>Incentive Readiness</h3>
          <p className="muted">Staff commission and invoice item attribution are already live. Membership/package incentive rules can now be layered through the same scoped invoice attribution model in the next phase without changing customer history structure.</p>
          <div className="badge-row">
            <span className="badge">Commission Ready</span>
            <span className="badge">Loyalty Attribution Ready</span>
          </div>
        </div>
      </div>

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
                  {memberships.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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

      {(status.error || status.success) && (
        <div className="panel-card" style={{ marginTop: 18 }}>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
      )}
    </div>
  );
}

