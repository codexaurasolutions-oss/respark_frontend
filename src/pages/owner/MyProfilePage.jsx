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
    });
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
          { label: "My Commission", to: "/admin/my-commission", hint: "Earnings" },
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
            await api.patch("/owner/my-profile", form);
            setStatus("Profile updated.");
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Phone</span>
              <IndianPhoneInput value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
            </label>
            <label>
              <span className="muted">Avatar URL</span>
              <input value={form.avatarUrl} placeholder="Avatar URL" onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} />
            </label>
            <textarea value={form.profileNote} placeholder="Profile note" onChange={(event) => setForm((current) => ({ ...current, profileNote: event.target.value }))} />
            <button>Save Profile</button>
            {status && <p className="success-text">{status}</p>}
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
            {attendanceHistory.slice(0, 5).map((row) => (
              <div key={row.id} className="list-item">
                <div className="item-head">
                  <strong>{new Date(row.attendanceDate || row.checkInAt).toLocaleDateString()}</strong>
                  <span className="badge">{row.status}</span>
                </div>
                <div className="item-meta">
                  {new Date(row.checkInAt).toLocaleTimeString()} {row.checkOutAt ? `- ${new Date(row.checkOutAt).toLocaleTimeString()}` : ""}
                </div>
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
