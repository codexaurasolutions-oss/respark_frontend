import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { Calendar, Clock, MapPin, Ticket, User, Scissors, AlignLeft, Settings, CreditCard, Link as LinkIcon, Activity } from "lucide-react";

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
        <>
          {/* Dashboard Style Hero Card */}
          <div style={{ background: "white", padding: "24px 32px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <div style={{ background: "#eff6ff", color: "#3b82f6", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ticket size={32} />
              </div>
              <div>
                <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", color: "#0f172a", fontWeight: "700" }}>{appointment.customer?.name || appointment.title || "Walk-in Customer"}</h1>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", color: "#64748b", flexWrap: "wrap", fontSize: "14px", fontWeight: "500" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={16} /> {new Date(appointment.startAt).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Clock size={16} /> {new Date(appointment.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(appointment.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><MapPin size={16} /> {appointment.branch?.name || "Main Branch"}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`badge badge-${String(appointment.status).toLowerCase()}`} style={{ fontSize: "14px", padding: "8px 20px", borderRadius: "20px", textTransform: "uppercase", fontWeight: "700", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                {appointment.status}
              </span>
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
                Channel: <span style={{ color: "#475569" }}>{appointment.bookingChannel || "Manual"}</span>
              </div>
            </div>
          </div>

          <div className="settings-section-grid" style={{ gridTemplateColumns: "1fr 380px", alignItems: "start" }}>
            
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", border: "1px solid #f1f5f9" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "18px" }}>
                  <Scissors size={20} color="#3b82f6" /> Requested Services
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {(appointment.items || []).map((item) => (
                    <div key={item.id} style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "linear-gradient(to bottom, #ffffff, #f8fafc)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", position: "relative", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                        <strong style={{ fontSize: "16px", color: "#0f172a", flex: 1 }}>{item.service?.name}</strong>
                        <span style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "600", background: "#eff6ff", padding: "4px 10px", borderRadius: "12px" }}>
                          {new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
                        <User size={14} color="#64748b" />
                        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>Staff:</span>
                        {(item.assignedStaff || []).length > 0 ? (
                          item.assignedStaff.map((assignment) => (
                            <span key={assignment.id} className="badge" style={{ background: "white", color: "#334155", border: "1px solid #cbd5e1", fontWeight: "600" }}>
                              {assignment.userSalon?.user?.name || "Unknown Staff"}
                            </span>
                          ))
                        ) : (
                          <span className="badge" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: "600" }}>Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {!(appointment.items || []).length && (
                    <div className="muted" style={{ fontSize: "14px" }}>No services found for this appointment.</div>
                  )}
                </div>
              </div>

              <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", border: "1px solid #f1f5f9" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "18px" }}>
                  <AlignLeft size={20} color="#3b82f6" /> Booking Notes
                </h3>
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                  <p className="muted" style={{ margin: 0, lineHeight: "1.6", color: "#475569" }}>
                    {appointment.notes || "No special requests or notes were provided for this booking."}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", border: "1px solid #f1f5f9" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "16px" }}>
                  <Settings size={18} color="#64748b" /> Update Booking
                </h3>
                <div className="settings-form-grid" style={{ marginBottom: "20px" }}>
                  <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span className="muted">Status</span>
                    <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                      {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
                    <span className="muted">Add Note (Optional)</span>
                    <input value={statusNote} placeholder="Reason for change..." onChange={(event) => setStatusNote(event.target.value)} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
                  <button type="button" onClick={updateStatus} style={{ width: "100%", padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "8px" }}>Save Status</button>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <Link to={`/admin/appointments/${id}/edit`} className="secondary-button" style={{ flex: 1, textAlign: "center", textDecoration: "none", boxSizing: "border-box", padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "8px" }}>Edit Details</Link>
                    <button type="button" className="danger-button" onClick={cancelAppointment} disabled={appointment.status === "CANCELLED"} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "8px" }}>Cancel</button>
                  </div>
                </div>
              </div>

              <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", border: "1px solid #f1f5f9" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "16px" }}>
                  <CreditCard size={18} color="#64748b" /> Billing & Links
                </h3>
                
                <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                    <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Advance Paid</span>
                    <strong style={{ color: "#0f172a", fontSize: "16px" }}>${Number(appointment.advancePaidAmount || 0).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "500" }}>Approval Status</span>
                    <strong style={{ color: appointment.approvalStatus === "PENDING" ? "#d97706" : "#16a34a", background: appointment.approvalStatus === "PENDING" ? "#fef3c7" : "#dcfce3", padding: "4px 10px", borderRadius: "12px", fontSize: "12px" }}>
                      {appointment.approvalStatus || "Approved"}
                    </strong>
                  </div>
                </div>

                <button type="button" className="secondary-button" onClick={convertToInvoice} disabled={appointment.status !== "COMPLETED"} style={{ width: "100%", marginBottom: "24px", padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "8px", border: "1px solid #3b82f6", color: "#3b82f6" }}>
                  Convert to Invoice
                </button>

                {selfLinks && (
                  <div>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}><LinkIcon size={14} /> Customer Portal</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div>
                        <span style={{ fontSize: "13px", color: "#475569", display: "block", marginBottom: "6px", fontWeight: "500" }}>Reschedule Link</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input readOnly value={selfLinks.rescheduleUrl} style={{ flex: 1, fontSize: "12px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155" }} />
                          <button type="button" className="secondary-button" style={{ padding: "8px 16px", fontSize: "13px", fontWeight: "600", borderRadius: "8px" }} onClick={() => navigator.clipboard.writeText(selfLinks.rescheduleUrl)}>Copy</button>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: "13px", color: "#475569", display: "block", marginBottom: "6px", fontWeight: "500" }}>Cancellation Link</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input readOnly value={selfLinks.cancelUrl} style={{ flex: 1, fontSize: "12px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155" }} />
                          <button type="button" className="secondary-button" style={{ padding: "8px 16px", fontSize: "13px", fontWeight: "600", borderRadius: "8px" }} onClick={() => navigator.clipboard.writeText(selfLinks.cancelUrl)}>Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", border: "1px solid #f1f5f9" }}>
                <h3 style={{ marginTop: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b", fontSize: "16px" }}>
                  <Activity size={18} color="#64748b" /> Activity Log
                </h3>
                <div style={{ position: "relative", paddingLeft: "16px", borderLeft: "2px solid #e2e8f0", marginLeft: "8px" }}>
                  {(appointment.logs || []).map((log, index) => (
                    <div key={log.id} style={{ position: "relative", marginBottom: index === appointment.logs.length - 1 ? 0 : "24px" }}>
                      <div style={{ position: "absolute", left: "-21px", top: "2px", width: "10px", height: "10px", borderRadius: "50%", background: "#3b82f6", border: "3px solid #fff", boxSizing: "content-box" }} />
                      <div style={{ paddingLeft: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px", flexWrap: "wrap", gap: "4px" }}>
                          <strong style={{ fontSize: "14px", color: "#0f172a" }}>{log.action}</strong>
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500", marginTop: "2px" }}>{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f1f5f9", display: "inline-block" }}>
                          {log.details || `${log.fromStatus || "-"} ➔ ${log.toStatus || "-"}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!(appointment.logs || []).length && (
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, paddingLeft: "16px", fontStyle: "italic" }}>No activity recorded yet.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

