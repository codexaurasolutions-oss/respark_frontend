import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function MyCommissionPage() {
  const [data, setData] = useState({ totalCommission: 0, itemCount: 0, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/owner/my-commission").then((response) => {
      setData(response.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Commission"
        description="Staff-scoped earning visibility from eligible invoice items only."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Overview" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Bookings" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Commission", to: "/admin/my-commission", hint: "Earnings" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Commission</h1>
            <p style={{ marginBottom: 0 }}>Track staff-scoped earnings connected to completed, commission-eligible invoice items.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Items {data.itemCount}</span>
            <span className="badge">Total {Number(data.totalCommission || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your commission" message="Preparing eligible invoice items and calculated payout totals." /> : <>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Commission</div><div className="stat-value">{Number(data.totalCommission || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Linked Items</div><div className="stat-value">{data.itemCount}</div></div>
      </div>
      <div className="panel-card" style={{ marginTop: 18 }}>
        <h3>Commission Items</h3>
        <div className="list-stack">
          {data.items.map((item) => (
            <div key={item.id} className="list-item">
              <div className="item-head">
                <strong>{item.serviceName}</strong>
                <span className="badge">{Number(item.commissionAmount || 0).toFixed(2)}</span>
              </div>
              <div className="item-meta">Qty {item.qty} | Line {Number(item.lineTotal || 0).toFixed(2)}</div>
            </div>
          ))}
          {!data.items.length && <EmptyState title="No commission items yet" message="Commissionable services and products will appear here after eligible invoices are completed." />}
        </div>
      </div>
      </>}
    </div>
  );
}
