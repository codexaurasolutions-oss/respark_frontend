import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import { Bell, Search as SearchIcon, Filter, CheckCircle2, AlertCircle, Info, ExternalLink, Check } from "lucide-react";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", type: "", isRead: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/owner/notifications", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.isRead ? { isRead: filters.isRead } : {})
        }
      });
      setRows(response.data || []);
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

  const getIconForType = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("error") || t.includes("alert")) return <AlertCircle className="noti-icon error" size={20} />;
    if (t.includes("success") || t.includes("paid")) return <CheckCircle2 className="noti-icon success" size={20} />;
    return <Info className="noti-icon info" size={20} />;
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Notifications"
        description="Critical alerts, reminders, follow-ups and update feed."
        items={[{ label: "Notifications", to: "/admin/notifications" }]}
        actions={
          <div className="noti-header-actions">
            <button type="button" className="secondary-button" onClick={markAllRead}>
              <Check size={16} /> Mark All Read
            </button>
            <button type="button" className="secondary-button" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        }
      />

      <div className="noti-hero-card">
        <div className="noti-hero-content">
          <div className="noti-hero-icon-wrapper">
            <Bell size={28} className="noti-hero-icon" />
          </div>
          <div className="noti-hero-text">
            <h1>Notifications Hub</h1>
            <p>Review critical alerts, reminders, and unread activity across your workspace.</p>
          </div>
        </div>
        <div className="noti-hero-stats">
          <div className="noti-stat-box">
            <span className="stat-value">{rows.length}</span>
            <span className="stat-label">Total Visible</span>
          </div>
          <div className="noti-stat-box highlight">
            <span className="stat-value">{rows.filter((row) => !row.isRead).length}</span>
            <span className="stat-label">Unread Alerts</span>
          </div>
        </div>
      </div>

      {status.error && <div className="panel-card noti-alert error"><p>{status.error}</p></div>}
      {status.success && <div className="panel-card noti-alert success"><p>{status.success}</p></div>}

      <div className="panel-card noti-main-panel">
        <div className="noti-filters">
          <div className="noti-filter-group search-group">
            <SearchIcon size={16} className="filter-icon" />
            <input
              value={filters.q}
              placeholder="Search title, message, link..."
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} 
            />
          </div>
          <div className="noti-filter-group">
            <Filter size={16} className="filter-icon" />
            <input
              value={filters.type}
              placeholder="Filter by type..."
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} 
            />
          </div>
          <div className="noti-filter-group select-group">
            <select value={filters.isRead} onChange={(event) => setFilters((current) => ({ ...current, isRead: event.target.value }))}>
              <option value="">All Statuses</option>
              <option value="false">Unread Only</option>
              <option value="true">Read Only</option>
            </select>
          </div>
          <button type="button" className="secondary-button btn-reset" onClick={() => setFilters({ q: "", type: "", isRead: "" })}>Clear</button>
        </div>

        <div className="noti-list-container">
          {loading ? (
            <PageLoader compact title="Loading notifications" message="Preparing alert feed, read state, and export-ready records." />
          ) : rows.length > 0 ? (
            <div className="noti-list">
              {rows.map((row) => (
                <div key={row.id} className={`noti-card ${row.isRead ? 'read' : 'unread'}`}>
                  <div className="noti-card-indicator"></div>
                  <div className="noti-card-icon-area">
                    {getIconForType(row.type)}
                  </div>
                  <div className="noti-card-content">
                    <div className="noti-card-header">
                      <h3 className="noti-title">{row.title}</h3>
                      <span className="noti-type-badge">{row.type || "General"}</span>
                    </div>
                    <p className="noti-message">{row.message}</p>
                    {row.linkUrl && (
                      <a href={row.linkUrl} target="_blank" rel="noopener noreferrer" className="noti-link">
                        View Details <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <div className="noti-card-actions">
                    {!row.isRead ? (
                      <button type="button" className="mark-read-btn" onClick={() => markRead(row.id)} title="Mark as read">
                        <Check size={18} />
                      </button>
                    ) : (
                      <span className="read-status-text">Read</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No notifications found" message="You're all caught up! There are no alerts matching your current filters." />
          )}
        </div>
      </div>
    </div>
  );
}
