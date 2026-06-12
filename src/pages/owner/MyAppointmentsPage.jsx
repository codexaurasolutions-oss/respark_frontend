import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { CalendarCheck, Clock, MapPin, User, Scissors, CheckCircle, PlayCircle } from "lucide-react";

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
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-stagger:nth-child(1) { animation: slideIn 0.4s ease-out 0.1s both; }
        .anim-stagger:nth-child(2) { animation: slideIn 0.4s ease-out 0.2s both; }
        .anim-stagger:nth-child(3) { animation: slideIn 0.4s ease-out 0.3s both; }
        .anim-stagger:nth-child(4) { animation: slideIn 0.4s ease-out 0.4s both; }
        .anim-stagger:nth-child(5) { animation: slideIn 0.4s ease-out 0.5s both; }

        .app-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; gap: 16px; }
        .app-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: #cbd5e1; }
        
        .app-btn { padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; }
        .btn-start { background: #e0e7ff; color: #4338ca; }
        .btn-start:hover { background: #c7d2fe; }
        .btn-complete { background: #dcfce7; color: #166534; }
        .btn-complete:hover { background: #bbf7d0; }
        
        .status-pill { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <ModuleTabs
        title="My Appointments"
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard" },
          { label: "My Appointments", to: "/admin/my-appointments" },
          { label: "My Schedule", to: "/admin/my-schedule" },
          { label: "My Commission", to: "/admin/my-commission" },
          { label: "My Payroll", to: "/admin/my-payroll" },
          { label: "My Profile", to: "/admin/my-profile" }
        ]}
      />

      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarCheck size={32} color="#818cf8" />
            My Appointments
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, maxWidth: 500 }}>Manage your daily assigned bookings, update statuses, and view customer preferences directly from your workspace.</p>
        </div>
        <div style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
          {rows.length} BOOKINGS
        </div>
      </div>

      {loading ? <PageLoader title="Loading your appointments" message="Syncing your schedule..." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 24 }}>
          {rows.map((item) => (
            <div key={item.id} className="app-card anim-stagger">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><User size={18} color="#64748b" /> {item.customer?.name || "Walk-in Guest"}</h3>
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Clock size={14} /> {new Date(item.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><MapPin size={14} /> {item.branch?.name || "Main Branch"}</div>
                </div>
                <span className="status-pill" style={{ background: item.status === "COMPLETED" ? "#dcfce7" : item.status === "IN_PROGRESS" ? "#e0e7ff" : item.status === "PENDING" ? "#fef3c7" : "#f1f5f9", color: item.status === "COMPLETED" ? "#166534" : item.status === "IN_PROGRESS" ? "#4338ca" : item.status === "PENDING" ? "#92400e" : "#334155" }}>
                  {item.status.replace("_", " ")}
                </span>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px dashed #cbd5e1" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Scissors size={14} /> Assigned Services</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(item.items || []).map((serviceItem) => (
                    <span key={serviceItem.id} style={{ background: "white", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#334155", border: "1px solid #e2e8f0" }}>{serviceItem.service?.name}</span>
                  ))}
                  {!(item.items || []).length && <span style={{ fontSize: 12, color: "#94a3b8" }}>No specific services tagged.</span>}
                </div>
                
                {(item.customerPreferences || item.customer?.notes) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
                    <strong>Note:</strong> {item.customerPreferences || item.customer?.notes}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
                {item.status !== "IN_PROGRESS" && item.status !== "COMPLETED" && (
                  <button className="app-btn btn-start" onClick={() => updateStatus(item.id, "IN_PROGRESS")}><PlayCircle size={18} /> Start Service</button>
                )}
                {item.status !== "COMPLETED" && (
                  <button className="app-btn btn-complete" onClick={() => updateStatus(item.id, "COMPLETED")}><CheckCircle size={18} /> Complete</button>
                )}
              </div>
            </div>
          ))}
          {!rows.length && (
            <div style={{ gridColumn: "1/-1" }}>
              <EmptyState title="No appointments assigned" message="You have no bookings assigned to you today. Enjoy your free time or check back later." />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
