import { NavLink, useLocation } from "react-router-dom";

export default function ModuleTabs({ title, description, items, tabs, actions }) {
  const location = useLocation();

  return (
    <div className="module-tabs-shell">
      <div className="item-head" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>{title}</h2>
          {description ? <p className="muted" style={{ margin: 0 }}>{description}</p> : null}
        </div>
        {actions ? <div className="inline-actions">{actions}</div> : null}
      </div>
      <div className="module-tabs">
        {(items || tabs || []).map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <NavLink key={item.to} to={item.to} className={`module-tab ${active ? "active" : ""}`}>
              <span>{item.label}</span>
              {item.hint ? <small>{item.hint}</small> : null}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
