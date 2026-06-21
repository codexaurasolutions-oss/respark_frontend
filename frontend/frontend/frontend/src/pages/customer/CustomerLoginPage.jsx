import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi, setCustomerSession } from "../../api/customerClient";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => ({
    salonSlug: location.state?.salonSlug || searchParams.get("salonSlug") || "",
    emailOrPhone: location.state?.emailOrPhone || "",
    password: ""
  }), [location.state, searchParams]);
  const [form, setForm] = useState(defaults);
  const [status, setStatus] = useState({ error: "", loading: false });

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", loading: true });
    try {
      const response = await customerApi.post("/customer/login", form);
      setCustomerSession(response.data);
      navigate("/customer");
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not login to customer portal"), loading: false });
    }
  };

  return (
    <div className="page-shell">
      <div className="two-col" style={{ alignItems: "stretch" }}>
        <div className="hero-card" style={{ padding: 28 }}>
          <div className="eyebrow-pill" style={{ marginBottom: 14 }}>Customer Portal</div>
          <h1 style={{ marginTop: 0 }}>Access your bookings, orders, invoices, and loyalty history.</h1>
          <p>
            Login once with your salon slug and account details, and your portal stays connected to the right salon
            storefront, booking flow, and order timeline.
          </p>
          <div className="badge-row" style={{ marginTop: 18 }}>
            <span className="badge">Appointments</span>
            <span className="badge">Orders</span>
            <span className="badge">Loyalty</span>
          </div>
        </div>
        <div className="panel-card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="section-heading">
            <h2>Customer Login</h2>
            <span className="badge">Portal Access</span>
          </div>
          {status.loading ? (
            <PageLoader title="Opening your portal" message="We are connecting your customer account to the right salon workspace." />
          ) : (
            <>
          {!form.salonSlug ? (
            <EmptyState title="Salon slug still needed" message="If the salon shared a direct portal link, the slug will prefill automatically. Otherwise enter the storefront slug once and continue." />
          ) : null}
          <p className="muted">Use your salon slug once, then sign in with your email or phone and password.</p>
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span className="muted">Salon slug</span>
              <input placeholder="Salon slug" value={form.salonSlug} onChange={(event) => setForm({ ...form, salonSlug: event.target.value })} />
            </label>
            <label>
              <span className="muted">Email or phone</span>
              <input placeholder="Email or phone" value={form.emailOrPhone} onChange={(event) => setForm({ ...form, emailOrPhone: event.target.value })} />
            </label>
            <label>
              <span className="muted">Password</span>
              <input type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <button disabled={status.loading}>{status.loading ? "Opening..." : "Login"}</button>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          <p className="muted">New customer? <Link to="/customer/register">Create portal account</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
