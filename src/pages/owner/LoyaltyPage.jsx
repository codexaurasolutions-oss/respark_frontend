import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyRule = {
  name: "",
  pointsPerCurrency: 1,
  minRedeemPoints: 100,
  maxRedeemPercent: 20,
  expiryDays: 180
};

export default function LoyaltyPage() {
  const location = useLocation();
  const params = useParams();
  const { selectedBranchId } = useBranch();
  const [rules, setRules] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [report, setReport] = useState(null);
  const [customerView, setCustomerView] = useState(null);
  const [form, setForm] = useState(emptyRule);
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
        api.get("/owner/loyalty/rules", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/loyalty/transactions", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/loyalty/reports", { params: { branchId: selectedBranchId || undefined } })
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
  }, [params.id, selectedBranchId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const saveRule = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/loyalty/rules", {
        ...form,
        pointsPerCurrency: Number(form.pointsPerCurrency),
        minRedeemPoints: Number(form.minRedeemPoints),
        maxRedeemPercent: Number(form.maxRedeemPercent),
        expiryDays: Number(form.expiryDays),
        branchId: selectedBranchId || null
      });
      setForm(emptyRule);
      setStatus({ error: "", success: "Loyalty rule saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save loyalty rule"), success: "" });
    }
  };

  const postAdjustment = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/loyalty/adjust", {
        ...adjustment,
        points: Number(adjustment.points),
        branchId: selectedBranchId || null
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
          <h3>Create Loyalty Rule</h3>
          <form className="form-grid" onSubmit={saveRule}>
            <label>
              <span className="muted">Rule name</span>
              <input placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span className="muted">Points per currency</span>
              <input type="number" placeholder="Points per currency" value={form.pointsPerCurrency} onChange={(e) => setForm({ ...form, pointsPerCurrency: e.target.value })} />
            </label>
            <label>
              <span className="muted">Minimum redeem points</span>
              <input type="number" placeholder="Minimum redeem points" value={form.minRedeemPoints} onChange={(e) => setForm({ ...form, minRedeemPoints: e.target.value })} />
            </label>
            <label>
              <span className="muted">Maximum redeem %</span>
              <input type="number" placeholder="Maximum redeem %" value={form.maxRedeemPercent} onChange={(e) => setForm({ ...form, maxRedeemPercent: e.target.value })} />
            </label>
            <label>
              <span className="muted">Expiry days</span>
              <input type="number" placeholder="Expiry days" value={form.expiryDays} onChange={(e) => setForm({ ...form, expiryDays: e.target.value })} />
            </label>
            <button>Save Rule</button>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {rules.map((rule) => (
              <div key={rule.id} className="list-item">
                <strong>{rule.name}</strong>
                <div className="item-meta">Earn {rule.pointsPerCurrency} | Min redeem {rule.minRedeemPoints} | Expiry {rule.expiryDays || 0} days</div>
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
