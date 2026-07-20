import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import IndianPhoneInput from "../../components/IndianPhoneInput";

const statusConfig = {
  PRESENT: { bg: "#dcfce7", color: "#166534", label: "Present" },
  COMPLETED_SHIFT: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  LATE: { bg: "#fef9c3", color: "#854d0e", label: "Late" },
  HALF_DAY: { bg: "#ffedd5", color: "#9a3412", label: "Half Day" },
  LEAVE: { bg: "#ede9fe", color: "#5b21b6", label: "Leave" },
  WORKING: { bg: "#e0f2fe", color: "#0369a1", label: "Working" },
  ABSENT: { bg: "#fee2e2", color: "#991b1b", label: "Absent" },
};

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ width: 32, height: 32, background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{value}</div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const [form, setForm] = useState({ phone: "", profileNote: "", avatarUrl: "" });
  const [services, setServices] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [profileMeta, setProfileMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

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

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch("/owner/my-profile", form);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const name = profileMeta?.user?.name || "Your Profile";
  const email = profileMeta?.user?.email || "";
  const role = profileMeta?.salonRole || "STAFF";
  const branch = profileMeta?.branch?.name || "All Branches";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

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

      {loading ? (
        <PageLoader title="Loading your profile" message="Preparing account details, branch context, and service assignments." />
      ) : (
        <>
          {/* Profile Hero Banner */}
          <div style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #1e1b4b 100%)",
            borderRadius: 20,
            padding: "32px 36px",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden"
          }}>
            {/* decorative circles */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,92,246,0.08)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, right: 80, width: 160, height: 160, borderRadius: "50%", background: "rgba(59,130,246,0.06)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative", zIndex: 1 }}>
              {/* Avatar */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                {form.avatarUrl && !imgError ? (
                  <img
                    src={form.avatarUrl}
                    alt={name}
                    onError={() => setImgError(true)}
                    style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
                  />
                ) : (
                  <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff", border: "3px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                    {initials || "👤"}
                  </div>
                )}
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "#10b981", border: "2px solid #0f172a" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{name}</h1>
                <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 12 }}>{email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(59,130,246,0.3)" }}>
                    {role}
                  </span>
                  <span style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(139,92,246,0.3)" }}>
                    📍 {branch}
                  </span>
                  <span style={{ background: profileMeta?.showInCatalog ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)", color: profileMeta?.showInCatalog ? "#6ee7b7" : "#94a3b8", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${profileMeta?.showInCatalog ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.3)"}` }}>
                    {profileMeta?.showInCatalog ? "🌐 Visible in catalog" : "🔒 Hidden from catalog"}
                  </span>
                  <span style={{ background: "rgba(245,158,11,0.15)", color: "#fcd34d", padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid rgba(245,158,11,0.25)" }}>
                    🎯 {services.length} services
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>
            {/* Left: Edit Form */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}>
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>✏️</span> Edit Profile
                </h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Update your contact info and bio</p>
              </div>

              <form onSubmit={handleSave} style={{ display: "grid", gap: 20 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Phone Number</span>
                  <IndianPhoneInput value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Avatar / Photo URL</span>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={form.avatarUrl}
                      placeholder="https://example.com/your-photo.jpg"
                      onChange={(event) => { setForm((current) => ({ ...current, avatarUrl: event.target.value })); setImgError(false); }}
                      style={{ width: "100%", padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#1e293b", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                      onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                      onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>
                  {form.avatarUrl && !imgError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                      <img src={form.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} onError={() => setImgError(true)} />
                      <span style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>✓ Image preview looks good</span>
                    </div>
                  )}
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Bio / Profile Note</span>
                  <textarea
                    value={form.profileNote}
                    placeholder="Share your expertise, specialties, or a short intro about yourself..."
                    onChange={(event) => setForm((current) => ({ ...current, profileNote: event.target.value }))}
                    style={{ padding: "12px 16px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", minHeight: 110, resize: "vertical", outline: "none", color: "#1e293b", lineHeight: 1.6, transition: "border-color 0.2s" }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                  />
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: "12px 32px", background: saving ? "#93c5fd" : "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.25)", transition: "all 0.2s" }}
                  >
                    {saving ? "Saving..." : "💾 Save Changes"}
                  </button>
                  {status === "success" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#059669", fontWeight: 700, fontSize: 14, background: "#ecfdf5", padding: "8px 16px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                      ✓ Profile updated!
                    </span>
                  )}
                  {status === "error" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#dc2626", fontWeight: 700, fontSize: 14, background: "#fef2f2", padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca" }}>
                      ✗ Could not save
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Right: Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Profile Info */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🪪</span> Profile Snapshot
                </h3>
                <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 12 }}>Your current account identity</p>
                <InfoRow icon="👤" label="Full Name" value={profileMeta?.user?.name || "—"} />
                <InfoRow icon="📧" label="Email" value={profileMeta?.user?.email || "—"} />
                <InfoRow icon="🏷️" label="Role" value={role} />
                <InfoRow icon="📍" label="Branch" value={branch} />
                <InfoRow icon="🌐" label="Catalog visibility" value={profileMeta?.showInCatalog ? "Visible to customers" : "Hidden from catalog"} />
              </div>

              {/* Assigned Services */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🎯</span> Assigned Services
                  <span style={{ marginLeft: "auto", background: "#eff6ff", color: "#3b82f6", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 12 }}>{services.length}</span>
                </h3>
                <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 12 }}>Services you are linked to perform</p>
                {services.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {services.map((item) => (
                      <span key={item.id} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        ✓ {item.service?.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No service assignments yet" message="Assigned service specialties will appear here once linked to your staff profile." />
                )}
              </div>

              {/* Recent Attendance */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", border: "1px solid rgba(226,232,240,0.8)" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📅</span> Recent Attendance
                </h3>
                <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 12 }}>Last 10 attendance records</p>
                {attendanceHistory.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {attendanceHistory.slice(0, 10).map((row) => {
                      const cfg = statusConfig[row.status] || statusConfig.ABSENT;
                      return (
                        <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                              {new Date(row.attendanceDate || row.checkInAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {new Date(row.checkInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              {row.checkOutAt ? ` → ${new Date(row.checkOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : " (ongoing)"}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                            {row.workedMinutes != null && (
                              <span style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 600 }}>
                                {Math.floor(row.workedMinutes / 60)}h {row.workedMinutes % 60}m
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="No attendance yet" message="Your recent attendance history will appear here once you start checking in." />
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
