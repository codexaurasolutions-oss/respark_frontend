import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const emptyForm = {
  name: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  trialDays: 14,
  branchLimit: 1,
  userLimit: 5,
  customerLimit: 500,
  invoiceLimit: 1000,
  storageLimit: 5,
  isCustom: false,
  featureFlagsText: JSON.stringify({ pos: true, reports: true, crm: true }, null, 2)
};

const formatApiError = (error, fallback) => {
  const issues = error?.response?.data?.issues;
  if (Array.isArray(issues) && issues.length) {
    return issues.map((issue) => `${issue.field || "field"}: ${issue.message}`).join(" | ");
  }
  if (error instanceof SyntaxError) {
    return "Feature flags JSON is invalid. Fix the JSON format and try again.";
  }
  return error?.response?.data?.message || fallback;
};

export default function PlansPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows((await api.get("/super-admin/plans")).data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    api.get("/super-admin/plans").then((response) => {
      if (active) {
        setRows(response.data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => ({
    total: rows.length,
    custom: rows.filter((row) => row.isCustom).length,
    standard: rows.filter((row) => !row.isCustom).length
  }), [rows]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const parsedFlags = JSON.parse(form.featureFlagsText);
      const payload = {
        name: form.name,
        monthlyPrice: Number(form.monthlyPrice),
        yearlyPrice: Number(form.yearlyPrice),
        trialDays: Number(form.trialDays),
        branchLimit: Number(form.branchLimit),
        userLimit: Number(form.userLimit),
        customerLimit: Number(form.customerLimit),
        invoiceLimit: Number(form.invoiceLimit),
        storageLimit: Number(form.storageLimit),
        isCustom: Boolean(form.isCustom),
        featureFlags: parsedFlags
      };
      if (editingId) {
        await api.patch(`/super-admin/plans/${editingId}`, payload);
        setStatus({ error: "", success: "Plan updated." });
      } else {
        await api.post("/super-admin/plans", payload);
        setStatus({ error: "", success: "Plan created." });
      }
      resetForm();
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save plan"), success: "" });
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      monthlyPrice: Number(row.monthlyPrice || 0),
      yearlyPrice: Number(row.yearlyPrice || 0),
      trialDays: Number(row.trialDays || 14),
      branchLimit: Number(row.branchLimit || 1),
      userLimit: Number(row.userLimit || 5),
      customerLimit: Number(row.customerLimit || 500),
      invoiceLimit: Number(row.invoiceLimit || 1000),
      storageLimit: Number(row.storageLimit || 0),
      isCustom: Boolean(row.isCustom),
      featureFlagsText: JSON.stringify(row.featureFlags || {}, null, 2)
    });
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Plans</h1>
            <p style={{ marginBottom: 0 }}>Manage pricing tiers, limits, and feature access for every salon subscription.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Total {summary.total}</span>
            <span className="badge">Standard {summary.standard}</span>
            <span className="badge">Custom {summary.custom}</span>
          </div>
        </div>
      </div>
      <div className="two-col">
        <div className="panel-card">
          <h3>{editingId ? "Update Plan" : "Create Plan"}</h3>
          <form onSubmit={submit} className="form-grid">
            <input placeholder="Plan name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input type="number" min="0" placeholder="Monthly price" value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })} />
            <input type="number" min="0" placeholder="Yearly price" value={form.yearlyPrice} onChange={(event) => setForm({ ...form, yearlyPrice: event.target.value })} />
            <input type="number" min="0" placeholder="Trial days" value={form.trialDays} onChange={(event) => setForm({ ...form, trialDays: event.target.value })} />
            <input type="number" min="0" placeholder="Branch limit" value={form.branchLimit} onChange={(event) => setForm({ ...form, branchLimit: event.target.value })} />
            <input type="number" min="0" placeholder="User limit" value={form.userLimit} onChange={(event) => setForm({ ...form, userLimit: event.target.value })} />
            <input type="number" min="0" placeholder="Customer limit" value={form.customerLimit} onChange={(event) => setForm({ ...form, customerLimit: event.target.value })} />
            <input type="number" min="0" placeholder="Invoice limit" value={form.invoiceLimit} onChange={(event) => setForm({ ...form, invoiceLimit: event.target.value })} />
            <input type="number" min="0" placeholder="Storage limit (GB placeholder)" value={form.storageLimit} onChange={(event) => setForm({ ...form, storageLimit: event.target.value })} />
            <label className="checkbox-row" style={{ gridColumn: "1 / -1" }}>
              <input type="checkbox" checked={Boolean(form.isCustom)} onChange={(event) => setForm({ ...form, isCustom: event.target.checked })} />
              Mark this as a custom plan
            </label>
            <textarea rows="8" style={{ gridColumn: "1 / -1" }} value={form.featureFlagsText} onChange={(event) => setForm({ ...form, featureFlagsText: event.target.value })} />
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button>{editingId ? "Save Plan" : "Create Plan"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
        <div className="panel-card">
          <div className="section-heading">
            <h3>Plan Library</h3>
            <span className="badge">{summary.total} plans</span>
          </div>
          {loading ? (
            <PageLoader
              compact
              title="Loading plan catalog"
              message="Collecting pricing tiers, limits, and feature bundles."
            />
          ) : rows.length ? (
            rows.map((row) => (
              <div key={row.id} className="list-item">
                <div className="item-head">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="item-meta">Monthly {String(row.monthlyPrice)} | Yearly {String(row.yearlyPrice)} | Trial {row.trialDays} days</div>
                  </div>
                  {row.isCustom && <span className="badge">Custom</span>}
                </div>
                <div className="item-meta">Branches {row.branchLimit} | Users {row.userLimit} | Customers {row.customerLimit} | Invoices {row.invoiceLimit} | Storage {row.storageLimit || 0} GB</div>
                <button type="button" className="secondary-button" style={{ marginTop: 8 }} onClick={() => startEdit(row)}>Edit Plan</button>
              </div>
            ))
          ) : (
            <EmptyState
              title="No pricing plans yet"
              message="Create a first plan to start onboarding salons with clear feature bundles and limits."
            />
          )}
        </div>
      </div>
    </div>
  );
}
