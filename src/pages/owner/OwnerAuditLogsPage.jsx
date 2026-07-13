import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";

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
        fallbackFilename: "audit-logs-export.csv"
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not export audit logs"), success: "" });
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
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not load audit logs"), loading: false }));
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
    <div className="page-shell">
      <ModuleTabs
        title="Audit Logs"
        description="Read-only activity trail for critical salon actions."
        items={[{ label: "Audit Logs", to: "/admin/audit-logs" }]}
        actions={<button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button>}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      <div className="panel-card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 20 }}>
          <label style={{ flex: "1 1 250px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Search</span>
            <input
              style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
              value={filters.q}
              placeholder="Search module, action, summary, or reference"
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
          </label>
          <label style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Modules</span>
            <select style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }} value={filters.module} onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))}>
              <option value="">All modules</option>
              {modules.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Actions</span>
            <select style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }} value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}>
              <option value="">All actions</option>
              {actions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button" style={{ padding: "8px 16px", height: 38 }} onClick={() => setFilters({ q: "", module: "", action: "" })}>Reset</button>
        </div>
        {status.loading ? (
          <PageLoader
            compact
            title="Loading salon audit logs"
            message="Bringing in role changes, settings edits, billing actions, and critical operations history."
          />
        ) : null}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: 700 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Date & Time</th>
                <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Module</th>
                <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Action</th>
                <th style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "12px 16px", fontSize: 13, whiteSpace: "nowrap", color: "#475569" }}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{row.module}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", background: "#f0fdf4", color: "#16a34a", borderRadius: 4, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em" }}>
                      {row.action}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.summary || row.reference || "-"}>
                    {row.summary || row.reference || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!status.loading && !rows.length && (
            <div style={{ padding: 40 }}>
              <EmptyState
                title="No audit logs yet"
                message="As soon as the salon performs trackable actions, the secure history will appear here."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
