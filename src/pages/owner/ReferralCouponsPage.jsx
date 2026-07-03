import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const defaultForm = {
  code: "",
  title: "",
  description: "",
  discountType: "PERCENT",
  discountValue: 10,
  minBillAmount: "",
  usageLimit: "",
  customerUsageLimit: "",
  startsAt: "",
  endsAt: "",
  partnerCreditType: "FIXED",
  partnerCreditValue: 10,
  partnerCustomerId: "",
  categoryIds: [],
  serviceIds: [],
  notes: "",
};

export default function ReferralCouponsPage() {
  const { selectedBranchId } = useBranch();
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [couponRes, catRes, svcRes, custRes] = await Promise.all([
        api.get("/owner/referrals/coupons", {
          params: { branchId: selectedBranchId || undefined, includeArchived: showArchived ? "true" : undefined },
        }),
        api.get("/owner/service-categories", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/services", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/customers", { params: { branchId: selectedBranchId || undefined } }),
      ]);
      setCoupons(couponRes.data || []);
      setCategories(catRes.data || []);
      setServices(svcRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load referral coupons"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, showArchived]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!status.error && !status.success) return;
    const t = setTimeout(() => setStatus({ error: "", success: "" }), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const handleEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || "",
      title: c.title || "",
      description: c.description || "",
      discountType: c.discountType || "PERCENT",
      discountValue: c.discountValue != null ? Number(c.discountValue) : 0,
      minBillAmount: c.minBillAmount != null ? Number(c.minBillAmount) : "",
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      customerUsageLimit: c.customerUsageLimit != null ? String(c.customerUsageLimit) : "",
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().split("T")[0] : "",
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().split("T")[0] : "",
      partnerCreditType: c.partnerCreditType || "FIXED",
      partnerCreditValue: c.partnerCreditValue != null ? Number(c.partnerCreditValue) : 0,
      partnerCustomerId: c.partnerCustomerId || "",
      categoryIds: (c.eligibleCategories || []).map((e) => e.categoryId),
      serviceIds: (c.eligibleServices || []).map((e) => e.serviceId),
      notes: c.notes || "",
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const handleOnboardPartner = async () => {
    const name = prompt("Affiliate partner name:");
    if (!name) return;
    const phone = prompt("Affiliate partner phone:");
    if (!phone) return;
    try {
      const response = await api.post("/owner/referrals/partners/onboard", {
        branchId: selectedBranchId || null,
        name,
        phone,
        discountType: "PERCENT",
        discountValue: 10,
        partnerCreditType: "PERCENT",
        partnerCreditValue: 5,
        title: `${name} Affiliate Code`,
        notes: "Auto-onboarded from referral coupon page"
      });
      setStatus({ error: "", success: `Partner onboarded. Code ${response.data?.coupon?.code || ""} created.` });
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not onboard partner"), success: "" });
    }
  };

  const toggleCategory = (catId) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter((id) => id !== catId)
        : [...prev.categoryIds, catId],
    }));
  };

  const toggleService = (svcId) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(svcId)
        ? prev.serviceIds.filter((id) => id !== svcId)
        : [...prev.serviceIds, svcId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code || undefined,
        title: form.title,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        minBillAmount: form.minBillAmount !== "" ? Number(form.minBillAmount) : null,
        usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : null,
        customerUsageLimit: form.customerUsageLimit !== "" ? Number(form.customerUsageLimit) : null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        partnerCreditType: form.partnerCreditType,
        partnerCreditValue: Number(form.partnerCreditValue) || 0,
        partnerCustomerId: form.partnerCustomerId || null,
        categoryIds: form.categoryIds,
        serviceIds: form.serviceIds,
        notes: form.notes || null,
        branchId: selectedBranchId || null,
      };

      if (editing) {
        await api.patch(`/owner/referrals/coupons/${editing.id}`, payload);
        setStatus({ error: "", success: "Referral coupon updated." });
      } else {
        await api.post("/owner/referrals/coupons", payload);
        setStatus({ error: "", success: "Referral coupon created." });
      }
      setShowForm(false);
      setEditing(null);
      setForm(defaultForm);
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not save referral coupon"), success: "" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this referral coupon?")) return;
    try {
      await api.delete(`/owner/referrals/coupons/${id}`);
      setStatus({ error: "", success: "Referral coupon deleted." });
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not delete referral coupon"), success: "" });
    }
  };

  const handleArchiveToggle = async (c) => {
    try {
      await api.patch(`/owner/referrals/coupons/${c.id}`, { isArchived: !c.isArchived });
      setStatus({ error: "", success: c.isArchived ? "Coupon restored." : "Coupon archived." });
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not update coupon"), success: "" });
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.code || "").toLowerCase().includes(s) || (c.title || "").toLowerCase().includes(s);
  });

  const partnerLabel = (c) => {
    const cust = customers.find((cu) => cu.id === c.partnerCustomerId);
    return cust ? cust.name : "N/A";
  };

  const tabs = [
    { label: "Referral Coupons", to: "/admin/referral-coupons" },
    { label: "Affiliate Wallets", to: "/admin/affiliate-wallets" },
  ];

  return (
    <div className="page-shell">
      <ModuleTabs title="Referral & Affiliate" description="Manage referral coupons and partner wallets" items={tabs} />

      {status.error && (
        <div className="panel-card">
          <p className="error-text">{status.error}</p>
        </div>
      )}
      {status.success && (
        <div className="panel-card">
          <p className="success-text">{status.success}</p>
        </div>
      )}

      {loading && <PageLoader title="Loading referral coupons..." message="Please wait" />}

      {!loading && !showForm && (
        <div className="panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0 }}>
              Referral Coupons
              <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 8, color: "#94a3b8" }}>
                {filteredCoupons.length} coupon{filteredCoupons.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search coupons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, width: 200 }}
              />
              <label style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  style={{ accentColor: "#6366f1" }}
                />
                Archived
              </label>
              <button className="btn btn-primary" onClick={handleCreate} style={{ fontSize: 13 }}>
                + New Referral Coupon
              </button>
              <button className="btn btn-ghost" onClick={handleOnboardPartner} style={{ fontSize: 13, border: "1px solid #6366f1", color: "#6366f1" }}>
                Auto Onboard Partner
              </button>
            </div>
          </div>

          {filteredCoupons.length === 0 ? (
            <EmptyState title="No referral coupons" description="Create your first referral coupon to start rewarding partners." />
          ) : (
            <div className="list-stack">
              {filteredCoupons.map((c) => (
                <div key={c.id} className="list-item" style={{ opacity: c.isArchived ? 0.5 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ color: "#e2e8f0" }}>{c.code}</strong>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>|</span>
                      <span style={{ fontSize: 13, color: "#cbd5e1" }}>{c.title}</span>
                      {c.isArchived && (
                        <span style={{ fontSize: 11, background: "#475569", color: "#94a3b8", padding: "2px 6px", borderRadius: 4 }}>
                          Archived
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Discount: {c.discountType === "PERCENT" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                      {c.minBillAmount ? ` | Min bill: ₹${c.minBillAmount}` : ""}
                      {c.partnerCreditType && (
                        <span>
                          {" | Partner: "}
                          {c.partnerCreditType === "PERCENT" ? `${c.partnerCreditValue}%` : `₹${c.partnerCreditValue}`}
                          {" credit"}
                        </span>
                      )}
                      {c.partnerCustomerId && (
                        <span> | Partner: {partnerLabel(c)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {c.eligibleCategories?.length > 0 && (
                        <span>Categories: {c.eligibleCategories.map((e) => e.category?.name).filter(Boolean).join(", ")}</span>
                      )}
                      {c.eligibleServices?.length > 0 && (
                        <span>{c.eligibleCategories?.length > 0 ? " | " : ""}Services: {c.eligibleServices.map((e) => e.service?.name).filter(Boolean).join(", ")}</span>
                      )}
                      {!c.eligibleCategories?.length && !c.eligibleServices?.length && (
                        <span>Applies to: All items</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Used: {c._count?.redemptions || 0}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost" onClick={() => handleEdit(c)} style={{ fontSize: 12 }}>
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleArchiveToggle(c)}
                      style={{ fontSize: 12, color: c.isArchived ? "#22c55e" : "#eab308" }}
                    >
                      {c.isArchived ? "Restore" : "Archive"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleDelete(c.id)} style={{ fontSize: 12, color: "#ef4444" }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && showForm && (
        <div className="panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "#e2e8f0" }}>{editing ? "Edit Referral Coupon" : "New Referral Coupon"}</h3>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }} style={{ fontSize: 13 }}>
              Back to list
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Coupon Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Leave blank for auto code e.g. A10"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Referral Discount"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Discount Type *</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Discount Value *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Minimum Bill Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.minBillAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, minBillAmount: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Total Usage Limit</label>
                <input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(e) => setForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Per Customer Limit</label>
                <input
                  type="number"
                  min="0"
                  value={form.customerUsageLimit}
                  onChange={(e) => setForm(prev => ({ ...prev, customerUsageLimit: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Start Date</label>
                <input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm(prev => ({ ...prev, startsAt: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>End Date</label>
                <input
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm(prev => ({ ...prev, endsAt: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #334155", paddingTop: 12, marginTop: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#e2e8f0", fontSize: 14 }}>Partner Credits</h4>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Credit Type</label>
                <select
                  value={form.partnerCreditType}
                  onChange={(e) => setForm(prev => ({ ...prev, partnerCreditType: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="FIXED">Fixed (₹)</option>
                  <option value="PERCENT">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Credit Value</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.partnerCreditValue}
                  onChange={(e) => setForm(prev => ({ ...prev, partnerCreditValue: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Partner (Customer)</label>
                <select
                  value={form.partnerCustomerId}
                  onChange={(e) => setForm(prev => ({ ...prev, partnerCustomerId: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="">Select partner (optional)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #334155", paddingTop: 12, marginTop: 4 }}>
                <h4 style={{ margin: "0 0 8px 0", color: "#e2e8f0", fontSize: 14 }}>Eligibility (leave empty for all items)</h4>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, display: "block" }}>Service Categories</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
                        border: form.categoryIds.includes(cat.id) ? "1px solid #6366f1" : "1px solid #334155",
                        background: form.categoryIds.includes(cat.id) ? "#6366f120" : "#1e293b",
                        color: "#e2e8f0", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.categoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        style={{ accentColor: "#6366f1" }}
                      />
                      {cat.name}
                    </label>
                  ))}
                  {categories.length === 0 && <span style={{ fontSize: 12, color: "#64748b" }}>No categories found</span>}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, display: "block" }}>Services</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                  {services.map((svc) => (
                    <label
                      key={svc.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6,
                        border: form.serviceIds.includes(svc.id) ? "1px solid #6366f1" : "1px solid #334155",
                        background: form.serviceIds.includes(svc.id) ? "#6366f120" : "#1e293b",
                        color: "#e2e8f0", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                        style={{ accentColor: "#6366f1" }}
                      />
                      {svc.name}
                    </label>
                  ))}
                  {services.length === 0 && <span style={{ fontSize: 12, color: "#64748b" }}>No services found</span>}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal notes"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>
                {editing ? "Update Coupon" : "Create Coupon"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowForm(false); setEditing(null); }}
                style={{ fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
