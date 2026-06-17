import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { getMyWorkspaceTabs } from "../../utils/myWorkspaceTabs";
import { CalendarClock, Clock, Coffee, CalendarOff } from "lucide-react";

export default function MySchedulePage() {
  const { auth } = useAuth();
  const [data, setData] = useState({ schedules: [], breaks: [] });
  const [loading, setLoading] = useState(true);
  const myTabs = getMyWorkspaceTabs(auth?.membership?.permissions || {});

  useEffect(() => {
    api.get("/owner/my-schedule").then((response) => {
      setData(response.data);
      setLoading(false);
    });
  }, []);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-stagger-1 { animation: slideInRight 0.5s ease-out 0.1s both; }
        .anim-stagger-2 { animation: slideInRight 0.5s ease-out 0.2s both; }
        
        .s-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .s-card:hover { transform: translateY(-4px); box-shadow: none; border-color: #cbd5e1; }
        
        .day-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
        .day-row:last-child { border-bottom: none; }
        .day-row:hover { background: #f8fafc; }
      `}</style>

      <ModuleTabs
        title="My Schedule"
        items={myTabs}
      />

      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <CalendarClock size={32} color="#94a3b8" />
            My Schedule
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, maxWidth: 500 }}>Review your personal weekly working hours and protected break windows.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", color: "#cbd5e1", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
          {data.schedules.filter(s => !s.isOffDay).length} ACTIVE DAYS
        </div>
      </div>

      {loading ? <PageLoader title="Loading your schedule" message="Collecting weekly working hours and break windows..." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 32, alignItems: "start" }}>
          
          <div className="s-card anim-stagger-1" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Clock size={20} color="#6366f1" /> Weekly Hours</h3>
            </div>
            <div>
              {data.schedules.map((item) => (
                <div key={item.id} className="day-row">
                  <strong style={{ fontSize: 15, color: "#334155" }}>{days[item.weekday] || `Day ${item.weekday}`}</strong>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: item.isOffDay ? "#94a3b8" : "#0f172a" }}>
                    {item.isOffDay ? <><CalendarOff size={16} /> Off Day</> : <><Clock size={16} color="#6366f1" /> {item.startTime} - {item.endTime}</>}
                  </div>
                </div>
              ))}
              {!data.schedules.length && <div style={{ padding: 40 }}><EmptyState title="No weekly schedule saved" message="Your scheduled working days and hours will appear here once configured by the admin." /></div>}
            </div>
          </div>

          <div className="s-card anim-stagger-2" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Coffee size={20} color="#f59e0b" /> Protected Breaks</h3>
            </div>
            <div>
              {data.breaks.map((item) => (
                <div key={item.id} className="day-row">
                  <strong style={{ fontSize: 15, color: "#334155" }}>{days[item.weekday] || `Day ${item.weekday}`}</strong>
                  <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: "#92400e", background: "#fef3c7", padding: "4px 12px", borderRadius: 12 }}>
                    <Coffee size={14} /> {item.startTime} - {item.endTime}
                  </div>
                </div>
              ))}
              {!data.breaks.length && <div style={{ padding: 40 }}><EmptyState title="No breaks added" message="Protected break times will appear here once they are added to your roster." /></div>}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
