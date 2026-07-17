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
      <div className="hero-card" style={{ padding: "28px 32px", marginBottom: 24, background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 250, 0.94))" }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0, fontSize: "2.4rem", letterSpacing: "-0.02em", color: "#0f172a" }}>Owner Dashboard</h1>
            <p style={{ margin: 0, fontSize: "1.05rem", color: "#475569" }}>Daily salon operations, revenue snapshot, and team activity from the unified admin panel.</p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24, gap: 18 }}>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Today Sales</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{Number(data.todaySales || 0).toFixed(2)}</div></div>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Monthly Sales</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{Number(data.monthlySales || 0).toFixed(2)}</div></div>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Customers</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{data.customers}</div></div>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Staff Users</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{data.users}</div></div>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Services</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{data.services}</div></div>
        <div className="stat-card" style={{ padding: "24px" }}><div className="stat-label" style={{ fontWeight: 700 }}>Invoices</div><div className="stat-value" style={{ fontSize: "2.2rem" }}>{data.invoices}</div></div>
      </div>

      <div className="two-col" style={{ gap: 24 }}>
        <div className="panel-card dashboard-section" style={{ display: "flex", flexDirection: "column", padding: "24px" }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "1.3rem", margin: 0 }}>Operations & Financials</h3>
            <span className="badge" style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 8 }}>{branchName}</span>
          </div>
          <div className="list-stack" style={{ marginTop: 8, flex: 1 }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <div className="list-item hoverable" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <strong className="muted" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Revenue (Paid)</strong>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginTop: 8 }}>
                  {Number(data.paymentSummary?.totalPaid || 0).toFixed(2)}
                </div>
                <div className="item-meta" style={{ fontSize: "0.8rem", marginTop: 4 }}>Collected across all invoices</div>
              </div>
              <div className="list-item hoverable" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <strong className="muted" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Dues</strong>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
                  {Number(data.paymentSummary?.totalDue || 0).toFixed(2)}
                </div>
                <div className="item-meta" style={{ fontSize: "0.8rem", marginTop: 4 }}>Outstanding payment balances</div>
              </div>
            </div>

            <div className="list-item hoverable" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "20px 24px", cursor: "pointer" }} onClick={() => navigate("/admin/appointments")}>
              <div>
                <strong className="muted" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Appts</strong>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 8, color: "#0f172a" }}>{data.todayAppointments}</div>
              </div>
              <div>
                <strong className="muted" style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming Appts</strong>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 8, color: "#0f172a" }}>{data.upcomingAppointments}</div>
              </div>
            </div>
            {data.lowStockAlertCount > 0 ? (
              <>
                <div className="list-item hoverable" style={{ background: "rgba(239, 68, 68, 0.05)", borderLeft: "4px solid #ef4444", padding: "16px 20px", cursor: "pointer", marginTop: 8 }} onClick={() => navigate("/admin/inventory")}>
                  <strong style={{ color: "#b91c1c", fontSize: "1.05rem" }}>Low Stock Warning</strong>
                  <div className="item-meta" style={{ color: "#ef4444", fontWeight: 600, marginTop: 4 }}>{data.lowStockAlertCount} item{data.lowStockAlertCount !== 1 ? "s" : ""} need attention</div>
                </div>
                <div style={{ overflowY: "hidden", display: "grid", gap: 12, marginTop: 12 }}>
                  {currentStockItems.map((product) => (
                    <div key={product.id} className="list-item hoverable" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239, 68, 68, 0.03)", borderLeft: "4px solid #fca5a5", padding: "14px 20px", cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
                      <div>
                        <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{product.name}</strong>
                        <div className="item-meta" style={{ margin: 0, fontWeight: 500 }}>Min: {product.minStock} {product.unit}</div>
                      </div>
                      <span style={{ background: "#fef2f2", color: "#b91c1c", fontWeight: 700, fontSize: "0.9rem", padding: "6px 14px", borderRadius: 8, border: "1px solid #fecaca", whiteSpace: "nowrap" }}>
                        {product.currentStock} left
                      </span>
                    </div>
                  ))}
                </div>
                {totalStockPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                    <button type="button" className="secondary-button" style={{ padding: '6px 14px', fontSize: "0.85rem", borderRadius: 8 }} disabled={stockPage === 1} onClick={() => setStockPage(p => p - 1)}>Previous</button>
                    <span style={{ fontSize: "0.85rem", color: '#64748b', fontWeight: 600 }}>Page {stockPage} of {totalStockPages}</span>
                    <button type="button" className="secondary-button" style={{ padding: '6px 14px', fontSize: "0.85rem", borderRadius: 8 }} disabled={stockPage === totalStockPages} onClick={() => setStockPage(p => p + 1)}>Next</button>
                  </div>
                )}
              </>
            ) : (
              <div className="list-item hoverable" style={{ background: "rgba(15, 118, 110, 0.05)", borderLeft: "4px solid var(--accent)", padding: "16px 20px", cursor: "pointer", marginTop: 8 }} onClick={() => navigate("/admin/inventory")}>
                <strong style={{ color: "var(--accent)", fontSize: "1.05rem" }}>Inventory Status</strong>
                <div className="item-meta" style={{ fontWeight: 500, marginTop: 4 }}>Stock levels are healthy</div>
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
            <div key={customer.id} className="list-item hoverable" style={{ cursor: "pointer", padding: "16px 20px" }} onClick={() => navigate(`/admin/customers/${customer.id}`)}>
              <div className="item-head">
                <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{customer.name}</strong>
                <span className="badge badge-paid" style={{ padding: "4px 10px", borderRadius: 8 }}>New</span>
              </div>
              <div className="item-meta" style={{ marginTop: 6 }}>{customer.phone || "No phone provided"}</div>
            </div>
          )}
        />
      </div>

      <div className="two-col" style={{ marginTop: 24, gap: 24 }}>
        <PaginatedList
          title="Recent Invoices"
          badge={`${data.recentInvoices.length} entries`}
          items={data.recentInvoices}
          emptyState={<EmptyState title="No invoices yet" message="This branch scope has no invoice activity yet. New sales will show up here automatically." />}
          renderItem={(invoice) => (
            <div key={invoice.id} className="list-item hoverable" style={{ cursor: "pointer", padding: "16px 20px" }} onClick={() => navigate(`/admin/invoices/${invoice.id}`)}>
              <div className="item-head">
                <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{invoice.invoiceNumber}</strong>
                <span className="badge" style={{ background: "var(--accent)", color: "white", padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>{String(invoice.total)}</span>
              </div>
              <div className="item-meta" style={{ marginTop: 6 }}>
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
            <div key={payment.id} className="list-item hoverable" style={{ cursor: "pointer", padding: "16px 20px" }} onClick={() => navigate(`/admin/payments`)}>
              <div className="item-head">
                <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{payment.invoice?.invoiceNumber || "Direct Payment"}</strong>
                <span className="badge badge-paid" style={{ padding: "4px 10px", borderRadius: 8, fontWeight: 700 }}>{String(payment.amount)}</span>
              </div>
              <div className="item-meta" style={{ marginTop: 6 }}>Paid via {payment.mode}</div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
