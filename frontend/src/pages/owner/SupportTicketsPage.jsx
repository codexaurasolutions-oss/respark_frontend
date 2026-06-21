import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const formatAttachmentValue = (value) => String(value || "").trim();
const isAttachmentLink = (value) => /^https?:\/\//i.test(formatAttachmentValue(value));

export default function SupportTicketsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", priority: "" });
  const [form, setForm] = useState({ title: "", category: "", priority: "MEDIUM", description: "", attachmentUrl: "" });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const load = async () => {
    setRows((await api.get("/owner/support-tickets", {
    params: {
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {})
    }
  })).data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    api.get("/owner/support-tickets", {
      params: {
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {})
      }
    }).then((response) => {
      if (active) {
        setRows(response.data);
        setStatus((current) => ({ ...current, loading: false }));
      }
    });
    return () => {
      active = false;
    };
  }, [filters]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      await api.post("/owner/support-tickets", form);
      setForm({ title: "", category: "", priority: "MEDIUM", description: "", attachmentUrl: "" });
      await load();
      setStatus({ error: "", success: "Support ticket created." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create support ticket"), success: "" });
    }
  };

  const sendReply = async (ticketId) => {
    setStatus({ error: "", success: "" });
    try {
      await api.post(`/owner/support-tickets/${ticketId}/messages`, { message: replyDrafts[ticketId] || "", attachmentUrl: replyAttachments[ticketId] || "" });
      setReplyDrafts((current) => ({ ...current, [ticketId]: "" }));
      setReplyAttachments((current) => ({ ...current, [ticketId]: "" }));
      await load();
      setStatus({ error: "", success: "Reply sent to support." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send reply"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Support Tickets</h1>
        <p style={{ margin: 0 }}>Raise operational issues, keep message history tidy, and track vendor-side responses without leaving the owner panel.</p>
      </div>
      <div className="two-col">
        <div className="panel-card">
          <h3>Raise a Ticket</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <label>
              <span className="muted">Title</span>
              <input value={form.title} placeholder="Title" onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              <span className="muted">Category</span>
              <input value={form.category} placeholder="Category" onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </label>
            <label>
              <span className="muted">Low</span>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            </label>
            <textarea rows="5" value={form.description} placeholder="Describe the issue clearly" onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <label>
              <span className="muted">Attachment URL</span>
              <input value={form.attachmentUrl} placeholder="https://example.com/file.pdf" onChange={(event) => setForm({ ...form, attachmentUrl: event.target.value })} />
            </label>
            <button>Create Ticket</button>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
        <div className="panel-card">
          <h3>Ticket Queue</h3>
          {status.loading ? <PageLoader compact title="Loading support queue" message="Pulling ticket status, conversations, and event history into one view." /> : null}
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              <span className="muted">Search title, description, category, note, or agent</span>
              <input value={filters.q} placeholder="Search title, description, category, note, or agent" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
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
            </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "", priority: "" })}>Reset</button>
          </div>
          {rows.map((row) => (
            <div key={row.id} style={{ padding: "10px 0", borderTop: "1px solid #e2e8f0" }}>
              <div className="item-head">
                <div>
                  <strong>{row.title}</strong>
                  <div className="item-meta">{row.category || "General"} | {row.priority}</div>
                </div>
                <span className="badge">{row.status}</span>
              </div>
              <p>{row.description}</p>
              {row.internalNote && <p className="muted">Support note: {row.internalNote}</p>}
              {row.assignedAgentName && <p className="muted">Assigned support agent: {row.assignedAgentName}</p>}
              <div className="list-stack" style={{ marginTop: 10 }}>
                {(row.messages || []).map((message) => (
                  <div key={message.id} className="list-item">
                    <div className="item-head">
                      <strong>{message.authorName}</strong>
                      <span className="badge">{message.authorType}</span>
                    </div>
                    <div className="item-meta">{new Date(message.createdAt).toLocaleString()}</div>
                    <p style={{ marginBottom: 0 }}>{message.message}</p>
                    {message.attachmentUrl && (
                      <div className="item-meta">
                        Attachment: {isAttachmentLink(message.attachmentUrl) ? (
                          <a href={formatAttachmentValue(message.attachmentUrl)} target="_blank" rel="noreferrer">Open file</a>
                        ) : (
                          formatAttachmentValue(message.attachmentUrl)
                        )}
                      </div>
                    )}
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
              {row.status !== "CLOSED" && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    rows="3"
                    value={replyDrafts[row.id] || ""}
                    placeholder="Reply back to support"
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                  <label>
              <span className="muted">Attachment URL</span>
              <input
                    value={replyAttachments[row.id] || ""}
                    placeholder="https://example.com/file.pdf"
                    onChange={(event) => setReplyAttachments((current) => ({ ...current, [row.id]: event.target.value }))}
                    style={{ marginTop: 8 }} />
            </label>
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="secondary-button" onClick={() => sendReply(row.id)}>Send Reply</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!status.loading && !rows.length && <EmptyState title="No support tickets yet" message="Create your first ticket to start tracking product, billing, or setup issues here." />}
        </div>
      </div>
    </div>
  );
}

