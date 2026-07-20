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
      
      {/* Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)",
        borderRadius: 20,
        padding: "32px 36px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,92,246,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, right: 80, width: 160, height: 160, borderRadius: "50%", background: "rgba(59,130,246,0.06)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>My Appointments</h1>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>Work only on bookings assigned to you, with quick start and completion actions.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <span style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(59,130,246,0.3)" }}>
              📅 Assigned: {rows.length}
            </span>
          </div>
        </div>
      </div>

      {loading ? <PageLoader title="Loading your appointments" message="Preparing your assigned bookings and service breakdown." /> : (
      error ? (
        <div style={{ padding: "16px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, color: "#dc2626", fontWeight: 600, fontSize: 14, marginBottom: 24 }}>{error}</div>
      ) : (
      <div style={{ display: "grid", gap: 20 }}>
        {rows.map((item) => {
          const statusColors = {
            SCHEDULED: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Scheduled" },
            IN_PROGRESS: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "In Progress" },
            COMPLETED: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", label: "Completed" },
            CANCELLED: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", label: "Cancelled" }
          };
          const sc = statusColors[item.status] || statusColors.SCHEDULED;

          return (
            <div key={item.id} style={{ background: "#fff", border: "1px solid rgba(226, 232, 240, 0.8)", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: 18, transition: "transform 0.2s, box-shadow 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.03)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{item.customer?.name}</h3>
                  <div style={{ color: "#64748b", fontSize: 13, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>📍 {item.branch?.name || "Branch"}</span>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#475569" }}>🕒 {new Date(item.startAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {sc.label}
                </span>
              </div>
              
              <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>Services Requested</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(item.items || []).map((serviceItem) => (
                    <span key={serviceItem.id} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: 8, fontSize: 13, color: "#334155", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                      {serviceItem.service?.name}
                    </span>
                  ))}
                </div>
              </div>

              {(item.customerPreferences || item.customer?.notes) && (
                <div style={{ background: "#fffbeb", border: "1px solid #fef08a", padding: "16px 20px", borderRadius: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 11, color: "#a16207", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Customer Note</div>
                  <div style={{ color: "#854d0e", fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{item.customerPreferences || item.customer?.notes}</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12, borderTop: "1px dashed #e2e8f0", paddingTop: 18 }}>
                <button 
                  type="button" 
                  disabled={updatingId === item.id || item.status === "IN_PROGRESS" || item.status === "COMPLETED"} 
                  onClick={() => updateStatus(item.id, "IN_PROGRESS")}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, background: item.status === "SCHEDULED" ? "#3b82f6" : "#f1f5f9", color: item.status === "SCHEDULED" ? "#fff" : "#94a3b8", border: "none", fontWeight: 700, fontSize: 14, cursor: item.status === "SCHEDULED" ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: item.status === "SCHEDULED" ? "0 4px 12px rgba(59,130,246,0.2)" : "none" }}
                >
                  {updatingId === item.id && item.status === "SCHEDULED" ? "Starting..." : "Start Service"}
                </button>
                <button 
                  type="button" 
                  disabled={updatingId === item.id || item.status === "COMPLETED"} 
                  onClick={() => updateStatus(item.id, "COMPLETED")}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, background: item.status === "IN_PROGRESS" ? "#10b981" : "#f1f5f9", color: item.status === "IN_PROGRESS" ? "#fff" : "#94a3b8", border: "none", fontWeight: 700, fontSize: 14, cursor: item.status === "IN_PROGRESS" || item.status === "SCHEDULED" ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: item.status === "IN_PROGRESS" ? "0 4px 12px rgba(16,185,129,0.2)" : "none" }}
                >
                  {updatingId === item.id && item.status === "IN_PROGRESS" ? "Completing..." : "Mark Completed"}
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
