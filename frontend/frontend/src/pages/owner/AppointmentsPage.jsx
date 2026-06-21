import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X, ArrowLeft } from "lucide-react";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import AppointmentCheckoutModal from "./AppointmentCheckoutModal";

const APPOINTMENT_START_HOUR = 9;
const APPOINTMENT_END_HOUR = 21;
const APPOINTMENT_SLOT_MINUTES = 15;
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 15;

const TIME_SLOTS = [];
for (let h = APPOINTMENT_START_HOUR; h <= APPOINTMENT_END_HOUR; h++) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const hourText = String(hour12).padStart(2, "0");
  [0, 15, 30, 45].forEach((minutes) => {
    if (h === APPOINTMENT_END_HOUR && minutes > 45) return;
    TIME_SLOTS.push(`${hourText}:${String(minutes).padStart(2, "0")} ${ampm}`);
  });
}
const TIME_SLOT_INDEX = new Map(TIME_SLOTS.map((slot, index) => [slot, index]));

const emptyItem = { serviceId: "", staffUserIds: [], startAt: "", endAt: "", notes: "" };
const toApiDateTime = (value) => (value ? new Date(value).toISOString() : "");

const addMinutesToLocalInput = (value, minutes) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const formatTimeForSelect = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const hourText = String(hour12).padStart(2, "0");
  const minuteText = String(m).padStart(2, "0");
  return `${hourText}:${minuteText} ${ampm}`;
};

const combineDateAndTime = (baseDate, timeString) => {
  if (!timeString) return "";
  const match = timeString.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "";
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const getLocalDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getStaffIdsForAppointment = (row) => {
  const staffIds = new Set();
  (row.items || []).forEach((item) => {
    (item.assignedStaff || []).forEach((assignment) => {
      if (assignment?.userSalonId) staffIds.add(assignment.userSalonId);
    });
  });
  if (row.primaryStaffUserId) {
    staffIds.add(row.primaryStaffUserId);
  }
  return Array.from(staffIds);
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { formatMoney } = useSalonSettings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [checkoutAppointment, setCheckoutAppointment] = useState(null);
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceGenderFilter, setServiceGenderFilter] = useState("FEMALE");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [guestSearchInput, setGuestSearchInput] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const spBodyRef = useRef(null);

  useEffect(() => {
    if (status.error && spBodyRef.current) {
      spBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [status.error]);

  const loadContext = async () => {
    try {
      const contextResponse = await api.get("/owner/pos/context");
      setCustomers(contextResponse.data.customers || []);
      setServices(contextResponse.data.services || []);
      const staff = contextResponse.data.staffUsers || [];
      setStaffUsers(staff);
      const branches = contextResponse.data.branches || [];
      setBranches(branches);
      const defaultBranch = branches.find(b => b.name.toLowerCase().includes("main")) || branches[0];
      setForm((current) => ({
        ...current,
        branchId: current.branchId || defaultBranch?.id || ""
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
      const data = response.data || [];
      setRows(data);
      if (data.length > 0) {
        setTimeout(() => {
          let earliestHour = 24;
          data.forEach(row => {
            const h = new Date(row.startAt).getHours();
            if (h < earliestHour) earliestHour = h;
          });
          if (earliestHour >= 9 && earliestHour <= 20) {
            const calendarBody = document.querySelector('.sp-calendar-body');
            if (calendarBody) {
              const rowIndex = (earliestHour - APPOINTMENT_START_HOUR) * (60 / APPOINTMENT_SLOT_MINUTES);
              const scrollAmount = rowIndex * 36;
              calendarBody.scrollTo({ top: Math.max(0, scrollAmount - 50), behavior: 'smooth' });
            }
          }
        }, 300);
      }
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
    const endDate = new Date(startDate.getTime() + DEFAULT_APPOINTMENT_DURATION_MINUTES * 60000);

    const startAtStr = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const endAtStr = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    const staffBranchId = staffUsers.find((staff) => staff.id === staffId)?.branchId || "";

    const defaultBranchId = branches.find(b => b.name.toLowerCase().includes("main"))?.id || branches[0]?.id || "";

    setEditMode(false);
    setEditingAppointmentId(null);
    setForm({
      customerId: "",
      branchId: staffBranchId || defaultBranchId,
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

  const handleAppointmentClick = (event, appt) => {
    event.stopPropagation();
    
    const toLocalInput = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    // Format items from backend to form state
    const formattedItems = (appt.items || []).map((item) => {
      const startAt = toLocalInput(item.startAt);
      const service = services.find((srv) => srv.id === item.serviceId);
      const endAt = toLocalInput(item.endAt) || (service && startAt ? addMinutesToLocalInput(startAt, service.durationMin || DEFAULT_APPOINTMENT_DURATION_MINUTES) : "");
      return {
        serviceId: item.serviceId,
        staffUserIds: (item.assignedStaff || []).map((assignment) => assignment.userSalonId),
        startAt,
        endAt,
        notes: item.notes || ""
      };
    });

    // Ensure there is at least one item
    if (formattedItems.length === 0) {
      formattedItems.push({ ...emptyItem });
    }

    setGuestSearchInput(appt.customer?.name || "");
    setForm({
      customerId: appt.customerId || "",
      branchId: appt.branchId || branches[0]?.id || "",
      bookingChannel: appt.bookingChannel || "MANUAL",
      title: appt.title || "Appointment",
      startAt: toLocalInput(appt.startAt),
      endAt: toLocalInput(appt.endAt),
      notes: appt.notes || "",
      isWalkIn: Boolean(appt.isWalkIn),
      items: formattedItems,
      smsToGuest: true,
      smsToOwner: false,
      status: appt.status || "PENDING",
      convertedInvoiceId: appt.convertedInvoiceId || null
    });
    setEditMode(true);
    setEditingAppointmentId(appt.id);
    setServiceSearch("");
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    document.body.style.overflow = isCreateModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen]);

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    const activeItems = form.items.filter((item) => item.serviceId && item.staffUserIds?.length && item.startAt && item.endAt);
    if (!form.customerId) {
      setStatus({ error: "Please select a guest.", success: "" });
      return;
    }
    if (!form.branchId) {
      setStatus({ error: "Please select a branch.", success: "" });
      return;
    }
    if (!activeItems.length) {
      setStatus({ error: "Please add at least one valid service item.", success: "" });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    const activeItems = form.items.filter((item) => item.serviceId && item.staffUserIds?.length && item.startAt && item.endAt);
    try {
      const payloadItems = activeItems.map((item) => ({
        ...item,
        startAt: toApiDateTime(item.startAt),
        endAt: toApiDateTime(item.endAt)
      }));
      const sortedStarts = payloadItems.map((item) => item.startAt).sort();
      const sortedEnds = payloadItems.map((item) => item.endAt).sort();
      const payload = {
        ...form,
        items: payloadItems,
        startAt: sortedStarts[0],
        endAt: sortedEnds[sortedEnds.length - 1],
        primaryStaffUserId: payloadItems[0]?.staffUserIds?.[0] || form.items[0]?.staffUserIds?.[0] || ""
      };
      if (typeof window !== "undefined" && window.console) {
        console.log("[appt save payload]", { startAt: payload.startAt, endAt: payload.endAt, items: payload.items, formEndAt: form.endAt, formStartAt: form.startAt });
      }
      if (editMode) {
        await api.patch(`/owner/appointments/${editingAppointmentId}`, payload);
        setStatus({ error: "", success: "Appointment updated successfully." });
      } else {
        await api.post("/owner/appointments", payload);
        setStatus({ error: "", success: "Appointment created." });
      }
      setIsCreateModalOpen(false);
      setShowConfirmModal(false);
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, editMode ? "Could not update appointment" : "Could not create appointment"), success: "" });
      setShowConfirmModal(false);
    }
  };
  const handleCheckIn = async (event) => {
    event.preventDefault();
    if (!editMode || !editingAppointmentId) return;
    try {
      await api.patch(`/owner/appointments/${editingAppointmentId}/status`, { status: "CHECKED_IN" });
      setStatus({ error: "", success: "Appointment checked in." });
      setIsCreateModalOpen(false);
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not check in appointment"), success: "" });
    }
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();
    if (!editMode || !editingAppointmentId) return;
    
    if (form.convertedInvoiceId) {
      navigate(`/admin/pos-dashboard/${form.convertedInvoiceId}?from=/admin/appointments`);
      return;
    }
    
    const appt = rows.find(r => r.id === editingAppointmentId);
    if (appt) {
      setCheckoutAppointment(appt);
      setIsCreateModalOpen(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!editMode || !editingAppointmentId) return;
    try {
      await api.patch(`/owner/appointments/${editingAppointmentId}/status`, { status: "CANCELLED", note: "Cancelled from appointment panel" });
      setStatus({ error: "", success: "Appointment cancelled." });
      setIsCreateModalOpen(false);
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel appointment"), success: "" });
    }
  };

  const confirmedCount = rows.filter((row) => row.status === "CONFIRMED" || row.status === "PENDING").length;
  const completedCount = rows.filter((row) => row.status === "COMPLETED").length;
  const cancelledCount = rows.filter((row) => row.status === "CANCELLED").length;
  const totalCount = rows.length;

  const formatDate = (date) => date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");

  const handleUpdateItem = (index, field, value) => {
    const nextItems = [...form.items];
    const nextItem = { ...nextItems[index], [field]: value };
    if (field === "serviceId") {
      nextItem.staffUserIds = [];
      if (value) {
        // Always recalculate endAt from service duration when service changes
        nextItem.endAt = nextItem.startAt ? addMinutesToLocalInput(nextItem.startAt, getServiceDurationMin(value)) : "";
      } else {
        nextItem.endAt = "";
      }
    }
    nextItems[index] = nextItem;
    const nextStarts = nextItems.map((item) => item.startAt).filter(Boolean).sort();
    const nextEnds = nextItems.map((item) => item.endAt).filter(Boolean).sort();
    if (typeof window !== "undefined" && window.console) {
      console.log("[handleUpdateItem]", { field, value, newEndAt: nextItem.endAt, newStartAt: nextItem.startAt, allEnds: nextEnds });
    }
    setForm((current) => ({
      ...current,
      items: nextItems,
      startAt: nextStarts[0] || current.startAt,
      endAt: nextEnds[nextEnds.length - 1] || current.endAt
    }));
  };

  const handleAddServiceFromSearch = (service) => {
    setForm((current) => {
      const nextItems = [...current.items];
      // Check if there is an empty item we can fill
      const emptyIndex = nextItems.findIndex(item => !item.serviceId);
      const serviceDuration = getServiceDurationMin(service.id);
      
      if (emptyIndex >= 0) {
        const existing = { ...nextItems[emptyIndex], serviceId: service.id, staffUserIds: [] };
        nextItems[emptyIndex] = {
          ...existing,
          endAt: existing.startAt ? addMinutesToLocalInput(existing.startAt, serviceDuration) : existing.endAt || ""
        };
      } else {
        // Append a new item
        const startAt = current.startAt || "";
        nextItems.push({
          ...emptyItem,
          serviceId: service.id,
          startAt,
          endAt: startAt ? addMinutesToLocalInput(startAt, serviceDuration) : current.endAt || ""
        });
      }

      return { ...current, items: nextItems };
    });
    setServiceSearch("");
    setShowServiceDropdown(false);
  };

  const filteredServices = useMemo(() => {
    let list = services;
    if (form.branchId) {
      list = list.filter((service) => !service.branchId || service.branchId === form.branchId);
    }
    if (serviceGenderFilter !== "ALL") {
      list = list.filter((service) => !service.gender || ["UNISEX", "BOTH", "ALL"].includes(service.gender.toUpperCase()) || service.gender.toUpperCase() === serviceGenderFilter);
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

  const displayedRows = useMemo(() => {
    if (!isCreateModalOpen || !editMode || !editingAppointmentId) return rows;
    const idx = rows.findIndex((r) => r.id === editingAppointmentId);
    if (idx === -1) return rows;
    const result = rows.map((r, i) => {
      if (i !== idx) return r;
      const formItems = (form.items || []).filter((fi) => fi.serviceId && fi.startAt && fi.endAt && fi.staffUserIds?.length);
      if (typeof window !== "undefined" && window.console) {
        console.log("[displayedRows debug]", {
          appointmentId: r.id,
          formItems: formItems.map(fi => ({ serviceId: fi.serviceId, startAt: fi.startAt, endAt: fi.endAt, staffUserIds: fi.staffUserIds })),
          savedItems: (r.items || []).map(it => ({ id: it.id, serviceId: it.serviceId, startAt: it.startAt, endAt: it.endAt }))
        });
      }
      if (formItems.length === 0) return r;
      const updatedItems = (r.items || []).map((item) => {
        const matched = formItems.find((fi) => fi.serviceId === item.serviceId);
        if (!matched) return item;
        const newStart = toApiDateTime(matched.startAt);
        const newEnd = toApiDateTime(matched.endAt);
        const newAssigned = (matched.staffUserIds || []).map((sid) => ({ userSalonId: sid }));
        return { ...item, startAt: newStart, endAt: newEnd, assignedStaff: newAssigned };
      });
      const sortedStarts = updatedItems.map((it) => it.startAt).filter(Boolean).sort();
      const sortedEnds = updatedItems.map((it) => it.endAt).filter(Boolean).sort();
      return {
        ...r,
        startAt: sortedStarts[0] || r.startAt,
        endAt: sortedEnds[sortedEnds.length - 1] || r.endAt,
        primaryStaffUserId: formItems[0]?.staffUserIds?.[0] || r.primaryStaffUserId,
        items: updatedItems
      };
    });
    return result;
  }, [rows, isCreateModalOpen, editMode, editingAppointmentId, form.items]);

  const appointmentsByStaffStartSlot = useMemo(() => {
    const byStaff = new Map();
    displayedRows.forEach((row) => {
      const items = row.items || [];
      if (items.length === 0) {
        const startLabel = formatTimeForSelect(row.startAt);
        const startIndex = TIME_SLOT_INDEX.get(startLabel);
        if (startIndex === undefined) return;
        const startDate = new Date(row.startAt);
        const endDate = new Date(row.endAt);
        let diffMin = (endDate.getTime() - startDate.getTime()) / 60000;
        if (isNaN(diffMin) || diffMin < 0) diffMin = DEFAULT_APPOINTMENT_DURATION_MINUTES;
        const durationSlots = Math.max(1, Math.ceil(diffMin / APPOINTMENT_SLOT_MINUTES));
        getStaffIdsForAppointment(row).forEach((staffId) => {
          if (!byStaff.has(staffId)) byStaff.set(staffId, new Map());
          const slotMap = byStaff.get(staffId);
          const existing = slotMap.get(startIndex) || [];
          existing.push({ ...row, durationSlots, itemStartAt: row.startAt, itemEndAt: row.endAt, itemId: row.id });
          slotMap.set(startIndex, existing);
        });
        return;
      }
      items.forEach((item) => {
        const itemStart = item.startAt || row.startAt;
        const itemEnd = item.endAt || row.endAt;
        const startLabel = formatTimeForSelect(itemStart);
        const startIndex = TIME_SLOT_INDEX.get(startLabel);
        if (startIndex === undefined) return;
        const startDate = new Date(itemStart);
        const endDate = new Date(itemEnd);
        let diffMin = (endDate.getTime() - startDate.getTime()) / 60000;
        if (isNaN(diffMin) || diffMin <= 0) {
          const svc = services.find(s => s.id === item.serviceId);
          diffMin = Number(svc?.durationMin || DEFAULT_APPOINTMENT_DURATION_MINUTES);
        }
        const durationSlots = Math.max(1, Math.ceil(diffMin / APPOINTMENT_SLOT_MINUTES));
        const itemStaffIds = (item.assignedStaff || []).map(a => a.userSalonId).filter(Boolean);
        const finalStaffIds = itemStaffIds.length > 0 ? itemStaffIds : getStaffIdsForAppointment(row);
        const itemWithAppt = { ...row, itemId: item.id, serviceId: item.serviceId, itemStartAt: itemStart, itemEndAt: itemEnd, durationSlots };
        finalStaffIds.forEach((staffId) => {
          if (!byStaff.has(staffId)) byStaff.set(staffId, new Map());
          const slotMap = byStaff.get(staffId);
          const existing = slotMap.get(startIndex) || [];
          existing.push(itemWithAppt);
          slotMap.set(startIndex, existing);
        });
      });
    });
    return byStaff;
  }, [displayedRows, services]);

  const serviceDurationById = useMemo(() => {
    return new Map(
      services.map((service) => [
        service.id,
        Number(service.durationMin || DEFAULT_APPOINTMENT_DURATION_MINUTES)
      ])
    );
  }, [services]);

  const getServiceDurationMin = (serviceId) => serviceDurationById.get(serviceId) || DEFAULT_APPOINTMENT_DURATION_MINUTES;

  const applyServiceDurationToItem = (item, serviceId = item.serviceId) => {
    const nextServiceId = serviceId || item.serviceId || "";
    const nextStartAt = item.startAt || "";
    const durationMin = getServiceDurationMin(nextServiceId);
    const nextEndAt = nextStartAt ? addMinutesToLocalInput(nextStartAt, durationMin) : item.endAt || "";
    return {
      ...item,
      serviceId: nextServiceId,
      endAt: nextEndAt
    };
  };

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
          height: calc(100vh - 108px);
          display: flex;
          flex-direction: column;
        }
        .calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 16px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .date-navigator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #0f172a;
          font-size: 0.85rem;
        }
        .nav-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          padding: 4px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #3b82f6;
          font-weight: 600;
          font-size: 0.78rem;
          min-height: unset;
          box-shadow: none;
          transition: background 150ms;
        }
        .nav-btn:hover { background: #eff6ff; transform: none; filter: none; }
        .nav-icon {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          padding: 4px;
          cursor: pointer;
          color: #475569;
          display: flex;
          min-height: unset;
          box-shadow: none;
        }
        .nav-icon:hover { background: #f8fafc; transform: none; filter: none; }
        .counters-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .counter-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 0.75rem;
          font-weight: 500;
          color: #475569;
          min-height: unset;
          box-shadow: none;
        }
        .counter-badge.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .counter-val {
          background: white;
          color: #0f172a;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.72rem;
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
          min-width: 900px;
        }
        .calendar-th {
          position: sticky;
          top: 0;
          background: #f1f5f9;
          padding: 6px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 0.72rem;
          color: #475569;
          border: 1px solid #e2e8f0;
          z-index: 10;
        }
        .time-col-header {
          width: 60px;
          background: #f8fafc;
          z-index: 11;
          left: 0;
        }
        .calendar-time-cell {
          position: sticky;
          left: 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 6px;
          text-align: center;
          font-size: 0.68rem;
          font-weight: 600;
          color: #64748b;
          z-index: 5;
          white-space: nowrap;
        }
        .calendar-cell {
          border: 1px solid #f1f5f9;
          height: 30px;
          position: relative;
          cursor: pointer;
        }
        .calendar-cell:hover { background: #f8fafc; }
        .appt-stack {
          position: absolute;
          inset: 1px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          z-index: 2;
        }
        .appt-block {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
          border-radius: 3px;
          padding: 2px 5px;
          font-size: 0.65rem;
          color: #1e3a8a;
          overflow: hidden;
          box-shadow: none;
          min-height: 0;
        }
        .appt-block.more {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 700;
          text-align: center;
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
          width: min(360px, 100vw);
          max-width: 100vw;
          background: #f8fafc;
          z-index: 1050;
          display: flex;
          flex-direction: column;
          box-shadow: none;
          transform: translateX(100%);
          animation: slideIn 0.25s forwards;
        }
        @keyframes slideIn { to { transform: translateX(0); } }
        .sp-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .sp-header h3 {
          margin: 0;
          font-size: 0.92rem;
          color: #ef4444;
          font-weight: 600;
        }
        .sp-close {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          padding: 4px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: unset;
          box-shadow: none;
        }
        .sp-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sp-card {
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          box-shadow: none;
        }
        .sp-card-title {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 0;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sp-input-group {
          position: relative;
          margin-bottom: 10px;
        }
        .sp-input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.82rem;
          box-sizing: border-box;
          background: white;
          min-height: unset;
        }
        .sp-input:focus { border-color: #3b82f6; outline: none; }
        .sp-select {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.82rem;
          appearance: none;
          background: white;
          box-sizing: border-box;
          min-height: unset;
        }
        .sp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .sp-grid-2 > * { min-width: 0; }
        .sp-time-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .sp-time-grid > * { min-width: 0; }
        .sp-footer {
          padding: 10px 16px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }
        .sp-footer-checks {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: flex-start;
          font-size: 0.78rem;
          font-weight: 500;
          color: #0f172a;
          flex-wrap: wrap;
        }
        .sp-btn-primary {
          width: 100%;
          padding: 9px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          min-height: unset;
          box-shadow: none;
        }
        .sp-btn-primary:hover { background: #2563eb; transform: none; filter: none; }
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
        .sp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .sp-grid-2 > * { min-width: 0; }
        .sp-time-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .sp-time-grid > * { min-width: 0; }
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
        @media (max-width: 900px) {
          .slide-panel {
            width: 100vw;
          }
          .sp-body {
            padding: 16px;
          }
          .sp-card {
            padding: 16px;
          }
          .sp-card-title {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }
          .sp-grid-2 {
            grid-template-columns: 1fr;
          }
          .sp-footer {
            padding: 14px 16px;
          }
        }
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
          box-shadow: none;
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
            {(() => {
              const coveredUntil = new Map();
              return TIME_SLOTS.map((slot, slotIndex) => (
                <tr key={slot}>
                  <td className="calendar-time-cell">{slot}</td>
                  {filteredStaffUsers.map((staff) => {
                    const nextCoveredIndex = coveredUntil.get(staff.id) || 0;
                    if (slotIndex < nextCoveredIndex) return null;

                    const startingAppts = appointmentsByStaffStartSlot.get(staff.id)?.get(slotIndex) || [];
                    if (!startingAppts.length) {
                      return (
                        <td
                          key={`${slot}-${staff.id}`}
                          className="calendar-cell"
                          onClick={() => handleCellClick(staff.id, slot)}
                        />
                      );
                    }

                    const rowSpan = Math.max(
                      1,
                      ...startingAppts.map((appt) => appt.durationSlots || 1)
                    );
                    coveredUntil.set(staff.id, slotIndex + rowSpan);

                    return (
                      <td
                        key={`${slot}-${staff.id}`}
                        className="calendar-cell"
                        rowSpan={rowSpan}
                      >
                        <div className="appt-stack" style={{ height: "100%" }}>
                          {startingAppts.map((appt) => {
                            let bg = "#eff6ff";
                            let border = "#3b82f6";
                            let text = "#1e3a8a";

                            if (appt.status === "COMPLETED") {
                              bg = "#ecfccb"; border = "#84cc16"; text = "#3f6212";
                            } else if (appt.status === "CHECKED_IN") {
                              bg = "#ffedd5"; border = "#f97316"; text = "#7c2d12";
                            } else if (appt.status === "CANCELLED") {
                              bg = "#fee2e2"; border = "#ef4444"; text = "#7f1d1d";
                            }

                            const totalDurationMin = Math.max(
                              APPOINTMENT_SLOT_MINUTES,
                              Number(appt.durationSlots || 1) * APPOINTMENT_SLOT_MINUTES
                            );

                            const itemService = (appt.items || []).find(it => it.id === appt.itemId);
                            const serviceName = itemService?.service?.name || (appt.items?.[0]?.service?.name || "Service");
                            const uniqueKey = `${appt.id}-${appt.itemId || "main"}-${staff.id}`;

                            return (
                              <div
                                key={uniqueKey}
                                className="appt-block"
                                style={{
                                  background: bg,
                                  borderLeftColor: border,
                                  color: text,
                                  minHeight: `${Math.max(1, rowSpan) * 28 - 4}px`
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleAppointmentClick(event, appt);
                                }}
                                title={`${appt.customer?.name || "Walk-in"} • ${serviceName} • ${totalDurationMin} min`}
                              >
                                <div style={{ fontWeight: 600 }}>{appt.customer?.name || "Walk-in"}</div>
                                <div>{serviceName}</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="slide-panel" onClick={(event) => event.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" type="button" onClick={() => setIsCreateModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>{editMode ? "Update Services" : "Create Appointment"}</h3>
            </div>
            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
              <div className="sp-body" ref={spBodyRef}>
                {status.error && <div style={{ color: "#ef4444", padding: 12, background: "#fef2f2", borderRadius: 8 }}>{status.error}</div>}
                {status.success && <div style={{ color: "#10b981", padding: 12, background: "#ecfdf5", borderRadius: 8 }}>{status.success}</div>}

                <div className="sp-card">
                  <h4 className="sp-card-title">1. Guest Details {editMode && form.customerId && <button className="add-link" type="button" onClick={() => navigate(`/admin/customers/${form.customerId}`)}>Guest History</button>}</h4>
                  <div className="sp-input-group">
                    <select className="sp-input" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} required>
                      <option value="">Select Branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                  <div className="sp-input-group" style={{ position: "relative" }}>
                    <input 
                      type="text" 
                      className="sp-input"
                      placeholder="Search By Name Or No." 
                      value={guestSearchInput} 
                      onChange={(e) => {
                        setGuestSearchInput(e.target.value);
                        setShowCustomerDropdown(true);
                        const match = customers.find(c => c.name === e.target.value || c.phone === e.target.value);
                        if (match) {
                          setForm(current => ({ ...current, customerId: match.id }));
                          if (match.gender) {
                            setServiceGenderFilter(match.gender.toUpperCase());
                          }
                        } else {
                          setForm(current => ({ ...current, customerId: "" }));
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    />
                    {showCustomerDropdown && guestSearchInput && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "4px", maxHeight: "250px", overflowY: "auto", zIndex: 50, boxShadow: "none" }}>
                        {customers.filter(c => c.name?.toLowerCase().includes(guestSearchInput.toLowerCase()) || c.phone?.includes(guestSearchInput)).map((c) => (
                          <div 
                            key={c.id} 
                            style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 14 }}
                            onMouseDown={() => {
                              setGuestSearchInput(c.name);
                              setForm(current => ({ ...current, customerId: c.id }));
                              if (c.gender) {
                                setServiceGenderFilter(c.gender.toUpperCase());
                              }
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{c.name}</div>
                            <div style={{ color: "#64748b", fontSize: 12 }}>{c.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <div style={{ flex: "1 1 220px", position: "relative" }}>
                      <input
                        type="text"
                        className="sp-input"
                        placeholder="Search Service By Name"
                        value={serviceSearch}
                        onChange={(event) => { setServiceSearch(event.target.value); setShowServiceDropdown(true); }}
                        onFocus={() => setShowServiceDropdown(true)}
                        onBlur={() => setTimeout(() => setShowServiceDropdown(false), 200)}
                        style={{ width: "100%" }}
                      />
                      {showServiceDropdown && serviceSearch && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "4px", maxHeight: "250px", overflowY: "auto", zIndex: 50, boxShadow: "none" }}>
                          {filteredServices.length === 0 ? (
                            <div style={{ padding: "10px 14px", color: "#64748b", fontSize: 13 }}>No services found</div>
                          ) : (
                            filteredServices.map((s) => (
                              <div 
                                key={s.id} 
                                style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 14 }}
                                onMouseDown={() => handleAddServiceFromSearch(s)}
                              >
                                <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{s.name}</div>
                                <div style={{ color: "#64748b", fontSize: 12 }}>{s.category?.name || "Uncategorized"} - {formatMoney(s.price)}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
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
                                  {service.name} ({formatMoney(service.price)})
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
                      <div className="sp-time-grid">
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>From Time</label>
                          <select className="sp-input" value={item.startAt ? formatTimeForSelect(item.startAt) : ""} onChange={(event) => handleUpdateItem(idx, "startAt", combineDateAndTime(currentDate, event.target.value))} required>
                            <option value="">Select Time</option>
                            {TIME_SLOTS.filter(slot => {
                              if (!item.endAt) return true;
                              const endIdx = TIME_SLOT_INDEX.get(formatTimeForSelect(item.endAt)) ?? TIME_SLOTS.length;
                              const slotIdx = TIME_SLOT_INDEX.get(slot) ?? 0;
                              return slotIdx < endIdx;
                            }).map(slot => <option key={slot} value={slot}>{slot}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>To Time</label>
                          <select className="sp-input" value={item.endAt ? formatTimeForSelect(item.endAt) : ""} onChange={(event) => handleUpdateItem(idx, "endAt", combineDateAndTime(currentDate, event.target.value))} required disabled={!item.startAt}>
                            <option value="">Select Time</option>
                            {TIME_SLOTS.filter(slot => {
                              if (!item.startAt) return true;
                              const startIdx = TIME_SLOT_INDEX.get(formatTimeForSelect(item.startAt)) ?? 0;
                              const slotIdx = TIME_SLOT_INDEX.get(slot) ?? 0;
                              if (slotIdx <= startIdx) return false;
                              if (slotIdx > startIdx + 8) return false;
                              return true;
                            }).map(slot => <option key={slot} value={slot}>{slot}</option>)}
                          </select>
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
                    Total {formatMoney(totalServiceCount)}
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
                {!editMode && (
                  <div className="sp-footer-checks">
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" className="styled-checkbox" checked={form.smsToGuest} onChange={(event) => setForm({ ...form, smsToGuest: event.target.checked })} />
                      Confirmation Sms
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" className="styled-checkbox" checked={form.smsToOwner} onChange={(event) => setForm({ ...form, smsToOwner: event.target.checked })} />
                      Sms To Owner
                    </label>
                  </div>
                )}
                {editMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button type="submit" className="sp-btn-primary" style={{ flex: 1 }}>Update</button>
                      {form.status !== "CANCELLED" && (
                        <button type="button" className="sp-btn-primary" style={{ flex: 1, background: "white", color: "#ef4444", border: "1px solid #ef4444" }} onClick={handleCancelAppointment}>Cancel Appointment</button>
                      )}
                    </div>
                    {form.status !== "CHECKED_IN" && form.status !== "COMPLETED" && (
                      <button type="button" className="sp-btn-primary" style={{ background: "#f97316", borderColor: "#f97316" }} onClick={handleCheckIn}>Check In</button>
                    )}
                    <button type="button" className="sp-btn-primary" style={{ background: "#10b981", borderColor: "#10b981" }} onClick={handleGenerateBill}>
                      {form.convertedInvoiceId ? "View Bill" : "Generate Bill"}
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="sp-btn-primary">Create</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 450, boxShadow: "none" }}>
            <h3 style={{ color: "#3b82f6", marginTop: 0, marginBottom: 16, fontSize: "1.1rem", fontWeight: 600 }}>{editMode ? "Confirm Update" : "Create & Confirm Appointment"}</h3>
            <p style={{ color: "#475569", fontSize: "0.95rem", marginBottom: 24 }}>{editMode ? "Are you sure you want to update these services?" : "Are you sure, you want to create & confirm an appointment?"}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" onClick={() => setShowConfirmModal(false)} style={{ padding: "8px 20px", border: "1px solid #3b82f6", background: "white", color: "#3b82f6", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "#eff6ff"} onMouseOut={(e) => e.target.style.background = "white"}>NO</button>
              <button type="button" onClick={handleConfirmSubmit} style={{ padding: "8px 20px", border: "none", background: "#3b82f6", color: "white", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "#2563eb"} onMouseOut={(e) => e.target.style.background = "#3b82f6"}>YES</button>
            </div>
          </div>
        </div>
      )}

      {checkoutAppointment && (
        <AppointmentCheckoutModal 
          appointment={checkoutAppointment}
          onClose={() => setCheckoutAppointment(null)}
          onComplete={async (invoiceId) => {
            setCheckoutAppointment(null);
            await loadAppointments();
            // navigate(`/admin/pos-dashboard/${invoiceId}?from=/admin/appointments`);
          }}
        />
      )}
    </div>
  );
}
