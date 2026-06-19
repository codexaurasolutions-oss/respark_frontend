/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Edit3, Eye, Smartphone, RotateCcw, Send, CheckCircle2, AlertCircle, Variable, X, Copy, Check } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function MessageTemplatesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [preview, setPreview] = useState("");
  const [previewMeta, setPreviewMeta] = useState({ whatsappLink: "", variables: {} });
  const [previewInput, setPreviewInput] = useState({ phone: "", customerId: "", appointmentId: "", invoiceId: "", orderId: "", customerMembershipId: "", customerPackageId: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isEdit = location.pathname.endsWith("/edit");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/owner/message-templates");
      setRows(response.data || []);
      if (params.type) {
        const detailResponse = await api.get(`/owner/message-templates/${params.type}`);
        setDetail(detailResponse.data);
        setForm({ title: detailResponse.data.title || "", content: detailResponse.data.content || "" });
      } else {
        setDetail(null);
        setPreview("");
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load message templates"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [params.type]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/owner/message-templates/${params.type}`, form);
      setStatus({ error: "", success: "Template saved successfully!" });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      navigate(`/admin/message-templates/${params.type}`);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save template"), success: "" });
    }
  };

  const loadPreview = async () => {
    try {
      const response = await api.post(`/owner/message-templates/${params.type}/preview`, previewInput);
      setPreview(response.data.preview || "");
      setPreviewMeta({
        whatsappLink: response.data.whatsappLink || "",
        variables: response.data.variables || {}
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not generate preview. Please ensure IDs are valid."), success: "" });
    }
  };

  const resetTemplate = async () => {
    if (!window.confirm("Are you sure you want to revert to the default template? Custom changes will be lost.")) return;
    try {
      await api.post(`/owner/message-templates/${params.type}/reset`);
      setStatus({ error: "", success: "Template reset to default." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not reset template"), success: "" });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(previewMeta.whatsappLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        .msg-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.2s; position: relative; }
        .msg-card:hover { transform: translateY(-2px); box-shadow: none; border-color: #cbd5e1; }
        
        .m-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; transition: all 0.2s; outline: none; background: #fff; }
        .m-input:focus { border-color: #6366f1; box-shadow: none; }
        .m-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .m-btn { padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .m-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: none; }
        .m-btn-primary:hover { transform: translateY(-1px); box-shadow: none; }
        .m-btn-outline { background: white; border: 1px solid #cbd5e1; color: #334155; }
        .m-btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
        
        .whatsapp-bubble { background: #dcf8c6; color: #111b21; padding: 16px; border-radius: 16px; border-top-left-radius: 0; font-size: 15px; position: relative; max-width: 90%; white-space: pre-wrap; box-shadow: none; line-height: 1.5; }
        .whatsapp-bubble::before { content: ""; position: absolute; top: 0; left: -10px; border-width: 10px 10px 0 0; border-style: solid; border-color: #dcf8c6 transparent transparent transparent; }
      `}</style>

      <ModuleTabs
        title="Message Templates"
        tabs={[
          { label: "Template Library", to: "/admin/message-templates" },
          ...(params.type ? [
            { label: "View & Test", to: `/admin/message-templates/${params.type}` },
            { label: "Edit Format", to: `/admin/message-templates/${params.type}/edit` }
          ] : [])
        ]}
      />

      {/* ── PREMIUM HERO HEADER ── */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 24, padding: 32, color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <MessageSquare size={28} color="#818cf8" />
            Message Templates
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, maxWidth: 500 }}>Manage automated WhatsApp and SMS templates. Edit variables, preview outputs, and ensure pixel-perfect formatting for your salon clients.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, display: "inline-block" }}>
            {rows.length} TEMPLATES ACTIVE
          </div>
        </div>
      </div>

      {status.error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={20} /> {status.success}</div>}

      {loading ? <PageLoader title="Loading Templates..." /> : (
        <>
          {/* ── TEMPLATE LIBRARY (LIST) ── */}
          {!params.type && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {rows.map(row => (
                <div key={row.id} className="msg-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f1f5f9", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 2px", fontSize: 16, color: "#0f172a" }}>{row.title}</h3>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{row.type}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                    <button className="m-btn m-btn-primary" style={{ flex: 1, padding: "10px" }} onClick={() => navigate(`/admin/message-templates/${row.type}`)}><Eye size={16} /> View & Test</button>
                    <button className="m-btn m-btn-outline" style={{ flex: 1, padding: "10px" }} onClick={() => navigate(`/admin/message-templates/${row.type}/edit`)}><Edit3 size={16} /> Edit</button>
                  </div>
                </div>
              ))}
              {!rows.length && <div style={{ gridColumn: "1/-1" }}><EmptyState title="No templates found" message="Templates will populate here automatically based on system events." /></div>}
            </div>
          )}

          {/* ── VIEW & PREVIEW TEMPLATE ── */}
          {params.type && !isEdit && detail && (
            <div>
              <button onClick={() => navigate("/admin/message-templates")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 0 24px", fontWeight: 600 }}><X size={16} /> Back to Library</button>
              
              <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1.2fr) minmax(300px, 1fr)", gap: 32, alignItems: "start" }}>
                
                <div className="msg-card" style={{ padding: 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                      <h2 style={{ margin: "0 0 4px", fontSize: 24, color: "#0f172a" }}>{detail.title}</h2>
                      <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{detail.type}</div>
                    </div>
                    <button className="m-btn m-btn-outline" onClick={() => navigate(`/admin/message-templates/${params.type}/edit`)}><Edit3 size={16} /> Edit Layout</button>
                  </div>
                  
                  <div style={{ background: "#f8fafc", padding: 24, borderRadius: 16, border: "1px dashed #cbd5e1", marginBottom: 24 }}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 15, color: "#334155", lineHeight: 1.6 }}>{detail.content}</pre>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Variable size={16} /> Available Variables</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(detail.variables || []).map((v) => <span key={v} style={{ background: "#e0e7ff", color: "#4338ca", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{v}</span>)}
                    </div>
                  </div>

                  <button className="m-btn m-btn-outline" style={{ color: "#e11d48", borderColor: "#fecdd3" }} onClick={resetTemplate}><RotateCcw size={16} /> Reset to Default</button>
                </div>

                {/* ── PREVIEW GENERATOR ── */}
                <div className="msg-card" style={{ padding: 32, background: "linear-gradient(to bottom, #ffffff, #f8fafc)" }}>
                  <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><Smartphone size={20} color="#6366f1" /> Live Preview Generator</h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    <div><label className="m-label">Phone Override</label><input className="m-input" value={previewInput.phone} onChange={e => setPreviewInput({...previewInput, phone: e.target.value})} placeholder="e.g. +91 9876543210" /></div>
                    <div><label className="m-label">Customer ID</label><input className="m-input" value={previewInput.customerId} onChange={e => setPreviewInput({...previewInput, customerId: e.target.value})} placeholder="cuid_..." /></div>
                    <div><label className="m-label">Appointment ID</label><input className="m-input" value={previewInput.appointmentId} onChange={e => setPreviewInput({...previewInput, appointmentId: e.target.value})} placeholder="app_..." /></div>
                    <div><label className="m-label">Invoice ID</label><input className="m-input" value={previewInput.invoiceId} onChange={e => setPreviewInput({...previewInput, invoiceId: e.target.value})} placeholder="inv_..." /></div>
                    <div><label className="m-label">Order ID</label><input className="m-input" value={previewInput.orderId} onChange={e => setPreviewInput({...previewInput, orderId: e.target.value})} placeholder="ord_..." /></div>
                  </div>
                  
                  <button className="m-btn m-btn-primary" style={{ width: "100%", marginBottom: 32 }} onClick={loadPreview}><Eye size={18} /> Generate Output</button>

                  {preview ? (
                    <div>
                      <div style={{ padding: "20px", background: "#efeae2", borderRadius: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div className="whatsapp-bubble">{preview}</div>
                      </div>
                      
                      {previewMeta.whatsappLink && (
                        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                          <a href={previewMeta.whatsappLink} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: "none" }}>
                            <button className="m-btn" style={{ background: "#25D366", color: "white", width: "100%" }}><Send size={16} /> Open WhatsApp</button>
                          </a>
                          <button className="m-btn m-btn-outline" style={{ flex: 1 }} onClick={copyLink}>
                            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />} {copied ? "Copied" : "Copy Link"}
                          </button>
                        </div>
                      )}
                      
                      {Object.keys(previewMeta.variables || {}).length > 0 && (
                        <div style={{ marginTop: 24, padding: 16, background: "white", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase" }}>Resolved Values</div>
                          {Object.entries(previewMeta.variables).map(([key, val]) => (
                            <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6, borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>
                              <span style={{ color: "#64748b", fontFamily: "monospace" }}>{key}</span>
                              <span style={{ color: "#0f172a", fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{String(val ?? "N/A")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 20px", border: "2px dashed #e2e8f0", borderRadius: 16 }}>
                      <Smartphone size={32} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>Enter valid IDs above to see how the WhatsApp message will look to the customer.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── EDIT TEMPLATE ── */}
          {params.type && isEdit && detail && (
            <div>
              <button onClick={() => navigate(`/admin/message-templates/${params.type}`)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 0 24px", fontWeight: 600 }}><X size={16} /> Cancel Edit</button>
              
              <div className="msg-card" style={{ maxWidth: 800, margin: "0 auto", padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 56, height: 56, background: "#e0e7ff", color: "#4f46e5", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Edit3 size={28} />
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 24, color: "#0f172a" }}>Edit Template</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 15 }}>Update the content format. Be sure to use the exact variable tags shown below.</p>
                </div>

                <form onSubmit={save} style={{ display: "grid", gap: 24 }}>
                  <div>
                    <label className="m-label">Template Title (Internal)</label>
                    <input className="m-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div>
                    <label className="m-label">Message Content</label>
                    <textarea className="m-input" rows={10} value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ fontFamily: "monospace", lineHeight: 1.6 }} required />
                  </div>
                  
                  <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <span className="m-label" style={{ marginBottom: 8 }}><Variable size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Valid Variables for {detail.type}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(detail.variables || []).map((v) => <span key={v} style={{ background: "white", border: "1px solid #cbd5e1", color: "#475569", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontFamily: "monospace", cursor: "pointer" }} onClick={() => setForm({...form, content: form.content + ` {{${v}}}`})}>{'{{' + v + '}}'}</span>)}
                    </div>
                  </div>

                  <button className="m-btn m-btn-primary" type="submit" style={{ width: "100%", padding: 16, fontSize: 16, marginTop: 8 }}><Check size={18} /> Save Template Changes</button>
                </form>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
