import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    systemName: "",
    maintenanceMode: false,
    taxLabel: "Tax",
    defaultCurrency: "INR",
    currencyOptions: "INR, USD, AED",
    defaultCountry: "",
    defaultCity: "",
    defaultTimezone: "",
    notificationDefaultsText: JSON.stringify({ email: true, sms: false, whatsapp: true }, null, 2),
    whatsappNumber: "",
    smsProviderName: "",
    emailProviderName: "",
    whatsappProviderName: "",
    contactEmail: "",
    supportEmail: "",
    notificationEmail: "",
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    demoBookingUrl: "/book-demo",
    blogTitle: "",
    blogIntro: "",
    backupPolicyNote: "",
    invoicePrefix: "INV"
  });

  useEffect(() => {
    api.get("/super-admin/settings").then((response) => {
      setForm({
        systemName: response.data?.systemName || "",
        maintenanceMode: Boolean(response.data?.maintenanceMode),
        taxLabel: response.data?.taxLabel || "Tax",
        defaultCurrency: response.data?.defaultCurrency || "INR",
        currencyOptions: Array.isArray(response.data?.currencyOptions) ? response.data.currencyOptions.join(", ") : response.data?.currencyOptions || "INR, USD, AED",
        defaultCountry: response.data?.defaultCountry || "",
        defaultCity: response.data?.defaultCity || "",
        defaultTimezone: response.data?.defaultTimezone || "",
        notificationDefaultsText: JSON.stringify(response.data?.notificationDefaults || { email: true, sms: false, whatsapp: true }, null, 2),
        whatsappNumber: response.data?.whatsappNumber || "",
        smsProviderName: response.data?.smsProviderName || "",
        emailProviderName: response.data?.emailProviderName || "",
        whatsappProviderName: response.data?.whatsappProviderName || "",
        contactEmail: response.data?.contactEmail || "",
        supportEmail: response.data?.supportEmail || "",
        notificationEmail: response.data?.notificationEmail || "",
        termsUrl: response.data?.termsUrl || "/terms",
        privacyUrl: response.data?.privacyUrl || "/privacy",
        demoBookingUrl: response.data?.demoBookingUrl || "/book-demo",
        blogTitle: response.data?.blogTitle || "",
        blogIntro: response.data?.blogIntro || "",
        backupPolicyNote: response.data?.backupPolicyNote || "",
        invoicePrefix: response.data?.invoicePrefix || "INV"
      });
      setLoading(false);
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    setSaving(true);
    try {
      await api.post("/super-admin/settings", {
        systemName: form.systemName,
        maintenanceMode: form.maintenanceMode,
        taxLabel: form.taxLabel,
        defaultCurrency: form.defaultCurrency,
        currencyOptions: form.currencyOptions.split(",").map((item) => item.trim()).filter(Boolean),
        defaultCountry: form.defaultCountry,
        defaultCity: form.defaultCity,
        defaultTimezone: form.defaultTimezone,
        notificationDefaults: JSON.parse(form.notificationDefaultsText || "{}"),
        whatsappNumber: form.whatsappNumber,
        smsProviderName: form.smsProviderName,
        emailProviderName: form.emailProviderName,
        whatsappProviderName: form.whatsappProviderName,
        contactEmail: form.contactEmail,
        supportEmail: form.supportEmail,
        notificationEmail: form.notificationEmail,
        termsUrl: form.termsUrl,
        privacyUrl: form.privacyUrl,
        demoBookingUrl: form.demoBookingUrl,
        blogTitle: form.blogTitle,
        blogIntro: form.blogIntro,
        backupPolicyNote: form.backupPolicyNote,
        invoicePrefix: form.invoicePrefix
      });
      setStatus({ error: "", success: "Global settings saved." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save global settings"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Global Settings</h1>
            <p style={{ marginBottom: 0 }}>Control public defaults, provider references, maintenance mode, and system-wide communication settings.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Currency {form.defaultCurrency || "INR"}</span>
            <span className="badge">{form.maintenanceMode ? "Maintenance On" : "Live Platform"}</span>
          </div>
        </div>
      </div>
      {loading ? (
        <PageLoader
          title="Loading platform settings"
          message="Collecting communication defaults, public links, and system controls."
        />
      ) : (
      <div className="two-col">
        <div className="panel-card">
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
          <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <input value={form.systemName} placeholder="System name" onChange={(event) => setForm({ ...form, systemName: event.target.value })} />
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <input value={form.taxLabel} placeholder="Tax label" onChange={(event) => setForm({ ...form, taxLabel: event.target.value })} />
              <input value={form.defaultCurrency} placeholder="Default currency" onChange={(event) => setForm({ ...form, defaultCurrency: event.target.value })} />
            </div>
            <input value={form.currencyOptions} placeholder="Currency list (comma separated)" onChange={(event) => setForm({ ...form, currencyOptions: event.target.value })} />
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <input value={form.defaultCountry} placeholder="Default country" onChange={(event) => setForm({ ...form, defaultCountry: event.target.value })} />
              <input value={form.defaultCity} placeholder="Default city" onChange={(event) => setForm({ ...form, defaultCity: event.target.value })} />
            </div>
            <input value={form.defaultTimezone} placeholder="Default timezone" onChange={(event) => setForm({ ...form, defaultTimezone: event.target.value })} />
            <input value={form.whatsappNumber} placeholder="WhatsApp number" onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} />
            <input value={form.smsProviderName} placeholder="SMS provider placeholder" onChange={(event) => setForm({ ...form, smsProviderName: event.target.value })} />
            <input value={form.emailProviderName} placeholder="Email provider placeholder" onChange={(event) => setForm({ ...form, emailProviderName: event.target.value })} />
            <input value={form.whatsappProviderName} placeholder="WhatsApp provider placeholder" onChange={(event) => setForm({ ...form, whatsappProviderName: event.target.value })} />
            <input value={form.contactEmail} placeholder="Contact email" onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            <input value={form.supportEmail} placeholder="Support email" onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} />
            <input value={form.notificationEmail} placeholder="Notification email" onChange={(event) => setForm({ ...form, notificationEmail: event.target.value })} />

            <input value={form.termsUrl} placeholder="Terms URL" onChange={(event) => setForm({ ...form, termsUrl: event.target.value })} />
            <input value={form.privacyUrl} placeholder="Privacy URL" onChange={(event) => setForm({ ...form, privacyUrl: event.target.value })} />
            <input value={form.demoBookingUrl} placeholder="Demo booking URL" onChange={(event) => setForm({ ...form, demoBookingUrl: event.target.value })} />
            <input value={form.invoicePrefix} placeholder="Invoice Prefix" onChange={(event) => setForm({ ...form, invoicePrefix: event.target.value })} />
            <input value={form.blogTitle} placeholder="Blog title" onChange={(event) => setForm({ ...form, blogTitle: event.target.value })} />
            <textarea rows="3" value={form.blogIntro} placeholder="Blog intro" onChange={(event) => setForm({ ...form, blogIntro: event.target.value })} />
            <textarea rows="3" value={form.backupPolicyNote} placeholder="Backup / retention note" onChange={(event) => setForm({ ...form, backupPolicyNote: event.target.value })} />
            <label style={{ display: "flex", gap: 8 }}>
              <input type="checkbox" checked={form.maintenanceMode} onChange={(event) => setForm({ ...form, maintenanceMode: event.target.checked })} />
              Maintenance Mode
            </label>
            <button disabled={saving}>{saving ? "Saving Global Settings..." : "Save Global Settings"}</button>
          </form>
        </div>

      </div>
      )}
    </div>
  );
}
