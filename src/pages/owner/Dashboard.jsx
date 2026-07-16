import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useBranch } from '../../context/BranchContext';

function PaginatedList({ items = [], renderItem, emptyState, title, badge }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const currentItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="panel-card dashboard-section" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section-heading">
        <h3>{title}</h3>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="list-stack" style={{ marginTop: 12, flex: 1, overflowY: "hidden" }}>
        {currentItems.length > 0 ? currentItems.map(renderItem) : emptyState}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <button 
            type="button" 
            className="secondary-button" 
            style={{ padding: '4px 10px', fontSize: 12 }}
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button 
            type="button" 
            className="secondary-button" 
            style={{ padding: '4px 10px', fontSize: 12 }}
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { selectedBranchId, selectedBranchName } = useBranch();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const [stockPage, setStockPage] = useState(1);
  const stockPerPage = 5;

  useEffect(() => {
    let active = true;
    const params = selectedBranchId ? { branchId: selectedBranchId } : {};
    api.get("/owner/dashboard", { params }).then((response) => {
      if (!active) return;
      setData(response.data);
    }).catch(() => {
      if (!active) return;
      setData({});
    });
    return () => {
      active = false;
    };
  }, [selectedBranchId]);

  const branchName = selectedBranchName;

  if (!data) return <div className="page-shell"><PageLoader title="Loading owner dashboard" message="Pulling sales, customers, payments, and branch activity into one view." /></div>;

  const lowStockItems = data.lowStockProducts || [];
  const totalStockPages = Math.ceil(lowStockItems.length / stockPerPage);
  const currentStockItems = lowStockItems.slice((stockPage - 1) * stockPerPage, stockPage * stockPerPage);

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Owner Dashboard</h1>
            <p style={{ marginBottom: 0 }}>Daily salon operations, revenue snapshot, and team activity from the unified admin panel.</p>
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
        <div className="panel-card dashboard-section" style={{ display: "flex", flexDirection: "column" }}>
          <div className="section-heading">
            <h3>Operations & Financials</h3>
            <span className="badge">{branchName}</span>
          </div>
          <div className="list-stack" style={{ marginTop: 12, flex: 1 }}>
            <div className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Total Revenue (Paid)</strong>
                <div className="item-meta">Collected across all invoices</div>
              </div>
              <div className="stat-value" style={{ marginTop: 0, fontSize: '1.3rem', color: 'var(--accent)' }}>
                {Number(data.paymentSummary?.totalPaid || 0).toFixed(2)}
              </div>
            </div>
            <div className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Pending Dues</strong>
                <div className="item-meta">Outstanding payment balances</div>
              </div>
              <div className="stat-value" style={{ marginTop: 0, fontSize: '1.3rem', color: '#ef4444' }}>
                {Number(data.paymentSummary?.totalDue || 0).toFixed(2)}
              </div>
            </div>
            <div className="list-item hoverable" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, cursor: "pointer" }} onClick={() => navigate("/admin/appointments")}>
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
                <div className="list-item hoverable" style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "4px solid #ef4444", cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
                  <strong style={{ color: "#b91c1c" }}>Low Stock Warning</strong>
                  <div className="item-meta" style={{ color: "#ef4444", fontWeight: 500 }}>{data.lowStockAlertCount} item{data.lowStockAlertCount !== 1 ? "s" : ""} need attention</div>
                </div>
                <div style={{ overflowY: "hidden" }}>
                  {currentStockItems.map((product) => (
                    <div key={product.id} className="list-item hoverable" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239, 68, 68, 0.03)", borderLeft: "4px solid #fca5a5", paddingLeft: 14, cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
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
                {totalStockPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    <button type="button" className="secondary-button" style={{ padding: '4px 10px', fontSize: 12 }} disabled={stockPage === 1} onClick={() => setStockPage(p => p - 1)}>Previous</button>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Page {stockPage} of {totalStockPages}</span>
                    <button type="button" className="secondary-button" style={{ padding: '4px 10px', fontSize: 12 }} disabled={stockPage === totalStockPages} onClick={() => setStockPage(p => p + 1)}>Next</button>
                  </div>
                )}
              </>
            ) : (
              <div className="list-item hoverable" style={{ background: "rgba(15, 118, 110, 0.05)", borderLeft: "4px solid var(--accent)", cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
                <strong style={{ color: "var(--accent)" }}>Inventory Status</strong>
                <div className="item-meta">Stock levels are healthy</div>
              </div>
            )}
          </div>
        </div>

        <PaginatedList
          title="Recent Customers"
          badge={`${data.recentCustomers.length} latest`}
          items={data.recentCustomers}
          emptyState={<EmptyState title="No recent customers" message="Fresh customer activity will appear here as soon as visits or sales are recorded." />}
          renderItem={(customer) => (
            <div key={customer.id} className="list-item hoverable" style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/customers/${customer.id}`)}>
              <div className="item-head">
                <strong>{customer.name}</strong>
                <span className="badge badge-paid">New</span>
              </div>
              <div className="item-meta">{customer.phone || "No phone provided"}</div>
            </div>
          )}
        />
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <PaginatedList
          title="Recent Invoices"
          badge={`${data.recentInvoices.length} entries`}
          items={data.recentInvoices}
          emptyState={<EmptyState title="No invoices yet" message="This branch scope has no invoice activity yet. New sales will show up here automatically." />}
          renderItem={(invoice) => (
            <div key={invoice.id} className="list-item hoverable" style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/invoices/${invoice.id}`)}>
              <div className="item-head">
                <strong>{invoice.invoiceNumber}</strong>
                <span className="badge" style={{ background: "var(--accent)", color: "white" }}>{String(invoice.total)}</span>
              </div>
              <div className="item-meta">
                {invoice.customer?.name || "Walk-in"} &bull; {invoice.branch?.name || "Main salon"}
              </div>
            </div>
          )}
        />

        <PaginatedList
          title="Recent Payments"
          badge={`${data.recentPayments.length} payments`}
          items={data.recentPayments}
          emptyState={<EmptyState title="No payments yet" message="Payment entries will start populating here once billing activity begins for this scope." />}
          renderItem={(payment) => (
            <div key={payment.id} className="list-item hoverable" style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/payments`)}>
              <div className="item-head">
                <strong>{payment.invoice?.invoiceNumber || "Direct Payment"}</strong>
                <span className="badge badge-paid">{String(payment.amount)}</span>
              </div>
              <div className="item-meta">Paid via {payment.mode}</div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
