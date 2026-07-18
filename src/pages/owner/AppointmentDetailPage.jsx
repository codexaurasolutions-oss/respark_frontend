import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const statusOptions = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"];

function formatMoney(val) {
  const n = Number(val || 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [selfLinks, setSelfLinks] = useState(null);
  const [statusValue, setStatusValue] = useState("CONFIRMED");
  const [statusNote, setStatusNote] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });

  const [showBillPreview, setShowBillPreview] = useState(false);
  const [consumableOverrides, setConsumableOverrides] = useState({});
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [appointmentResponse, linksResponse] = await Promise.all([
        api.get(`/owner/appointments/${id}`),
        api.get(`/owner/appointments/${id}/self-links`)
      ]);
      setAppointment(appointmentResponse.data);
      setSelfLinks(linksResponse.data);
      setStatusValue(appointmentResponse.data.status);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not reload appointment") }));
    }
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

  const openBillPreview = () => {
    const overrides = {};
    (appointment?.items || []).forEach((item) => {
      (item.service?.consumables || []).forEach((cons) => {
        overrides[`${item.serviceId}:${cons.productId}`] = Number(cons.reqdQty || 0);
      });
    });
    setConsumableOverrides(overrides);
    setShowBillPreview(true);
  };

  const updateOverride = useCallback((key, value) => {
    setConsumableOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const convertToInvoice = async () => {
    setStatus((current) => ({ ...current, error: "", success: "" }));
    setCreating(true);
    try {
      const hasOverrides = Object.values(consumableOverrides).some((v) => v != null);
      const payload = hasOverrides ? { consumableOverrides } : {};
      const response = await api.post(`/owner/appointments/${id}/convert-to-invoice`, payload);
      setShowBillPreview(false);
      setStatus((current) => ({ ...current, success: `Invoice ${response.data.invoiceNumber} created from appointment.` }));
      navigate(`/admin/invoices`);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not convert appointment to invoice") }));
    } finally {
      setCreating(false);
    }
  };

  const billServices = appointment?.items || [];
  const totalServices = billServices.length;
  const totalConsumables = billServices.reduce((sum, item) => sum + (item.service?.consumables?.length || 0), 0);

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
                  {(item.service?.consumables || []).length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {item.service.consumables.map((cons) => (
                        <span key={cons.id} style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4 }}>
                          {cons.product?.name || "Product"}: {Number(cons.reqdQty)} {cons.product?.unit || "pcs"}
                        </span>
                      ))}
                    </div>
                  )}
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
              <button type="button" className="secondary-button" onClick={openBillPreview} disabled={appointment.status !== "COMPLETED"}>
                Generate Bill
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

      {showBillPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} onClick={() => !creating && setShowBillPreview(false)} />
          <div style={{ position: "relative", width: 520, maxWidth: "95vw", background: "#fff", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Bill Preview</h2>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{appointment.customer?.name || "Customer"} &middot; {totalServices} service{totalServices !== 1 ? "s" : ""} &middot; {totalConsumables} consumable{totalConsumables !== 1 ? "s" : ""}</div>
              </div>
              <button onClick={() => !creating && setShowBillPreview(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748b", padding: 4 }}>&times;</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {billServices.map((item) => {
                const svc = item.service;
                const price = Number(svc?.price || 0);
                const taxRate = Number(svc?.taxRate || 0);
                const lineTotal = price + (price * taxRate) / 100;
                const staffNames = (item.assignedStaff || []).map((a) => a.userSalon?.user?.name).filter(Boolean).join(", ");
                const consumables = svc?.consumables || [];

                return (
                  <div key={item.id} style={{ marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{svc?.name || "Service"}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{staffNames || "No staff"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{formatMoney(price)}</div>
                        {taxRate > 0 && <div style={{ fontSize: 10, color: "#94a3b8" }}>+{taxRate}% tax</div>}
                      </div>
                    </div>

                    {consumables.length > 0 ? (
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Consumables Used</div>
                        {consumables.map((cons) => {
                          const key = `${item.serviceId}:${cons.productId}`;
                          const unit = cons.product?.unit || "pcs";
                          const defaultQty = Number(cons.reqdQty || 0);
                          const currentQty = consumableOverrides[key] ?? defaultQty;
                          const changed = currentQty !== defaultQty;

                          return (
                            <div key={cons.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 10px", background: changed ? "#fefce8" : "#f8fafc", borderRadius: 8, border: changed ? "1px solid #fbbf24" : "1px solid #e2e8f0" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cons.product?.name || "Product"}</div>
                                <div style={{ fontSize: 10, color: "#94a3b8" }}>Default: {defaultQty} {unit}</div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={currentQty}
                                  onChange={(e) => updateOverride(key, Number(e.target.value) || 0)}
                                  style={{ width: 72, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, textAlign: "center", fontWeight: 600, background: "#fff" }}
                                />
                                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{unit}</span>
                              </div>
                              {changed && (
                                <button
                                  onClick={() => updateOverride(key, defaultQty)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: 2, lineHeight: 1 }}
                                  title="Reset to default"
                                >
                                  &#8634;
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>No consumables configured for this service</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: "#475569" }}>
                <span>Services: {totalServices}</span>
                <span>Consumable overrides: {Object.keys(consumableOverrides).filter((k) => {
                  const [svcId, prodId] = k.split(":");
                  const svc = billServices.find((i) => i.serviceId === svcId);
                  const cons = svc?.service?.consumables?.find((c) => c.productId === prodId);
                  return cons && consumableOverrides[k] !== Number(cons.reqdQty || 0);
                }).length}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowBillPreview(false)}
                  disabled={creating}
                  style={{ flex: 1, padding: "12px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={convertToInvoice}
                  disabled={creating}
                  style={{ flex: 2, padding: "12px 24px", background: creating ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", fontSize: 14 }}
                >
                  {creating ? "Creating Invoice..." : "Confirm & Create Invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
