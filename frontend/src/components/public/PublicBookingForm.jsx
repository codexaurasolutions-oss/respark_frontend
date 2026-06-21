import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import IndianPhoneInput from "../IndianPhoneInput";

const addMinutes = (value, minutes) => {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function PublicBookingForm({ slug, data, onSuccess, onTrack, initialServiceId = "" }) {
  const branches = useMemo(() => data?.salon?.branches || [], [data]);
  const services = useMemo(() => data?.services || [], [data]);
  const staff = useMemo(() => data?.staff || [], [data]);
  const defaultBranchId = branches[0]?.id || "";
  const defaultServiceId = initialServiceId && services.some((item) => item.id === initialServiceId) ? initialServiceId : (services[0]?.id || "");
  const initialService = services.find((item) => item.id === defaultServiceId);
  const initialStaffMembershipId = staff.find((member) => !defaultBranchId || !member.branchId || member.branchId === defaultBranchId)?.id || "";

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    branchId: defaultBranchId,
    serviceId: defaultServiceId,
    staffMembershipId: initialStaffMembershipId,
    startAt: "",
    notes: "",
    customerPreferences: ""
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const selectedService = useMemo(
    () => services.find((item) => item.id === form.serviceId) || initialService || null,
    [services, form.serviceId, initialService]
  );

  const eligibleStaff = useMemo(
    () =>
      staff.filter((member) => {
        if (form.branchId && member.branchId && member.branchId !== form.branchId) return false;
        const assigned = member.serviceAssignments || [];
        if (!assigned.length) return true;
        return assigned.some((row) => row.serviceId === form.serviceId);
      }),
    [staff, form.branchId, form.serviceId]
  );

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      const endAt = addMinutes(form.startAt, selectedService?.durationMin || 0);
      const response = await api.post(`/public/salons/${slug}/book`, {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        branchId: form.branchId,
        primaryStaffUserId: form.staffMembershipId || undefined,
        startAt: form.startAt,
        endAt,
        notes: form.notes || undefined,
        customerPreferences: form.customerPreferences || undefined,
        items: [
          {
            serviceId: form.serviceId,
            staffUserIds: [form.staffMembershipId],
            startAt: form.startAt,
            endAt,
            notes: form.notes || undefined
          }
        ]
      });
      setStatus({ loading: false, error: "", success: "Booking created successfully." });
      onTrack?.("BOOKING_CLICK", { branchId: form.branchId, serviceId: form.serviceId });
      onSuccess?.(response.data);
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not create booking"), success: "" });
    }
  };

  return (
    <div className="panel-card">
      <h3>Book Appointment</h3>
      <p className="muted">Choose branch, service, staff, and time. Booking follows the same salon rules as the admin calendar.</p>
      {status.error && <p className="error-text">{status.error}</p>}
      {status.success && <p className="success-text">{status.success}</p>}
      <form className="form-grid" onSubmit={submit}>
        <input placeholder="Your name" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
        <IndianPhoneInput value={form.customerPhone} onChange={(phone) => setForm((current) => ({ ...current, customerPhone: phone }))} />
        <input placeholder="Email" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
        <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value, staffMembershipId: "" }))}>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <select value={form.serviceId} onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value, staffMembershipId: "" }))}>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>
        <select value={form.staffMembershipId} onChange={(event) => setForm((current) => ({ ...current, staffMembershipId: event.target.value }))}>
          <option value="">Select staff</option>
          {eligibleStaff.map((member) => <option key={member.id} value={member.id}>{member.user?.name || member.name || "Staff"}{member.branch?.name ? ` - ${member.branch.name}` : ""}</option>)}
        </select>
        <input type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} />
        <input value={selectedService?.durationMin || ""} readOnly placeholder="Duration" />
        <textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        <textarea placeholder="Preferences" value={form.customerPreferences} onChange={(event) => setForm((current) => ({ ...current, customerPreferences: event.target.value }))} />
        <button disabled={status.loading || !form.staffMembershipId || !form.startAt || !form.branchId || !form.serviceId}>
          {status.loading ? "Creating..." : "Create Booking"}
        </button>
      </form>
    </div>
  );
}
