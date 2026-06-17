import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import PageLoader from "../components/PageLoader";
import { formatApiError } from "../utils/apiError";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const initialToken = searchParams.get("token") || "";
  const fallbackEmail = searchParams.get("email") || "";
  const loginAccessToken = searchParams.get("access") || "";

  const [form, setForm] = useState({ token: initialToken, password: "", confirmPassword: "" });
  const [state, setState] = useState({ loading: Boolean(initialToken), valid: !initialToken, error: "", success: "", email: fallbackEmail, name: "" });

  const isPasswordMismatch = useMemo(
    () => form.confirmPassword && form.password !== form.confirmPassword,
    [form.confirmPassword, form.password]
  );

  useEffect(() => {
    document.title = "Set Password | Skillify";
  }, []);

  useEffect(() => {
    if (!initialToken) return;
    let active = true;
    api.post("/auth/validate-reset-token", { token: initialToken })
      .then((response) => {
        if (!active) return;
        setState({
          loading: false,
          valid: true,
          error: "",
          success: "",
          email: response.data.email || fallbackEmail,
          name: response.data.name || ""
        });
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          valid: false,
          error: formatApiError(error, "This password setup link is invalid or expired.")
        }));
      });
    return () => {
      active = false;
    };
  }, [fallbackEmail, initialToken]);

  const submit = async (event) => {
    event.preventDefault();
    if (isPasswordMismatch) {
      setState((current) => ({ ...current, error: "Passwords do not match.", success: "" }));
      return;
    }

    try {
      const response = await api.post("/auth/reset-password", { token: form.token, password: form.password });
      setState((current) => ({
        ...current,
        error: "",
        success: response.data.message,
        email: response.data.email || current.email
      }));
      setTimeout(() => {
        const params = new URLSearchParams();
        if (response.data.email || state.email) params.set("email", response.data.email || state.email);
        if (loginAccessToken) params.set("access", loginAccessToken);
        nav(`/login?${params.toString()}`);
      }, 1200);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: formatApiError(error, "Could not set your password right now."),
        success: ""
      }));
    }
  };

  return (
    <div className="page-shell">
      <div className="settings-section-grid" style={{ alignItems: "stretch" }}>
        <div className="hero-card" style={{ padding: 28 }}>
          <div className="eyebrow-pill" style={{ marginBottom: 14 }}>Secure Password Setup</div>
          <h1 style={{ marginTop: 0 }}>Activate your account with a fresh password.</h1>
          <p>
            This recovery and invite flow keeps access tied to verified email links while letting owners and team
            members set a password without manual admin intervention.
          </p>
          <div className="badge-row" style={{ marginTop: 18 }}>
            <span className="badge">Invite-safe</span>
            <span className="badge">Email verified</span>
            <span className="badge">Redirects to login</span>
          </div>
        </div>
        <div className="panel-card" style={{ maxWidth: 540 }}>
          <div className="section-heading">
            <h2>Set Your Password</h2>
            <span className="badge">Secure Link</span>
          </div>
          {state.loading && (
            <PageLoader
              compact
              title="Validating your secure invite"
              message="Checking link validity before we unlock the password setup form."
            />
          )}
          {!state.loading && !state.valid && (
            <>
              <EmptyState title="Secure link unavailable" message={state.error || "This password setup link is invalid or expired. Request a fresh one to continue securely."} />
              <div className="inline-actions">
                <Link className="interactive-link" to="/forgot-password">Request a fresh password setup email</Link>
              </div>
            </>
          )}
          {!state.loading && state.valid && (
            <>
              {!state.email ? <EmptyState title="Invite verified without email readback" message="You can still set a password, but the invite did not return a display email for confirmation." /> : null}
              <p className="muted">
                {state.name ? `Hi ${state.name}, ` : ""}
                choose your password to activate this Skillify account.
              </p>
              <div className="summary-box" style={{ marginBottom: 16 }}>
                <strong>Verified email</strong>
                <div className="item-meta">{state.email || "-"}</div>
              </div>
              <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
                <label>
              <span className="muted">Invite token</span>
              <input value={form.token} placeholder="Invite token" onChange={(event) => setForm({ ...form, token: event.target.value })} />
            </label>
                <label>
              <span className="muted">New password</span>
              <input type="password" value={form.password} placeholder="New password" onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <PasswordStrengthMeter password={form.password} style={{ marginTop: 10 }} />
            </label>
                <label>
              <span className="muted">Confirm password</span>
              <input type="password" value={form.confirmPassword} placeholder="Confirm password" onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
            </label>
                <button type="submit" disabled={isPasswordMismatch}>Activate Account</button>
              </form>
              {isPasswordMismatch && <p className="error-text">Passwords do not match.</p>}
              {state.error && <p className="error-text">{state.error}</p>}
              {state.success && <p className="success-text">{state.success}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
