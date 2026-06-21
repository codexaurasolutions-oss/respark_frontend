import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

export default function AuditLogsPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "" });

  const typeOptions = useMemo(() => [...new Set(rows.map((row) => row.type).filter(Boolean))], [rows]);

  useEffect(() => {
    let active = true;
    api.get("/super-admin/audit-logs", {
      params: {
        ...(query ? { q: query } : {}),
        ...(typeFilter ? { type: typeFilter } : {})
      }
    }).then((response) => {
      if (!active) return;
      setRows(response.data || []);
      setStatus({ loading: false, error: "" });
    }).catch((error) => {
      if (!active) return;
      setRows([]);
      setStatus({ loading: false, error: formatApiError(error, "Could not load audit logs") });
    });
    return () => {
      active = false;
    };
  }, [query, typeFilter]);

  return (
    <div className="page-shell">
      <h2>Audit Logs</h2>
      <div className="panel-card">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label>
              <span className="muted">Search action, type, or metadata</span>
              <input value={query} placeholder="Search action, type, or metadata" onChange={(event) => setQuery(event.target.value)} />
            </label>
          <label>
              <span className="muted">Types</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option>
            {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
            </label>
          <button type="button" className="secondary-button" onClick={() => { setQuery(""); setTypeFilter(""); }}>Reset</button>
        </div>
        {status.error && <p className="error-text">{status.error}</p>}
        {status.loading && (
          <PageLoader
            compact
            title="Loading audit activity"
            message="Collecting platform-wide governance events and recent SaaS changes."
          />
        )}
        <div className="list-stack">
          {rows.map((row) => (
            <div key={row.id} className="list-item">
              <div className="item-head">
                <div>
                  <strong>{row.type}</strong>
                  <div className="item-meta">{row.action}</div>
                </div>
                <span className="badge">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
              <div className="muted">No detailed metadata preview available.</div>
            </div>
          ))}
          {!status.loading && !rows.length && (
            <EmptyState
              title="No audit activity for this filter"
              message="Try widening the search or resetting the filter to see more platform activity."
            />
          )}
        </div>
      </div>
    </div>
  );
}
