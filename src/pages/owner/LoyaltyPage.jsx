import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyRule = {
  name: "",
  pointsPerCurrency: 1,
  minRedeemPoints: 100,
  maxRedeemPercent: 20,
  expiryDays: 180,
  serviceMultiplier: "",
  productMultiplier: "",
  birthdayPoints: ""
};

export default function LoyaltyPage() {
  const location = useLocation();
  const params = useParams();
  const { formatMoney } = useSalonSettings();
  const [rules, setRules] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [report, setReport] = useState(null);
  const [customerView, setCustomerView] = useState(null);
  const [form, setForm] = useState(emptyRule);
  const [editingRule, setEditingRule] = useState(null);
  const [adjustment, setAdjustment] = useState({ customerId: "", points: 0, type: "ADJUST", note: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const mode = location.pathname.includes("/rules")
    ? "rules"
    : location.pathname.includes("/transactions")
      ? "transactions"
      : location.pathname.includes("/reports")
        ? "reports"
        : params.id
          ? "customer"
          : "overview";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesResponse, transactionsResponse, reportResponse] = await Promise.all([
        api.get("/owner/loyalty/rules"),
        api.get("/owner/loyalty/transactions"),
        api.get("/owner/loyalty/reports")
      ]);
      setRules(rulesResponse.data || []);
      setTransactions(transactionsResponse.data || []);
      setReport(reportResponse.data || null);
      if (params.id) {
        const customerResponse = await api.get(`/owner/customers/${params.id}/loyalty`);
        setCustomerView(customerResponse.data);
      } else {
        setCustomerView(null);
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load loyalty module"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const saveRule = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: form.name,
        pointsPerCurrency: Number(form.pointsPerCurrency),
        minRedeemPoints: Number(form.minRedeemPoints),
        maxRedeemPercent: Number(form.maxRedeemPercent),
        expiryDays: Number(form.expiryDays),
        serviceMultiplier: form.serviceMultiplier ? Number(form.serviceMultiplier) : null,
        productMultiplier: form.productMultiplier ? Number(form.productMultiplier) : null,
        birthdayPoints: form.birthdayPoints ? Number(form.birthdayPoints) : null
      };
      if (editingRule) {
        await api.patch(`/owner/loyalty/rules/${editingRule.id}`, payload);
        setStatus({ error: "", success: "Loyalty rule updated." });
      } else {
        await api.post("/owner/loyalty/rules", payload);
        setStatus({ error: "", success: "Loyalty rule created." });
      }
      setForm(emptyRule);
      setEditingRule(null);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save loyalty rule"), success: "" });
    }
  };

  const deleteRule = async (ruleId) => {
    if (!confirm("Delete this loyalty rule?")) return;
    try {
      await api.delete(`/owner/loyalty/rules/${ruleId}`);
      setStatus({ error: "", success: "Loyalty rule deleted." });
      if (editingRule?.id === ruleId) {
        setEditingRule(null);
        setForm(emptyRule);
      }
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not delete loyalty rule"), success: "" });
    }
  };

  const startEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || "",
      pointsPerCurrency: rule.pointsPerCurrency ?? 1,
      minRedeemPoints: rule.minRedeemPoints ?? 100,
      maxRedeemPercent: rule.maxRedeemPercent ?? 20,
      expiryDays: rule.expiryDays ?? 180,
      serviceMultiplier: rule.serviceMultiplier ?? "",
      productMultiplier: rule.productMultiplier ?? "",
      birthdayPoints: rule.birthdayPoints ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setForm(emptyRule);
  };

  const postAdjustment = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/loyalty/adjust", {
        ...adjustment,
        points: Number(adjustment.points)
      });
      setAdjustment({ customerId: "", points: 0, type: "ADJUST", note: "" });
      setStatus({ error: "", success: "Loyalty adjustment saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save loyalty adjustment"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Loyalty"
        description="Rules, earn/redeem history, customer balance and loyalty analytics."
        items={[
          { label: "Overview", to: "/admin/loyalty" },
          { label: "Rules", to: "/admin/loyalty/rules" },
          { label: "Transactions", to: "/admin/loyalty/transactions" },
          { label: "Reports", to: "/admin/loyalty/reports" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Loyalty</h1>
            <p style={{ marginBottom: 0 }}>Design earn and redeem rules, adjust balances, and monitor loyalty performance across your salon base.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Rules {rules.length}</span>
            <span className="badge">Transactions {transactions.length}</span>
            <span className="badge">{params.id ? "Customer View" : "Salon View"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading loyalty workspace" message="Pulling rules, customer balances, adjustment history, and loyalty reports." />}

      {!loading && (mode === "overview" || mode === "rules") && (
        <div className="panel-card">
          <h3>{editingRule ? "Edit Loyalty Rule" : "Create Loyalty Rule"}</h3>
          <form className="form-grid" onSubmit={saveRule}>
            <label>
              <span className="muted">Rule name</span>
              <input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span className="muted">Points per currency (earn rate)</span>
              <input type="number" placeholder={`e.g. 1 = 1 point per ${formatMoney(1)}`} value={form.pointsPerCurrency} onChange={(e) => setForm({ ...form, pointsPerCurrency: e.target.value })} />
            </label>
            <label>
              <span className="muted">Minimum redeem points</span>
              <input type="number" placeholder="Minimum redeem points" value={form.minRedeemPoints} onChange={(e) => setForm({ ...form, minRedeemPoints: e.target.value })} />
            </label>
            <label>
              <span className="muted">Maximum redeem % of bill</span>
              <input type="number" placeholder="Max %" value={form.maxRedeemPercent} onChange={(e) => setForm({ ...form, maxRedeemPercent: e.target.value })} />
            </label>
            <label>
              <span className="muted">Expiry days</span>
              <input type="number" placeholder="Expiry days" value={form.expiryDays} onChange={(e) => setForm({ ...form, expiryDays: e.target.value })} />
            </label>
            <label>
              <span className="muted">Service multiplier (bonus pts per service)</span>
              <input type="number" placeholder="Optional extra pts" value={form.serviceMultiplier} onChange={(e) => setForm({ ...form, serviceMultiplier: e.target.value })} />
            </label>
            <label>
              <span className="muted">Product multiplier (bonus pts per product)</span>
              <input type="number" placeholder="Optional extra pts" value={form.productMultiplier} onChange={(e) => setForm({ ...form, productMultiplier: e.target.value })} />
            </label>
            <label>
              <span className="muted">Birthday bonus points</span>
              <input type="number" placeholder="Optional birthday pts" value={form.birthdayPoints} onChange={(e) => setForm({ ...form, birthdayPoints: e.target.value })} />
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
              <button type="submit">{editingRule ? "Update Rule" : "Save Rule"}</button>
              {editingRule && (
                <button type="button" onClick={cancelEdit} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>Cancel Edit</button>
              )}
            </div>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {rules.map((rule) => (
              <div key={rule.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <strong>{rule.name}</strong>
                  <div className="item-meta">
                    Earn {rule.pointsPerCurrency} pts/{formatMoney(1)} | Min redeem {rule.minRedeemPoints} | Max {rule.maxRedeemPercent}% | Expiry {rule.expiryDays || 0}d
                    {rule.serviceMultiplier ? ` | Svc ×${rule.serviceMultiplier}` : ""}
                    {rule.productMultiplier ? ` | Prod ×${rule.productMultiplier}` : ""}
                    {rule.birthdayPoints ? ` | Bday +${rule.birthdayPoints}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
                  <button onClick={() => startEdit(rule)} style={{ padding: "4px 12px", fontSize: 12, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteRule(rule.id)} style={{ padding: "4px 12px", fontSize: 12, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            ))}
            {!rules.length && <EmptyState title="No loyalty rules yet" message="Create a rule to define how points are earned, redeemed, and expired." />}
          </div>
        </div>
      )}

      {!loading && (mode === "overview" || mode === "transactions") && (
        <div className="panel-card">
          <h3>Manual Adjustment</h3>
          <form className="form-grid" onSubmit={postAdjustment}>
            <label>
              <span className="muted">Customer ID</span>
              <input placeholder="Customer ID" value={adjustment.customerId} onChange={(e) => setAdjustment({ ...adjustment, customerId: e.target.value })} />
            </label>
            <label>
              <span className="muted">Points (+/-)</span>
              <input type="number" placeholder="Points (+/-)" value={adjustment.points} onChange={(e) => setAdjustment({ ...adjustment, points: e.target.value })} />
            </label>
            <label>
              <span className="muted">Adjust</span>
              <select value={adjustment.type} onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}>
              <option value="ADJUST">Adjust</option>
              <option value="BONUS">Bonus</option>
              <option value="EXPIRE">Expire</option>
            </select>
            </label>
            <label>
              <span className="muted">Note</span>
              <input placeholder="Note" value={adjustment.note} onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })} />
            </label>
            <button>Post Adjustment</button>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {transactions.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.customer?.name || row.customerId}</strong>
                <div className="item-meta">{row.type} | {row.points} pts | Balance {row.balanceAfter}</div>
              </div>
            ))}
            {!transactions.length && <EmptyState title="No loyalty transactions yet" message="Earn, redeem, and manual adjustment history will appear here once activity starts." />}
          </div>
        </div>
      )}

      {!loading && mode === "reports" && report && (
        <div className="panel-card">
          <h3>Loyalty Reports</h3>
          <div className="badge-row" style={{ marginBottom: 16 }}>
            <span className="badge">Earned {report.summary?.earned || 0}</span>
            <span className="badge">Redeemed {report.summary?.redeemed || 0}</span>
          </div>
          <div className="list-stack">
            {(report.topCustomers || []).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.name}</strong>
                <div className="item-meta">Balance {row.loyaltyPoints}</div>
              </div>
            ))}
            {!report.topCustomers?.length && <EmptyState title="No top customers yet" message="Top loyalty holders will appear here after customers start earning or redeeming points." />}
          </div>
        </div>
      )}

      {!loading && mode === "customer" && customerView && (
        <div className="panel-card">
          <h3>Customer Loyalty</h3>
          <p className="muted">{customerView.customer?.name} | Balance {customerView.balance}</p>
          <div className="list-stack">
            {(customerView.history || []).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.type}</strong>
                <div className="item-meta">{row.points} pts | Balance {row.balanceAfter}</div>
              </div>
            ))}
            {!customerView.history?.length && <EmptyState title="No customer loyalty history yet" message="This customer has not accumulated or redeemed any loyalty activity so far." />}
          </div>
        </div>
      )}
    </div>
  );
}
