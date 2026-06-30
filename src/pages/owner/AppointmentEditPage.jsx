import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

export default function AppointmentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [context, setContext] = useState({ customers: [], branches: [], services: [], staffUsers: [] });
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const nowStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [appointmentResponse, contextResponse] = await Promise.all([
          api.get(`/owner/appointments/${id}`),
          api.get("/owner/pos/context", { params: selectedBranchId ? { branchId: selectedBranchId } : {} })
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
        <div className="panel-card">
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div className="form-grid">
              <select value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">Select customer</option>
                {context.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select value={form.bookingChannel} onChange={(event) => setForm((current) => ({ ...current, bookingChannel: event.target.value }))}>
                <option value="MANUAL">Manual</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="PHONE">Phone</option>
                <option value="ONLINE_PLACEHOLDER">Online Placeholder</option>
              </select>
              <input value={form.title} placeholder="Appointment title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              <label><span className="muted">Appointment start</span><input type="datetime-local" min={nowStr} value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} /></label>
              <label><span className="muted">Appointment end</span><input type="datetime-local" min={nowStr} value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} /></label>
            </div>

            <div className="form-grid">
              <label className="checkbox-row">
                <input type="checkbox" checked={form.isWalkIn} onChange={(event) => setForm((current) => ({ ...current, isWalkIn: event.target.checked }))} />
                Walk-in booking
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.advancePaymentRequired} onChange={(event) => setForm((current) => ({ ...current, advancePaymentRequired: event.target.checked }))} />
                Advance required
              </label>
              <input type="number" min="0" value={form.advancePaidAmount} placeholder="Advance paid" onChange={(event) => setForm((current) => ({ ...current, advancePaidAmount: event.target.value }))} />
              <input value={form.roomResourceNote} placeholder="Room/resource note" onChange={(event) => setForm((current) => ({ ...current, roomResourceNote: event.target.value }))} />
            </div>

            <textarea value={form.notes} placeholder="Booking notes" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <textarea value={form.customerPreferences} placeholder="Customer preferences" onChange={(event) => setForm((current) => ({ ...current, customerPreferences: event.target.value }))} />

            <div className="list-stack">
              {!form.items.length ? <EmptyState title="No service items attached" message="Add service lines from the appointment detail or recreate the booking structure before editing staff timing here." /> : null}
              {form.items.map((item, index) => (
                <div key={`appointment-edit-${index}`} className="list-item">
                  <div className="form-grid">
                    <select value={item.serviceId} onChange={(event) => updateItem(index, { serviceId: event.target.value })}>
                      <option value="">Select service</option>
                      {context.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                    <label><span className="muted">Service start time</span><input type="datetime-local" min={nowStr} value={item.startAt} onChange={(event) => updateItem(index, { startAt: event.target.value })} /></label>
                    <label><span className="muted">Service end time</span><input type="datetime-local" min={nowStr} value={item.endAt} onChange={(event) => updateItem(index, { endAt: event.target.value })} /></label>
                  </div>
                  <div className="badge-row" style={{ marginTop: 10 }}>
                    {!staffByBranch.length ? <EmptyState title="No active staff in this branch" message="Assign or activate branch staff first so service timing can be mapped cleanly." /> : null}
                    {staffByBranch.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={item.staffUserIds.includes(user.id) ? "" : "secondary-button"}
                        onClick={() => toggleStaff(index, user.id)}
                      >
                        {user.user?.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit">Save Appointment</button>
              <Link to={`/admin/appointments/${id}`} className="cta-secondary">Cancel</Link>
            </div>
            {status.success && <p className="success-text">{status.success}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

