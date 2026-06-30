import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLoader from "../components/PageLoader";
import { formatApiError } from "../utils/apiError";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const access = searchParams.get("access") || "";
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    password: ""
  });
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setErr("");
    setIsSubmitting(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        loginAccessToken: access || undefined
      };
      const result = await login(payload);
      const role = result.membership?.salonRole;
      if (role && role !== "SALON_OWNER") {
        nav("/admin/my-dashboard");
      } else {
        nav("/admin/pos");
      }
    } catch (error) {
      setErr(formatApiError(error, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px rgba(0,0,0,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.2rem', color: 'var(--accent)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Respark ERP</h1>
          <h2 style={{ fontSize: '2.2rem', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>Welcome back</h2>
          <p className="muted" style={{ marginTop: '8px' }}>Sign in to your salon workspace</p>
        </div>

        {isSubmitting ? (
          <PageLoader title="Authenticating" message="Verifying your credentials and preparing your dashboard..." />
        ) : (
          <>
            {access ? (
              <div className="auth-inline-note auth-inline-success" style={{ marginBottom: '20px' }}>Secure login verified for this email invite.</div>
            ) : null}

            {!access && searchParams.get("email") ? (
              <div className="auth-inline-note" style={{ marginBottom: '20px' }}>
                Your email was prefilled from a secure link. Enter your password to continue.
              </div>
            ) : null}

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Email Address</span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Password</span>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%' }}
                />
              </label>

              {err && <div className="error-text" style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem' }}>{err}</div>}

              <button type="submit" disabled={isSubmitting} style={{ background: 'var(--accent)', color: 'white', padding: '14px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: '8px', width: '100%' }}>
                {isSubmitting ? "Signing in..." : "Access Workspace"}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link className="interactive-link" to="/forgot-password" style={{ fontSize: '0.95rem' }}>Forgot your password?</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
