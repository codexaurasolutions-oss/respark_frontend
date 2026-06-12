import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function AppointmentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState({ customers: [], branches: [], services: [], staffUsers: [] });
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [appointmentResponse, contextResponse] = await Promise.all([
          api.get(`/owner/appointments/${id}`),
          api.get("/owner/pos/context")
        ]);
        if (!active) return;
        const appointment = appointmentResponse.data;
        setContext({
          customers: contextResponse.data.customers || [],
          branches: contextResponse.data.branches || [],
          services: contextResponse.data.services || [],
          staffUsers: (contextResponse.data.staffUsers || []).filter((row) => row.user?.isActive)
        });
        setForm({
          customerId: appointment.customerId,
          branchId: appointment.branchId,
          bookingChannel: appointment.bookingChannel,
          title: appointment.title || "",
          startAt: appointment.startAt ? new Date(appointment.startAt).toISOString().slice(0, 16) : "",
          endAt: appointment.endAt ? new Date(appointment.endAt).toISOString().slice(0, 16) : "",
          notes: appointment.notes || "",
          customerPreferences: appointment.customerPreferences || "",
          isWalkIn: Boolean(appointment.isWalkIn),
          advancePaymentRequired: Boolean(appointment.advancePaymentRequired),
          advancePaidAmount: appointment.advancePaidAmount || 0,
          roomResourceNote: appointment.roomResourceNote || "",
          items: (appointment.items || []).map((item) => ({
            serviceId: item.serviceId,
            staffUserIds: (item.assignedStaff || []).map((assignment) => assignment.userSalonId),
            startAt: item.startAt ? new Date(item.startAt).toISOString().slice(0, 16) : "",
            endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
            notes: item.notes || ""
          }))
        });
        setStatus({ loading: false, error: "", success: "" });
      } catch (error) {
        if (!active) return;
        setStatus({ loading: false, error: formatApiError(error, "Could not load appointment edit screen"), success: "" });
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const staffByBranch = useMemo(() => {
    if (!form?.branchId) return context.staffUsers;
    return context.staffUsers.filter((item) => !item.branchId || item.branchId === form.branchId);
  }, [context.staffUsers, form?.branchId]);

  const toggleStaff = (index, staffId) => {
    const next = [...form.items];
    const currentIds = next[index].staffUserIds || [];
    next[index] = {
      ...next[index],
      staffUserIds: currentIds.includes(staffId) ? currentIds.filter((item) => item !== staffId) : [...currentIds, staffId]
    };
    setForm((current) => ({ ...current, items: next }));
  };

  const updateItem = (index, patch) => {
    const next = [...form.items];
    next[index] = { ...next[index], ...patch };
    setForm((current) => ({ ...current, items: next }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await api.patch(`/owner/appointments/${id}`, {
        ...form,
        advancePaidAmount: Number(form.advancePaidAmount || 0)
      });
      setStatus((current) => ({ ...current, success: "Appointment updated successfully." }));
      navigate(`/admin/appointments/${id}`);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not update appointment") }));
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Edit Appointment"
        description="Adjust timing, staff assignment, and booking notes without losing appointment history."
        items={[
          { label: "Appointments", to: "/admin/appointments", hint: "Queue" },
          { label: "Detail", to: `/admin/appointments/${id}`, hint: "Inspect" },
          { label: "Edit", to: `/admin/appointments/${id}/edit`, hint: "Modify" }
        ]}
        actions={<Link to={`/admin/appointments/${id}`} className="module-tab">View Detail</Link>}
      />

      {status.loading && (
        <PageLoader
          title="Loading appointment edit form"
          message="Preparing the booking timeline, services, branch context, and staff assignment controls."
        />
      )}
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {!status.loading && !form ? (
        <div className="panel-card">
          <EmptyState title="Appointment not available for editing" message="The appointment could not be loaded into edit mode. Return to the appointment detail view and try again." />
        </div>
      ) : null}

      {form && (
        <div className="panel-card premium-panel" style={{ padding: 0, overflow: "hidden" }}>
          <form onSubmit={submit}>
            
            <div className="form-section-wizard">
              <div className="wizard-head">
                <div className="step-circle">1</div>
                <h4>Client & Core Details</h4>
              </div>
              <div className="wizard-body">
                <div className="form-grid">
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Customer</span>
                    <select value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))} placeholder="Walk-in / Select Customer">
                      <option value="">Walk-in / Select Customer</option>
                      {context.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Branch</span>
                    <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))} placeholder="Select Branch">
                      <option value="">Select Branch</option>
                      {context.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Booking Channel</span>
                    <select value={form.bookingChannel} onChange={(event) => setForm((current) => ({ ...current, bookingChannel: event.target.value }))}>
                      <option value="MANUAL">Manual</option>
                      <option value="WALK_IN">Walk-in</option>
                      <option value="PHONE">Phone</option>
                      <option value="ONLINE_PLACEHOLDER">Online Booking</option>
                    </select>
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Appointment Title</span>
                    <input className="premium-input" value={form.title} placeholder="e.g. Haircut & Wash" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section-wizard">
              <div className="wizard-head">
                <div className="step-circle">2</div>
                <h4>Schedule & Settings</h4>
              </div>
              <div className="wizard-body">
                <div className="form-grid" style={{ marginBottom: 20 }}>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Overall Start Time</span>
                    <input className="premium-input" type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} />
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Overall End Time</span>
                    <input className="premium-input" type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} />
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Advance Paid ($)</span>
                    <input className="premium-input" type="number" min="0" value={form.advancePaidAmount} placeholder="e.g. 50" onChange={(event) => setForm((current) => ({ ...current, advancePaidAmount: event.target.value }))} />
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Room / Resource Note</span>
                    <input className="premium-input" value={form.roomResourceNote} placeholder="e.g. VIP Room 1" onChange={(event) => setForm((current) => ({ ...current, roomResourceNote: event.target.value }))} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 24, padding: "16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <label className="checkbox-row" style={{ margin: 0 }}>
                    <input type="checkbox" checked={form.isWalkIn} onChange={(event) => setForm((current) => ({ ...current, isWalkIn: event.target.checked }))} style={{ width: 18, height: 18 }} />
                    <span style={{ fontWeight: 500 }}>Is Walk-in Booking?</span>
                  </label>
                  <label className="checkbox-row" style={{ margin: 0 }}>
                    <input type="checkbox" checked={form.advancePaymentRequired} onChange={(event) => setForm((current) => ({ ...current, advancePaymentRequired: event.target.checked }))} style={{ width: 18, height: 18 }} />
                    <span style={{ fontWeight: 500 }}>Advance Payment Required?</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section-wizard">
              <div className="wizard-head">
                <div className="step-circle">3</div>
                <h4>Services & Staff Assignment</h4>
              </div>
              <div className="wizard-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {!form.items.length ? <EmptyState title="No service items attached" message="Add service lines from the appointment detail or recreate the booking structure before editing staff timing here." /> : null}
                  {form.items.map((item, index) => (
                    <div key={`appointment-edit-${index}`} className="portal-list-item" style={{ flexDirection: "column", alignItems: "stretch", background: "#f8fafc", padding: 20, border: "1px solid #e2e8f0", borderRadius: 16 }}>
                      <strong style={{ color: "var(--accent)", fontSize: "1rem", marginBottom: 12, display: "block" }}>Service Item {index + 1}</strong>
                      <div className="form-grid">
                        <label>
                          <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Service</span>
                          <select value={item.serviceId} onChange={(event) => updateItem(index, { serviceId: event.target.value })} placeholder="Select Service">
                            <option value="">Select service</option>
                            {context.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Start Time</span>
                          <input className="premium-input" type="datetime-local" value={item.startAt} onChange={(event) => updateItem(index, { startAt: event.target.value })} />
                        </label>
                        <label>
                          <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>End Time</span>
                          <input className="premium-input" type="datetime-local" value={item.endAt} onChange={(event) => updateItem(index, { endAt: event.target.value })} />
                        </label>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Assign Staff</span>
                        <div className="badge-row">
                          {!staffByBranch.length ? <EmptyState title="No active staff in this branch" message="Assign or activate branch staff first." /> : null}
                          {staffByBranch.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className={item.staffUserIds.includes(user.id) ? "mark-read" : "secondary-button"}
                              style={{ 
                                padding: "6px 16px", 
                                borderRadius: 20,
                                ...(item.staffUserIds.includes(user.id) ? { background: "var(--accent)", color: "white", border: "1px solid var(--accent)" } : { background: "white", border: "1px solid #cbd5e1" })
                              }}
                              onClick={() => toggleStaff(index, user.id)}
                            >
                              {user.user?.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section-wizard" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
              <div className="wizard-head">
                <div className="step-circle">4</div>
                <h4>Notes & Confirmation</h4>
              </div>
              <div className="wizard-body">
                <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Booking Notes</span>
                    <textarea className="premium-input" style={{ minHeight: 80 }} value={form.notes} placeholder="Internal booking notes..." onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                  </label>
                  <label>
                    <span className="muted" style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>Customer Preferences</span>
                    <textarea className="premium-input" style={{ minHeight: 80 }} value={form.customerPreferences} placeholder="Customer preferences or requests..." onChange={(event) => setForm((current) => ({ ...current, customerPreferences: event.target.value }))} />
                  </label>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="submit" className="btn-primary-wizard">
                    Save Appointment Details
                  </button>
                  <Link to={`/admin/appointments/${id}`} className="cta-secondary" style={{ padding: "10px 20px" }}>Cancel</Link>
                </div>
                
                {status.success && <div className="alert-item green-alert" style={{ padding: 12, borderRadius: 8, marginTop: 16 }}>{status.success}</div>}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

