import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { Link, Settings2, ShieldCheck, Link2, Smartphone, FileText, CheckCircle2, AlertCircle, Copy } from "lucide-react";

export default function CustomerPortalSettingsPage() {
  const { auth } = useAuth();
  const [form, setForm] = useState({
    whatsappNumber: "",
    bookingNotes: "",
    cancellationPolicy: ""
  });
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/settings"),
      api.get("/owner/catalog/preview")
    ]).then(([settingsResponse, previewResponse]) => {
      if (!active) return;
      const settings = settingsResponse.data || {};
      setForm({
        whatsappNumber: settings.whatsappNumber || "",
        bookingNotes: settings.bookingNotes || "",
        cancellationPolicy: settings.cancellationPolicy || ""
      });
      setPreview(previewResponse.data || null);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setStatus({ error: formatApiError(error, "Could not load customer portal settings"), success: "" });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/owner/settings", form);
      setStatus({ error: "", success: "Customer portal settings saved successfully!" });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save customer portal settings"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  const slug = preview?.settings?.customSlug || preview?.salon?.slug || "";
  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
  const links = useMemo(() => ({
    login: `${appBaseUrl}/customer/login`,
    register: `${appBaseUrl}/customer/register`,
    profile: `${appBaseUrl}/customer/profile`,
    publicBooking: slug ? `${appBaseUrl}/site/${slug}/book` : ""
  }), [appBaseUrl, slug]);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(""), 2000);
  };

  const featureFlags = auth?.membership?.featureFlags || {};

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        .p-card { background: white; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: none; }
        .p-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 24px; display: flex; align-items: center; gap: 10px; }
        
        .p-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 15px; transition: all 0.2s; background: #fff; outline: none; }
        .p-input:focus { border-color: #6366f1; box-shadow: none; }
        .p-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        
        .p-btn { padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 8px; }
        .p-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: none; }
        .p-btn-primary:hover { transform: translateY(-1px); box-shadow: none; }
        .p-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .link-box { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 12px; transition: all 0.2s; }
        .link-box:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .link-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .link-url { font-size: 13px; color: #64748b; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
        .copy-btn { padding: 8px 12px; border-radius: 8px; background: white; border: 1px solid #cbd5e1; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .copy-btn:hover { background: #f8fafc; border-color: #94a3b8; }
        
        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
        .status-badge.active { background: #dcfce7; color: #166534; }
        .status-badge.inactive { background: #fee2e2; color: #991b1b; }
      `}</style>

      <ModuleTabs title="Customer Portal Settings" tabs={[{ label: "Portal Settings", to: "/admin/customer-portal-settings" }]} />
      
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 24, padding: 40, color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ padding: "6px 12px", background: "rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Configuration</span>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800 }}>Customer Portal</h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 15, maxWidth: 500 }}>Control customer-facing links, booking guidance, and portal readiness from one unified setup page.</p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <div className={`status-badge ${featureFlags.customerPortal !== false ? "active" : "inactive"}`}>
            {featureFlags.customerPortal !== false ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {featureFlags.customerPortal !== false ? "Portal Online" : "Portal Disabled"}
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: 12, fontSize: 13, fontFamily: "monospace", color: "#e2e8f0" }}>
            Slug: {slug || "Pending"}
          </div>
        </div>
      </div>

      {status.error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 10 }}><CheckCircle2 size={20} /> {status.success}</div>}
      
      {loading ? <PageLoader title="Loading Settings" message="Preparing portal data..." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
          
          {/* ── LEFT COLUMN: FORMS ── */}
          <div style={{ display: "grid", gap: 32 }}>
            <div className="p-card">
              <h2 className="p-title"><Settings2 color="#6366f1" /> Portal Rules & Policies</h2>
              <form onSubmit={save} style={{ display: "grid", gap: 24 }}>
                <div>
                  <label className="p-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Smartphone size={16} /> Support WhatsApp</label>
                  <IndianPhoneInput
                    value={form.whatsappNumber}
                    onChange={(value) => setForm({ ...form, whatsappNumber: value })}
                    className="p-input"
                    placeholder="9876543210"
                  />
                  <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0" }}>Displayed to customers in their portal for direct support.</p>
                </div>
                <div>
                  <label className="p-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText size={16} /> Booking Notes</label>
                  <textarea className="p-input" rows="4" placeholder="Important info customers should read before booking..." value={form.bookingNotes} onChange={(e) => setForm({ ...form, bookingNotes: e.target.value })} />
                </div>
                <div>
                  <label className="p-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={16} /> Cancellation & Reschedule Policy</label>
                  <textarea className="p-input" rows="5" placeholder="Define your cancellation timeframe and fees..." value={form.cancellationPolicy} onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })} />
                </div>
                <div style={{ paddingTop: 8 }}>
                  <button className="p-btn p-btn-primary" disabled={saving}>
                    {saving ? "Saving Changes..." : "Save Portal Settings"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── RIGHT COLUMN: READINESS & LINKS ── */}
          <div style={{ display: "grid", gap: 32 }}>
            <div className="p-card">
              <h2 className="p-title"><Link2 color="#6366f1" /> Direct Customer Links</h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>Share these links with your clients on social media or WhatsApp.</p>
              
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { id: "login", title: "Customer Login", url: links.login },
                  { id: "register", title: "Registration Page", url: links.register },
                  { id: "portal", title: "Direct Portal Access", url: links.profile },
                ].map((item) => (
                  <div key={item.id} className="link-box">
                    <div>
                      <div className="link-title">{item.title}</div>
                      <div className="link-url">{item.url}</div>
                    </div>
                    <button className="copy-btn" onClick={() => copyToClipboard(item.url, item.id)}>
                      {copiedLink === item.id ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedLink === item.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                ))}

                <div className="link-box" style={{ background: links.publicBooking ? "#f8fafc" : "#fff1f2", borderColor: links.publicBooking ? "#e2e8f0" : "#fecdd3" }}>
                  <div>
                    <div className="link-title" style={{ color: links.publicBooking ? "#0f172a" : "#be123c" }}>Public Booking Link</div>
                    {links.publicBooking ? (
                      <div className="link-url">{links.publicBooking}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#e11d48", marginTop: 4 }}>Set a catalog slug to generate link.</div>
                    )}
                  </div>
                  {links.publicBooking && (
                    <button className="copy-btn" onClick={() => copyToClipboard(links.publicBooking, "booking")}>
                      {copiedLink === "booking" ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                      {copiedLink === "booking" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-card">
              <h2 className="p-title"><CheckCircle2 color="#6366f1" /> Module Readiness</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Customer Portal", active: featureFlags.customerPortal !== false },
                  { label: "Digital Catalog", active: featureFlags.digitalCatalog !== false },
                  { label: "Online Appointments", active: featureFlags.appointments !== false },
                  { label: "E-Commerce", active: featureFlags.ecommerce !== false },
                ].map((mod, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i === 3 ? "none" : "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{mod.label}</span>
                    <span className={`status-badge ${mod.active ? "active" : "inactive"}`} style={{ padding: "4px 10px" }}>
                      {mod.active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
