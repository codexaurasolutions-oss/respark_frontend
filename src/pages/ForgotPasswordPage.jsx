import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import EmptyState from "../components/EmptyState";
import PageLoader from "../components/PageLoader";
import { formatApiError } from "../utils/apiError";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(formatApiError(requestError, "Could not process your request right now."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="settings-section-grid" style={{ alignItems: "stretch" }}>
        <div className="hero-card" style={{ padding: 28 }}>
          <div className="eyebrow-pill" style={{ marginBottom: 14 }}>Account Recovery</div>
          <h1 style={{ marginTop: 0 }}>Reset access without support delays.</h1>
          <p>
            Enter your account email and we will prepare a secure password setup link. This helps owners, staff, and
            admin users recover access without exposing salon credentials.
          </p>
          <div className="badge-row" style={{ marginTop: 18 }}>
            <span className="badge">Secure email link</span>
            <span className="badge">No salon ID needed</span>
            <span className="badge">Works for all internal roles</span>
          </div>
        </div>
        <div className="panel-card" style={{ maxWidth: 500 }}>
          <div className="section-heading">
            <h2>Forgot Password</h2>
            <span className="badge">Recovery</span>
          </div>
          {isSubmitting ? (
            <PageLoader title="Preparing recovery" message="We are checking the account and preparing a secure password setup flow." />
          ) : (
            <>
          {!message && !error && !email ? (
            <EmptyState title="Enter your work email" message="We will prepare a password setup link for the account if it exists in the system. This keeps recovery secure and role-aware." />
          ) : null}
          <p className="muted">We will send a password setup email to the account address you enter below.</p>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Account email</span>
              <input value={email} placeholder="Account email" onChange={(event) => setEmail(event.target.value)} />
            </label>
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send Password Setup Email"}</button>
          </form>
          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}
          <div className="inline-actions" style={{ marginTop: 14 }}>
            <Link className="interactive-link" to="/login">Back to login</Link>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
