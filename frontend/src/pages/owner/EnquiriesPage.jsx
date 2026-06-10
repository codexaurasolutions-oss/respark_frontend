import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  source: "WEBSITE",
  notes: ""
};

export default function EnquiriesPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const mode = location.pathname.includes("/follow-ups")
    ? "followUps"
    : location.pathname.includes("/reports")
      ? "reports"
      : "enquiries";

  const load = useCallback(async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [listResponse, reportResponse] = await Promise.all([
        api.get("/owner/enquiries", { params }),
        api.get("/owner/enquiries/reports")
      ]);
      setRows(listResponse.data || []);
      setReport(reportResponse.data || null);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load enquiries module"), success: "" });
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/enquiries", form);
      setForm(emptyForm);
      setStatus({ error: "", success: "Enquiry saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save enquiry"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Enquiries"
        description="Lead capture, follow-up and enquiry-to-customer/appointment conversion."
        items={[
          { label: "Enquiries", to: "/admin/enquiries" },
          { label: "Follow-Ups", to: "/admin/enquiries/follow-ups" },
          { label: "Reports", to: "/admin/enquiries/reports" }
        ]}
        actions={(
          <>
            <label>
              <span className="muted">Statuses</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setStatusFilter("")}>Reset</button>
          </>
        )}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      {mode === "enquiries" && (
        <div className="panel-card">
          <h3>Create Enquiry</h3>
          {loading ? <PageLoader compact title="Loading enquiry workspace" message="Preparing lead inbox, follow-up data, and enquiry reporting." /> : null}
          <form className="form-grid" onSubmit={save}>
            <label>
              <span className="muted">Name</span>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span className="muted">Phone</span>
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              <span className="muted">Email</span>
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              <span className="muted">Select Option</span>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {["WEBSITE", "WHATSAPP", "PHONE", "WALK_IN", "INSTAGRAM", "FACEBOOK", "ADS", "REFERRAL"].map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            </label>
            <label>
              <span className="muted">Notes</span>
              <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
            <button>Save Enquiry</button>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {rows.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.name}</strong>
                <div className="item-meta">{row.source} | {row.status} | {row.phone}</div>
              </div>
            ))}
            {!loading && !rows.length && <EmptyState title="No enquiries yet" message="Fresh website, WhatsApp, call, and walk-in leads will appear here once captured." />}
          </div>
        </div>
      )}

      {mode === "reports" && report && (
        <div className="panel-card">
          <h3>Lead Reports</h3>
          <div className="badge-row">
            <span className="badge">Total {report.total || 0}</span>
            <span className="badge">Converted {report.converted || 0}</span>
          </div>
        </div>
      )}

      {mode === "followUps" && (
        <div className="panel-card">
          <h3>Upcoming Follow-Ups</h3>
          <div className="list-stack">
            {rows.filter((row) => row.followUpAt).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.name}</strong>
                <div className="item-meta">{new Date(row.followUpAt).toLocaleString()}</div>
              </div>
            ))}
            {!loading && !rows.filter((row) => row.followUpAt).length && <EmptyState title="No follow-ups scheduled" message="Scheduled lead callbacks and reminders will appear here once follow-up dates are assigned." />}
          </div>
        </div>
      )}
    </div>
  );
}
