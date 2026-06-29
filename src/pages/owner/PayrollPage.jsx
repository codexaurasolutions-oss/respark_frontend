import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

const emptyRun = {
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: new Date().toISOString().slice(0, 10),
  notes: ""
};

const emptyAttendanceSettings = {
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  lateAfterTime: "09:15",
  halfDayMinutes: 240,
  minimumWorkingMinutes: 480,
  checkoutSelfieRequired: false,
  allowManualAttendanceEdits: true
};
const emptyAttendanceReport = {
  period: "daily",
  label: "Daily",
  start: null,
  end: null,
  rows: [],
  summary: { totalRows: 0, totalStaff: 0, present: 0, absent: 0, leave: 0, late: 0, halfDay: 0, working: 0, completedShift: 0 }
};

const emptyAttendanceCalendar = {
  period: "monthly",
  label: "Monthly",
  start: null,
  end: null,
  rows: [],
  summary: { totalRows: 0, totalStaff: 0, present: 0, absent: 0, leave: 0, late: 0, halfDay: 0, working: 0, completedShift: 0 }
};

const emptyManualEdit = {
  attendanceDate: "",
  checkInAt: "",
  checkOutAt: "",
  status: "",
  note: "",
  adminRemark: "",
  reason: ""
};

const emptyManualCreate = {
  userSalonId: "",
  attendanceDate: new Date().toISOString().slice(0, 10),
  checkInAt: "",
  checkOutAt: "",
  status: "",
  note: "",
  adminRemark: ""
};

const toLocalDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const toLocalDateTimeInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";
const toMonthInput = (value) => {
  const date = value ? new Date(value) : new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const statusTheme = {
  PRESENT: { label: "P", bg: "#dcfce7", color: "#166534" },
  LATE: { label: "L", bg: "#fef3c7", color: "#92400e" },
  HALF_DAY: { label: "H", bg: "#fde68a", color: "#854d0e" },
  ABSENT: { label: "A", bg: "#fee2e2", color: "#b91c1c" },
  LEAVE: { label: "LV", bg: "#dbeafe", color: "#1d4ed8" },
  WORKING: { label: "W", bg: "#cffafe", color: "#0f766e" },
  COMPLETED_SHIFT: { label: "C", bg: "#e9d5ff", color: "#6d28d9" },
  OFF: { label: "-", bg: "#f8fafc", color: "#64748b" }
};

const attendanceMetricKeys = ["present", "late", "halfDay", "absent", "leave", "working", "completedShift"];
const attendanceMetricLabel = {
  present: "Present",
  late: "Late",
  halfDay: "Half Day",
  absent: "Absent",
  leave: "Leave",
  working: "Working",
  completedShift: "Completed"
};

const toIsoDateFromMonthDay = (monthValue, day) => `${monthValue}-${String(day).padStart(2, "0")}`;

export default function PayrollPage() {
  const location = useLocation();
  const { selectedBranchId, selectedBranchName } = useBranch();
  const [runs, setRuns] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [report, setReport] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalStaff: 0, presentToday: 0, absentToday: 0, lateStaff: 0, currentlyWorking: 0, completedShift: 0, onLeave: 0 });
  const [attendanceSettings, setAttendanceSettings] = useState(emptyAttendanceSettings);
  const [attendanceReport, setAttendanceReport] = useState(emptyAttendanceReport);
  const [attendanceReportPeriod, setAttendanceReportPeriod] = useState("daily");
  const [attendanceCalendarMonth, setAttendanceCalendarMonth] = useState(() => toMonthInput());
  const [attendanceCalendar, setAttendanceCalendar] = useState(emptyAttendanceCalendar);
  const [staffUsers, setStaffUsers] = useState([]);
  const [attendanceDaySheet, setAttendanceDaySheet] = useState([]);
  const [filters, setFilters] = useState({ payrollStatus: "", attendanceQ: "", attendanceStatus: "", attendanceDate: "", leaveStatus: "", leaveQ: "", incentiveQ: "" });
  const [form, setForm] = useState(emptyRun);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [manualEdit, setManualEdit] = useState(emptyManualEdit);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualCreate, setManualCreate] = useState(emptyManualCreate);
  const [manualCreateSaving, setManualCreateSaving] = useState(false);
  const [selectedCalendarCell, setSelectedCalendarCell] = useState(null);
  const manualCreateRef = useRef(null);
  const detailPanelRef = useRef(null);

  const mode = location.pathname.includes("/attendance")
    ? "attendance"
    : location.pathname.includes("/leaves")
      ? "leaves"
      : location.pathname.includes("/incentives")
        ? "incentives"
        : location.pathname.includes("/staff-performance")
          ? "performance"
          : "payroll";

  const load = useCallback(async () => {
    try {
      const calendarDate = `${attendanceCalendarMonth}-01`;
      const [runResponse, attendanceResponse, leaveResponse, incentiveResponse, reportResponse, summaryResponse, settingsResponse, staffUsersResponse, daySheetResponse, attendanceReportResponse, attendanceCalendarResponse] = await Promise.all([
        api.get("/owner/payroll", { params: { ...(filters.payrollStatus ? { status: filters.payrollStatus } : {}), ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/attendance", {
          params: {
            ...(filters.attendanceQ ? { q: filters.attendanceQ } : {}),
            ...(filters.attendanceStatus ? { status: filters.attendanceStatus } : {}),
            ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}),
            ...(selectedBranchId ? { branchId: selectedBranchId } : {})
          }
        }),
        api.get("/owner/leaves", { params: { ...(filters.leaveStatus ? { status: filters.leaveStatus } : {}), ...(filters.leaveQ ? { q: filters.leaveQ } : {}), ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/incentives", { params: { ...(filters.incentiveQ ? { q: filters.incentiveQ } : {}), ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/payroll/reports", { params: { ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/attendance/summary", { params: { ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}), ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/attendance/settings"),
        api.get("/owner/staff-users", { params: { ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/attendance/day-sheet", { params: { ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}), ...(selectedBranchId ? { branchId: selectedBranchId } : {}) } }),
        api.get("/owner/attendance/reports", {
          params: {
            period: attendanceReportPeriod,
            ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}),
            ...(selectedBranchId ? { branchId: selectedBranchId } : {})
          }
        }),
        api.get("/owner/attendance/reports", {
          params: {
            period: "monthly",
            date: calendarDate,
            ...(selectedBranchId ? { branchId: selectedBranchId } : {})
          }
        })
      ]);
      setRuns(runResponse.data || []);
      setAttendance(attendanceResponse.data || []);
      setLeaves(leaveResponse.data || []);
      setIncentives(incentiveResponse.data || []);
      setReport(reportResponse.data?.rows || []);
      setAttendanceSummary(summaryResponse.data || {});
      setAttendanceSettings((current) => ({ ...current, ...(settingsResponse.data || {}) }));
      setStaffUsers(staffUsersResponse.data || []);
      setAttendanceDaySheet(daySheetResponse.data?.rows || []);
      setAttendanceReport(attendanceReportResponse.data || emptyAttendanceReport);
      setAttendanceCalendar(attendanceCalendarResponse.data || emptyAttendanceCalendar);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load payroll workspace"), success: "" });
      setLoading(false);
    }
  }, [attendanceCalendarMonth, attendanceReportPeriod, filters, selectedBranchId]);

  const downloadAttendanceReport = (format) => {
    const searchParams = new URLSearchParams({
      period: attendanceReportPeriod,
      ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {})
    });
    window.open(`/api/v1/owner/attendance/reports/export.${format}?${searchParams.toString()}`, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const selectedAttendanceRow = useMemo(
    () => attendance.find((row) => row.id === selectedAttendanceId) || null,
    [attendance, selectedAttendanceId]
  );
  const attendanceCalendarDays = useMemo(() => {
    const [year, month] = attendanceCalendarMonth.split("-").map(Number);
    const total = new Date(year, month, 0).getDate();
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [attendanceCalendarMonth]);
  const attendanceCalendarWeekendMap = useMemo(() => {
    const [year, month] = attendanceCalendarMonth.split("-").map(Number);
    return Object.fromEntries(
      attendanceCalendarDays.map((day) => {
        const dow = new Date(year, month - 1, day).getDay();
        return [day, dow === 0 || dow === 6];
      })
    );
  }, [attendanceCalendarDays, attendanceCalendarMonth]);
  const attendanceCalendarRows = useMemo(() => {
    const bucket = new Map();
    (attendanceCalendar.rows || []).forEach((row) => {
      if (!row?.staffCode || !row?.date) return;
      const date = new Date(row.date);
      const day = date.getDate();
      if (!bucket.has(row.staffCode)) {
        bucket.set(row.staffCode, {
          staffCode: row.staffCode,
          staffName: row.staffName,
          branchName: row.branchName,
          cells: {},
          totals: {
            present: 0,
            late: 0,
            halfDay: 0,
            absent: 0,
            leave: 0,
            working: 0,
            completedShift: 0
          }
        });
      }
      const staffRow = bucket.get(row.staffCode);
      staffRow.cells[day] = row;
      if (row.status === "PRESENT") staffRow.totals.present += 1;
      if (row.status === "LATE") staffRow.totals.late += 1;
      if (row.status === "HALF_DAY") staffRow.totals.halfDay += 1;
      if (row.status === "ABSENT") staffRow.totals.absent += 1;
      if (row.status === "LEAVE") staffRow.totals.leave += 1;
      if (row.status === "WORKING") staffRow.totals.working += 1;
      if (row.status === "COMPLETED_SHIFT") staffRow.totals.completedShift += 1;
    });
    return Array.from(bucket.values()).sort((left, right) => left.staffName.localeCompare(right.staffName));
  }, [attendanceCalendar.rows]);

  const loadAttendanceDetail = async (attendanceId) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/owner/attendance/records/${attendanceId}`);
      setSelectedAttendanceId(attendanceId);
      setSelectedAttendance(response.data);
      setManualEdit({
        attendanceDate: toLocalDateInput(response.data.attendanceDate),
        checkInAt: toLocalDateTimeInput(response.data.checkInAt),
        checkOutAt: toLocalDateTimeInput(response.data.checkOutAt),
        status: response.data.status || "",
        note: response.data.note || "",
        adminRemark: response.data.adminRemark || "",
        reason: ""
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load attendance details"), success: "" });
    } finally {
      setDetailLoading(false);
    }
  };

  const createRun = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/payroll", form);
      setForm(emptyRun);
      setStatus({ error: "", success: "Payroll run created." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create payroll run"), success: "" });
    }
  };

  const saveAttendanceSettings = async (event) => {
    event.preventDefault();
    try {
      setSettingsSaving(true);
      await api.post("/owner/attendance/settings", {
        ...attendanceSettings,
        halfDayMinutes: Number(attendanceSettings.halfDayMinutes),
        minimumWorkingMinutes: Number(attendanceSettings.minimumWorkingMinutes)
      });
      setStatus({ error: "", success: "Attendance settings updated." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save attendance settings"), success: "" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveManualEdit = async (event) => {
    event.preventDefault();
    if (!selectedAttendance) return;
    try {
      setManualSaving(true);
      await api.patch(`/owner/attendance/${selectedAttendance.id}/manual-update`, {
        attendanceDate: manualEdit.attendanceDate || undefined,
        checkInAt: manualEdit.checkInAt || undefined,
        checkOutAt: manualEdit.checkOutAt || undefined,
        status: manualEdit.status || undefined,
        note: manualEdit.note || undefined,
        adminRemark: manualEdit.adminRemark || undefined,
        reason: manualEdit.reason
      });
      setStatus({ error: "", success: "Attendance record updated with audit trail." });
      await load();
      await loadAttendanceDetail(selectedAttendance.id);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update attendance record"), success: "" });
    } finally {
      setManualSaving(false);
    }
  };

  const saveManualCreate = async (event) => {
    event.preventDefault();
    try {
      setManualCreateSaving(true);
      await api.post("/owner/attendance", {
        userSalonId: manualCreate.userSalonId,
        branchId: selectedBranchId || undefined,
        attendanceDate: manualCreate.attendanceDate,
        checkInAt: manualCreate.checkInAt || undefined,
        checkOutAt: manualCreate.checkOutAt || undefined,
        status: manualCreate.status || undefined,
        adminRemark: manualCreate.adminRemark || undefined,
        note: manualCreate.note || undefined,
        verificationMethod: "MANUAL"
      });
      setStatus({ error: "", success: "Manual attendance entry created." });
      setManualCreate((current) => ({ ...emptyManualCreate, attendanceDate: current.attendanceDate }));
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create manual attendance"), success: "" });
    } finally {
      setManualCreateSaving(false);
    }
  };

  const openManualCorrectionFromCell = async () => {
    if (!selectedCalendarCell) return;
    const attendanceId = selectedCalendarCell.record?.attendanceId;
    if (attendanceId) {
      await loadAttendanceDetail(attendanceId);
      setSelectedCalendarCell(null);
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return;
    }

    setManualCreate((current) => ({
      ...current,
      userSalonId: selectedCalendarCell.staffCode,
      attendanceDate: selectedCalendarCell.record?.date
        ? new Date(selectedCalendarCell.record.date).toISOString().slice(0, 10)
        : toIsoDateFromMonthDay(attendanceCalendarMonth, selectedCalendarCell.day),
      status: selectedCalendarCell.record?.status === "ABSENT" ? "ABSENT" : ""
    }));
    setSelectedCalendarCell(null);
    setTimeout(() => {
      manualCreateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const printAttendanceDaySheet = () => {
    const targetDate = filters.attendanceDate || new Date().toISOString().slice(0, 10);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!printWindow) return;
    const rowsHtml = attendanceDaySheet.map((row) => `
      <tr>
        <td>${row.staffName || "-"}</td>
        <td>${row.branchName || "-"}</td>
        <td>${row.status || "-"}</td>
        <td>${row.checkInAt ? new Date(row.checkInAt).toLocaleString() : "No check-in"}</td>
        <td>${row.checkOutAt ? new Date(row.checkOutAt).toLocaleString() : "No check-out"}</td>
      </tr>
    `).join("");
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Sheet - ${targetDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #eff6ff; }
          </style>
        </head>
        <body>
          <h1>Branch Attendance Sheet</h1>
          <p>Branch: ${selectedBranchName || "All Branches"} | Date: ${targetDate}</p>
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Check-Out</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="5">No attendance rows available.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadCalendarExport = (format) => {
    const searchParams = new URLSearchParams({
      period: "monthly",
      date: `${attendanceCalendarMonth}-01`,
      ...(selectedBranchId ? { branchId: selectedBranchId } : {})
    });
    window.open(`/api/v1/owner/attendance/reports/export.${format}?${searchParams.toString()}`, "_blank", "noopener,noreferrer");
  };

  const downloadDaySheetExport = (format) => {
    const searchParams = new URLSearchParams({
      period: "daily",
      date: filters.attendanceDate || new Date().toISOString().slice(0, 10),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {})
    });
    window.open(`/api/v1/owner/attendance/reports/export.${format}?${searchParams.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Payroll & Attendance"
        description="Attendance, leaves, incentive rules, payroll runs and staff performance."
        items={[
          { label: "Payroll", to: "/admin/payroll" },
          { label: "Attendance", to: "/admin/attendance" },
          { label: "Leaves", to: "/admin/leaves" },
          { label: "Incentives", to: "/admin/incentives" },
          { label: "Performance", to: "/admin/staff-performance" }
        ]}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      {mode === "payroll" && (
        <div className="panel-card">
          <h3>Create Payroll Run</h3>
          {loading ? <PageLoader compact title="Loading payroll workspace" message="Preparing payroll runs, attendance, leaves, incentives, and team-cost reporting." /> : null}
          <form className="form-grid" onSubmit={createRun}>
            <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} max={form.periodEnd || undefined} />
            <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} min={form.periodStart || undefined} />
            <label>
              <span className="muted">Notes</span>
              <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <button>Create Run</button>
          </form>
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              <span className="muted">Payroll statuses</span>
              <select value={filters.payrollStatus} onChange={(e) => setFilters((current) => ({ ...current, payrollStatus: e.target.value }))}>
                <option value="">All payroll statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CALCULATED">Calculated</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, payrollStatus: "" }))}>Reset</button>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {runs.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{new Date(row.periodStart).toLocaleDateString()} - {new Date(row.periodEnd).toLocaleDateString()}</strong>
                <div className="item-meta">{row.status} | Net {row.totalNet}</div>
              </div>
            ))}
            {!loading && !runs.length && <EmptyState title="No payroll runs yet" message="Create a run to start calculating salary, incentives, and period totals." />}
          </div>
        </div>
      )}

      {mode === "attendance" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div className="panel-card">
            <h3>Attendance Dashboard</h3>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><div className="stat-label">Total Staff</div><div className="stat-value">{attendanceSummary.totalStaff || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Present Today</div><div className="stat-value">{attendanceSummary.presentToday || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Absent Today</div><div className="stat-value">{attendanceSummary.absentToday || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Late Staff</div><div className="stat-value">{attendanceSummary.lateStaff || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Currently Working</div><div className="stat-value">{attendanceSummary.currentlyWorking || 0}</div></div>
              <div className="stat-card"><div className="stat-label">Completed Shift</div><div className="stat-value">{attendanceSummary.completedShift || 0}</div></div>
            </div>
            <form className="form-grid" onSubmit={saveAttendanceSettings}>
              <label>
                <span className="muted">Office Start</span>
                <input type="time" value={attendanceSettings.officeStartTime} onChange={(e) => setAttendanceSettings((current) => ({ ...current, officeStartTime: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Office End</span>
                <input type="time" value={attendanceSettings.officeEndTime} onChange={(e) => setAttendanceSettings((current) => ({ ...current, officeEndTime: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Late After</span>
                <input type="time" value={attendanceSettings.lateAfterTime} onChange={(e) => setAttendanceSettings((current) => ({ ...current, lateAfterTime: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Half Day Minutes</span>
                <input type="number" min="30" max="1440" value={attendanceSettings.halfDayMinutes} onChange={(e) => setAttendanceSettings((current) => ({ ...current, halfDayMinutes: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Minimum Working Minutes</span>
                <input type="number" min="30" max="1440" value={attendanceSettings.minimumWorkingMinutes} onChange={(e) => setAttendanceSettings((current) => ({ ...current, minimumWorkingMinutes: e.target.value }))} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
                <input type="checkbox" checked={attendanceSettings.checkoutSelfieRequired} onChange={(e) => setAttendanceSettings((current) => ({ ...current, checkoutSelfieRequired: e.target.checked }))} />
                <span>Require selfie on check-out</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
                <input type="checkbox" checked={attendanceSettings.allowManualAttendanceEdits} onChange={(e) => setAttendanceSettings((current) => ({ ...current, allowManualAttendanceEdits: e.target.checked }))} />
                <span>Allow manual attendance edits</span>
              </label>
              <div style={{ alignSelf: "end" }}>
                <button type="submit" disabled={settingsSaving}>{settingsSaving ? "Saving..." : "Save Attendance Rules"}</button>
              </div>
            </form>
          </div>

          <div className="panel-card">
            <div className="item-head" style={{ alignItems: "flex-end" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>Attendance Calendar</h3>
                <div className="item-meta">Owner-side monthly staff marking view. Branch filter from the top bar is applied automatically, and each verified staff attendance marks itself into the calendar.</div>
              </div>
              <label>
                <span className="muted">Month</span>
                <input type="month" value={attendanceCalendarMonth} onChange={(e) => setAttendanceCalendarMonth(e.target.value)} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {Object.entries(statusTheme).filter(([key]) => key !== "OFF").map(([key, theme]) => (
                <span key={key} className="badge" style={{ background: theme.bg, color: theme.color, border: "1px solid rgba(148, 163, 184, 0.25)" }}>
                  {theme.label} = {key.replaceAll("_", " ")}
                </span>
              ))}
              <span className="badge" style={{ background: "#e2e8f0", color: "#334155", border: "1px solid rgba(148, 163, 184, 0.25)" }}>Weekend / Off Day</span>
            </div>
            <div className="badge-row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button type="button" className="secondary-button" onClick={() => downloadCalendarExport("xlsx")}>Monthly Excel</button>
              <button type="button" className="secondary-button" onClick={() => downloadCalendarExport("pdf")}>Monthly PDF</button>
            </div>
            <div className="stats-grid" style={{ marginTop: 16 }}>
              <div className="stat-card"><div className="stat-label">Monthly Rows</div><div className="stat-value">{attendanceCalendar.summary?.totalRows || 0}</div></div>
              <div className="stat-card" style={{ background: "#dcfce7" }}><div className="stat-label">Present</div><div className="stat-value">{attendanceCalendar.summary?.present || 0}</div></div>
              <div className="stat-card" style={{ background: "#fef3c7" }}><div className="stat-label">Late</div><div className="stat-value">{attendanceCalendar.summary?.late || 0}</div></div>
              <div className="stat-card" style={{ background: "#fde68a" }}><div className="stat-label">Half Day</div><div className="stat-value">{attendanceCalendar.summary?.halfDay || 0}</div></div>
              <div className="stat-card" style={{ background: "#fee2e2" }}><div className="stat-label">Absent</div><div className="stat-value">{attendanceCalendar.summary?.absent || 0}</div></div>
              <div className="stat-card" style={{ background: "#dbeafe" }}><div className="stat-label">Leave</div><div className="stat-value">{attendanceCalendar.summary?.leave || 0}</div></div>
            </div>
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <div style={{ minWidth: Math.max(1160, 320 + attendanceCalendarDays.length * 44) }}>
                <div style={{ display: "grid", gridTemplateColumns: `320px repeat(${attendanceCalendarDays.length}, 44px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <div className="muted" style={{ fontWeight: 700 }}>Staff / Monthly Totals</div>
                  {attendanceCalendarDays.map((day) => (
                    <div
                      key={day}
                      className="muted"
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "8px 0",
                        borderRadius: 10,
                        background: attendanceCalendarWeekendMap[day] ? "#e2e8f0" : "transparent"
                      }}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                {attendanceCalendarRows.map((row) => (
                  <div key={row.staffCode} style={{ display: "grid", gridTemplateColumns: `320px repeat(${attendanceCalendarDays.length}, 44px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
                    <div className="list-item" style={{ padding: "10px 12px" }}>
                      <strong>{row.staffName}</strong>
                      <div className="item-meta">{row.branchName || "No branch"}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {attendanceMetricKeys.map((metricKey) => row.totals[metricKey] ? (
                          <span key={metricKey} className="badge" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            {attendanceMetricLabel[metricKey]} {row.totals[metricKey]}
                          </span>
                        ) : null)}
                      </div>
                    </div>
                    {attendanceCalendarDays.map((day) => {
                      const cell = row.cells[day] || null;
                      const isWeekend = attendanceCalendarWeekendMap[day];
                      const theme = statusTheme[cell?.status] || (isWeekend ? { label: "-", bg: "#e2e8f0", color: "#475569" } : statusTheme.OFF);
                      const title = cell
                        ? `${row.staffName} | ${cell.status} | ${new Date(cell.date).toLocaleDateString()}`
                        : `${row.staffName} | ${isWeekend ? "Weekend / Off Day" : "No mark"}`;
                      return (
                        <button
                          key={`${row.staffCode}-${day}`}
                          type="button"
                          title={title}
                          onClick={() => setSelectedCalendarCell({ staffName: row.staffName, branchName: row.branchName, staffCode: row.staffCode, record: cell, day, isWeekend })}
                          style={{
                            height: 40,
                            borderRadius: 12,
                            display: "grid",
                            placeItems: "center",
                            background: theme.bg,
                            color: theme.color,
                            border: "1px solid rgba(148, 163, 184, 0.25)",
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer"
                          }}
                        >
                          {theme.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {!attendanceCalendarRows.length && !loading ? (
                  <EmptyState title="No attendance calendar rows" message="Pick a month and branch to see automatic staff attendance markings in calendar format." />
                ) : null}
              </div>
            </div>
          </div>

          {selectedCalendarCell ? (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.68)", display: "grid", placeItems: "center", zIndex: 60, padding: 16 }}>
              <div className="panel-card" style={{ width: "min(100%, 480px)", display: "grid", gap: 12 }}>
                <div className="item-head">
                  <div>
                    <h3 style={{ margin: 0 }}>Attendance Cell Detail</h3>
                    <div className="item-meta">{selectedCalendarCell.staffName} | Day {selectedCalendarCell.day}</div>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => setSelectedCalendarCell(null)}>Close</button>
                </div>
                <div className="item-meta"><strong>Branch:</strong> {selectedCalendarCell.branchName || "No branch"}</div>
                <div className="item-meta"><strong>Status:</strong> {selectedCalendarCell.record?.status || "No mark"}</div>
                <div className="item-meta"><strong>Date:</strong> {selectedCalendarCell.record?.date ? new Date(selectedCalendarCell.record.date).toLocaleDateString() : `${attendanceCalendarMonth}-${String(selectedCalendarCell.day).padStart(2, "0")}`}</div>
                <div className="item-meta"><strong>Check-In:</strong> {selectedCalendarCell.record?.checkInAt ? new Date(selectedCalendarCell.record.checkInAt).toLocaleString() : "No check-in"}</div>
                <div className="item-meta"><strong>Check-Out:</strong> {selectedCalendarCell.record?.checkOutAt ? new Date(selectedCalendarCell.record.checkOutAt).toLocaleString() : "No check-out"}</div>
                <div className="item-meta"><strong>Worked Hours:</strong> {selectedCalendarCell.record?.workedHours || "-"}</div>
                <div className="item-meta"><strong>Geo Status:</strong> {selectedCalendarCell.record?.geoStatus || "-"}</div>
                <div className="item-meta"><strong>Verification:</strong> {selectedCalendarCell.record?.verificationMethod || "-"}</div>
                <div className="item-meta"><strong>GPS:</strong> {selectedCalendarCell.record?.gpsLocation || "-"}</div>
                <div className="item-meta"><strong>Note:</strong> {selectedCalendarCell.record?.note || "None"}</div>
                <div className="item-meta"><strong>Admin Remark:</strong> {selectedCalendarCell.record?.adminRemark || "None"}</div>
                {selectedCalendarCell.record?.selfie ? <img src={selectedCalendarCell.record.selfie} alt="Attendance selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }} /> : null}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="secondary-button" onClick={() => setSelectedCalendarCell(null)}>Close</button>
                  <button type="button" onClick={() => void openManualCorrectionFromCell()}>
                    {selectedCalendarCell.record?.attendanceId ? "Open Manual Correction" : "Create Manual Entry"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="panel-card">
            <div className="item-head" style={{ alignItems: "flex-end" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>Attendance Reports</h3>
                <div className="item-meta">Generate daily, weekly, or monthly attendance reports and export them in Excel or PDF.</div>
              </div>
              <div className="badge-row">
                <button type="button" className="secondary-button" onClick={() => downloadAttendanceReport("xlsx")}>Export Excel</button>
                <button type="button" className="secondary-button" onClick={() => downloadAttendanceReport("pdf")}>Export PDF</button>
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label>
                <span className="muted">Report Period</span>
                <select value={attendanceReportPeriod} onChange={(e) => setAttendanceReportPeriod(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <div className="stats-grid" style={{ gridColumn: "1 / -1" }}>
                <div className="stat-card"><div className="stat-label">Rows</div><div className="stat-value">{attendanceReport.summary?.totalRows || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Present</div><div className="stat-value">{attendanceReport.summary?.present || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Absent</div><div className="stat-value">{attendanceReport.summary?.absent || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Leave</div><div className="stat-value">{attendanceReport.summary?.leave || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Late</div><div className="stat-value">{attendanceReport.summary?.late || 0}</div></div>
                <div className="stat-card"><div className="stat-label">Half Day</div><div className="stat-value">{attendanceReport.summary?.halfDay || 0}</div></div>
              </div>
            </div>
            <div className="list-stack" style={{ marginTop: 16 }}>
              {(attendanceReport.rows || []).slice(0, 12).map((row, index) => (
                <div key={`${row.staffCode}-${row.date}-${index}`} className="list-item">
                  <strong>{row.staffName}</strong>
                  <div className="item-meta">{new Date(row.date).toLocaleDateString()} | {row.status} | {row.branchName || "No branch"}</div>
                  <div className="item-meta">
                    {row.checkInAt ? new Date(row.checkInAt).toLocaleString() : "No check-in"}
                    {row.checkOutAt ? ` - ${new Date(row.checkOutAt).toLocaleString()}` : ""}
                    {` | ${row.workedHours}`}
                  </div>
                </div>
              ))}
              {!attendanceReport.rows?.length && <EmptyState title="No attendance report rows" message="Pick a date and report period to generate attendance rows for export." />}
            </div>
          </div>

          <div className="panel-card" ref={manualCreateRef}>
            <h3>Manual Attendance Entry</h3>
            <form className="form-grid" onSubmit={saveManualCreate}>
              <label>
                <span className="muted">Staff member</span>
                <select required value={manualCreate.userSalonId} onChange={(e) => setManualCreate((current) => ({ ...current, userSalonId: e.target.value }))}>
                  <option value="">Select staff</option>
                  {staffUsers.map((row) => (
                    <option key={row.id} value={row.id}>{row.user?.name || row.name || row.id}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="muted">Attendance date</span>
                <input type="date" required value={manualCreate.attendanceDate} onChange={(e) => setManualCreate((current) => ({ ...current, attendanceDate: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Check-in</span>
                <input type="datetime-local" value={manualCreate.checkInAt} onChange={(e) => setManualCreate((current) => ({ ...current, checkInAt: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Check-out</span>
                <input type="datetime-local" value={manualCreate.checkOutAt} onChange={(e) => setManualCreate((current) => ({ ...current, checkOutAt: e.target.value }))} />
              </label>
              <label>
                <span className="muted">Status override</span>
                <select value={manualCreate.status} onChange={(e) => setManualCreate((current) => ({ ...current, status: e.target.value }))}>
                  <option value="">Auto-calculate</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LEAVE">Leave</option>
                  <option value="ABSENT">Absent</option>
                  <option value="WORKING">Working</option>
                  <option value="COMPLETED_SHIFT">Completed Shift</option>
                </select>
              </label>
              <label>
                <span className="muted">Note</span>
                <input value={manualCreate.note} onChange={(e) => setManualCreate((current) => ({ ...current, note: e.target.value }))} placeholder="Optional note" />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span className="muted">Admin remark</span>
                <textarea rows={2} value={manualCreate.adminRemark} onChange={(e) => setManualCreate((current) => ({ ...current, adminRemark: e.target.value }))} placeholder="Reason or context for the manual entry" />
              </label>
              <div>
                <button type="submit" disabled={manualCreateSaving}>{manualCreateSaving ? "Saving..." : "Create Manual Entry"}</button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 18 }}>
            <div className="panel-card">
              <h3>Attendance Records</h3>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <label>
                  <span className="muted">Search staff name</span>
                  <input value={filters.attendanceQ} placeholder="Search staff name" onChange={(e) => setFilters((current) => ({ ...current, attendanceQ: e.target.value }))} />
                </label>
                <label>
                  <span className="muted">Status</span>
                  <select value={filters.attendanceStatus} onChange={(e) => setFilters((current) => ({ ...current, attendanceStatus: e.target.value }))}>
                    <option value="">All statuses</option>
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LEAVE">Leave</option>
                    <option value="WORKING">Working</option>
                    <option value="COMPLETED_SHIFT">Completed Shift</option>
                  </select>
                </label>
                <label>
                  <span className="muted">Attendance date</span>
                  <input type="date" value={filters.attendanceDate} onChange={(e) => setFilters((current) => ({ ...current, attendanceDate: e.target.value }))} />
                </label>
                <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, attendanceQ: "", attendanceStatus: "", attendanceDate: "" }))}>Reset</button>
                </div>
              </div>
              <div className="list-stack">
                {attendance.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="list-item"
                    onClick={() => loadAttendanceDetail(row.id)}
                    style={{ textAlign: "left", width: "100%", background: selectedAttendanceId === row.id ? "#eff6ff" : "white", border: "1px solid #e2e8f0", borderRadius: 12 }}
                  >
                    <strong>{row.userSalon?.user?.name || row.userSalonId}</strong>
                    <div className="item-meta">{new Date(row.checkInAt).toLocaleString()} {row.checkOutAt ? `- ${new Date(row.checkOutAt).toLocaleString()}` : ""}</div>
                    <div className="item-meta">{row.status} | {row.branch?.name || "No branch"} | {row.workedMinutes != null ? `${row.workedMinutes} min` : "Open shift"}</div>
                  </button>
                ))}
                {!loading && !attendance.length && <EmptyState title="No attendance records yet" message="Attendance check-ins and check-outs will appear here once recorded." />}
              </div>
            </div>

            <div className="panel-card" ref={detailPanelRef}>
              <h3>Attendance Detail</h3>
              {detailLoading ? <PageLoader compact title="Loading attendance detail" message="Fetching record, GPS evidence, and audit history." /> : null}
              {!detailLoading && !selectedAttendance && (
                <EmptyState title="No record selected" message="Select an attendance row to inspect selfie, GPS, remarks, and manual correction options." />
              )}
              {selectedAttendance ? (
                <div style={{ display: "grid", gap: 16 }}>
                  <div className="item-meta"><strong>Staff:</strong> {selectedAttendance.userSalon?.user?.name || "-"}</div>
                  <div className="item-meta"><strong>Date:</strong> {new Date(selectedAttendance.attendanceDate || selectedAttendance.checkInAt).toLocaleDateString()}</div>
                  <div className="item-meta"><strong>Status:</strong> {selectedAttendance.status}</div>
                  <div className="item-meta"><strong>Check-In GPS:</strong> {selectedAttendance.checkInLatitude || "-"}, {selectedAttendance.checkInLongitude || "-"}</div>
                  <div className="item-meta"><strong>Check-Out GPS:</strong> {selectedAttendance.checkOutLatitude || "-"}, {selectedAttendance.checkOutLongitude || "-"}</div>
                  <div className="item-meta"><strong>Geo Status:</strong> {selectedAttendance.geoStatus}</div>
                  <div className="item-meta"><strong>Admin Remark:</strong> {selectedAttendance.adminRemark || "None"}</div>
                  {selectedAttendance.checkInSelfieUrl ? <img src={selectedAttendance.checkInSelfieUrl} alt="Check-in selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }} /> : null}
                  {selectedAttendance.checkOutSelfieUrl ? <img src={selectedAttendance.checkOutSelfieUrl} alt="Check-out selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }} /> : null}

                  <form onSubmit={saveManualEdit} style={{ display: "grid", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                    <h4 style={{ margin: 0 }}>Manual Correction</h4>
                    <input type="date" value={manualEdit.attendanceDate} onChange={(e) => setManualEdit((current) => ({ ...current, attendanceDate: e.target.value }))} />
                    <input type="datetime-local" value={manualEdit.checkInAt} onChange={(e) => setManualEdit((current) => ({ ...current, checkInAt: e.target.value }))} />
                    <input type="datetime-local" value={manualEdit.checkOutAt} onChange={(e) => setManualEdit((current) => ({ ...current, checkOutAt: e.target.value }))} />
                    <select value={manualEdit.status} onChange={(e) => setManualEdit((current) => ({ ...current, status: e.target.value }))}>
                      <option value="">Auto-calculate status</option>
                      <option value="PRESENT">Present</option>
                      <option value="LATE">Late</option>
                      <option value="HALF_DAY">Half Day</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LEAVE">Leave</option>
                      <option value="WORKING">Working</option>
                      <option value="COMPLETED_SHIFT">Completed Shift</option>
                    </select>
                    <input value={manualEdit.note} placeholder="Attendance note" onChange={(e) => setManualEdit((current) => ({ ...current, note: e.target.value }))} />
                    <textarea rows={2} value={manualEdit.adminRemark} placeholder="Admin remark" onChange={(e) => setManualEdit((current) => ({ ...current, adminRemark: e.target.value }))} />
                    <textarea rows={2} required value={manualEdit.reason} placeholder="Reason for manual correction" onChange={(e) => setManualEdit((current) => ({ ...current, reason: e.target.value }))} />
                    <button type="submit" disabled={manualSaving}>{manualSaving ? "Saving..." : "Save Manual Update"}</button>
                  </form>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                    <h4 style={{ marginTop: 0 }}>Audit Log</h4>
                    <div className="list-stack">
                      {(selectedAttendance.auditLogs || []).map((log) => (
                        <div key={log.id} className="list-item">
                          <strong>{log.action}</strong>
                          <div className="item-meta">{log.actorMembership?.user?.name || "Admin"} | {new Date(log.createdAt).toLocaleString()}</div>
                          <div className="item-meta">{log.metadata?.reason || log.summary || "No extra detail"}</div>
                        </div>
                      ))}
                      {!selectedAttendance.auditLogs?.length && <span className="muted">No manual edits yet.</span>}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel-card">
            <div className="item-head" style={{ alignItems: "flex-end" }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>Daily Attendance Sheet</h3>
                <div className="item-meta">Printable branch-wise daily sheet for the selected date and branch filter.</div>
              </div>
              <div className="badge-row">
                <button type="button" className="secondary-button" onClick={printAttendanceDaySheet}>Print Sheet</button>
                <button type="button" className="secondary-button" onClick={() => downloadDaySheetExport("xlsx")}>Daily Excel</button>
                <button type="button" className="secondary-button" onClick={() => downloadDaySheetExport("pdf")}>Daily PDF</button>
              </div>
            </div>
            <div className="list-stack">
              {attendanceDaySheet.map((row) => (
                <div key={`${row.userSalonId}-${row.status}`} className="list-item">
                  <strong>{row.staffName}</strong>
                  <div className="item-meta">{row.status} | {row.branchName || "No branch"}</div>
                  <div className="item-meta">
                    {row.checkInAt ? new Date(row.checkInAt).toLocaleString() : "No check-in"}
                    {row.checkOutAt ? ` - ${new Date(row.checkOutAt).toLocaleString()}` : ""}
                  </div>
                </div>
              ))}
              {!attendanceDaySheet.length && <EmptyState title="No day sheet rows" message="Staff day sheet will show present, leave, and absent projection for the selected date." />}
            </div>
          </div>
        </div>
      )}

      {mode === "leaves" && (
        <div className="panel-card">
          <h3>Leave Requests</h3>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              <span className="muted">Search staff name</span>
              <input value={filters.leaveQ} placeholder="Search staff name" onChange={(e) => setFilters((current) => ({ ...current, leaveQ: e.target.value }))} />
            </label>
            <label>
              <span className="muted">Leave statuses</span>
              <select value={filters.leaveStatus} onChange={(e) => setFilters((current) => ({ ...current, leaveStatus: e.target.value }))}>
                <option value="">All leave statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, leaveQ: "", leaveStatus: "" }))}>Reset</button>
          </div>
          <div className="list-stack">
            {leaves.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.userSalon?.user?.name || row.userSalonId}</strong>
                <div className="item-meta">{row.status} | {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}</div>
              </div>
            ))}
            {!loading && !leaves.length && <EmptyState title="No leave requests yet" message="Pending and approved leave requests will show here once staff submits them." />}
          </div>
        </div>
      )}

      {mode === "incentives" && (
        <div className="panel-card">
          <h3>Incentive Rules</h3>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              <span className="muted">Search rule name, target type, or note</span>
              <input value={filters.incentiveQ} placeholder="Search rule name, target type, or note" onChange={(e) => setFilters((current) => ({ ...current, incentiveQ: e.target.value }))} />
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, incentiveQ: "" }))}>Reset</button>
          </div>
          <div className="list-stack">
            {incentives.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.name}</strong>
                <div className="item-meta">{row.targetType} | {row.incentiveAmount}</div>
              </div>
            ))}
            {!loading && !incentives.length && <EmptyState title="No incentive rules yet" message="Create incentive rules to reward staff performance and milestone achievements." />}
          </div>
        </div>
      )}

      {mode === "performance" && (
        <div className="panel-card">
          <h3>Payroll Reports</h3>
          <div className="list-stack">
            {report.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{new Date(row.periodStart).toLocaleDateString()} - {new Date(row.periodEnd).toLocaleDateString()}</strong>
                <div className="item-meta">{row.totalNet}</div>
              </div>
            ))}
            {!loading && !report.length && <EmptyState title="No payroll reports yet" message="Payroll report rows will appear here once runs are created and processed." />}
          </div>
        </div>
      )}
    </div>
  );
}
