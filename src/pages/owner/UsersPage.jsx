import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import "./ServiceHubPage.css";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import {
  clonePermissions,
  countGrantedActions,
  countGrantedModules,
  DEFAULT_PERMISSIONS,
  MODULE_GROUPS,
  PERMISSION_ACTIONS,
  resolveRoleLabel,
  ROLE_OPTIONS,
  ROLE_PRESETS
} from "./staffAccessConfig";

const makeEmptyForm = () => ({
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
  permissions: clonePermissions(DEFAULT_PERMISSIONS),
  joiningDate: "",
  designation: "",
  uanNumber: "",
  reportingToId: "",
  workingHours: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  ifscCode: ""
});

const moduleCatalog = MODULE_GROUPS.flatMap((group) => group.modules);

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(makeEmptyForm);
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const load = async (branchId = filterBranch) => {
    const [usersResponse, branchesResponse, servicesResponse, rolesResponse, settingsResponse] = await Promise.all([
      api.get("/owner/users", { params: branchId ? { branchId } : {} }),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles"),
      api.get("/owner/settings")
    ]);
    setRows(usersResponse.data);
    setBranches(branchesResponse.data);
    setServices(servicesResponse.data);
    setCustomRoles(rolesResponse.data);
    setDesignationOptions(
      Array.isArray(settingsResponse.data?.advancedSettings?.designations)
        ? settingsResponse.data.advancedSettings.designations.filter((row) => row?.active !== false && row?.name).map((row) => row.name)
        : []
    );
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/users"),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles"),
      api.get("/owner/settings")
    ]).then(([usersResponse, branchesResponse, servicesResponse, rolesResponse, settingsResponse]) => {
      if (!active) return;
      setRows(usersResponse.data);
      setBranches(branchesResponse.data);
      setServices(servicesResponse.data);
      setCustomRoles(rolesResponse.data);
      setDesignationOptions(
        Array.isArray(settingsResponse.data?.advancedSettings?.designations)
          ? settingsResponse.data.advancedSettings.designations.filter((row) => row?.active !== false && row?.name).map((row) => row.name)
          : []
      );
      setStatus((current) => ({ ...current, loading: false }));
    }).catch((error) => {
      if (!active) return;
      setStatus({ error: formatApiError(error, "Could not load staff workspace"), success: "", loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus((current) => ({ ...current, loading: true }));
    Promise.all([
      api.get("/owner/users", { params: filterBranch ? { branchId: filterBranch } : {} }),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles"),
      api.get("/owner/settings")
    ]).then(([usersResponse, branchesResponse, servicesResponse, rolesResponse, settingsResponse]) => {
      if (!active) return;
      setRows(usersResponse.data);
      setBranches(branchesResponse.data);
      setServices(servicesResponse.data);
      setCustomRoles(rolesResponse.data);
      setDesignationOptions(
        Array.isArray(settingsResponse.data?.advancedSettings?.designations)
          ? settingsResponse.data.advancedSettings.designations.filter((row) => row?.active !== false && row?.name).map((row) => row.name)
          : []
      );
      setStatus((current) => ({ ...current, loading: false }));
    }).catch((error) => {
      if (!active) return;
      setStatus({ error: formatApiError(error, "Could not refresh staff list"), success: "", loading: false });
    });
    return () => {
      active = false;
    };
  }, [filterBranch]);

  const filteredRows = useMemo(() => {
    if (!deferredQuery) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.user?.name,
        row.user?.email,
        row.phone,
        row.roleTitle,
        row.customRole?.name,
        row.branch?.name,
        row.salonRole
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery, rows]);

  const selectedRow = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.find((row) => row.id === selectedId) || filteredRows[0];
  }, [filteredRows, selectedId]);

  useEffect(() => {
    if (!selectedRow) {
      setSelectedId("");
      return;
    }
    if (!selectedId || !filteredRows.some((row) => row.id === selectedId)) {
      setSelectedId(selectedRow.id);
    }
  }, [filteredRows, selectedId, selectedRow]);

  const filteredServices = useMemo(() => {
    if (!form.branchId) return services;
    return services.filter((service) => !service.branchId || service.branchId === form.branchId);
  }, [form.branchId, services]);

  const permissionSummary = useMemo(
    () => moduleCatalog.filter((module) => Array.isArray(form.permissions[module.key]) && form.permissions[module.key].length),
    [form.permissions]
  );

  const activeDirectoryStats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.user?.isActive).length,
    catalogVisible: rows.filter((row) => row.showInCatalog).length,
    branchScoped: rows.filter((row) => row.branchId).length
  }), [rows]);

  const resetForm = () => {
    setEditingId("");
    setForm(makeEmptyForm());
  };

  const applyRolePreset = (roleCode) => {
    const preset = clonePermissions(ROLE_PRESETS[roleCode] || DEFAULT_PERMISSIONS);
    setForm((current) => ({
      ...current,
      salonRole: roleCode,
      customRoleId: "",
      permissions: preset
    }));
  };

  const startCreate = () => {
    resetForm();
    setStatus((current) => ({ ...current, error: "", success: "" }));
    setIsCreateModalOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setSelectedId(row.id);
    setForm({
      name: row.user?.name || "",
      email: row.user?.email || "",
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
      permissions: clonePermissions(row.permissions || {}),
      joiningDate: row.joiningDate ? new Date(row.joiningDate).toISOString().split('T')[0] : "",
      designation: row.designation || "",
      uanNumber: row.uanNumber || "",
      reportingToId: row.reportingToId || "",
      workingHours: row.workingHours || "",
      bankName: row.bankName || "",
      bankBranch: row.bankBranch || "",
      accountNumber: row.accountNumber || "",
      ifscCode: row.ifscCode || ""
    });
    setStatus((current) => ({ ...current, error: "", success: "" }));
  };

  const togglePermission = (moduleKey, action) => {
    setForm((current) => {
      const currentActions = Array.isArray(current.permissions[moduleKey]) ? current.permissions[moduleKey] : [];
      const nextActions = currentActions.includes(action)
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action];
      return {
        ...current,
        customRoleId: "",
        permissions: {
          ...current.permissions,
          [moduleKey]: nextActions
        }
      };
    });
  };

  const setModuleAccess = (moduleKey, enabled) => {
    setForm((current) => ({
      ...current,
      customRoleId: "",
      permissions: {
        ...current.permissions,
        [moduleKey]: enabled ? ["view"] : []
      }
    }));
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
      permissions: clonePermissions(role?.permissions || DEFAULT_PERMISSIONS)
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus((current) => ({ ...current, error: "", success: "" }));
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
        permissions: form.permissions,
        joiningDate: form.joiningDate || undefined,
        designation: form.designation || undefined,
        uanNumber: form.uanNumber || undefined,
        reportingToId: form.reportingToId || undefined,
        workingHours: form.workingHours || undefined,
        bankName: form.bankName || undefined,
        bankBranch: form.bankBranch || undefined,
        accountNumber: form.accountNumber || undefined,
        ifscCode: form.ifscCode || undefined
      };
      if (editingId) {
        await api.patch(`/owner/users/${editingId}`, payload);
        setStatus((current) => ({ ...current, success: "Staff profile and access updated." }));
      } else {
        await api.post("/owner/users/create-login", {
          ...payload,
          branchId: form.branchId || undefined,
          name: form.name,
          email: form.email,
          password: form.password,
          joiningDate: form.joiningDate || undefined,
          designation: form.designation || undefined,
          uanNumber: form.uanNumber || undefined,
          reportingToId: form.reportingToId || undefined,
          workingHours: form.workingHours || undefined,
          bankName: form.bankName || undefined,
          bankBranch: form.bankBranch || undefined,
          accountNumber: form.accountNumber || undefined,
          ifscCode: form.ifscCode || undefined
        });
        setStatus((current) => ({ ...current, success: "New staff login created." }));
        setIsCreateModalOpen(false);
      }
      resetForm();
      await load(filterBranch);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not save staff user"), success: "" }));
    }
  };

  const toggleUserStatus = async (row) => {
    await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
    await load(filterBranch);
  };

  const archiveUser = async (row) => {
    await api.patch(`/owner/users/${row.id}/archive`);
    if (editingId === row.id) {
      resetForm();
    }
    await load(filterBranch);
  };

  const handleDirectorySelect = (rowId) => {
    startTransition(() => {
      setSelectedId(rowId);
    });
  };

  return (
    <div className="page-shell" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {status.loading ? (
        <PageLoader title="Loading staff workspace" message="Pulling users, saved roles, branches, and services into one permission-controlled workspace." />
      ) : null}

      <div className="hub-container" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Left Sidebar: Directory */}
        <div className="hub-sidebar" style={{ width: 340, display: 'flex', flexDirection: 'column' }}>
          <div className="hub-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Team Directory</h3>
          </div>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button 
              className="btn-submit" 
              style={{ width: '100%', marginBottom: 12, padding: '10px', fontSize: 14 }} 
              onClick={startCreate}
            >
              + New Staff
            </button>
            <input
              type="text"
              className="hub-search-input"
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
              value={query}
              placeholder="Search staff..."
              onChange={(event) => setQuery(event.target.value)}
            />
            <select 
              className="hub-input" 
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={filterBranch} 
              onChange={(event) => setFilterBranch(event.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div className="hub-list" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredRows.map((row) => {
              const moduleCount = countGrantedModules(row.permissions || {});
              const isActive = selectedRow?.id === row.id;
              return (
                <div
                  key={row.id}
                  className={`hub-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleDirectorySelect(row.id)}
                  style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: isActive ? '#f1f5f9' : 'white' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ color: isActive ? '#2563eb' : '#0f172a' }}>{row.user?.name}</strong>
                    <span className={`staff-status-dot ${row.user?.isActive ? "live" : "muted"}`} style={{ width: 8, height: 8, borderRadius: '50%', background: row.user?.isActive ? '#10b981' : '#94a3b8' }} />
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                    {row.roleTitle || row.customRole?.name || resolveRoleLabel(row.salonRole)}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {row.branch?.name || "All branches"} • {moduleCount} enabled modules
                  </div>
                </div>
              );
            })}
            {!filteredRows.length && !status.loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                No staff match this filter
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Editor */}
        <div className="hub-items-col" style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
          {selectedRow ? (
            <>
              <div className="hub-items-header-bar" style={{ padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 20, marginBottom: 4 }}>{selectedRow.user?.name}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>{selectedRow.user?.email}</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => toggleUserStatus(selectedRow)}
                    style={{ padding: '8px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', border: '1px solid #e2e8f0', background: 'white', color: selectedRow.user?.isActive ? '#ef4444' : '#10b981' }}
                  >
                    {selectedRow.user?.isActive ? "Deactivate Login" : "Activate Login"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => archiveUser(selectedRow)}
                    style={{ padding: '8px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', border: 'none', background: '#ef4444', color: 'white' }}
                  >
                    Archive
                  </button>
                </div>
              </div>

              <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                   <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Current Role</div>
                     <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{selectedRow.roleTitle || selectedRow.customRole?.name || resolveRoleLabel(selectedRow.salonRole)}</div>
                     <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{selectedRow.phone || "No phone added"}</div>
                   </div>
                   <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Page Access</div>
                     <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{countGrantedModules(selectedRow.permissions || {})} Modules</div>
                     <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{countGrantedActions(selectedRow.permissions || {})} switches enabled</div>
                   </div>
                   <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                     <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Services</div>
                     <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{selectedRow.serviceAssignments?.length || 0} Services</div>
                     <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{selectedRow.showInCatalog ? "Visible in catalog" : "Hidden from catalog"}</div>
                   </div>
                </div>

                <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Edit Access & Settings</h3>
                    {status.success && <span style={{ color: '#10b981', fontSize: 14, fontWeight: 500 }}>{status.success}</span>}
                    {status.error && <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 500 }}>{status.error}</span>}
                  </div>
                  
                  <form onSubmit={submit}>
                    {/* Identity Section */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 15, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Identity & Scope</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Staff role</label>
                          <select className="hub-input" value={form.salonRole} onChange={(event) => applyRolePreset(event.target.value)}>
                            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                          </select>
                        </div>
                        <div className="hub-form-group">
                          <label>Role title (Visible designation)</label>
                          <input type="text" className="hub-input" value={form.roleTitle} onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} />
                        </div>
                        <div className="hub-form-group">
                          <label>Saved access role (Template)</label>
                          <select className="hub-input" value={form.customRoleId || ""} onChange={(event) => applyCustomRole(event.target.value)}>
                            <option value="">No saved role template</option>
                            {customRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                          </select>
                        </div>
                        <div className="hub-form-group">
                          <label>Branch scope</label>
                          <select className="hub-input" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value, serviceIds: [] })}>
                            <option value="">All branches</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </select>
                        </div>
                        <div className="hub-form-group">
                          <label>Phone</label>
                          <input type="text" className="hub-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                        </div>
                      </div>
                      
                      <div className="hub-form-group" style={{ marginTop: 16 }}>
                        <div className="hub-toggle-group">
                          <input type="checkbox" checked={form.showInCatalog} onChange={(event) => setForm({ ...form, showInCatalog: event.target.checked })} />
                          <span>Show this staff member in salon catalog / expert listing</span>
                        </div>
                      </div>
                    </div>

                    {/* Services Section */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 15, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Assigned Services</h4>
                      <div className="staff-chip-grid">
                        {filteredServices.map((service) => (
                          <label key={service.id} className={`staff-service-chip ${form.serviceIds.includes(service.id) ? "selected" : ""}`}>
                            <input
                              type="checkbox"
                              checked={form.serviceIds.includes(service.id)}
                              onChange={() => toggleServiceId(service.id)}
                            />
                            <span>{service.name}</span>
                            <small>{service.branch?.name || "Shared"}</small>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Employment & HR Details */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 15, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Employment & HR Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Date of Joining</label>
                          <input type="date" className="hub-input" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
                        </div>
                        <div className="hub-form-group">
                          <label>Designation</label>
                          <div style={{ display: "grid", gap: 8 }}>
                            <select className="hub-input" value={designationOptions.includes(form.designation) ? form.designation : ""} onChange={(event) => setForm({ ...form, designation: event.target.value || form.designation })}>
                              <option value="">Select saved designation</option>
                              {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                            </select>
                            <input type="text" className="hub-input" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} placeholder="e.g. Senior Stylist" />
                          </div>
                        </div>
                        <div className="hub-form-group">
                          <label>UAN Number</label>
                          <input type="text" className="hub-input" value={form.uanNumber} onChange={(event) => setForm({ ...form, uanNumber: event.target.value })} placeholder="12-digit UAN" />
                        </div>
                        <div className="hub-form-group">
                          <label>Working Hours</label>
                          <input type="text" className="hub-input" value={form.workingHours} onChange={(event) => setForm({ ...form, workingHours: event.target.value })} placeholder="e.g. 10:00 AM - 07:00 PM" />
                        </div>
                        <div className="hub-form-group">
                          <label>Reporting To</label>
                          <select className="hub-input" value={form.reportingToId} onChange={(event) => setForm({ ...form, reportingToId: event.target.value })}>
                            <option value="">None / Self</option>
                            {rows.map((r) => r.id !== selectedRow?.id && <option key={r.id} value={r.id}>{r.user?.name || r.phone}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Bank & Payroll Details */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 15, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>Bank & Payroll Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Bank Name</label>
                          <input type="text" className="hub-input" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="e.g. HDFC Bank" />
                        </div>
                        <div className="hub-form-group">
                          <label>Branch Name</label>
                          <input type="text" className="hub-input" value={form.bankBranch} onChange={(event) => setForm({ ...form, bankBranch: event.target.value })} placeholder="Branch Area" />
                        </div>
                        <div className="hub-form-group">
                          <label>Account Number</label>
                          <input type="text" className="hub-input" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Account No." />
                        </div>
                        <div className="hub-form-group">
                          <label>IFSC / Routing Code</label>
                          <input type="text" className="hub-input" value={form.ifscCode} onChange={(event) => setForm({ ...form, ifscCode: event.target.value })} placeholder="IFSC Code" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
                      <button type="button" className="btn-cancel" onClick={() => startEdit(selectedRow)}>Revert Changes</button>
                      <button type="submit" className="btn-submit">Save Staff Settings</button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
              Select a staff member from the directory to view details
            </div>
          )}
        </div>
      </div>

      {/* New Staff Modal */}
      {isCreateModalOpen && (
        <div className="hub-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="hub-modal-header">Create New Staff</div>
            
            <form onSubmit={submit}>
              <div className="hub-modal-body">
                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Full Name *</label>
                  <input type="text" required className="hub-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                
                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Email Address *</label>
                  <input type="email" required className="hub-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Password *</label>
                  <input type="password" required className="hub-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Create a strong password" />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Initial Role</label>
                  <select className="hub-input" value={form.salonRole} onChange={e => applyRolePreset(e.target.value)}>
                    {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                  <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>You can customize permissions later in the staff settings.</span>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Branch Assignment</label>
                  <select className="hub-input" value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})}>
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Designation</label>
                  <select className="hub-input" value={designationOptions.includes(form.designation) ? form.designation : ""} onChange={e => setForm({ ...form, designation: e.target.value })}>
                    <option value="">Select designation</option>
                    {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                  </select>
                </div>
              </div>

              <div className="hub-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Create Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
