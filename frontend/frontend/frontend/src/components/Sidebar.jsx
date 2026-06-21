import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const isGroupActive = (group, pathname) =>
  (group.items || []).some((item) => pathname.startsWith(item.to) || (item.children || []).some((child) => pathname.startsWith(child.to)));

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
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="sidebar-mobile-toggle-shell">
        <button
          type="button"
          className={`sidebar-mobile-toggle ${mobileOpen ? "active" : ""}`}
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-label="Toggle workspace navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="sidebar-mobile-brand">
        </div>
      </div>

      <div
        className={`surface-overlay ${sidebarExpanded || mobileOpen ? "active" : ""}`}
        onClick={closeWorkspace}
        aria-hidden={!(sidebarExpanded || mobileOpen)}
      />

      <aside className={`app-sidebar ${sidebarExpanded || mobileOpen ? "open" : "closed"}`}>
        <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '40px' }}>
          <button type="button" className="surface-close-button sidebar-mobile-close" onClick={closeWorkspace} aria-label="Close workspace menu">X</button>
        </div>

        {auth?.user && (
          <div className="sidebar-user-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, margin: '0 12px 20px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#f8fafc', letterSpacing: '0.02em' }}>{auth.user.name}</strong>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {auth.user.systemRole && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', fontSize: '0.75rem' }}>
                  {auth.user.systemRole.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              )}
              {auth.membership?.salonRole && auth.membership.salonRole !== auth.user.systemRole && (
                <span className="badge" style={{ background: 'rgba(14,165,233,0.15)', color: '#7dd3fc', border: '1px solid rgba(14,165,233,0.3)', padding: '4px 8px', fontSize: '0.75rem' }}>
                  {auth.membership.salonRole.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              )}
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {groups.map((group) => {
            const active = isGroupActive(group, location.pathname);
            const expanded = openGroups[group.label] ?? active;
            return (
              <div key={group.label} className={`sidebar-group ${active ? "active" : ""}`}>
                <button
                  type="button"
                  className={`sidebar-group-toggle ${expanded ? "expanded" : ""}`}
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !expanded }))}
                >
                  <span>
                    <strong>{group.label}</strong>
                    {group.hint && <small>{group.hint}</small>}
                  </span>
                  <span className="sidebar-chevron">{expanded ? "-" : "+"}</span>
                </button>

                {expanded && (
                  <div className="sidebar-group-items">
                    {(group.items || []).map((item) => (
                      <div key={item.to} className="sidebar-item-block">
                        <NavLink
                          to={item.to}
                          end={!item.children?.length}
                          onClick={closeMobile}
                          className={({ isActive }) => `sidebar-link ${isActive || location.pathname.startsWith(item.to) ? "active" : ""}`}
                        >
                          <span>{item.label}</span>
                          {item.badge && <span className="sidebar-link-badge">{item.badge}</span>}
                        </NavLink>

                        {item.children?.length ? (
                          <div className="sidebar-submenu">
                            {item.children.map((child) => (
                              <NavLink
                                key={child.to}
                                to={child.to}
                                onClick={closeMobile}
                                className={({ isActive }) => `sidebar-sublink ${isActive || location.pathname.startsWith(child.to) ? "active" : ""}`}
                              >
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

        <button type="button" onClick={onLogout} className="secondary-button sidebar-logout">
          Logout
        </button>
      </aside>
    </>
  );
}

