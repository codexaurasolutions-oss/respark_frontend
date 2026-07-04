import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Filter, LogIn, LogOut, RotateCcw, Timer, XCircle, Camera, Building2, CalendarOff } from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const statusColor = (status) => {
  switch (status) {
    case "PRESENT": return { bg: "rgba(34,197,94,0.12)", text: "#166534", border: "rgba(34,197,94,0.25)" };
    case "LATE": return { bg: "rgba(234,179,8,0.12)", text: "#92400e", border: "rgba(234,179,8,0.25)" };
    case "HALF_DAY": return { bg: "rgba(249,115,22,0.12)", text: "#9a3412", border: "rgba(249,115,22,0.25)" };
    case "ABSENT": return { bg: "rgba(239,68,68,0.12)", text: "#991b1b", border: "rgba(239,68,68,0.25)" };
    case "LEAVE": return { bg: "rgba(168,85,247,0.12)", text: "#6b21a8", border: "rgba(168,85,247,0.25)" };
    case "WORKING": return { bg: "rgba(14,165,233,0.12)", text: "#075985", border: "rgba(14,165,233,0.25)" };
    case "COMPLETED_SHIFT": return { bg: "rgba(34,197,94,0.12)", text: "#166534", border: "rgba(34,197,94,0.25)" };
    default: return { bg: "rgba(100,116,139,0.12)", text: "#334155", border: "rgba(100,116,139,0.25)" };
  }
};

const formatTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const formatHours = (minutes) => {
  if (minutes == null) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export default function MyAttendanceHistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ status: "", month: "" });

  useEffect(() => {
    const controller = new AbortController();
    api.get("/owner/my-attendance", { signal: controller.signal })
      .then((res) => {
        setRecords(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(formatApiError(err, "Failed to load attendance history."));
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredRecords = useMemo(() => {
    let rows = [...records];
    if (filter.status) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter.month) {
      rows = rows.filter((r) => {
        const d = new Date(r.attendanceDate || r.checkInAt);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return iso === filter.month;
      });
    }
    return rows;
  }, [records, filter]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "PRESENT" || r.status === "COMPLETED_SHIFT").length;
    const late = filteredRecords.filter((r) => r.status === "LATE").length;
    const absent = filteredRecords.filter((r) => r.status === "ABSENT").length;
    const leave = filteredRecords.filter((r) => r.status === "LEAVE").length;
    const halfDay = filteredRecords.filter((r) => r.status === "HALF_DAY").length;
    const totalMinutes = filteredRecords.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
    return { total, present, late, absent, leave, halfDay, totalMinutes };
  }, [filteredRecords]);

  const months = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      const d = new Date(r.attendanceDate || r.checkInAt);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Attendance"
        description="View your personal attendance history, check-in/check-out times, and working hours."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Overview" },
          { label: "My Attendance", to: "/admin/my-attendance", hint: "History" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Bookings" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20, background: "linear-gradient(135deg, rgba(14,165,233,0.10), rgba(59,130,246,0.08), rgba(255,255,255,0.92))" }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Attendance</h1>
            <p style={{ marginBottom: 0 }}>Your personal attendance history with check-in/check-out times and working hours.</p>
          </div>
          <div className="badge-row">
            <span className="badge"><CalendarDays size={13} /> Total {stats.total}</span>
            <span className="badge"><CheckCircle2 size={13} /> Present {stats.present}</span>
            <span className="badge"><Clock size={13} /> Hours {formatHours(stats.totalMinutes)}</span>
          </div>
        </div>
      </div>
      {error ? <div style={{ padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, rgba(254,226,226,0.95), rgba(254,202,202,0.92))", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b", fontSize: 13, marginBottom: 14 }}>{error}</div> : null}
      {loading ? <PageLoader title="Loading attendance history" message="Fetching your check-in and check-out records." /> : (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="stat-card"><div className="stat-label"><CalendarDays size={14} /> Total Days</div><div className="stat-value">{stats.total}</div></div>
            <div className="stat-card"><div className="stat-label"><CheckCircle2 size={14} /> Present</div><div className="stat-value" style={{ color: "#166534" }}>{stats.present}</div></div>
            <div className="stat-card"><div className="stat-label"><Clock size={14} /> Late</div><div className="stat-value" style={{ color: "#92400e" }}>{stats.late}</div></div>
            <div className="stat-card"><div className="stat-label"><Timer size={14} /> Half Day</div><div className="stat-value" style={{ color: "#9a3412" }}>{stats.halfDay}</div></div>
            <div className="stat-card"><div className="stat-label"><XCircle size={14} /> Absent</div><div className="stat-value" style={{ color: "#991b1b" }}>{stats.absent}</div></div>
            <div className="stat-card"><div className="stat-label"><CalendarOff size={14} /> On Leave</div><div className="stat-value" style={{ color: "#6b21a8" }}>{stats.leave}</div></div>
            <div className="stat-card"><div className="stat-label"><Clock size={14} /> Total Hours</div><div className="stat-value">{formatHours(stats.totalMinutes)}</div></div>
          </div>
          <div className="panel-card" style={{ marginTop: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}><Filter size={13} /> Status</label>
                <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
                  <option value="">All</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                  <option value="WORKING">Working</option>
                  <option value="COMPLETED_SHIFT">Completed Shift</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={13} /> Month</label>
                <select value={filter.month} onChange={(e) => setFilter((f) => ({ ...f, month: e.target.value }))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
                  <option value="">All</option>
                  {months.map((m) => {
                    const [y, mo] = m.split("-");
                    const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                    return <option key={m} value={m}>{label}</option>;
                  })}
                </select>
              </div>
              {(filter.status || filter.month) && (
                <button type="button" className="secondary-button" onClick={() => setFilter({ status: "", month: "" })} style={{ fontSize: 12, padding: "5px 10px" }}>
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>
          </div>
          <div className="panel-card" style={{ overflow: "hidden" }}>
            <h3 style={{ marginTop: 0 }}>Attendance Records</h3>
            <div className="list-stack">
              {filteredRecords.map((row) => {
                const sc = statusColor(row.status);
                return (
                  <div key={row.id} className="list-item" style={{ borderLeft: `3px solid ${sc.border}` }}>
                    <div className="item-head">
                      <div>
                        <strong style={{ fontSize: 14 }}>{formatDate(row.attendanceDate || row.checkInAt)}</strong>
                        <div className="item-meta" style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Building2 size={12} /> {row.branch?.name || "No branch"}</div>
                      </div>
                      <span className="badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{row.status.replace(/_/g, " ")}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 10 }}>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}><LogIn size={11} /> Check In</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{formatTime(row.checkInAt)}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: row.checkOutAt ? "rgba(239,68,68,0.06)" : "rgba(100,116,139,0.06)", border: row.checkOutAt ? "1px solid rgba(239,68,68,0.12)" : "1px solid rgba(100,116,139,0.12)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: row.checkOutAt ? "#991b1b" : "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}><LogOut size={11} /> Check Out</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{formatTime(row.checkOutAt)}</div>
                      </div>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.12)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#075985", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> Working Hours</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{formatHours(row.workedMinutes)}</div>
                      </div>
                      {row.overtimeMinutes > 0 && (
                        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}><Timer size={11} /> Overtime</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>{formatHours(row.overtimeMinutes)}</div>
                        </div>
                      )}
                    </div>
                    {row.checkInSelfieUrl || row.checkOutSelfieUrl ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        {row.checkInSelfieUrl && <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Camera size={11} /> Check-in selfie captured</span>}
                        {row.checkOutSelfieUrl && <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Camera size={11} /> Check-out selfie captured</span>}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!filteredRecords.length && <EmptyState title="No attendance records found" message={filter.status || filter.month ? "No records match your filters. Try adjusting the filters." : "Your check-in and check-out history will appear here once you start marking attendance."} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
