import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState("month");
  useEffect(() => {
    api.get("/super-admin/dashboard", { params: { period } }).then((response) => setData(response.data));
  }, [period]);

  const healthCards = useMemo(() => [
    { label: "Total Salons", value: data?.totalSalons || 0, caption: "All tenants across the platform" },
    { label: "Active Salons", value: data?.activeSalons || 0, caption: "Currently operational salons" },
    { label: "Trial Salons", value: data?.trialSalons || 0, caption: "Free-trial accounts in conversion stage" },
    { label: "Suspended", value: data?.suspendedSalons || 0, caption: "Accounts needing follow-up" },
    { label: "Demo Leads", value: data?.demoLeadsCount || 0, caption: "Fresh acquisition pipeline" },
    { label: "Support Queue", value: data?.supportTicketsCount || 0, caption: "Open support workload" }
  ], [data]);

  if (!data) {
    return (
      <div className="page-shell">
        <PageLoader
          title="Loading super admin command center"
          message="Bringing together salon growth, subscription health, revenue, and support activity."
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Super Admin Dashboard</h1>
            <p style={{ marginBottom: 0 }}>Live SaaS overview for salons, subscriptions, leads, and support workload.</p>
          </div>
          <div style={{ minWidth: 220 }}>
            <div className="item-meta" style={{ marginBottom: 8 }}>Reporting window</div>
            <label>
              <span className="muted">Today</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="today">Today</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            </label>
          </div>
        </div>
        <div className="inline-actions" style={{ marginTop: 16 }}>
          <Link to="/super-admin/salons" className="cta-secondary">Add Salon</Link>
          <Link to="/super-admin/plans" className="cta-secondary">Create Plan</Link>
          <Link to="/super-admin/demo-leads" className="cta-secondary">View Demo Leads</Link>
          <Link to="/super-admin/support-tickets" className="cta-secondary">View Support Tickets</Link>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {healthCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value">{card.value}</div>
            <div className="item-meta">{card.caption}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Revenue Snapshot</h3>
            <span className="badge">SaaS Health</span>
          </div>
          <div className="section-grid">
            <div className="summary-box">
              <strong>Monthly Subscription Revenue</strong>
              <div className="stat-value" style={{ fontSize: "1.8rem", marginTop: 8 }}>{data.monthlySubscriptionRevenue}</div>
            </div>
            <div className="summary-box">
              <strong>Total Subscription Revenue</strong>
              <div className="stat-value" style={{ fontSize: "1.8rem", marginTop: 8 }}>{data.totalSubscriptionRevenue}</div>
            </div>
          </div>
          <div className="badge-row" style={{ marginTop: 16 }}>
            <span className="badge">Plans {data.plansCount}</span>
            <span className="badge">Support {data.supportTicketsCount}</span>
            <span className="badge">Expired {data.expiredSalons}</span>
          </div>
        </div>
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Active Plans</h3>
            <span className="badge">{data.activePlansSummary.length} live</span>
          </div>
          {data.activePlansSummary.map((plan) => (
            <div key={plan.id} className="list-item">
              <div>
                <strong>{plan.name}</strong>
                <div className="item-meta">Monthly {plan.monthlyPrice}</div>
              </div>
            </div>
          ))}
          {!data.activePlansSummary.length && (
            <EmptyState
              title="No active plans yet"
              message="Plan analytics will show up here as soon as pricing plans are created or restored."
            />
          )}
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Recent Salons</h3>
            <span className="badge">Newest tenants</span>
          </div>
          {data.recentSalons.map((salon) => (
            <div key={salon.id} className="list-item">
              <div>
                <strong>{salon.name}</strong>
                <div className="item-meta">{salon.status}</div>
              </div>
            </div>
          ))}
          {!data.recentSalons.length && (
            <EmptyState
              title="No recent salons"
              message="New salon signups or created tenants will appear here automatically."
            />
          )}
        </div>
        <div className="panel-card dashboard-section">
          <div className="section-heading">
            <h3>Recent Payments</h3>
            <span className="badge">Collections</span>
          </div>
          {data.recentPayments.map((payment) => (
            <div key={payment.id} className="list-item">
              <div>
                <strong>{payment.mode}</strong>
                <div className="item-meta">{String(payment.amount)}</div>
              </div>
            </div>
          ))}
          {!data.recentPayments.length && (
            <EmptyState
              title="No recent payments"
              message="Subscription collections and manual payment entries will show here when available."
            />
          )}
        </div>
      </div>
    </div>
  );
}
