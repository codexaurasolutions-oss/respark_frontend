import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyItem = { serviceId: "", staffUserIds: [], startAt: "", endAt: "", notes: "" };

export default function AppointmentsPage() {
  const location = useLocation();
  const [mode, setMode] = useState("day");
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    branchId: "",
    status: "",
    bookingChannel: "",
    customerId: "",
    from: "",
    to: ""
  });
  const [form, setForm] = useState({
    customerId: "",
    branchId: "",
    bookingChannel: "MANUAL",
    title: "",
    startAt: "",
    endAt: "",
    notes: "",
    customerPreferences: "",
    isWalkIn: false,
    items: [emptyItem]
  });

  const loadRows = useCallback(async (nextFilters) => {
    setLoading(true);
    const params = {
      ...(nextFilters.branchId ? { branchId: nextFilters.branchId } : {}),
      ...(nextFilters.status ? { status: nextFilters.status } : {}),
      ...(nextFilters.bookingChannel ? { bookingChannel: nextFilters.bookingChannel } : {}),
      ...(nextFilters.customerId ? { customerId: nextFilters.customerId } : {}),
      ...(nextFilters.from ? { from: nextFilters.from } : {}),
      ...(nextFilters.to ? { to: nextFilters.to } : {})
    };
    const response = await api.get("/owner/appointments", { params });
    setRows(response.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const contextResponse = await api.get("/owner/pos/context");
      if (!active) return;
      setCustomers(contextResponse.data.customers || []);
      setBranches(contextResponse.data.branches || []);
      setServices(contextResponse.data.services || []);
      setStaffUsers((contextResponse.data.staffUsers || []).filter((row) => row.user?.isActive));
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = {
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.bookingChannel ? { bookingChannel: filters.bookingChannel } : {}),
          ...(filters.customerId ? { customerId: filters.customerId } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {})
        };
        const response = await api.get("/owner/appointments", { params });
        if (!active) return;
        setRows(response.data);
        setLoading(false);
      } catch {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filters]);

  const filteredRows = useMemo(() => {
    const now = new Date();
    return rows.filter((row) => {
      const date = new Date(row.startAt);
      if (mode === "day") return date.toDateString() === now.toDateString();
      if (mode === "week") return date >= now && date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (mode === "month") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return true;
    });
  }, [mode, rows]);

  const activePanel = useMemo(() => {
    if (location.pathname.includes("/calendar")) return "calendar";
    if (location.pathname.includes("/create")) return "create";
    return "overview";
  }, [location.pathname]);

  const toggleStaff = (index, staffId) => {
    const nextItems = [...form.items];
    const current = nextItems[index].staffUserIds || [];
    nextItems[index] = {
      ...nextItems[index],
      staffUserIds: current.includes(staffId) ? current.filter((id) => id !== staffId) : [...current, staffId]
    };
    setForm((current) => ({ ...current, items: nextItems }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      await api.post("/owner/appointments", form);
      setStatus({ error: "", success: "Appointment created." });
      setForm({
        customerId: "",
        branchId: "",
        bookingChannel: "MANUAL",
        title: "",
        startAt: "",
        endAt: "",
        notes: "",
        customerPreferences: "",
        isWalkIn: false,
        items: [emptyItem]
      });
      await loadRows(filters);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create appointment"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Appointments"
        description="Unified booking calendar for walk-in, phone, and manual appointments."
        items={[
          { label: "Overview", to: "/admin/appointments", hint: "Queue" },
          { label: "Calendar", to: "/admin/appointments/calendar", hint: "Views" },
          { label: "Create Booking", to: "/admin/appointments/create", hint: "New" }
        ]}
        actions={(
          <>
            <label>
              <span className="muted">Day View</span>
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
              <option value="calendar">Calendar Stream</option>
            </select>
            </label>
            {["day", "week", "month", "calendar"].map((item) => (
              <button key={item} type="button" className={mode === item ? "" : "secondary-button"} onClick={() => setMode(item)}>
                {item}
              </button>
            ))}
            <label>
              <span className="muted">Branches</span>
              <select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            </label>
            <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            </label>
            <label>
              <span className="muted">Channels</span>
              <select value={filters.bookingChannel} onChange={(event) => setFilters((current) => ({ ...current, bookingChannel: event.target.value }))}>
              <option value="">All channels</option>
              <option value="MANUAL">Manual</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="PHONE">Phone</option>
              <option value="ONLINE_PLACEHOLDER">Online Placeholder</option>
            </select>
            </label>
            <label><span className="muted">Filter From</span><input type="datetime-local" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label>
            <label><span className="muted">Filter To</span><input type="datetime-local" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ branchId: "", status: "", bookingChannel: "", customerId: "", from: "", to: "" })}>
              Reset Filters
            </button>
          </>
        )}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Appointments</h1>
            <p style={{ marginBottom: 0 }}>Run the full booking queue across branches, channels, staff assignment, and calendar views.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Customers {customers.length}</span>
            <span className="badge">Branches {branches.length}</span>
            <span className="badge">Visible {filteredRows.length}</span>
          </div>
        </div>
      </div>
      {loading && <PageLoader title="Loading appointments workspace" message="Preparing booking queue, services, staff assignments, and calendar filters." />}

      <div className="two-col">
        <div className="panel-card">
          <h3>Create Appointment</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div className="form-grid">
              <label>
              <span className="muted">Customer</span>
              <select value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">Select customer</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">Branch</span>
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
                <option value="">Select branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">Manual</span>
              <select value={form.bookingChannel} onChange={(event) => setForm((current) => ({ ...current, bookingChannel: event.target.value }))}>
                <option value="MANUAL">Manual</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="PHONE">Phone</option>
                <option value="ONLINE_PLACEHOLDER">Online Approval Placeholder</option>
              </select>
            </label>
              <label>
              <span className="muted">Appointment title</span>
              <input value={form.title} placeholder="Appointment title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
              <label>
                <span className="muted">Appointment start</span>
                <input type="datetime-local" value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} />
              </label>
              <label>
                <span className="muted">Appointment end</span>
                <input type="datetime-local" value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} />
              </label>
            </div>
            <textarea value={form.notes} placeholder="Booking notes" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <textarea value={form.customerPreferences} placeholder="Customer preferences" onChange={(event) => setForm((current) => ({ ...current, customerPreferences: event.target.value }))} />

            {form.items.map((item, index) => (
              <div key={`appointment-item-${index}`} className="list-item">
                <div className="form-grid">
                  <label>
              <span className="muted">Service</span>
              <select value={item.serviceId} onChange={(event) => {
                    const next = [...form.items];
                    next[index] = { ...next[index], serviceId: event.target.value };
                    setForm((current) => ({ ...current, items: next }));
                  }}>
                    <option value="">Select service</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>
            </label>
                  <label>
                    <span className="muted">Service start time</span>
                    <input type="datetime-local" value={item.startAt} onChange={(event) => {
                      const next = [...form.items];
                      next[index] = { ...next[index], startAt: event.target.value };
                      setForm((current) => ({ ...current, items: next }));
                    }} />
                  </label>
                  <label>
                    <span className="muted">Service end time</span>
                    <input type="datetime-local" value={item.endAt} onChange={(event) => {
                      const next = [...form.items];
                      next[index] = { ...next[index], endAt: event.target.value };
                      setForm((current) => ({ ...current, items: next }));
                    }} />
                  </label>
                </div>
                <div className="badge-row" style={{ marginTop: 10 }}>
                  {staffUsers.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      className={item.staffUserIds.includes(user.id) ? "" : "secondary-button"}
                      onClick={() => toggleStaff(index, user.id)}
                    >
                      {user.user.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyItem] }))}>
              Add Service Row
            </button>
            <button>Create Appointment</button>
            {status.error && <p className="error-text">{status.error}</p>}
            {status.success && <p className="success-text">{status.success}</p>}
          </form>
        </div>

        <div className="panel-card">
          <div className="item-head">
            <h3 style={{ margin: 0 }}>
              {activePanel === "create" ? "Booking Queue" : `${mode[0].toUpperCase() + mode.slice(1)} View`}
            </h3>
            <label>
              <span className="muted">Customers</span>
              <select value={filters.customerId} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))}>
              <option value="">All customers</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            </label>
          </div>
          <div className="list-stack">
            {!loading && filteredRows.map((row) => (
              <div key={row.id} className="list-item">
                <div className="item-head">
                  <strong>{row.customer?.name}</strong>
                  <span className={`badge badge-${String(row.status).toLowerCase()}`}>{row.status}</span>
                </div>
                <div className="item-meta">{row.branch?.name} | {new Date(row.startAt).toLocaleString()} - {new Date(row.endAt).toLocaleString()}</div>
                <div className="badge-row">
                  {row.items?.map((item) => <span key={item.id} className="badge">{item.service?.name}</span>)}
                </div>
                <div className="inline-actions" style={{ marginTop: 10 }}>
                  <Link to={`/admin/appointments/${row.id}`} className="cta-secondary">Open Detail</Link>
                  <Link to={`/admin/appointments/${row.id}/edit`} className="cta-secondary">Edit</Link>
                </div>
              </div>
            ))}
            {!loading && !filteredRows.length && <EmptyState title="No appointments for this view" message="Try adjusting the time window, branch, status, or booking channel filters." />}
          </div>
        </div>
      </div>
    </div>
  );
}

