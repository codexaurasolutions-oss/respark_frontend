import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { useBranch } from '../../context/BranchContext';
import { Eye, RotateCcw } from "lucide-react";
import { formatApiError } from "../../utils/apiError";

export default function PaymentsPage() {
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const [tab, setTab] = useState("summary");
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", mode: "", type: "" });
  const [refundForm, setRefundForm] = useState({ invoiceId: "", amount: 0, note: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchData = async () => {
    try {
      const params = {
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.mode ? { mode: filters.mode } : {}),
        ...(filters.type ? { type: filters.type } : {})
      };
      const response = await api.get("/owner/payments", { params });
      setRows(response.data);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load payments"), success: "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchData().then(() => {});
    return () => { active = false; };
  }, [selectedBranchId, filters]);

  const summary = useMemo(() => rows.reduce((acc, row) => {
    acc.total += Number(row.amount || 0);
    acc[row.mode] = (acc[row.mode] || 0) + Number(row.amount || 0);
    return acc;
  }, { total: 0 }), [rows]);

  const handleRefund = async (e) => {
    e.preventDefault();
    const amount = Number(refundForm.amount);
    if (!refundForm.invoiceId || !amount || amount <= 0) {
      setStatus({ error: "Please enter a valid invoice ID and refund amount.", success: "" });
      return;
    }
    try {
      setRefundLoading(true);
      setStatus({ error: "", success: "" });
      await api.post("/owner/payments/refund", { ...refundForm, amount });
      setStatus({ error: "", success: "Refund posted successfully." });
      setTimeout(() => setStatus({ error: "", success: "" }), 4000);
      setRefundForm({ invoiceId: "", amount: 0, note: "" });
      await fetchData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not post refund"), success: "" });
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Payments"
        description="Track split collections, partial balances, refunds, and payment-mode level daily visibility."
        items={[
          { label: "Summary", to: "/admin/payments", hint: "Modes" },
          { label: "Refunds", to: "/admin/payments", hint: "Reverse" },
          { label: "Audit", to: "/admin/payments", hint: "Ledger" }
        ]}
        actions={
          <div className="inline-actions">
            <label>
              <span className="muted">Search invoice, customer, or note</span>
              <input value={filters.q} placeholder="Search invoice, customer, or note" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Modes</span>
              <select value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value }))}>
              <option value="">All modes</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online</option>
              <option value="WALLET">Wallet</option>
            </select>
            </label>
            <label>
              <span className="muted">Types</span>
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All types</option>
              <option value="PAYMENT">Payment</option>
              <option value="REFUND">Refund</option>
            </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", mode: "", type: "" })}>Reset</button>
            {[
              { key: "summary", label: "Summary" },
              { key: "refunds", label: "Refunds" },
              { key: "audit", label: "Audit" }
            ].map((item) => (
              <button key={item.key} type="button" className={tab === item.key ? "" : "secondary-button"} onClick={() => setTab(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card"><div className="stat-label">Payments</div><div className="stat-value">{rows.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Collected</div><div className="stat-value">{summary.total.toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Cash</div><div className="stat-value">{Number(summary.CASH || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Card</div><div className="stat-value">{Number(summary.CARD || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">UPI</div><div className="stat-value">{Number(summary.UPI || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Bank Transfer</div><div className="stat-value">{Number(summary.BANK_TRANSFER || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Wallet</div><div className="stat-value">{Number(summary.WALLET || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Online</div><div className="stat-value">{Number(summary.ONLINE || 0).toFixed(2)}</div></div>
      </div>

      {(tab === "summary" || tab === "refunds") && <div className="panel-card" style={{ marginBottom: 18 }}>
        <h3>Refund Invoice</h3>
        <form onSubmit={handleRefund} className="form-grid">
          <label>
              <span className="muted">Invoice ID</span>
              <input value={refundForm.invoiceId} placeholder="Invoice ID" onChange={(event) => setRefundForm((current) => ({ ...current, invoiceId: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Refund amount</span>
              <input type="number" min="0.01" step="0.01" value={refundForm.amount} placeholder="Refund amount" onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Refund note</span>
              <input value={refundForm.note} placeholder="Refund note" onChange={(event) => setRefundForm((current) => ({ ...current, note: event.target.value }))} />
            </label>
          <button disabled={refundLoading}>{refundLoading ? "Posting..." : "Post Refund"}</button>
        </form>
      </div>}

      <div className="panel-card">
        {loading ? <PageLoader compact title="Loading payments ledger" message="Preparing collection summary, refund activity, and payment-mode breakdown." /> : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((row) => tab === "refunds" ? row.type === "REFUND" : tab === "audit" ? true : row.type !== "REFUND")
                .map((row) => (
                <tr key={row.id}>
                  <td>{row.invoice?.invoiceNumber}</td>
                  <td>{row.invoice?.customer?.name || "Walk-in"}</td>
                  <td>{row.invoice?.branch?.name || "Main salon"}</td>
                  <td>{row.mode}</td>
                  <td>{row.type}</td>
                  <td>{Number(row.amount || 0).toFixed(2)}</td>
                  <td>{row.note || "-"}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      {row.invoiceId && (
                        <button
                          title="View Invoice"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", cursor: "pointer" }}
                          onClick={() => navigate(`/admin/invoices/${row.invoiceId}`)}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      {tab !== "audit" && row.type !== "REFUND" && row.invoiceId && (
                        <button
                          title="Refund this payment"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer" }}
                          onClick={() => { setRefundForm({ invoiceId: row.invoiceId, amount: Number(row.amount || 0), note: `Refund for ${row.invoice?.invoiceNumber || row.id}` }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !rows.length && <EmptyState title="No payments found" message="No matching payment or refund entries were found for the current branch and filter set." />}
      </div>
    </div>
  );
}
