import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import "./ServiceHubPage.css";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";
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
  ifscCode: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  username: "",
  useMobileAsUsername: false,
  enableAppointments: true,
  showAllStaffAppointments: false,
  position: "",
  workExperience: [],
  documents: []
});

const moduleCatalog = MODULE_GROUPS.flatMap((group) => group.modules);
const defaultAccessControl = {
  branchScopedDefault: true,
  allowStaffExport: true
};
const getDesignationOptions = (settingsResponse) =>
  Array.isArray(settingsResponse.data?.advancedSettings?.designations)
    ? settingsResponse.data.advancedSettings.designations
      .filter((row) => row?.active !== false && row?.name)
      .map((row) => row.name)
    : [];
const getAccessControlSettings = (settingsResponse) => ({
  ...defaultAccessControl,
  ...(settingsResponse.data?.advancedSettings?.accessControl || {})
});

const mapRowToForm = (row) => ({
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
  joiningDate: row.joiningDate ? new Date(row.joiningDate).toISOString().split("T")[0] : "",
  designation: row.designation || "",
  uanNumber: row.uanNumber || "",
  reportingToId: row.reportingToId || "",
  workingHours: row.workingHours || "",
  bankName: row.bankName || "",
  bankBranch: row.bankBranch || "",
  accountNumber: row.accountNumber || "",
  ifscCode: row.ifscCode || "",
  firstName: row.firstName || "",
  lastName: row.lastName || "",
  dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().split("T")[0] : "",
  gender: row.gender || "",
  username: row.username || "",
  useMobileAsUsername: false,
  enableAppointments: row.enableAppointments !== false,
  showAllStaffAppointments: Boolean(row.showAllStaffAppointments),
  position: row.designation || "",
  workExperience: Array.isArray(row.workExperience) ? row.workExperience : [],
  documents: Array.isArray(row.documents) ? row.documents : []
});

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [services, setServices] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [accessControl, setAccessControl] = useState(defaultAccessControl);
  const [filterBranch, setFilterBranch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(makeEmptyForm);
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const load = async (branchId = filterBranch) => {
    const [usersResponse, branchesResponse, servicesResponse, rolesResponse, settingsResponse] = await Promise.all([
      api.get("/owner/users", { params: { branchId: branchId || undefined, archived: showArchived } }),
      api.get("/owner/branches"),
      api.get("/owner/services"),
      api.get("/owner/custom-roles"),
      api.get("/owner/settings")
    ]);
    setRows(usersResponse.data);
    setBranches(branchesResponse.data);
    setServices(servicesResponse.data);
    setCustomRoles(rolesResponse.data);
    setDesignationOptions(getDesignationOptions(settingsResponse));
    setAccessControl(getAccessControlSettings(settingsResponse));
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/users", { params: { archived: showArchived } }),
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
      setDesignationOptions(getDesignationOptions(settingsResponse));
      setAccessControl(getAccessControlSettings(settingsResponse));
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
      api.get("/owner/users", { params: { branchId: filterBranch || undefined, archived: showArchived } }),
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
      setDesignationOptions(getDesignationOptions(settingsResponse));
      setAccessControl(getAccessControlSettings(settingsResponse));
      setStatus((current) => ({ ...current, loading: false }));
    }).catch((error) => {
      if (!active) return;
      setStatus({ error: formatApiError(error, "Could not refresh staff list"), success: "", loading: false });
    });
    return () => {
      active = false;
    };
  }, [filterBranch, showArchived]);

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
    const defaultBranchId = accessControl.branchScopedDefault ? (filterBranch || branches[0]?.id || "") : "";
    setEditingId("");
    setForm({
      ...makeEmptyForm(),
      branchId: defaultBranchId
    });
    setStatus((current) => ({ ...current, error: "", success: "" }));
    setIsCreateModalOpen(true);
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setSelectedId(row.id);
    setForm(mapRowToForm(row));
    setStatus((current) => ({ ...current, error: "", success: "" }));
  };

  useEffect(() => {
    if (!selectedRow || isCreateModalOpen || editingId === selectedRow.id) return;
    setEditingId(selectedRow.id);
    setForm(mapRowToForm(selectedRow));
  }, [editingId, isCreateModalOpen, selectedRow]);

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
      const computedName = [form.firstName, form.lastName].filter(Boolean).join(" ") || form.name;
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
        designation: form.position || form.designation || undefined,
        uanNumber: form.uanNumber || undefined,
        reportingToId: form.reportingToId || undefined,
        workingHours: form.workingHours || undefined,
        bankName: form.bankName || undefined,
        bankBranch: form.bankBranch || undefined,
        accountNumber: form.accountNumber || undefined,
        ifscCode: form.ifscCode || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        username: form.useMobileAsUsername ? form.phone : (form.username || undefined),
        enableAppointments: form.enableAppointments,
        showAllStaffAppointments: form.showAllStaffAppointments,
        workExperience: form.workExperience.length ? form.workExperience : undefined,
        documents: form.documents.length ? form.documents : undefined
      };
      if (editingId) {
        await api.patch(`/owner/users/${editingId}`, { ...payload, name: computedName });
        setStatus((current) => ({ ...current, success: "Staff profile and access updated." }));
      } else {
        await api.post("/owner/users/create-login", {
          ...payload,
          branchId: form.branchId || undefined,
          name: computedName,
          email: form.email,
          password: form.password
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

  const restoreUser = async (row) => {
    await api.patch(`/owner/users/${row.id}/restore`);
    await load(filterBranch);
  };

const handleDirectorySelect = (rowId) => {
    startTransition(() => {
      setSelectedId(rowId);
    });
  };

  const handleExport = () => {
    if (accessControl.allowStaffExport === false) return;
    const header = ["Name", "Email", "Phone", "Role", "Custom Role", "Branch", "Designation", "Active"];
    const rowsToExport = filteredRows.map((row) => [
      row.user?.name || "",
      row.user?.email || "",
      row.phone || "",
      row.roleTitle || resolveRoleLabel(row.salonRole),
      row.customRole?.name || "",
      row.branch?.name || "All branches",
      row.designation || "",
      row.user?.isActive ? "Yes" : "No"
    ]);
    const csv = [header, ...rowsToExport]
      .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `staff-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="page-shell" style={{ padding: 0, height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {status.loading ? (
        <PageLoader title="Loading staff workspace" message="Pulling users, saved roles, branches, and services into one permission-controlled workspace." />
      ) : null}

      <div className="hub-container" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Left Sidebar: Directory */}
        <div className="hub-sidebar" style={{ width: 340, display: 'flex', flexDirection: 'column', background: 'white', borderRight: '1px solid #e2e8f0', paddingTop: 0 }}>
          <div className="hub-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 600 }}>Team Directory</h3>
          </div>
          
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button 
                className="btn-submit" 
                style={{ flex: 1, padding: '6px 12px', fontSize: 13, minHeight: '34px', margin: 0 }} 
                onClick={startCreate}
              >
                + New Staff
              </button>
              {accessControl.allowStaffExport !== false ? (
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ flex: 1, padding: '6px 12px', fontSize: 13, minHeight: '34px', background: 'white', margin: 0 }}
                  onClick={handleExport}
                >
                  Export CSV
                </button>
              ) : null}
            </div>
            {accessControl.allowStaffExport === false && (
              <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', fontSize: 11 }}>
                Staff export is disabled from Settings.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                className="hub-search-input"
                style={{ flex: 1, boxSizing: 'border-box', minHeight: '34px', padding: '6px 10px', fontSize: 13, margin: 0, width: 'auto' }}
                value={query}
                placeholder="Search staff..."
                onChange={(event) => setQuery(event.target.value)}
              />
              <select 
                className="hub-input" 
                style={{ flex: 1, boxSizing: 'border-box', minHeight: '34px', padding: '6px 10px', fontSize: 13, margin: 0, width: 'auto' }}
                value={filterBranch} 
                onChange={(event) => setFilterBranch(event.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer', flexDirection: 'row' }}>
              <input 
                type="checkbox" 
                checked={showArchived} 
                onChange={(e) => setShowArchived(e.target.checked)} 
                style={{ width: 14, height: 14, minHeight: 'auto', cursor: 'pointer', margin: 0, width: 'auto' }}
              />
              Show archived staff
            </label>
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
                    <strong style={{ color: isActive ? '#2563eb' : '#0f172a' }}>
                      {row.user?.name}
                      {row.isArchived && <span style={{ marginLeft: 8, fontSize: 11, background: '#fef2f2', color: '#ef4444', padding: '2px 6px', borderRadius: 4 }}>Archived</span>}
                    </strong>
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
                  {selectedRow.isArchived ? (
                    <button 
                      type="button" 
                      onClick={() => restoreUser(selectedRow)}
                      style={{ padding: '8px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', border: '1px solid #10b981', background: '#f0fdf4', color: '#10b981' }}
                    >
                      Restore Staff
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => archiveUser(selectedRow)}
                      style={{ padding: '8px 16px', borderRadius: 6, fontSize: 14, cursor: 'pointer', border: 'none', background: '#ef4444', color: 'white' }}
                    >
                      Archive
                    </button>
                  )}
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
                    {/* Top Checkboxes */}
                    <div style={{ display: 'flex', gap: 28, marginBottom: 28, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.enableAppointments} onChange={e => setForm({...form, enableAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                        Active
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.enableAppointments} onChange={e => setForm({...form, enableAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                        Enable Appointments
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.showAllStaffAppointments} onChange={e => setForm({...form, showAllStaffAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                        Show all staff appointments in dashboard
                      </label>
                    </div>

                    {/* Personal Information */}
                    <div style={{ marginBottom: 28 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Personal Information</h4>

                      {/* Row 1: Name, Last Name, Phone, Email */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>First Name</label>
                          <input type="text" className="hub-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Enter Name" />
                        </div>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Last Name</label>
                          <input type="text" className="hub-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Enter Lastname" />
                        </div>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Mobile Number</label>
                          <div style={{ width: '100%' }}>
                            <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({...form, phone})} />
                          </div>
                        </div>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email</label>
                          <input type="email" className="hub-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Enter Email" disabled />
                        </div>
                      </div>

                      {/* Row 2: DOB, Gender, Role */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Date of Birth</label>
                          <input type="date" className="hub-input" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} />
                        </div>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Gender</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 28, height: 38 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                              <input type="radio" name="editGender" value="MALE" checked={form.gender === "MALE"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                              Male
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                              <input type="radio" name="editGender" value="FEMALE" checked={form.gender === "FEMALE"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                              Female
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                              <input type="radio" name="editGender" value="OTHER" checked={form.gender === "OTHER"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                              Other
                            </label>
                          </div>
                        </div>
                        <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Role</label>
                      <select className="hub-input" value={form.customRoleId || form.salonRole} onChange={(e) => {
                        const val = e.target.value;
                        const matchedCustom = customRoles.find(r => r.id === val);
                        if (matchedCustom) {
                          applyCustomRole(val);
                        } else {
                          applyRolePreset(val);
                        }
                      }}>
                        <optgroup label="Custom Roles">
                          {customRoles.length === 0 && <option value="" disabled>No custom roles created</option>}
                          {customRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </optgroup>
                        <optgroup label="Default Roles">
                          {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </optgroup>
                      </select>
                        </div>
                      </div>

                      {/* Row 3: Username, Password, Position */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Username</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="text" className="hub-input" style={{ flex: 1 }} value={form.useMobileAsUsername ? form.phone : form.username} onChange={e => setForm({...form, username: e.target.value, useMobileAsUsername: false})} placeholder="Enter Username" disabled={form.useMobileAsUsername} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <input type="checkbox" checked={form.useMobileAsUsername} onChange={e => setForm({...form, useMobileAsUsername: e.target.checked})} style={{ width: 14, height: 14, accentColor: '#2563eb' }} />
                              Use Mobile
                            </label>
                          </div>
                        </div>
                        <div className="hub-form-group">
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Position</label>
                          <input type="text" className="hub-input" value={form.position} onChange={e => setForm({...form, position: e.target.value, designation: e.target.value})} placeholder="Enter Position" />
                        </div>
                      </div>
                    </div>

                    {/* Services Section */}
                    <div style={{ marginBottom: 28 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Assigned Services</h4>
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

                    {/* Work Experience */}
                    <div style={{ marginBottom: 28 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Work Experience</h4>
                      {form.workExperience.map((exp, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                          <div className="hub-form-group">
                            <label style={{ fontSize: 12, color: '#64748b' }}>Company</label>
                            <input type="text" className="hub-input" value={exp.company || ""} onChange={e => {
                              const next = [...form.workExperience]; next[idx] = {...next[idx], company: e.target.value}; setForm({...form, workExperience: next});
                            }} placeholder="Company name" />
                          </div>
                          <div className="hub-form-group">
                            <label style={{ fontSize: 12, color: '#64748b' }}>Designation</label>
                            <input type="text" className="hub-input" value={exp.designation || ""} onChange={e => {
                              const next = [...form.workExperience]; next[idx] = {...next[idx], designation: e.target.value}; setForm({...form, workExperience: next});
                            }} placeholder="Job title" />
                          </div>
                          <div className="hub-form-group">
                            <label style={{ fontSize: 12, color: '#64748b' }}>Duration</label>
                            <input type="text" className="hub-input" value={exp.duration || ""} onChange={e => {
                              const next = [...form.workExperience]; next[idx] = {...next[idx], duration: e.target.value}; setForm({...form, workExperience: next});
                            }} placeholder="e.g. 2 years" />
                          </div>
                          <button type="button" onClick={() => setForm({...form, workExperience: form.workExperience.filter((_, i) => i !== idx)})} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' }}>x</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm({...form, workExperience: [...form.workExperience, { company: "", designation: "", duration: "" }]})} style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 600 }}>+ Add Experience</button>
                    </div>

                    {/* Documents */}
                    <div style={{ marginBottom: 28 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Documents</h4>
                      {form.documents.map((doc, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                          <div className="hub-form-group">
                            <label style={{ fontSize: 12, color: '#64748b' }}>Name</label>
                            <input type="text" className="hub-input" value={doc.name || ""} onChange={e => {
                              const next = [...form.documents]; next[idx] = {...next[idx], name: e.target.value}; setForm({...form, documents: next});
                            }} placeholder="Enter Name" />
                          </div>
                          <div className="hub-form-group">
                            <label style={{ fontSize: 12, color: '#64748b' }}>Number</label>
                            <input type="text" className="hub-input" value={doc.url || ""} onChange={e => {
                              const next = [...form.documents]; next[idx] = {...next[idx], url: e.target.value}; setForm({...form, documents: next});
                            }} placeholder="Enter Number" />
                          </div>
                          <button type="button" onClick={() => setForm({...form, documents: form.documents.filter((_, i) => i !== idx)})} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer' }}>x</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setForm({...form, documents: [...form.documents, { name: "", url: "" }]})} style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 600 }}>+ Add Document</button>
                    </div>

                    {/* Joining Details */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Joining Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Joining Date</label>
                          <input type="date" className="hub-input" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
                        </div>
                        <div className="hub-form-group">
                          <label>Designation</label>
                          <div style={{ display: "grid", gap: 8 }}>
                            <select className="hub-input" value={designationOptions.includes(form.designation) ? form.designation : ""} onChange={(event) => setForm({ ...form, designation: event.target.value || form.designation })}>
                              <option value="">Select Designation</option>
                              {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                            </select>
                            <input type="text" className="hub-input" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} placeholder="e.g. Senior Stylist" />
                          </div>
                        </div>
                        <div className="hub-form-group">
                          <label>UAN Number</label>
                          <input type="text" className="hub-input" value={form.uanNumber} onChange={(event) => setForm({ ...form, uanNumber: event.target.value })} placeholder="Enter UAN Number" />
                        </div>
                        <div className="hub-form-group">
                          <label>Working Hrs</label>
                          <input type="text" className="hub-input" value={form.workingHours} onChange={(event) => setForm({ ...form, workingHours: event.target.value })} placeholder="Enter Hours" />
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

                    {/* Bank Details */}
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Bank Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Bank Name</label>
                          <input type="text" className="hub-input" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="Enter Name" />
                        </div>
                        <div className="hub-form-group">
                          <label>Branch</label>
                          <input type="text" className="hub-input" value={form.bankBranch} onChange={(event) => setForm({ ...form, bankBranch: event.target.value })} placeholder="Enter Branch" />
                        </div>
                        <div className="hub-form-group">
                          <label>Account Number</label>
                          <input type="text" className="hub-input" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Enter Number" />
                        </div>
                        <div className="hub-form-group">
                          <label>IFSC Code</label>
                          <input type="text" className="hub-input" value={form.ifscCode} onChange={(event) => setForm({ ...form, ifscCode: event.target.value })} placeholder="Enter IFSC Code" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
                      <button type="button" className="btn-cancel" onClick={() => startEdit(selectedRow)}>Cancel</button>
                      <button type="button" className="btn-cancel" onClick={() => {}} style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fbbf24' }}>Weekly Off</button>
                      <button type="submit" className="btn-submit">Save</button>
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
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 960, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="hub-modal-header">Create New Staff</div>
            
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="hub-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '24px 32px' }}>
                {/* Top Checkboxes */}
                <div style={{ display: 'flex', gap: 32, marginBottom: 28 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={form.enableAppointments} onChange={e => setForm({...form, enableAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                    Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={form.enableAppointments} onChange={e => setForm({...form, enableAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                    Enable Appointments
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={form.showAllStaffAppointments} onChange={e => setForm({...form, showAllStaffAppointments: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#2563eb' }} />
                    Show all staff appointments in dashboard
                  </label>
                </div>

                {/* Personal Information */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Personal Information</h4>

                  {/* Row 1: Name, Last Name, Phone, Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>First Name</label>
                      <input type="text" className="hub-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Enter Name" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Last Name</label>
                      <input type="text" className="hub-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Enter Lastname" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Mobile Number</label>
                      <div style={{ width: '100%' }}>
                        <IndianPhoneInput value={form.phone} onChange={(phone) => setForm({...form, phone})} />
                      </div>
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Email</label>
                      <input type="email" className="hub-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Enter Email" />
                    </div>
                  </div>

                  {/* Row 2: DOB, Gender, Role */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr 1fr', gap: 16, marginBottom: 16, alignItems: 'end' }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Date of Birth</label>
                      <input type="date" className="hub-input" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Gender</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 28, height: 38 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                          <input type="radio" name="gender" value="MALE" checked={form.gender === "MALE"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                          Male
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                          <input type="radio" name="gender" value="FEMALE" checked={form.gender === "FEMALE"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                          Female
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', cursor: 'pointer' }}>
                          <input type="radio" name="gender" value="OTHER" checked={form.gender === "OTHER"} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: 18, height: 18, accentColor: '#2563eb', margin: 0 }} />
                          Other
                        </label>
                      </div>
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Role</label>
                      <select className="hub-input" value={form.customRoleId || form.salonRole} onChange={(e) => {
                        const val = e.target.value;
                        const matchedCustom = customRoles.find(r => r.id === val);
                        if (matchedCustom) {
                          applyCustomRole(val);
                        } else {
                          applyRolePreset(val);
                        }
                      }}>
                        <optgroup label="Custom Roles">
                          {customRoles.length === 0 && <option value="" disabled>No custom roles created</option>}
                          {customRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </optgroup>
                        <optgroup label="Default Roles">
                          {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Username, Password, Position */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Username</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="text" className="hub-input" style={{ flex: 1 }} value={form.useMobileAsUsername ? form.phone : form.username} onChange={e => setForm({...form, username: e.target.value, useMobileAsUsername: false})} placeholder="Enter Username" disabled={form.useMobileAsUsername} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <input type="checkbox" checked={form.useMobileAsUsername} onChange={e => setForm({...form, useMobileAsUsername: e.target.checked})} style={{ width: 14, height: 14, accentColor: '#2563eb' }} />
                          Use Mobile
                        </label>
                      </div>
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Password</label>
                      <input type="password" required className="hub-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter Password" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Position</label>
                      <input type="text" className="hub-input" value={form.position} onChange={e => setForm({...form, position: e.target.value, designation: e.target.value})} placeholder="Enter Position" />
                    </div>
                  </div>
                </div>

                {/* Work Experience */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Work Experience</h4>
                  {form.workExperience.map((exp, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                      <div className="hub-form-group">
                        <label style={{ fontSize: 12, color: '#64748b' }}>Company</label>
                        <input type="text" className="hub-input" value={exp.company || ""} onChange={e => {
                          const next = [...form.workExperience]; next[idx] = {...next[idx], company: e.target.value}; setForm({...form, workExperience: next});
                        }} placeholder="Company name" />
                      </div>
                      <div className="hub-form-group">
                        <label style={{ fontSize: 12, color: '#64748b' }}>Designation</label>
                        <input type="text" className="hub-input" value={exp.designation || ""} onChange={e => {
                          const next = [...form.workExperience]; next[idx] = {...next[idx], designation: e.target.value}; setForm({...form, workExperience: next});
                        }} placeholder="Job title" />
                      </div>
                      <div className="hub-form-group">
                        <label style={{ fontSize: 12, color: '#64748b' }}>Duration</label>
                        <input type="text" className="hub-input" value={exp.duration || ""} onChange={e => {
                          const next = [...form.workExperience]; next[idx] = {...next[idx], duration: e.target.value}; setForm({...form, workExperience: next});
                        }} placeholder="e.g. 2 years" />
                      </div>
                      <button type="button" onClick={() => setForm({...form, workExperience: form.workExperience.filter((_, i) => i !== idx)})} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, workExperience: [...form.workExperience, { company: "", designation: "", duration: "" }]})} style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    + Add Experience
                  </button>
                </div>

                {/* Documents */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Documents</h4>
                  {form.documents.map((doc, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                      <div className="hub-form-group">
                        <label style={{ fontSize: 12, color: '#64748b' }}>Name</label>
                        <input type="text" className="hub-input" value={doc.name || ""} onChange={e => {
                          const next = [...form.documents]; next[idx] = {...next[idx], name: e.target.value}; setForm({...form, documents: next});
                        }} placeholder="Enter Name" />
                      </div>
                      <div className="hub-form-group">
                        <label style={{ fontSize: 12, color: '#64748b' }}>Number</label>
                        <input type="text" className="hub-input" value={doc.url || ""} onChange={e => {
                          const next = [...form.documents]; next[idx] = {...next[idx], url: e.target.value}; setForm({...form, documents: next});
                        }} placeholder="Enter Number" />
                      </div>
                      <button type="button" onClick={() => setForm({...form, documents: form.documents.filter((_, i) => i !== idx)})} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm({...form, documents: [...form.documents, { name: "", url: "" }]})} style={{ background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    + Add Document
                  </button>
                </div>

                {/* Joining Details */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Joining Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16 }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Joining Date</label>
                      <input type="date" className="hub-input" value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Designation</label>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <select className="hub-input" value={designationOptions.includes(form.designation) ? form.designation : ""} onChange={e => setForm({...form, designation: e.target.value || form.designation})}>
                          <option value="">Select Designation</option>
                          {designationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <input type="text" className="hub-input" value={form.designation} onChange={e => setForm({...form, designation: e.target.value, position: e.target.value})} placeholder="e.g. Senior Stylist" />
                      </div>
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>UAN Number</label>
                      <input type="text" className="hub-input" value={form.uanNumber} onChange={e => setForm({...form, uanNumber: e.target.value})} placeholder="12-digit UAN" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Reporting To</label>
                      <select className="hub-input" value={form.reportingToId} onChange={e => setForm({...form, reportingToId: e.target.value})}>
                        <option value="">None / Self</option>
                        {rows.map(r => r.id !== selectedRow?.id && <option key={r.id} value={r.id}>{r.user?.name || r.phone}</option>)}
                      </select>
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Working Hrs</label>
                      <input type="text" className="hub-input" value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} placeholder="Enter Hours" />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>Bank Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Bank Name</label>
                      <input type="text" className="hub-input" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} placeholder="Enter Name" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Branch</label>
                      <input type="text" className="hub-input" value={form.bankBranch} onChange={e => setForm({...form, bankBranch: e.target.value})} placeholder="Enter Branch" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Account Number</label>
                      <input type="text" className="hub-input" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} placeholder="Enter Number" />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>IFSC Code</label>
                      <input type="text" className="hub-input" value={form.ifscCode} onChange={e => setForm({...form, ifscCode: e.target.value})} placeholder="Enter IFSC Code" />
                    </div>
                  </div>
                </div>

                {status.error && <div style={{ color: '#ef4444', padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: '0.9rem', marginBottom: 16 }}>{status.error}</div>}
              </div>

              <div className="hub-modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
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
