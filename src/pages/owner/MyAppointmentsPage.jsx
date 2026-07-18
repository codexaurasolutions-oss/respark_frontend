import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function MyAppointmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setError("");
      const response = await api.get("/owner/my-appointments");
      if (!active) return;
      setRows(response.data);
      setLoading(false);
    })().catch((err) => { setError("Could not load appointments. Please try again."); setLoading(false); });
    return () => {
      active = false;
    };
  }, []);

  const [updatingId, setUpdatingId] = useState(null);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.patch(`/owner/appointments/${id}/status`, { status });
      const response = await api.get("/owner/my-appointments");
      setRows(response.data);
    } catch (err) {
      alert("Failed to update appointment status.");
    } finally {
      setUpdatingId(null);
    }
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
      error ? (
        <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", marginBottom: 16 }}>{error}</div>
      ) : (
      <div style={{ display: "grid", gap: 16 }}>
        {rows.map((item) => {
          const statusColors = {
            SCHEDULED: { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
            IN_PROGRESS: { bg: "#fef9c3", color: "#a16207", border: "#fde047" },
            COMPLETED: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
            CANCELLED: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" }
          };
          const sc = statusColors[item.status] || statusColors.SCHEDULED;

          return (
            <div key={item.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.03)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", color: "#0f172a" }}>{item.customer?.name}</h3>
                  <div style={{ color: "#64748b", fontSize: "0.9rem", display: "flex", gap: 8, alignItems: "center" }}>
                    <span>📍 {item.branch?.name || "Branch"}</span>
                    <span>•</span>
                    <span>🕒 {new Date(item.startAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: "4px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 700, letterSpacing: 0.5 }}>
                  {item.status}
                </span>
              </div>
              
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>Services Requested</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(item.items || []).map((serviceItem) => (
                    <span key={serviceItem.id} style={{ background: "#fff", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: 6, fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
                      {serviceItem.service?.name}
                    </span>
                  ))}
                </div>
              </div>

              {(item.customerPreferences || item.customer?.notes) && (
                <div style={{ background: "#fffbeb", border: "1px solid #fef08a", padding: "12px 16px", borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: "0.85rem", color: "#a16207", fontWeight: 700, marginBottom: 4 }}>Customer Note</div>
                  <div style={{ color: "#854d0e", fontSize: "0.9rem" }}>{item.customerPreferences || item.customer?.notes}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <button 
                  type="button" 
                  disabled={updatingId === item.id || item.status === "IN_PROGRESS" || item.status === "COMPLETED"} 
                  onClick={() => updateStatus(item.id, "IN_PROGRESS")}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: item.status === "SCHEDULED" ? "#3b82f6" : "#f1f5f9", color: item.status === "SCHEDULED" ? "#fff" : "#94a3b8", border: "none", fontWeight: 600, cursor: item.status === "SCHEDULED" ? "pointer" : "not-allowed" }}
                >
                  {updatingId === item.id ? "Updating..." : "Start Service"}
                </button>
                <button 
                  type="button" 
                  disabled={updatingId === item.id || item.status === "COMPLETED"} 
                  onClick={() => updateStatus(item.id, "COMPLETED")}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, background: item.status === "IN_PROGRESS" ? "#10b981" : "#f1f5f9", color: item.status === "IN_PROGRESS" ? "#fff" : "#94a3b8", border: "none", fontWeight: 600, cursor: item.status === "IN_PROGRESS" || item.status === "SCHEDULED" ? "pointer" : "not-allowed" }}
                >
                  {updatingId === item.id ? "Updating..." : "Mark Completed"}
                </button>
              </div>
            </div>
          );
        })}
        {!rows.length && <EmptyState title="No appointments assigned yet" message="Assigned bookings will show up here when your schedule is populated." />}
      </div>
      ))}
    </div>
  );
}
