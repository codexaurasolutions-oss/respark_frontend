import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function MyDashboardPage() {
  const [data, setData] = useState({ todayAppointments: [], recentAppointments: [], assignedServices: [], notifications: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/owner/my-dashboard").then((response) => {
      setData(response.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Dashboard"
        description="Staff-scoped summary for assigned bookings and quick daily awareness."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Today" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Bookings" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Commission", to: "/admin/my-commission", hint: "Earnings" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Dashboard</h1>
            <p style={{ marginBottom: 0 }}>Your staff-scoped overview for bookings, service assignments, and daily alerts.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Today {data.todayAppointments.length}</span>
            <span className="badge">Recent {data.recentAppointments.length}</span>
            <span className="badge">Notifications {data.notifications.length}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your workspace" message="Preparing your bookings, services, and daily notification context." /> : <>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Today Appointments</div><div className="stat-value">{data.todayAppointments.length}</div></div>
        <div className="stat-card"><div className="stat-label">Recent Assigned</div><div className="stat-value">{data.recentAppointments.length}</div></div>
      </div>
      <div className="panel-card" style={{ marginTop: 18 }}>
        <h3>Assigned Appointments</h3>
        <div className="list-stack">
          {data.recentAppointments.map((item) => (
            <div key={item.id} className="list-item">
              <div className="item-head">
                <strong>{item.customer?.name}</strong>
                <span className={`badge badge-${String(item.status).toLowerCase()}`}>{item.status}</span>
              </div>
              <div className="item-meta">{new Date(item.startAt).toLocaleString()}</div>
            </div>
          ))}
          {!data.recentAppointments.length && <EmptyState title="No assigned appointments yet" message="Your next assigned bookings will appear here as soon as they are scheduled." />}
        </div>
      </div>
      <div className="two-col" style={{ marginTop: 18 }}>
        <div className="panel-card">
          <h3>My Services</h3>
          <div className="badge-row">
            {(data.assignedServices || []).map((item) => (
              <span key={item.id} className="badge">{item.service?.name}</span>
            ))}
            {!data.assignedServices?.length && <span className="muted">No service assignments yet.</span>}
          </div>
        </div>
        <div className="panel-card">
          <h3>Notifications</h3>
          <div className="list-stack">
            {(data.notifications || []).map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{item.action}</strong>
                  <span className="badge">{item.appointment?.status}</span>
                </div>
                <div className="item-meta">
                  {item.appointment?.customer?.name || "Customer"} | {item.appointment?.branch?.name || "Branch"}
                </div>
                <div className="item-meta">{item.details || "No extra note"}</div>
              </div>
            ))}
            {!data.notifications?.length && <EmptyState title="No notifications yet" message="Booking and workflow notifications will show here when something needs your attention." />}
          </div>
        </div>
      </div>
      </>}
    </div>
  );
}
