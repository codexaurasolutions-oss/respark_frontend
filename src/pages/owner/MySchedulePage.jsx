import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function MySchedulePage() {
  const [data, setData] = useState({ schedules: [], breaks: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/owner/my-schedule").then((response) => {
      setData(response.data);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Schedule"
        description="Your working hours and break windows are scoped to your own membership."
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
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>My Schedule</h1>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>Review your weekly hours and protected break windows without leaving your personal workspace.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <span style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(59,130,246,0.3)" }}>
              🕒 Hours: {data.schedules.length}
            </span>
            <span style={{ background: "rgba(245,158,11,0.2)", color: "#fcd34d", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(245,158,11,0.3)" }}>
              ☕ Breaks: {data.breaks.length}
            </span>
          </div>
        </div>
      </div>

      {loading ? <PageLoader title="Loading your schedule" message="Collecting weekly working hours and break windows." /> : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {/* Weekly Hours Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📅</span> Weekly Hours
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 13 }}>Your recurring roster shifts and active duty times</p>
          
          <div style={{ display: "grid", gap: 12 }}>
            {data.schedules.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: item.isOffDay ? "#f8fafc" : "#f0fdfa", border: `1px solid ${item.isOffDay ? "#e2e8f0" : "#bbf7d0"}`, borderRadius: 12 }}>
                <strong style={{ color: item.isOffDay ? "#64748b" : "#166534", fontSize: "0.95rem" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][item.weekday] || `Day ${item.weekday}`}
                </strong>
                <div style={{ color: item.isOffDay ? "#94a3b8" : "#15803d", fontSize: "0.9rem", fontWeight: 700, background: item.isOffDay ? "#f1f5f9" : "#fff", padding: "4px 12px", borderRadius: 20, boxShadow: item.isOffDay ? "none" : "0 2px 4px rgba(22,101,52,0.05)" }}>
                  {item.isOffDay ? "Off Day" : `${item.startTime} - ${item.endTime}`}
                </div>
              </div>
            ))}
            {!data.schedules.length && <EmptyState title="No weekly schedule saved yet" message="Your scheduled working days and hours will appear here once configured." />}
          </div>
        </div>
        
        {/* Protected Breaks Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)" }}>
          <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <span>☕</span> Protected Breaks
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 13 }}>Scheduled rest intervals when booking is blocked</p>
          
          <div style={{ display: "grid", gap: 12 }}>
            {data.breaks.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#fffbeb", border: "1px solid #fef08a", borderRadius: 12 }}>
                <strong style={{ color: "#a16207", fontSize: "0.95rem" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][item.weekday] || `Day ${item.weekday}`}
                </strong>
                <div style={{ color: "#854d0e", fontSize: "0.9rem", fontWeight: 700, background: "#fff", padding: "4px 12px", borderRadius: 20, boxShadow: "0 2px 4px rgba(161,98,7,0.05)" }}>
                  {item.startTime} - {item.endTime}
                </div>
              </div>
            ))}
            {!data.breaks.length && <EmptyState title="No break windows yet" message="Protected break times will appear here once they are added to your roster." />}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
