import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { LifeBuoy, Send, Tag, AlertTriangle, Paperclip, MessageSquare, Search, Filter, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SupportTicketsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", priority: "" });
  const [form, setForm] = useState({ title: "", category: "", priority: "MEDIUM", description: "", attachmentUrl: "" });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyAttachments, setReplyAttachments] = useState({});
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const load = useCallback(async () => {
    try {
      const response = await api.get("/owner/support-tickets", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.priority ? { priority: filters.priority } : {})
        }
      });
      setRows(response.data || []);
      setStatus((current) => ({ ...current, error: "", loading: false }));
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not load support tickets"), loading: false }));
    }
  }, [filters]);

  useEffect(() => {
    let active = true;
    setStatus((current) => ({ ...current, loading: true }));
    load().catch(() => null);
    return () => { active = false; };
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: false });
    try {
      await api.post("/owner/support-tickets", form);
      setForm({ title: "", category: "", priority: "MEDIUM", description: "", attachmentUrl: "" });
      await load();
      setStatus({ error: "", success: "Support ticket successfully created.", loading: false });
      setTimeout(() => setStatus(s => ({ ...s, success: "" })), 3000);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create support ticket"), success: "", loading: false });
    }
  };

  const sendReply = async (ticketId) => {
    setStatus({ error: "", success: "", loading: false });
    try {
      await api.post(`/owner/support-tickets/${ticketId}/messages`, { message: replyDrafts[ticketId] || "", attachmentUrl: replyAttachments[ticketId] || "" });
      setReplyDrafts((current) => ({ ...current, [ticketId]: "" }));
      setReplyAttachments((current) => ({ ...current, [ticketId]: "" }));
      await load();
      setStatus({ error: "", success: "Reply sent to support agent.", loading: false });
      setTimeout(() => setStatus(s => ({ ...s, success: "" })), 3000);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send reply"), success: "", loading: false });
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'HIGH') return { bg: '#fee2e2', text: '#ef4444' };
    if (p === 'MEDIUM') return { bg: '#fef3c7', text: '#f59e0b' };
    return { bg: '#e0e7ff', text: '#6366f1' };
  };

  const getStatusColor = (s) => {
    if (s === 'CLOSED' || s === 'RESOLVED') return { bg: '#dcfce7', text: '#22c55e' };
    if (s === 'PENDING') return { bg: '#fef3c7', text: '#f59e0b' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        
        .st-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s; }
        .st-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); border-color: #cbd5e1; }
        
        .st-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; }
        .st-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
        .st-label { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .st-btn { padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .st-btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .st-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.35); }
        
        .st-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      {/* ── PREMIUM HERO HEADER ── */}
      <div className="anim-fade" style={{ background: "linear-gradient(135deg, #1e3a8a, #172554)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <LifeBuoy size={32} color="#93c5fd" />
            Support Helpdesk
          </h1>
          <p style={{ margin: 0, color: "#bfdbfe", fontSize: 15, maxWidth: 500 }}>Raise operational issues, track vendor responses, and keep history tidy.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", color: "white", padding: "12px 24px", borderRadius: 20, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)" }}>
          <MessageSquare size={20} /> Active Tickets: {rows.filter(r => r.status !== 'CLOSED').length}
        </div>
      </div>

      {status.error && <div className="anim-fade" style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div className="anim-fade" style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={20} /> {status.success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "start" }}>
        
        {/* Raise Ticket Form */}
        <div className="st-card anim-fade delay-1">
          <h3 style={{ margin: "0 0 24px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><LifeBuoy size={20} color="#2563eb" /> Raise a New Ticket</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
            <div>
              <label className="st-label">Issue Title</label>
              <input className="st-input" placeholder="E.g., Printer not connecting" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="st-label">Category</label>
                <div style={{ position: "relative" }}>
                  <Tag size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <input className="st-input" style={{ paddingLeft: 40 }} placeholder="Hardware" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="st-label">Priority</label>
                <div style={{ position: "relative" }}>
                  <AlertTriangle size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <select className="st-input" style={{ paddingLeft: 40 }} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="st-label">Description</label>
              <textarea className="st-input" rows="4" placeholder="Please describe the issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="st-label">Attachment URL (Optional)</label>
              <div style={{ position: "relative" }}>
                <Paperclip size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                <input className="st-input" style={{ paddingLeft: 40 }} placeholder="https://..." value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
              </div>
            </div>
            <button className="st-btn st-btn-primary" style={{ width: "100%", marginTop: 8 }}><Send size={18} /> Submit Ticket</button>
          </form>
        </div>

        {/* Ticket Queue */}
        <div className="st-card anim-fade delay-2" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><MessageSquare size={20} color="#2563eb" /> Ticket Queue</h3>
              <button onClick={() => setFilters({ q: "", status: "", priority: "" })} style={{ border: "none", background: "none", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Reset Filters</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                <input className="st-input" style={{ paddingLeft: 36, padding: "10px 10px 10px 36px", fontSize: 13 }} placeholder="Search tickets..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              </div>
              <div style={{ position: "relative" }}>
                <Filter size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                <select className="st-input" style={{ paddingLeft: 36, padding: "10px 10px 10px 36px", fontSize: 13 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <select className="st-input" style={{ padding: 10, fontSize: 13 }} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          
          <div style={{ padding: 24, background: "#f1f5f9" }}>
            {status.loading ? <PageLoader compact title="Loading tickets..." /> : rows.map((row) => (
              <div key={row.id} style={{ background: "white", padding: 24, borderRadius: 16, marginBottom: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 16, color: "#0f172a" }}>{row.title}</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Tag size={14} /> {row.category || "General"}</span>
                      <span className="st-pill" style={{ background: getPriorityColor(row.priority).bg, color: getPriorityColor(row.priority).text }}>{row.priority}</span>
                      <span className="st-pill" style={{ background: getStatusColor(row.status).bg, color: getStatusColor(row.status).text }}>{row.status}</span>
                    </div>
                  </div>
                  {row.assignedAgentName && <div style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Agent: {row.assignedAgentName}</div>}
                </div>
                
                <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, margin: "0 0 16px", padding: 16, background: "#f8fafc", borderRadius: 12 }}>
                  {row.description}
                </p>

                {row.internalNote && (
                  <div style={{ fontSize: 13, color: "#b45309", background: "#fef3c7", padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
                    <strong>Support Note:</strong> {row.internalNote}
                  </div>
                )}

                {/* Messages Array */}
                {(row.messages || []).length > 0 && (
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 16, display: "grid", gap: 12 }}>
                    {(row.messages || []).map((message) => (
                      <div key={message.id} style={{ background: message.authorType === 'AGENT' ? '#eff6ff' : '#f8fafc', padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <strong style={{ fontSize: 14, color: "#0f172a" }}>{message.authorName} <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", background: "#bfdbfe", padding: "2px 8px", borderRadius: 6, marginLeft: 8 }}>{message.authorType}</span></strong>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>{message.message}</p>
                        {message.attachmentUrl && <div style={{ marginTop: 8, fontSize: 13, color: "#2563eb", display: "flex", alignItems: "center", gap: 4 }}><Paperclip size={14} /> Attachment Included</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {row.status !== "CLOSED" && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px dashed #cbd5e1" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <textarea className="st-input" rows="2" placeholder="Write a reply..." value={replyDrafts[row.id] || ""} onChange={(e) => setReplyDrafts({ ...replyDrafts, [row.id]: e.target.value })} style={{ flex: 1 }} />
                      <button className="st-btn st-btn-primary" onClick={() => sendReply(row.id)} disabled={!replyDrafts[row.id]} style={{ opacity: replyDrafts[row.id] ? 1 : 0.5 }}><Send size={16} /> Reply</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!status.loading && !rows.length && <div style={{ background: "white", padding: 40, borderRadius: 16, border: "1px solid #e2e8f0" }}><EmptyState title="No support tickets" message="Create your first ticket to start tracking operational or setup issues here." /></div>}
          </div>
        </div>

      </div>
    </div>
  );
}
