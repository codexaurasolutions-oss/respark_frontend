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
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label>
              <span className="muted">Search module, action, summary, or reference</span>
              <input
            value={filters.q}
            placeholder="Search module, action, summary, or reference"
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Modules</span>
              <select value={filters.module} onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))}>
            <option value="">All modules</option>
            {modules.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
            </label>
          <label>
              <span className="muted">Actions</span>
              <select value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}>
            <option value="">All actions</option>
            {actions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
            </label>
          <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", module: "", action: "" })}>Reset</button>
        </div>
        {status.loading ? (
          <PageLoader
            compact
            title="Loading salon audit logs"
            message="Bringing in role changes, settings edits, billing actions, and critical operations history."
          />
        ) : null}
        <div className="list-stack">
          {rows.map((row) => (
            <div key={row.id} className="list-item">
              <strong>{row.module} | {row.action}</strong>
              <div className="item-meta">{row.summary || row.reference || "-"}</div>
            </div>
          ))}
          {!status.loading && !rows.length && (
            <EmptyState
              title="No audit logs yet"
              message="As soon as the salon performs trackable actions, the secure history will appear here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
