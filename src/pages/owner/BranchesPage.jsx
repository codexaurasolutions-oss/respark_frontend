import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import MapPicker from "../../components/MapPicker";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import { useBranch } from "../../context/BranchContext";
import { Search, Plus, Edit3, Trash2, MapPin, X } from "lucide-react";

const emptyForm = { name: "", phone: "", email: "", address: "", businessHours: "", weeklyOff: "", latitude: "", longitude: "", geofenceRadiusMeters: "200" };

export default function BranchesPage() {
  const { refetch: refetchBranches } = useBranch();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [formKey, setFormKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");

  const heading = useMemo(() => (editingId ? "Update Branch" : "Create Branch"), [editingId]);

  const timeOptions = useMemo(() => {
    const options = [];
    for(let i=0; i<24; i++) {
      const h = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? "AM" : "PM";
      const hs = h < 10 ? `0${h}` : h;
      options.push(`${hs}:00 ${ampm}`);
      options.push(`${hs}:30 ${ampm}`);
    }
    return options;
  }, []);

  const load = async () => {
    const response = await api.get("/owner/branches");
    setRows(response.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    api.get("/owner/branches").then((response) => {
      if (active) {
        setRows(response.data);
        setStatus((current) => ({ ...current, loading: false }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setFormKey((k) => k + 1);
    setShowModal(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    const payload = {
      ...form,
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      geofenceRadiusMeters: form.geofenceRadiusMeters === "" ? null : Number(form.geofenceRadiusMeters)
    };
    try {
      if (editingId) {
        await api.patch(`/owner/branches/${editingId}`, payload);
        setStatus({ error: "", success: "Branch updated." });
      } else {
        await api.post("/owner/branches", payload);
        setStatus({ error: "", success: "Branch created." });
      }
      resetForm();
      await load();
      await refetchBranches();
    } catch (error) {
      console.error("[BranchForm] submit failed:", error);
      setStatus({ error: formatApiError(error, "Could not save branch"), success: "" });
    }
  };

  const deleteBranch = async (branchId) => {
    if (!window.confirm("Are you sure you want to delete this branch? It will be archived from the system.")) return;
    try {
      await api.patch(`/owner/branches/${branchId}/archive`);
      if (editingId === branchId) resetForm();
      await load();
      await refetchBranches();
    } catch (error) {
      console.error("Failed to delete branch:", error);
      alert("Failed to delete branch.");
    }
  };

  const startEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      phone: branch.phone || "",
      email: branch.email || "",
      address: branch.address || "",
      businessHours: branch.businessHours || "",
      weeklyOff: branch.weeklyOff || "",
      latitude: branch.latitude ?? "",
      longitude: branch.longitude ?? "",
      geofenceRadiusMeters: branch.geofenceRadiusMeters ?? "75"
    });
    setShowModal(true);
  };

  const filteredRows = rows.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    (r.phone && r.phone.includes(query)) || 
    (r.email && r.email.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="page-shell">
      <div className="page-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Branches</h1>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>Manage your salon locations, operating hours, and geofencing.</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={16} /> Add Branch
        </button>
      </div>

      <div className="panel-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", display: "flex", gap: 12, backgroundColor: "#fff" }}>
          <div style={{ flex: 1, maxWidth: 320, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: "#64748b" }} />
            <input 
              placeholder="Search branches..." 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13 }}>Branch Name</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13 }}>Contact Details</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13 }}>Timings</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13 }}>Location</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13 }}>Stats</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", fontSize: 13, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {status.loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading branches...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: "center" }}>
                    <EmptyState 
                      title="No branches found" 
                      message={query ? "No branches matched your search query." : "Create the first branch to start assigning services, staff, and inventory."} 
                    />
                  </td>
                </tr>
              ) : (
                filteredRows.map((branch) => (
                  <tr key={branch.id} style={{ borderBottom: "1px solid #f1f5f9" }} className="table-row-hover">
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{branch.name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, color: "#334155" }}>{branch.phone || "No phone"}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{branch.email || "No email"}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, color: "#334155" }}>{branch.businessHours || "Not set"}</div>
                      <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>{branch.weeklyOff ? `Off: ${branch.weeklyOff}` : "No weekly off"}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 13, color: "#475569" }}>
                        <MapPin size={14} style={{ marginTop: 2, flexShrink: 0, color: "#94a3b8" }} />
                        <span style={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {branch.address || "No address"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginLeft: 20 }}>
                        {branch.latitude && branch.longitude ? `Geo: ${branch.geofenceRadiusMeters}m radius` : "No geofence"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: 4, fontSize: 11, color: "#475569" }}>Users: {branch._count?.users || 0}</span>
                        <span style={{ padding: "2px 6px", backgroundColor: "#f1f5f9", borderRadius: 4, fontSize: 11, color: "#475569" }}>Services: {branch._count?.services || 0}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                        <button type="button" onClick={() => startEdit(branch)} className="icon-btn" style={{ padding: 6, color: "#64748b", background: "none", border: "none", cursor: "pointer" }} title="Edit Branch">
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => deleteBranch(branch.id)} className="icon-btn" style={{ padding: 6, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }} title="Delete Branch">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "#fff", width: "100%", maxWidth: 650, borderRadius: 12, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>{heading}</h3>
              <button type="button" onClick={resetForm} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              <form id="branch-form" onSubmit={submit} className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                <label className="settings-input-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Branch name <span style={{color: "#ef4444"}}>*</span></span>
                  <input required value={form.name} placeholder="e.g. Downtown Styluxe" onChange={(event) => setForm({ ...form, name: event.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </label>
                
                <label className="settings-input-group" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Phone</span>
                  <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                </label>
                
                <label className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Email</span>
                  <input value={form.email} type="email" placeholder="e.g. downtown@styluxe.com" onChange={(event) => setForm({ ...form, email: event.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </label>
                
                <label className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Address</span>
                  <textarea rows={2} style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} value={form.address} placeholder="Full street address..." onChange={(event) => setForm({ ...form, address: event.target.value })} />
                </label>
                
                <div className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Business hours</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <select 
                      style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                      value={form.businessHours.split(" - ")[0] || ""} 
                      onChange={(e) => {
                        const close = form.businessHours.split(" - ")[1] || "";
                        setForm({ ...form, businessHours: `${e.target.value}${close ? ` - ${close}` : " - "}` });
                      }}
                    >
                      <option value="">Open Time</option>
                      {timeOptions.map(t => <option key={`open-${t}`} value={t}>{t}</option>)}
                    </select>
                    <select 
                      style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                      value={form.businessHours.split(" - ")[1] || ""} 
                      onChange={(e) => {
                        const open = form.businessHours.split(" - ")[0] || "";
                        setForm({ ...form, businessHours: `${open ? `${open} - ` : " - "}${e.target.value}` });
                      }}
                    >
                      <option value="">Close Time</option>
                      {timeOptions.map(t => <option key={`close-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                
                <label className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Weekly off</span>
                  <select value={form.weeklyOff} onChange={(event) => setForm({ ...form, weeklyOff: event.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
                    <option value="">None / Open 7 days</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </label>
                
                <div className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Branch Location (Geofencing for Attendance)</span>
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
                    <MapPicker
                      key={formKey}
                      latitude={form.latitude}
                      longitude={form.longitude}
                      onChange={({ latitude, longitude }) => setForm({ ...form, latitude, longitude })}
                      address={form.address}
                      onAddressChange={(addr) => setForm({ ...form, address: addr })}
                    />
                  </div>
                </div>
                
                <label className="settings-input-group" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>Geofence radius (meters)</span>
                  <input type="number" min="10" max="1000" value={form.geofenceRadiusMeters} onChange={(event) => setForm({ ...form, geofenceRadiusMeters: event.target.value })} style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </label>
              </form>
              
              {status.error && <div style={{ marginTop: 16, padding: "10px 14px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: 6, fontSize: 13 }}>{status.error}</div>}
              {status.success && <div style={{ marginTop: 16, padding: "10px 14px", backgroundColor: "#f0fdf4", color: "#15803d", borderRadius: 6, fontSize: 13 }}>{status.success}</div>}
            </div>
            
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12, backgroundColor: "#f8fafc", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>
              <button type="submit" form="branch-form" className="primary-button">{editingId ? "Update Branch" : "Add Branch"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
