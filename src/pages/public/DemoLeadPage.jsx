import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import demoIllustration from "../../assets/public-demo-illustration.svg";
import EmptyState from "../../components/EmptyState";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import PageLoader from "../../components/PageLoader";
import PublicMobileMenu from "../../components/PublicMobileMenu";
import { formatApiError } from "../../utils/apiError";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: ""
};

const navItems = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Platform", to: "/platform" },
  { label: "Request Demo", to: "/book-demo" }
];

export default function PublicDemoLeadPage() {
  const [form, setForm] = useState(initialForm);
  const [settings, setSettings] = useState(null);
  const [state, setState] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Request Demo | Skillify";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "Request a live product demo for the salon ERP platform, including owner panel, staff permissions, POS, CRM, and reporting.");
    api.get("/public/settings").then((response) => {
      setSettings(response.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ error: "", success: "" });
    setSubmitting(true);
    try {
      await api.post("/public/demo-leads", form);
      setForm(initialForm);
      setState({ error: "", success: "Your demo request has been received. Our team will contact you shortly." });
    } catch (error) {
      setState({ error: formatApiError(error, "Could not submit your demo request right now."), success: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-site demo-page-shell">
      <div className="public-orb orb-one" />
      <div className="public-orb orb-two" />
      <main className="public-main">
        <div className="demo-topbar">
          <Link to="/" className="brand-mark demo-brand-link">
            <img src="/skillify-logo.png" alt="Skillify" className="brand-logo" />
            <span className="brand-lockup">
              <strong>Skillify</strong>
              <small>Salon ERP Platform</small>
            </span>
          </Link>
          <div className="demo-topbar-menu">
            <PublicMobileMenu
              brand={{ label: "Skillify", sublabel: "Salon ERP Platform", logo: "/skillify-logo.png", to: "/" }}
              items={navItems}
              cta={{ label: "Request Demo", to: "/book-demo" }}
            />
          </div>
        </div>
        <section className="demo-hero">
          <div className="demo-copy">
            <div className="eyebrow-pill">Request Demo</div>
            <h1>Let&apos;s map your salon workflow into the platform.</h1>
            <p>
              Share your salon details and we will guide you through branches, users, roles, services,
              customer management, billing, reports, and support controls in one focused session.
            </p>
            <div className="demo-visual-shell">
              <img src={demoIllustration} alt="3D demo request illustration" className="demo-visual" />
            </div>
            <div className="public-badges">
              <span>Owner/Admin panel</span>
              <span>POS + invoices</span>
              <span>Reports + CRM</span>
              <span>Super Admin controls</span>
            </div>
            <div className="demo-proof-grid">
              <div className="trust-card">
                <small>Best for</small>
                <strong>Growing salon teams</strong>
              </div>
              <div className="trust-card">
                <small>Format</small>
                <strong>Guided live walkthrough</strong>
              </div>
            </div>
          </div>

          <div className="demo-form-card">
            {loading ? (
              <PageLoader
                compact
                title="Loading demo request form"
                message="Preparing public settings and request context for your walkthrough."
              />
            ) : (
            <form onSubmit={submit} className="demo-form">
              <div className="section-chip">Tell us about your salon</div>
              <label>
              <span className="muted">Your full name</span>
              <input
                value={form.name}
                placeholder="Your full name"
                onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
              <label>
              <span className="muted">Work email</span>
              <input
                value={form.email}
                placeholder="Work email"
                onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
              <label>
              <span className="muted">Phone / WhatsApp number</span>
              <IndianPhoneInput
                value={form.phone}
                placeholder="9876543210"
                onChange={(value) => setForm({ ...form, phone: value })} />
            </label>
              <label>
              <span className="muted">Salon / company name</span>
              <input
                value={form.company}
                placeholder="Salon / company name"
                onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </label>
              <textarea
                rows="6"
                value={form.message}
                placeholder="Tell us your branch count, team size, or what you want to see in the demo."
                onChange={(event) => setForm({ ...form, message: event.target.value })}
              />
              <button type="submit" disabled={submitting} className={`demo-submit-button ${submitting ? "is-loading" : ""}`}>
                {submitting ? (
                  <span className="button-progress">
                    <span className="button-spinner" aria-hidden="true" />
                    Sending request...
                  </span>
                ) : (
                  "Submit Demo Request"
                )}
              </button>
              {state.error && <p className="error-text">{state.error}</p>}
              {state.success && (
                <div className="demo-success-card" role="status" aria-live="polite">
                  <div className="demo-success-badge">Request sent</div>
                  <strong>Your demo request is in.</strong>
                  <p>{state.success}</p>
                </div>
              )}
            </form>
            )}
          </div>
        </section>

        <section className="public-section two-panel">
          <div className="feature-panel warm">
            <div className="section-chip">During the demo</div>
            <ul className="public-list">
              <li>How roles and permissions work across the same admin panel</li>
              <li>How POS, invoices, payments, and reports connect together</li>
              <li>How Super Admin controls plans, features, and salon status</li>
            </ul>
          </div>
          <div className="feature-panel cool">
            <div className="section-chip">Need more context first?</div>
            <p>Explore the feature breakdown, pricing plans, and platform page before booking the walkthrough.</p>
            <div className="public-hero-actions">
              <Link to="/features" className="cta-secondary">View Features</Link>
              <Link to="/pricing" className="cta-secondary">View Pricing</Link>
            </div>
          </div>
        </section>

        <section className="public-section demo-summary-card">
          <div className="section-chip">What happens next</div>
          <h3>Your request lands directly in the Super Admin demo approval pipeline.</h3>
          <p>Once approved, the team can provision a 7-day demo workspace, send your secure password-setup link, and guide your first login into the panel.</p>
        </section>

        {settings?.maintenanceMode ? (
          <section className="public-section">
            <div className="feature-panel warm">
              <div className="section-chip">Maintenance Notice</div>
              <p>Platform maintenance mode is active right now. Demo requests still reach the team, but workspace access may be provisioned after maintenance clears.</p>
            </div>
          </section>
        ) : <section className="public-section"><EmptyState title="No maintenance restrictions" message="The platform is currently open for normal demo provisioning and workspace walkthrough scheduling." /></section>}
      </main>
    </div>
  );
}
