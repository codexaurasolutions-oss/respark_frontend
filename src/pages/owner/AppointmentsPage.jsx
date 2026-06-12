import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X, ArrowLeft } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

const TIME_SLOTS = [];
for (let h = 9; h <= 21; h++) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const hourText = String(hour12).padStart(2, "0");
  TIME_SLOTS.push(`${hourText}:00 ${ampm}`);
  TIME_SLOTS.push(`${hourText}:30 ${ampm}`);
}

const emptyItem = { serviceId: "", staffUserIds: [], startAt: "", endAt: "", notes: "" };

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceGenderFilter, setServiceGenderFilter] = useState("FEMALE");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });
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
    items: [emptyItem],
    smsToGuest: true,
    smsToOwner: false
  });

  const loadContext = async () => {
    try {
      const contextResponse = await api.get("/owner/pos/context");
      setCustomers(contextResponse.data.customers || []);
      setServices(contextResponse.data.services || []);
      const staff = contextResponse.data.staffUsers || [];
      console.log('Fetched staffUsers:', staff);
      setStaffUsers(staff);
      setBranches(contextResponse.data.branches || []);
      setForm((current) => ({
        ...current,
        branchId: current.branchId || contextResponse.data.branches?.[0]?.id || ""
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      const response = await api.get("/owner/appointments", {
        params: {
          from: startOfDay.toISOString(),
          to: endOfDay.toISOString()
        }
      });
      setRows(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [currentDate]);

  const handleDayChange = (offset) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + offset);
    setCurrentDate(nextDate);
  };

  const setToday = () => setCurrentDate(new Date());

  const handleCellClick = (staffId, timeSlot) => {
    const [time, modifier] = timeSlot.split(" ");
    let [hours, minutes] = time.split(":");
    hours = Number.parseInt(hours, 10);
    if (hours === 12 && modifier === "AM") hours = 0;
    if (hours < 12 && modifier === "PM") hours += 12;

    const startDate = new Date(currentDate);
    startDate.setHours(hours, Number.parseInt(minutes, 10), 0, 0);
    const endDate = new Date(startDate.getTime() + 30 * 60000);

    const startAtStr = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const endAtStr = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const staffBranchId = staffUsers.find((staff) => staff.id === staffId)?.branchId || "";

    setForm({
      customerId: "",
      branchId: staffBranchId || branches[0]?.id || "",
      bookingChannel: "MANUAL",
      title: "Appointment",
      startAt: startAtStr,
      endAt: endAtStr,
      notes: "",
      customerPreferences: "",
      isWalkIn: false,
      items: [{ serviceId: "", staffUserIds: staffId ? [staffId] : [], startAt: startAtStr, endAt: endAtStr, notes: "" }],
      smsToGuest: true,
      smsToOwner: false
    });
    setServiceSearch("");
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    document.body.style.overflow = isCreateModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    const activeItems = form.items.filter((item) => item.serviceId && item.staffUserIds?.length && item.startAt && item.endAt);
    if (!form.customerId) {
      setStatus({ error: "Guest select karna zaroori hai.", success: "" });
      return;
    }
    if (!form.branchId) {
      setStatus({ error: "Branch select karna zaroori hai.", success: "" });
      return;
    }
    if (!activeItems.length) {
      setStatus({ error: "Kam az kam aik valid service item add karo.", success: "" });
      return;
    }

    try {
      await api.post("/owner/appointments", { ...form, items: activeItems });
      setStatus({ error: "", success: "Appointment created." });
      setIsCreateModalOpen(false);
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create appointment"), success: "" });
    }
  };

  const confirmedCount = rows.filter((row) => row.status === "CONFIRMED" || row.status === "PENDING").length;
  const completedCount = rows.filter((row) => row.status === "COMPLETED").length;
  const cancelledCount = rows.filter((row) => row.status === "CANCELLED").length;
  const totalCount = rows.length;

  const formatDate = (date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

  const getAppointmentForSlot = (staffId, slotTime) => {
    const [time, modifier] = slotTime.split(" ");
    let [hours, minutes] = time.split(":");
    hours = Number.parseInt(hours, 10);
    if (hours === 12 && modifier === "AM") hours = 0;
    if (hours < 12 && modifier === "PM") hours += 12;

    const slotDate = new Date(currentDate);
    slotDate.setHours(hours, Number.parseInt(minutes, 10), 0, 0);

    return rows.find((row) => {
      const apptStart = new Date(row.startAt);
      const apptEnd = new Date(row.endAt);
      const hasStaff = row.items?.some((item) => (item.assignedStaff || []).some((assigned) => assigned.userSalonId === staffId)) || row.primaryStaffUserId === staffId;
      return hasStaff && slotDate >= apptStart && slotDate < apptEnd;
    });
  };

  const handleUpdateItem = (index, field, value) => {
    const nextItems = [...form.items];
    const nextItem = { ...nextItems[index], [field]: value };
    if (field === "serviceId") {
      nextItem.staffUserIds = [];
    }
    nextItems[index] = nextItem;
    setForm((current) => ({ ...current, items: nextItems }));
  };

  const filteredServices = useMemo(() => {
    let list = services;
    if (form.branchId) {
      list = list.filter((service) => !service.branchId || service.branchId === form.branchId);
    }
    if (serviceGenderFilter !== "ALL") {
      list = list.filter((service) => !service.gender || service.gender === "UNISEX" || service.gender === serviceGenderFilter);
    }
    if (serviceSearch.trim()) {
      const query = serviceSearch.trim().toLowerCase();
      list = list.filter((service) => service.name.toLowerCase().includes(query) || (service.description || "").toLowerCase().includes(query));
    }
    return list;
  }, [form.branchId, serviceGenderFilter, serviceSearch, services]);

  const serviceSelectionList = useMemo(() => {
    const map = new Map();
    filteredServices.forEach((service) => map.set(service.id, service));
    form.items.forEach((item) => {
      if (item.serviceId && !map.has(item.serviceId)) {
        const selectedService = services.find((service) => service.id === item.serviceId);
        if (selectedService) map.set(selectedService.id, selectedService);
      }
    });
    return Array.from(map.values());
  }, [filteredServices, form.items, services]);

  const serviceGroups = useMemo(() => {
    const map = new Map();
    serviceSelectionList.forEach((service) => {
      const title = service.category?.name || "Uncategorized";
      if (!map.has(title)) map.set(title, []);
      map.get(title).push(service);
    });
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [serviceSelectionList]);

  const filteredStaffUsers = useMemo(() => {
    // Show ALL staff in the calendar grid (branch filter only applies to booking form fields)
    // Staff with branchId=null are global/owner-level and always visible
    return staffUsers;
  }, [staffUsers]);

  const totalServiceCount = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const service = services.find((row) => row.id === item.serviceId);
      return sum + Number(service?.price || 0);
    }, 0);
  }, [form.items, services]);

  return (
    <div className="calendar-page">
      <style>{`
        .calendar-page {
          background: #f8fafc;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .date-navigator {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          color: #0f172a;
        }
        .nav-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #3b82f6;
          font-weight: 600;
          transition: all 0.2s;
        }
        .nav-btn:hover { background: #eff6ff; }
        .nav-icon {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          color: #475569;
          display: flex;
        }
        .nav-icon:hover { background: #f8fafc; }
        .counters-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .counter-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.85rem;
          font-weight: 500;
          color: #475569;
        }
        .counter-badge.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .counter-val {
          background: white;
          color: #0f172a;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 700;
        }
        .calendar-grid-wrapper {
          flex-grow: 1;
          overflow: auto;
          background: white;
          position: relative;
        }
        .calendar-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          min-width: 1200px;
        }
        .calendar-th {
          position: sticky;
          top: 0;
          background: #f1f5f9;
          padding: 12px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          color: #475569;
          border: 1px solid #e2e8f0;
          z-index: 10;
        }
        .time-col-header {
          width: 80px;
          background: #f8fafc;
          z-index: 11;
          left: 0;
        }
        .calendar-time-cell {
          position: sticky;
          left: 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px;
          text-align: center;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          z-index: 5;
        }
        .calendar-cell {
          border: 1px solid #f1f5f9;
          height: 50px;
          position: relative;
          cursor: pointer;
        }
        .calendar-cell:hover { background: #f8fafc; }
        .appt-block {
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.75rem;
          color: #1e3a8a;
          overflow: hidden;
          z-index: 2;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .slide-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.3);
          z-index: 1000;
        }
        .slide-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 450px;
          background: #f8fafc;
          z-index: 1050;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
          transform: translateX(100%);
          animation: slideIn 0.3s forwards;
        }
        @keyframes slideIn { to { transform: translateX(0); } }
        .sp-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .sp-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #ef4444;
          font-weight: 600;
        }
        .sp-close {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          padding: 6px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sp-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sp-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .sp-card-title {
          font-size: 1rem;
          color: #64748b;
          margin-top: 0;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sp-input-group {
          position: relative;
          margin-bottom: 16px;
        }
        .sp-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          box-sizing: border-box;
          background: white;
        }
        .sp-input:focus { border-color: #3b82f6; outline: none; }
        .sp-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          appearance: none;
          background: white;
          box-sizing: border-box;
        }
        .sp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .sp-footer {
          padding: 16px 24px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sp-footer-checks {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0f172a;
          flex-wrap: wrap;
        }
        .sp-btn-primary {
          width: 100%;
          padding: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1.05rem;
          font-weight: 600;
          cursor: pointer;
        }
        .sp-btn-primary:hover { background: #2563eb; }
        .add-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0;
        }
        .gender-chip {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: lowercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .gender-chip[data-active="true"] {
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
          color: #fff;
          border-color: #2563eb;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
        }
        .gender-chip:hover {
          transform: translateY(-1px);
        }
      `}</style>

      <div className="calendar-toolbar">
        <div className="date-navigator">
          <button className="nav-icon" type="button" onClick={() => handleDayChange(-1)}><ChevronLeft size={18} /></button>
          <button className="nav-btn" type="button" onClick={setToday}>TODAY</button>
          <span style={{ fontSize: "1.1rem" }}>{formatDate(currentDate)}</span>
          <button className="nav-btn" type="button" onClick={() => handleDayChange(1)}>TOMORROW</button>
          <button className="nav-icon" type="button" onClick={() => handleDayChange(1)}><ChevronRight size={18} /></button>
        </div>
        <div className="counters-row">
          <div className="counter-badge active">Confirmed <span className="counter-val">{confirmedCount}</span></div>
          <div className="counter-badge">Online <span className="counter-val" style={{ background: "#f1f5f9" }}>0</span></div>
          <div className="counter-badge">Completed <span className="counter-val" style={{ background: "#f1f5f9" }}>{completedCount}</span></div>
          <div className="counter-badge">Cancelled <span className="counter-val" style={{ background: "#f1f5f9" }}>{cancelledCount}</span></div>
          <div className="counter-badge">Total <span className="counter-val" style={{ background: "#f1f5f9" }}>{totalCount}</span></div>
        </div>
      </div>

      <div className="calendar-grid-wrapper">
        {loading && <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}><PageLoader title="Loading schedule..." /></div>}
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="calendar-th time-col-header"><Search size={18} /></th>
              {filteredStaffUsers.map((staff) => (
                <th key={staff.id} className="calendar-th" style={{ background: "#e2e8f0", color: "#0f172a" }}>{staff.user?.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot}>
                <td className="calendar-time-cell">{slot}</td>
                {filteredStaffUsers.map((staff) => {
                  const appt = getAppointmentForSlot(staff.id, slot);
                  return (
                    <td key={`${slot}-${staff.id}`} className="calendar-cell" onClick={() => !appt && handleCellClick(staff.id, slot)}>
                      {appt && (
                        <div className="appt-block" onClick={(event) => { event.stopPropagation(); navigate(`/admin/appointments/${appt.id}`); }}>
                          <div style={{ fontWeight: 600 }}>{appt.customer?.name || "Walk-in"}</div>
                          <div>{appt.items?.[0]?.service?.name || "Service"}</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="slide-panel" onClick={(event) => event.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" type="button" onClick={() => setIsCreateModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>Create Appointment</h3>
            </div>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
              <div className="sp-body">
                {status.error && <div style={{ color: "#ef4444", padding: 12, background: "#fef2f2", borderRadius: 8 }}>{status.error}</div>}
                {status.success && <div style={{ color: "#10b981", padding: 12, background: "#ecfdf5", borderRadius: 8 }}>{status.success}</div>}

                <div className="sp-card">
                  <h4 className="sp-card-title">1. Guest Details <button className="add-link" type="button" onClick={() => navigate("/admin/customers")}>Add Guest +</button></h4>
                  <div className="sp-input-group">
                    <select className="sp-input" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required>
                      <option value="">Select Branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                  <div className="sp-input-group">
                    <select className="sp-input" value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} required>
                      <option value="">Search By Name Or No.</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.phone})</option>)}
                    </select>
                  </div>
                </div>

                <div className="sp-card">
                  <h4 className="sp-card-title">2. Service Details</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                    <button
                      type="button"
                      className="gender-chip"
                      data-active={serviceGenderFilter === "FEMALE"}
                      onClick={() => setServiceGenderFilter("FEMALE")}
                    >
                      female
                    </button>
                    <button
                      type="button"
                      className="gender-chip"
                      data-active={serviceGenderFilter === "MALE"}
                      onClick={() => setServiceGenderFilter("MALE")}
                    >
                      male
                    </button>
                    <button
                      type="button"
                      className="gender-chip"
                      data-active={serviceGenderFilter === "ALL"}
                      onClick={() => setServiceGenderFilter("ALL")}
                    >
                      all
                    </button>
                    <input
                      type="text"
                      className="sp-input"
                      placeholder="Search Service By Name"
                      value={serviceSearch}
                      onChange={(event) => setServiceSearch(event.target.value)}
                      style={{ flex: "1 1 220px" }}
                    />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px dashed #e2e8f0" }}>
                      <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Service {idx + 1}</label>
                      <div className="sp-input-group">
                        <select className="sp-select" value={item.serviceId} onChange={(event) => handleUpdateItem(idx, "serviceId", event.target.value)} required>
                          <option value="">Select Service</option>
                          {serviceGroups.map((group) => (
                            <optgroup key={group.title} label={`${group.title} ${serviceGenderFilter !== "ALL" ? `(${serviceGenderFilter === "MALE" ? "M" : "F"})` : ""}`}>
                              {group.items.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name} (Rs {service.price})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Expert {idx + 1}</label>
                      <div className="sp-input-group">
                        <select className="sp-select" value={item.staffUserIds[0] || ""} onChange={(event) => handleUpdateItem(idx, "staffUserIds", [event.target.value])} required>
                          <option value="">Select Expert</option>
                          {filteredStaffUsers
                            .filter((staff) => {
                              if (!item.serviceId) return true;
                              const assignedServiceIds = (staff.serviceAssignments || []).map((assignment) => assignment.serviceId);
                              return assignedServiceIds.length === 0 || assignedServiceIds.includes(item.serviceId);
                            })
                            .map((staff) => <option key={staff.id} value={staff.id}>{staff.user?.name}</option>)}
                        </select>
                      </div>

                      <div className="add-link" style={{ margin: "12px 0" }}>Add more staff +</div>
                      <div className="sp-grid-2">
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>From Time</label>
                          <input type="datetime-local" className="sp-input" value={item.startAt} onChange={(event) => handleUpdateItem(idx, "startAt", event.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>To Time</label>
                          <input type="datetime-local" className="sp-input" value={item.endAt} onChange={(event) => handleUpdateItem(idx, "endAt", event.target.value)} required />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-link"
                    style={{ textAlign: "center", display: "block", width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 8 }}
                    onClick={() => setForm({ ...form, items: [...form.items, emptyItem] })}
                  >
                    Add New Service +
                  </button>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, fontWeight: 700, fontSize: "1.1rem" }}>
                    Total Rs {totalServiceCount}
                  </div>
                </div>

                <div className="sp-card" style={{ marginBottom: 40 }}>
                  <h4 className="sp-card-title">3. Instruction Details</h4>
                  <textarea
                    className="sp-input"
                    rows={3}
                    placeholder="Enter Appointment Instruction"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>
              </div>

              <div className="sp-footer">
                <div className="sp-footer-checks">
                  <label style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={form.smsToGuest} onChange={(event) => setForm({ ...form, smsToGuest: event.target.checked })} /> Confirmation Sms</label>
                  <label style={{ display: "flex", gap: 6 }}><input type="checkbox" checked={form.smsToOwner} onChange={(event) => setForm({ ...form, smsToOwner: event.target.checked })} /> Sms To Owner</label>
                </div>
                <button type="submit" className="sp-btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
