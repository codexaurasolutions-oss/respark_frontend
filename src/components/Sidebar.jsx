import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Zap,
  Settings,
  DollarSign,
  MessageSquare,
  Wrench,
  LayoutDashboard,
  User,
  Home,
  FolderOpen,
  ChevronDown,
  X,
  LogOut,
  Globe,
  Building2,
  Bell,
  Search,
  Monitor,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  BarChart2,
  Package,
  TrendingUp
} from "lucide-react";
import { useBranch } from "../context/BranchContext";
import { api } from "../api/client";

const GROUP_ICONS = {
  "My Workspace":  <User size={17} />,
  "Operations":    <Zap size={17} />,
  "Setup":         <Settings size={17} />,
  "Expenses":      <DollarSign size={17} />,
  "Enquiries":     <MessageSquare size={17} />,
  "System":        <Wrench size={17} />,
  "Workspace":     <Home size={17} />,
  "Settings":      <Settings size={17} />,
  "Manage":        <FolderOpen size={17} />,
  "Website":       <Globe size={17} />,
};

const DEFAULT_ICON = <LayoutDashboard size={17} />;

const isGroupActive = (group, pathname) =>
  (group.items || []).some(
    (item) =>
      pathname.startsWith(item.to) ||
      (item.children || []).some((child) => pathname.startsWith(child.to))
  );

export default function Sidebar({ groups, auth, onLogout, sidebarExpanded = true, onToggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { branches, selectedBranchId, setSelectedBranchId, isOwner } = useBranch();
  const [notifications, setNotifications] = useState([]);
  const permissions = auth?.membership?.permissions || {};
  const canNotifications = Array.isArray(permissions["notifications"]) && permissions["notifications"].includes("view");
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const flags = auth?.membership?.featureFlags || {};
  const can = (key, action = "view") => Array.isArray(permissions[key]) && permissions[key].includes(action);
  const enabled = (key) => flags[key] !== false;

  useEffect(() => {
    let active = true;
    if (canNotifications) {
      api.get("/owner/notifications", { params: { limit: 5 } }).then((res) => {
        if (active && res.data) setNotifications(res.data);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [canNotifications]);
  const defaultOpen = useMemo(() => {
    const next = {};
    for (const group of groups) {
      next[group.label] = Boolean(group.defaultOpen) || isGroupActive(group, location.pathname);
    }
    return next;
  }, [groups, location.pathname]);

  const [openGroups, setOpenGroups] = useState(defaultOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);
  const closeWorkspace = () => {
    if (mobileOpen) setMobileOpen(false);
    if (sidebarExpanded && onToggleSidebar) onToggleSidebar();
  };

  useEffect(() => {
    setOpenGroups((current) => ({ ...current, ...defaultOpen }));
  }, [defaultOpen]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile Toggle Bar */}
      <div className="sidebar-mobile-toggle-shell">
        <button
          type="button"
          className={`sidebar-mobile-toggle ${mobileOpen ? "active" : ""}`}
          onClick={() => setMobileOpen((c) => !c)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
        <div className="sidebar-mobile-brand">
          {/* <img src="/skillify-logo.png" alt="Skillify" height={26} /> */}
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`surface-overlay ${sidebarExpanded || mobileOpen ? "active" : ""}`}
        onClick={closeWorkspace}
        aria-hidden={!(sidebarExpanded || mobileOpen)}
      />

      {/* Sidebar Panel */}
      <aside className={`app-sidebar ${sidebarExpanded || mobileOpen ? "open" : "closed"}`}>

        {/* Brand Row */}
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-inner">
            <img src="/skillify-logo.png" alt="Skillify" className="sidebar-logo" />
          </div>
          <button
            type="button"
            className="sidebar-close-btn sidebar-mobile-close"
            onClick={closeWorkspace}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="sidebar-nav">
          <div className="sidebar-mobile-only-actions">
            {isOwner && branches.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected Branch</div>
                <select 
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, backgroundColor: "#f8fafc", color: "#334155", fontWeight: 500, outline: "none", cursor: "pointer" }}
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div style={{ display: "flex", gap: 8 }}>

              {canNotifications && (
                <button 
                  type="button" 
                  onClick={() => { closeMobile(); navigate("/admin/notifications"); }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#475569", fontSize: 13, fontWeight: 500, position: "relative", cursor: "pointer" }}
                >
                  <Bell size={15} /> 
                  Alerts
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", fontSize: 10, fontWeight: "bold", padding: "2px 5px", borderRadius: 10 }}>{unreadCount}</span>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="sidebar-mobile-only-actions" style={{ padding: "0 12px 16px 12px", borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Main Apps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "DASHBOARD", path: "/admin/dashboard", moduleKey: "dashboard", icon: <LayoutDashboard size={15} /> },
                { label: "POS", path: "/admin/pos", moduleKey: "pos", featureKey: "pos", icon: <Monitor size={15} /> },
                { label: "POS DASHBOARD", path: "/admin/order-dashboard", moduleKey: "orders", featureKey: "onlineOrders", icon: <Package size={15} /> },
                { label: "APPOINTMENT", path: "/admin/appointments", moduleKey: "appointments", featureKey: "appointments", icon: <CalendarIcon size={15} /> },
                { label: "CRM", path: "/admin/customers", moduleKey: "customers", icon: <UsersIcon size={15} /> },
                { label: "REPORTS", path: "/admin/reports", moduleKey: "reports", featureKey: "reports", icon: <BarChart2 size={15} /> },
                { label: "INVENTORY", path: "/admin/inventory", moduleKey: "inventory", featureKey: "inventory", icon: <Package size={15} /> },
                { label: "TRENDS", path: "/admin/trends", moduleKey: "reports", featureKey: "reports", icon: <TrendingUp size={15} /> }
              ].filter((tab) => can(tab.moduleKey) && (!tab.featureKey || enabled(tab.featureKey))).map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  onClick={closeMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                >
                  <span className="sidebar-group-icon" style={{marginRight: 10}}>{tab.icon}</span>
                  <span style={{fontWeight: 600, fontSize: 13}}>{tab.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {groups.map((group) => {
            const active = isGroupActive(group, location.pathname);
            const expanded = openGroups[group.label] ?? active;
            const icon = GROUP_ICONS[group.label] || DEFAULT_ICON;

            return (
              <div key={group.label} className="sidebar-group">
                <button
                  type="button"
                  className={`sidebar-group-toggle ${active ? "active" : ""}`}
                  onClick={() =>
                    setOpenGroups((c) => {
                      const isCurrentlyOpen = c[group.label];
                      // Close all, then open clicked one (unless it was already open)
                      const next = {};
                      for (const g of groups) next[g.label] = false;
                      if (!isCurrentlyOpen) next[group.label] = true;
                      return next;
                    })
                  }
                >
                  <span className="sidebar-group-label">
                    <span className="sidebar-group-icon">{icon}</span>
                    <span className="sidebar-group-text">
                      <strong>{group.label}</strong>
                      {group.hint && <small>{group.hint}</small>}
                    </span>
                  </span>
                  <span
                    className="sidebar-chevron"
                    style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <ChevronDown size={14} />
                  </span>
                </button>

                {expanded && (
                  <div className="sidebar-group-items">
                    {(group.items || []).map((item) => (
                      <div key={item.to} className="sidebar-item-block">
                        <NavLink
                          to={item.to}
                          end={!item.children?.length}
                          onClick={closeMobile}
                          className={({ isActive }) =>
                            `sidebar-link ${isActive || location.pathname.startsWith(item.to) ? "active" : ""}`
                          }
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="sidebar-link-badge">{item.badge}</span>
                          )}
                        </NavLink>

                        {item.children?.length ? (
                          <div className="sidebar-submenu">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                onClick={closeMobile}
                                className={({ isActive }) =>
                                  `sidebar-sublink ${isActive || location.pathname.startsWith(child.to) ? "active" : ""}`
                                }
                              >
                                <span className="sidebar-sublink-dot" />
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button type="button" onClick={onLogout} className="sidebar-logout-btn">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
