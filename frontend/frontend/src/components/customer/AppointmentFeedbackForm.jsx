import { useState } from "react";
import { customerApi } from "../../api/customerClient";
import { formatApiError } from "../../utils/apiError";

export default function AppointmentFeedbackForm({ appointmentId, onSubmitted }) {
  const [form, setForm] = useState({ rating: 5, message: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      await customerApi.post("/customer/feedback", {
        appointmentId,
        rating: Number(form.rating),
        message: form.message || undefined
      });
      setStatus({ loading: false, error: "", success: "Feedback submitted." });
      setForm({ rating: 5, message: "" });
      onSubmitted?.();
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not submit feedback"), success: "" });
    }
  };

  return (
    <div className="summary-box" style={{ marginTop: 16 }}>
      <strong>Submit Feedback</strong>
      {status.error && <p className="error-text">{status.error}</p>}
      {status.success && <p className="success-text">{status.success}</p>}
      <form className="form-grid" onSubmit={submit} style={{ marginTop: 12 }}>
        <select value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} Star{rating > 1 ? "s" : ""}</option>)}
        </select>
        <textarea rows="4" placeholder="Share your experience" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
        <button disabled={status.loading}>{status.loading ? "Submitting..." : "Submit Feedback"}</button>
      </form>
    </div>
  );
}
