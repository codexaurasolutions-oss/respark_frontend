import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
import { formatApiError } from "../../utils/apiError";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  salonRole: "STAFF",
  roleTitle: "",
  phone: "",
  avatarUrl: "",
  profileNote: "",
  branchId: "",
  customRoleId: "",
  showInCatalog: true,
  serviceIds: []
};

export default function ExpertsPage() {
  const { selectedBranchId, branches } = useBranch();
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const filteredServices = useMemo(() => {
    if (!form.branchId) return services;
    return services.filter((service) => !service.branchId || service.branchId === form.branchId);
  }, [form.branchId, services]);

  const load = async (branchId = selectedBranchId) => {
    const [usersResponse, servicesResponse, rolesResponse] = await Promise.all([
      api.get("/owner/users", { params: branchId ? { branchId } : {} }),
      api.get("/owner/services", { params: branchId ? { branchId } : {} }),
      api.get("/owner/custom-roles").catch(() => ({ data: [] }))
    ]);
    const experts = (usersResponse.data || []).filter((row) => (row.serviceAssignments || []).length || row.showInCatalog || row.salonRole === "STAFF");
    setRows(experts);
    setServices(servicesResponse.data);
    setCustomRoles(rolesResponse.data || []);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    load();
    return () => { active = false; };
  }, [selectedBranchId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

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
        permissions: { dashboard: ["view"], appointments: ["view"], customers: ["view"], pos: ["view"], invoices: ["view"], reports: ["view"] }
      };
      if (editingId) {
        await api.patch(`/owner/users/${editingId}`, payload);
        setStatus({ error: "", success: "Expert profile updated." });
      } else {
        await api.post("/owner/users/create-login", {
          ...payload,
          branchId: form.branchId || undefined,
          name: form.name,
          email: form.email,
          password: form.password
        });
        setStatus({ error: "", success: "Expert login created." });
      }
      resetForm();
      await load(selectedBranchId);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save expert"), success: "" });
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
      serviceIds: Array.isArray(row.serviceAssignments) ? row.serviceAssignments.map((item) => item.serviceId) : []
    });
  };

  const toggleUserStatus = async (row) => {
    await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
    await load(selectedBranchId);
  };

  const archiveUser = async (row) => {
    await api.patch(`/owner/users/${row.id}/archive`); 
    if (editingId === row.id) resetForm();
    await load(selectedBranchId);
  };

  const toggleServiceId = (serviceId) => {
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((item) => item !== serviceId)
        : [...current.serviceIds, serviceId]
    }));
  };

  return (
    <div className="page-shell">
      <div className="item-head" style={{ marginBottom: 18 }}>
        <div>
          <h2>Experts</h2>
          <p className="muted">Service experts, stylists, and salon specialists live here. POS only picks them per service line, while this page manages the team separately.</p>
        </div>
      </div>

      <div className="settings-section-grid">
        <div className="panel-card">
          <h3>{editingId ? "Update Expert Profile" : "Create Expert Login"}</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            {!editingId && <input value={form.name} placeholder="Full name" onChange={(event) => setForm({ ...form, name: event.target.value })} />}
            {!editingId && <input value={form.email} placeholder="Email" onChange={(event) => setForm({ ...form, email: event.target.value })} />}
            {!editingId && (
              <div style={{ display: "grid", gap: 10 }}>
                <input type="password" value={form.password} placeholder="Password" onChange={(event) => setForm({ ...form, password: event.target.value })} />
                <PasswordStrengthMeter password={form.password} />
              </div>
            )}
            <select value={form.customRoleId || ""} onChange={(event) => {
              const roleId = event.target.value;
              const role = customRoles.find((r) => r.id === roleId);
              setForm((current) => ({
                ...current,
                customRoleId: roleId,
                salonRole: "STAFF",
                roleTitle: role?.name || current.roleTitle
              }));
            }}>
              <option value="">— Select access role —</option>
              {customRoles.length === 0 && <option value="" disabled>Create roles in Settings → Access Control</option>}
              {customRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <input value={form.roleTitle} placeholder="Visible title" onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} />
            <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <input value={form.avatarUrl} placeholder="Avatar URL" onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} />
            <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value, serviceIds: [] })}>
              <option value="">No fixed branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.showInCatalog} onChange={(event) => setForm({ ...form, showInCatalog: event.target.checked })} />
              Show in public catalog
            </label>
            <textarea rows="4" value={form.profileNote} placeholder="Specialization, notes, style focus" onChange={(event) => setForm({ ...form, profileNote: event.target.value })} />
            <div>
              <strong>Assigned services</strong>
              <div className="badge-row" style={{ marginTop: 8 }}>
                {filteredServices.map((service) => (
                  <label key={service.id} className="badge" style={{ cursor: "pointer" }}>
                    <input type="checkbox" checked={form.serviceIds.includes(service.id)} onChange={() => toggleServiceId(service.id)} style={{ marginRight: 6 }} />
                    {service.name}
                  </label>
                ))}
                {!filteredServices.length && <span className="muted">No active services available for the selected branch.</span>}
              </div>
            </div>
            <div className="form-actions">
              <button>{editingId ? "Save Expert" : "Create Expert"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Expert Guide</h3>
          <p className="muted">Use this page to map salon experts to services. POS will only request a staff selection on service rows, never on product rows.</p>
          <div className="list-stack" style={{ marginTop: 12 }}>
            <div className="list-item"><strong>Service assignment</strong><div className="item-meta">Experts show up in service selection for billing and bookings.</div></div>
            <div className="list-item"><strong>Branch access</strong><div className="item-meta">Lock an expert to one branch or let them float across the salon.</div></div>
            <div className="list-item"><strong>Catalog visibility</strong><div className="item-meta">Optional public visibility for salon-facing expert profiles.</div></div>
          </div>
        </div>
      </div>

      {status.loading ? <PageLoader title="Loading experts" message="Preparing staff profiles, branches, and service assignments." /> : null}

      <div className="list-stack" style={{ marginTop: 18 }}>
        {rows.map((row) => (
          <div key={row.id} className={`list-card ${editingId === row.id ? "active-row" : ""}`}>
            <div className="item-head">
              <div>
                <strong>{row.user.name}</strong>
                <div className="item-meta">{row.user.email}</div>
                <div className="item-meta">{row.roleTitle || row.salonRole} | {row.branch?.name || "All branches"} | {row.phone || "No phone"}</div>
                <div className="item-meta">{row.profileNote || "No profile note added"}</div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(row)}>Edit</button>
                <button type="button" onClick={() => toggleUserStatus(row)} className={row.user.isActive ? "danger-button" : "secondary-button"}>{row.user.isActive ? "Deactivate" : "Activate"}</button>
                <button type="button" className="secondary-button" onClick={() => archiveUser(row)}>Archive</button>
              </div>
            </div>
            <div className="badge-row">
              <span className="badge">{row.user.isActive ? "Active login" : "Inactive login"}</span>
              <span className="badge">{row.showInCatalog ? "Visible in catalog" : "Hidden from catalog"}</span>
              {(row.serviceAssignments || []).map((assignment) => <span key={`${row.id}-${assignment.id}`} className="badge">Service: {assignment.service.name}</span>)}
            </div>
          </div>
        ))}
        {!status.loading && !rows.length && <EmptyState title="No experts found" message="Create the first expert login to assign salon services and manage staff listings." />}
      </div>
    </div>
  );
}
