import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Edit3, Eye, FileText, History, LogIn, LogOut, MapPin, PlusCircle, Printer, RotateCcw, Save, Timer, User, UserPlus, Users, XCircle } from "lucide-react";

const emptyAttendanceSettings = {
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  lateAfterTime: "09:15",
  halfDayMinutes: 240,
  minimumWorkingMinutes: 480,
  overtimeEnabled: false,
  overtimeThresholdMinutes: 480,
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

const toLocalDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const toLocalDateTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
};
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
  OFF: { label: "OFF", bg: "#e2e8f0", color: "#475569" }
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
  const [attendance, setAttendance] = useState([]);
  const [attendanceMeta, setAttendanceMeta] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalStaff: 0, presentToday: 0, absentToday: 0, lateStaff: 0, currentlyWorking: 0, completedShift: 0, onLeave: 0 });
  const [attendanceSettings, setAttendanceSettings] = useState(emptyAttendanceSettings);
  const [attendanceReport, setAttendanceReport] = useState(emptyAttendanceReport);
  const [attendanceReportPeriod, setAttendanceReportPeriod] = useState("daily");
  const [attendanceCalendarMonth, setAttendanceCalendarMonth] = useState(() => toMonthInput());
  const [attendanceCalendar, setAttendanceCalendar] = useState(emptyAttendanceCalendar);
  const [staffUsers, setStaffUsers] = useState([]);
  const [attendanceDaySheet, setAttendanceDaySheet] = useState([]);
  const [daySheetDate, setDaySheetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filters, setFilters] = useState({ attendanceQ: "", attendanceStatus: "", attendanceDate: "" });
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

  const load = useCallback(async () => {
    try {
      const calendarDate = `${attendanceCalendarMonth}-01`;
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};

      const safeGet = async (url, params = {}) => {
        try { return (await api.get(url, { params })).data; } catch { return null; }
      };

      const [attendanceData, summaryData, settingsData, staffData, daySheetData, attendanceReportData, attendanceCalData] = await Promise.all([
        safeGet("/owner/attendance", { ...branchParams, page: attendancePage, limit: 50, ...(filters.attendanceQ ? { q: filters.attendanceQ } : {}), ...(filters.attendanceStatus ? { status: filters.attendanceStatus } : {}), ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}) }),
        safeGet("/owner/attendance/summary", { ...branchParams, ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}) }),
        safeGet("/owner/attendance/settings"),
        safeGet("/owner/staff-users", branchParams),
        safeGet("/owner/attendance/day-sheet", { ...branchParams, date: daySheetDate }),
        safeGet("/owner/attendance/reports", { ...branchParams, period: attendanceReportPeriod, ...(filters.attendanceDate ? { date: filters.attendanceDate } : {}) }),
        safeGet("/owner/attendance/reports", { ...branchParams, period: "monthly", date: calendarDate })
      ]);
      setAttendance(attendanceData?.rows || attendanceData || []);
      setAttendanceMeta({ total: attendanceData?.total || 0, page: attendanceData?.page || 1, limit: attendanceData?.limit || 50, totalPages: attendanceData?.totalPages || 1 });
      setAttendanceSummary(summaryData || {});
      setAttendanceSettings((current) => ({ ...current, ...(settingsData || {}) }));
      setStaffUsers(staffData || []);
      setAttendanceDaySheet(daySheetData?.rows || []);
      setAttendanceReport(attendanceReportData || emptyAttendanceReport);
      setAttendanceCalendar(attendanceCalData || emptyAttendanceCalendar);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load attendance workspace"), success: "" });
      setLoading(false);
    }
  }, [attendanceCalendarMonth, attendancePage, attendanceReportPeriod, filters, selectedBranchId, daySheetDate]);

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
        return [day, dow === 0];
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
    const confirmMsg = `Confirm manual attendance update for ${selectedAttendance.userSalon?.user?.name || "staff"}?\n\nReason: ${manualEdit.reason}`;
    if (!window.confirm(confirmMsg)) return;
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

  const fetchExistingAttendance = async (userSalonId, attendanceDate) => {
    if (!userSalonId || !attendanceDate) return;
    try {
      const res = await api.get("/owner/attendance", { params: { userSalonId, date: attendanceDate, limit: 1 } });
      const rows = res.data?.rows || res.data || [];
      const existing = Array.isArray(rows) ? rows.find((r) => r.userSalonId === userSalonId) : null;
      if (existing) {
        setManualCreate((current) => ({
          ...current,
          checkInAt: toLocalDateTimeInput(existing.checkInAt) || current.checkInAt,
          checkOutAt: toLocalDateTimeInput(existing.checkOutAt) || current.checkOutAt,
          status: existing.status || current.status,
          note: existing.note || current.note,
          adminRemark: existing.adminRemark || current.adminRemark
        }));
      }
    } catch {
      // silent — form stays as-is
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

  const sanitizeHtml = (str) => {
    if (!str) return "-";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  const printAttendanceDaySheet = () => {
    const targetDate = daySheetDate;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!printWindow) { setStatus({ error: "Pop-up was blocked. Please allow pop-ups for this site.", success: "" }); return; }
    const rowsHtml = attendanceDaySheet.map((row) => `
      <tr>
        <td>${sanitizeHtml(row.staffName)}</td>
        <td>${sanitizeHtml(row.branchName)}</td>
        <td>${sanitizeHtml(row.status)}</td>
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
          <p>Branch: ${sanitizeHtml(selectedBranchName) || "All Branches"} | Date: ${targetDate}</p>
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
      date: daySheetDate,
      ...(selectedBranchId ? { branchId: selectedBranchId } : {})
    });
    window.open(`/api/v1/owner/attendance/reports/export.${format}?${searchParams.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Staff Attendance"
        description="GPS-based attendance tracking, check-in/out, manual attendance editing, and attendance reports."
        items={[
          { label: "Attendance", to: "/admin/attendance" }
        ]}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      <div style={{ display: "grid", gap: 18, minWidth: 0, maxWidth: "100%" }}>
        <div className="panel-card" style={{ padding: "20px 24px" }}>
          <h3>Attendance Dashboard</h3>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label"><Users size={14} /> Total Staff</div><div className="stat-value">{attendanceSummary.totalStaff || 0}</div></div>
            <div className="stat-card"><div className="stat-label"><CheckCircle2 size={14} /> Present Today</div><div className="stat-value">{attendanceSummary.presentToday || 0}</div></div>
            <div className="stat-card"><div className="stat-label"><XCircle size={14} /> Absent Today</div><div className="stat-value">{attendanceSummary.absentToday || 0}</div></div>
            <div className="stat-card"><div className="stat-label"><Clock size={14} /> Late Staff</div><div className="stat-value">{attendanceSummary.lateStaff || 0}</div></div>
            <div className="stat-card"><div className="stat-label"><Timer size={14} /> Currently Working</div><div className="stat-value">{attendanceSummary.currentlyWorking || 0}</div></div>
            <div className="stat-card"><div className="stat-label"><CheckCircle2 size={14} /> Completed Shift</div><div className="stat-value">{attendanceSummary.completedShift || 0}</div></div>
            <div className="stat-card"><div className="stat-label">On Leave</div><div className="stat-value">{attendanceSummary.onLeave || 0}</div></div>
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
              <input type="checkbox" checked={attendanceSettings.overtimeEnabled} onChange={(e) => setAttendanceSettings((current) => ({ ...current, overtimeEnabled: e.target.checked }))} />
              <span>Enable overtime calculation</span>
            </label>
            {attendanceSettings.overtimeEnabled && (
              <label>
                <span className="muted">Overtime Threshold (minutes)</span>
                <input type="number" min="60" max="720" value={attendanceSettings.overtimeThresholdMinutes} onChange={(e) => setAttendanceSettings((current) => ({ ...current, overtimeThresholdMinutes: e.target.value }))} />
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" checked={attendanceSettings.checkoutSelfieRequired} onChange={(e) => setAttendanceSettings((current) => ({ ...current, checkoutSelfieRequired: e.target.checked }))} />
              <span>Require selfie on check-out</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input type="checkbox" checked={attendanceSettings.allowManualAttendanceEdits} onChange={(e) => setAttendanceSettings((current) => ({ ...current, allowManualAttendanceEdits: e.target.checked }))} />
              <span>Allow manual attendance edits</span>
            </label>
            <div style={{ alignSelf: "end" }}>
              <button type="submit" disabled={settingsSaving}>{settingsSaving ? "Saving..." : <><Save size={12} /> Save Attendance Rules</>}</button>
            </div>
          </form>
        </div>

        <div className="panel-card" style={{ overflow: "hidden", padding: "20px 24px", maxWidth: "100%" }}>
          <style>{`
            .att-cal-cell { transition: all 0.15s ease; }
            .att-cal-cell:hover { transform: scale(1.15); z-index: 2; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .att-cal-staff:hover { background: #f8fafc; }
            .att-cal-day-hdr { transition: background 0.15s; }
            .att-cal-day-hdr.today { background: #6366f1 !important; color: white !important; border-radius: 10px; }
            .att-cal-today-col { box-shadow: inset 0 0 0 2px #6366f1; border-radius: 12px; }
          `}</style>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>📅</span> Attendance Calendar
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Monthly staff attendance overview. Click any cell for details. Today is highlighted in indigo.</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" onClick={() => { const [y, m] = attendanceCalendarMonth.split("-").map(Number); const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; setAttendanceCalendarMonth(prev); }} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14 }}><ChevronLeft size={14} /></button>
              <input type="month" value={attendanceCalendarMonth} onChange={(e) => setAttendanceCalendarMonth(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600 }} />
              <button type="button" onClick={() => { const [y, m] = attendanceCalendarMonth.split("-").map(Number); const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; setAttendanceCalendarMonth(next); }} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14 }}><ChevronRight size={14} /></button>
              <div style={{ width: 1, height: 24, background: "#e2e8f0", margin: "0 4px" }} />
              <button type="button" onClick={() => setAttendanceCalendarMonth(toMonthInput())} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #6366f1", background: "#6366f1", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 700 }}><CalendarDays size={12} /> Today</button>
              <button type="button" className="secondary-button" onClick={() => downloadCalendarExport("xlsx")} style={{ fontSize: 12 }}><Download size={12} /> Excel</button>
              <button type="button" className="secondary-button" onClick={() => downloadCalendarExport("pdf")} style={{ fontSize: 12 }}><Download size={12} /> PDF</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
            {Object.entries(statusTheme).filter(([key]) => key !== "OFF").map(([key, theme]) => (
              <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: theme.bg, color: theme.color, fontSize: 11, fontWeight: 700, border: "1px solid rgba(0,0,0,0.06)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.color, opacity: 0.7 }} />
                {theme.label} = {key.replaceAll("_", " ")}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16 }}>
            {[{ label: "Total", value: attendanceCalendar.summary?.totalRows || 0, bg: "#f1f5f9", color: "#334155" },
              { label: "Present", value: attendanceCalendar.summary?.present || 0, bg: "#dcfce7", color: "#166534" },
              { label: "Late", value: attendanceCalendar.summary?.late || 0, bg: "#fef3c7", color: "#92400e" },
              { label: "Half Day", value: attendanceCalendar.summary?.halfDay || 0, bg: "#fef9c3", color: "#854d0e" },
              { label: "Absent", value: attendanceCalendar.summary?.absent || 0, bg: "#fee2e2", color: "#b91c1c" },
              { label: "Leave", value: attendanceCalendar.summary?.leave || 0, bg: "#dbeafe", color: "#1d4ed8" }
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflow: "auto", maxHeight: "65vh", marginTop: 16, borderRadius: 12, border: "1px solid #e2e8f0", maxWidth: "100%" }}>
            {(() => {
              const today = new Date();
              const todayDay = today.getMonth() + 1 === parseInt(attendanceCalendarMonth.split("-")[1]) && today.getFullYear() === parseInt(attendanceCalendarMonth.split("-")[0]) ? today.getDate() : null;
              return (
                <table style={{ borderCollapse: "collapse", minWidth: Math.max(900, 280 + attendanceCalendarDays.length * 40) }}>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", top: 0, zIndex: 5, background: "#f8fafc", padding: "10px 14px", fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left", borderBottom: "2px solid #e2e8f0", borderRight: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Staff Member</th>
                      {attendanceCalendarDays.map((day) => (
                        <th key={day} className={`att-cal-day-hdr${todayDay === day ? " today" : ""}`} style={{ position: "sticky", top: 0, zIndex: 4, background: todayDay === day ? undefined : attendanceCalendarWeekendMap[day] ? "#e2e8f0" : "#f8fafc", textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 700, color: todayDay === day ? "white" : attendanceCalendarWeekendMap[day] ? "#475569" : "#475569", borderBottom: "2px solid #e2e8f0", minWidth: 40, whiteSpace: "nowrap" }}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceCalendarRows.map((row, rowIdx) => (
                      <tr key={row.staffCode} style={{ background: rowIdx % 2 === 0 ? "white" : "#fafbfc" }}>
                        <td style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", background: "inherit" }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{row.staffName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.branchName || "Unassigned"}</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                            {attendanceMetricKeys.filter((k) => row.totals[k] > 0).map((metricKey) => (
                              <span key={metricKey} style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: statusTheme[metricKey.toUpperCase()]?.bg || "#f1f5f9", color: statusTheme[metricKey.toUpperCase()]?.color || "#475569" }}>
                                {attendanceMetricLabel[metricKey]}: {row.totals[metricKey]}
                              </span>
                            ))}
                          </div>
                        </td>
                        {attendanceCalendarDays.map((day) => {
                          const cell = row.cells[day] || null;
                          const isWeekend = attendanceCalendarWeekendMap[day];
                          const isToday = todayDay === day;
                          const isFuture = todayDay !== null && day > todayDay;
                          let theme;
                          if (isFuture) {
                            theme = { label: "", bg: "#f8fafc", color: "#d1d5db" };
                          } else if (isWeekend) {
                            theme = statusTheme.OFF;
                          } else {
                            theme = statusTheme[cell?.status] || { label: "-", bg: "#f1f5f9", color: "#94a3b8" };
                          }
                          return (
                            <td key={`${row.staffCode}-${day}`} style={{ textAlign: "center", padding: "4px 0", borderBottom: "1px solid #f1f5f9", borderLeft: "1px solid #f8fafc", background: "inherit" }}>
                              <button
                                type="button"
                                title={cell ? `${row.staffName} | ${cell.status} | ${new Date(cell.date).toLocaleDateString()}` : isFuture ? `${row.staffName} | Future` : isWeekend ? `${row.staffName} | Off` : `${row.staffName} | No mark`}
                                onClick={() => setSelectedCalendarCell({ staffName: row.staffName, branchName: row.branchName, staffCode: row.staffCode, record: cell, day, isWeekend })}
                                className="att-cal-cell"
                                style={{
                                  minWidth: 32,
                                  height: 32,
                                  padding: "0 6px",
                                  borderRadius: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: theme.bg,
                                  color: theme.color,
                                  border: isToday ? "2px solid #6366f1" : "1px solid rgba(0,0,0,0.04)",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  lineHeight: 1,
                                  boxSizing: "border-box"
                                }}
                              >
                                {theme.label}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        {selectedCalendarCell ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.68)", display: "grid", placeItems: "center", zIndex: 60, padding: 16, backdropFilter: "blur(4px)" }} onClick={() => setSelectedCalendarCell(null)}>
            <div className="panel-card" style={{ width: "min(100%, 500px)", maxHeight: "90vh", overflowY: "auto", display: "grid", gap: 14, animation: "fadeIn 0.2s ease-out" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>Attendance Detail</h3>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{selectedCalendarCell.staffName} — Day {selectedCalendarCell.day}, {attendanceCalendarMonth}</div>
                </div>
                <button type="button" onClick={() => setSelectedCalendarCell(null)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
                {[
                  ["Branch", selectedCalendarCell.branchName || "Unassigned"],
                  ["Status", selectedCalendarCell.record?.status || "No mark"],
                  ["Date", selectedCalendarCell.record?.date ? new Date(selectedCalendarCell.record.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : `${attendanceCalendarMonth}-${String(selectedCalendarCell.day).padStart(2, "0")}`],
                  ["Worked Hours", selectedCalendarCell.record?.workedHours || "-"],
                  ["Check-In", selectedCalendarCell.record?.checkInAt ? new Date(selectedCalendarCell.record.checkInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"],
                  ["Check-Out", selectedCalendarCell.record?.checkOutAt ? new Date(selectedCalendarCell.record.checkOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"],
                  ["Geo Status", selectedCalendarCell.record?.geoStatus || "-"],
                  ["Verification", selectedCalendarCell.record?.verificationMethod || "-"],
                  ["GPS", selectedCalendarCell.record?.gpsLocation || "-"],
                  ["Note", selectedCalendarCell.record?.note || "None"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selectedCalendarCell.record?.adminRemark && (
                <div style={{ padding: "8px 12px", background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa", fontSize: 12, color: "#9a3412" }}>
                  <strong>Admin Remark:</strong> {selectedCalendarCell.record.adminRemark}
                </div>
              )}
              {selectedCalendarCell.record?.selfie ? <img src={selectedCalendarCell.record.selfie.startsWith("http") ? selectedCalendarCell.record.selfie : `${api.defaults.baseURL?.replace("/api/v1", "") || ""}${selectedCalendarCell.record.selfie}`} alt="Attendance selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0" }} /> : null}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <button type="button" className="secondary-button" onClick={() => setSelectedCalendarCell(null)}>Close</button>
                <button type="button" onClick={() => void openManualCorrectionFromCell()}>
                  {selectedCalendarCell.record?.attendanceId ? <><Edit3 size={12} /> Edit</> : <><PlusCircle size={12} /> Create Entry</>}
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
              <button type="button" className="secondary-button" onClick={() => downloadAttendanceReport("xlsx")}><Download size={12} /> Export Excel</button>
              <button type="button" className="secondary-button" onClick={() => downloadAttendanceReport("pdf")}><Download size={12} /> Export PDF</button>
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
          <div className="list-stack" style={{ gap: 12, marginTop: 16 }}>
            {(attendanceReport.rows || []).slice(0, 12).map((row, index) => {
              const statusColors = { PRESENT: { bg: "#dcfce7", color: "#166534" }, COMPLETED_SHIFT: { bg: "#f3e8ff", color: "#6b21a8" }, LATE: { bg: "#fef9c3", color: "#854d0e" }, HALF_DAY: { bg: "#ffedd5", color: "#9a3412" }, ABSENT: { bg: "#fee2e2", color: "#991b1b" }, LEAVE: { bg: "#ede9fe", color: "#5b21b6" }, WORKING: { bg: "#e0f2fe", color: "#0369a1" } };
              const sc = statusColors[row.status] || { bg: "#f1f5f9", color: "#475569" };
              return (
                <div key={`${row.staffCode}-${row.date}-${index}`} className="list-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                      {row.staffName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ fontSize: 15, color: "#0f172a" }}>{row.staffName}</strong>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: sc.bg, color: sc.color, fontWeight: 600 }}>{row.status}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        <CalendarDays size={14} /> {new Date(row.date).toLocaleDateString()}
                        <span style={{ color: "#cbd5e1" }}>|</span>
                        <MapPin size={14} /> {row.branchName || "Unassigned"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", marginTop: 4 }}>
                        <Clock size={14} /> 
                        {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No check-in"}
                        {row.checkOutAt ? ` → ${new Date(row.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                        <span style={{ color: "#cbd5e1" }}>|</span>
                        <strong>{row.workedHours}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!attendanceReport.rows?.length && <EmptyState title="No attendance report rows" message="Pick a date and report period to generate attendance rows for export." />}
          </div>
        </div>

        <div className="panel-card" ref={manualCreateRef} style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Manual Attendance Entry</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Create a new attendance record manually if staff missed check-in/out.</p>
          </div>
          <form className="form-grid" onSubmit={saveManualCreate} style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <label>
              <span className="muted">Staff member</span>
              <select required value={manualCreate.userSalonId} onChange={(e) => {
                const val = e.target.value;
                setManualCreate((current) => ({ ...current, userSalonId: val }));
                fetchExistingAttendance(val, manualCreate.attendanceDate);
              }}>
                <option value="">Select staff</option>
                {staffUsers.map((row) => (
                  <option key={row.id} value={row.id}>{row.user?.name || row.name || row.id}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="muted">Attendance date</span>
              <input type="date" required value={manualCreate.attendanceDate} onChange={(e) => {
                const val = e.target.value;
                setManualCreate((current) => ({ ...current, attendanceDate: val }));
                fetchExistingAttendance(manualCreate.userSalonId, val);
              }} />
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
              <button type="submit" disabled={manualCreateSaving}>{manualCreateSaving ? "Saving..." : <><UserPlus size={12} /> Create Manual Entry</>}</button>
            </div>
          </form>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 18, alignItems: "start", minWidth: 0 }}>
          <div className="panel-card" style={{ padding: "20px 24px", minWidth: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Attendance Records</h3>
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
                <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, attendanceQ: "", attendanceStatus: "", attendanceDate: "" }))}><RotateCcw size={12} /> Reset</button>
              </div>
            </div>
            <div className="list-stack" style={{ gap: 12 }}>
              {attendance.map((row) => {
                const statusColors = { PRESENT: { bg: "#dcfce7", color: "#166534" }, COMPLETED_SHIFT: { bg: "#f3e8ff", color: "#6b21a8" }, LATE: { bg: "#fef9c3", color: "#854d0e" }, HALF_DAY: { bg: "#ffedd5", color: "#9a3412" }, ABSENT: { bg: "#fee2e2", color: "#991b1b" }, LEAVE: { bg: "#ede9fe", color: "#5b21b6" }, WORKING: { bg: "#e0f2fe", color: "#0369a1" } };
                const sc = statusColors[row.status] || { bg: "#f1f5f9", color: "#475569" };
                const name = row.userSalon?.user?.name || row.userSalonId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="list-item"
                    onClick={() => loadAttendanceDetail(row.id)}
                    style={{ textAlign: "left", width: "100%", background: selectedAttendanceId === row.id ? "#eff6ff" : "white", border: selectedAttendanceId === row.id ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "center", color: "#0f172a", cursor: "pointer", transition: "all 0.2s" }}
                  >
                    {row.checkInSelfieUrl ? <img src={row.checkInSelfieUrl.startsWith("http") ? row.checkInSelfieUrl : `${api.defaults.baseURL?.replace("/api/v1", "") || ""}${row.checkInSelfieUrl}`} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }} onError={(e) => { e.target.style.display = "none"; }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>{name?.charAt(0)?.toUpperCase()}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ fontSize: 15, color: "#0f172a" }}>{name}</strong>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: sc.bg, color: sc.color, fontWeight: 600 }}>{row.status}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", marginTop: 6 }}>
                        <Clock size={14} /> 
                        {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No check-in"}
                        {row.checkOutAt ? ` → ${new Date(row.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        <MapPin size={14} /> {row.branch?.name || "Unassigned"}
                        <span style={{ color: "#cbd5e1" }}>|</span>
                        {row.workedMinutes != null ? <strong>{`${Math.floor(row.workedMinutes / 60)}h ${row.workedMinutes % 60}m`}</strong> : "Open shift"}
                      </div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: selectedAttendanceId === row.id ? "#bfdbfe" : "#f1f5f9", display: "grid", placeItems: "center", color: selectedAttendanceId === row.id ? "#1d4ed8" : "#64748b", flexShrink: 0 }}><ChevronRight size={16} /></div>
                  </button>
                );
              })}
              {!loading && !attendance.length && <EmptyState title="No attendance records yet" message="Attendance check-ins and check-outs will appear here once recorded." />}
              {attendanceMeta.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1px solid #e2e8f0", marginTop: 8 }}>
                  <button type="button" className="secondary-button" disabled={attendanceMeta.page <= 1} onClick={() => setAttendancePage((p) => p - 1)}><ChevronLeft size={12} /> Previous</button>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Page {attendanceMeta.page} of {attendanceMeta.totalPages} ({attendanceMeta.total} records)</span>
                  <button type="button" className="secondary-button" disabled={attendanceMeta.page >= attendanceMeta.totalPages} onClick={() => setAttendancePage((p) => p + 1)}>Next <ChevronRight size={12} /></button>
                </div>
              )}
            </div>
          </div>

          <div className="panel-card" ref={detailPanelRef} style={{ maxHeight: "80vh", overflowY: "auto", padding: "20px 24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Attendance Detail</h3>
            {detailLoading ? <PageLoader compact title="Loading attendance detail" message="Fetching record, GPS evidence, and audit history." /> : null}
            {!detailLoading && !selectedAttendance && (
              <EmptyState title="No record selected" message="Select an attendance row to inspect selfie, GPS, remarks, and manual correction options." />
            )}
            {selectedAttendance ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div className="item-meta"><strong><User size={12} /> Staff:</strong> {selectedAttendance.userSalon?.user?.name || "-"}</div>
                <div className="item-meta"><strong>Branch:</strong> {selectedAttendance.branch?.name || "-"}</div>
                <div className="item-meta"><strong><CalendarDays size={12} /> Date:</strong> {new Date(selectedAttendance.attendanceDate || selectedAttendance.checkInAt).toLocaleDateString()}</div>
                <div className="item-meta"><strong><CheckCircle2 size={12} /> Status:</strong> <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: selectedAttendance.status === "PRESENT" || selectedAttendance.status === "COMPLETED_SHIFT" ? "#dcfce7" : selectedAttendance.status === "LATE" ? "#fef9c3" : selectedAttendance.status === "HALF_DAY" ? "#ffedd5" : selectedAttendance.status === "LEAVE" ? "#ede9fe" : selectedAttendance.status === "WORKING" ? "#e0f2fe" : "#fee2e2", color: selectedAttendance.status === "PRESENT" || selectedAttendance.status === "COMPLETED_SHIFT" ? "#166534" : selectedAttendance.status === "LATE" ? "#854d0e" : selectedAttendance.status === "HALF_DAY" ? "#9a3412" : selectedAttendance.status === "LEAVE" ? "#5b21b6" : selectedAttendance.status === "WORKING" ? "#0369a1" : "#991b1b" }}>{selectedAttendance.status}</span></div>
                <div className="item-meta"><strong><LogIn size={12} /> Check-In:</strong> {selectedAttendance.checkInAt ? new Date(selectedAttendance.checkInAt).toLocaleString() : "-"}</div>
                <div className="item-meta"><strong><LogOut size={12} /> Check-Out:</strong> {selectedAttendance.checkOutAt ? new Date(selectedAttendance.checkOutAt).toLocaleString() : "-"}</div>
                <div className="item-meta"><strong><Clock size={12} /> Worked Hours:</strong> {selectedAttendance.workedMinutes != null ? `${Math.floor(selectedAttendance.workedMinutes / 60)}h ${selectedAttendance.workedMinutes % 60}m` : "-"}</div>
                {selectedAttendance.overtimeMinutes > 0 && <div className="item-meta" style={{ color: "#ea580c", fontWeight: 600 }}><strong><Timer size={12} /> Overtime:</strong> {Math.floor(selectedAttendance.overtimeMinutes / 60)}h {selectedAttendance.overtimeMinutes % 60}m</div>}
                <div className="item-meta"><strong><MapPin size={12} /> Check-In GPS:</strong> {selectedAttendance.checkInLatitude ? `${Number(selectedAttendance.checkInLatitude).toFixed(4)}, ${Number(selectedAttendance.checkInLongitude).toFixed(4)}` : "Not captured"} {selectedAttendance.checkInAccuracyMeters ? `(${Math.round(selectedAttendance.checkInAccuracyMeters)}m accuracy)` : ""}</div>
                <div className="item-meta"><strong><MapPin size={12} /> Check-Out GPS:</strong> {selectedAttendance.checkOutLatitude ? `${Number(selectedAttendance.checkOutLatitude).toFixed(4)}, ${Number(selectedAttendance.checkOutLongitude).toFixed(4)}` : "Not captured"} {selectedAttendance.checkOutAccuracyMeters ? `(${Math.round(selectedAttendance.checkOutAccuracyMeters)}m accuracy)` : ""}</div>
                <div className="item-meta"><strong>Geo Status:</strong> {selectedAttendance.geoStatus || "-"}</div>
                <div className="item-meta"><strong>Verification:</strong> {selectedAttendance.verificationMethod || "-"}</div>
                <div className="item-meta"><strong><FileText size={12} /> Admin Remark:</strong> {selectedAttendance.adminRemark || "None"}</div>
                <div className="item-meta"><strong><FileText size={12} /> Note:</strong> {selectedAttendance.note || "None"}</div>
                {selectedAttendance.checkInSelfieUrl ? <div><strong style={{ fontSize: 12, color: "#64748b" }}>Check-In Selfie</strong><img src={selectedAttendance.checkInSelfieUrl.startsWith("http") ? selectedAttendance.checkInSelfieUrl : `${api.defaults.baseURL?.replace("/api/v1", "") || ""}${selectedAttendance.checkInSelfieUrl}`} alt="Check-in selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", marginTop: 4 }} /></div> : null}
                {selectedAttendance.checkOutSelfieUrl ? <div><strong style={{ fontSize: 12, color: "#64748b" }}>Check-Out Selfie</strong><img src={selectedAttendance.checkOutSelfieUrl.startsWith("http") ? selectedAttendance.checkOutSelfieUrl : `${api.defaults.baseURL?.replace("/api/v1", "") || ""}${selectedAttendance.checkOutSelfieUrl}`} alt="Check-out selfie" style={{ width: "100%", borderRadius: 12, border: "1px solid #e2e8f0", marginTop: 4 }} /></div> : null}

                {!attendanceSettings.allowManualAttendanceEdits ? (
                  <div style={{ padding: "10px 16px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
                    Manual attendance edits are currently disabled in Attendance Settings. Enable them to make corrections.
                  </div>
                ) : (
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
                  <textarea rows={2} required value={manualEdit.reason} placeholder="Reason for manual correction (minimum 3 characters)" onChange={(e) => setManualEdit((current) => ({ ...current, reason: e.target.value }))} />
                  <button type="submit" disabled={manualSaving}>{manualSaving ? "Saving..." : <><Save size={12} /> Save Manual Update</>}</button>
                </form>
                )}

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                  <h4 style={{ marginTop: 0 }}><History size={14} /> Audit Log</h4>
                  <div className="list-stack">
                    {(selectedAttendance.auditLogs || []).map((log) => (
                      <div key={log.id} className="list-item" style={{ borderLeft: "3px solid #6366f1", paddingLeft: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: 13 }}>{log.action?.replace(/_/g, " ")}</strong>
                          <span className="muted" style={{ fontSize: 11 }}>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="item-meta" style={{ fontSize: 12 }}>{log.actorMembership?.user?.name || "Admin"}</div>
                        {log.metadata?.reason && <div className="item-meta" style={{ fontSize: 12, fontStyle: "italic" }}>"{log.metadata.reason}"</div>}
                        {log.metadata?.previousValue && log.metadata?.updatedValue ? (
                          <div style={{ marginTop: 6, fontSize: 11, background: "#f8fafc", borderRadius: 8, padding: 8, border: "1px solid #e2e8f0" }}>
                            {Object.keys(log.metadata.updatedValue).filter((key) => {
                              const oldVal = log.metadata.previousValue[key];
                              const newVal = log.metadata.updatedValue[key];
                              return JSON.stringify(oldVal) !== JSON.stringify(newVal);
                            }).map((key) => (
                              <div key={key} style={{ marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>{key}:</span>{" "}
                                <span style={{ color: "#991b1b", textDecoration: "line-through" }}>{typeof log.metadata.previousValue[key] === "object" ? JSON.stringify(log.metadata.previousValue[key]) : String(log.metadata.previousValue[key] ?? "-")}</span>
                                {" → "}
                                <span style={{ color: "#166534", fontWeight: 600 }}>{typeof log.metadata.updatedValue[key] === "object" ? JSON.stringify(log.metadata.updatedValue[key]) : String(log.metadata.updatedValue[key] ?? "-")}</span>
                              </div>
                            ))}
                          </div>
                        ) : log.summary ? <div className="item-meta" style={{ fontSize: 12 }}>{log.summary}</div> : null}
                      </div>
                    ))}
                    {!selectedAttendance.auditLogs?.length && <span className="muted">No manual edits yet.</span>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel-card" style={{ padding: "20px 24px" }}>
          <div className="item-head" style={{ alignItems: "flex-end" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Daily Attendance Sheet</h3>
              <div className="item-meta">Printable branch-wise daily sheet for the selected date and branch filter.</div>
            </div>
            <div className="badge-row">
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="muted" style={{ fontSize: 12 }}>Date:</span>
                <input type="date" value={daySheetDate} onChange={(e) => setDaySheetDate(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </label>
              <button type="button" className="secondary-button" onClick={printAttendanceDaySheet}><Printer size={12} /> Print Sheet</button>
              <button type="button" className="secondary-button" onClick={() => downloadDaySheetExport("xlsx")}><Download size={12} /> Daily Excel</button>
              <button type="button" className="secondary-button" onClick={() => downloadDaySheetExport("pdf")}><Download size={12} /> Daily PDF</button>
            </div>
          </div>
          <div className="list-stack" style={{ gap: 12 }}>
            {attendanceDaySheet.map((row) => {
              const statusColors = { PRESENT: { bg: "#dcfce7", color: "#166534" }, COMPLETED_SHIFT: { bg: "#f3e8ff", color: "#6b21a8" }, LATE: { bg: "#fef9c3", color: "#854d0e" }, HALF_DAY: { bg: "#ffedd5", color: "#9a3412" }, ABSENT: { bg: "#fee2e2", color: "#991b1b" }, LEAVE: { bg: "#ede9fe", color: "#5b21b6" }, WORKING: { bg: "#e0f2fe", color: "#0369a1" } };
              const sc = statusColors[row.status] || { bg: "#f1f5f9", color: "#475569" };
              return (
                <button key={`${row.userSalonId}-${row.status}`} type="button" className="list-item" onClick={() => { if (row.attendanceId) loadAttendanceDetail(row.attendanceId); }} style={{ display: "flex", gap: 16, alignItems: "center", textAlign: "left", width: "100%", background: row.attendanceId && selectedAttendanceId === row.attendanceId ? "#eff6ff" : "white", border: row.attendanceId && selectedAttendanceId === row.attendanceId ? "1px solid #bfdbfe" : "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", cursor: row.attendanceId ? "pointer" : "default", transition: "all 0.2s" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                    {row.staffName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 15, color: "#0f172a" }}>{row.staffName}</strong>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: sc.bg, color: sc.color, fontWeight: 600 }}>{row.status}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginTop: 6 }}>
                      <MapPin size={14} /> {row.branchName || "Unassigned"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", marginTop: 4 }}>
                      <Clock size={14} /> 
                      {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No check-in"}
                      {row.checkOutAt ? ` → ${new Date(row.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                      {row.workedMinutes != null ? <><span style={{ color: "#cbd5e1" }}>|</span><strong>{`${Math.floor(row.workedMinutes / 60)}h ${row.workedMinutes % 60}m`}</strong></> : null}
                    </div>
                  </div>
                  {row.attendanceId && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b", flexShrink: 0 }}><Eye size={16} /></div>}
                </button>
              );
            })}
            {!attendanceDaySheet.length && <EmptyState title="No day sheet rows" message="Staff day sheet will show present, leave, and absent projection for the selected date." />}
          </div>
        </div>
      </div>
    </div>
  );
}
