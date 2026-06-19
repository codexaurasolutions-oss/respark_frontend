import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

export default function FeedbackPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({ status: "", branchId: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const mode = location.pathname.includes("/reports")
    ? "reports"
    : location.pathname.includes("/settings")
      ? "settings"
      : "feedback";

  const load = useCallback(async () => {
    try {
      const params = {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.branchId ? { branchId: filters.branchId } : {})
      };
      const [listResponse, reportResponse, settingsResponse, branchesResponse] = await Promise.all([
        api.get("/owner/feedback", { params }),
        api.get("/owner/feedback/reports", { params }),
        api.get("/owner/feedback/settings"),
        api.get("/owner/branches")
      ]);
      setRows(listResponse.data || []);
      setReport({ ...(reportResponse.data || {}), settings: settingsResponse.data || {} });
      setBranches(branchesResponse.data || []);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load feedback module"), success: "" });
      setLoading(false);
    }
  }, [filters.branchId, filters.status]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const markReviewed = async (id) => {
    try {
      await api.patch(`/owner/feedback/${id}/status`, { status: "REVIEWED" });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update feedback"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Feedback"
        description="Customer ratings, complaint follow-up and staff/service analytics."
        items={[
          { label: "Feedback", to: "/admin/feedback" },
          { label: "Reports", to: "/admin/feedback/reports" },
          { label: "Settings", to: "/admin/feedback/settings" }
        ]}
        actions={(
          <>
            <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="CONTACTED">Contacted</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            </label>
            <label>
              <span className="muted">Branches</span>
              <select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ status: "", branchId: "" })}>Reset</button>
          </>
        )}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}

      {mode === "feedback" && (
        <div className="panel-card">
          <h3>Feedback Inbox</h3>
          {loading ? <PageLoader compact title="Loading feedback inbox" message="Preparing ratings, branch filters, and customer comments for review." /> : null}
          <div className="list-stack">
            {rows.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.customer?.name || "Customer"} | Rating {row.rating}/5</strong>
                <div className="item-meta">{row.status} | {row.message || "No comment"}</div>
                <div className="inline-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="secondary-button" onClick={() => markReviewed(row.id)}>Mark Reviewed</button>
                </div>
              </div>
            ))}
            {!loading && !rows.length && <EmptyState title="No feedback yet" message="Customer ratings and review responses will appear here once feedback starts coming in." />}
          </div>
        </div>
      )}

      {mode === "reports" && report && (
        <div className="panel-card">
          <h3>Feedback Reports</h3>
          <div className="badge-row">
            <span className="badge">Total {report.summary?.total || 0}</span>
            <span className="badge">Average {Number(report.summary?.averageRating || 0).toFixed(2)}</span>
            <span className="badge">Negative {report.summary?.negativeCount || 0}</span>
          </div>
        </div>
      )}

      {mode === "settings" && report && (
        <div className="panel-card">
          <h3>Feedback Request Settings</h3>
          <p className="muted">Enabled: {report.settings?.enabled ? "Yes" : "No"}</p>
          <p className="muted">Send SMS: {report.settings?.sendSms ? "Yes" : "No"}</p>
          <p className="muted">Send WhatsApp: {report.settings?.sendWhatsapp ? "Yes" : "No"}</p>
          <p className="muted">Delay (hours): {report.settings?.feedbackDelayHours ?? "-"}</p>
          <p className="muted">Low rating alert email: {report.settings?.lowRatingAlertEmail || "-"}</p>
          <p className="muted">Rating prompt: {report.settings?.ratingPrompt || "-"}</p>
          <p className="muted">Thank you message: {report.settings?.thankYouMessage || "-"}</p>
          <p className="muted">WhatsApp: {report.settings?.whatsappNumber || "-"}</p>
          <p className="muted">Booking Notes: {report.settings?.bookingNotes || "-"}</p>
          <p className="muted">Cancellation Policy: {report.settings?.cancellationPolicy || "-"}</p>
        </div>
      )}
    </div>
  );
}
