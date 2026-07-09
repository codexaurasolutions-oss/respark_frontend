import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X, ArrowLeft, CheckCircle2, Calendar, XCircle, PlusCircle, Trash2, User, Edit3, FileText, CreditCard, Gift, Wallet, AlertCircle, Package, Users, UserCog, Tag, Phone, StickyNote } from "lucide-react";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { useBranch } from '../../context/BranchContext';
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
    if (h === APPOINTMENT_END_HOUR && minutes > 0) return;
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

const formatCompactDate = (value, withYear = true) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {})
  }).replace(/ /g, "-");
};

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { formatMoney } = useSalonSettings();
  const { selectedBranchId } = useBranch();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [checkoutAppointment, setCheckoutAppointment] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("profile");
  const [customerGiftCards, setCustomerGiftCards] = useState([]);
  const [customerAdvances, setCustomerAdvances] = useState([]);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceGenderFilter, setServiceGenderFilter] = useState("FEMALE");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [salonSettings, setSalonSettings] = useState(null);

  const { TIME_SLOTS, TIME_SLOT_INDEX, currentStartHour } = useMemo(() => {
    // Parses BOTH 24-hour "HH:MM" (from HTML time inputs) AND 12-hour "HH:MM AM/PM" (from slot labels)
    const parseHour = (timeStr) => {
      if (!timeStr) return NaN;
      const valStr = timeStr.trim().toLowerCase();
      const hasAmPm = valStr.includes("am") || valStr.includes("pm");
      const [timePart] = valStr.split(" ");
      const [hStr, mStr] = timePart.split(":");
      let h = parseInt(hStr, 10);
      if (isNaN(h)) return NaN;
      if (hasAmPm) {
        // 12-hour format
        if (valStr.includes("pm") && h < 12) h += 12;
        if (valStr.includes("am") && h === 12) h = 0;
      }
      // If no AM/PM → already 24-hour, use as-is
      return h;
    };

    let startHour = 9;
    let endHour = 21;

    // Use Salon Settings business timings as the baseline
    const bizStart = salonSettings?.advancedSettings?.genericSettings?.businessStart;
    const bizEnd = salonSettings?.advancedSettings?.genericSettings?.businessEnd;
    const parsedBizStart = parseHour(bizStart);
    const parsedBizEnd = parseHour(bizEnd);

    if (!isNaN(parsedBizStart)) startHour = parsedBizStart;
    if (!isNaN(parsedBizEnd)) endHour = parsedBizEnd;

    // Use roster working hours to define grid bounds
    const rosterRows = salonSettings?.advancedSettings?.rosterManagement?.rows || [];
    const workingRows = rosterRows.filter(r => r.isWorking !== false && r.fromTime && r.toTime);
    if (workingRows.length > 0) {
      let rosterMin = 24;
      let rosterMax = 0;
      workingRows.forEach(row => {
        const fromH = parseHour(row.fromTime);
        const toH = parseHour(row.toTime);
        if (!isNaN(fromH) && fromH < rosterMin) rosterMin = fromH;
        if (!isNaN(toH) && toH > rosterMax) rosterMax = toH;
      });
      if (rosterMin < rosterMax) {
        startHour = rosterMin;
        endHour = rosterMax;
      }
    }

    const slots = [];
    for (let h = startHour; h <= endHour; h++) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const hourText = String(hour12).padStart(2, "0");
      [0, 15, 30, 45].forEach((minutes) => {
        if (h === endHour && minutes > 0) return;
        slots.push(`${hourText}:${String(minutes).padStart(2, "0")} ${ampm}`);
      });
    }

    const slotIndexMap = new Map(slots.map((slot, index) => [slot, index]));

    return {
      TIME_SLOTS: slots,
      TIME_SLOT_INDEX: slotIndexMap,
      currentStartHour: startHour
    };
  }, [salonSettings]);

  const isStaffWorkingAtSlot = (staffId, slot) => {
    const rosterRows = salonSettings?.advancedSettings?.rosterManagement?.rows || [];
    const staffRow = rosterRows.find(r => String(r.id) === String(staffId));
    if (!staffRow) return true;
    if (staffRow.isWorking === false) return false;
    if (!staffRow.fromTime || !staffRow.toTime) return true;

    // Handles BOTH 24-hour "HH:MM" (roster fromTime/toTime) and 12-hour "HH:MM AM/PM" (slot labels)
    const getMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const clean = timeStr.trim().toLowerCase();
      const hasAmPm = clean.includes("am") || clean.includes("pm");
      const isPM = clean.includes("pm");
      const isAM = clean.includes("am");
      const cleanTime = clean.replace("am", "").replace("pm", "").trim();
      const [hStr, mStr] = cleanTime.split(":");
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      if (isNaN(h)) h = 0;
      if (isNaN(m)) m = 0;
      if (hasAmPm) {
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
      }
      // No AM/PM → already 24-hour format, use as-is
      return h * 60 + m;
    };

    const slotMinutes = getMinutes(slot);
    const startMinutes = getMinutes(staffRow.fromTime);
    const endMinutes = getMinutes(staffRow.toTime);

    // Allow booking in any slot that starts within the shift (up to and including the last slot)
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  const [guestSearchInput, setGuestSearchInput] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hoveredAppt, setHoveredAppt] = useState(null);

  const handleMouseEnter = (event, appt) => {
    setHoveredAppt({
      appt,
      x: event.clientX,
      y: event.clientY
    });
  };

  const handleMouseMove = (event, appt) => {
    setHoveredAppt(prev => {
      if (!prev || prev.appt.id !== appt.id) return prev;
      return {
        ...prev,
        x: event.clientX,
        y: event.clientY
      };
    });
  };

  const getStatusColor = (status) => {
    if (status === "COMPLETED") return "#84cc16";
    if (status === "CHECKED_IN") return "#f97316";
    if (status === "CANCELLED") return "#ef4444";
    return "#eab308";
  };

  const tooltipStyle = useMemo(() => {
    if (!hoveredAppt) return { display: "none" };
    
    let left = hoveredAppt.x + 12;
    let top = hoveredAppt.y + 12;
    
    const tooltipWidth = 320;
    const itemsCount = hoveredAppt.appt.items?.length || 1;
    const tooltipHeight = 80 + itemsCount * 76;
    
    if (left + tooltipWidth > window.innerWidth) {
      left = hoveredAppt.x - tooltipWidth - 12;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 20;
    }
    
    return {
      position: "fixed",
      left: `${Math.max(10, left)}px`,
      top: `${Math.max(10, top)}px`,
      width: `${tooltipWidth}px`,
      backgroundColor: "#e2e8f0",
      border: "1px solid #cbd5e1",
      borderRadius: "4px",
      padding: "8px 12px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
      zIndex: 9999,
      pointerEvents: "none",
      fontFamily: "inherit"
    };
  }, [hoveredAppt]);
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
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (status.error && spBodyRef.current) {
      spBodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [status.error]);

  const handleCheckInAction = async (apptId) => {
    try {
      await api.patch(`/owner/appointments/${apptId}/status`, { status: "CHECKED_IN" });
      setStatus({ error: "", success: "Appointment checked in." });
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not check in appointment"), success: "" });
    }
    setContextMenu(null);
  };

  const handleRescheduleAction = (appt) => {
    handleAppointmentClick({ stopPropagation: () => {} }, appt);
    setContextMenu(null);
  };

  const handleCancelAction = async (apptId) => {
    try {
      await api.patch(`/owner/appointments/${apptId}/status`, { status: "CANCELLED", note: "Cancelled from context menu" });
      setStatus({ error: "", success: "Appointment cancelled." });
      await loadAppointments();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel appointment"), success: "" });
    }
    setContextMenu(null);
  };

  const handleNewBookingAction = (staffId, slot) => {
    handleCellClick(staffId, slot);
    setContextMenu(null);
  };

  const handleDeleteAction = async (apptId) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      try {
        await api.delete(`/owner/appointments/${apptId}`);
        setStatus({ error: "", success: "Appointment deleted successfully." });
        await loadAppointments();
      } catch (error) {
        setStatus({ error: formatApiError(error, "Could not delete appointment"), success: "" });
      }
    }
    setContextMenu(null);
  };

  const handleViewProfileAction = async (customerId) => {
    setContextMenu(null);
    if (!customerId) return;

    setSelectedCustomer({ id: customerId });
    setDetailTab("profile");
    setCustomerDetail(null);
    setCustomerDetailLoading(true);
    setNotes("");
    setCustomerGiftCards([]);
    setCustomerAdvances([]);
    try {
      const res = await api.get(`/owner/customers/${customerId}`);
      const row = res.data;
      setSelectedCustomer(row);
      setCustomerDetail(row);
      setNotes(row.notes || "");
      
      // Fetch sub-resource details
      const [gcRes, advRes] = await Promise.allSettled([
        api.get(`/owner/customers/${customerId}/gift-cards`),
        api.get(`/owner/customers/${customerId}/advance-payments`)
      ]);
      if (gcRes.status === "fulfilled") {
        setCustomerGiftCards(gcRes.value.data || []);
      }
      if (advRes.status === "fulfilled") {
        setCustomerAdvances(advRes.value.data || []);
      }
    } catch (e) {
      console.error("Failed to load customer profile details", e);
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const closeCustomerDetail = () => {
    setSelectedCustomer(null);
    setCustomerDetail(null);
    setDetailTab("profile");
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    try {
      await api.patch(`/owner/customers/${selectedCustomer.id}`, { notes });
      const res = await api.get(`/owner/customers/${selectedCustomer.id}`);
      setCustomerDetail(res.data);
      alert("Notes saved successfully!");
    } catch (e) {
      alert("Failed to save notes");
      console.error(e);
    }
  };

  useEffect(() => {
    if (!selectedCustomer) return;
    if (detailTab === "giftcard") {
      api.get(`/owner/customers/${selectedCustomer.id}/gift-cards`)
        .then(res => setCustomerGiftCards(res.data || []))
        .catch(e => console.error(e));
    }
    if (detailTab === "advance") {
      api.get(`/owner/customers/${selectedCustomer.id}/advance-payments`)
        .then(res => setCustomerAdvances(res.data || []))
        .catch(e => console.error(e));
    }
  }, [detailTab, selectedCustomer]);

  const handleContextMenuOpen = (event, appt, staffId, slot) => {
    event.preventDefault();
    event.stopPropagation();
    
    const menuWidth = 220;
    const menuHeight = 250;
    let x = event.clientX;
    let y = event.clientY;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    setContextMenu({ x, y, appt, staffId, slot });
  };

  const loadContext = async () => {
    try {
      const [contextResponse, settingsResponse] = await Promise.all([
        api.get("/owner/pos/context", { params: selectedBranchId ? { branchId: selectedBranchId } : {} }),
        api.get("/owner/settings")
      ]);
      setCustomers(contextResponse.data.customers || []);
      setServices(contextResponse.data.services || []);
      const staff = contextResponse.data.staffUsers || [];
      setStaffUsers(staff);
      const branches = contextResponse.data.branches || [];
      setBranches(branches);
      setSalonSettings(settingsResponse.data);
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
          to: endOfDay.toISOString(),
          branchId: selectedBranchId || undefined
        }
      });
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
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
              const rowIndex = (earliestHour - currentStartHour) * (60 / APPOINTMENT_SLOT_MINUTES);
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
  }, [selectedBranchId]);

  useEffect(() => {
    loadAppointments();
  }, [currentDate, selectedBranchId]);

  const handleDayChange = (offset) => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + offset);
    setCurrentDate(nextDate);
  };

  const setToday = () => setCurrentDate(new Date());

  const handleCellClick = (staffId, timeSlot) => {
    if (!isStaffWorkingAtSlot(staffId, timeSlot)) {
      setStatus({ error: `Warning: Selected time slot (${timeSlot}) is outside this staff member's scheduled roster hours.`, success: "" });
    } else {
      setStatus({ error: "", success: "" });
    }

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
        .calendar-cell.off-duty {
          background: #f1f5f9;
          background-image: repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px);
          cursor: pointer;
        }
        .calendar-cell.off-duty:hover {
          background: #e2e8f0;
          background-image: repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 10px, #e2e8f0 10px, #e2e8f0 20px);
        }
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
        .context-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: transparent;
        }
        .context-menu {
          position: fixed;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          width: 220px;
          max-height: 240px;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .context-menu::-webkit-scrollbar {
          width: 5px;
        }
        .context-menu::-webkit-scrollbar-track {
          background: transparent;
        }
        .context-menu::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 99px;
        }
        .context-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 150ms ease;
          border: 1px solid transparent;
        }
        .context-menu-item:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .context-menu-icon-wrapper {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }
        .context-menu-item.danger .context-menu-icon-wrapper {
          background: #fee2e2;
          color: #ef4444;
        }
        .context-menu-item.danger:hover {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #991b1b;
        }

        /* Customer Detail Slide-out Panel – Two-column layout */
        .cust-detail-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.25); backdrop-filter:blur(2px); z-index:2000; }
        .cust-detail-panel { position:fixed; top:0; right:0; bottom:0; width:min(95vw,900px); background:#fff; color:#0f172a; display:flex; flex-direction:column; z-index:2001; box-shadow:-8px 0 30px rgba(0,0,0,0.12); animation:slideInRight 0.25s ease-out; }
        @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
        .cust-detail-layout { display:flex; height:100%; overflow:hidden; }
        .cust-detail-sidebar { width:35%; background:#1e293b; color:#fff; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; }
        .cust-detail-sidebar::-webkit-scrollbar { width:4px; }
        .cust-detail-sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
        .cust-detail-sidebar-info { padding:20px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
        .cust-detail-sidebar-info-header { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
        .cust-detail-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#3b82f6,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:700; color:#fff; flex-shrink:0; }
        .cust-detail-name { font-size:1rem; font-weight:700; color:#fff; }
        .cust-detail-phone { font-size:0.8rem; color:#94a3b8; }
        .cust-detail-edit-btn { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:#94a3b8; border-radius:6px; padding:5px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; margin-left:auto; flex-shrink:0; }
        .cust-detail-edit-btn:hover { background:rgba(255,255,255,0.15); color:#e2e8f0; }
        .cust-detail-sidebar-fields { display:flex; flex-direction:column; gap:6px; }
        .cust-detail-field { display:flex; flex-direction:column; gap:1px; }
        .cust-detail-field-label { font-size:0.6rem; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
        .cust-detail-field-val { font-size:0.8rem; color:#cbd5e1; font-weight:500; }
        .cust-detail-sidebar-nav { display:flex; flex-direction:column; gap:2px; padding:8px; }
        .cust-detail-nav-btn { display:flex; align-items:center; gap:10px; padding:12px 16px; border:none; background:transparent; color:#94a3b8; font-size:0.82rem; font-weight:600; cursor:pointer; border-radius:8px; transition:all .15s; text-align:left; width:100%; }
        .cust-detail-nav-btn:hover { background:rgba(255,255,255,0.05); color:#e2e8f0; }
        .cust-detail-nav-btn.active { background:rgba(59,130,246,0.2); color:#60a5fa; }
        .cust-detail-content { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .cust-detail-content-header { padding:16px 20px; border-bottom:1px solid #e2e8f0; font-size:1.1rem; font-weight:700; color:#0f172a; display:flex; justify-content:space-between; align-items:center; background:#fff; flex-shrink:0; }
        .cust-detail-close { background:none; border:none; color:#94a3b8; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
        .cust-detail-close:hover { color:#dc2626; background:#fee2e2; }
        .cust-detail-content-body { flex:1; overflow-y:auto; padding:16px 20px; background:#fff; }
        .cust-detail-content-body::-webkit-scrollbar { width:4px; }
        .cust-detail-content-body::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
        .cust-detail-section { margin-bottom:20px; }
        .cust-detail-section-title { font-size:0.7rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px; font-weight:700; }
        .cust-profile-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:0.82rem; }
        .cust-profile-row:last-child { border-bottom:none; }
        .cust-profile-label { color:#64748b; font-weight:500; }
        .cust-profile-val { color:#0f172a; font-weight:600; text-align:right; max-width:55%; word-break:break-all; }
        .cust-order-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; transition:box-shadow .15s; }
        .cust-order-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.06); }
        .cust-order-card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
        .cust-order-invoice { font-size:0.82rem; font-weight:700; color:#2563eb; }
        .cust-order-date { font-size:0.72rem; color:#94a3b8; }
        .cust-order-amount { font-size:0.9rem; font-weight:700; color:#16a34a; }
        .cust-order-status { font-size:0.65rem; padding:2px 8px; border-radius:999px; font-weight:700; }
        .cust-order-status.PAID { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
        .cust-order-status.UNPAID { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .cust-order-status.PARTIAL { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
        .cust-order-status.CANCELLED { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }
        .cust-order-items { display:flex; flex-direction:column; gap:4px; }
        .cust-order-item { display:flex; justify-content:space-between; font-size:0.75rem; color:#475569; padding:3px 0; border-bottom:1px solid #f1f5f9; }
        .cust-order-item:last-child { border-bottom:none; }
        .cust-order-item-staff { font-size:0.65rem; color:#94a3b8; }
        .cust-membership-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
        .cust-mem-name { font-size:0.9rem; font-weight:700; color:#0f172a; }
        .cust-mem-status { font-size:0.65rem; padding:2px 8px; border-radius:999px; font-weight:700; display:inline-flex; }
        .cust-mem-status.ACTIVE { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
        .cust-mem-status.EXPIRED { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }
        .cust-mem-meta { font-size:0.75rem; color:#64748b; margin-top:4px; }
        .cust-pkg-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
        .cust-pkg-name { font-size:0.9rem; font-weight:700; color:#0f172a; }
        .cust-pkg-sessions { font-size:0.8rem; color:#d97706; font-weight:600; margin-top:4px; }
        .cust-pkg-meta { font-size:0.75rem; color:#64748b; margin-top:4px; }
        .cust-gift-card { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #bbf7d0; }
        .cust-gift-card.expired { background:#f8fafc; border-color:#e2e8f0; opacity:0.7; }
        .cust-gift-balance { font-size:1.1rem; font-weight:700; color:#16a34a; margin-top:6px; }
        .cust-advance-card { background:#f8fafc; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #e2e8f0; }
        .cust-due-card { background:#fef2f2; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #fecaca; }
        .cust-empty-state { color:#64748b; font-size:0.85rem; text-align:center; padding:40px 20px; }
        .cust-assign-btn { background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:0.85rem; font-weight:600; cursor:pointer; margin-top:12px; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
        .cust-assign-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(37,99,235,0.3); }
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
        <table className="calendar-table" style={{ minWidth: Math.max(900, filteredStaffUsers.length * 120 + 60) + "px" }}>
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
                      const isWorking = isStaffWorkingAtSlot(staff.id, slot);
                      return (
                        <td
                          key={`${slot}-${staff.id}`}
                          className={`calendar-cell${isWorking ? "" : " off-duty"}`}
                          onClick={() => handleCellClick(staff.id, slot)}
                          onContextMenu={(event) => handleContextMenuOpen(event, null, staff.id, slot)}
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
                                onContextMenu={(event) => handleContextMenuOpen(event, appt, staff.id, slot)}
                                onMouseEnter={(event) => handleMouseEnter(event, appt)}
                                onMouseLeave={() => setHoveredAppt(null)}
                                onMouseMove={(event) => handleMouseMove(event, appt)}
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
                      Confirmation Email
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.8rem", fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" className="styled-checkbox" checked={form.smsToOwner} onChange={(event) => setForm({ ...form, smsToOwner: event.target.checked })} />
                      Email To Owner
                    </label>
                  </div>
                )}
                {editMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button type="submit" className="sp-btn-primary" style={{ flex: 1 }}>Update</button>
                      {form.status !== "CANCELLED" && (
                        <button type="button" className="sp-btn-primary" style={{ flex: 1, background: "#f1f5f9", color: "#ef4444", border: "1px solid #ef4444" }} onClick={handleCancelAppointment}>Cancel Appointment</button>
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
          <div style={{ background: "white", borderRadius: 12, padding: 24, width: "100%", maxWidth: 450, boxShadow: "none", position: "relative" }}>
            <button type="button" onClick={() => setShowConfirmModal(false)} style={{ position: "absolute", top: 12, right: 12, background: "#f1f5f9", border: "none", borderRadius: "50%", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}><X size={16} /></button>
            <h3 style={{ color: "var(--accent, #3b82f6)", marginTop: 0, marginBottom: 16, fontSize: "1.1rem", fontWeight: 600 }}>{editMode ? "Confirm Update" : "Create & Confirm Appointment"}</h3>
            <p style={{ color: "#475569", fontSize: "0.95rem", marginBottom: 24 }}>{editMode ? "Are you sure you want to update these services?" : "Are you sure, you want to create & confirm an appointment?"}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button type="button" onClick={() => setShowConfirmModal(false)} style={{ padding: "8px 20px", border: "1px solid var(--accent, #3b82f6)", background: "#f1f5f9", color: "var(--accent, #3b82f6)", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "#e2e8f0"} onMouseOut={(e) => e.target.style.background = "#f1f5f9"}>NO</button>
              <button type="button" onClick={handleConfirmSubmit} style={{ padding: "8px 20px", border: "none", background: "var(--button-bg-solid, #3b82f6)", color: "white", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.target.style.background = "#2563eb"} onMouseOut={(e) => e.target.style.background = "#3b82f6"}>YES</button>
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

      {contextMenu && (
        <>
          <div className="context-menu-backdrop" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div 
            className="context-menu" 
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.appt ? (
              <>
                {contextMenu.appt.status !== "CHECKED_IN" && contextMenu.appt.status !== "COMPLETED" && (
                  <div className="context-menu-item" onClick={() => handleCheckInAction(contextMenu.appt.id)}>
                    <div className="context-menu-icon-wrapper">
                      <CheckCircle2 size={16} />
                    </div>
                    <span>Check In</span>
                  </div>
                )}
                
                <div className="context-menu-item" onClick={() => handleRescheduleAction(contextMenu.appt)}>
                  <div className="context-menu-icon-wrapper">
                    <Calendar size={16} />
                  </div>
                  <span>Reschedule Booking</span>
                </div>

                {contextMenu.appt.status !== "CANCELLED" && (
                  <div className="context-menu-item" onClick={() => handleCancelAction(contextMenu.appt.id)}>
                    <div className="context-menu-icon-wrapper">
                      <XCircle size={16} />
                    </div>
                    <span>Cancel Booking</span>
                  </div>
                )}

                <div className="context-menu-item" onClick={() => handleNewBookingAction(contextMenu.staffId, contextMenu.slot)}>
                  <div className="context-menu-icon-wrapper">
                    <PlusCircle size={16} />
                  </div>
                  <span>New Booking</span>
                </div>

                <div className="context-menu-item danger" onClick={() => handleDeleteAction(contextMenu.appt.id)}>
                  <div className="context-menu-icon-wrapper">
                    <Trash2 size={16} />
                  </div>
                  <span>Delete Service</span>
                </div>

                {contextMenu.appt.customerId && (
                  <div className="context-menu-item" onClick={() => handleViewProfileAction(contextMenu.appt.customerId)}>
                    <div className="context-menu-icon-wrapper">
                      <User size={16} />
                    </div>
                    <span>View Profile</span>
                  </div>
                )}
              </>
            ) : (
              <div className="context-menu-item" onClick={() => handleNewBookingAction(contextMenu.staffId, contextMenu.slot)}>
                <div className="context-menu-icon-wrapper">
                  <PlusCircle size={16} />
                </div>
                <span>New Booking</span>
              </div>
            )}
          </div>
        </>
      )}
      {/* Customer Detail Slide-out Panel – Two-Column Layout */}
      {selectedCustomer && (
        <>
          <div className="cust-detail-overlay" onClick={closeCustomerDetail} />
          <div className="cust-detail-panel">
            <div className="cust-detail-layout">
              {/* Left Sidebar */}
              <div className="cust-detail-sidebar">
                <div className="cust-detail-sidebar-info">
                  <div className="cust-detail-sidebar-info-header">
                    <div className="cust-detail-avatar">{(selectedCustomer.name || "?")[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="cust-detail-name">{selectedCustomer.name || "-"}</div>
                      <div className="cust-detail-phone">{selectedCustomer.phone}</div>
                    </div>
                  </div>
                  <div className="cust-detail-sidebar-fields">
                    {customerDetail && [
                      { label: "Email", val: customerDetail.email || "Not given" },
                      { label: "GSTIN", val: customerDetail.gst || "-" },
                      { label: "Gender", val: customerDetail.gender ? customerDetail.gender.charAt(0).toUpperCase() + customerDetail.gender.slice(1) : "-" },
                      { label: "Birth Date", val: customerDetail.dateOfBirth ? formatCompactDate(customerDetail.dateOfBirth) : "Not given" },
                      { label: "Anniversary", val: customerDetail.anniversary ? formatCompactDate(customerDetail.anniversary) : "Not given" },
                      { label: "Last Visited", val: customerDetail.lastVisitAt ? formatCompactDate(customerDetail.lastVisitAt) : "Not visited" },
                      { label: "Lifetime Visits", val: Number(customerDetail.totalOrders || 0) },
                      { label: "Loyalty Points", val: Number(customerDetail.loyaltyPoints || customerDetail.loyalty || 0) },
                      { label: "Referral Code", val: customerDetail.referralCode || "-" },
                    ].map(({ label, val }) => (
                      <div key={label} className="cust-detail-field">
                        <span className="cust-detail-field-label">{label}</span>
                        <span className="cust-detail-field-val">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <nav className="cust-detail-sidebar-nav">
                  {[
                    { key: "profile", icon: User, label: "Profile Info" },
                    { key: "orders", icon: FileText, label: "Orders" },
                    { key: "membership", icon: CreditCard, label: "Membership" },
                    { key: "giftcard", icon: Gift, label: "Gift Card" },
                    { key: "advance", icon: Wallet, label: "Advance" },
                    { key: "duebalance", icon: AlertCircle, label: "Due Balances" },
                    { key: "packages", icon: Package, label: "Packages" },
                    { key: "family", icon: Users, label: "Family Members" },
                    { key: "notes", icon: StickyNote, label: "Notes" },
                  ].map(({ key, icon: Icon, label }) => (
                    <button key={key} className={`cust-detail-nav-btn${detailTab === key ? " active" : ""}`} onClick={() => setDetailTab(key)}>
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right Content Panel */}
              <div className="cust-detail-content">
                <div className="cust-detail-content-header">
                  <span>
                    {[
                      { key: "profile", label: "Profile Info" },
                      { key: "orders", label: "Orders" },
                      { key: "membership", label: "Membership" },
                      { key: "giftcard", label: "Gift Card" },
                      { key: "advance", label: "Advance" },
                      { key: "duebalance", label: "Due Balances" },
                      { key: "packages", label: "Packages" },
                      { key: "family", label: "Family Members" },
                      { key: "notes", label: "Notes" },
                    ].find(t => t.key === detailTab)?.label || "Details"}
                  </span>
                  <button className="cust-detail-close" onClick={closeCustomerDetail}>
                    <X size={20} />
                  </button>
                </div>
                <div className="cust-detail-content-body">
                  {customerDetailLoading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading...</div>
                  ) : !customerDetail ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Could not load data</div>
                  ) : (
                    <>
                      {/* Profile Info Tab */}
                      {detailTab === "profile" && (
                        <div className="cust-detail-section">
                          {[
                            { label: "Name", val: customerDetail.name || "-" },
                            { label: "Phone", val: customerDetail.phone || "-" },
                            { label: "Email", val: customerDetail.email || "Not given yet!" },
                            { label: "GSTIN", val: customerDetail.gst || "-" },
                            { label: "Gender", val: customerDetail.gender ? customerDetail.gender.charAt(0).toUpperCase() + customerDetail.gender.slice(1) : "-" },
                            { label: "Birth Date", val: customerDetail.dateOfBirth ? formatCompactDate(customerDetail.dateOfBirth) : "Not given yet!" },
                            { label: "Anniversary", val: customerDetail.anniversary ? formatCompactDate(customerDetail.anniversary) : "Not given yet!" },
                            { label: "Last Visited", val: customerDetail.lastVisitAt ? formatCompactDate(customerDetail.lastVisitAt) : "Not visited yet!" },
                            { label: "Lifetime Visit Count", val: Number(customerDetail.totalOrders || 0) },
                            { label: "Loyalty Points", val: Number(customerDetail.loyaltyPoints || 0) },
                            { label: "Referral Code", val: customerDetail.referralCode || "-" },
                          ].map(({ label, val }) => (
                            <div key={label} className="cust-profile-row">
                              <span className="cust-profile-label">{label}</span>
                              <span className="cust-profile-val">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Orders Tab */}
                      {detailTab === "orders" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Order History ({(customerDetail.invoices || []).length})</div>
                          {(customerDetail.invoices || []).length === 0 ? (
                            <div className="cust-empty-state">No orders yet</div>
                          ) : (
                            (customerDetail.invoices || []).map(inv => (
                              <div key={inv.id} className="cust-order-card">
                                <div className="cust-order-card-head">
                                  <div>
                                    <div className="cust-order-invoice">Invoice #{inv.invoiceNumber}</div>
                                    <div className="cust-order-date">{new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                    <div className="cust-order-amount">{formatMoney(inv.total)}</div>
                                    <span className={`cust-order-status ${inv.status}`}>{inv.status}</span>
                                  </div>
                                </div>
                                {(inv.items || []).length > 0 && (
                                  <div className="cust-order-items">
                                    {inv.items.map((item, i) => (
                                      <div key={i} className="cust-order-item">
                                        <div>
                                          <div>{item.serviceName || item.productName || "Item"}</div>
                                          {item.staffName && <div className="cust-order-item-staff">Staff: {item.staffName}</div>}
                                        </div>
                                        <div>{formatMoney(item.lineTotal)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {inv.discountAmount > 0 && (
                                  <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#94a3b8" }}>
                                    Discount: {formatMoney(inv.discountAmount)}
                                  </div>
                                )}
                                {inv.paymode && (
                                  <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#94a3b8" }}>
                                    Paymode: {inv.paymode}
                                  </div>
                                )}
                                {Number(inv.balanceAmount || 0) > 0 && (
                                  <div style={{ marginTop: "8px", padding: "4px 8px", background: "#7f1d1d", borderRadius: "6px", fontSize: "0.72rem", color: "#fca5a5" }}>
                                    Balance Due: {formatMoney(inv.balanceAmount)}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Membership Tab */}
                      {detailTab === "membership" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Active Memberships</div>
                          {(customerDetail.memberships || []).length === 0 ? (
                            <div className="cust-empty-state">No active memberships</div>
                          ) : (
                            (customerDetail.memberships || []).map(m => {
                              const isActive = m.status === "ACTIVE" && new Date(m.endsAt) > new Date();
                              return (
                                <div key={m.id} className="cust-membership-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div className="cust-mem-name">{m.membershipPlan?.name || "Membership"}</div>
                                    <span className={`cust-mem-status ${isActive ? "ACTIVE" : "EXPIRED"}`}>{isActive ? "ACTIVE" : m.status}</span>
                                  </div>
                                  <div className="cust-mem-meta">
                                    Valid: {new Date(m.startsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })} → {new Date(m.endsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                                  </div>
                                  {m.remainingWalletValue != null && (
                                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                                      Wallet Balance: {formatMoney(m.remainingWalletValue)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Gift Card Tab */}
                      {detailTab === "giftcard" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Gift Cards</div>
                          {customerGiftCards.length === 0 ? (
                            <div className="cust-empty-state">No gift cards found</div>
                          ) : (
                            customerGiftCards.map((gc) => (
                              <div key={gc.id} className={`cust-gift-card${gc.status !== "ACTIVE" ? " expired" : ""}`}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{gc.code || "Gift Card"}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                                      {gc.expiresAt ? `Expires: ${formatCompactDate(gc.expiresAt)}` : "No expiry"}
                                    </div>
                                  </div>
                                  <span className={`cust-mem-status ${gc.status === "ACTIVE" ? "ACTIVE" : "EXPIRED"}`}>{gc.status || "UNKNOWN"}</span>
                                </div>
                                <div className="cust-gift-balance">Balance: {formatMoney(gc.balance || 0)}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Advance Tab */}
                      {detailTab === "advance" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Advance Balance</div>
                          <div className="cust-advance-card">
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Current Advance</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
                              {formatMoney(customerDetail.advanceAmount || 0)}
                            </div>
                          </div>
                          {customerAdvances.length > 0 && (
                            <>
                              <div className="cust-detail-section-title" style={{ marginTop: "16px" }}>Transaction History</div>
                              {customerAdvances.map((adv) => (
                                <div key={adv.id} className="cust-order-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatMoney(adv.amount)}</div>
                                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatCompactDate(adv.createdAt)}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                      <span className={`cust-order-status ${adv.type === "add" ? "PAID" : "UNPAID"}`}>
                                        {adv.type === "add" ? "ADDED" : "DEBITED"}
                                      </span>
                                      {adv.remark && <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>{adv.remark}</div>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}

                      {/* Due Balances Tab */}
                      {detailTab === "duebalance" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Due Balances</div>
                          {(() => {
                            const unpaidInvoices = (customerDetail.invoices || []).filter(inv => Number(inv.balanceAmount || 0) > 0);
                            if (unpaidInvoices.length === 0) {
                              return <div className="cust-empty-state">No outstanding balances</div>;
                            }
                            return unpaidInvoices.map(inv => (
                              <div key={inv.id} className="cust-due-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>Invoice #{inv.invoiceNumber}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatCompactDate(inv.createdAt)}</div>
                                  </div>
                                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>{formatMoney(inv.balanceAmount)}</div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}

                      {/* Packages Tab */}
                      {detailTab === "packages" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Packages ({(customerDetail.packages || []).length})</div>
                          {(customerDetail.packages || []).length === 0 ? (
                            <div className="cust-empty-state">No packages</div>
                          ) : (
                            (customerDetail.packages || []).map(p => {
                              const isActive = String(p.status) === "ACTIVE" && new Date(p.endsAt) > new Date();
                              return (
                                <div key={p.id} className="cust-pkg-card">
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div className="cust-pkg-name">{p.package?.name || "Package"}</div>
                                    <span className={`cust-mem-status ${isActive ? "ACTIVE" : "EXPIRED"}`}>{isActive ? "ACTIVE" : p.status}</span>
                                  </div>
                                  <div className="cust-pkg-sessions">Sessions Remaining: {p.remainingSessions ?? "-"}</div>
                                  <div className="cust-pkg-meta">
                                    Valid: {new Date(p.startsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })} → {new Date(p.endsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
                                  </div>
                                  {(p.package?.services || []).length > 0 && (
                                    <div style={{ marginTop: "10px" }}>
                                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase" }}>Services</div>
                                      {p.package.services.map((svc, i) => (
                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #e2e8f0" }}>
                                          <span>{svc.service?.name || "-"}</span>
                                          <span>{svc.sessions || 1} session{svc.sessions > 1 ? "s" : ""}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Family Members Tab */}
                      {detailTab === "family" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Family Members</div>
                          {(customerDetail.familyMembers || []).length === 0 ? (
                            <div className="cust-empty-state">
                              <Users size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
                              <div>No family members linked yet</div>
                            </div>
                          ) : (
                            (customerDetail.familyMembers || []).map((fm) => (
                              <div key={fm.id} className="cust-membership-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{fm.name}</div>
                                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fm.phone}</div>
                                  </div>
                                  <span className="cust-mem-status ACTIVE">Linked</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Notes Tab */}
                      {detailTab === "notes" && (
                        <div className="cust-detail-section">
                          <div className="cust-detail-section-title">Notes</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Add notes about this customer..."
                              rows={6}
                              style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                            />
                            <button className="cust-assign-btn" onClick={handleSaveNotes}>
                              <CheckCircle2 size={16} /> Save Notes
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {hoveredAppt && (
        <div style={tooltipStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "0.75rem", color: "#1e293b", marginBottom: "6px" }}>
            <span style={{ display: "inline-block", width: "12px", height: "8px", backgroundColor: getStatusColor(hoveredAppt.appt.status), border: "1px solid #000" }}></span>
            {String(hoveredAppt.appt.status || "CONFIRMED").toUpperCase()}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#1e293b", fontWeight: "500", marginBottom: "8px" }}>
            Guest: {hoveredAppt.appt.customer?.name || "Walk-in"}{hoveredAppt.appt.customer?.phone ? `, ${hoveredAppt.appt.customer.phone}` : ""}
          </div>
          <div>
            {(hoveredAppt.appt.items || []).map((item, idx) => {
              const serviceName = item.service?.name || services.find(s => s.id === item.serviceId)?.name || "Service";
              
              const staffIds = (item.assignedStaff || []).map(a => a.userSalonId).filter(Boolean);
              let staffName = "Staff";
              if (staffIds.length > 0) {
                staffName = staffIds.map(id => {
                  const s = staffUsers.find(su => su.id === id);
                  return s?.user?.name || s?.name || "Staff";
                }).join(", ");
              } else {
                const primaryId = hoveredAppt.appt.primaryStaffUserId;
                if (primaryId) {
                  const s = staffUsers.find(su => su.id === primaryId);
                  staffName = s?.user?.name || s?.name || "Staff";
                }
              }

              return (
                <div key={item.id || idx} style={{
                  background: "#ffffff",
                  border: `1px solid ${hoveredAppt.appt.itemId === item.id ? "#3b82f6" : "#cbd5e1"}`,
                  borderRadius: "4px",
                  padding: "6px 8px",
                  marginBottom: idx < (hoveredAppt.appt.items.length - 1) ? "6px" : "0px",
                  fontSize: "0.75rem",
                  color: "#334155",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  <div style={{ marginBottom: "2px" }}>Stylist: <span style={{ color: "#000" }}>{staffName}</span></div>
                  <div style={{ marginBottom: "2px" }}>Service: <span style={{ color: "#000" }}>{serviceName}</span></div>
                  <div>Timing: <span style={{ color: "#000" }}>{formatTimeForSelect(item.startAt)} to {formatTimeForSelect(item.endAt)}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
