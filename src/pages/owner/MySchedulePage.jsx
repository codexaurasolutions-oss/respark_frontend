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
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Schedule</h1>
            <p style={{ marginBottom: 0 }}>Review your weekly hours and protected break windows without leaving your personal workspace.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Hours {data.schedules.length}</span>
            <span className="badge">Breaks {data.breaks.length}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your schedule" message="Collecting weekly working hours and break windows." /> : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Weekly Hours</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {data.schedules.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: item.isOffDay ? "#f8fafc" : "#f0fdfa", border: `1px solid ${item.isOffDay ? "#e2e8f0" : "#ccfbf1"}`, borderRadius: 12 }}>
                <strong style={{ color: item.isOffDay ? "#64748b" : "#0f766e", fontSize: "1rem" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][item.weekday] || `Day ${item.weekday}`}
                </strong>
                <div style={{ color: item.isOffDay ? "#94a3b8" : "#0d9488", fontSize: "0.95rem", fontWeight: 600, background: item.isOffDay ? "#f1f5f9" : "#fff", padding: "4px 12px", borderRadius: 20 }}>
                  {item.isOffDay ? "Off day" : `${item.startTime} - ${item.endTime}`}
                </div>
              </div>
            ))}
            {!data.schedules.length && <EmptyState title="No weekly schedule saved yet" message="Your scheduled working days and hours will appear here once configured." />}
          </div>
        </div>
        
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>Protected Breaks</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {data.breaks.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fef08a", borderRadius: 12 }}>
                <strong style={{ color: "#a16207", fontSize: "1rem" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][item.weekday] || `Day ${item.weekday}`}
                </strong>
                <div style={{ color: "#854d0e", fontSize: "0.95rem", fontWeight: 600, background: "#fff", padding: "4px 12px", borderRadius: 20 }}>
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
