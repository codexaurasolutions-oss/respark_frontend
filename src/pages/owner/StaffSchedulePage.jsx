import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const emptySchedule = { userSalonId: "", branchId: "", weekday: 1, startTime: "09:00", endTime: "18:00", isOffDay: false };
const emptyBreak = { userSalonId: "", weekday: 1, startTime: "13:00", endTime: "14:00" };

export default function StaffSchedulePage() {
  const { selectedBranchId, branches: contextBranches } = useBranch();
  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [breakForm, setBreakForm] = useState(emptyBreak);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
    const [scheduleResponse, usersResponse, branchesResponse, availabilityResponse] = await Promise.all([
      api.get("/owner/staff-schedule", { params: branchParams }),
      api.get("/owner/users", { params: branchParams }),
      api.get("/owner/branches"),
      api.get("/owner/staff-availability", { params: branchParams })
    ]);
    setSchedules(scheduleResponse.data);
    setStaff(usersResponse.data);
    setBranches(branchesResponse.data);
    setAvailability(availabilityResponse.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [scheduleResponse, usersResponse, branchesResponse, availabilityResponse] = await Promise.all([
        api.get("/owner/staff-schedule", { params: branchParams }),
        api.get("/owner/users", { params: branchParams }),
        api.get("/owner/branches"),
        api.get("/owner/staff-availability", { params: branchParams })
      ]);
      if (!active) return;
      setSchedules(scheduleResponse.data);
      setStaff(usersResponse.data);
      setBranches(branchesResponse.data);
      setAvailability(availabilityResponse.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [selectedBranchId]);

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Staff Schedule & Availability</h1>
            <p style={{ marginBottom: 0 }}>Configure working hours, break windows, and real-time availability for every team member.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Staff {staff.length}</span>
            <span className="badge">Schedules {schedules.length}</span>
            <span className="badge">Availability {availability.length}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading staff schedule workspace" message="Preparing staff roster, weekly schedules, branches, and availability." /> : <>
      <div className="three-col">
        <div className="panel-card">
          <h3>Weekly Schedule</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            await api.post("/owner/staff-schedule", { ...scheduleForm, weekday: Number(scheduleForm.weekday) });
            setScheduleForm(emptySchedule);
            await reload();
          }} style={{ display: "grid", gap: 10 }}>
            <select value={scheduleForm.userSalonId} onChange={(event) => setScheduleForm((current) => ({ ...current, userSalonId: event.target.value }))}>
              <option value="">Select staff</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.user?.name}</option>)}
            </select>
            <select value={scheduleForm.branchId} onChange={(event) => setScheduleForm((current) => ({ ...current, branchId: event.target.value }))}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <input type="number" min="0" max="6" value={scheduleForm.weekday} onChange={(event) => setScheduleForm((current) => ({ ...current, weekday: event.target.value }))} />
            <input type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))} />
            <input type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))} />
            <label><input type="checkbox" checked={scheduleForm.isOffDay} onChange={(event) => setScheduleForm((current) => ({ ...current, isOffDay: event.target.checked }))} /> Off day</label>
            <button>Save Schedule</button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Breaks</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            await api.post("/owner/staff-breaks", { ...breakForm, weekday: Number(breakForm.weekday) });
            setBreakForm(emptyBreak);
            await reload();
          }} style={{ display: "grid", gap: 10 }}>
            <select value={breakForm.userSalonId} onChange={(event) => setBreakForm((current) => ({ ...current, userSalonId: event.target.value }))}>
              <option value="">Select staff</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.user?.name}</option>)}
            </select>
            <input type="number" min="0" max="6" value={breakForm.weekday} onChange={(event) => setBreakForm((current) => ({ ...current, weekday: event.target.value }))} />
            <input type="time" value={breakForm.startTime} onChange={(event) => setBreakForm((current) => ({ ...current, startTime: event.target.value }))} />
            <input type="time" value={breakForm.endTime} onChange={(event) => setBreakForm((current) => ({ ...current, endTime: event.target.value }))} />
            <button>Add Break</button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Availability</h3>
          <div className="list-stack">
            {availability.map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{item.name}</strong>
                  <span className={`badge ${item.available ? "" : "badge-cancelled"}`}>{item.available ? "Available" : "Blocked"}</span>
                </div>
                <div className="item-meta">{item.reason || item.salonRole}</div>
              </div>
            ))}
            {!availability.length && <EmptyState title="No availability records yet" message="Availability snapshots will show here once staff schedule data is available." />}
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ marginTop: 18 }}>
        <h3>Saved Schedule Rows</h3>
        <div className="list-stack">
          {schedules.map((row) => (
            <div key={row.id} className="list-item">
              <div className="item-head">
                <strong>{row.userSalon?.user?.name}</strong>
                <span className="badge">Day {row.weekday}</span>
              </div>
              <div className="item-meta">{row.branchId ? row.userSalon?.branch?.name : "All branches"} | {row.isOffDay ? "Off day" : `${row.startTime} - ${row.endTime}`}</div>
            </div>
          ))}
          {!schedules.length && <EmptyState title="No saved schedule rows yet" message="Weekly staff schedule entries will appear here once you create them." />}
        </div>
      </div>
      </>}
    </div>
  );
}
