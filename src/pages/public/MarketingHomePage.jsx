import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import PublicMobileMenu from "../../components/PublicMobileMenu";
import homeIllustration from "../../assets/public-home-illustration.svg";
import featuresIllustration from "../../assets/public-features-illustration.svg";
import pricingIllustration from "../../assets/public-pricing-illustration.svg";
import platformIllustration from "../../assets/public-platform-illustration.svg";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "Platform", to: "/platform" },
  { label: "Request Demo", to: "/book-demo" }
];

const brandLogo = "/skillify-logo.png";

const featureGroups = [
  {
    title: "SaaS Control",
    points: ["Super Admin controls salons, plans, subscriptions, feature flags, and maintenance mode.", "Multi-tenant isolation keeps salon data separated at API and database level.", "Plan limits govern branches, users, customers, invoices, and feature access."]
  },
  {
    title: "Unified Owner/Admin Panel",
    points: ["One shared panel for owner, receptionist, manager, staff, and accountant users.", "Role-based sidebar and backend permission checks keep every user inside assigned scope.", "Branch-aware operations, custom roles, archived users, and staff-service assignment are built in."]
  },
  {
    title: "Billing + Operations",
    points: ["POS creates invoices with backend-calculated totals, payment updates, receipt HTML, and PDF output.", "Customers carry notes, tags, source, birthdays, anniversaries, and billing history.", "Reports cover sales, payments, branches, staff-service output, customer totals, and CSV export."]
  }
];

const platformSections = [
  {
    eyebrow: "Unified Experience",
    title: "One login surface for every internal team member",
    copy: "Instead of building separate staff panels, the platform keeps owner, front desk, manager, and specialist access inside one clean workspace with role-based visibility."
  },
  {
    eyebrow: "Operational Safety",
    title: "Backend-first enforcement for serious billing flows",
    copy: "Permissions, feature flags, maintenance mode, invoice totals, and payment transitions are all enforced on the backend, not only hidden in the UI."
  },
  {
    eyebrow: "Growth Readiness",
    title: "A strong Phase 1 base for multi-branch salon businesses",
    copy: "The architecture is ready for future modules like appointments, inventory, memberships, and storefront expansion without rewriting the tenancy model."
  }
];

const pageContent = {
  "/": {
    heroEyebrow: "Salon ERP Platform",
    title: "Run your entire salon business from one calm, controlled operating system.",
    subtitle: "Skillify brings Super Admin controls, a unified owner/admin panel, POS billing, team permissions, CRM, support, and reporting into one responsive platform for modern salon businesses.",
    primaryCta: "Request Demo",
    secondaryCta: "See Pricing"
  },
  "/features": {
    heroEyebrow: "Feature Stack",
    title: "Every essential Phase 1 feature, mapped into one connected workflow.",
    subtitle: "From tenant isolation to invoice PDFs, from staff roles to branch-wise reporting, the platform is designed so the front desk, owner, and support team can operate with clarity."
  },
  "/pricing": {
    heroEyebrow: "Plans & Pricing",
    title: "Choose the plan that matches your salon growth stage.",
    subtitle: "Transparent limits, clear feature access, and room for custom plans when a growing salon group needs a more tailored rollout."
  },
  "/platform": {
    heroEyebrow: "Inside The Platform",
    title: "Built specifically for salons that need discipline, visibility, and scale.",
    subtitle: "This is not a generic dashboard. The product structure follows real salon operations: branches, services, users, permissions, POS, payments, support, and SaaS-level controls."
  }
};

const defaultPlans = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    trialDays: 14,
    branchLimit: 1,
    userLimit: 5,
    customerLimit: 500,
    invoiceLimit: 1000,
    storageLimit: 5,
    featureFlags: { pos: true, crm: true, reports: true }
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    trialDays: 14,
    branchLimit: 3,
    userLimit: 20,
    customerLimit: 3000,
    invoiceLimit: 10000,
    storageLimit: 20,
    featureFlags: { pos: true, crm: true, reports: true, whatsapp: true, digitalCatalog: true }
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 17999,
    yearlyPrice: 179990,
    trialDays: 21,
    branchLimit: 10,
    userLimit: 100,
    customerLimit: 20000,
    invoiceLimit: 50000,
    storageLimit: 100,
    featureFlags: { pos: true, crm: true, reports: true, whatsapp: true, digitalCatalog: true, customerPortal: true, loyalty: true }
  }
];

const industries = ["Hair Salons", "Beauty Studios", "Spa Chains", "Nail Bars", "Tattoo Studios", "Beauty Clinics", "Pet Grooming"];

const publicFeatureCards = [
  "Unified owner/admin workspace",
  "Permission-based sidebar",
  "Super Admin salon controls",
  "Plan and subscription limits",
  "Branch and service management",
  "Staff assignment and custom roles",
  "Customer CRM and billing history",
  "POS, invoices, payments, receipts, PDF",
  "Sales, customer, branch, and staff reports",
  "Support tickets with thread trail",
  "Demo lead capture and public website",
  "Maintenance mode and feature flag blocking"
];

const proofStrip = [
  { label: "Billing safe", value: "Backend totals" },
  { label: "Access model", value: "RBAC + feature flags" },
  { label: "Reports", value: "Branch and staff aware" },
  { label: "Deployment shape", value: "Unified multi-tenant SaaS" }
];

function getCurrencyMeta(currencyCode) {
  const code = String(currencyCode || "INR").toUpperCase();
  if (code === "INR") return { code, locale: "en-IN" };
  if (code === "PKR") return { code, locale: "en-PK" };
  if (code === "AED") return { code, locale: "en-AE" };
  if (code === "USD") return { code, locale: "en-US" };
  return { code, locale: "en-IN" };
}

function formatPrice(value, currencyCode) {
  const meta = getCurrencyMeta(currencyCode);
  return new Intl.NumberFormat(meta.locale, { maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function MarketingHomePage() {
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/public/settings"), api.get("/public/plans").catch(() => ({ data: [] }))])
      .then(([settingsResponse, plansResponse]) => {
        if (!active) return;
        setSettings(settingsResponse.data);
        setPlans(Array.isArray(plansResponse.data) && plansResponse.data.length ? plansResponse.data : defaultPlans);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const page = pageContent[location.pathname] || pageContent["/"];
  const pageIllustration = location.pathname === "/features"
    ? featuresIllustration
    : location.pathname === "/pricing"
      ? pricingIllustration
      : location.pathname === "/platform"
        ? platformIllustration
        : homeIllustration;
  const whatsappHref = settings?.whatsappNumber
    ? `https://wa.me/${String(settings.whatsappNumber).replace(/[^\d]/g, "")}`
    : null;
  const pricingCurrency = String(settings?.defaultCurrency || "INR").toUpperCase();

  const selectedPageFeatures = useMemo(() => {
    if (location.pathname === "/features") return publicFeatureCards;
    if (location.pathname === "/pricing") {
      return [
        "Monthly and yearly billing visibility",
        "Branch, user, customer, invoice, and storage limits",
        "Custom plan support for special rollouts",
        "Feature-based growth path instead of vague package names"
      ];
    }
    if (location.pathname === "/platform") {
      return [
        "Clean tenant isolation",
        "Role and feature enforcement",
        "Supportable SaaS architecture",
        "Responsive interface for daily operations"
      ];
    }
    return [
      "Multi-branch control",
      "POS and invoice handling",
      "Customer CRM",
      "Permission-led staff access"
    ];
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${page.title} | ${settings?.systemName || "Skillify"}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", page.subtitle);
  }, [page, settings]);

  return (
    <div className="public-site">
      {isLoading ? (
        <div className="page-shell" style={{ minHeight: "100vh" }}>
          <div className="panel-card">
            <PageLoader title="Loading Skillify website" message="We are preparing plans, public settings, and the latest marketing content." />
          </div>
        </div>
      ) : (
        <>
      <div className="public-orb orb-one" />
      <div className="public-orb orb-two" />
      <header className="public-nav-shell">
        <div className="public-nav">
          <Link to="/" className="brand-mark">
            <img src={brandLogo} alt="Skillify" className="brand-logo" />
            <span className="brand-lockup">
              <strong>{settings?.systemName || "Skillify"}</strong>
              <small>Salon ERP Platform</small>
            </span>
          </Link>
          <nav className="public-nav-links">
            {navLinks.map((item) => (
              <Link key={item.to} to={item.to} className={location.pathname === item.to ? "active" : ""}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="public-nav-cta">
            <Link to="/book-demo" className="nav-demo-link">Request Demo</Link>
          </div>
          <PublicMobileMenu
            brand={{ label: settings?.systemName || "Skillify", sublabel: "Salon ERP Platform", logo: brandLogo, to: "/" }}
            items={navLinks}
            cta={{ label: "Book Demo", to: "/book-demo" }}
          />
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero-copy">
            <div className="eyebrow-pill">{page.heroEyebrow}</div>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
            <div className="public-hero-actions">
              <Link to={location.pathname === "/pricing" ? "/book-demo" : "/book-demo"} className="cta-primary">
                {page.primaryCta || "Request Demo"}
              </Link>
              <Link to={location.pathname === "/pricing" ? "/features" : "/pricing"} className="cta-secondary">
                {page.secondaryCta || "Explore Plans"}
              </Link>
            </div>
            <div className="public-mini-proof">
              <span>Unified panel</span>
              <span>MySQL-backed</span>
              <span>PDF invoices</span>
              <span>Role-based access</span>
            </div>
          </div>
          <div className="public-hero-card">
            <img src={pageIllustration} alt="Premium 3D platform illustration" className="public-hero-image" />
          </div>
        </section>

        <section className="public-trust">
          <div className="trust-card">
            <small>Best fit for</small>
            <strong>Growing salon teams</strong>
          </div>
          <div className="trust-card">
            <small>Support region</small>
            <strong>{[settings?.defaultCity, settings?.defaultCountry].filter(Boolean).join(", ") || "Global"}</strong>
          </div>
          <div className="trust-card">
            <small>Primary contact</small>
            <strong>{settings?.contactEmail || "hello@skillify.local"}</strong>
          </div>
          <div className="trust-card">
            <small>Demo access</small>
            <strong>{settings?.demoBookingUrl ? "Open" : "Request based"}</strong>
          </div>
        </section>

        {settings?.maintenanceMode ? (
          <section className="public-section" style={{ paddingTop: 0 }}>
            <div className="feature-panel warm">
              <div className="section-chip">Maintenance Notice</div>
              <h2>Platform maintenance mode is currently active.</h2>
              <p>Public information is still available, but internal salon workspaces may be temporarily restricted while maintenance is in progress.</p>
            </div>
          </section>
        ) : null}

        <section className="public-proof-ribbon">
          {proofStrip.map((item) => (
            <div key={item.label} className="proof-ribbon-card">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        {location.pathname === "/" && (
          <>
            <section className="public-section two-panel">
              <div className="feature-panel warm">
                <div className="section-chip">Why teams choose it</div>
                <h2>One operational rhythm from front desk to owner reporting.</h2>
                <p>
                  The platform reduces scattered processes by keeping customers, services, staff access, invoices,
                  payments, reports, and support inside one unified operational structure.
                </p>
                <div className="public-badges">
                  {selectedPageFeatures.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
              <div className="feature-panel cool">
                <div className="section-chip">Industries</div>
                <h2>Built around salon-style workflows, not generic retail assumptions.</h2>
                <ul className="public-list">
                  {industries.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </section>

            <section className="public-section">
              <div className="section-heading">
                <div className="section-chip">Core Pillars</div>
                <h2>The four areas that make the platform reliable in daily use.</h2>
              </div>
              <div className="public-card-grid">
                {featureGroups.map((group) => (
                  <article key={group.title} className="public-card tilt-card">
                    <h3>{group.title}</h3>
                    <ul className="public-list">
                      {group.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
            <section className="public-section spotlight-grid">
              <div className="spotlight-card dark-panel">
                <div className="section-chip">Owner Experience</div>
                <h3>From reception tasks to owner-level visibility, all in one rhythm.</h3>
                <p>Front desk billing, service selection, staff mapping, payment updates, and reporting all stay connected so small mistakes do not multiply later.</p>
              </div>
              <div className="spotlight-card light-panel">
                <div className="section-chip">SaaS Visibility</div>
                <h3>Super Admin always stays in control of plan access and platform safety.</h3>
                <p>Salons, subscriptions, feature flags, maintenance mode, and support oversight stay above tenant level where they belong.</p>
              </div>
            </section>
          </>
        )}

        {location.pathname === "/features" && (
          <>
            <section className="public-section">
              <div className="section-heading">
                <div className="section-chip">According to SRS</div>
                <h2>Phase 1 feature coverage across SaaS control, salon operations, and reporting.</h2>
              </div>
              <div className="feature-tile-grid">
                {publicFeatureCards.map((item, index) => (
                  <div key={item} className="feature-tile" style={{ animationDelay: `${index * 60}ms` }}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="public-section two-panel">
              <div className="feature-panel warm">
                <div className="section-chip">Operational Modules</div>
                <p>Branches, categories, services, staff/users, custom roles, customers, POS, invoices, payments, reports, settings, and support all work together in the owner workspace.</p>
                <ul className="public-list">
                  <li>Service-to-staff assignment for clean POS selection</li>
                  <li>Customer CRM notes, tags, dates, source, and billing history</li>
                  <li>Receipt HTML, invoice PDF, and payment tracking</li>
                </ul>
              </div>
              <div className="feature-panel cool">
                <div className="section-chip">SaaS Modules</div>
                <p>Salons, plans, subscriptions, demo leads, support supervision, settings, maintenance mode, and feature flags are controlled from Super Admin.</p>
                <ul className="public-list">
                  <li>Salon activation, suspension, trial, and expiry visibility</li>
                  <li>Plan limits, custom plans, subscription history, and upgrade flow</li>
                  <li>Ticket supervision with internal notes and support event trail</li>
                </ul>
              </div>
            </section>
          </>
        )}

        {location.pathname === "/pricing" && (
          <>
            <section className="public-section">
              <div className="section-heading">
                <div className="section-chip">Transparent Tiers</div>
                <h2>Pricing that shows both limits and real usage capacity.</h2>
              </div>
              {!plans.length ? <EmptyState title="Pricing plans unavailable right now" message="Default pricing cards will appear here once public plan rows are available for this environment." /> : null}
              <div className="pricing-grid">
                {plans.map((plan, index) => (
                  <article key={plan.id} className={`pricing-card ${index === 1 ? "featured-plan" : ""}`}>
                    <div className="plan-topline">
                      <span>{plan.isCustom ? "Custom plan" : "Standard plan"}</span>
                      {index === 1 && <strong>Popular</strong>}
                    </div>
                    <h3>{plan.name}</h3>
                    <div className="plan-price">{pricingCurrency} {formatPrice(plan.monthlyPrice, pricingCurrency)}<small>/month</small></div>
                    <p className="muted">Yearly {pricingCurrency} {formatPrice(plan.yearlyPrice, pricingCurrency)} | Trial {plan.trialDays} days</p>
                    <ul className="public-list compact">
                      <li>{plan.branchLimit} branches</li>
                      <li>{plan.userLimit} users</li>
                      <li>{plan.customerLimit} customers</li>
                      <li>{plan.invoiceLimit} invoices</li>
                      <li>{plan.storageLimit || 0} GB storage</li>
                    </ul>
                    <div className="public-badges">
                      {Object.entries(plan.featureFlags || {}).filter(([, enabled]) => enabled).slice(0, 6).map(([key]) => (
                        <span key={`${plan.id}-${key}`}>{key}</span>
                      ))}
                    </div>
                    <Link to="/book-demo" className="plan-link">Request this plan</Link>
                  </article>
                ))}
              </div>
            </section>
            <section className="public-section two-panel">
              <div className="feature-panel warm">
                <div className="section-chip">Custom Plans</div>
                <h2>Need a different rollout shape?</h2>
                <p>Custom plan handling is supported for special branch counts, feature combinations, or rollout structures that do not fit the standard ladder.</p>
              </div>
              <div className="feature-panel cool">
                <div className="section-chip">Upgrade Path</div>
                <h2>Move up cleanly as the salon grows.</h2>
                <p>Subscriptions track status, payment state, manual discounts, and history so growth decisions stay operationally visible.</p>
              </div>
            </section>
            <section className="public-section pricing-note-card">
              <div>
                <div className="section-chip">Pricing Philosophy</div>
                <h3>No vague promises. Just clear limits, feature access, and upgrade logic.</h3>
              </div>
              <p>That makes the pricing page useful in real sales conversations, not just visually attractive.</p>
            </section>
          </>
        )}

        {location.pathname === "/platform" && (
          <>
            <section className="public-section">
              <div className="section-heading">
                <div className="section-chip">Platform Story</div>
                <h2>A platform shape that matches how salon teams actually work.</h2>
              </div>
              <div className="platform-flow">
                {platformSections.map((section) => (
                  <article key={section.title} className="platform-step">
                    <small>{section.eyebrow}</small>
                    <h3>{section.title}</h3>
                    <p>{section.copy}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="public-section two-panel">
              <div className="feature-panel warm">
                <div className="section-chip">Architecture</div>
                <p>React frontend, Node + Express backend, SQL database, salon-scoped APIs, role checks, feature flags, and backend-calculated billing totals.</p>
              </div>
              <div className="feature-panel cool">
                <div className="section-chip">Supportability</div>
                <p>Support threads, maintenance mode, demo leads, audit visibility, and tenant-aware admin controls make the platform easier to manage after launch too.</p>
              </div>
            </section>
            <section className="public-section architecture-bars">
              <div className="architecture-bar"><span>Frontend</span><strong>React</strong></div>
              <div className="architecture-bar"><span>Backend</span><strong>Node + Express</strong></div>
              <div className="architecture-bar"><span>Database</span><strong>MySQL</strong></div>
              <div className="architecture-bar"><span>Control layer</span><strong>RBAC + tenancy + feature flags</strong></div>
            </section>
          </>
        )}

        <section className="public-section public-cta-band">
          <div>
            <div className="section-chip">Ready for walkthrough</div>
            <h2>See the platform with your own salon use case mapped live.</h2>
            <p>We can walk through branch structure, roles, services, billing flow, reports, and support controls in one demo.</p>
          </div>
          <div className="cta-stack">
            <Link to="/book-demo" className="cta-primary">Request Demo</Link>
            <Link to="/pricing" className="cta-secondary">Review Pricing</Link>
          </div>
        </section>

        <section className="public-section" style={{ paddingTop: 0 }}>
          <div className="feature-panel cool">
            <div className="section-chip">Policy & Contact</div>
            <div className="public-hero-actions">
              <Link to={settings?.termsUrl || "/terms"} className="cta-secondary">Terms</Link>
              <Link to={settings?.privacyUrl || "/privacy"} className="cta-secondary">Privacy</Link>
              <Link to={settings?.demoBookingUrl || "/book-demo"} className="cta-secondary">Book Demo</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="footer-brand">
          <img src={brandLogo} alt="Skillify" className="footer-brand-logo" />
          <div>
            <strong>{settings?.systemName || "Skillify"}</strong>
            <p>{settings?.supportEmail || "support@skillify.local"}</p>
          </div>
        </div>
        <div className="footer-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/platform">Platform</Link>
          <Link to={settings?.termsUrl || "/terms"}>Terms</Link>
          <Link to={settings?.privacyUrl || "/privacy"}>Privacy</Link>
        </div>
      </footer>

      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="whatsapp-fab">
          WhatsApp
        </a>
      )}
        </>
      )}
    </div>
  );
}
