import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useBranch } from '../../context/BranchContext';
import { TrendingUp, Users, ShoppingBag, CreditCard, Scissors, Receipt, Calendar, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Activity, Wallet, UserPlus } from "lucide-react";

function PaginatedList({ items = [], renderItem, emptyState, title, badge, icon: Icon }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const currentItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "24px", background: "#fff", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0,0,0,0.02)", border: "1px solid #f1f5f9", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {Icon && <div style={{ background: "#f8fafc", padding: 10, borderRadius: 12, color: "var(--accent)" }}><Icon size={20} /></div>}
          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{title}</h3>
        </div>
        {badge && <span style={{ background: "#f8fafc", color: "#475569", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, border: "1px solid #e2e8f0" }}>{badge}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {currentItems.length > 0 ? currentItems.map(renderItem) : emptyState}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <button 
            type="button" 
            style={{ padding: '8px 16px', fontSize: "0.85rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#94a3b8" : "#475569", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, transition: "all 0.2s" }}
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: "0.85rem", color: '#64748b', fontWeight: 600 }}>Page {page} of {totalPages}</span>
          <button 
            type="button" 
            style={{ padding: '8px 16px', fontSize: "0.85rem", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#94a3b8" : "#475569", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, transition: "all 0.2s" }}
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight size={16} />
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

  if (!data) return <div className="page-shell"><PageLoader title="Loading Owner Dashboard" message="Pulling sales, customers, payments, and branch activity into one view." /></div>;

  const lowStockItems = data.lowStockProducts || [];
  const totalStockPages = Math.ceil(lowStockItems.length / stockPerPage);
  const currentStockItems = lowStockItems.slice((stockPage - 1) * stockPerPage, stockPage * stockPerPage);

  const formatMoney = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const stats = [
    { label: "Today Sales", value: formatMoney(data.todaySales), icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
    { label: "Monthly Sales", value: formatMoney(data.monthlySales), icon: Wallet, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Customers", value: data.customers, icon: Users, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: "Staff Users", value: data.users, icon: Activity, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Services", value: data.services, icon: Scissors, color: "#ec4899", bg: "#fdf2f8" },
    { label: "Invoices", value: data.invoices, icon: Receipt, color: "#6366f1", bg: "#eef2ff" },
  ];

  return (
    <div className="page-shell" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
      {/* Hero Section */}
      <div style={{ padding: "32px 40px", marginBottom: 32, background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 24, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", flexWrap: "wrap", gap: 20 }}>
        <div>
          <h1 style={{ marginTop: 0, fontSize: "2.5rem", letterSpacing: "-0.03em", color: "#f8fafc", marginBottom: 8 }}>Dashboard Overview</h1>
          <p style={{ margin: 0, fontSize: "1.05rem", color: "#94a3b8", maxWidth: 500, lineHeight: 1.5 }}>Track daily salon operations, revenue snapshots, and team activity from your unified admin panel.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "12px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }}></div>
          <span style={{ fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.85rem", color: "#e2e8f0" }}>{branchName || "All Branches"}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 32 }}>
        {stats.map((stat, i) => (
          <div key={i} style={{ background: "#fff", padding: "24px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.05)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
              <div style={{ background: stat.bg, color: stat.color, padding: 10, borderRadius: 12 }}><stat.icon size={20} /></div>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", marginTop: "auto" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Operations & Financials */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#f8fafc", padding: 10, borderRadius: 12, color: "var(--accent)" }}><Activity size={20} /></div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Operations & Financials</h3>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Financial Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Total Revenue (Paid)</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>{formatMoney(data.paymentSummary?.totalPaid)}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 8, fontWeight: 500 }}>Collected across all invoices</div>
              </div>
              <div style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)", padding: 24, borderRadius: 16, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Pending Dues</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444" }}>{formatMoney(data.paymentSummary?.totalDue)}</div>
                <div style={{ fontSize: "0.8rem", color: "#991b1b", marginTop: 8, fontWeight: 500 }}>Outstanding payment balances</div>
              </div>
            </div>

            {/* Appointments */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, transition: "background 0.2s", cursor: "pointer" }} onClick={() => navigate("/admin/appointments")} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                <div style={{ background: "#e0e7ff", color: "#4f46e5", padding: 12, borderRadius: 12 }}><Calendar size={24} /></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Appts</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{data.todayAppointments}</div>
                </div>
              </div>
              <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, transition: "background 0.2s", cursor: "pointer" }} onClick={() => navigate("/admin/appointments")} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                <div style={{ background: "#f3e8ff", color: "#9333ea", padding: 12, borderRadius: 12 }}><Calendar size={24} /></div>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Upcoming Appts</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{data.upcomingAppointments}</div>
                </div>
              </div>
            </div>

            {/* Inventory Alerts */}
            {data.lowStockAlertCount > 0 ? (
              <div style={{ border: "1px solid #fecaca", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: "#fef2f2", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #fecaca", cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
                  <AlertTriangle size={20} color="#dc2626" />
                  <div>
                    <div style={{ color: "#991b1b", fontWeight: 700, fontSize: "1rem" }}>Low Stock Warning</div>
                    <div style={{ color: "#dc2626", fontSize: "0.85rem", fontWeight: 600 }}>{data.lowStockAlertCount} item{data.lowStockAlertCount !== 1 ? "s" : ""} need attention</div>
                  </div>
                </div>
                <div style={{ background: "#fff" }}>
                  {currentStockItems.map((product, idx) => (
                    <div key={product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: idx !== currentStockItems.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer", transition: "background 0.2s" }} onClick={() => navigate("/admin/inventory")} onMouseEnter={e => e.currentTarget.style.background="#f8fafc"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>{product.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>Min: {product.minStock} {product.unit}</div>
                      </div>
                      <span style={{ background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: "0.85rem", padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca" }}>
                        {product.currentStock} left
                      </span>
                    </div>
                  ))}
                  {totalStockPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: "12px 20px", borderTop: '1px solid #f1f5f9', background: "#f8fafc" }}>
                      <button type="button" style={{ padding: '6px 12px', fontSize: "0.8rem", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: stockPage === 1 ? "not-allowed" : "pointer", color: stockPage === 1 ? "#94a3b8" : "#475569" }} disabled={stockPage === 1} onClick={() => setStockPage(p => p - 1)}>Prev</button>
                      <span style={{ fontSize: "0.8rem", color: '#64748b', fontWeight: 600 }}>{stockPage} / {totalStockPages}</span>
                      <button type="button" style={{ padding: '6px 12px', fontSize: "0.8rem", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: stockPage === totalStockPages ? "not-allowed" : "pointer", color: stockPage === totalStockPages ? "#94a3b8" : "#475569" }} disabled={stockPage === totalStockPages} onClick={() => setStockPage(p => p + 1)}>Next</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 16, padding: "20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => navigate("/admin/inventory")}>
                <div style={{ background: "#d1fae5", padding: 12, borderRadius: 12, color: "#059669" }}><CheckCircle size={24} /></div>
                <div>
                  <div style={{ color: "#065f46", fontWeight: 700, fontSize: "1.05rem" }}>Inventory Status Healthy</div>
                  <div style={{ color: "#059669", fontSize: "0.85rem", marginTop: 4, fontWeight: 500 }}>All products are sufficiently stocked.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Customers */}
        <PaginatedList
          title="Recent Customers"
          icon={UserPlus}
          badge={`${data.recentCustomers.length} latest`}
          items={data.recentCustomers}
          emptyState={<EmptyState title="No recent customers" message="Fresh customer activity will appear here as soon as visits or sales are recorded." />}
          renderItem={(customer, idx) => (
            <div key={customer.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }} onClick={() => navigate(`/admin/customers/${customer.id}`)} onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontWeight: 800, fontSize: "1.1rem" }}>
                  {customer.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{customer.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 4 }}>{customer.phone || "No phone"}</div>
                </div>
              </div>
              <span style={{ background: "#ecfdf5", color: "#059669", fontSize: "0.75rem", fontWeight: 700, padding: "6px 12px", borderRadius: 20, border: "1px solid #a7f3d0" }}>NEW</span>
            </div>
          )}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingBottom: 40 }}>
        {/* Recent Invoices */}
        <PaginatedList
          title="Recent Invoices"
          icon={Receipt}
          badge={`${data.recentInvoices.length} entries`}
          items={data.recentInvoices}
          emptyState={<EmptyState title="No invoices yet" message="This branch scope has no invoice activity yet. New sales will show up here automatically." />}
          renderItem={(invoice) => (
            <div key={invoice.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }} onClick={() => navigate(`/admin/invoices/${invoice.id}`)} onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{invoice.invoiceNumber}</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={14} /> {invoice.customer?.name || "Walk-in"}
                  <span style={{ color: "#cbd5e1" }}>|</span>
                  {invoice.branch?.name || "Main salon"}
                </div>
              </div>
              <div style={{ background: "#f8fafc", color: "var(--accent)", fontSize: "1rem", fontWeight: 800, padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                {formatMoney(invoice.total)}
              </div>
            </div>
          )}
        />

        {/* Recent Payments */}
        <PaginatedList
          title="Recent Payments"
          icon={CreditCard}
          badge={`${data.recentPayments.length} payments`}
          items={data.recentPayments}
          emptyState={<EmptyState title="No payments yet" message="Payment entries will start populating here once billing activity begins for this scope." />}
          renderItem={(payment) => (
            <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }} onClick={() => navigate(`/admin/payments`)} onMouseEnter={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{payment.invoice?.invoiceNumber || "Direct Payment"}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Paid via <span style={{ color: "#3b82f6" }}>{payment.mode}</span>
                </div>
              </div>
              <div style={{ background: "#ecfdf5", color: "#059669", fontSize: "1rem", fontWeight: 800, padding: "8px 14px", borderRadius: 8, border: "1px solid #a7f3d0" }}>
                + {formatMoney(payment.amount)}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
