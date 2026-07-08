import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function PublicMobileMenu({
  brand = { label: "Skillify", sublabel: "Salon ERP Platform", logo: "/logo-respark.svg", to: "/" },
  items = [],
  cta = null
}) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="public-mobile-menu-trigger">
        <button
          type="button"
          className={`public-menu-toggle ${open ? "active" : ""}`}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label="Toggle website menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`surface-overlay ${open ? "active" : ""}`} onClick={() => setOpen(false)} aria-hidden={!open} />

      <aside className={`surface-drawer public-surface-drawer ${open ? "active" : ""}`} aria-hidden={!open}>
        <div className="surface-drawer-header">
          <Link to={brand.to || "/"} className="brand-mark" onClick={() => setOpen(false)}>
            <img src={brand.logo} alt={brand.label} className="brand-logo" />
            <span className="brand-lockup">
              <strong>{brand.label}</strong>
              <small>{brand.sublabel}</small>
            </span>
          </Link>
          <button type="button" className="surface-close-button" onClick={() => setOpen(false)} aria-label="Close menu">X</button>
        </div>

        <nav className="surface-drawer-nav">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`surface-drawer-link ${location.pathname === item.to ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <strong>{item.label}</strong>
              {item.hint ? <small>{item.hint}</small> : null}
            </Link>
          ))}
        </nav>

        {cta ? (
          <div className="surface-drawer-footer">
            <Link to={cta.to} className="cta-primary" onClick={() => setOpen(false)}>
              {cta.label}
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
