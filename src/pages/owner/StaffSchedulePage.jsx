import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const emptySchedule = { userSalonId: "", branchId: "", weekday: 1, startTime: "09:00", endTime: "18:00", isOffDay: false };
const emptyBreak = { userSalonId: "", weekday: 1, startTime: "13:00", endTime: "14:00" };
const defaultAccessControl = { allowRosterOverrides: true };
const defaultRosterSettings = { allowRosterMgtSettings: true };
const defaultShiftTemplates = [];

export default function StaffSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [breakForm, setBreakForm] = useState(emptyBreak);
  const [loading, setLoading] = useState(true);
  const [accessControl, setAccessControl] = useState(defaultAccessControl);
  const [rosterSettings, setRosterSettings] = useState(defaultRosterSettings);
  const [shiftTemplates, setShiftTemplates] = useState(defaultShiftTemplates);

  const reload = async () => {
    const [scheduleResponse, usersResponse, branchesResponse, availabilityResponse, settingsResponse] = await Promise.all([
      api.get("/owner/staff-schedule"),
      api.get("/owner/users"),
      api.get("/owner/branches"),
      api.get("/owner/staff-availability"),
      api.get("/owner/settings")
    ]);
    setSchedules(scheduleResponse.data);
    setStaff(usersResponse.data);
    setBranches(branchesResponse.data);
    setAvailability(availabilityResponse.data);
    setAccessControl({
      ...defaultAccessControl,
      ...(settingsResponse.data?.advancedSettings?.accessControl || {})
    });
    setRosterSettings({
      ...defaultRosterSettings,
      allowRosterMgtSettings: settingsResponse.data?.advancedSettings?.allowRosterMgtSettings !== false
    });
    setShiftTemplates(Array.isArray(settingsResponse.data?.advancedSettings?.shiftManagement?.shifts) ? settingsResponse.data.advancedSettings.shiftManagement.shifts : defaultShiftTemplates);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const [scheduleResponse, usersResponse, branchesResponse, availabilityResponse, settingsResponse] = await Promise.all([
        api.get("/owner/staff-schedule"),
        api.get("/owner/users"),
        api.get("/owner/branches"),
        api.get("/owner/staff-availability"),
        api.get("/owner/settings")
      ]);
      if (!active) return;
      setSchedules(scheduleResponse.data);
      setStaff(usersResponse.data);
      setBranches(branchesResponse.data);
      setAvailability(availabilityResponse.data);
      setAccessControl({
        ...defaultAccessControl,
        ...(settingsResponse.data?.advancedSettings?.accessControl || {})
      });
      setRosterSettings({
        ...defaultRosterSettings,
        allowRosterMgtSettings: settingsResponse.data?.advancedSettings?.allowRosterMgtSettings !== false
      });
      setShiftTemplates(Array.isArray(settingsResponse.data?.advancedSettings?.shiftManagement?.shifts) ? settingsResponse.data.advancedSettings.shiftManagement.shifts : defaultShiftTemplates);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const rosterLocked = accessControl.allowRosterOverrides === false || rosterSettings.allowRosterMgtSettings === false;
  const activeShiftTemplates = shiftTemplates.filter((row) => row?.active !== false);

  const applyShiftToScheduleForm = (shiftId) => {
    const selectedShift = activeShiftTemplates.find((row) => row.id === shiftId);
    if (!selectedShift) return;
    setScheduleForm((current) => ({
      ...current,
      startTime: selectedShift.startTime || current.startTime,
      endTime: selectedShift.endTime || current.endTime,
      isOffDay: false
    }));
    if (selectedShift.breakLabel) {
      setBreakForm((current) => ({
        ...current,
        startTime: current.startTime || "13:00",
        endTime: current.endTime || "14:00"
      }));
    }
  };

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
            <span className={`badge ${rosterLocked ? "badge-cancelled" : ""}`}>{rosterLocked ? "Roster Locked" : "Roster Editable"}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading staff schedule workspace" message="Preparing staff roster, weekly schedules, branches, and availability." /> : <>
      {rosterLocked ? (
        <div className="panel-card" style={{ marginBottom: 18, border: "1px solid #fecaca", background: "#fff7ed" }}>
          <h3 style={{ marginTop: 0, color: "#9a3412" }}>Roster overrides are locked from settings</h3>
          <p style={{ marginBottom: 0, color: "#7c2d12" }}>
            `Settings &rarr; Access Control &rarr; Allow roster overrides` or `Settings &rarr; Shift Management / Roster Management` lock is currently off. Staff schedule rows are still visible here,
            but editing should be managed only after the roster lock is removed.
          </p>
        </div>
      ) : null}
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="item-head">
          <div>
            <h3 style={{ marginTop: 0 }}>Linked Shift Templates</h3>
            <p style={{ marginBottom: 0 }}>
              Ye templates <code>Settings &rarr; Shift Management</code> se aa rahe hain aur yahin se schedule form par apply kiye ja sakte hain.
            </p>
          </div>
          <div className="badge-row">
            <span className="badge">Templates {shiftTemplates.length}</span>
            <span className="badge">Active {activeShiftTemplates.length}</span>
          </div>
        </div>
        <div className="list-stack" style={{ marginTop: 16 }}>
          {activeShiftTemplates.map((shift) => (
            <div key={shift.id} className="list-item">
              <div>
                <strong>{shift.name || "Unnamed Shift"}</strong>
                <div className="item-meta">
                  {shift.startTime || "--:--"} - {shift.endTime || "--:--"}
                  {shift.breakLabel ? ` | Break: ${shift.breakLabel}` : ""}
                  {Array.isArray(shift.days) && shift.days.length ? ` | Days: ${shift.days.join(", ").toUpperCase()}` : ""}
                </div>
              </div>
              <button type="button" className="secondary-button" disabled={rosterLocked} onClick={() => applyShiftToScheduleForm(shift.id)}>
                Apply To Schedule Form
              </button>
            </div>
          ))}
          {!activeShiftTemplates.length && <EmptyState title="No active shift templates" message="Shift templates saved in settings will appear here for direct schedule use." />}
        </div>
      </div>
      <div className="three-col">
        <div className="panel-card">
          <h3>Weekly Schedule</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (rosterLocked) return;
            await api.post("/owner/staff-schedule", { ...scheduleForm, weekday: Number(scheduleForm.weekday) });
            setScheduleForm(emptySchedule);
            await reload();
          }} style={{ display: "grid", gap: 10 }}>
            <select disabled={rosterLocked} value={scheduleForm.userSalonId} onChange={(event) => setScheduleForm((current) => ({ ...current, userSalonId: event.target.value }))}>
              <option value="">Select staff</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.user?.name}</option>)}
            </select>
            <select disabled={rosterLocked} value={scheduleForm.branchId} onChange={(event) => setScheduleForm((current) => ({ ...current, branchId: event.target.value }))}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <input disabled={rosterLocked} type="number" min="0" max="6" value={scheduleForm.weekday} onChange={(event) => setScheduleForm((current) => ({ ...current, weekday: event.target.value }))} />
            <input disabled={rosterLocked} type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))} />
            <input disabled={rosterLocked} type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))} />
            <label><input disabled={rosterLocked} type="checkbox" checked={scheduleForm.isOffDay} onChange={(event) => setScheduleForm((current) => ({ ...current, isOffDay: event.target.checked }))} /> Off day</label>
            <button disabled={rosterLocked}>{rosterLocked ? "Locked by Settings" : "Save Schedule"}</button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Breaks</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (rosterLocked) return;
            await api.post("/owner/staff-breaks", { ...breakForm, weekday: Number(breakForm.weekday) });
            setBreakForm(emptyBreak);
            await reload();
          }} style={{ display: "grid", gap: 10 }}>
            <select disabled={rosterLocked} value={breakForm.userSalonId} onChange={(event) => setBreakForm((current) => ({ ...current, userSalonId: event.target.value }))}>
              <option value="">Select staff</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.user?.name}</option>)}
            </select>
            <input disabled={rosterLocked} type="number" min="0" max="6" value={breakForm.weekday} onChange={(event) => setBreakForm((current) => ({ ...current, weekday: event.target.value }))} />
            <input disabled={rosterLocked} type="time" value={breakForm.startTime} onChange={(event) => setBreakForm((current) => ({ ...current, startTime: event.target.value }))} />
            <input disabled={rosterLocked} type="time" value={breakForm.endTime} onChange={(event) => setBreakForm((current) => ({ ...current, endTime: event.target.value }))} />
            <button disabled={rosterLocked}>{rosterLocked ? "Locked by Settings" : "Add Break"}</button>
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
