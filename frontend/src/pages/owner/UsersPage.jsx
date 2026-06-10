import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const defaultPermissions = {
  dashboard: ["view"],
  appointments: ["view"],
  customers: ["view"],
  pos: ["view"],
  invoices: ["view"],
  reports: ["view"]
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  salonRole: "RECEPTIONIST",
  roleTitle: "",
  phone: "",
  avatarUrl: "",
  profileNote: "",
  branchId: "",
  customRoleId: "",
  showInCatalog: false,
  serviceIds: [],
  permissionsText: JSON.stringify(defaultPermissions, null, 2)
};

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const filteredServices = useMemo(() => {
    if (!form.branchId) return services;
    return services.filter((service) => !service.branchId || service.branchId === form.branchId);
  }, [form.branchId, services]);

  const load = async (branchId = filterBranch) => {
    const [usersResponse, branchesResponse, servicesResponse, rolesResponse] = await Promise.all([
      api.get("/owner/users", { params: branchId ? { branchId } : {} }),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles")
    ]);
    setRows(usersResponse.data);
    setBranches(branchesResponse.data);
    setServices(servicesResponse.data);
    setCustomRoles(rolesResponse.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/users"),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles")
    ]).then(([usersResponse, branchesResponse, servicesResponse, rolesResponse]) => {
      if (!active) return;
      setRows(usersResponse.data);
      setBranches(branchesResponse.data);
      setServices(servicesResponse.data);
      setCustomRoles(rolesResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/users", { params: filterBranch ? { branchId: filterBranch } : {} }),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles")
    ]).then(([usersResponse, branchesResponse, servicesResponse, rolesResponse]) => {
      if (!active) return;
      setRows(usersResponse.data);
      setBranches(branchesResponse.data);
      setServices(servicesResponse.data);
      setCustomRoles(rolesResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, [filterBranch]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const parsePermissions = () => JSON.parse(form.permissionsText || "{}");
  const permissionSummary = Object.entries(parsePermissions()).filter(([, actions]) => Array.isArray(actions) && actions.length);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const payload = {
        salonRole: form.salonRole,
        roleTitle: form.roleTitle || undefined,
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        profileNote: form.profileNote || undefined,
        branchId: form.branchId || null,
        customRoleId: form.customRoleId || undefined,
        showInCatalog: Boolean(form.showInCatalog),
        serviceIds: form.serviceIds,
        permissions: parsePermissions()
      };
      if (editingId) {
        await api.patch(`/owner/users/${editingId}`, payload);
        setStatus({ error: "", success: "User access and profile updated." });
      } else {
        await api.post("/owner/users/create-login", {
          ...payload,
          branchId: form.branchId || undefined,
          name: form.name,
          email: form.email,
          password: form.password
        });
        setStatus({ error: "", success: "Login user created." });
      }
      resetForm();
      await load(filterBranch);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save user"), success: "" });
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.user.name,
      email: row.user.email,
      password: "",
      salonRole: row.salonRole,
      roleTitle: row.roleTitle || "",
      phone: row.phone || "",
      avatarUrl: row.avatarUrl || "",
      profileNote: row.profileNote || "",
      branchId: row.branchId || "",
      customRoleId: row.customRoleId || "",
      showInCatalog: Boolean(row.showInCatalog),
      serviceIds: Array.isArray(row.serviceAssignments) ? row.serviceAssignments.map((item) => item.serviceId) : [],
      permissionsText: JSON.stringify(row.permissions || {}, null, 2)
    });
  };

  const toggleUserStatus = async (row) => {
    await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
    await load(filterBranch);
  };

  const archiveUser = async (row) => {
    await api.patch(`/owner/users/${row.id}/archive`);
    if (editingId === row.id) resetForm();
    await load(filterBranch);
  };

  const toggleServiceId = (serviceId) => {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((item) => item !== serviceId)
        : [...current.serviceIds, serviceId]
    }));
  };

  const applyCustomRole = (roleId) => {
    const role = customRoles.find((item) => item.id === roleId);
    setForm((current) => ({
      ...current,
      customRoleId: roleId,
      roleTitle: role?.name || current.roleTitle,
      permissionsText: JSON.stringify(role?.permissions || defaultPermissions, null, 2)
    }));
  };

  return (
    <div className="page-shell">
      <div className="item-head" style={{ marginBottom: 18 }}>
        <div>
          <h2>Staff / Users</h2>
          <p className="muted">Har login ko branch, profile, services, aur permissions ke saath map kiya ja raha hai taa-ke owner panel aur POS dono controlled rahen.</p>
        </div>
        <div>
          <select value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)}>
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="two-col">
        <div className="panel-card">
          <h3>{editingId ? "Update Staff Profile & Access" : "Create Login User"}</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            {!editingId && (
              <label>
                <span className="muted">Full name</span>
                <input value={form.name} placeholder="Enter full name" onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
            )}
            {!editingId && (
              <label>
                <span className="muted">Email</span>
                <input value={form.email} placeholder="Enter email address" onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
            )}
            {!editingId && (
              <label>
                <span className="muted">Password</span>
                <input type="password" value={form.password} placeholder="Create password" onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </label>
            )}
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <span className="muted">Staff role</span>
                <select value={form.salonRole} onChange={(event) => setForm({ ...form, salonRole: event.target.value })}>
                  <option value="SALON_OWNER">Salon Owner</option>
                  <option value="MANAGER">Manager</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="STAFF">Staff</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager</option>
                  <option value="ACCOUNTANT">Accountant</option>
                </select>
              </label>
              <label>
                <span className="muted">Custom role label</span>
                <input value={form.roleTitle} placeholder="Optional display label" onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} />
              </label>
            </div>
            <label>
              <span className="muted">Saved permission role</span>
              <select value={form.customRoleId || ""} onChange={(event) => applyCustomRole(event.target.value)}>
                <option value="">No saved custom role</option>
                {customRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <span className="muted">Phone</span>
                <input value={form.phone} placeholder="Enter phone number" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label>
                <span className="muted">Profile image</span>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px" }}>
                  {form.avatarUrl && (
                    <img src={form.avatarUrl} alt="Avatar" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} />
                  )}
                  <input type="file" accept="image/*" onChange={async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("image", file);
                    setStatus((current) => ({ ...current, error: "", success: "Uploading image..." }));
                    try {
                      const { data } = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                      setForm((current) => ({ ...current, avatarUrl: data.url }));
                      setStatus((current) => ({ ...current, error: "", success: "Image uploaded successfully." }));
                    } catch {
                      setStatus((current) => ({ ...current, error: "Failed to upload image.", success: "" }));
                    }
                  }} />
                </div>
              </label>
            </div>
            <label>
              <span className="muted">Branch access</span>
              <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value, serviceIds: [] })}>
                <option value="">No fixed branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.showInCatalog} onChange={(event) => setForm({ ...form, showInCatalog: event.target.checked })} />
              Show this staff member in public catalog
            </label>
            <label>
              <span className="muted">Profile note</span>
              <textarea rows="4" value={form.profileNote} placeholder="Specialization, experience, or internal context" onChange={(event) => setForm({ ...form, profileNote: event.target.value })} />
            </label>
            <div>
              <strong>Assigned services</strong>
              <div className="badge-row" style={{ marginTop: 8 }}>
                {filteredServices.map((service) => (
                  <label key={service.id} className="badge" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={() => toggleServiceId(service.id)}
                      style={{ marginRight: 6 }}
                    />
                    {service.name}
                  </label>
                ))}
                {!filteredServices.length && <span className="muted">No active services available for the selected branch.</span>}
              </div>
            </div>
            <div className="summary-box">
              <strong>Access summary</strong>
              <div className="item-meta" style={{ marginTop: 6 }}>
                {form.customRoleId ? "Permissions are being applied from the selected saved role." : "Default role permissions are active for this user."}
              </div>
              <div className="badge-row" style={{ marginTop: 10 }}>
                {permissionSummary.map(([moduleKey, actions]) => (
                  <span key={moduleKey} className="badge">{moduleKey}: {actions.join(", ")}</span>
                ))}
                {!permissionSummary.length && <span className="muted">No access rules resolved yet.</span>}
              </div>
            </div>
            <div className="form-actions">
              <button>{editingId ? "Save Staff Profile" : "Create Login User"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Access guide</h3>
          <p className="muted">Choose a staff role, optionally apply a saved role template, then map branch and services. The system keeps access scoped without exposing raw permission code in the form.</p>
          <div className="list-stack" style={{ marginTop: 12 }}>
            <div className="list-item">
              <strong>Role</strong>
              <div className="item-meta">Controls the staff member's overall operational responsibility.</div>
            </div>
            <div className="list-item">
              <strong>Branch access</strong>
              <div className="item-meta">Limits this login to one branch when needed, or leaves it branch-flexible.</div>
            </div>
            <div className="list-item">
              <strong>Assigned services</strong>
              <div className="item-meta">Determines which services this team member can be attached to in bookings and catalog flow.</div>
            </div>
          </div>
        </div>
      </div>

      {status.loading ? (
        <PageLoader
          title="Loading staff workspace"
          message="Pulling branch users, saved roles, services, and permission templates together."
        />
      ) : null}

      <div className="list-stack" style={{ marginTop: 18 }}>
        {rows.map((row) => (
          <div key={row.id} className={`list-card ${editingId === row.id ? "active-row" : ""}`}>
            <div className="item-head">
              <div>
                <strong>{row.user.name}</strong>
                <div className="item-meta">{row.user.email}</div>
                <div className="item-meta">{row.roleTitle || row.customRole?.name || row.salonRole} | {row.branch?.name || "All branches"} | {row.phone || "No phone"}</div>
                <div className="item-meta">{row.profileNote || "No profile note added"}</div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(row)}>Edit Access</button>
                <button type="button" onClick={() => toggleUserStatus(row)} className={row.user.isActive ? "danger-button" : "secondary-button"}>
                  {row.user.isActive ? "Deactivate" : "Activate"}
                </button>
                <button type="button" className="secondary-button" onClick={() => archiveUser(row)}>Archive</button>
              </div>
            </div>
            <div className="badge-row">
              <span className="badge">{row.user.isActive ? "Active login" : "Inactive login"}</span>
              <span className="badge">{row.showInCatalog ? "Visible in catalog" : "Hidden from catalog"}</span>
              {row.customRole?.name && <span className="badge">Role Template: {row.customRole.name}</span>}
              {(row.serviceAssignments || []).map((assignment) => (
                <span key={`${row.id}-${assignment.id}`} className="badge">Service: {assignment.service.name}</span>
              ))}
              {Object.entries(row.permissions || {}).map(([moduleKey, actions]) => (
                <span key={`${row.id}-${moduleKey}`} className="badge">{moduleKey}: {Array.isArray(actions) ? actions.join(", ") : "-"}</span>
              ))}
            </div>
          </div>
        ))}
        {!status.loading && !rows.length && <EmptyState title="No users found" message="There are no matching staff logins for the selected branch filter yet." />}
      </div>
    </div>
  );
}

