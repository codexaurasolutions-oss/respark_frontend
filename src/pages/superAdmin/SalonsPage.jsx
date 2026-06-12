import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const businessTypes = ["Salon", "Spa", "Beauty Clinic", "Nail Studio", "Tattoo Studio", "Pet Grooming", "Wellness Center"];
const featureFlagKeys = [
  "pos",
  "appointments",
  "inventory",
  "crm",
  "campaigns",
  "ecommerce",
  "digitalCatalog",
  "catalogAnalytics",
  "feedback",
  "reports",
  "memberships",
  "packages",
  "loyalty",
  "couponsGiftCards",
  "whatsapp",
  "enquiries",
  "expenses",
  "payroll",
  "customerPortal",
  "publicCatalog",
  "onlineOrders",
  "messageTemplates"
];
const defaultFlags = {
  pos: true,
  appointments: false,
  inventory: false,
  crm: true,
  campaigns: false,
  ecommerce: false,
  digitalCatalog: false,
  catalogAnalytics: false,
  feedback: false,
  reports: true,
  memberships: false,
  packages: false,
  loyalty: false,
  couponsGiftCards: false,
  whatsapp: false,
  enquiries: false,
  expenses: false,
  payroll: false,
  customerPortal: false,
  publicCatalog: true,
  onlineOrders: false,
  messageTemplates: false
};
const emptyForm = {
  name: "",
  slug: "",
  businessType: "Salon",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  timezone: "",
  currency: "PKR",
  taxRate: 0,
  trialStartsAt: "",
  trialEndsAt: "",
  internalNote: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: ""
};

const formatApiError = (error, fallback) => {
  const issues = error?.response?.data?.issues;
  if (Array.isArray(issues) && issues.length) {
    return issues.map((issue) => `${issue.field || "field"}: ${issue.message}`).join(" | ");
  }
  return error?.response?.data?.message || fallback;
};

export default function SalonsPage() {
  const [salons, setSalons] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [featureFlags, setFeatureFlags] = useState(defaultFlags);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const activeFeatureCount = useMemo(() => Object.values(featureFlags).filter(Boolean).length, [featureFlags]);

  const load = async (nextQuery = query, nextStatus = statusFilter) => {
    setLoading(true);
    try {
      setSalons((await api.get("/super-admin/salons", {
        params: {
          ...(nextQuery ? { q: nextQuery } : {}),
          ...(nextStatus ? { status: nextStatus } : {})
        }
      })).data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/super-admin/salons", {
      params: {
        ...(query ? { q: query } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      }
    }).then((response) => {
      if (active) {
        setSalons(response.data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [query, statusFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setFeatureFlags(defaultFlags);
    setEditingId("");
  };

  const createOrUpdateSalon = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const payload = {
        ...form,
        taxRate: Number(form.taxRate || 0),
        featureFlags
      };
      if (editingId) {
        await api.patch(`/super-admin/salons/${editingId}`, payload);
        setStatus({ error: "", success: "Salon updated." });
      } else {
        await api.post("/super-admin/salons", payload);
        setStatus({ error: "", success: "Salon created." });
      }
      resetForm();
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save salon"), success: "" });
    }
  };

  const openDetail = async (salonId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/super-admin/salons/${salonId}`);
      setSelectedSalon(response.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const startEdit = (salon) => {
    setEditingId(salon.id);
    setForm({
      name: salon.name || "",
      slug: salon.slug || "",
      businessType: salon.businessType || "Salon",
      email: salon.email || "",
      phone: salon.phone || "",
      address: salon.address || "",
      city: salon.city || "",
      country: salon.country || "",
      timezone: salon.timezone || "",
      currency: salon.currency || "PKR",
      taxRate: Number(salon.taxRate || 0),
      trialStartsAt: salon.trialStartsAt ? new Date(salon.trialStartsAt).toISOString().slice(0, 10) : "",
      trialEndsAt: salon.trialEndsAt ? new Date(salon.trialEndsAt).toISOString().slice(0, 10) : "",
      internalNote: salon.internalNote || "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: ""
    });
    setFeatureFlags({ ...defaultFlags, ...(salon.featureFlags || {}) });
  };

  const updateStatus = async (salonId, nextStatus) => {
    await api.patch(`/super-admin/salons/${salonId}/status`, { status: nextStatus });
    await load();
    await openDetail(salonId);
  };

  const toggleFeature = async (salonId, key, currentFlags) => {
    const nextFlags = { ...defaultFlags, ...(currentFlags || {}), [key]: currentFlags?.[key] === false ? true : false };
    await api.patch(`/super-admin/salons/${salonId}/features`, { featureFlags: nextFlags });
    await load();
    await openDetail(salonId);
  };

  const impersonate = async (salonId) => {
    const response = await api.post(`/super-admin/salons/${salonId}/impersonate`);
    setStatus({ error: "", success: response.data.message });
  };

  const toggleDraftFeature = (key) => setFeatureFlags((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Salons</h1>
            <p style={{ marginBottom: 0 }}>Create, activate, suspend, and inspect every tenant from one control surface.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Total {salons.length}</span>
            <span className="badge">Features {activeFeatureCount}</span>
          </div>
        </div>
      </div>
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="form-grid">
          <input value={query} placeholder="Search salon, slug, email, phone, city, or country" onChange={(event) => setQuery(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <button type="button" className="secondary-button" onClick={() => load(query, statusFilter)}>Apply Filters</button>
          <button type="button" className="secondary-button" onClick={() => { setQuery(""); setStatusFilter(""); }}>Reset</button>
        </div>
      </div>
      <div className="settings-section-grid">
        <div className="panel-card">
          <h3>{editingId ? "Update Salon" : "Create Salon"}</h3>
          <form onSubmit={createOrUpdateSalon} className="form-grid">
            <input placeholder="Salon name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <select value={form.businessType} onChange={(event) => setForm({ ...form, businessType: event.target.value })}>
              {businessTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <input placeholder="Address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            <input placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            <input placeholder="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
            <input placeholder="Timezone" value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
            <input placeholder="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
            <input type="number" min="0" placeholder="Tax rate" value={form.taxRate} onChange={(event) => setForm({ ...form, taxRate: event.target.value })} />
            <label>
              <span className="muted">Trial start date</span>
              <input type="date" value={form.trialStartsAt} onChange={(event) => setForm({ ...form, trialStartsAt: event.target.value })} />
            </label>
            <label>
              <span className="muted">Trial end date</span>
              <input type="date" value={form.trialEndsAt} onChange={(event) => setForm({ ...form, trialEndsAt: event.target.value })} />
            </label>
            <textarea rows="4" style={{ gridColumn: "1 / -1" }} placeholder="Internal note" value={form.internalNote} onChange={(event) => setForm({ ...form, internalNote: event.target.value })} />
            {!editingId && <input placeholder="Owner name" value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} />}
            {!editingId && <input placeholder="Owner email" value={form.ownerEmail} onChange={(event) => setForm({ ...form, ownerEmail: event.target.value })} />}
            {!editingId && <input type="password" placeholder="Owner password" value={form.ownerPassword} onChange={(event) => setForm({ ...form, ownerPassword: event.target.value })} />}
            <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
              <strong>Feature Access</strong>
              <div className="item-meta">Enabled features: {activeFeatureCount} / {featureFlagKeys.length}</div>
              <div className="badge-row">
                {featureFlagKeys.map((key) => (
                  <label key={key} className="badge" style={{ gap: 8 }}>
                    <input type="checkbox" checked={Boolean(featureFlags[key])} onChange={() => toggleDraftFeature(key)} />
                    {key}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button>{editingId ? "Save Salon" : "Create Salon"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <div className="section-heading">
            <h3>Tenant Directory</h3>
            <span className="badge">{salons.length} salons</span>
          </div>
          <div className="list-stack">
            {loading ? (
              <PageLoader
                compact
                title="Loading salon directory"
                message="Pulling tenant status, locations, and plan assignments."
              />
            ) : salons.length ? (
              salons.map((salon) => (
                <div key={salon.id} className="list-item">
                  <div className="item-head">
                    <div>
                      <strong>{salon.name}</strong>
                      <div className="item-meta">{salon.businessType || "Salon"} | {salon.city || "-"}, {salon.country || "-"}</div>
                      <div className="item-meta">{salon.status}</div>
                    </div>
                    <span className="badge">{salon.subscriptions?.[0]?.plan?.name || "No plan"}</span>
                  </div>
                  <div className="inline-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="secondary-button" onClick={() => openDetail(salon.id)}>View Detail</button>
                    <button type="button" className="secondary-button" onClick={() => startEdit(salon)}>Edit</button>
                    <button type="button" onClick={() => updateStatus(salon.id, "ACTIVE")}>Activate</button>
                    <button type="button" className="danger-button" onClick={() => updateStatus(salon.id, "SUSPENDED")}>Suspend</button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No salons found"
                message="Try broadening your search or create the first tenant from the form on the left."
              />
            )}
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ marginTop: 18 }}>
        <h3>Salon Detail</h3>
        {!selectedSalon && !detailLoading && (
          <EmptyState
            title="Pick a salon to inspect"
            message="Owner users, subscriptions, feature access, and usage relationships will appear here."
          />
        )}
        {detailLoading && (
          <PageLoader
            compact
            title="Loading salon detail"
            message="Preparing owner, subscription, and feature access details."
          />
        )}
        {selectedSalon && (
          <>
            <div className="item-head">
              <div>
                <p><strong>{selectedSalon.name}</strong></p>
                <p>{selectedSalon.businessType || "Salon"} | {selectedSalon.status}</p>
                <p>{selectedSalon.email || "-"} | {selectedSalon.phone || "-"}</p>
                <p>{selectedSalon.address || "-"}</p>
                <p>{selectedSalon.city || "-"}, {selectedSalon.country || "-"} | {selectedSalon.timezone || "-"}</p>
                <p>Currency {selectedSalon.currency || "PKR"} | Tax {String(selectedSalon.taxRate || 0)}%</p>
                <p>Trial: {selectedSalon.trialStartsAt ? new Date(selectedSalon.trialStartsAt).toLocaleDateString() : "-"} to {selectedSalon.trialEndsAt ? new Date(selectedSalon.trialEndsAt).toLocaleDateString() : "-"}</p>
                <p>Internal note: {selectedSalon.internalNote || "-"}</p>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => impersonate(selectedSalon.id)}>Impersonate Placeholder</button>
              </div>
            </div>
            <div className="badge-row">
              <span className="badge">Branches {selectedSalon.branches.length}</span>
              <span className="badge">Services {selectedSalon.services.length}</span>
              <span className="badge">Customers {selectedSalon.customers.length}</span>
              <span className="badge">Users {selectedSalon.users.length}</span>
            </div>
            <h4>Users</h4>
            {selectedSalon.users.length ? selectedSalon.users.map((item) => (
              <div key={item.id} style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
                {item.user.name} - {item.salonRole} - Login {item.user.isActive ? "Active" : "Inactive"}
              </div>
            )) : <EmptyState title="No linked salon users" message="Owner and staff accounts will appear here once assigned." />}
            <h4>Subscriptions</h4>
            {selectedSalon.subscriptions.length ? selectedSalon.subscriptions.map((subscription) => (
              <div key={subscription.id} style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
                {subscription.plan?.name} - {subscription.status} - Payment {subscription.paymentStatus || "PENDING"}
                <div className="item-meta">Discount {String(subscription.manualDiscount || 0)} | Ends {new Date(subscription.endsAt).toLocaleDateString()}</div>
              </div>
            )) : <EmptyState title="No subscriptions yet" message="Active or trial subscription records will surface here for this salon." />}
            <h4>Feature Flags</h4>
            {featureFlagKeys.map((key) => {
              const value = selectedSalon.featureFlags?.[key];
              return (
                <div key={key} style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
                  <strong>{key}</strong> - {String(value)}
                  <div style={{ marginTop: 6 }}>
                    <button type="button" onClick={() => toggleFeature(selectedSalon.id, key, selectedSalon.featureFlags)}>
                      {value === false ? "Enable" : "Disable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
