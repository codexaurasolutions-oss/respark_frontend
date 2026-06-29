import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyForm = { name: "", phone: "", email: "", address: "", businessHours: "", weeklyOff: "", latitude: "", longitude: "", geofenceRadiusMeters: "75" };

export default function BranchesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

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
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save branch"), success: "" });
    }
  };

  const archiveBranch = async (branchId) => {
    await api.patch(`/owner/branches/${branchId}/archive`);
    if (editingId === branchId) resetForm();
    await load();
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
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Branches</h1>
        <p className="muted" style={{ margin: 0, maxWidth: 800 }}>Manage salon locations, operating context, and outlet identity from one coordinated setup screen.</p>
      </div>

      <div className="settings-section-grid" style={{ gridTemplateColumns: "1fr 400px" }}>
        <div className="settings-panel-card">
          <h3 style={{ marginTop: 0, marginBottom: "20px" }}>{heading}</h3>
          <form onSubmit={submit} className="settings-form-grid">
            <label className="settings-input-group">
              <span className="muted">Branch name</span>
              <input required value={form.name} placeholder="e.g. Downtown Styluxe" onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Phone</span>
              <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            </label>
            <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Email</span>
              <input value={form.email} type="email" placeholder="e.g. downtown@styluxe.com" onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Address</span>
              <textarea rows={2} style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} value={form.address} placeholder="Full street address..." onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <div className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
              <span className="muted" style={{ display: "block", marginBottom: 6 }}>Business hours</span>
              <div style={{ display: "flex", gap: 12 }}>
                <select 
                  style={{ flex: 1 }}
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
                  style={{ flex: 1 }}
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
            <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Weekly off</span>
              <select value={form.weeklyOff} onChange={(event) => setForm({ ...form, weeklyOff: event.target.value })}>
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
            <label className="settings-input-group">
              <span className="muted">Latitude</span>
              <input value={form.latitude} placeholder="e.g. 24.8607" onChange={(event) => setForm({ ...form, latitude: event.target.value })} />
            </label>
            <label className="settings-input-group">
              <span className="muted">Longitude</span>
              <input value={form.longitude} placeholder="e.g. 67.0011" onChange={(event) => setForm({ ...form, longitude: event.target.value })} />
            </label>
            <label className="settings-input-group" style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Geofence radius (meters)</span>
              <input type="number" min="10" max="1000" value={form.geofenceRadiusMeters} onChange={(event) => setForm({ ...form, geofenceRadiusMeters: event.target.value })} />
            </label>
            <div className="form-actions" style={{ gridColumn: "1 / -1", marginTop: "16px" }}>
              <button type="submit">{editingId ? "Save Branch" : "Add Branch"}</button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setStatus({ error: "Location is not supported in this browser.", success: "", loading: false });
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setForm((current) => ({
                        ...current,
                        latitude: String(position.coords.latitude),
                        longitude: String(position.coords.longitude)
                      }));
                      setStatus((current) => ({ ...current, success: "Current branch location captured." }));
                    },
                    () => setStatus({ error: "Could not fetch current location.", success: "", loading: false })
                  );
                }}
              >
                Use Current Location
              </button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <div className="error-text" style={{ marginTop: 16 }}>{status.error}</div>}
          {status.success && <div className="success-text" style={{ marginTop: 16 }}>{status.success}</div>}
        </div>

        <div className="settings-panel-card" style={{ alignSelf: "start" }}>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Active Branches Directory</h3>
          <p className="muted" style={{ marginBottom: 20 }}>Branches drive POS selection, service availability, invoices, and payments.</p>
          
          <div className="settings-list-stack">
            {rows.map((branch) => (
              <div key={branch.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12, padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "16px" }}>{branch.name}</div>
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: 4 }}>
                      {branch.phone || "No phone"} • {branch.email || "No email"}
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="secondary-button" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => startEdit(branch)}>Edit</button>
                    <button type="button" className="danger-button" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => archiveBranch(branch.id)}>Arch</button>
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  <strong>Hours:</strong> {branch.businessHours || "Not set"} | <strong>Off:</strong> {branch.weeklyOff || "None"}
                </div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  <strong>Geo:</strong> {branch.latitude != null && branch.longitude != null ? `${branch.latitude}, ${branch.longitude}` : "Not set"} | <strong>Radius:</strong> {branch.geofenceRadiusMeters || 75}m
                </div>
                <div className="badge-row" style={{ marginTop: 4 }}>
                  <span className="badge" style={{ fontSize: "11px" }}>Users: {branch._count?.users || 0}</span>
                  <span className="badge" style={{ fontSize: "11px" }}>Services: {branch._count?.services || 0}</span>
                  <span className="badge" style={{ fontSize: "11px" }}>Invoices: {branch._count?.invoices || 0}</span>
                </div>
              </div>
            ))}
            {!status.loading && !rows.length && (
              <EmptyState
                title="No branches yet"
                message="Create the first branch to start assigning services, staff, inventory, and POS activity."
              />
            )}
            {status.loading && (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Loading branches...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

