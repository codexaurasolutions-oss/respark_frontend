import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import { Activity, ShieldAlert, Download, Search, Layout, MousePointerClick, AlertCircle } from "lucide-react";

export default function OwnerAuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", module: "", action: "" });
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const exportCsv = async () => {
    try {
      await downloadFromApi("/owner/audit-logs/export.csv", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.module ? { module: filters.module } : {}),
          ...(filters.action ? { action: filters.action } : {})
        },
        fallbackFilename: "activity-logs-export.csv"
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not export activity logs"), success: "", loading: false });
    }
  };

  const load = useCallback(async () => {
    try {
      const response = await api.get("/owner/audit-logs", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.module ? { module: filters.module } : {}),
          ...(filters.action ? { action: filters.action } : {})
        }
      });
      setRows(response.data || []);
      setStatus((current) => ({ ...current, error: "", loading: false }));
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not load activity logs"), loading: false }));
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const modules = [...new Set(rows.map((row) => row.module).filter(Boolean))];
  const actions = [...new Set(rows.map((row) => row.action).filter(Boolean))];

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-1 { animation-delay: 0.1s; }
        
        .al-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s; }
        .al-card:hover { transform: translateY(-2px); box-shadow: none; border-color: #cbd5e1; }
        
        .al-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; }
        .al-input:focus { border-color: #0f766e; box-shadow: none; }
        
        /* Table Styles to match Respark */
        .activity-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: 'Inter', sans-serif; }
        .activity-table th { background: #f8fafc; padding: 14px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
        .activity-table td { padding: 14px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; white-space: nowrap; }
        .activity-table tr:hover td { background: #f8fafc; }
      `}</style>

      <ModuleTabs
        title="Activity Logs"
        items={[{ label: "Activity Logs", to: "/admin/audit-logs" }]}
        actions={
          <button type="button" onClick={exportCsv} style={{ padding: "10px 20px", borderRadius: 12, background: "white", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
            <Download size={16} /> Export CSV
          </button>
        }
      />

      <div className="anim-fade" style={{ background: "linear-gradient(135deg, #042f2e, #134e4a)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={32} color="#5eead4" />
            Activity Logs
          </h1>
          <p style={{ margin: 0, color: "#99f6e4", fontSize: 15, maxWidth: 500 }}>Track everyday operational events across the salon.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", color: "white", padding: "12px 24px", borderRadius: 20, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)" }}>
          <Activity size={20} /> Recorded Events: {rows.length}
        </div>
      </div>

      {status.error && <div className="anim-fade" style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}

      <div className="al-card anim-fade delay-1" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
              <input className="al-input" style={{ paddingLeft: 40 }} value={filters.q} placeholder="Search summary or reference..." onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            </div>
            <div style={{ position: "relative" }}>
              <Layout size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
              <select className="al-input" style={{ paddingLeft: 40 }} value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
                <option value="">All Features</option>
                {modules.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div style={{ position: "relative", display: "flex", gap: 12 }}>
              <MousePointerClick size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
              <select className="al-input" style={{ paddingLeft: 40 }} value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
                <option value="">All Actions</option>
                {actions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <button onClick={() => setFilters({ q: "", module: "", action: "" })} style={{ border: "none", background: "none", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>Reset</button>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {status.loading ? (
            <PageLoader compact title="Loading activity logs" message="Pulling secure action logs..." />
          ) : (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Feature</th>
                  <th>Action</th>
                  <th>Performed by</th>
                  <th>Guest/Staff Name</th>
                  <th>Guest/Staff Number</th>
                  <th>Invoice ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const logDate = new Date(row.createdAt);
                  const dateStr = logDate.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                  const timeStr = logDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
                  
                  const performedBy = row.actorMembership?.user?.name || row.actorUserId || "System";
                  
                  // Try to extract metadata if it exists, otherwise fallback to parsing from EntityId if possible, or "-"
                  const metadata = row.metadata || {};
                  const guestName = metadata.guestName || metadata.staffName || "-";
                  const guestNumber = metadata.guestPhone || metadata.staffPhone || "-";
                  const invoiceId = metadata.invoiceId || (row.entityType === 'Invoice' ? row.entityId : "-");

                  return (
                    <tr key={row.id}>
                      <td>{dateStr}</td>
                      <td>{timeStr}</td>
                      <td style={{ textTransform: 'uppercase' }}>{row.module}</td>
                      <td style={{ textTransform: 'uppercase' }}>{row.action}</td>
                      <td>{performedBy}</td>
                      <td>{guestName}</td>
                      <td>{guestNumber}</td>
                      <td>{invoiceId}</td>
                    </tr>
                  );
                })}
                {!status.loading && !rows.length && (
                  <tr>
                    <td colSpan="8" style={{ padding: 40, textAlign: "center" }}>
                      <EmptyState title="No activity logs matched" message="As soon as the salon performs trackable actions, they will appear here." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
