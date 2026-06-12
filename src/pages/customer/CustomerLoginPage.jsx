import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi, setCustomerSession } from "../../api/customerClient";
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
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <style>{`
        .auth-card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 10px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
        .auth-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; margin: 0 auto 24px; }
        .auth-title { font-size: 24px; font-weight: 800; color: #0f172a; text-align: center; margin: 0 0 8px; }
        .auth-sub { font-size: 14px; color: #64748b; text-align: center; margin: 0 0 32px; }
        .auth-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 15px; outline: none; transition: all 0.2s; background: #fff; }
        .auth-input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .auth-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        .auth-btn { width: 100%; padding: 14px; border-radius: 12px; background: #6366f1; color: white; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }
        .auth-btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
      `}</style>
      
      <div className="auth-card">
        {status.loading ? (
          <div style={{ padding: "40px 0" }}>
            <PageLoader compact title="Logging in" message="Securely connecting to your portal..." />
          </div>
        ) : (
          <>
            <div className="auth-logo">P</div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-sub">Sign in to access your bookings & history</p>
            
            <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
              <div>
                <label className="auth-label">Salon ID / Slug</label>
                <input className="auth-input" placeholder="e.g. the-style-lounge" value={form.salonSlug} onChange={(e) => setForm({ ...form, salonSlug: e.target.value })} required />
              </div>
              <div>
                <label className="auth-label">Email or Phone</label>
                <input className="auth-input" placeholder="Enter email or phone number" value={form.emailOrPhone} onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })} required />
              </div>
              <div>
                <label className="auth-label">Password</label>
                <input className="auth-input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              
              {status.error && <div style={{ color: "#e11d48", fontSize: 13, background: "#ffe4e6", padding: "10px 14px", borderRadius: 8, fontWeight: 500 }}>{status.error}</div>}
              
              <button type="submit" className="auth-btn" disabled={status.loading || !form.salonSlug || !form.emailOrPhone || !form.password}>
                Sign In
              </button>
            </form>
            
            <p style={{ textAlign: "center", margin: "24px 0 0", fontSize: 14, color: "#64748b" }}>
              Don't have an account? <Link to={`/customer/register${form.salonSlug ? `?salonSlug=${form.salonSlug}` : ""}`} style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>Create one</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
