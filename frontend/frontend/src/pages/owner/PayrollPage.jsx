import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

const emptyRun = {
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: new Date().toISOString().slice(0, 10),
  notes: ""
};

export default function PayrollPage() {
  const location = useLocation();
  const [runs, setRuns] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [report, setReport] = useState([]);
  const [filters, setFilters] = useState({ payrollStatus: "", branchId: "", attendanceQ: "", attendanceBranchId: "", leaveStatus: "", leaveQ: "", incentiveQ: "" });
  const [form, setForm] = useState(emptyRun);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

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
      const [runResponse, attendanceResponse, leaveResponse, incentiveResponse, reportResponse] = await Promise.all([
        api.get("/owner/payroll", { params: { ...(filters.payrollStatus ? { status: filters.payrollStatus } : {}), ...(filters.branchId ? { branchId: filters.branchId } : {}) } }),
        api.get("/owner/attendance", { params: { ...(filters.attendanceQ ? { q: filters.attendanceQ } : {}), ...(filters.attendanceBranchId ? { branchId: filters.attendanceBranchId } : {}) } }),
        api.get("/owner/leaves", { params: { ...(filters.leaveStatus ? { status: filters.leaveStatus } : {}), ...(filters.leaveQ ? { q: filters.leaveQ } : {}) } }),
        api.get("/owner/incentives", { params: { ...(filters.incentiveQ ? { q: filters.incentiveQ } : {}) } }),
        api.get("/owner/payroll/reports")
      ]);
      setRuns(runResponse.data || []);
      setAttendance(attendanceResponse.data || []);
      setLeaves(leaveResponse.data || []);
      setIncentives(incentiveResponse.data || []);
      setReport(reportResponse.data?.rows || []);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load payroll workspace"), success: "" });
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

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
            <input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            <input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
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
            <label>
              <span className="muted">Filter by branch id</span>
              <input value={filters.branchId} placeholder="Filter by branch id" onChange={(e) => setFilters((current) => ({ ...current, branchId: e.target.value }))} />
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, payrollStatus: "", branchId: "" }))}>Reset</button>
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
        <div className="panel-card">
          <h3>Attendance</h3>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              <span className="muted">Search staff name</span>
              <input value={filters.attendanceQ} placeholder="Search staff name" onChange={(e) => setFilters((current) => ({ ...current, attendanceQ: e.target.value }))} />
            </label>
            <label>
              <span className="muted">Filter by branch id</span>
              <input value={filters.attendanceBranchId} placeholder="Filter by branch id" onChange={(e) => setFilters((current) => ({ ...current, attendanceBranchId: e.target.value }))} />
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters((current) => ({ ...current, attendanceQ: "", attendanceBranchId: "" }))}>Reset</button>
          </div>
          <div className="list-stack">
            {attendance.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.userSalon?.user?.name || row.userSalonId}</strong>
                <div className="item-meta">{new Date(row.checkInAt).toLocaleString()} {row.checkOutAt ? `- ${new Date(row.checkOutAt).toLocaleString()}` : ""}</div>
              </div>
            ))}
            {!loading && !attendance.length && <EmptyState title="No attendance records yet" message="Attendance check-ins and check-outs will appear here once recorded." />}
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
