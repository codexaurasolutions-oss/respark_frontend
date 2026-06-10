import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const modules = [
  "dashboard",
  "appointments",
  "branches",
  "services",
  "staff",
  "staffSchedule",
  "customers",
  "pos",
  "invoices",
  "payments",
  "inventory",
  "purchases",
  "memberships",
  "packages",
  "reports",
  "support",
  "settings",
  "myDashboard",
  "myAppointments",
  "mySchedule",
  "myCommission",
  "myProfile"
];
const actions = ["view", "create", "edit", "delete"];

export default function StaffRolesPage() {
  const [rows, setRows] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [savingId, setSavingId] = useState("");
  const [editingRoleId, setEditingRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissionsText: JSON.stringify({ dashboard: ["view"] }, null, 2)
  });

  const load = async () => {
    const [rowsResponse, rolesResponse] = await Promise.all([
      api.get("/owner/roles-permissions"),
      api.get("/owner/custom-roles")
    ]);
    setRows(rowsResponse.data);
    setCustomRoles(rolesResponse.data);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/roles-permissions"),
      api.get("/owner/custom-roles")
    ]).then(([rowsResponse, rolesResponse]) => {
      if (!active) return;
      setRows(rowsResponse.data);
      setCustomRoles(rolesResponse.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const togglePermission = async (row, moduleKey, action) => {
    setSavingId(row.id);
    const current = row.permissions || {};
    const currentActions = Array.isArray(current[moduleKey]) ? current[moduleKey] : [];
    const nextActions = currentActions.includes(action)
      ? currentActions.filter((item) => item !== action)
      : [...currentActions, action];
    const nextPermissions = { ...current, [moduleKey]: nextActions };
    await api.patch(`/owner/users/${row.id}`, { permissions: nextPermissions });
    await load();
    setSavingId("");
  };

  const toggleStatus = async (row) => {
    setSavingId(row.id);
    await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
    await load();
    setSavingId("");
  };

  const saveRole = async (event) => {
    event.preventDefault();
    const payload = {
      name: roleForm.name,
      description: roleForm.description,
      permissions: JSON.parse(roleForm.permissionsText || "{}")
    };
    if (editingRoleId) {
      await api.patch(`/owner/custom-roles/${editingRoleId}`, payload);
    } else {
      await api.post("/owner/custom-roles", payload);
    }
    setEditingRoleId("");
    setRoleForm({
      name: "",
      description: "",
      permissionsText: JSON.stringify({ dashboard: ["view"] }, null, 2)
    });
    await load();
  };

  const startRoleEdit = (role) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissionsText: JSON.stringify(role.permissions || {}, null, 2)
    });
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Roles & Permissions</h1>
            <p style={{ marginBottom: 0 }}>Shape internal access safely with reusable role templates and per-user permission matrices.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Users {rows.length}</span>
            <span className="badge">Templates {customRoles.length}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading roles and permissions" message="Preparing user access matrix, custom roles, and permission toggles." /> : <>
      <div className="two-col" style={{ marginBottom: 18 }}>
        <div className="panel-card">
          <h3>{editingRoleId ? "Update Custom Role" : "Create Custom Role"}</h3>
          <form onSubmit={saveRole} style={{ display: "grid", gap: 10 }}>
            <input value={roleForm.name} placeholder="Role name" onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} />
            <textarea rows="3" value={roleForm.description} placeholder="Role description" onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} />
            <textarea rows="10" value={roleForm.permissionsText} onChange={(event) => setRoleForm({ ...roleForm, permissionsText: event.target.value })} />
            <div className="form-actions">
              <button>{editingRoleId ? "Save Custom Role" : "Create Custom Role"}</button>
              {editingRoleId && <button type="button" className="secondary-button" onClick={() => {
                setEditingRoleId("");
                setRoleForm({ name: "", description: "", permissionsText: JSON.stringify({ dashboard: ["view"] }, null, 2) });
              }}>Cancel Edit</button>}
            </div>
          </form>
        </div>
        <div className="panel-card">
          <h3>Saved Role Templates</h3>
          {customRoles.map((role) => (
            <div key={role.id} style={{ borderTop: "1px solid #cbd5e1", padding: "10px 0" }}>
              <strong>{role.name}</strong>
              <div style={{ color: "#64748b", marginTop: 6 }}>{role.description || "No description added."}</div>
              <button type="button" className="secondary-button" style={{ marginTop: 8 }} onClick={() => startRoleEdit(role)}>Edit Template</button>
            </div>
          ))}
          {!customRoles.length && <EmptyState title="No custom role templates yet" message="Create reusable role templates to speed up staff onboarding and permission control." />}
        </div>
      </div>
      {rows.map((row) => (
        <div key={row.id} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <strong>{row.user.name}</strong> ({row.roleTitle || row.customRole?.name || row.salonRole}) - {row.user.email}
          <div style={{ marginTop: 6, color: "#64748b" }}>
            {row.branch?.name || "All branches"} | {row.phone || "No phone"} | {row.showInCatalog ? "Visible in catalog" : "Hidden from catalog"}
          </div>
          {row.customRole?.name && <div style={{ marginTop: 6, color: "#64748b" }}>Template: {row.customRole.name}</div>}
          {!!row.serviceAssignments?.length && (
            <div style={{ marginTop: 6, color: "#64748b" }}>
              Services: {row.serviceAssignments.map((assignment) => assignment.service.name).join(", ")}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => toggleStatus(row)}>
              {row.user.isActive ? "Deactivate User" : "Activate User"}
            </button>
            {savingId === row.id && <span style={{ marginLeft: 8 }}>Saving...</span>}
          </div>
          {modules.map((moduleKey) => (
            <div key={`${row.id}-${moduleKey}`} style={{ marginTop: 10 }}>
              <strong>{moduleKey}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {actions.map((action) => {
                  const checked = Array.isArray(row.permissions?.[moduleKey]) && row.permissions[moduleKey].includes(action);
                  return (
                    <label key={`${moduleKey}-${action}`} style={{ display: "flex", gap: 4 }}>
                      <input type="checkbox" checked={checked} onChange={() => togglePermission(row, moduleKey, action)} />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      {!rows.length && <EmptyState title="No user permission rows yet" message="Staff members will appear here once salon users are created and assigned roles." />}
      </>}
    </div>
  );
}
