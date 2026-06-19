import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi } from "../../api/customerClient";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
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
      setStatus({ error: "", success: "Account created successfully! Redirecting...", loading: false });
      setTimeout(() => {
        navigate("/customer/login", { state: { salonSlug: form.salonSlug, emailOrPhone: form.email || form.phone } });
      }, 1500);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create customer account"), success: "", loading: false });
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
      <style>{`
        .auth-card { background: white; border-radius: 24px; padding: 40px; width: 100%; max-width: 440px; box-shadow: none; border: 1px solid #e2e8f0; }
        .auth-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; margin: 0 auto 24px; }
        .auth-title { font-size: 24px; font-weight: 800; color: #0f172a; text-align: center; margin: 0 0 8px; }
        .auth-sub { font-size: 14px; color: #64748b; text-align: center; margin: 0 0 32px; }
        .auth-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 15px; outline: none; transition: all 0.2s; background: #fff; }
        .auth-input:focus { border-color: #10b981; box-shadow: none; }
        .auth-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        .auth-btn { width: 100%; padding: 14px; border-radius: 12px; background: #10b981; color: white; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s; box-shadow: none; }
        .auth-btn:hover { background: #059669; transform: translateY(-1px); box-shadow: none; }
        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
      `}</style>
      
      <div className="auth-card">
        {status.loading ? (
          <div style={{ padding: "40px 0" }}>
            <PageLoader compact title="Creating account" message="Setting up your personal portal..." />
          </div>
        ) : (
          <>
            <div className="auth-logo">P</div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-sub">Track your appointments, orders & loyalty</p>
            
            <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
              <div>
                <label className="auth-label">Salon ID / Slug</label>
                <input className="auth-input" placeholder="e.g. the-style-lounge" value={form.salonSlug} onChange={(e) => setForm({ ...form, salonSlug: e.target.value })} required />
              </div>
              <div>
                <label className="auth-label">Full Name</label>
                <input className="auth-input" placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="auth-label">Phone</label>
                  <IndianPhoneInput
                    value={form.phone}
                    onChange={(value) => setForm({ ...form, phone: value })}
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="auth-label">Email (Optional)</label>
                  <input className="auth-input" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="auth-label">Password</label>
                <input className="auth-input" type="password" placeholder="Create a password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                <PasswordStrengthMeter password={form.password} style={{ marginTop: 10 }} />
              </div>
              
              {status.error && <div style={{ color: "#e11d48", fontSize: 13, background: "#ffe4e6", padding: "10px 14px", borderRadius: 8, fontWeight: 500 }}>{status.error}</div>}
              {status.success && <div style={{ color: "#059669", fontSize: 13, background: "#dcfce7", padding: "10px 14px", borderRadius: 8, fontWeight: 500 }}>{status.success}</div>}
              
              <button type="submit" className="auth-btn" disabled={status.loading || !form.salonSlug || !form.name || !form.phone || !form.password}>
                Create Account
              </button>
            </form>
            
            <p style={{ textAlign: "center", margin: "24px 0 0", fontSize: 14, color: "#64748b" }}>
              Already registered? <Link to={`/customer/login${form.salonSlug ? `?salonSlug=${form.salonSlug}` : ""}`} style={{ color: "#10b981", fontWeight: 600, textDecoration: "none" }}>Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
