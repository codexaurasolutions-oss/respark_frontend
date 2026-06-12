import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

/* ─── config ─────────────────────────────────────── */
const MODULE_GROUPS = [
  {
    group: "Core Operations",
    color: "#3b82f6",
    modules: ["dashboard", "appointments", "pos", "customers", "invoices", "payments"],
  },
  {
    group: "Salon Setup",
    color: "#8b5cf6",
    modules: ["branches", "services", "staff", "staffSchedule", "inventory", "purchases"],
  },
  {
    group: "Business",
    color: "#f59e0b",
    modules: ["memberships", "packages", "reports", "support", "settings"],
  },
  {
    group: "My Portal",
    color: "#10b981",
    modules: ["myDashboard", "myAppointments", "mySchedule", "myCommission", "myPayroll", "myProfile"],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);
const ACTIONS = ["view", "create", "edit", "delete", "approve", "pay"];

const ACTION_META = {
  view:    { label: "View",    color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  create:  { label: "Create",  color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  edit:    { label: "Edit",    color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  delete:  { label: "Delete",  color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  approve: { label: "Approve", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  pay:     { label: "Pay",     color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8" },
};

const pretty = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

/* ─── PermissionChip ──────────────────────────────── */
function PermissionChip({ action, checked, onChange, disabled }) {
  const m = ACTION_META[action] || { label: action, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={m.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.18s",
        border: `1.5px solid ${checked ? m.border : "#e2e8f0"}`,
        background: checked ? m.bg : "#f8fafc",
        color: checked ? m.color : "#94a3b8",
        opacity: disabled ? 0.6 : 1,
        userSelect: "none",
        boxShadow: checked ? `0 0 0 1px ${m.border}` : "none",
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: checked ? m.color : "#cbd5e1",
        flexShrink: 0,
        transition: "background 0.18s",
      }} />
      {m.label}
    </button>
  );
}

/* ─── ModulePermRow ───────────────────────────────── */
function ModulePermRow({ moduleKey, permissions, onToggle, disabled, groupColor }) {
  const current = Array.isArray(permissions?.[moduleKey]) ? permissions[moduleKey] : [];
  const allChecked = ACTIONS.every((a) => current.includes(a));

  const toggleAll = () => {
    ACTIONS.forEach((a) => {
      const has = current.includes(a);
      if (allChecked ? has : !has) onToggle(moduleKey, a);
    });
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "10px 14px",
      borderRadius: 8,
      background: "#fafafa",
      border: "1px solid #f1f5f9",
      gap: 12,
      flexWrap: "wrap",
    }}>
      {/* module name */}
      <div style={{ minWidth: 130, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: groupColor, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
          {pretty(moduleKey)}
        </span>
      </div>

      {/* action chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
        {ACTIONS.map((action) => (
          <PermissionChip
            key={action}
            action={action}
            checked={current.includes(action)}
            onChange={() => onToggle(moduleKey, action)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* select all toggle */}
      <button
        type="button"
        onClick={toggleAll}
        disabled={disabled}
        style={{
          fontSize: 11,
          color: allChecked ? "#ef4444" : "#3b82f6",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          padding: "4px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}
      >
        {allChecked ? "Clear All" : "All"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function StaffRolesPage() {
  const [rows, setRows]               = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [savingId, setSavingId]       = useState("");
  const [editingRoleId, setEditingRoleId] = useState("");
  const [loading, setLoading]         = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: { dashboard: ["view"] },
  });

  const load = async () => {
    const [rowsRes, rolesRes] = await Promise.all([
      api.get("/owner/roles-permissions"),
      api.get("/owner/custom-roles"),
    ]);
    setRows(rowsRes.data);
    setCustomRoles(rolesRes.data);
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/owner/roles-permissions"), api.get("/owner/custom-roles")])
      .then(([rowsRes, rolesRes]) => {
        if (!active) return;
        setRows(rowsRes.data);
        setCustomRoles(rolesRes.data);
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const togglePermission = async (row, moduleKey, action) => {
    setSavingId(row.id);
    const current   = row.permissions || {};
    const curActs   = Array.isArray(current[moduleKey]) ? current[moduleKey] : [];
    const nextActs  = curActs.includes(action)
      ? curActs.filter((a) => a !== action)
      : [...curActs, action];
    const nextPerms = { ...current, [moduleKey]: nextActs };
    await api.patch(`/owner/users/${row.id}`, { permissions: nextPerms });
    await load();
    setSavingId("");
  };

  const toggleAll = async (row, moduleKey, forceAll) => {
    setSavingId(row.id);
    const current  = row.permissions || {};
    const nextPerms = { ...current, [moduleKey]: forceAll ? [...ACTIONS] : [] };
    await api.patch(`/owner/users/${row.id}`, { permissions: nextPerms });
    await load();
    setSavingId("");
  };

  const toggleStatus = async (row) => {
    setSavingId(row.id);
    await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
    await load();
    setSavingId("");
  };

  const saveRole = async (e) => {
    e.preventDefault();
    const payload = {
      name: roleForm.name,
      description: roleForm.description,
      permissions: roleForm.permissions,
    };
    if (editingRoleId) {
      await api.patch(`/owner/custom-roles/${editingRoleId}`, payload);
    } else {
      await api.post("/owner/custom-roles", payload);
    }
    setEditingRoleId("");
    setRoleForm({ name: "", description: "", permissions: { dashboard: ["view"] } });
    await load();
  };

  const toggleRolePermission = (moduleKey, action) => {
    const current = Array.isArray(roleForm.permissions?.[moduleKey]) ? roleForm.permissions[moduleKey] : [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    setRoleForm((f) => ({ ...f, permissions: { ...f.permissions, [moduleKey]: next } }));
  };

  const toggleRoleModuleAll = (moduleKey) => {
    const current = Array.isArray(roleForm.permissions?.[moduleKey]) ? roleForm.permissions[moduleKey] : [];
    const allChecked = ACTIONS.every((a) => current.includes(a));
    setRoleForm((f) => ({ ...f, permissions: { ...f.permissions, [moduleKey]: allChecked ? [] : [...ACTIONS] } }));
  };

  const startRoleEdit = (role) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || {},
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .srp-container { display:flex; height:calc(100vh - 108px); background:#f1f5f9; font-family:'Inter',system-ui,sans-serif; }
        .srp-sidebar { width:280px; background:white; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; }
        .srp-sidebar-header { padding:24px 20px 16px; border-bottom:1px solid #f1f5f9; }
        .srp-sidebar-header h2 { margin:0; font-size:17px; font-weight:700; color:#0f172a; }
        .srp-sidebar-header p { margin:4px 0 0; font-size:12px; color:#94a3b8; }
        .srp-create-btn { width:100%; margin-top:14px; padding:10px; background:#0f172a; color:white; border:none; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; letter-spacing:0.3px; transition:background .2s; }
        .srp-create-btn:hover { background:#1e293b; }
        .srp-role-item { display:flex; flex-direction:column; padding:14px 20px; border:none; background:transparent; border-bottom:1px solid #f8fafc; cursor:pointer; text-align:left; width:100%; transition:background .15s; }
        .srp-role-item:hover { background:#f8fafc; }
        .srp-role-item.active { background:#eff6ff; border-left:3px solid #3b82f6; }
        .srp-role-item .role-name { font-size:13px; font-weight:600; color:#0f172a; }
        .srp-role-item .role-desc { font-size:11px; color:#94a3b8; margin-top:2px; }
        .srp-role-item.active .role-name { color:#1d4ed8; }
        .srp-content { flex:1; overflow-y:auto; padding:24px; }
        .srp-card { background:white; border-radius:12px; border:1px solid #e2e8f0; padding:28px; margin-bottom:24px; }
        .srp-card-title { font-size:16px; font-weight:700; color:#0f172a; margin:0 0 4px; }
        .srp-card-sub { font-size:13px; color:#64748b; margin:0 0 24px; }
        .srp-input { width:100%; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; outline:none; box-sizing:border-box; transition:border-color .2s; background:#fafafa; }
        .srp-input:focus { border-color:#3b82f6; background:white; box-shadow:0 0 0 3px rgba(59,130,246,.08); }
        .srp-label { display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px; letter-spacing:0.3px; text-transform:uppercase; }
        .srp-btn-primary { background:#0f172a; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; }
        .srp-btn-secondary { background:white; color:#64748b; border:1.5px solid #e2e8f0; padding:10px 20px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer; }
        .srp-btn-primary:hover { background:#1e293b; }
        .srp-btn-secondary:hover { background:#f8fafc; }
        .srp-user-card { border:1.5px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:16px; transition:border-color .2s; }
        .srp-user-card:hover { border-color:#cbd5e1; }
        .srp-user-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; cursor:pointer; background:white; }
        .srp-user-header:hover { background:#fafafa; }
        .srp-user-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#667eea,#764ba2); color:white; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; flex-shrink:0; }
        .srp-user-body { padding:0 20px 20px; background:#fafafa; border-top:1px solid #f1f5f9; }
        .srp-group-label { font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:1.5px; text-transform:uppercase; margin:20px 0 10px; display:flex; align-items:center; gap:8px; }
        .srp-group-label::after { content:''; flex:1; height:1px; background:#e2e8f0; }
        .status-chip-active { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#f0fdf4; color:#16a34a; border:1.5px solid #bbf7d0; }
        .status-chip-inactive { padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:#fef2f2; color:#dc2626; border:1.5px solid #fecaca; }
        .srp-deactivate-btn { font-size:12px; font-weight:600; padding:6px 14px; border-radius:8px; border:1.5px solid #e2e8f0; background:white; color:#64748b; cursor:pointer; }
        .srp-deactivate-btn:hover { border-color:#cbd5e1; background:#f8fafc; }
        .srp-saving-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:#64748b; }
        .srp-saving-dot { width:6px; height:6px; border-radius:50%; background:#3b82f6; animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .srp-expand-icon { transition:transform .2s; color:#94a3b8; font-size:18px; }
        .srp-expand-icon.open { transform:rotate(180deg); }
      `}} />

      <div className="srp-container">
        {/* ── SIDEBAR ── */}
        <div className="srp-sidebar">
          <div className="srp-sidebar-header">
            <h2>Access Control</h2>
            <p>Define roles and their permissions</p>
            <button
              className="srp-create-btn"
              onClick={() => {
                setEditingRoleId("");
                setRoleForm({ name: "", description: "", permissionsText: JSON.stringify({ dashboard: ["view"] }, null, 2) });
              }}
            >
              + Create New Role
            </button>
          </div>

          <div>
            {customRoles.map((role) => (
              <button
                key={role.id}
                className={`srp-role-item ${editingRoleId === role.id ? "active" : ""}`}
                onClick={() => startRoleEdit(role)}
              >
                <span className="role-name">{role.name}</span>
                <span className="role-desc">{role.description || "No description"}</span>
              </button>
            ))}
            {!customRoles.length && (
              <div style={{ padding: "20px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                No custom roles yet
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="srp-content">
          {loading ? (
            <PageLoader title="Loading access control..." />
          ) : (
            <>
              {/* Role Form Card */}
              <div className="srp-card">
                <p className="srp-card-title">
                  {editingRoleId ? "✏️ Edit Role" : "🆕 Create Custom Role"}
                </p>
                <p className="srp-card-sub">
                  Configure the access level for this template. Staff assigned this role will inherit these permissions.
                </p>

                <form onSubmit={saveRole}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label className="srp-label">Role Name *</label>
                      <input
                        type="text" required className="srp-input"
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder="e.g. Senior Manager"
                      />
                    </div>
                    <div>
                      <label className="srp-label">Description</label>
                      <input
                        type="text" className="srp-input"
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label className="srp-label" style={{ marginBottom: 12, display: 'block' }}>Module Permissions</label>
                    {MODULE_GROUPS.map((group) => (
                      <div key={group.group}>
                        <div className="srp-group-label">
                          <span style={{ color: group.color }}>●</span>
                          {group.group}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                          {group.modules.map((moduleKey) => {
                            const current = Array.isArray(roleForm.permissions?.[moduleKey]) ? roleForm.permissions[moduleKey] : [];
                            const allChecked = ACTIONS.every((a) => current.includes(a));
                            return (
                              <div key={moduleKey} style={{
                                display: 'flex', alignItems: 'center', padding: '9px 14px',
                                borderRadius: 8, background: '#fafafa', border: '1px solid #f1f5f9',
                                gap: 12, flexWrap: 'wrap',
                              }}>
                                <div style={{ minWidth: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{pretty(moduleKey)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                                  {ACTIONS.map((action) => {
                                    const checked = current.includes(action);
                                    const meta = ACTION_META[action];
                                    return (
                                      <button
                                        key={action} type="button"
                                        onClick={() => toggleRolePermission(moduleKey, action)}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 5,
                                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                          cursor: 'pointer', transition: 'all 0.15s',
                                          border: `1.5px solid ${checked ? meta.border : '#e2e8f0'}`,
                                          background: checked ? meta.bg : '#f8fafc',
                                          color: checked ? meta.color : '#cbd5e1',
                                          boxShadow: checked ? `0 0 0 1px ${meta.border}` : 'none',
                                        }}
                                      >
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: checked ? meta.color : '#e2e8f0', transition: 'background 0.15s' }} />
                                        {meta.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleRoleModuleAll(moduleKey)}
                                  style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: allChecked ? '#ef4444' : '#3b82f6',
                                    background: allChecked ? '#fef2f2' : '#eff6ff',
                                    border: `1px solid ${allChecked ? '#fecaca' : '#bfdbfe'}`,
                                    padding: '4px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                                  }}
                                >
                                  {allChecked ? '✕ Clear' : '✓ All'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                    {editingRoleId && (
                      <button type="button" className="srp-btn-secondary" onClick={() => {
                        setEditingRoleId("");
                        setRoleForm({ name: "", description: "", permissions: { dashboard: ["view"] } });
                      }}>Cancel</button>
                    )}
                    <button type="submit" className="srp-btn-primary">Save Role</button>
                  </div>
                </form>
              </div>

              {/* Permission Matrix Card */}
              <div className="srp-card">
                <p className="srp-card-title">👥 Live User Permission Matrix</p>
                <p className="srp-card-sub">Click any permission chip to toggle it instantly. Use "All" to grant full access to a module.</p>

                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
                  {ACTIONS.map((action) => {
                    const m = ACTION_META[action];
                    return (
                      <span key={action} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: m.bg, color: m.color, border: `1.5px solid ${m.border}`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color }} />
                        {m.label}
                      </span>
                    );
                  })}
                </div>

                {rows.map((row) => {
                  const isExpanded = expandedUser === row.id;
                  const isSaving   = savingId === row.id;
                  const initials   = row.user.name?.substring(0, 2).toUpperCase() || "??";
                  const roleLabel  = row.roleTitle || row.customRole?.name || row.salonRole;

                  return (
                    <div key={row.id} className="srp-user-card">
                      {/* User header row — click to expand */}
                      <div className="srp-user-header" onClick={() => setExpandedUser(isExpanded ? null : row.id)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div className="srp-user-avatar">{initials}</div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{row.user.name}</span>
                              <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                                {roleLabel}
                              </span>
                              {row.user.isActive
                                ? <span className="status-chip-active">Active</span>
                                : <span className="status-chip-inactive">Inactive</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                              {row.user.email} · {row.branch?.name || "All Branches"}
                            </div>
                            {row.customRole?.name && (
                              <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginTop: 2 }}>
                                📋 Inheriting: {row.customRole.name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                          {isSaving && (
                            <span className="srp-saving-badge">
                              <span className="srp-saving-dot" /> Saving...
                            </span>
                          )}
                          <button
                            className="srp-deactivate-btn"
                            onClick={() => toggleStatus(row)}
                          >
                            {row.user.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <span className={`srp-expand-icon ${isExpanded ? "open" : ""}`}>⌄</span>
                        </div>
                      </div>

                      {/* Expanded permission grid */}
                      {isExpanded && (
                        <div className="srp-user-body">
                          {MODULE_GROUPS.map((group) => (
                            <div key={group.group}>
                              <div className="srp-group-label">
                                <span style={{ color: group.color }}>●</span>
                                {group.group}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {group.modules.map((moduleKey) => {
                                  const current = Array.isArray(row.permissions?.[moduleKey])
                                    ? row.permissions[moduleKey] : [];
                                  const allChecked = ACTIONS.every((a) => current.includes(a));

                                  return (
                                    <div key={moduleKey} style={{
                                      display: "flex", alignItems: "center", padding: "10px 14px",
                                      borderRadius: 8, background: "white", border: "1px solid #f1f5f9",
                                      gap: 12, flexWrap: "wrap",
                                    }}>
                                      {/* module dot + name */}
                                      <div style={{ minWidth: 140, display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                                          {pretty(moduleKey)}
                                        </span>
                                      </div>

                                      {/* chips */}
                                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                                        {ACTIONS.map((action) => {
                                          const checked = current.includes(action);
                                          const meta    = ACTION_META[action];
                                          return (
                                            <button
                                              key={action}
                                              type="button"
                                              disabled={isSaving}
                                              onClick={() => togglePermission(row, moduleKey, action)}
                                              style={{
                                                display: "inline-flex", alignItems: "center", gap: 5,
                                                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                letterSpacing: 0.3, cursor: isSaving ? "not-allowed" : "pointer",
                                                transition: "all 0.15s",
                                                border: `1.5px solid ${checked ? meta.border : "#e2e8f0"}`,
                                                background: checked ? meta.bg : "#f8fafc",
                                                color: checked ? meta.color : "#cbd5e1",
                                                boxShadow: checked ? `0 0 0 1px ${meta.border}` : "none",
                                              }}
                                            >
                                              <span style={{
                                                width: 7, height: 7, borderRadius: "50%",
                                                background: checked ? meta.color : "#e2e8f0",
                                                transition: "background 0.15s",
                                              }} />
                                              {meta.label}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* All / Clear toggle */}
                                      <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={async () => {
                                          setSavingId(row.id);
                                          const current2 = row.permissions || {};
                                          const nextPerms = { ...current2, [moduleKey]: allChecked ? [] : [...ACTIONS] };
                                          await api.patch(`/owner/users/${row.id}`, { permissions: nextPerms });
                                          await load();
                                          setSavingId("");
                                        }}
                                        style={{
                                          fontSize: 11, fontWeight: 700,
                                          color: allChecked ? "#ef4444" : "#3b82f6",
                                          background: allChecked ? "#fef2f2" : "#eff6ff",
                                          border: `1px solid ${allChecked ? "#fecaca" : "#bfdbfe"}`,
                                          padding: "4px 10px", borderRadius: 20,
                                          cursor: "pointer", whiteSpace: "nowrap",
                                        }}
                                      >
                                        {allChecked ? "✕ Clear" : "✓ All"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!rows.length && (
                  <EmptyState title="No staff found" message="Staff members will appear here once created." />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
