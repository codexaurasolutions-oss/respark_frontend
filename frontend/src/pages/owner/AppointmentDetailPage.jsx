import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const statusOptions = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [selfLinks, setSelfLinks] = useState(null);
  const [statusValue, setStatusValue] = useState("CONFIRMED");
  const [statusNote, setStatusNote] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });

  const load = async () => {
    const [appointmentResponse, linksResponse] = await Promise.all([
      api.get(`/owner/appointments/${id}`),
      api.get(`/owner/appointments/${id}/self-links`)
    ]);
    setAppointment(appointmentResponse.data);
    setSelfLinks(linksResponse.data);
    setStatusValue(appointmentResponse.data.status);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/owner/appointments/${id}`),
      api.get(`/owner/appointments/${id}/self-links`)
    ]).then(([response, linksResponse]) => {
      if (!active) return;
      setAppointment(response.data);
      setSelfLinks(linksResponse.data);
      setStatusValue(response.data.status);
      setStatus({ loading: false, error: "", success: "" });
    }).catch((error) => {
      if (!active) return;
      setStatus({ loading: false, error: formatApiError(error, "Could not load appointment"), success: "" });
    });
    return () => {
      active = false;
    };
  }, [id]);

  const updateStatus = async () => {
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await api.patch(`/owner/appointments/${id}/status`, { status: statusValue, note: statusNote || undefined });
      await load();
      setStatus((current) => ({ ...current, success: "Appointment status updated." }));
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not update appointment status") }));
    }
  };

  const cancelAppointment = async () => {
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await api.post(`/owner/appointments/${id}/cancel`, { note: statusNote || "Cancelled from detail view" });
      await load();
      setStatus((current) => ({ ...current, success: "Appointment cancelled." }));
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not cancel appointment") }));
    }
  };

  const convertToInvoice = async () => {
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      const response = await api.post(`/owner/appointments/${id}/convert-to-invoice`);
      setStatus((current) => ({ ...current, success: `Invoice ${response.data.invoiceNumber} created from appointment.` }));
      navigate(`/admin/invoices`);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not convert appointment to invoice") }));
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Appointment Detail"
        description="Inspect booking scope, assigned staff, booking history, customer self-service links, and billing conversion."
        items={[
          { label: "Appointments", to: "/admin/appointments", hint: "Back" },
          { label: "Detail", to: `/admin/appointments/${id}`, hint: "Inspect" },
          { label: "Edit", to: `/admin/appointments/${id}/edit`, hint: "Modify" }
        ]}
        actions={<Link to="/admin/appointments" className="module-tab">Back to Queue</Link>}
      />

      {status.loading && (
        <PageLoader
          title="Loading appointment detail"
          message="Preparing booking activity, assigned staff, self-service links, and billing controls."
        />
      )}
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}

      {appointment && (
        <div className="two-col">
          <div className="panel-card">
            <div className="item-head">
              <div>
                <h3 style={{ marginTop: 0 }}>{appointment.title || appointment.customer?.name || "Appointment"}</h3>
                <div className="item-meta">{appointment.branch?.name || "Main branch"} | {appointment.bookingChannel}</div>
                <div className="item-meta">{new Date(appointment.startAt).toLocaleString()} - {new Date(appointment.endAt).toLocaleString()}</div>
              </div>
              <span className={`badge badge-${String(appointment.status).toLowerCase()}`}>{appointment.status}</span>
            </div>
            <p className="muted">{appointment.notes || "No notes added."}</p>
            <div className="badge-row">
              {(appointment.items || []).map((item) => (
                <span key={item.id} className="badge">{item.service?.name}</span>
              ))}
            </div>
            <div className="list-stack" style={{ marginTop: 14 }}>
              {(appointment.items || []).map((item) => (
                <div key={item.id} className="list-item">
                  <strong>{item.service?.name}</strong>
                  <div className="item-meta">{new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}</div>
                  <div className="badge-row">
                    {(item.assignedStaff || []).map((assignment) => (
                      <span key={assignment.id} className="badge">{assignment.userSalon?.user?.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <h3 style={{ marginTop: 0 }}>Actions</h3>
            <div className="form-grid">
              <label>
              <span className="muted">Select Option</span>
              <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">Status note</span>
              <input value={statusNote} placeholder="Status note" onChange={(event) => setStatusNote(event.target.value)} />
            </label>
            </div>
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button type="button" onClick={updateStatus}>Update Status</button>
              <Link to={`/admin/appointments/${id}/edit`} className="cta-secondary">Edit Booking</Link>
            </div>

            <div className="summary-box" style={{ marginTop: 16 }}>
              <strong>Booking Controls</strong>
              <div className="item-meta">Advance payment required: {appointment.advancePaymentRequired ? "Yes" : "No"}</div>
              <div className="item-meta">Advance paid: {Number(appointment.advancePaidAmount || 0).toFixed(2)}</div>
              <div className="item-meta">Approval: {appointment.approvalStatus || "Approved"}</div>
              {selfLinks && (
                <>
                  <div className="item-meta">Customer cancellation link: {selfLinks.cancelUrl}</div>
                  <div className="item-meta">Customer reschedule link: {selfLinks.rescheduleUrl}</div>
                </>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button type="button" className="secondary-button" onClick={convertToInvoice} disabled={appointment.status !== "COMPLETED"}>
                Convert to Invoice
              </button>
              <button type="button" className="danger-button" onClick={cancelAppointment} disabled={appointment.status === "CANCELLED"}>
                Cancel Appointment
              </button>
            </div>

            <div className="list-stack" style={{ marginTop: 16 }}>
              {(appointment.logs || []).map((log) => (
                <div key={log.id} className="list-item">
                  <div className="item-head">
                    <strong>{log.action}</strong>
                    <span className="badge">{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="item-meta">{log.details || `${log.fromStatus || "-"} -> ${log.toStatus || "-"}`}</div>
                </div>
              ))}
              {!(appointment.logs || []).length && (
                <EmptyState
                  title="No appointment history yet"
                  message="Status changes and operational notes will appear here as the booking progresses."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

