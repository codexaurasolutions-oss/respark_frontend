import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import ModuleTabs from "../../components/ModuleTabs";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { 
  Users, UserPlus, Phone, Mail, FileText, Share2, AlertCircle, CheckCircle2, 
  BarChart3, RefreshCw, Filter, CalendarClock, MessageSquare, Briefcase, Plus,
  Calendar, Edit3, Trash2, CheckSquare, Sparkles, MapPin, X
} from "lucide-react";

// Mapping between UI Status and DB Status
const mapStatusToDb = (uiStatus) => {
  switch (uiStatus) {
    case "New": return "NEW";
    case "Following up": return "INTERESTED";
    case "Cancelled": return "LOST";
    case "In progress": return "CONTACTED";
    case "Converted": return "CONVERTED";
    case "Duplicate": return "LOST";
    default: return "NEW";
  }
};

const mapStatusToUi = (dbStatus) => {
  switch (dbStatus) {
    case "NEW": return "New";
    case "INTERESTED": return "Following up";
    case "LOST": return "Cancelled";
    case "CONTACTED": return "In progress";
    case "CONVERTED": return "Converted";
    default: return dbStatus;
  }
};

// UI Status list for selections
const STATUS_OPTIONS = [
  "New",
  "Following up",
  "Cancelled",
  "In progress",
  "Converted",
  "Duplicate"
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  interestedServiceId: "",
  interestedBranchId: "",
  followUpAt: "",
  notes: "",
  priority: "Medium",
  status: "New"
};

export default function EnquiriesPage() {
  const location = useLocation();
  const { selectedBranchId } = useBranch();
  const [rows, setRows] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [report, setReport] = useState(null);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Filter States (matching screenshot)
  const [filterPhone, setFilterPhone] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  
  // Form and Modal States
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  // Status/Detail modal for actions
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const mode = location.pathname.includes("/follow-ups")
    ? "followUps"
    : location.pathname.includes("/reports")
      ? "reports"
      : "enquiries";

  // Load basic dropdown options (Services & Branches)
  const loadOptions = useCallback(async () => {
    try {
      const [servicesRes, branchesRes] = await Promise.all([
        api.get("/owner/services").catch(() => ({ data: [] })),
        api.get("/owner/branches").catch(() => ({ data: [] }))
      ]);
      setServices(servicesRes.data || []);
      setBranches(branchesRes.data || []);
      if (branchesRes.data?.length) {
        setForm(f => ({ ...f, interestedBranchId: branchesRes.data[0].id }));
      }
    } catch (e) {
      console.error("Failed to load options", e);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedBranchId) params.branchId = selectedBranchId;
      const [listResponse, reportResponse, followUpResponse] = await Promise.all([
        api.get("/owner/enquiries", { params }),
        api.get("/owner/enquiries/reports", { params }),
        api.get("/owner/enquiries/follow-ups", { params }).catch(() => ({ data: [] }))
      ]);
      
      setRows(listResponse.data || []);
      setReport(reportResponse.data || null);
      setFollowUps(followUpResponse.data || []);
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load enquiries module"), success: "" });
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    void loadOptions();
    void load();
  }, [load, loadOptions, selectedBranchId]);

  // Handle Save
  const save = async (event) => {
    event.preventDefault();
    if (!form.name || !form.phone || !form.interestedServiceId) {
      setStatus({ error: "Please fill in all required fields (*)", success: "" });
      return;
    }

    try {
      setIsSubmitting(true);
      // Payload format
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        source: "PHONE", // default enum
        interestedServiceId: form.interestedServiceId || null,
        interestedBranchId: form.interestedBranchId || null,
        priority: form.priority.toUpperCase(),
        followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
        notes: form.notes || null
      };

      const res = await api.post("/owner/enquiries", payload);
      const newEnquiryId = res.data?.id;

      // If status is not "New", trigger status update API call
      if (newEnquiryId && form.status !== "New") {
        await api.patch(`/owner/enquiries/${newEnquiryId}/status`, {
          status: mapStatusToDb(form.status),
          note: `Initial status set to ${form.status}`
        });
      }

      setForm(emptyForm);
      if (branches.length) {
        setForm(f => ({ ...f, interestedBranchId: branches[0].id }));
      }
      setShowModal(false);
      setStatus({ error: "", success: "Enquiry successfully captured." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save enquiry"), success: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert to customer logic
  const handleConvertToCustomer = async (enquiry) => {
    if (!window.confirm(`Convert ${enquiry.name} to a salon customer?`)) return;
    try {
      await api.post(`/owner/enquiries/${enquiry.id}/convert-to-customer`);
      setStatus({ error: "", success: `${enquiry.name} has been converted to a Customer successfully!` });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not convert enquiry to customer"), success: "" });
    }
  };

  // Update Status logic
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry || !newStatus) return;
    try {
      await api.patch(`/owner/enquiries/${selectedEnquiry.id}/status`, {
        status: mapStatusToDb(newStatus),
        note: actionNotes || `Status updated to ${newStatus}`
      });
      setShowActionModal(false);
      setActionNotes("");
      setSelectedEnquiry(null);
      setStatus({ error: "", success: "Enquiry status updated successfully." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to update status"), success: "" });
    }
  };

  // Filter local rows based on inputs
  const filteredRows = rows.filter(row => {
    // Mobile No. search
    if (filterPhone.trim() && !row.phone.includes(filterPhone.trim())) {
      return false;
    }
    // Date from/to search
    const createdAt = new Date(row.createdAt);
    if (filterFromDate) {
      const from = new Date(filterFromDate);
      from.setHours(0, 0, 0, 0);
      if (createdAt < from) return false;
    }
    if (filterToDate) {
      const to = new Date(filterToDate);
      to.setHours(23, 59, 59, 999);
      if (createdAt > to) return false;
    }
    return true;
  });

  const getPriorityColor = (p) => {
    switch (String(p).toUpperCase()) {
      case "HIGH": return { bg: "#fee2e2", text: "#991b1b" };
      case "MEDIUM": return { bg: "#fef3c7", text: "#92400e" };
      case "LOW": return { bg: "#dbeafe", text: "#1e40af" };
      default: return { bg: "#f1f5f9", text: "#475569" };
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'NEW': return { bg: '#dbeafe', text: '#1e40af' };
      case 'CONTACTED': return { bg: '#fef3c7', text: '#b45309' };
      case 'INTERESTED': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'CONVERTED': return { bg: '#dcfce7', text: '#15803d' };
      case 'LOST': return { bg: '#fee2e2', text: '#b91c1c' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        
        .eq-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s; }
        
        .eq-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; }
        .eq-input:focus { border-color: #3b82f6; box-shadow: none; }
        .eq-label { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .eq-btn { padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .eq-btn-primary { background: #1e88e5; color: white; box-shadow: none; }
        .eq-btn-primary:hover { transform: translateY(-1px); background: #1565c0; box-shadow: none; }
        
        .eq-btn-secondary { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; }
        .eq-btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }

        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

        .enquiries-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .enquiries-table th { background: #f8fafc; padding: 14px 20px; font-weight: 700; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; letter-spacing: 0.5px; }
        .enquiries-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; vertical-align: middle; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1200; backdrop-filter: blur(4px); }
        .modal-content { background: white; border-radius: 16px; width: 95%; max-width: 750px; padding: 28px; box-shadow: none; animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .filter-bar { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 24px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 24px; }
        .filter-group { display: flex; align-items: center; gap: 8px; }
        .filter-group label { font-size: 14px; font-weight: 600; color: #475569; white-space: nowrap; }
        
        .empty-records-container { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 60px 20px; text-align: center; color: #64748b; font-weight: 600; font-size: 18px; background: #fafafa; }
      `}</style>

      <ModuleTabs
        title="Enquiries"
        items={[
          { label: "Enquiries", to: "/admin/enquiries" },
          { label: "Follow-Ups", to: "/admin/enquiries/follow-ups" },
          { label: "Reports", to: "/admin/enquiries/reports" }
        ]}
      />

      {status.error && <div className="anim-fade" style={{ background: "#fee2e2", color: "#991b1b", padding: "14px 20px", borderRadius: 10, marginBottom: 20, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div className="anim-fade" style={{ background: "#dcfce7", color: "#166534", padding: "14px 20px", borderRadius: 10, marginBottom: 20, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={20} /> {status.success}</div>}

      {mode === "enquiries" && (
        <div className="anim-fade">
          {/* ── FILTER BAR (Matching Screenshot 1) ── */}
          <div className="filter-bar">
            <div className="filter-group" style={{ flex: "1 1 200px" }}>
              <input 
                type="text" 
                className="eq-input" 
                placeholder="Mobile No."
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>From :</label>
              <input 
                type="date" 
                className="eq-input" 
                style={{ width: "160px" }}
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                max={filterToDate || undefined}
              />
            </div>

            <div className="filter-group">
              <label>To :</label>
              <input 
                type="date" 
                className="eq-input" 
                style={{ width: "160px" }}
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                min={filterFromDate || undefined}
              />
            </div>

            <button className="eq-btn eq-btn-secondary" style={{ height: "40px" }} onClick={() => { setFilterPhone(""); setFilterFromDate(""); setFilterToDate(""); }}>
              <RefreshCw size={15} />
            </button>

            <button 
              className="eq-btn eq-btn-primary" 
              style={{ marginLeft: "auto", background: "#0284c7" }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} /> Add Enquiry
            </button>
          </div>

          {/* ── ENQUIRIES TABLE OR EMPTY STATE ── */}
          {loading ? (
            <PageLoader compact title="Loading enquiries pipeline..." />
          ) : filteredRows.length === 0 ? (
            <div className="empty-records-container">
              No Records Available
            </div>
          ) : (
            <div className="eq-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="enquiries-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client Name</th>
                      <th>Mobile</th>
                      <th>Email</th>
                      <th>Service Interested</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <strong>{row.name}</strong>
                          {row.notes && <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "normal", marginTop: "4px" }}>{row.notes}</div>}
                        </td>
                        <td>{row.phone}</td>
                        <td>{row.email || "-"}</td>
                        <td>{row.interestedService?.name || "General"}</td>
                        <td>
                          <span style={{ 
                            padding: "3px 8px", 
                            borderRadius: "12px", 
                            fontSize: "11px", 
                            fontWeight: "700",
                            background: getPriorityColor(row.priority).bg,
                            color: getPriorityColor(row.priority).text
                          }}>
                            {row.priority}
                          </span>
                        </td>
                        <td>
                          <span className="status-pill" style={{ 
                            background: getStatusColor(row.status).bg, 
                            color: getStatusColor(row.status).text 
                          }}>
                            {mapStatusToUi(row.status)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                              className="eq-btn eq-btn-secondary" 
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => {
                                setSelectedEnquiry(row);
                                setNewStatus(mapStatusToUi(row.status));
                                setActionNotes("");
                                setShowActionModal(true);
                              }}
                              title="Update Status / Action"
                            >
                              <Edit3 size={13} /> Status
                            </button>
                            {row.status !== "CONVERTED" && (
                              <button 
                                className="eq-btn eq-btn-primary" 
                                style={{ padding: "4px 8px", fontSize: "12px", background: "#10b981", boxShadow: "none" }}
                                onClick={() => handleConvertToCustomer(row)}
                                title="Convert to Customer"
                              >
                                <CheckSquare size={13} /> Convert
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS MODE ── */}
      {mode === "reports" && report && (
        <div className="anim-fade delay-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="eq-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", border: "none" }}>
            <BarChart3 size={32} color="#818cf8" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>Total Leads Captured</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>{report.total || 0}</div>
          </div>
          <div className="eq-card" style={{ background: "linear-gradient(135deg, #16a34a, #14532d)", color: "white", border: "none" }}>
            <CheckCircle2 size={32} color="#86efac" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#bbf7d0", marginBottom: 8 }}>Successfully Converted</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>{report.converted || 0}</div>
          </div>
        </div>
      )}

      {/* ── FOLLOW-UPS MODE ── */}
      {mode === "followUps" && (
        <div className="eq-card anim-fade delay-1" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><CalendarClock size={20} color="#f59e0b" /> Scheduled Follow-Ups</h3>
          </div>
          <div>
            {loading ? <PageLoader compact title="Loading Follow-ups..." /> : followUps.map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 4 }}>{row.enquiry?.name || "Enquiry Follow-Up"}</strong>
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} /> {row.enquiry?.phone || "No phone"}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{row.note || "Follow-up recorded"}</div>
                </div>
                <div style={{ background: "#fef3c7", color: "#b45309", padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarClock size={16} /> {new Date(row.dueAt || row.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {!loading && !followUps.length && <div style={{ padding: 40 }}><EmptyState title="No follow-ups scheduled" message="Lead callbacks and reminders will appear here once assigned." /></div>}
          </div>
        </div>
      )}

      {/* ── ADD ENQUIRY MODAL (Matching Screenshot 2 & 3) ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>Add Enquiry</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            
            <form onSubmit={save}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                
                {/* Follow Up Date */}
                <div>
                  <label className="eq-label">Follow Up Date</label>
                  <input 
                    type="date" 
                    className="eq-input"
                    value={form.followUpAt}
                    onChange={(e) => setForm({ ...form, followUpAt: e.target.value })}
                  />
                </div>

                {/* Mobile No. * */}
                <div>
                  <label className="eq-label">Mobile No. *</label>
                  <IndianPhoneInput
                    value={form.phone}
                    onChange={(val) => setForm({ ...form, phone: val })}
                    className="eq-input"
                    style={{ border: "none", borderRadius: 0, padding: 0 }}
                  />
                </div>

                {/* Name * */}
                <div>
                  <label className="eq-label">Name *</label>
                  <input 
                    type="text" 
                    className="eq-input"
                    required
                    placeholder="Enter Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="eq-label">Email</label>
                  <input 
                    type="email" 
                    className="eq-input"
                    placeholder="Enter Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {/* Service * */}
                <div style={{ gridColumn: "span 2" }}>
                  <label className="eq-label">Service *</label>
                  <select 
                    className="eq-input"
                    required
                    value={form.interestedServiceId}
                    onChange={(e) => setForm({ ...form, interestedServiceId: e.target.value })}
                  >
                    <option value="">Select Service</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description / Notes */}
                <div style={{ gridColumn: "span 2" }}>
                  <label className="eq-label">Description</label>
                  <textarea 
                    className="eq-input"
                    rows={3}
                    placeholder="Enter Description"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="eq-label">Priority</label>
                  <select 
                    className="eq-input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="eq-label">Status</label>
                  <select 
                    className="eq-input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button type="button" className="eq-btn eq-btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                <button type="submit" className="eq-btn eq-btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPDATE STATUS MODAL ── */}
      {showActionModal && selectedEnquiry && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>Update Enquiry Status</h2>
              <button onClick={() => setShowActionModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUpdateStatusSubmit}>
              <div style={{ display: "grid", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="eq-label">Client Name</label>
                  <input type="text" className="eq-input" disabled value={selectedEnquiry.name} />
                </div>
                <div>
                  <label className="eq-label">New Status</label>
                  <select 
                    className="eq-input"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="eq-label">Notes / Action Summary</label>
                  <textarea 
                    className="eq-input"
                    rows={3}
                    placeholder="Enter details about follow-up call, conversion, or cancellation"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button type="button" className="eq-btn eq-btn-secondary" onClick={() => setShowActionModal(false)}>Cancel</button>
                <button type="submit" className="eq-btn eq-btn-primary">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
