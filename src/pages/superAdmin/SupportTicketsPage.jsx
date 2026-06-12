import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function SuperAdminSupportTicketsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", priority: "" });
  const [savingId, setSavingId] = useState("");
  const [notes, setNotes] = useState({});
  const [assignedAgents, setAssignedAgents] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    const response = await api.get("/super-admin/support-tickets", {
      params: {
        ...(nextFilters.q ? { q: nextFilters.q } : {}),
        ...(nextFilters.status ? { status: nextFilters.status } : {}),
        ...(nextFilters.priority ? { priority: nextFilters.priority } : {})
      }
    });
    setRows(response.data);
    setNotes(Object.fromEntries(response.data.map((row) => [row.id, row.internalNote || ""])));
    setAssignedAgents(Object.fromEntries(response.data.map((row) => [row.id, row.assignedAgentName || ""])));
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    api.get("/super-admin/support-tickets", {
      params: {
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {})
      }
    }).then((response) => {
      if (!active) return;
      setRows(response.data);
      setNotes(Object.fromEntries(response.data.map((row) => [row.id, row.internalNote || ""])));
      setAssignedAgents(Object.fromEntries(response.data.map((row) => [row.id, row.assignedAgentName || ""])));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [filters]);

  const updateTicket = async (ticketId, data) => {
    setSavingId(ticketId);
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/super-admin/support-tickets/${ticketId}`, data);
      await load();
      setStatus({ error: "", success: "Ticket updated." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update ticket"), success: "" });
    }
    setSavingId("");
  };

  const sendReply = async (ticketId, nextStatus = "PENDING") => {
    setSavingId(ticketId);
    setStatus({ error: "", success: "" });
    try {
      await api.post(`/super-admin/support-tickets/${ticketId}/messages`, {
        message: replyDrafts[ticketId] || "",
        attachmentUrl: replyAttachments[ticketId] || "",
        status: nextStatus
      });
      setReplyDrafts((current) => ({ ...current, [ticketId]: "" }));
      setReplyAttachments((current) => ({ ...current, [ticketId]: "" }));
      await load();
      setStatus({ error: "", success: "Support reply sent." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send reply"), success: "" });
    }
    setSavingId("");
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Support Tickets</h1>
            <p style={{ marginBottom: 0 }}>Manage platform support queue, internal notes, replies, and resolution progress from one inbox.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Queue {rows.length}</span>
            <span className="badge">Open {rows.filter((row) => row.status === "OPEN").length}</span>
          </div>
        </div>
      </div>
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="form-grid">
          <label>
              <span className="muted">Search title, description, category, or salon</span>
              <input value={filters.q} placeholder="Search title, description, category, or salon" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
            </label>
          <label>
              <span className="muted">Priorities</span>
              <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
            </label>
          <button type="button" className="secondary-button" onClick={() => load(filters)}>Apply Filters</button>
          <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "", priority: "" })}>Reset</button>
        </div>
      </div>
      {status.error && <p className="error-text">{status.error}</p>}
      {status.success && <p className="success-text">{status.success}</p>}
      <div className="panel-card">
        {loading ? (
          <PageLoader
            title="Loading support queue"
            message="Pulling ticket status, internal notes, conversations, and recent events."
          />
        ) : rows.length ? rows.map((row) => {
          const isClosed = row.status === "CLOSED";
          return (
            <div key={row.id} style={{ padding: "12px 0", borderTop: "1px solid #e2e8f0" }}>
              <div className="item-head">
                <div>
                  <strong>{row.title}</strong> - {row.priority} - {row.status}
                  <div className="item-meta">Salon: {row.salon?.name || "Global"} | Category: {row.category || "General"}</div>
                </div>
                <span className="badge">{new Date(row.updatedAt).toLocaleString()}</span>
              </div>
              <p>{row.description}</p>
              <textarea
                rows="3"
                value={notes[row.id] || ""}
                onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })}
                placeholder="Internal note"
                disabled={isClosed}
              />
              <input
                value={assignedAgents[row.id] || ""}
                onChange={(event) => setAssignedAgents({ ...assignedAgents, [row.id]: event.target.value })}
                placeholder="Assigned support agent (placeholder)"
                disabled={isClosed}
                style={{ marginTop: 8 }}
              />
              <div className="list-stack" style={{ marginTop: 10 }}>
                {(row.messages || []).map((message) => (
                  <div key={message.id} className="list-item">
                    <div className="item-head">
                      <strong>{message.authorName}</strong>
                      <span className="badge">{message.authorType}</span>
                    </div>
                    <div className="item-meta">{new Date(message.createdAt).toLocaleString()}</div>
                    <p style={{ marginBottom: 0 }}>{message.message}</p>
                    {message.attachmentUrl && <div className="item-meta">Attachment placeholder: {message.attachmentUrl}</div>}
                  </div>
                ))}
              </div>
              <div className="list-stack" style={{ marginTop: 10 }}>
                {(row.events || []).map((event) => (
                  <div key={event.id} className="list-item">
                    <div className="item-head">
                      <strong>{event.eventType}</strong>
                      <span className="badge">{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="item-meta">{event.actorName}</div>
                    <div className="item-meta">{event.details || "No event details"}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {!isClosed && <button type="button" className="secondary-button" onClick={() => updateTicket(row.id, { status: "PENDING", internalNote: notes[row.id] || "", assignedAgentName: assignedAgents[row.id] || null })}>Pending</button>}
                {!isClosed && <button type="button" className="secondary-button" onClick={() => updateTicket(row.id, { status: "RESOLVED", internalNote: notes[row.id] || "", assignedAgentName: assignedAgents[row.id] || null })}>Resolve</button>}
                {!isClosed && <button type="button" onClick={() => updateTicket(row.id, { status: "CLOSED", internalNote: notes[row.id] || "", assignedAgentName: assignedAgents[row.id] || null })}>Close</button>}
                {!isClosed && <button type="button" className="secondary-button" onClick={() => updateTicket(row.id, { internalNote: notes[row.id] || "", assignedAgentName: assignedAgents[row.id] || null })}>Save Note</button>}
                {isClosed && <button type="button" className="secondary-button" onClick={() => updateTicket(row.id, { status: "OPEN" })}>Reopen</button>}
                {savingId === row.id && <span>Saving...</span>}
              </div>
              {!isClosed && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    rows="3"
                    value={replyDrafts[row.id] || ""}
                    placeholder="Reply back to salon"
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                  <label>
              <span className="muted">Attachment URL / file reference placeholder</span>
              <input
                    value={replyAttachments[row.id] || ""}
                    placeholder="Attachment URL / file reference placeholder"
                    onChange={(event) => setReplyAttachments((current) => ({ ...current, [row.id]: event.target.value }))}
                    style={{ marginTop: 8 }} />
            </label>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button type="button" className="secondary-button" onClick={() => sendReply(row.id, "PENDING")}>Reply & Keep Pending</button>
                    <button type="button" className="secondary-button" onClick={() => sendReply(row.id, "RESOLVED")}>Reply & Resolve</button>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <EmptyState
            title="No support tickets yet"
            message="Platform-wide support requests will appear here as soon as salons start creating them."
          />
        )}
      </div>
    </div>
  );
}

