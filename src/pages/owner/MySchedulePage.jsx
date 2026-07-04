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
          { label: "My Commission", to: "/admin/my-commission", hint: "Earnings" },
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
      <div className="two-col">
        <div className="panel-card">
          <h3>Weekly Hours</h3>
          <div className="list-stack">
            {data.schedules.map((item) => (
              <div key={item.id} className="list-item">
                <strong>Day {item.weekday}</strong>
                <div className="item-meta">{item.isOffDay ? "Off day" : `${item.startTime} - ${item.endTime}`}</div>
              </div>
            ))}
            {!data.schedules.length && <EmptyState title="No weekly schedule saved yet" message="Your scheduled working days and hours will appear here once configured." />}
          </div>
        </div>
        <div className="panel-card">
          <h3>Breaks</h3>
          <div className="list-stack">
            {data.breaks.map((item) => (
              <div key={item.id} className="list-item">
                <strong>Day {item.weekday}</strong>
                <div className="item-meta">{item.startTime} - {item.endTime}</div>
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
