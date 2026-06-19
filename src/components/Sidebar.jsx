import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";

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
          <img src="/skillify-logo.png" alt="Skillify" height={26} />
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
