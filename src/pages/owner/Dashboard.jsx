import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/dashboard"),
      api.get("/owner/branches")
    ]).then(([dashboardResponse, branchesResponse]) => {
      if (!active) return;
      setData(dashboardResponse.data);
      setBranches(branchesResponse.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = selectedBranch ? { branchId: selectedBranch } : {};
    Promise.all([
      api.get("/owner/dashboard", { params }),
      api.get("/owner/branches")
    ]).then(([dashboardResponse, branchesResponse]) => {
      if (!active) return;
      setData(dashboardResponse.data);
      setBranches(branchesResponse.data);
    });
    return () => {
      active = false;
    };
  }, [selectedBranch]);

  const branchName = useMemo(() => branches.find((branch) => branch.id === selectedBranch)?.name || "All branches", [branches, selectedBranch]);

  if (!data) return <div className="page-shell"><PageLoader title="Loading owner dashboard" message="Pulling sales, customers, payments, and branch activity into one view." /></div>;

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Owner Dashboard</h1>
            <p style={{ marginBottom: 0 }}>Daily salon operations, revenue snapshot, and team activity from the unified admin panel.</p>
          </div>
          <div>
            <label>
              <span className="muted">Branches</span>
              <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            </label>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Today Sales</div><div className="stat-value">{Number(data.todaySales || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Monthly Sales</div><div className="stat-value">{Number(data.monthlySales || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Customers</div><div className="stat-value">{data.customers}</div></div>
        <div className="stat-card"><div className="stat-label">Staff Users</div><div className="stat-value">{data.users}</div></div>
        <div className="stat-card"><div className="stat-label">Services</div><div className="stat-value">{data.services}</div></div>
        <div className="stat-card"><div className="stat-label">Invoices</div><div className="stat-value">{data.invoices}</div></div>
      </div>

      <div className="two-col">
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Operations & Financials</h3>
            <span className="badge">{branchName}</span>
          </div>
          <div className="list-stack" style={{ marginTop: 12 }}>
            <div className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Total Revenue (Paid)</strong>
                <div className="item-meta">Collected across all invoices</div>
              </div>
              <div className="stat-value" style={{ marginTop: 0, fontSize: '1.3rem', color: 'var(--accent)' }}>
                {Number(data.paymentSummary.totalPaid || 0).toFixed(2)}
              </div>
            </div>
            <div className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Pending Dues</strong>
                <div className="item-meta">Outstanding payment balances</div>
              </div>
              <div className="stat-value" style={{ marginTop: 0, fontSize: '1.3rem', color: '#ef4444' }}>
                {Number(data.paymentSummary.totalDue || 0).toFixed(2)}
              </div>
            </div>
            <div className="list-item" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <strong className="muted">Today's Appts</strong>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 4 }}>{data.todayAppointments}</div>
              </div>
              <div>
                <strong className="muted">Upcoming Appts</strong>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: 4 }}>{data.upcomingAppointments}</div>
              </div>
            </div>
            {data.lowStockAlertCount > 0 ? (
              <>
                <div className="list-item" style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "4px solid #ef4444" }}>
                  <strong style={{ color: "#b91c1c" }}>Low Stock Warning</strong>
                  <div className="item-meta" style={{ color: "#ef4444", fontWeight: 500 }}>{data.lowStockAlertCount} item{data.lowStockAlertCount !== 1 ? "s" : ""} need attention</div>
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {(data.lowStockProducts || []).map((product) => (
                    <div key={product.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239, 68, 68, 0.03)", borderLeft: "4px solid #fca5a5", paddingLeft: 14 }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{product.name}</strong>
                        <div className="item-meta" style={{ margin: 0 }}>Min: {product.minStock} {product.unit}</div>
                      </div>
                      <span style={{ background: "#fef2f2", color: "#b91c1c", fontWeight: 700, fontSize: 13, padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", whiteSpace: "nowrap" }}>
                        {product.currentStock} left
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="list-item" style={{ background: "rgba(15, 118, 110, 0.05)", borderLeft: "4px solid var(--accent)" }}>
                <strong style={{ color: "var(--accent)" }}>Inventory Status</strong>
                <div className="item-meta">Stock levels are healthy</div>
              </div>
            )}
          </div>
        </div>

        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Recent Customers</h3>
            <span className="badge">{data.recentCustomers.length} latest</span>
          </div>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {data.recentCustomers.map((customer) => (
              <div key={customer.id} className="list-item">
                <div className="item-head">
                  <strong>{customer.name}</strong>
                  <span className="badge badge-paid">New</span>
                </div>
                <div className="item-meta">{customer.phone || "No phone provided"}</div>
              </div>
            ))}
            {!data.recentCustomers.length && <EmptyState title="No recent customers" message="Fresh customer activity will appear here as soon as visits or sales are recorded." />}
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Recent Invoices</h3>
            <span className="badge">{data.recentInvoices.length} entries</span>
          </div>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {data.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="list-item">
                <div className="item-head">
                  <strong>{invoice.invoiceNumber}</strong>
                  <span className="badge" style={{ background: "var(--accent)", color: "white" }}>{String(invoice.total)}</span>
                </div>
                <div className="item-meta">
                  {invoice.customer?.name || "Walk-in"} &bull; {invoice.branch?.name || "Main salon"}
                </div>
              </div>
            ))}
            {!data.recentInvoices.length && <EmptyState title="No invoices yet" message="This branch scope has no invoice activity yet. New sales will show up here automatically." />}
          </div>
        </div>

        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Recent Payments</h3>
            <span className="badge">{data.recentPayments.length} payments</span>
          </div>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="list-item">
                <div className="item-head">
                  <strong>{payment.invoice?.invoiceNumber || "Direct Payment"}</strong>
                  <span className="badge badge-paid">{String(payment.amount)}</span>
                </div>
                <div className="item-meta">Paid via {payment.mode}</div>
              </div>
            ))}
            {!data.recentPayments.length && <EmptyState title="No payments yet" message="Payment entries will start populating here once billing activity begins for this scope." />}
          </div>
        </div>
      </div>
    </div>
  );
}
