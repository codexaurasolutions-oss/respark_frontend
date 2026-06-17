import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", type: "", isRead: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [notificationConfig, setNotificationConfig] = useState({
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    pushEnabled: false,
    digestHour: "",
    alertEmail: ""
  });
  const [testForm, setTestForm] = useState({
    title: "Settings Test Alert",
    message: "This is a live notification test from the settings-linked notifications workspace.",
    linkUrl: "",
    userSalonId: ""
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, settingsResponse, usersResponse] = await Promise.all([
        api.get("/owner/notifications", {
          params: {
            ...(filters.q ? { q: filters.q } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.isRead ? { isRead: filters.isRead } : {})
          }
        }),
        api.get("/owner/settings").catch(() => ({ data: {} })),
        api.get("/owner/users").catch(() => ({ data: [] }))
      ]);
      setRows(response.data || []);
      setStaffRows(usersResponse.data || []);
      setNotificationConfig((current) => ({
        ...current,
        ...(settingsResponse.data?.advancedSettings?.notificationSettings || {})
      }));
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load notifications"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const markAllRead = async () => {
    try {
      await api.patch("/owner/notifications/read-all");
      setStatus({ error: "", success: "Notifications marked as read." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update notifications"), success: "" });
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/owner/notifications/${id}/read`);
      setStatus({ error: "", success: "Notification marked as read." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update notification"), success: "" });
    }
  };

  const exportCsv = async () => {
    try {
      await downloadFromApi("/owner/notifications/export.csv", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.isRead ? { isRead: filters.isRead } : {})
        },
        fallbackFilename: "notifications-export.csv"
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not export notifications"), success: "" });
    }
  };

  const sendTestNotification = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/notifications/test-placeholder", {
        title: testForm.title,
        message: testForm.message,
        linkUrl: testForm.linkUrl || null,
        userSalonId: testForm.userSalonId || null
      });
      setStatus({ error: "", success: "Test notification created successfully." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create test notification"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Notifications"
        description="Critical alerts, reminders, follow-ups and update feed."
        items={[{ label: "Notifications", to: "/admin/notifications" }]}
        actions={<><button type="button" className="secondary-button" onClick={markAllRead}>Mark All Read</button><button type="button" className="secondary-button" onClick={exportCsv}>Export CSV</button></>}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Notifications</h1>
            <p style={{ marginBottom: 0 }}>Review critical alerts, reminders, and unread activity across the owner workspace.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Visible {rows.length}</span>
            <span className="badge">Unread {rows.filter((row) => !row.isRead).length}</span>
            <span className="badge">Digest {notificationConfig.digestHour || "Not set"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="item-head" style={{ marginBottom: 12 }}>
          <div>
            <strong>Live Dispatch Configuration</strong>
            <div className="item-meta">These values are read live from Settings and attached to new notification records.</div>
          </div>
        </div>
        <div className="badge-row">
          <span className={`badge ${notificationConfig.emailEnabled === false ? "badge-cancelled" : ""}`}>Email {notificationConfig.emailEnabled === false ? "Off" : "On"}</span>
          <span className={`badge ${notificationConfig.smsEnabled === false ? "badge-cancelled" : ""}`}>SMS {notificationConfig.smsEnabled === false ? "Off" : "On"}</span>
          <span className={`badge ${notificationConfig.whatsappEnabled === false ? "badge-cancelled" : ""}`}>WhatsApp {notificationConfig.whatsappEnabled === false ? "Off" : "On"}</span>
          <span className={`badge ${notificationConfig.pushEnabled !== true ? "badge-cancelled" : ""}`}>Push {notificationConfig.pushEnabled === true ? "On" : "Off"}</span>
          <span className="badge">Digest {notificationConfig.digestHour || "Not set"}</span>
          {notificationConfig.alertEmail ? <span className="badge">{notificationConfig.alertEmail}</span> : null}
        </div>
      </div>
      <div className="panel-card" style={{ marginBottom: 18 }}>
        <div className="item-head" style={{ marginBottom: 12 }}>
          <div>
            <strong>Send Test Notification</strong>
            <div className="item-meta">Use this to verify live channel metadata, digest hour attachment, and notification visibility immediately.</div>
          </div>
        </div>
        <form className="form-grid" onSubmit={sendTestNotification}>
          <label>
            <span className="muted">Title</span>
            <input value={testForm.title} onChange={(event) => setTestForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span className="muted">Message</span>
            <input value={testForm.message} onChange={(event) => setTestForm((current) => ({ ...current, message: event.target.value }))} />
          </label>
          <label>
            <span className="muted">Link URL</span>
            <input value={testForm.linkUrl} onChange={(event) => setTestForm((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="/admin/settings/notification-settings" />
          </label>
          <label>
            <span className="muted">Target staff (optional)</span>
            <select value={testForm.userSalonId} onChange={(event) => setTestForm((current) => ({ ...current, userSalonId: event.target.value }))}>
              <option value="">Global / owner feed</option>
              {staffRows.map((row) => <option key={row.id} value={row.id}>{row.user?.name || row.phone || row.id}</option>)}
            </select>
          </label>
          <button type="submit">Create Test Notification</button>
        </form>
      </div>
      <div className="panel-card">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label>
              <span className="muted">Search title, message, type, or link</span>
              <input
            value={filters.q}
            placeholder="Search title, message, type, or link"
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Filter by type</span>
              <input
            value={filters.type}
            placeholder="Filter by type"
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} />
            </label>
          <label>
              <span className="muted">Read states</span>
              <select value={filters.isRead} onChange={(event) => setFilters((current) => ({ ...current, isRead: event.target.value }))}>
            <option value="">All read states</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
            </label>
          <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", type: "", isRead: "" })}>Reset</button>
        </div>
        <div className="list-stack">
          {loading ? (
            <PageLoader compact title="Loading notifications" message="Preparing alert feed, read state, and export-ready records." />
          ) : rows.map((row) => (
            <div key={row.id} className="list-item">
              <div>
                <strong>{row.title}</strong>
                <div className="item-meta">{row.message}</div>
                <div className="item-meta">{row.type || "General"} | {row.isRead ? "Read" : "Unread"}{row.linkUrl ? ` | ${row.linkUrl}` : ""}</div>
                {row.metadata?.notificationChannels ? (
                  <div className="badge-row" style={{ marginTop: 8 }}>
                    <span className={`badge ${row.metadata.notificationChannels.emailEnabled === false ? "badge-cancelled" : ""}`}>Email</span>
                    <span className={`badge ${row.metadata.notificationChannels.smsEnabled === false ? "badge-cancelled" : ""}`}>SMS</span>
                    <span className={`badge ${row.metadata.notificationChannels.whatsappEnabled === false ? "badge-cancelled" : ""}`}>WhatsApp</span>
                    <span className={`badge ${row.metadata.notificationChannels.pushEnabled !== true ? "badge-cancelled" : ""}`}>Push</span>
                    {row.metadata?.notificationDispatch?.digestHour ? <span className="badge">Digest {row.metadata.notificationDispatch.digestHour}</span> : null}
                  </div>
                ) : null}
              </div>
              {!row.isRead ? <button type="button" className="secondary-button" onClick={() => markRead(row.id)}>Mark Read</button> : null}
            </div>
          ))}
          {!loading && !rows.length && <EmptyState title="No notifications yet" message="Alert activity, reminders, and internal updates will appear here when generated." />}
        </div>
      </div>
    </div>
  );
}
