import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import IndianPhoneInput from "../../components/IndianPhoneInput";

export default function MyProfilePage() {
  const [form, setForm] = useState({ phone: "", profileNote: "", avatarUrl: "" });
  const [services, setServices] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [profileMeta, setProfileMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/owner/my-profile").then((response) => {
      setForm({
        phone: response.data?.phone || "",
        profileNote: response.data?.profileNote || "",
        avatarUrl: response.data?.avatarUrl || ""
      });
      setServices(response.data?.serviceAssignments || []);
      setAttendanceHistory(response.data?.attendanceHistory || []);
      setProfileMeta(response.data);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Profile"
        description="Staff-scoped profile, service assignment visibility, and basic personal workspace settings."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Overview" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Queue" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Profile</h1>
            <p style={{ marginBottom: 0 }}>Keep your staff identity, contact information, and service visibility current.</p>
          </div>
          <div className="badge-row">
            <span className="badge">{profileMeta?.salonRole || "Profile"}</span>
            <span className="badge">{services.length} services</span>

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Profile"
        description="Staff-scoped profile, service assignment visibility, and basic personal workspace settings."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Overview" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Queue" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Profile</h1>
            <p style={{ marginBottom: 0 }}>Keep your staff identity, contact information, and service visibility current.</p>
          </div>
          <div className="badge-row">
            <span className="badge">{profileMeta?.salonRole || "Profile"}</span>
            <span className="badge">{services.length} services</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your profile" message="Preparing account details, branch context, and service assignments." /> : (
      <div className="two-col">
        <div className="panel-card">
          <form onSubmit={async (event) => {
            event.preventDefault();
            try {
              await api.patch("/owner/my-profile", form);
              setStatus("Profile updated successfully.");
              setTimeout(() => setStatus(""), 3000);
            } catch (err) {
              setStatus("Failed to save profile.");
              setTimeout(() => setStatus(""), 3000);
            }
          }} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} onError={(e) => e.target.style.display = 'none'} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#94a3b8", border: "2px solid #e2e8f0" }}>👤</div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{profileMeta?.user?.name || "Your Profile"}</h3>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Update your photo and personal details</div>
              </div>
            </div>
            
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.9rem" }}>Phone Number</span>
              <IndianPhoneInput value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.9rem" }}>Avatar URL</span>
              <input type="text" className="input-field" value={form.avatarUrl} placeholder="https://example.com/photo.jpg" onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.9rem" }}>Profile Note / Bio</span>
              <textarea className="input-field" value={form.profileNote} placeholder="Share a brief bio or specialty..." onChange={(event) => setForm((current) => ({ ...current, profileNote: event.target.value }))} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", minHeight: 100, fontFamily: "inherit", resize: "vertical" }} />
            </label>
            
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <button type="submit" className="primary-button" style={{ padding: "10px 24px", minWidth: 140 }}>Save Changes</button>
              {status && <span style={{ color: status.includes("Failed") ? "#ef4444" : "#10b981", fontWeight: 500, fontSize: "0.9rem" }}>{status}</span>}
            </div>
          </form>
        </div>
        <div className="panel-card">
          <h3>Profile Snapshot</h3>
          <div className="item-meta">{profileMeta?.user?.name || "User"} | {profileMeta?.user?.email || "No email"}</div>
          <div className="item-meta">{profileMeta?.salonRole || "No salon role"} | {profileMeta?.branch?.name || "All branches"}</div>
          <div className="item-meta">{profileMeta?.showInCatalog ? "Visible in catalog" : "Hidden from catalog"}</div>
          <h3>Assigned Services</h3>
          <div className="badge-row">
            {services.map((item) => <span key={item.id} className="badge">{item.service?.name}</span>)}
            {!services.length && <EmptyState title="No service assignments yet" message="Assigned service specialties will appear here once linked to your staff profile." />}
          </div>
          <h3 style={{ marginTop: 18 }}>Recent Attendance</h3>
          <div className="list-stack">
            {attendanceHistory.slice(0, 10).map((row) => (
              <div key={row.id} className="list-item">
                <div className="item-head">
                  <strong>{new Date(row.attendanceDate || row.checkInAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</strong>
                  <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#dcfce7" : row.status === "LATE" ? "#fef9c3" : row.status === "HALF_DAY" ? "#ffedd5" : row.status === "LEAVE" ? "#ede9fe" : row.status === "WORKING" ? "#e0f2fe" : "#fee2e2", color: row.status === "PRESENT" || row.status === "COMPLETED_SHIFT" ? "#166534" : row.status === "LATE" ? "#854d0e" : row.status === "HALF_DAY" ? "#9a3412" : row.status === "LEAVE" ? "#5b21b6" : row.status === "WORKING" ? "#0369a1" : "#991b1b" }}>{row.status}</span>
                </div>
                <div className="item-meta">
                  {new Date(row.checkInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} {row.checkOutAt ? `- ${new Date(row.checkOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </div>
                {row.workedMinutes != null && (
                  <div className="item-meta" style={{ color: "#0ea5e9", fontWeight: 600 }}>Worked: {Math.floor(row.workedMinutes / 60)}h {row.workedMinutes % 60}m</div>
                )}
              </div>
            ))}
            {!attendanceHistory.length && <EmptyState title="No attendance yet" message="Your recent attendance history will appear here once you start checking in." />}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
