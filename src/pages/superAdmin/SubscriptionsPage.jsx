import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const emptyForm = { salonId: "", planId: "", status: "ACTIVE", paymentStatus: "PAID", manualDiscount: 0, notes: "", startsAt: "", endsAt: "" };

export default function SubscriptionsPage() {
  const [rows, setRows] = useState([]);
  const [salons, setSalons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", paymentStatus: "" });
  const [form, setForm] = useState(emptyForm);
  const [selectedPlanChange, setSelectedPlanChange] = useState({});
  const [convertDrafts, setConvertDrafts] = useState({});
  const [status, setStatus] = useState({ error: "", success: "" });
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    const [subscriptionsResponse, salonsResponse, plansResponse] = await Promise.all([
      api.get("/super-admin/subscriptions", {
        params: {
          ...(nextFilters.q ? { q: nextFilters.q } : {}),
          ...(nextFilters.status ? { status: nextFilters.status } : {}),
          ...(nextFilters.paymentStatus ? { paymentStatus: nextFilters.paymentStatus } : {})
        }
      }),
      api.get("/super-admin/salons"),
      api.get("/super-admin/plans")
    ]);
    setRows(subscriptionsResponse.data);
    setSalons(salonsResponse.data);
    setPlans(plansResponse.data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/super-admin/subscriptions", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {})
        }
      }),
      api.get("/super-admin/salons"),
      api.get("/super-admin/plans")
    ]).then(([subscriptionsResponse, salonsResponse, plansResponse]) => {
      if (!active) return;
      setRows(subscriptionsResponse.data);
      setSalons(salonsResponse.data);
      setPlans(plansResponse.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [filters]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      await api.post("/super-admin/subscriptions", {
        ...form,
        manualDiscount: Number(form.manualDiscount || 0)
      });
      setForm(emptyForm);
      await load();
      setStatus({ error: "", success: "Subscription created." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create subscription"), success: "" });
    }
  };

  const updateSubscription = async (id, patch) => {
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/super-admin/subscriptions/${id}`, patch);
      await load();
      setStatus({ error: "", success: "Subscription updated." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update subscription"), success: "" });
    }
  };

  const patchConvertDraft = (id, next, fallbackPlanId) => {
    setConvertDrafts((current) => ({
      ...current,
      [id]: {
        planId: fallbackPlanId || "",
        endsAt: "",
        paymentStatus: "PAID",
        manualDiscount: 0,
        notes: "Converted from trial to paid.",
        ...(current[id] || {}),
        ...next
      }
    }));
  };

  const sendReminder = async (id) => {
    setBusyId(id);
    setStatus({ error: "", success: "" });
    try {
      const response = await api.post(`/super-admin/subscriptions/${id}/send-trial-reminder`);
      setStatus({
        error: response.data.emailError ? `Reminder generated but email delivery failed: ${response.data.emailError}` : "",
        success: `Trial reminder sent to ${response.data.ownerEmail}. Delivery mode: ${response.data.delivery.mode.toUpperCase()}`
      });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send trial reminder."), success: "" });
    } finally {
      setBusyId("");
    }
  };

  const convertDemo = async (row) => {
    const draft = convertDrafts[row.id] || {
      planId: row.planId,
      endsAt: "",
      paymentStatus: "PAID",
      manualDiscount: Number(row.manualDiscount || 0),
      notes: "Converted from trial to paid."
    };
    setBusyId(row.id);
    setStatus({ error: "", success: "" });
    try {
      const response = await api.post(`/super-admin/subscriptions/${row.id}/convert-demo`, {
        ...draft,
        manualDiscount: Number(draft.manualDiscount || 0)
      });
      setStatus({
        error: response.data.emailError ? `Conversion completed but email delivery failed: ${response.data.emailError}` : "",
        success: `Demo converted to paid for ${response.data.ownerEmail}.`
      });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not convert this demo subscription."), success: "" });
    } finally {
      setBusyId("");
    }
  };

  const getAlert = (row) => {
    const now = new Date();
    const endsAt = new Date(row.endsAt);
    const diffDays = Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24));
    if (row.status === "EXPIRED" || diffDays < 0) return "Expired";
    if (row.status === "TRIAL" && diffDays <= 3) return `Trial expires in ${diffDays} day(s)`;
    if (diffDays <= 7) return `Expires in ${diffDays} day(s)`;
    return "";
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Subscriptions</h1>
            <p style={{ marginBottom: 0 }}>Manage live, trial, expired, and suspended subscription lifecycle across every salon.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Total {rows.length}</span>
            <span className="badge">Salons {salons.length}</span>
            <span className="badge">Plans {plans.length}</span>
          </div>
        </div>
      </div>
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="form-grid">
          <label>
              <span className="muted">Search salon, plan, or notes</span>
              <input value={filters.q} placeholder="Search salon, plan, or notes" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
            </label>
          <label>
              <span className="muted">Payment states</span>
              <select value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))}>
            <option value="">All payment states</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
            </label>
          <button type="button" className="secondary-button" onClick={() => load(filters)}>Apply Filters</button>
          <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "", paymentStatus: "" })}>Reset</button>
        </div>
      </div>
      <div className="settings-section-grid">
        <div className="panel-card">
          <h3>Create Subscription</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Salon</span>
              <select value={form.salonId} onChange={(event) => setForm({ ...form, salonId: event.target.value })}>
              <option value="">Select salon</option>
              {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
            </select>
            </label>
            <label>
              <span className="muted">Plan</span>
              <select value={form.planId} onChange={(event) => setForm({ ...form, planId: event.target.value })}>
              <option value="">Select plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.isCustom ? " (Custom)" : ""}</option>)}
            </select>
            </label>
            <label>
              <span className="muted">Active</span>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="EXPIRED">Expired</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            </label>
            <label>
              <span className="muted">Paid</span>
              <select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            </label>
            <label>
              <span className="muted">Manual discount</span>
              <input type="number" min="0" value={form.manualDiscount} placeholder="Manual discount" onChange={(event) => setForm({ ...form, manualDiscount: event.target.value })} />
            </label>
            <textarea rows="4" value={form.notes} placeholder="Notes" onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <input type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
            <input type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            <button>Create Subscription</button>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
        <div className="panel-card">
          <div className="section-heading">
            <h3>Subscription Timeline</h3>
            <span className="badge">{rows.length} records</span>
          </div>
          {loading ? (
            <PageLoader
              compact
              title="Loading subscriptions"
              message="Bringing together plan assignments, trial alerts, and payment health."
            />
          ) : rows.length ? rows.map((row) => {
            const convertDraft = convertDrafts[row.id] || {
              planId: row.plan?.id || "",
              endsAt: "",
              paymentStatus: "PAID",
              manualDiscount: Number(row.manualDiscount || 0),
              notes: "Converted from trial to paid."
            };

            return (
              <div key={row.id} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
                <strong>{row.salon?.name}</strong> - {row.plan?.name}
                <div className="item-meta">Status {row.status} | Payment {row.paymentStatus || "PENDING"}</div>
                <div className="item-meta">Discount {String(row.manualDiscount || 0)} | Ends {new Date(row.endsAt).toLocaleDateString()}</div>
                <div className="item-meta">{row.notes || "No notes"}</div>
                {!!getAlert(row) && <div className="error-text" style={{ marginTop: 6 }}>{getAlert(row)}</div>}
                <div className="item-meta">Plan limits: branches {row.plan?.branchLimit} | users {row.plan?.userLimit} | customers {row.plan?.customerLimit} | invoices {row.plan?.invoiceLimit}</div>
                {row.reminderSentAt && <div className="item-meta">Last reminder: {new Date(row.reminderSentAt).toLocaleString()}</div>}
                {row.convertedAt && <div className="item-meta">Converted: {new Date(row.convertedAt).toLocaleString()}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="button" onClick={() => updateSubscription(row.id, { status: "ACTIVE" })}>Mark Active</button>
                  <button type="button" className="secondary-button" onClick={() => updateSubscription(row.id, { paymentStatus: "PAID" })}>Mark Paid</button>
                  <button type="button" className="secondary-button" onClick={() => updateSubscription(row.id, { paymentStatus: "PENDING" })}>Mark Pending</button>
                  <button type="button" className="danger-button" onClick={() => updateSubscription(row.id, { status: "EXPIRED" })}>Mark Expired</button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <label>
              <span className="muted">Change plan</span>
              <select value={selectedPlanChange[row.id] || ""} onChange={(event) => setSelectedPlanChange((current) => ({ ...current, [row.id]: event.target.value }))}>
                    <option value="">Change plan</option>
                    {plans.map((plan) => <option key={`${row.id}-${plan.id}`} value={plan.id}>{plan.name}{plan.isCustom ? " (Custom)" : ""}</option>)}
                  </select>
            </label>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => selectedPlanChange[row.id] && updateSubscription(row.id, { planId: selectedPlanChange[row.id], notes: "Plan changed from subscriptions screen." })}
                  >
                    Apply Upgrade / Downgrade
                  </button>
                </div>

                {row.status === "TRIAL" && (
                  <div className="panel-card" style={{ marginTop: 12, background: "#fffaf2" }}>
                    <h4 style={{ marginTop: 0 }}>Trial Lifecycle</h4>
                    <div style={{ display: "grid", gap: 8 }}>
                      <button type="button" className="secondary-button" onClick={() => sendReminder(row.id)} disabled={busyId === row.id}>
                        {busyId === row.id ? "Sending..." : "Send Trial Expiry Reminder"}
                      </button>
                      <label>
              <span className="muted">Select Option</span>
              <select value={convertDraft.planId} onChange={(event) => patchConvertDraft(row.id, { planId: event.target.value }, row.plan?.id)}>
                        {plans.map((plan) => <option key={`${row.id}-convert-${plan.id}`} value={plan.id}>{plan.name}{plan.isCustom ? " (Custom)" : ""}</option>)}
                      </select>
            </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input type="date" value={convertDraft.endsAt} onChange={(event) => patchConvertDraft(row.id, { endsAt: event.target.value }, row.plan?.id)} />
                        <label>
              <span className="muted">Paid</span>
              <select value={convertDraft.paymentStatus} onChange={(event) => patchConvertDraft(row.id, { paymentStatus: event.target.value }, row.plan?.id)}>
                          <option value="PAID">Paid</option>
                          <option value="PENDING">Pending</option>
                          <option value="FAILED">Failed</option>
                        </select>
            </label>
                      </div>
                      <label>
              <span className="muted">Manual discount</span>
              <input type="number" min="0" value={convertDraft.manualDiscount} placeholder="Manual discount" onChange={(event) => patchConvertDraft(row.id, { manualDiscount: event.target.value }, row.plan?.id)} />
            </label>
                      <textarea rows="3" value={convertDraft.notes} placeholder="Conversion notes" onChange={(event) => patchConvertDraft(row.id, { notes: event.target.value }, row.plan?.id)} />
                      <button type="button" onClick={() => convertDemo(row)} disabled={busyId === row.id}>
                        {busyId === row.id ? "Converting..." : "Convert Demo To Paid"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="list-stack" style={{ marginTop: 10 }}>
                  {(row.history || []).map((event) => (
                    <div key={event.id} className="list-item">
                      <div className="item-head">
                        <strong>{event.action}</strong>
                        <span className="badge">{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="item-meta">By {event.createdBy || "System"}</div>
                      <div className="item-meta">
                        Status {event.fromStatus || "-"} to {event.toStatus || "-"} | Payment {event.fromPaymentStatus || "-"} to {event.toPaymentStatus || "-"}
                      </div>
                      <div className="item-meta">{event.notes || "No additional notes"}</div>
                    </div>
                  ))}
                  {!row.history?.length && <div className="item-meta">No subscription history recorded yet.</div>}
                </div>
              </div>
            );
          }) : (
            <EmptyState
              title="No subscriptions match these filters"
              message="Try a broader search or create a new subscription to seed the lifecycle workspace."
            />
          )}
        </div>
      </div>
    </div>
  );
}

