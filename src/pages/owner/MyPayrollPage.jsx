import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { getMyWorkspaceTabs } from "../../utils/myWorkspaceTabs";
import { Wallet, Landmark, TrendingUp, DollarSign, CalendarCheck, TrendingDown, CheckCircle2, Sparkles, Clock, MapPin } from "lucide-react";

export default function MyPayrollPage() {
  const { auth } = useAuth();
  const { formatMoney } = useSalonSettings();
  const [data, setData] = useState({
    summary: { itemCount: 0, totalBaseSalary: 0, totalCommission: 0, totalIncentive: 0, totalAdjustments: 0, totalDeductions: 0, totalNet: 0 },
    items: []
  });
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const myTabs = getMyWorkspaceTabs(auth?.membership?.permissions || {});
  const money = (value) => formatMoney(value || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    Promise.all([
      api.get("/owner/my-payroll").catch(() => ({ data: { summary: {}, items: [] } })),
      api.get("/owner/my-attendance").catch(() => ({ data: [] }))
    ]).then(([payrollRes, attendanceRes]) => {
      setData({
        summary: {
          itemCount: payrollRes.data?.summary?.itemCount || 0,
          totalBaseSalary: payrollRes.data?.summary?.totalBaseSalary || 0,
          totalCommission: payrollRes.data?.summary?.totalCommission || 0,
          totalIncentive: payrollRes.data?.summary?.totalIncentive || 0,
          totalAdjustments: payrollRes.data?.summary?.totalAdjustments || 0,
          totalDeductions: payrollRes.data?.summary?.totalDeductions || 0,
          totalNet: payrollRes.data?.summary?.totalNet || 0
        },
        items: payrollRes.data?.items || []
      });
      setAttendance(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeIn 0.5s ease-out both; }
        
        .p-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s; }
        .p-card:hover { transform: translateY(-2px); box-shadow: none; }
        
        .stat-box { background: white; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px; box-shadow: none; }
        .stat-box .label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-box .value { font-size: 28px; font-weight: 800; color: #0f172a; font-family: monospace; }
        
        .run-item { display: grid; grid-template-columns: 2fr 3fr; gap: 24px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 16px; transition: all 0.2s; }
        .run-item:hover { border-color: #6366f1; background: #f8fafc; }
      `}</style>

      <ModuleTabs
        title="My Payroll"
        items={myTabs}
      />

      <div className="anim-fade" style={{ background: "linear-gradient(135deg, #0ea5e9, #0369a1)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <Wallet size={32} color="#bae6fd" />
            My Payroll
          </h1>
          <p style={{ margin: 0, color: "#e0f2fe", fontSize: 15, maxWidth: 500 }}>Review your personal salary runs, commission splits, and net payouts securely.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "white", padding: "12px 24px", borderRadius: 20, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.3)" }}>
          <Landmark size={20} /> Net Pay: {money(data.summary.totalNet)}
        </div>
      </div>

      {loading ? (
        <PageLoader title="Calculating Payroll" message="Preparing your salary runs, incentives, and final payout totals..." />
      ) : (
        <div className="anim-fade" style={{ animationDelay: "0.1s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
            <div className="stat-box">
              <span className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}><DollarSign size={14} color="#64748b" /> Base Salary</span>
              <span className="value">{money(data.summary.totalBaseSalary)}</span>
            </div>
            <div className="stat-box">
              <span className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} color="#16a34a" /> Commission</span>
              <span className="value" style={{ color: "#166534" }}>+ {money(data.summary.totalCommission)}</span>
            </div>
            <div className="stat-box">
              <span className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={14} color="#0ea5e9" /> Incentive</span>
              <span className="value" style={{ color: "#0369a1" }}>+ {money(data.summary.totalIncentive)}</span>
            </div>
            <div className="stat-box" style={{ background: "#fff1f2", borderColor: "#fecdd3" }}>
              <span className="label" style={{ display: "flex", alignItems: "center", gap: 6, color: "#e11d48" }}><TrendingDown size={14} /> Deductions</span>
              <span className="value" style={{ color: "#9f1239" }}>- {money(data.summary.totalDeductions)}</span>
            </div>
          </div>

          <div className="p-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Clock size={20} color="#0ea5e9" /> Recent Attendance</h3>
            </div>
            <div style={{ padding: 24 }}>
              {attendance.slice(0, 14).map((row) => (
                <div key={row.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#dcfce7" : row.status === "LATE" ? "#fef9c3" : row.status === "HALF_DAY" ? "#ffedd5" : row.status === "LEAVE" ? "#ede9fe" : row.status === "WORKING" ? "#e0f2fe" : row.status === "ABSENT" ? "#fee2e2" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CalendarCheck size={18} color={row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#16a34a" : row.status === "LATE" ? "#ca8a04" : row.status === "HALF_DAY" ? "#ea580c" : row.status === "LEAVE" ? "#7c3aed" : row.status === "WORKING" ? "#0ea5e9" : row.status === "ABSENT" ? "#e11d48" : "#94a3b8"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 14 }}>{new Date(row.attendanceDate || row.checkInAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</strong>
                      <span style={{ padding: "2px 8px", background: row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#dcfce7" : row.status === "LATE" ? "#fef9c3" : row.status === "HALF_DAY" ? "#ffedd5" : row.status === "LEAVE" ? "#ede9fe" : row.status === "WORKING" ? "#e0f2fe" : row.status === "ABSENT" ? "#fee2e2" : "#f1f5f9", color: row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#166534" : row.status === "LATE" ? "#854d0e" : row.status === "HALF_DAY" ? "#9a3412" : row.status === "LEAVE" ? "#5b21b6" : row.status === "WORKING" ? "#0369a1" : row.status === "ABSENT" ? "#991b1b" : "#475569", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>{row.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      {row.checkInAt ? `In: ${new Date(row.checkInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      {row.checkOutAt ? ` → Out: ${new Date(row.checkOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                    </div>
                    {row.workedMinutes != null && <div style={{ fontSize: 12, color: "#0ea5e9", fontWeight: 600, marginTop: 2 }}>Worked: {Math.floor(row.workedMinutes / 60)}h {row.workedMinutes % 60}m</div>}
                    {row.branch?.name && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}><MapPin size={10} style={{ display: "inline" }} /> {row.branch.name}</div>}
                  </div>
                </div>
              ))}
              {!attendance.length && <EmptyState title="No attendance records" message="Your check-in and check-out history will appear here." />}
            </div>
          </div>

          <div className="p-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><CalendarCheck size={20} color="#0ea5e9" /> Salary Runs History</h3>
            </div>
            <div style={{ padding: 24 }}>
              {data.items.map((item) => {
                const totalDed = Number(item.attendanceDeduction || 0) + Number(item.leaveDeduction || 0);
                return (
                  <div key={item.id} className="run-item">
                    
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Pay Period</div>
                      <h4 style={{ margin: "0 0 12px", fontSize: 16, color: "#0f172a" }}>
                        {item.payrollRun?.periodStart ? `${new Date(item.payrollRun.periodStart).toLocaleDateString()} - ${new Date(item.payrollRun.periodEnd).toLocaleDateString()}` : "Payroll Run"}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ padding: "4px 10px", background: item.payrollRun?.status === "PAID" ? "#dcfce7" : "#f1f5f9", color: item.payrollRun?.status === "PAID" ? "#166534" : "#475569", borderRadius: 12, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                          {item.payrollRun?.status === "PAID" && <CheckCircle2 size={12} />}
                          {item.payrollRun?.status || "DRAFT"}
                        </span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.payrollRun?.branch?.name || "All branches"}</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#64748b" }}>Base</span><span style={{ fontWeight: 600, color: "#334155" }}>{money(item.baseSalary)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#16a34a" }}>Commission</span><span style={{ fontWeight: 600, color: "#166534" }}>+ {money(item.commissionAmount)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#0ea5e9" }}>Incentive</span><span style={{ fontWeight: 600, color: "#0369a1" }}>+ {money(item.incentiveAmount)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#e11d48" }}>Deductions</span><span style={{ fontWeight: 600, color: "#9f1239" }}>- {money(totalDed)}</span>
                      </div>
                      <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", fontSize: 18, borderTop: "1px dashed #cbd5e1", paddingTop: 12, marginTop: 4 }}>
                        <span style={{ fontWeight: 800, color: "#0f172a" }}>Net Payout</span><span style={{ fontWeight: 800, color: "#0f172a" }}>{money(item.netAmount)}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
              {!data.items.length && (
                <EmptyState title="No payroll runs found" message="Your salary details will appear here once payroll runs are generated and calculated for your staff account." />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
