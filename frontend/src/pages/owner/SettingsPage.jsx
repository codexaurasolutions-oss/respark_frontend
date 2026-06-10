import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const defaultPaymentModes = {
  cash: true,
  card: true,
  upi: true,
  bankTransfer: true,
  wallet: true,
  online: true
};

const settingsSections = [
  { key: "business", label: "Business", to: "/admin/settings/business", hint: "Identity" },
  { key: "invoices", label: "Invoices", to: "/admin/settings/invoices", hint: "Billing" },
  { key: "payments", label: "Payments", to: "/admin/settings/payments", hint: "Checkout" },
  { key: "booking", label: "Booking", to: "/admin/settings/booking", hint: "Policies" },
  { key: "notifications", label: "Notifications", to: "/admin/settings/notifications", hint: "Alerts" },
  { key: "whatsapp", label: "WhatsApp", to: "/admin/settings/whatsapp", hint: "Messaging" },
  { key: "payroll", label: "Payroll", to: "/admin/settings/payroll", hint: "Workforce" }
];

const externalModuleLinks = {
  notifications: "/admin/notifications",
  whatsapp: "/admin/whatsapp",
  payroll: "/admin/payroll"
};

const readinessItems = (saved) => [
  { label: "WhatsApp contact", ok: Boolean(saved?.whatsappNumber) },
  { label: "Invoice prefix", ok: Boolean(saved?.invoicePrefix) },
  { label: "Payment links", ok: saved?.paymentGatewaySettings?.paymentLinkEnabled !== false },
  { label: "Cancellation policy", ok: Boolean(saved?.cancellationPolicy) },
  { label: "Booking notes", ok: Boolean(saved?.bookingNotes) },
  { label: "Stock guard", ok: saved?.allowNegativeStock === false }
];

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    invoicePrefix: "INV",
    invoiceFooter: "",
    taxLabel: "Tax",
    whatsappNumber: "",
    bookingNotes: "",
    cancellationPolicy: "",
    allowNegativeStock: false,
    paymentGatewaySettings: {
      defaultGateway: "RAZORPAY_PLACEHOLDER",
      paymentLinkEnabled: true,
      edcTerminalName: "",
      upiHandle: "",
      gatewayNotes: ""
    }
  });
  const [paymentModes, setPaymentModes] = useState(defaultPaymentModes);
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [saving, setSaving] = useState(false);

  const section = useMemo(() => settingsSections.find((item) => location.pathname.startsWith(item.to))?.key || "business", [location.pathname]);

  useEffect(() => {
    let active = true;
    api.get("/owner/settings").then((response) => {
      if (!active || !response.data) return;
      setForm({
        invoicePrefix: response.data.invoicePrefix || "INV",
        invoiceFooter: response.data.invoiceFooter || "",
        taxLabel: response.data.taxLabel || "Tax",
        whatsappNumber: response.data.whatsappNumber || "",
        bookingNotes: response.data.bookingNotes || "",
        cancellationPolicy: response.data.cancellationPolicy || "",
        allowNegativeStock: Boolean(response.data.allowNegativeStock),
        paymentGatewaySettings: {
          defaultGateway: response.data.paymentGatewaySettings?.defaultGateway || "RAZORPAY_PLACEHOLDER",
          paymentLinkEnabled: response.data.paymentGatewaySettings?.paymentLinkEnabled ?? true,
          edcTerminalName: response.data.paymentGatewaySettings?.edcTerminalName || "",
          upiHandle: response.data.paymentGatewaySettings?.upiHandle || "",
          gatewayNotes: response.data.paymentGatewaySettings?.gatewayNotes || ""
        }
      });
      setPaymentModes({ ...defaultPaymentModes, ...(response.data.paymentModes || {}) });
      setSaved(response.data);
      setStatus((current) => ({ ...current, loading: false }));
    }).catch((error) => {
      if (!active) return;
      setStatus({ error: formatApiError(error, "Could not load settings"), success: "", loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: false });
    setSaving(true);
    try {
      const response = await api.post("/owner/settings", {
        invoicePrefix: form.invoicePrefix,
        invoiceFooter: form.invoiceFooter,
        taxLabel: form.taxLabel,
        whatsappNumber: form.whatsappNumber,
        bookingNotes: form.bookingNotes,
        cancellationPolicy: form.cancellationPolicy,
        paymentModes,
        allowNegativeStock: Boolean(form.allowNegativeStock),
        paymentGatewaySettings: form.paymentGatewaySettings
      });
      setSaved(response.data);
      setStatus({ error: "", success: "Settings saved and audit logged.", loading: false });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save settings"), success: "", loading: false });
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = (key) => setPaymentModes((current) => ({ ...current, [key]: !current[key] }));
  const jumpToSection = (nextKey) => navigate(settingsSections.find((item) => item.key === nextKey)?.to || "/admin/settings/business");
  const readiness = readinessItems(saved || form);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="System Settings"
        description="Control billing behavior, booking policy, checkout readiness, messaging, and digital operations from one owner configuration workspace."
        items={settingsSections}
        actions={(
          <div className="inline-actions">
            <select value={section} onChange={(event) => jumpToSection(event.target.value)}>
              {settingsSections.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <button type="button" className="secondary-button" onClick={() => navigate(externalModuleLinks[section] || "/admin/settings/business")} disabled={!externalModuleLinks[section]}>
              {externalModuleLinks[section] ? "Open Linked Module" : "Using Core Settings"}
            </button>
          </div>
        )}
      />

      <div className="two-col settings-layout">
        <div className="panel-card">
          {status.loading ? (
            <PageLoader
              compact
              title="Loading settings workspace"
              message="Preparing billing, booking, messaging, and digital configuration for this salon."
            />
          ) : null}
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            {section === "business" && (
              <>
                <div className="summary-box">
                  <strong>Business identity</strong>
                  <div className="item-meta">Keep the contact layer and policy layer clean so public catalog, customer portal, and WhatsApp journeys stay aligned.</div>
                </div>
                <div className="form-grid">
                  <input value={form.whatsappNumber} placeholder="Salon WhatsApp number" onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })} />
                  <input value={form.taxLabel} placeholder="Tax label shown across invoices" onChange={(event) => setForm({ ...form, taxLabel: event.target.value })} />
                </div>
                <textarea rows="4" value={form.bookingNotes} placeholder="Internal booking notes for salon team" onChange={(event) => setForm({ ...form, bookingNotes: event.target.value })} />
                <textarea rows="4" value={form.cancellationPolicy} placeholder="Customer cancellation and reschedule policy" onChange={(event) => setForm({ ...form, cancellationPolicy: event.target.value })} />
              </>
            )}

            {section === "invoices" && (
              <>
                <div className="form-grid">
                  <input value={form.invoicePrefix} placeholder="Invoice prefix" onChange={(event) => setForm({ ...form, invoicePrefix: event.target.value })} />
                  <input value={form.taxLabel} placeholder="Tax label" onChange={(event) => setForm({ ...form, taxLabel: event.target.value })} />
                </div>
                <textarea rows="5" value={form.invoiceFooter} placeholder="Receipt / invoice footer message" onChange={(event) => setForm({ ...form, invoiceFooter: event.target.value })} />
                <div className="summary-box">
                  <strong>Invoice output guardrails</strong>
                  <div className="item-meta">These values affect invoice HTML, PDF, and POS receipts. Keep them short, branded, and operationally clear.</div>
                </div>
              </>
            )}

            {section === "payments" && (
              <>
                <div className="form-grid">
                  <select value={form.paymentGatewaySettings.defaultGateway} onChange={(event) => setForm({ ...form, paymentGatewaySettings: { ...form.paymentGatewaySettings, defaultGateway: event.target.value } })}>
                    <option value="RAZORPAY_PLACEHOLDER">Razorpay Placeholder</option>
                    <option value="CASHFREE_PLACEHOLDER">Cashfree Placeholder</option>
                    <option value="PHONEPE_PLACEHOLDER">PhonePe Placeholder</option>
                    <option value="MANUAL_UPI_PLACEHOLDER">Manual UPI Placeholder</option>
                  </select>
                  <input value={form.paymentGatewaySettings.upiHandle} placeholder="UPI handle" onChange={(event) => setForm({ ...form, paymentGatewaySettings: { ...form.paymentGatewaySettings, upiHandle: event.target.value } })} />
                  <input value={form.paymentGatewaySettings.edcTerminalName} placeholder="EDC terminal name" onChange={(event) => setForm({ ...form, paymentGatewaySettings: { ...form.paymentGatewaySettings, edcTerminalName: event.target.value } })} />
                </div>
                <textarea rows="4" value={form.paymentGatewaySettings.gatewayNotes} placeholder="Gateway notes for billing team" onChange={(event) => setForm({ ...form, paymentGatewaySettings: { ...form.paymentGatewaySettings, gatewayNotes: event.target.value } })} />
                <label className="checkbox-row">
                  <input type="checkbox" checked={Boolean(form.paymentGatewaySettings.paymentLinkEnabled)} onChange={(event) => setForm({ ...form, paymentGatewaySettings: { ...form.paymentGatewaySettings, paymentLinkEnabled: event.target.checked } })} />
                  Enable payment link generation across POS and invoices
                </label>
                <div className="summary-box">
                  <strong>Accepted payment modes</strong>
                  <div className="badge-row">
                    {Object.entries(paymentModes).map(([key, value]) => (
                      <label key={key} className="badge settings-checkbox-pill">
                        <input type="checkbox" checked={Boolean(value)} onChange={() => toggleMode(key)} />
                        {key}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {section === "booking" && (
              <>
                <textarea rows="4" value={form.bookingNotes} placeholder="Instructions for booking, walk-ins, and handoff notes" onChange={(event) => setForm({ ...form, bookingNotes: event.target.value })} />
                <textarea rows="4" value={form.cancellationPolicy} placeholder="Cancellation and reschedule policy for customers and staff" onChange={(event) => setForm({ ...form, cancellationPolicy: event.target.value })} />
                <label className="checkbox-row">
                  <input type="checkbox" checked={Boolean(form.allowNegativeStock)} onChange={(event) => setForm({ ...form, allowNegativeStock: event.target.checked })} />
                  Allow negative stock during emergency/manual operational overrides
                </label>
              </>
            )}

            {["notifications", "whatsapp", "payroll"].includes(section) && (
                <div className="settings-routing-stack">
                  <div className="summary-box">
                  <strong>{settingsSections.find((item) => item.key === section)?.label} control center</strong>
                  <div className="item-meta">
                    This module has its own dedicated workspace. Use this settings surface to keep cross-module business defaults aligned, then jump into the live module for operations.
                  </div>
                </div>
                <div className="settings-quick-grid">
                  <Link to={externalModuleLinks[section] || "/admin/settings/business"} className="module-tab active">
                    <span>Open {settingsSections.find((item) => item.key === section)?.label}</span>
                    <small>Dedicated module</small>
                  </Link>
                    <div className="module-tab">
                      <span>Cross-module dependency</span>
                    <small>
                      {section === "notifications" && "Uses customer, enquiry, booking, payroll, and stock events."}
                      {section === "whatsapp" && "Uses campaigns, reminders, portal links, and payment nudges."}

                      {section === "payroll" && "Uses attendance, leaves, incentives, and advanced reports."}
                    </small>
                  </div>
                </div>
              </div>
            )}

            <div className="inline-actions">
              <button disabled={saving}>{saving ? "Saving Settings..." : "Save Settings"}</button>
              {externalModuleLinks[section] ? (
                <button type="button" className="secondary-button" onClick={() => navigate(externalModuleLinks[section])}>
                  Open Linked Module
                </button>
              ) : null}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Settings Readiness</h3>
          {readiness.length ? (
            <div className="list-stack">
              {readiness.map((item) => (
                <div key={item.label} className="list-item">
                  <div className="item-head">
                    <strong>{item.label}</strong>
                    <span className={`badge ${item.ok ? "badge-paid" : "badge-unpaid"}`}>{item.ok ? "Ready" : "Needs setup"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No readiness checks yet" message="As settings modules expand, live readiness checks will appear here for this salon." />
          )}
          
        </div>
      </div>
    </div>
  );
}
