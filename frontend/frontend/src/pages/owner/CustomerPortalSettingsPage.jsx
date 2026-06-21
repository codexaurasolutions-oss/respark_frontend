import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

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
      setStatus({ error: "", success: "Customer portal settings saved." });
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
    publicBooking: slug ? `${appBaseUrl}/salon/${slug}/book` : ""
  }), [appBaseUrl, slug]);

  const featureFlags = auth?.membership?.featureFlags || {};

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Customer Portal Settings"
        description="Manage customer-facing access rules, direct links, and booking policy messaging from the unified panel."
        tabs={[
          { label: "Portal Settings", to: "/admin/customer-portal-settings", hint: "Access" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Customer Portal Settings</h1>
            <p style={{ marginBottom: 0 }}>Control customer-facing links, booking guidance, and portal readiness from one clean setup page.</p>
          </div>
          <div className="badge-row">
            <span className="badge">{featureFlags.customerPortal === false ? "Portal Disabled" : "Portal Enabled"}</span>
            <span className="badge">{slug || "No slug yet"}</span>
          </div>
        </div>
      </div>

      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading ? <PageLoader title="Loading customer portal settings" message="Preparing customer links, public booking context, and portal readiness data." /> : (

      <div className="two-col">
        <div className="panel-card">
          <h3>Portal Rules</h3>
          <form className="form-grid" onSubmit={save}>
            <label>
              <span className="muted">Customer support WhatsApp</span>
              <input
              placeholder="Customer support WhatsApp"
              value={form.whatsappNumber}
              onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Booking notes</span>
              <textarea
                rows="4"
                placeholder="Booking notes shown to team and used for portal-facing guidance"
                value={form.bookingNotes}
                onChange={(event) => setForm((current) => ({ ...current, bookingNotes: event.target.value }))}
              />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Cancellation and reschedule policy</span>
              <textarea
                rows="5"
                placeholder="Cancellation / reschedule policy"
                value={form.cancellationPolicy}
                onChange={(event) => setForm((current) => ({ ...current, cancellationPolicy: event.target.value }))}
              />
            </label>
            <button disabled={saving}>{saving ? "Saving Portal Settings..." : "Save Portal Settings"}</button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Portal Readiness</h3>
          <div className="badge-row" style={{ marginBottom: 16 }}>
            <span className="badge">Customer Portal {featureFlags.customerPortal === false ? "Disabled" : "Enabled"}</span>
            <span className="badge">Digital Catalog {featureFlags.digitalCatalog === false ? "Disabled" : "Enabled"}</span>
            <span className="badge">Appointments {featureFlags.appointments === false ? "Disabled" : "Enabled"}</span>
            <span className="badge">E-Commerce {featureFlags.ecommerce === false ? "Disabled" : "Enabled"}</span>
          </div>
          <div className="summary-box">
            <strong>Direct Customer Links</strong>
            <div className="list-stack" style={{ marginTop: 12 }}>
              <div className="list-item"><strong>Login</strong><div className="item-meta">{links.login}</div></div>
              <div className="list-item"><strong>Register</strong><div className="item-meta">{links.register}</div></div>
              <div className="list-item"><strong>Portal</strong><div className="item-meta">{links.profile}</div></div>
              {links.publicBooking ? <div className="list-item"><strong>Public Booking</strong><div className="item-meta">{links.publicBooking}</div></div> : <EmptyState title="No public booking link yet" message="Enable appointments and catalog slug setup to generate a public booking path." />}
            </div>
            <div className="inline-actions" style={{ marginTop: 14 }}>
              <button type="button" className="secondary-button" onClick={() => navigator.clipboard.writeText(links.login)}>Copy Login Link</button>
              <button type="button" className="secondary-button" onClick={() => navigator.clipboard.writeText(links.register)}>Copy Register Link</button>
            </div>
          </div>
          <div className="summary-box" style={{ marginTop: 16 }}>
            <strong>Salon Context</strong>
            {preview || auth?.membership?.salonName ? (
              <>
                <p style={{ marginTop: 10 }}>{preview?.salon?.name || auth?.membership?.salonName || "Salon"}</p>
                <p className="item-meta">Catalog slug: {slug || "Not available yet"}</p>
              </>
            ) : (
              <EmptyState title="Salon context unavailable" message="Portal settings loaded without storefront preview context. Save the catalog once to enrich these customer-facing links." />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
