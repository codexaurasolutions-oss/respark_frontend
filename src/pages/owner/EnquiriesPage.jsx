import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { 
  Users, UserPlus, Phone, Mail, FileText, Share2, AlertCircle, CheckCircle2, 
  BarChart3, RefreshCw, Filter, CalendarClock, MessageSquare, Briefcase 
} from "lucide-react";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  source: "WEBSITE",
  notes: ""
};

export default function EnquiriesPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const mode = location.pathname.includes("/follow-ups")
    ? "followUps"
    : location.pathname.includes("/reports")
      ? "reports"
      : "enquiries";

  const load = useCallback(async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [listResponse, reportResponse, followUpResponse] = await Promise.all([
        api.get("/owner/enquiries", { params }),
        api.get("/owner/enquiries/reports"),
        api.get("/owner/enquiries/follow-ups").catch(() => ({ data: [] }))
      ]);
      setRows(listResponse.data || []);
      setReport(reportResponse.data || null);
      setFollowUps(followUpResponse.data || []);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load enquiries module"), success: "" });
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/enquiries", form);
      setForm(emptyForm);
      setStatus({ error: "", success: "Enquiry successfully captured." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save enquiry"), success: "" });
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'NEW': return { bg: '#dbeafe', text: '#1e40af' };
      case 'CONTACTED': return { bg: '#fef3c7', text: '#b45309' };
      case 'INTERESTED': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'CONVERTED': return { bg: '#dcfce7', text: '#15803d' };
      case 'LOST': return { bg: '#fee2e2', text: '#b91c1c' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
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
        
        .eq-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s; }
        .eq-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); border-color: #cbd5e1; }
        
        .eq-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; }
        .eq-input:focus { border-color: #f43f5e; box-shadow: 0 0 0 4px rgba(244,63,94,0.1); }
        .eq-label { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .eq-btn { padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .eq-btn-primary { background: linear-gradient(135deg, #f43f5e, #e11d48); color: white; box-shadow: 0 4px 12px rgba(244,63,94,0.25); }
        .eq-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(244,63,94,0.35); }
        
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <ModuleTabs
        title="Enquiries"
        items={[
          { label: "Enquiries", to: "/admin/enquiries" },
          { label: "Follow-Ups", to: "/admin/enquiries/follow-ups" },
          { label: "Reports", to: "/admin/enquiries/reports" }
        ]}
        actions={(
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div>
              <span className="eq-label" style={{ fontSize: 10, color: "#94a3b8" }}>Filter Pipeline</span>
              <div style={{ position: "relative" }}>
                <Filter size={14} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <select className="eq-input" style={{ paddingLeft: 36, paddingRight: 32, py: 8, height: 38 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>
            </div>
            {statusFilter && (
              <button onClick={() => setStatusFilter("")} style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <RefreshCw size={14} /> Clear
              </button>
            )}
          </div>
        )}
      />

      {/* ── PREMIUM HERO HEADER ── */}
      <div className="anim-fade" style={{ background: "linear-gradient(135deg, #4c1d95, #881337)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <Users size={32} color="#f43f5e" />
            Lead Pipeline
          </h1>
          <p style={{ margin: 0, color: "#fecdd3", fontSize: 15, maxWidth: 500 }}>Capture leads, track follow-ups, and convert enquiries into loyal salon customers.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", color: "white", padding: "12px 24px", borderRadius: 20, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)" }}>
          <Briefcase size={20} /> Total Leads: {rows.length}
        </div>
      </div>

      {status.error && <div className="anim-fade" style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div className="anim-fade" style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={20} /> {status.success}</div>}

      {mode === "enquiries" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "start" }}>
          
          {/* Capture Form */}
          <div className="eq-card anim-fade delay-1">
            <h3 style={{ margin: "0 0 24px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={20} color="#f43f5e" /> Capture Enquiry</h3>
            <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
              <div>
                <label className="eq-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <Users size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <input className="eq-input" style={{ paddingLeft: 40 }} placeholder="Client Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="eq-label">Phone</label>
                  <div style={{ position: "relative" }}>
                    <Phone size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                    <input className="eq-input" style={{ paddingLeft: 40 }} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="eq-label">Source</label>
                  <div style={{ position: "relative" }}>
                    <Share2 size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                    <select className="eq-input" style={{ paddingLeft: 40 }} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                      {["WEBSITE", "WHATSAPP", "PHONE", "WALK_IN", "INSTAGRAM", "FACEBOOK", "ADS", "REFERRAL"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="eq-label">Email (Optional)</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <input type="email" className="eq-input" style={{ paddingLeft: 40 }} placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="eq-label">Notes</label>
                <div style={{ position: "relative" }}>
                  <FileText size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <textarea className="eq-input" style={{ paddingLeft: 40 }} rows={3} placeholder="What is the client looking for?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button className="eq-btn eq-btn-primary" style={{ width: "100%", marginTop: 8 }}><UserPlus size={18} /> Save Lead</button>
            </form>
          </div>

          {/* Leads List */}
          <div className="eq-card anim-fade delay-2" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Users size={20} color="#f43f5e" /> Active Pipeline</h3>
            </div>
            <div>
              {loading ? <PageLoader compact title="Loading Leads..." /> : rows.map((row) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16, alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 4 }}>{row.name}</strong>
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} /> {row.phone}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}><Share2 size={14} /> {row.source}</div>
                  <div style={{ textAlign: "right" }}>
                    <span className="status-pill" style={{ background: getStatusColor(row.status).bg, color: getStatusColor(row.status).text }}>{row.status}</span>
                  </div>
                </div>
              ))}
              {!loading && !rows.length && <div style={{ padding: 40 }}><EmptyState title="No leads matched" message="New enquiries or filtered leads will appear here." /></div>}
            </div>
          </div>

        </div>
      )}

      {mode === "reports" && report && (
        <div className="anim-fade delay-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="eq-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", border: "none" }}>
            <BarChart3 size={32} color="#818cf8" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>Total Leads Captured</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>{report.total || 0}</div>
          </div>
          <div className="eq-card" style={{ background: "linear-gradient(135deg, #16a34a, #14532d)", color: "white", border: "none" }}>
            <CheckCircle2 size={32} color="#86efac" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#bbf7d0", marginBottom: 8 }}>Successfully Converted</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>{report.converted || 0}</div>
          </div>
        </div>
      )}

      {mode === "followUps" && (
        <div className="eq-card anim-fade delay-1" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><CalendarClock size={20} color="#f59e0b" /> Scheduled Follow-Ups</h3>
          </div>
          <div>
            {loading ? <PageLoader compact title="Loading Follow-ups..." /> : followUps.map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 4 }}>{row.enquiry?.name || "Enquiry Follow-Up"}</strong>
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} /> {row.enquiry?.phone || "No phone"}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{row.note || "Follow-up recorded"}</div>
                </div>
                <div style={{ background: "#fef3c7", color: "#b45309", padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarClock size={16} /> {new Date(row.dueAt || row.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {!loading && !followUps.length && <div style={{ padding: 40 }}><EmptyState title="No follow-ups scheduled" message="Lead callbacks and reminders will appear here once assigned." /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
