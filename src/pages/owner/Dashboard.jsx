import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { DollarSign, TrendingUp, Users, UserCheck, Scissors, FileText, ArrowUpRight, Activity, UserPlus, Receipt, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { useSalonSettings } from "../../context/SalonSettingsContext";

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const { formatMoney } = useSalonSettings();

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/owner/dashboard"), api.get("/owner/branches")])
      .then(([d, b]) => { if (!active) return; setData(d.data); setBranches(b.data); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = selectedBranch ? { branchId: selectedBranch } : {};
    api.get("/owner/dashboard", { params }).then(d => { if (!active) return; setData(d.data); });
    return () => { active = false; };
  }, [selectedBranch]);

  const branchName = useMemo(() => branches.find(b => b.id === selectedBranch)?.name || "All branches", [branches, selectedBranch]);

  if (!data) return <div className="page-shell"><PageLoader title="Loading dashboard" /></div>;

  const statCards = [
    { label: "Today Sales",    value: Number(data.todaySales || 0).toFixed(2),    sub: "",    icon: DollarSign,  color: "#0f766e" },
    { label: "Monthly Sales",  value: Number(data.monthlySales || 0).toFixed(2),  sub: "",  icon: TrendingUp,  color: "#2563eb" },
    { label: "Customers",      value: data.customers,                              sub: "",        icon: Users,       color: "#7c3aed" },
    { label: "Staff",          value: data.users,                                  sub: "",        icon: UserCheck,   color: "#0891b2" },
    { label: "Services",       value: data.services,                               sub: "",       icon: Scissors,    color: "#d97706" },
    { label: "Invoices",       value: data.invoices,                               sub: "",    icon: FileText,    color: "#dc2626" },
  ];

  return (
    <div className="page-shell" style={{ background: "#f8fafc" }}>
      <style>{`
        .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .dash-header h1 { margin:0; font-size:1.4rem; font-weight:700; color:#0f172a; }
        .dash-header p { margin:4px 0 0; font-size:0.82rem; color:#64748b; }
        .dash-branch-select { padding:6px 10px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.82rem; background:#fff; color:#334155; font-weight:500; min-height:unset; }
        .dash-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
        .dash-stat { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; }
        .dash-stat-top { display:flex; justify-content:space-between; align-items:center; }
        .dash-stat-label { font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
        .dash-stat-icon { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .dash-stat-value { font-size:1.3rem; font-weight:700; color:#0f172a; }
        .dash-stat-sub { font-size:0.7rem; color:#94a3b8; display:flex; align-items:center; gap:4px; }
        .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .dash-card { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; }
        .dash-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
        .dash-card-title { display:flex; align-items:center; gap:8px; }
        .dash-card-title-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; }
        .dash-card-title h3 { margin:0; font-size:0.88rem; font-weight:700; color:#0f172a; }
        .dash-card-title p { margin:2px 0 0; font-size:0.72rem; color:#94a3b8; }
        .dash-badge { font-size:0.68rem; font-weight:600; padding:3px 8px; border-radius:20px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; }
        .dash-metric-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .dash-metric { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; }
        .dash-metric-label { font-size:0.68rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
        .dash-metric-value { font-size:1.2rem; font-weight:700; color:#0f172a; }
        .dash-metric-sub { font-size:0.68rem; color:#94a3b8; margin-top:2px; }
        .dash-metric.green .dash-metric-value { color:#059669; }
        .dash-metric.red .dash-metric-value { color:#dc2626; }
        .dash-appt-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        .dash-appt { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; display:flex; align-items:center; gap:10px; }
        .dash-appt-icon { width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:#e0f2fe; }
        .dash-appt-num { font-size:1.2rem; font-weight:700; color:#0f172a; }
        .dash-appt-lbl { font-size:0.68rem; color:#94a3b8; }
        .dash-alert { border-radius:8px; padding:10px 14px; display:flex; align-items:center; gap:8px; font-size:0.8rem; font-weight:600; }
        .dash-alert.ok { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
        .dash-alert.warn { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
        .dash-list { display:flex; flex-direction:column; gap:8px; }
        .dash-list-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid #f1f5f9; border-radius:8px; background:#fafafa; }
        .dash-list-row:hover { background:#f1f5f9; }
        .dash-avatar { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:700; color:#fff; flex-shrink:0; }
        .dash-list-name { font-size:0.82rem; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .dash-list-sub { font-size:0.7rem; color:#94a3b8; margin-top:1px; }
        .dash-list-right { margin-left:auto; font-size:0.78rem; font-weight:700; color:#0f172a; flex-shrink:0; }
        .dash-new-badge { font-size:0.62rem; font-weight:700; padding:2px 7px; border-radius:10px; background:#dcfce7; color:#166534; border:1px solid #bbf7d0; flex-shrink:0; }
        .dash-mode-badge { font-size:0.62rem; font-weight:600; padding:2px 7px; border-radius:10px; background:#f1f5f9; color:#475569; }
        .dash-inv-icon { width:30px; height:30px; border-radius:7px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      `}</style>

      {/* Header */}
      <div className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Daily salon operations overview</p>
        </div>
        <select className="dash-branch-select" value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="dash-stats">
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div className="dash-stat" key={label}>
            <div className="dash-stat-top">
              <span className="dash-stat-label">{label}</span>
              <div className="dash-stat-icon" style={{ background: color + "18" }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <div className="dash-stat-value">{value}</div>
            <div className="dash-stat-sub"><ArrowUpRight size={11} />{sub}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dash-grid">

        {/* Operations */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <div className="dash-card-title-icon"><Activity size={16} color="#6366f1" /></div>
              <div>
                <h3>Operations & Financials</h3>
                <p>Live business overview</p>
              </div>
            </div>
            <span className="dash-badge">{branchName}</span>
          </div>
          <div className="dash-metric-row">
            <div className="dash-metric green">
              <div className="dash-metric-label">Total Revenue</div>
              <div className="dash-metric-value">{formatMoney(Number(data.paymentSummary.totalPaid || 0).toFixed(2))}</div>
              <div className="dash-metric-sub">Collected across invoices</div>
            </div>
            <div className="dash-metric red">
              <div className="dash-metric-label">Pending Dues</div>
              <div className="dash-metric-value">{formatMoney(Number(data.paymentSummary.totalDue || 0).toFixed(2))}</div>
              <div className="dash-metric-sub">Outstanding balances</div>
            </div>
          </div>
          <div className="dash-appt-row">
            <div className="dash-appt">
              <div className="dash-appt-icon"><FileText size={14} color="#0284c7" /></div>
              <div>
                <div className="dash-appt-num">{data.todayAppointments}</div>
                <div className="dash-appt-lbl">Today's Appts</div>
              </div>
            </div>
            <div className="dash-appt">
              <div className="dash-appt-icon"><TrendingUp size={14} color="#7c3aed" /></div>
              <div>
                <div className="dash-appt-num">{data.upcomingAppointments}</div>
                <div className="dash-appt-lbl">Upcoming</div>
              </div>
            </div>
          </div>
          {data.lowStockAlertCount > 0 ? (
            <div className="dash-alert warn">
              <AlertCircle size={15} />
              Low Stock — {data.lowStockAlertCount} items need attention
            </div>
          ) : (
            <div className="dash-alert ok">
              <CheckCircle size={15} />
              Inventory Healthy — All stock levels are normal
            </div>
          )}
        </div>

        {/* Recent Customers */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <div className="dash-card-title-icon"><UserPlus size={16} color="#059669" /></div>
              <div>
                <h3>Recent Customers</h3>
                <p>Newly registered clients</p>
              </div>
            </div>
            <span className="dash-badge">{data.recentCustomers.length} latest</span>
          </div>
          <div className="dash-list">
            {data.recentCustomers.map((c, i) => {
              const colors = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6"];
              return (
                <div key={c.id} className="dash-list-row">
                  <div className="dash-avatar" style={{ background: colors[i % colors.length] }}>
                    {(c.name || "U").substring(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-list-name">{c.name}</div>
                    <div className="dash-list-sub">{c.phone || "No phone"}</div>
                  </div>
                  <span className="dash-new-badge">NEW</span>
                </div>
              );
            })}
            {!data.recentCustomers.length && <EmptyState title="No recent customers" message="Customer activity will appear here." />}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <div className="dash-card-title-icon"><Receipt size={16} color="#7c3aed" /></div>
              <div>
                <h3>Recent Invoices</h3>
                <p>Latest billing activity</p>
              </div>
            </div>
            <span className="dash-badge">{data.recentInvoices.length} entries</span>
          </div>
          <div className="dash-list">
            {data.recentInvoices.map(inv => (
              <div key={inv.id} className="dash-list-row">
                <div className="dash-inv-icon"><FileText size={14} color="#7c3aed" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-list-name">{inv.invoiceNumber}</div>
                  <div className="dash-list-sub">{inv.customer?.name || "Walk-in"} · {inv.branch?.name || "Main salon"}</div>
                </div>
                <div className="dash-list-right">{formatMoney(inv.total)}</div>
              </div>
            ))}
            {!data.recentInvoices.length && <EmptyState title="No invoices yet" />}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className="dash-card-title">
              <div className="dash-card-title-icon"><CreditCard size={16} color="#059669" /></div>
              <div>
                <h3>Recent Payments</h3>
                <p>Incoming payment log</p>
              </div>
            </div>
            <span className="dash-badge">{data.recentPayments.length} payments</span>
          </div>
          <div className="dash-list">
            {data.recentPayments.map(p => (
              <div key={p.id} className="dash-list-row">
                <div className="dash-inv-icon"><CreditCard size={14} color="#059669" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="dash-list-name">{p.invoice?.invoiceNumber || "Direct Payment"}</div>
                  <div className="dash-list-sub">via {p.mode}</div>
                </div>
                <div className="dash-list-right">{formatMoney(p.amount)}</div>
              </div>
            ))}
            {!data.recentPayments.length && <EmptyState title="No payments yet" />}
          </div>
        </div>

      </div>
    </div>
  );
}
