import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { getMyWorkspaceTabs } from "../../utils/myWorkspaceTabs";
import { Calendar, User, Scissors, Bell, Clock, Briefcase, Activity } from "lucide-react";

export default function MyDashboardPage() {
  const { auth } = useAuth();
  const [data, setData] = useState({ todayAppointments: [], recentAppointments: [], assignedServices: [], notifications: [] });
  const [loading, setLoading] = useState(true);
  const myTabs = getMyWorkspaceTabs(auth?.membership?.permissions || {});

  useEffect(() => {
    api.get("/owner/my-dashboard").then((response) => {
      setData(response.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-delay-1 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .anim-delay-2 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .anim-delay-3 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        
        .w-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .w-card:hover { transform: translateY(-4px); box-shadow: none; border-color: #cbd5e1; }
        
        .stat-glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.2); padding: 24px; border-radius: 20px; color: white; display: flex; align-items: center; gap: 16px; }
        .stat-glass h3 { margin: 0; font-size: 32px; font-weight: 800; font-family: monospace; }
        .stat-glass p { margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
        
        .list-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
        .list-row:last-child { border-bottom: none; }
        .list-row:hover { background: #f8fafc; }
        
        .tag { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <ModuleTabs
        title="My Dashboard"
        items={myTabs}
      />

      <div className="anim-delay-1" style={{ background: "linear-gradient(135deg, #4f46e5, #0f172a)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
              <Briefcase size={32} color="#a5b4fc" />
              My Workspace
            </h1>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: 15, maxWidth: 500 }}>Your personalized staff overview. Keep track of your assigned bookings, services, and daily notifications.</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} /> LIVE DASHBOARD
          </div>
        </div>

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <div className="stat-glass">
              <div style={{ background: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 16 }}><Calendar size={24} /></div>
              <div><h3>{data.todayAppointments.length}</h3><p>Today</p></div>
            </div>
            <div className="stat-glass">
              <div style={{ background: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 16 }}><User size={24} /></div>
              <div><h3>{data.recentAppointments.length}</h3><p>Upcoming</p></div>
            </div>
            <div className="stat-glass">
              <div style={{ background: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 16 }}><Bell size={24} /></div>
              <div><h3>{data.notifications.length}</h3><p>Alerts</p></div>
            </div>
          </div>
        )}
      </div>

      {loading ? <PageLoader title="Loading Dashboard" message="Preparing your daily schedule..." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
          
          <div className="w-card anim-delay-2" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Calendar size={20} color="#6366f1" /> Assigned Appointments</h3>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {data.recentAppointments.map((item) => (
                <div key={item.id} className="list-row">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{item.customer?.name || "Walk-in Guest"}</div>
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Clock size={14} /> {new Date(item.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </div>
                  <span className="tag" style={{ background: item.status === "COMPLETED" ? "#dcfce7" : item.status === "PENDING" ? "#fef3c7" : "#f1f5f9", color: item.status === "COMPLETED" ? "#166534" : item.status === "PENDING" ? "#92400e" : "#334155" }}>
                    {item.status}
                  </span>
                </div>
              ))}
              {!data.recentAppointments.length && (
                <div style={{ padding: 40 }}><EmptyState title="No upcoming bookings" message="You have no assigned appointments at the moment." /></div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 32 }}>
            <div className="w-card anim-delay-3" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><Scissors size={18} color="#6366f1" /> My Services</h3>
              </div>
              <div style={{ padding: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(data.assignedServices || []).map((item) => (
                  <span key={item.id} style={{ padding: "8px 14px", background: "#e0e7ff", color: "#4338ca", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>{item.service?.name}</span>
                ))}
                {!data.assignedServices?.length && <div style={{ fontSize: 13, color: "#94a3b8" }}>No services assigned yet.</div>}
              </div>
            </div>

            <div className="w-card anim-delay-3" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><Bell size={18} color="#e11d48" /> Alerts</h3>
                {data.notifications.length > 0 && <span className="tag" style={{ background: "#fee2e2", color: "#991b1b" }}>{data.notifications.length} New</span>}
              </div>
              <div>
                {(data.notifications || []).map((item) => (
                  <div key={item.id} style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 4 }}>{item.action}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{item.appointment?.customer?.name || "System Alert"}</div>
                  </div>
                ))}
                {!data.notifications?.length && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No recent notifications.</div>}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
