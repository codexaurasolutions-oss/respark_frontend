import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { UserCircle, ShieldCheck, Mail, MapPin, Building, Sparkles, CheckCircle2 } from "lucide-react";

export default function MyProfilePage() {
  const [form, setForm] = useState({ phone: "", profileNote: "", avatarUrl: "" });
  const [services, setServices] = useState([]);
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
      setProfileMeta(response.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-scale { animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .p-card { background: white; border-radius: 24px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.02); }
        
        .p-input { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 15px; outline: none; transition: all 0.2s; background: #f8fafc; }
        .p-input:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .p-label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; }
        
        .p-btn { width: 100%; padding: 16px; border-radius: 12px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; border: none; background: #0f172a; color: white; margin-top: 16px; }
        .p-btn:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(15, 23, 42, 0.15); }
      `}</style>

      <ModuleTabs
        title="My Profile"
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard" },
          { label: "My Appointments", to: "/admin/my-appointments" },
          { label: "My Schedule", to: "/admin/my-schedule" },
          { label: "My Commission", to: "/admin/my-commission" },
          { label: "My Payroll", to: "/admin/my-payroll" },
          { label: "My Profile", to: "/admin/my-profile" }
        ]}
      />

      {loading ? <PageLoader title="Loading your profile" message="Preparing account details..." /> : (
        <div style={{ maxWidth: 1000, margin: "0 auto", marginTop: 40 }} className="anim-scale">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            
            {/* Editor Side */}
            <div className="p-card">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: form.avatarUrl ? `url(${form.avatarUrl}) center/cover` : "linear-gradient(135deg, #e0e7ff, #c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!form.avatarUrl && <UserCircle size={32} color="#4f46e5" />}
                </div>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 24, color: "#0f172a" }}>Profile Settings</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Keep your identity details current.</p>
                </div>
              </div>

              {status && <div style={{ background: "#dcfce7", color: "#166534", padding: "12px 16px", borderRadius: 12, marginBottom: 24, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={18} /> {status}</div>}

              <form onSubmit={async (e) => {
                e.preventDefault();
                await api.patch("/owner/my-profile", form);
                setStatus("Profile successfully updated.");
                setTimeout(() => setStatus(""), 3000);
              }} style={{ display: "grid", gap: 20 }}>
                <div>
                  <label className="p-label">Phone Number</label>
                  <input className="p-input" value={form.phone} placeholder="+91 9876543210" onChange={(e) => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="p-label">Avatar URL</label>
                  <input className="p-input" value={form.avatarUrl} placeholder="https://..." onChange={(e) => setForm({...form, avatarUrl: e.target.value})} />
                </div>
                <div>
                  <label className="p-label">Bio / Profile Note</label>
                  <textarea className="p-input" rows={4} value={form.profileNote} placeholder="A short bio about your expertise..." onChange={(e) => setForm({...form, profileNote: e.target.value})} />
                </div>
                <button className="p-btn">Save Changes</button>
              </form>
            </div>

            {/* Snapshot Side */}
            <div style={{ display: "grid", gap: 32 }}>
              <div className="p-card" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={20} color="#64748b" /> Account Snapshot</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><UserCircle size={18} color="#94a3b8" /> <div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Name</div><div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{profileMeta?.user?.name || "N/A"}</div></div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Mail size={18} color="#94a3b8" /> <div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Email</div><div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{profileMeta?.user?.email || "N/A"}</div></div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Sparkles size={18} color="#94a3b8" /> <div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Role</div><div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{profileMeta?.salonRole || "Staff"}</div></div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><MapPin size={18} color="#94a3b8" /> <div><div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Branch</div><div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{profileMeta?.branch?.name || "All branches"}</div></div></div>
                  
                  <div style={{ marginTop: 8, padding: "8px 12px", background: profileMeta?.showInCatalog ? "#dcfce7" : "#f1f5f9", color: profileMeta?.showInCatalog ? "#166534" : "#64748b", borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                    {profileMeta?.showInCatalog ? "Publicly visible in booking catalog" : "Hidden from public catalog"}
                  </div>
                </div>
              </div>

              <div className="p-card">
                <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={20} color="#6366f1" /> My Specialties</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {services.map((item) => <span key={item.id} style={{ background: "#f1f5f9", color: "#334155", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{item.service?.name}</span>)}
                  {!services.length && <div style={{ fontSize: 13, color: "#94a3b8" }}>No specialties assigned to you yet.</div>}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
