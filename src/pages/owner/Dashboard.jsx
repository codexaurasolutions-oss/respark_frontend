import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { DollarSign, TrendingUp, Users, UserCheck, Scissors, FileText, ArrowUpRight, Activity, UserPlus, Receipt, CreditCard, AlertCircle, CheckCircle } from "lucide-react";

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
      <div className="hero-card dashboard-hero" style={{ padding: 32, marginBottom: 24, borderRadius: 24, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", boxShadow: "0 20px 40px rgba(15,23,42,0.15)" }}>
        <div className="item-head" style={{ alignItems: "center", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ color: "white", position: "relative", zIndex: 1 }}>
            <h1 style={{ marginTop: 0, fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Owner Dashboard</h1>
            <p style={{ marginBottom: 0, opacity: 0.9, fontSize: "1.05rem", color: "#cbd5e1" }}>Daily salon operations, revenue snapshot, and team activity from the unified admin panel.</p>
          </div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Branch</span>
            <select 
              className="glass-select" 
              value={selectedBranch} 
              onChange={(event) => setSelectedBranch(event.target.value)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "10px 16px", borderRadius: 12, fontWeight: 600 }}
            >
              <option value="" style={{ color: 'black' }}>All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id} style={{ color: 'black' }}>{branch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid premium-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Today Sales</div>
            <div className="stat-icon"><DollarSign size={18} /></div>
          </div>
          <div className="stat-value">{Number(data.todaySales || 0).toFixed(2)}</div>
          <div className="stat-trend positive"><ArrowUpRight size={14}/> +4.2% from yesterday</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Monthly Sales</div>
            <div className="stat-icon"><TrendingUp size={18} /></div>
          </div>
          <div className="stat-value">{Number(data.monthlySales || 0).toFixed(2)}</div>
          <div className="stat-trend positive"><ArrowUpRight size={14}/> +12.5% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Customers</div>
            <div className="stat-icon"><Users size={18} /></div>
          </div>
          <div className="stat-value">{data.customers}</div>
          <div className="stat-trend"><span style={{color: 'var(--text-soft)'}}>Total registered</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Staff Users</div>
            <div className="stat-icon"><UserCheck size={18} /></div>
          </div>
          <div className="stat-value">{data.users}</div>
          <div className="stat-trend"><span style={{color: 'var(--text-soft)'}}>Active personnel</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Services</div>
            <div className="stat-icon"><Scissors size={18} /></div>
          </div>
          <div className="stat-value">{data.services}</div>
          <div className="stat-trend"><span style={{color: 'var(--text-soft)'}}>Available catalog</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Invoices</div>
            <div className="stat-icon"><FileText size={18} /></div>
          </div>
          <div className="stat-value">{data.invoices}</div>
          <div className="stat-trend"><span style={{color: 'var(--text-soft)'}}>Generated this month</span></div>
        </div>
      </div>

      <div className="settings-section-grid">
        <div className="panel-card dashboard-section premium-panel">
          <div className="section-heading premium-heading">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Activity size={20} color="var(--accent)" /> Operations & Financials</h3>
            <span className="badge badge-subtle">{branchName}</span>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            <div className="portal-list-item">
              <div className="pli-icon bg-green"><DollarSign size={20} /></div>
              <div className="pli-content">
                <strong>Total Revenue (Paid)</strong>
                <div className="item-meta">Collected across all invoices</div>
              </div>
              <div className="pli-value text-green">${Number(data.paymentSummary.totalPaid || 0).toFixed(2)}</div>
            </div>
            
            <div className="portal-list-item">
              <div className="pli-icon bg-red"><Receipt size={20} /></div>
              <div className="pli-content">
                <strong>Pending Dues</strong>
                <div className="item-meta">Outstanding payment balances</div>
              </div>
              <div className="pli-value text-red">${Number(data.paymentSummary.totalDue || 0).toFixed(2)}</div>
            </div>

            <div className="portal-list-item split-item">
              <div className="split-box">
                <span className="muted">Today's Appts</span>
                <div className="split-val">{data.todayAppointments}</div>
              </div>
              <div className="split-divider"></div>
              <div className="split-box">
                <span className="muted">Upcoming Appts</span>
                <div className="split-val">{data.upcomingAppointments}</div>
              </div>
            </div>

            {data.lowStockAlertCount > 0 ? (
              <div className="portal-list-item alert-item red-alert">
                <div className="pli-icon"><AlertCircle size={20} /></div>
                <div className="pli-content">
                  <strong>Low Stock Warning</strong>
                  <div className="item-meta">{data.lowStockAlertCount} items need attention</div>
                </div>
              </div>
            ) : (
              <div className="portal-list-item alert-item green-alert">
                <div className="pli-icon"><CheckCircle size={20} /></div>
                <div className="pli-content">
                  <strong>Inventory Status</strong>
                  <div className="item-meta">Stock levels are healthy</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel-card dashboard-section premium-panel">
          <div className="section-heading premium-heading">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={20} color="var(--accent-2)" /> Recent Customers</h3>
            <span className="badge badge-subtle">{data.recentCustomers.length} latest</span>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {data.recentCustomers.map((customer) => {
              const initials = (customer.name || "U").substring(0, 2).toUpperCase();
              return (
                <div key={customer.id} className="portal-list-item hoverable">
                  <div className="avatar-circle">{initials}</div>
                  <div className="pli-content">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{customer.name}</strong>
                      <span className="badge badge-paid" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>New</span>
                    </div>
                    <div className="item-meta" style={{ marginTop: 4 }}>{customer.phone || "No phone provided"}</div>
                  </div>
                </div>
              );
            })}
            {!data.recentCustomers.length && <EmptyState title="No recent customers" message="Fresh customer activity will appear here." />}
          </div>
        </div>
      </div>

      <div className="settings-section-grid" style={{ marginTop: 24 }}>
        <div className="panel-card dashboard-section premium-panel">
          <div className="section-heading premium-heading">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Receipt size={20} color="#8b5cf6" /> Recent Invoices</h3>
            <span className="badge badge-subtle">{data.recentInvoices.length} entries</span>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {data.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="portal-list-item hoverable">
                <div className="pli-icon bg-purple"><FileText size={18} /></div>
                <div className="pli-content">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{invoice.invoiceNumber}</strong>
                    <strong style={{ color: "var(--text-main)", fontSize: "1.05rem" }}>${String(invoice.total)}</strong>
                  </div>
                  <div className="item-meta" style={{ marginTop: 4 }}>
                    {invoice.customer?.name || "Walk-in"} &bull; {invoice.branch?.name || "Main salon"}
                  </div>
                </div>
              </div>
            ))}
            {!data.recentInvoices.length && <EmptyState title="No invoices yet" message="This branch scope has no invoice activity yet." />}
          </div>
        </div>

        <div className="panel-card dashboard-section premium-panel">
          <div className="section-heading premium-heading">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><CreditCard size={20} color="#10b981" /> Recent Payments</h3>
            <span className="badge badge-subtle">{data.recentPayments.length} payments</span>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="portal-list-item hoverable">
                <div className="pli-icon bg-emerald"><CreditCard size={18} /></div>
                <div className="pli-content">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{payment.invoice?.invoiceNumber || "Direct Payment"}</strong>
                    <span className="badge badge-paid" style={{ fontSize: "0.8rem", padding: "4px 8px" }}>${String(payment.amount)}</span>
                  </div>
                  <div className="item-meta" style={{ marginTop: 4 }}>Paid via {payment.mode}</div>
                </div>
              </div>
            ))}
            {!data.recentPayments.length && <EmptyState title="No payments yet" message="Payment entries will start populating here." />}
          </div>
        </div>
      </div>
    </div>
  );
}
