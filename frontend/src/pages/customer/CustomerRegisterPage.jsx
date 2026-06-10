import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi } from "../../api/customerClient";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ salonSlug: searchParams.get("salonSlug") || "", name: "", phone: "", email: "", password: "" });
  const [status, setStatus] = useState({ error: "", success: "", loading: false });

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "", loading: true });
    try {
      await customerApi.post("/customer/register", form);
      setStatus({ error: "", success: "Account created. You can now login.", loading: false });
      navigate("/customer/login", { state: { salonSlug: form.salonSlug, emailOrPhone: form.email || form.phone } });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create customer account"), success: "", loading: false });
    }
  };

  return (
    <div className="page-shell">
      <div className="two-col" style={{ alignItems: "stretch" }}>
        <div className="hero-card" style={{ padding: 28 }}>
          <div className="eyebrow-pill" style={{ marginBottom: 14 }}>New Customer Access</div>
          <h1 style={{ marginTop: 0 }}>Create a portal account tied to the right salon.</h1>
          <p>
            Once registered, customers can follow bookings, online orders, invoices, loyalty activity, memberships,
            packages, and notifications from one self-service portal.
          </p>
          <div className="badge-row" style={{ marginTop: 18 }}>
            <span className="badge">Bookings</span>
            <span className="badge">Invoices</span>
            <span className="badge">Notifications</span>
          </div>
        </div>
        <div className="panel-card" style={{ maxWidth: 540, margin: "0 auto" }}>
          <div className="section-heading">
            <h2>Customer Register</h2>
            <span className="badge">Create Account</span>
          </div>
          {status.loading ? (
            <PageLoader title="Creating your portal account" message="We are linking your customer identity to the selected salon." />
          ) : (
            <>
          {!form.salonSlug ? (
            <EmptyState title="Waiting for salon slug" message="The salon slug connects your new account to the right booking, storefront, and invoice history. Ask the business to share it if needed." />
          ) : null}
          <p className="muted">Use the salon slug shared by the business so your account connects to the right storefront and history.</p>
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span className="muted">Salon slug</span>
              <input placeholder="Salon slug" value={form.salonSlug} onChange={(event) => setForm({ ...form, salonSlug: event.target.value })} />
            </label>
            <label>
              <span className="muted">Full name</span>
              <input placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              <span className="muted">Phone</span>
              <input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              <span className="muted">Email</span>
              <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <span className="muted">Password</span>
              <input type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </label>
            <button disabled={status.loading}>{status.loading ? "Creating..." : "Create Account"}</button>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
          <p className="muted">Already registered? <Link to="/customer/login">Login here</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
