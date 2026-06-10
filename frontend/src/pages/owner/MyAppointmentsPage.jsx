import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function MyAppointmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await api.get("/owner/my-appointments");
      if (!active) return;
      setRows(response.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/owner/appointments/${id}/status`, { status });
    const response = await api.get("/owner/my-appointments");
    setRows(response.data);
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Appointments"
        description="Only your assigned bookings are visible here unless broader permissions are granted."
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
            <h1 style={{ marginTop: 0 }}>My Appointments</h1>
            <p style={{ marginBottom: 0 }}>Work only on bookings assigned to you, with quick start and completion actions.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Assigned {rows.length}</span>
            <span className="badge">Ready Actions</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your appointments" message="Preparing your assigned bookings and service breakdown." /> : (
      <div className="list-stack">
        {rows.map((item) => (
          <div key={item.id} className="list-item">
            <div className="item-head">
              <strong>{item.customer?.name}</strong>
              <span className={`badge badge-${String(item.status).toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="item-meta">{item.branch?.name || "Branch"} | {new Date(item.startAt).toLocaleString()}</div>
            <div className="badge-row">
              {(item.items || []).map((serviceItem) => (
                <span key={serviceItem.id} className="badge">{serviceItem.service?.name}</span>
              ))}
            </div>
            <div className="item-meta">{item.customerPreferences || item.customer?.notes || "No customer notes shared."}</div>
            <div className="badge-row">
              <button type="button" className="secondary-button" onClick={() => updateStatus(item.id, "IN_PROGRESS")}>Start</button>
              <button type="button" onClick={() => updateStatus(item.id, "COMPLETED")}>Complete</button>
            </div>
          </div>
        ))}
        {!rows.length && <EmptyState title="No appointments assigned yet" message="Assigned bookings will show up here when your schedule is populated." />}
      </div>
      )}
    </div>
  );
}
