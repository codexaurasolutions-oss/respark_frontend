import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Menu, Settings, FileText, Monitor, Calendar as CalendarIcon, Users, BarChart2, Package, TrendingUp, Search, Bell, LayoutDashboard } from "lucide-react";

export default function Topbar({ auth, sidebarExpanded, onToggleSidebar, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [salonName, setSalonName] = useState("MySalon");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [quickSearch, setQuickSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ customers: [], appointments: [], services: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const permissions = auth?.membership?.permissions || {};
  const featureFlags = auth?.membership?.featureFlags || {};
  const can = (key, action = "view") => Array.isArray(permissions[key]) && permissions[key].includes(action);
  const enabled = (key) => featureFlags[key] !== false;
  const canPos = can("pos") && enabled("pos");
  const canNotifications = can("notifications");
  const canGlobalSearch = can("customers") || can("appointments") || can("services");
  const canSettings = can("settings", "edit");
  const canProfile = can("myProfile");

  useEffect(() => {
    let active = true;
    if (canPos) {
      api.get("/owner/pos/context").then(res => {
        if (active && res.data?.salon?.name) setSalonName(res.data.salon.name);
      }).catch(()=> {});
    }

    if (canNotifications) {
      api.get("/owner/notifications", { params: { limit: 5 } }).then((res) => {
        if (active && res.data) {
          setNotifications(res.data);
        }
      }).catch(() => {});
    }

    return () => { active = false; };
  }, [canNotifications, canPos]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest?.(".respark-search-wrap")) setSearchOpen(false);
      if (!event.target.closest?.(".respark-notif-wrap")) setIsNotifOpen(false);
      if (!event.target.closest?.(".respark-profile-wrap")) setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const flatSearchResults = [
    ...searchResults.customers.map((item) => ({ ...item, type: "Guest" })),
    ...searchResults.appointments.map((item) => ({ ...item, type: "Appointment" })),
    ...searchResults.services.map((item) => ({ ...item, type: "Service" }))
  ];

  useEffect(() => {
    if (!canGlobalSearch) return undefined;
    const term = quickSearch.trim();
    if (term.length < 2) {
      setSearchResults({ customers: [], appointments: [], services: [] });
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await api.get("/owner/global-search", { params: { q: term } });
        if (!active) return;
        setSearchResults({
          customers: response.data?.customers || [],
          appointments: response.data?.appointments || [],
          services: response.data?.services || []
        });
        setSearchOpen(true);
      } catch {
        if (active) setSearchResults({ customers: [], appointments: [], services: [] });
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [canGlobalSearch, quickSearch]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await api.patch("/owner/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotificationClick = async (e, notif) => {
    e.stopPropagation();
    if (!notif.isRead) {
      try {
        await api.patch(`/owner/notifications/${notif.id}/read`);
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      } catch {}
    }
    if (notif.linkUrl) {
      setIsNotifOpen(false);
      navigate(notif.linkUrl);
    }
  };

  const today = new Date();
  const dateOpts = { weekday: 'short', day: '2-digit', month: 'short' };
  const dateStr = today.toLocaleDateString('en-GB', dateOpts);

  const tabs = [
    { label: "DASHBOARD", path: "/admin/dashboard", moduleKey: "dashboard", icon: <LayoutDashboard size={14} style={{marginRight: 6}} /> },
    { label: "POS", path: "/admin/pos", moduleKey: "pos", featureKey: "pos", icon: <Monitor size={14} style={{marginRight: 6}} /> },
    { label: "POS DASHBOARD", path: "/admin/order-dashboard", moduleKey: "orders", featureKey: "onlineOrders", icon: <Package size={14} style={{marginRight: 6}} /> },
    { label: "APPOINTMENT", path: "/admin/appointments", moduleKey: "appointments", featureKey: "appointments", icon: <CalendarIcon size={14} style={{marginRight: 6}} /> },
    { label: "CRM", path: "/admin/customers", moduleKey: "customers", icon: <Users size={14} style={{marginRight: 6}} /> },
    { label: "REPORTS", path: "/admin/reports", moduleKey: "reports", featureKey: "reports", icon: <BarChart2 size={14} style={{marginRight: 6}} /> },
    { label: "INVENTORY", path: "/admin/inventory", moduleKey: "inventory", featureKey: "inventory", icon: <Package size={14} style={{marginRight: 6}} /> },
    { label: "TRENDS", path: "/admin/trends", moduleKey: "reports", featureKey: "reports", icon: <TrendingUp size={14} style={{marginRight: 6}} /> }
  ].filter((tab) => can(tab.moduleKey) && (!tab.featureKey || enabled(tab.featureKey)));

  return (
    <div className="respark-header-container">
      <style>{`
        .respark-header-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          z-index: 50;
        }
        .respark-top-row {
          background: var(--navbar-bg, white);
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        .respark-logo-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .respark-brand-image {
          height: 42px;
          width: auto;
          object-fit: contain;
        }
        .respark-salon-name {
          color: #475569;
          font-size: 0.95rem;
          font-weight: 600;
          border-left: 2px solid #e2e8f0;
          padding-left: 16px;
        }
        
        .respark-search-bar {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          border-radius: 20px;
          padding: 5px 14px;
          width: 360px;
          border: 1px solid transparent;
          transition: all 0.2s;
          position: relative;
        }
        .respark-search-bar:focus-within {
          background: white;
          border: 1px solid #cbd5e1;
          box-shadow: none;
        }
        .respark-search-bar input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          margin-left: 8px;
          font-size: 0.85rem;
          color: #0f172a;
          min-height: auto;
          padding: 0;
          border-radius: 0;
        }
        .respark-search-bar input::placeholder {
          color: #94a3b8;
        }
        .respark-search-wrap {
          position: relative;
          margin-right: 8px;
        }
        .respark-search-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 420px;
          max-height: 420px;
          overflow: auto;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: none;
          z-index: 120;
          padding: 10px;
        }
        .respark-search-section-title {
          padding: 8px 10px 6px;
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .respark-search-result {
          width: 100%;
          border: 0;
          background: transparent;
          text-align: left;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          display: grid;
          grid-template-columns: 74px 1fr;
          gap: 10px;
          align-items: center;
        }
        .respark-search-result:hover {
          background: #eff6ff;
        }
        .respark-search-result-type {
          font-size: 0.68rem;
          font-weight: 800;
          color: #2563eb;
          background: #dbeafe;
          border-radius: 999px;
          padding: 5px 8px;
          text-align: center;
        }
        .respark-search-result strong {
          display: block;
          color: #0f172a;
          font-size: 0.88rem;
        }
        .respark-search-result small {
          display: block;
          color: #64748b;
          font-size: 0.75rem;
          margin-top: 2px;
        }
        .respark-search-empty {
          padding: 18px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .respark-top-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .respark-date {
          font-size: 0.85rem;
          color: #475569;
          font-weight: 600;
          padding: 6px 12px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .respark-icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .respark-icon-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        
        /* Notifications Dropdown */
        .notif-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: none;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          z-index: 100;
        }
        .notif-header {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .notif-header h4 { margin: 0; font-size: 0.95rem; color: #0f172a; }
        .notif-header button { background: none; border: none; color: #3b82f6; font-size: 0.8rem; cursor: pointer; font-weight: 500; }
        .notif-body { max-height: 300px; overflow-y: auto; }
        .notif-item { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; gap: 12px; transition: background 0.2s; }
        .notif-item:hover { background: #f8fafc; }
        .notif-item.unread { background: #eff6ff; }
        .notif-item.unread:hover { background: #e0f2fe; }
        .notif-item p { margin: 0 0 4px; font-size: 0.85rem; color: #334155; line-height: 1.4; }
        .notif-item span { font-size: 0.75rem; color: #94a3b8; }
        
        /* Profile Dropdown */
        .profile-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          width: 240px;
          background: white;
          border-radius: 12px;
          box-shadow: none;
          border: 1px solid #e2e8f0;
          padding: 16px;
          z-index: 100;
          cursor: default;
          text-align: left;
        }
        .profile-dropdown-name {
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
          font-size: 0.95rem;
        }
        .profile-dropdown-role {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0 0 16px;
        }
        .profile-dropdown-btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        }
        .profile-dropdown-btn.primary {
          background: #3b82f6;
          color: white;
          border: none;
        }
        .profile-dropdown-btn.primary:hover {
          background: #2563eb;
        }
        .profile-dropdown-btn.secondary {
          background: white;
          color: #3b82f6;
          border: 1px solid #3b82f6;
        }
        .profile-dropdown-btn.secondary:hover {
          background: #eff6ff;
        }
        .profile-dropdown-version {
          text-align: center;
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
        }
        
        .respark-nav-row {
          background: var(--sidebar-bg, #334155); /* Slightly darker and richer than #475569 */
          height: 48px;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .respark-menu-btn {
          background: transparent;
          border: none;
          color: white;
          height: 100%;
          padding: 0 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .respark-menu-btn:hover { background: rgba(255,255,255,0.1); }
        
        .respark-tabs {
          display: flex;
          height: 100%;
          flex-grow: 1;
        }
        .respark-tab {
          color: #f8fafc;
          text-decoration: none;
          display: flex;
          align-items: center;
          padding: 0 24px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          border-right: 1px solid rgba(255,255,255,0.1);
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .respark-tab:hover {
          background: rgba(255,255,255,0.05);
        }
        .respark-tab.active {
          background: #0f172a;
          border-bottom: 3px solid var(--accent, #ef4444);
          color: white;
        }
      `}</style>

      {/* Top White Row */}
      <div className="respark-top-row">
        <div className="respark-logo-area">
          <img src="/skillify-logo.png" alt="Skillify" className="respark-brand-image" />
          <div className="respark-salon-name">{salonName}</div>
        </div>

        <div className="respark-top-right">
          {/* Search Bar */}
          {canGlobalSearch ? (
            <div className="respark-search-wrap">
              <div className="respark-search-bar">
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search guests, appointments, or services..."
                  value={quickSearch}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => setQuickSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                    if (event.key === "Enter") {
                      const term = quickSearch.trim();
                      const first = flatSearchResults[0];
                      if (first?.to) {
                        navigate(first.to);
                        setSearchOpen(false);
                        setQuickSearch("");
                      } else if (term) {
                        navigate(`/admin/customers?q=${encodeURIComponent(term)}`);
                        setSearchOpen(false);
                      }
                    }
                  }}
                />
              </div>
              {searchOpen && quickSearch.trim().length >= 2 ? (
                <div className="respark-search-dropdown" onMouseDown={(event) => event.preventDefault()}>
                  {searchLoading ? <div className="respark-search-empty">Searching workspace...</div> : null}
                  {!searchLoading && !flatSearchResults.length ? <div className="respark-search-empty">No matching guests, appointments, or services.</div> : null}
                  {!searchLoading && ["customers", "appointments", "services"].map((key) => {
                    const rows = searchResults[key] || [];
                    if (!rows.length) return null;
                    const label = key === "customers" ? "Guests" : key === "appointments" ? "Appointments" : "Services";
                    return (
                      <div key={key}>
                        <div className="respark-search-section-title">{label}</div>
                        {rows.map((item) => (
                          <button
                            type="button"
                            key={`${key}-${item.id}`}
                            className="respark-search-result"
                            onClick={() => {
                              navigate(item.to);
                              setSearchOpen(false);
                              setQuickSearch("");
                            }}
                          >
                            <span className="respark-search-result-type">{label.slice(0, -1)}</span>
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.subtitle || "Open record"}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="respark-date">{dateStr}</div>
          
          {/* Notifications */}
          {canNotifications ? <div className="respark-icon-btn respark-notif-wrap" onClick={() => setIsNotifOpen(!isNotifOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 8, right: 8, width: 10, height: 10,
                backgroundColor: "#ef4444", borderRadius: "50%",
                boxShadow: "none"
              }}></span>
            )}
            
            {isNotifOpen && (
              <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
                <div className="notif-header">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead}>Mark all as read</button>
                  )}
                </div>
                <div className="notif-body">
                  {notifications.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      No recent notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className={`notif-item ${!notif.isRead ? "unread" : ""}`} onClick={(e) => handleNotificationClick(e, notif)}>
                        <div style={{ fontSize: "1.2rem" }}>
                          {notif.type === 'APPOINTMENT' ? '📅' : notif.type === 'PAYMENT' ? '💵' : notif.type === 'FEEDBACK' ? '⭐' : '🔔'}
                        </div>
                        <div>
                          <p><strong>{notif.title}</strong> - {notif.message}</p>
                          <span>{new Date(notif.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: "12px", textAlign: "center", background: "#f8fafc", borderTop: "1px solid #e2e8f0", fontSize: "0.85rem", color: "var(--accent, #3b82f6)", cursor: "pointer", fontWeight: 500 }} onClick={() => { setIsNotifOpen(false); navigate("/admin/notifications"); }}>
                  View all alerts
                </div>
              </div>
            )}
          </div> : null}
          
          {/* Settings */}
          {canSettings ? <div className="respark-icon-btn" onClick={() => navigate('/admin/settings')}>
             <Settings size={20} /> 
          </div> : null}
          
          {/* Profile Logo */}
          {canProfile ? <div 
            className="respark-profile-wrap"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ 
              width: 36, height: 36, borderRadius: '50%', background: "var(--button-bg-solid, #3b82f6)", color: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, 
              fontSize: '0.9rem', cursor: 'pointer', marginLeft: 8, position: 'relative'
            }}
          >
            {auth?.user?.name ? auth.user.name.substring(0, 2).toUpperCase() : "AD"}
            
            {isProfileOpen && (
              <div className="profile-dropdown" onClick={e => e.stopPropagation()}>
                <div className="profile-dropdown-name">{auth?.user?.name || "Admin"}</div>
                <div className="profile-dropdown-role">{salonName}</div>
                <button 
                  className="profile-dropdown-btn primary" 
                  onClick={() => { setIsProfileOpen(false); if(onLogout) onLogout(); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Logout
                  </span>
                </button>
                {can('auditLogs') && (
                  <button 
                    className="profile-dropdown-btn secondary" 
                    onClick={() => { setIsProfileOpen(false); navigate("/admin/audit-logs"); }}
                  >
                    Activity Log
                  </button>
                )}
                <div className="profile-dropdown-version">
                  You're on Version 35.0.5
                </div>
              </div>
            )}
          </div> : null}
        </div>
      </div>

      {/* Dark Tabs Row */}
      <div className="respark-nav-row">
        <button className="respark-menu-btn" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>
        <div className="respark-tabs">
          {tabs.map(tab => {
             const isActive = location.pathname.startsWith(tab.path);
             return (
               <Link key={tab.path} to={tab.path} className={`respark-tab ${isActive ? 'active' : ''}`}>
                 {tab.icon} {tab.label}
               </Link>
             )
          })}
        </div>
      </div>
    </div>
  );
}
