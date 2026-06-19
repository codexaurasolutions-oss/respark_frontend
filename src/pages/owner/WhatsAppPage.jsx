import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import PageLoader from "../../components/PageLoader";

const emptySettings = {
  providerName: "",
  senderName: "",
  apiUrl: "",
  apiKeyPlaceholder: "",
  automationEnabled: false,
  deliveryStatusEnabled: false,
  readStatusEnabled: false
};

const emptyMessage = {
  phone: "",
  templateType: "manual_share",
  message: "",
  mediaKind: "IMAGE",
  mediaUrl: ""
};

const emptyBulkMessage = {
  audienceFilter: "ALL_CUSTOMERS",
  templateType: "bulk_placeholder",
  message: "",
  mediaKind: "IMAGE",
  mediaUrl: ""
};

const emptyAutomation = {
  eventKey: "",
  templateType: "",
  audienceFilter: "",
  mediaKind: "IMAGE",
  mediaUrl: "",
  isEnabled: true,
  notes: ""
};

const automationEventOptions = [
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_REMINDER",
  "PAYMENT_REMINDER",
  "INVOICE_SHARED",
  "MEMBERSHIP_EXPIRY",
  "PACKAGE_EXPIRY",
  "FEEDBACK_REQUEST",
  "BIRTHDAY_WISH"
];

export default function WhatsAppPage() {
  const location = useLocation();
  const [settings, setSettings] = useState(emptySettings);
  const [logs, setLogs] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [message, setMessage] = useState(emptyMessage);
  const [bulkMessage, setBulkMessage] = useState(emptyBulkMessage);
  const [automationForm, setAutomationForm] = useState(emptyAutomation);
  const [editingAutomationId, setEditingAutomationId] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [logFilters, setLogFilters] = useState({ q: "", status: "", templateType: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [settingsLinkMeta, setSettingsLinkMeta] = useState({ gatewayProvider: "", senderId: "", whatsappEnabled: true });

  const mode = location.pathname.includes("/settings")
    ? "settings"
    : location.pathname.includes("/logs")
      ? "logs"
      : location.pathname.includes("/automations")
        ? "automations"
        : "send";

  const load = useCallback(async () => {
    try {
      const [settingsResponse, logsResponse, automationResponse, templatesResponse, ownerSettingsResponse] = await Promise.all([
        api.get("/owner/whatsapp/settings"),
        api.get("/owner/whatsapp/logs", {
          params: {
            ...(logFilters.q ? { q: logFilters.q } : {}),
            ...(logFilters.status ? { status: logFilters.status } : {}),
            ...(logFilters.templateType ? { templateType: logFilters.templateType } : {})
          }
        }),
        api.get("/owner/whatsapp/automations"),
        api.get("/owner/message-templates").catch(() => ({ data: [] })),
        api.get("/owner/settings").catch(() => ({ data: {} }))
      ]);
      setSettings({ ...emptySettings, ...(settingsResponse.data || {}) });
      setLogs(logsResponse.data || []);
      setAutomations(automationResponse.data || []);
      setTemplates(templatesResponse.data || []);
      setSettingsLinkMeta({
        gatewayProvider: ownerSettingsResponse.data?.smsSettings?.gatewayProvider || "",
        senderId: ownerSettingsResponse.data?.smsSettings?.senderId || "",
        whatsappEnabled: ownerSettingsResponse.data?.advancedSettings?.notificationSettings?.whatsappEnabled !== false
      });
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load WhatsApp workspace"), success: "" });
      setLoading(false);
    }
  }, [logFilters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const saveSettings = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/whatsapp/settings", settings);
      setStatus({ error: "", success: "WhatsApp settings saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save WhatsApp settings"), success: "" });
    }
  };

  const sendManual = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/whatsapp/send-manual", message);
      setMessage(emptyMessage);
      setStatus({ error: "", success: "WhatsApp placeholder message logged." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send WhatsApp placeholder message"), success: "" });
    }
  };

  const sendBulkPlaceholder = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post("/owner/whatsapp/send-bulk-placeholder", bulkMessage);
      setBulkMessage(emptyBulkMessage);
      setStatus({ error: "", success: `Bulk placeholder processed for ${response.data.sentCount || 0} customers.` });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not process bulk WhatsApp placeholder"), success: "" });
    }
  };

  const saveAutomation = async (event) => {
    event.preventDefault();
    try {
      if (editingAutomationId) {
        await api.patch(`/owner/whatsapp/automations/${editingAutomationId}`, automationForm);
        setStatus({ error: "", success: "Automation updated." });
      } else {
        await api.post("/owner/whatsapp/automations", automationForm);
        setStatus({ error: "", success: "Automation created." });
      }
      setAutomationForm(emptyAutomation);
      setEditingAutomationId("");
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save automation"), success: "" });
    }
  };

  const editAutomation = (row) => {
    setEditingAutomationId(row.id);
    setAutomationForm({
      eventKey: row.eventKey || "",
      templateType: row.templateType || "",
      audienceFilter: row.audienceFilter || "",
      mediaKind: row.mediaKind || "IMAGE",
      mediaUrl: row.mediaUrl || "",
      isEnabled: row.isEnabled ?? true,
      notes: row.notes || ""
    });
  };

  const applyTemplate = (target, templateType) => {
    const template = templates.find((row) => row.type === templateType);
    if (!template) return;
    if (target === "manual") {
      setMessage((current) => ({
        ...current,
        templateType,
        message: template.content || current.message
      }));
    }
    if (target === "bulk") {
      setBulkMessage((current) => ({
        ...current,
        templateType,
        message: template.content || current.message
      }));
    }
    if (target === "automation") {
      setAutomationForm((current) => ({
        ...current,
        templateType
      }));
    }
    setStatus({ error: "", success: `${template.title || template.type} applied.` });
  };

  const exportLogs = async () => {
    try {
      await downloadFromApi("/owner/whatsapp/logs/export.csv", {
        params: {
          ...(logFilters.q ? { q: logFilters.q } : {}),
          ...(logFilters.status ? { status: logFilters.status } : {}),
          ...(logFilters.templateType ? { templateType: logFilters.templateType } : {})
        },
        fallbackFilename: "whatsapp-logs-export.csv"
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not export WhatsApp logs"), success: "" });
    }
  };

  const updateLogStatus = async (id, nextStatus) => {
    try {
      await api.patch(`/owner/whatsapp/logs/${id}/status`, { status: nextStatus });
      setStatus({ error: "", success: `WhatsApp log marked ${nextStatus.toLowerCase()}.` });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update WhatsApp log status"), success: "" });
    }
  };

  const logReplyPlaceholder = async (id) => {
    const replyNote = String(replyDrafts[id] || "").trim();
    if (!replyNote) {
      setStatus({ error: "Write a reply note before logging it.", success: "" });
      return;
    }
    try {
      await api.patch(`/owner/whatsapp/logs/${id}/reply-placeholder`, { replyNote });
      setReplyDrafts((current) => ({ ...current, [id]: "" }));
      setStatus({ error: "", success: "Reply placeholder logged." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not log WhatsApp reply placeholder"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="WhatsApp"
        description="Manual share, automation settings, logs and salon-specific WhatsApp foundation."
        items={[
          { label: "Send", to: "/admin/whatsapp" },
          { label: "Settings", to: "/admin/whatsapp/settings" },
          { label: "Logs", to: "/admin/whatsapp/logs" },
          { label: "Automations", to: "/admin/whatsapp/automations" }
        ]}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      {mode === "send" && (
        <div className="settings-section-grid">
          <div className="panel-card">
            <h3>Manual WhatsApp Share</h3>
            <form className="form-grid" onSubmit={sendManual}>
              <select value="" onChange={(e) => applyTemplate("manual", e.target.value)}>
                <option value="">Apply saved message template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.type}>
                    {template.title}
                  </option>
                ))}
              </select>
              <IndianPhoneInput
                value={message.phone}
                onChange={(value) => setMessage({ ...message, phone: value })}
                placeholder="9876543210"
              />
              <input placeholder="Template type" value={message.templateType} onChange={(e) => setMessage({ ...message, templateType: e.target.value })} />
              <select value={message.mediaKind} onChange={(e) => setMessage({ ...message, mediaKind: e.target.value })}>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
              <input placeholder="Media URL (optional)" value={message.mediaUrl} onChange={(e) => setMessage({ ...message, mediaUrl: e.target.value })} />
              <textarea rows="4" placeholder="Message" value={message.message} onChange={(e) => setMessage({ ...message, message: e.target.value })} />
              <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
                <strong>Manual Preview</strong>
                <div className="item-meta" style={{ marginTop: 8 }}>{message.templateType || "manual_share"}</div>
                <p style={{ marginTop: 8 }}>{message.message || "Message preview will appear here."}</p>
                {message.mediaUrl ? <div className="item-meta">{message.mediaKind} asset attached</div> : null}
              </div>
              <button>Send Placeholder</button>
            </form>
          </div>
          <div className="panel-card">
            <h3>Bulk Placeholder</h3>
            <form className="form-grid" onSubmit={sendBulkPlaceholder}>
              <select value="" onChange={(e) => applyTemplate("bulk", e.target.value)}>
                <option value="">Apply saved message template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.type}>
                    {template.title}
                  </option>
                ))}
              </select>
              <select value={bulkMessage.audienceFilter} onChange={(e) => setBulkMessage({ ...bulkMessage, audienceFilter: e.target.value })}>
                <option value="ALL_CUSTOMERS">All customers</option>
                <option value="BIRTHDAY_CUSTOMERS">Birthday customers</option>
                <option value="ANNIVERSARY_CUSTOMERS">Anniversary customers</option>
                <option value="LOST_CUSTOMERS">Lost customers</option>
                <option value="HIGH_SPENDERS">High spenders</option>
                <option value="MEMBERSHIP_CUSTOMERS">Membership customers</option>
                <option value="PACKAGE_CUSTOMERS">Package customers</option>
                <option value="SERVICE_BASED_CUSTOMERS">Service-based customers</option>
              </select>
              <input placeholder="Template type" value={bulkMessage.templateType} onChange={(e) => setBulkMessage({ ...bulkMessage, templateType: e.target.value })} />
              <select value={bulkMessage.mediaKind} onChange={(e) => setBulkMessage({ ...bulkMessage, mediaKind: e.target.value })}>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
              <input placeholder="Media URL (preview only)" value={bulkMessage.mediaUrl} onChange={(e) => setBulkMessage({ ...bulkMessage, mediaUrl: e.target.value })} />
              <textarea rows="4" placeholder="Message" value={bulkMessage.message} onChange={(e) => setBulkMessage({ ...bulkMessage, message: e.target.value })} />
              <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
                <strong>Bulk Preview</strong>
                <div className="item-meta" style={{ marginTop: 8 }}>{bulkMessage.audienceFilter} | {bulkMessage.templateType || "bulk_placeholder"}</div>
                <p style={{ marginTop: 8 }}>{bulkMessage.message || "Bulk message preview will appear here."}</p>
                {bulkMessage.mediaUrl ? <div className="item-meta">{bulkMessage.mediaKind} asset preview attached</div> : null}
              </div>
              <button>Run Bulk Placeholder</button>
            </form>
          </div>
        </div>
      )}

      {mode === "settings" && (
        <div className="panel-card">
          <h3>WhatsApp Settings</h3>
          <div className="badge-row" style={{ marginBottom: 16 }}>
            <span className="badge">Settings Provider {settingsLinkMeta.gatewayProvider ? settingsLinkMeta.gatewayProvider.replace("_PLACEHOLDER", "") : "Not Set"}</span>
            <span className="badge">Sender {settingsLinkMeta.senderId || "Not Set"}</span>
            <span className={`badge ${settingsLinkMeta.whatsappEnabled ? "" : "badge-cancelled"}`}>WhatsApp Alerts {settingsLinkMeta.whatsappEnabled ? "On" : "Off"}</span>
          </div>
          <p className="item-meta" style={{ marginTop: 0, marginBottom: 16 }}>
            Yeh screen aur <code>Settings &rarr; SMS Center / Notification Settings</code> ab linked hain. Idhar provider ya sender update karne se owner settings snapshot bhi sync ho jata hai.
          </p>
          <form className="form-grid" onSubmit={saveSettings}>
            <input placeholder="Provider name" value={settings.providerName} onChange={(e) => setSettings({ ...settings, providerName: e.target.value })} />
            <input placeholder="Sender name" value={settings.senderName} onChange={(e) => setSettings({ ...settings, senderName: e.target.value })} />
            <input placeholder="API URL" value={settings.apiUrl} onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })} />
            <input placeholder="API key placeholder" value={settings.apiKeyPlaceholder} onChange={(e) => setSettings({ ...settings, apiKeyPlaceholder: e.target.value })} />
            <label className="badge"><input type="checkbox" checked={Boolean(settings.automationEnabled)} onChange={(e) => setSettings({ ...settings, automationEnabled: e.target.checked })} /> Automation enabled</label>
            <label className="badge"><input type="checkbox" checked={Boolean(settings.deliveryStatusEnabled)} onChange={(e) => setSettings({ ...settings, deliveryStatusEnabled: e.target.checked })} /> Delivery status placeholder</label>
            <label className="badge"><input type="checkbox" checked={Boolean(settings.readStatusEnabled)} onChange={(e) => setSettings({ ...settings, readStatusEnabled: e.target.checked })} /> Read status placeholder</label>
            <button>Save Settings</button>
          </form>
        </div>
      )}

      {mode === "logs" && (
        <div className="panel-card">
          <div className="item-head">
            <h3>WhatsApp Logs</h3>
            <button type="button" className="secondary-button" onClick={exportLogs}>Export CSV</button>
          </div>
          {loading ? <PageLoader compact title="Loading WhatsApp logs" message="Preparing delivery history, filterable outcomes, and template-level activity." /> : null}
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <input value={logFilters.q} placeholder="Search phone, customer, campaign, or message" onChange={(e) => setLogFilters((current) => ({ ...current, q: e.target.value }))} />
            <input value={logFilters.templateType} placeholder="Filter by template type" onChange={(e) => setLogFilters((current) => ({ ...current, templateType: e.target.value }))} />
            <select value={logFilters.status} onChange={(e) => setLogFilters((current) => ({ ...current, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="DELIVERED">Delivered</option>
              <option value="READ">Read</option>
            </select>
            <button type="button" className="secondary-button" onClick={() => setLogFilters({ q: "", status: "", templateType: "" })}>Reset</button>
          </div>
          <div className="list-stack">
            {logs.map((row) => (
              <div key={row.id} className="list-item">
                <div>
                  <strong>{row.phone}</strong>
                  <div className="item-meta">{row.templateType || "manual"} | {row.status}</div>
                  <div className="item-meta">{row.customer?.name || "No customer"} | {row.campaign?.name || "Direct send"} | {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</div>
                  {row.linkUrl ? <div className="item-meta"><a href={row.linkUrl} target="_blank" rel="noreferrer">Open share link</a></div> : null}
                  {row.metadata?.lastReplyNote ? (
                    <div className="summary-box" style={{ marginTop: 10 }}>
                      <strong>Latest Reply Placeholder</strong>
                      <p style={{ marginTop: 8 }}>{row.metadata.lastReplyNote}</p>
                      <div className="item-meta">{row.metadata.lastReplyBy || "Team"} | {row.metadata.lastReplyAt ? new Date(row.metadata.lastReplyAt).toLocaleString() : ""}</div>
                    </div>
                  ) : null}
                  <div className="inline-actions" style={{ marginTop: 10, alignItems: "stretch" }}>
                    <textarea
                      rows="2"
                      placeholder="Log customer reply placeholder"
                      value={replyDrafts[row.id] || ""}
                      onChange={(event) => setReplyDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                      style={{ minWidth: 240 }}
                    />
                    <button type="button" className="secondary-button" onClick={() => logReplyPlaceholder(row.id)}>Log Reply</button>
                  </div>
                </div>
                <div className="inline-actions">
                  {row.status !== "DELIVERED" && row.status !== "READ" ? <button type="button" className="secondary-button" onClick={() => updateLogStatus(row.id, "DELIVERED")}>Mark Delivered</button> : null}
                  {row.status !== "READ" ? <button type="button" className="secondary-button" onClick={() => updateLogStatus(row.id, "READ")}>Mark Read</button> : null}
                </div>
              </div>
            ))}
            {!loading && !logs.length && <EmptyState title="No WhatsApp logs yet" message="Manual sends, bulk placeholders, and automation activity will appear here once processed." />}
          </div>
        </div>
      )}

      {mode === "automations" && (
        <div className="settings-section-grid">
          <div className="panel-card">
            <h3>{editingAutomationId ? "Edit Automation" : "Create Automation"}</h3>
            <form className="form-grid" onSubmit={saveAutomation}>
              <select value={automationForm.eventKey} onChange={(e) => setAutomationForm({ ...automationForm, eventKey: e.target.value })}>
                <option value="">Select automation event</option>
                {automationEventOptions.map((eventKey) => <option key={eventKey} value={eventKey}>{eventKey}</option>)}
              </select>
              <select value={automationForm.templateType} onChange={(e) => setAutomationForm({ ...automationForm, templateType: e.target.value })}>
                <option value="">Select message template</option>
                {templates.map((template) => <option key={template.id} value={template.type}>{template.title}</option>)}
              </select>
              <input placeholder="Audience filter (optional)" value={automationForm.audienceFilter} onChange={(e) => setAutomationForm({ ...automationForm, audienceFilter: e.target.value })} />
              <select value={automationForm.mediaKind} onChange={(e) => setAutomationForm({ ...automationForm, mediaKind: e.target.value })}>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
              <input placeholder="Automation media URL (optional)" value={automationForm.mediaUrl} onChange={(e) => setAutomationForm({ ...automationForm, mediaUrl: e.target.value })} />
              <textarea rows="4" placeholder="Notes" value={automationForm.notes} onChange={(e) => setAutomationForm({ ...automationForm, notes: e.target.value })} />
              <label className="badge"><input type="checkbox" checked={Boolean(automationForm.isEnabled)} onChange={(e) => setAutomationForm({ ...automationForm, isEnabled: e.target.checked })} /> Enabled</label>
              <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
                <strong>Automation Preview</strong>
                <div className="item-meta" style={{ marginTop: 8 }}>{automationForm.eventKey || "No event selected"} | {automationForm.templateType || "No template selected"}</div>
                <p style={{ marginTop: 8 }}>{automationForm.notes || "Automation notes and delivery context will appear here."}</p>
                {automationForm.mediaUrl ? <div className="item-meta">{automationForm.mediaKind} asset attached for this automation</div> : null}
              </div>
              <div className="inline-actions">
                <button>{editingAutomationId ? "Save Automation" : "Create Automation"}</button>
                {editingAutomationId ? <button type="button" className="secondary-button" onClick={() => { setEditingAutomationId(""); setAutomationForm(emptyAutomation); }}>Cancel Edit</button> : null}
              </div>
            </form>
          </div>
          <div className="panel-card">
            <h3>Automations</h3>
            <div className="list-stack">
              {automations.map((row) => (
                <div key={row.id} className="list-item">
                  <strong>{row.eventKey}</strong>
                  <div className="item-meta">{row.templateType} | {row.audienceFilter || "All"} | {row.isEnabled ? "Enabled" : "Disabled"}</div>
                  {row.mediaUrl ? <div className="item-meta">{row.mediaKind || "Media"} asset attached</div> : null}
                  <div className="inline-actions">
                    <button type="button" className="secondary-button" onClick={() => editAutomation(row)}>Edit</button>
                  </div>
                </div>
              ))}
              {!loading && !automations.length && <EmptyState title="No automations yet" message="Create reminder and lifecycle rules here to start automating WhatsApp touchpoints." />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
