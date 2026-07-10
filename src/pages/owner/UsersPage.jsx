import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../api/client";
import { useBranch } from '../../context/BranchContext';
import "./ServiceHubPage.css";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { ensureSingleFaceInImage, loadFaceVerificationModels } from "../../utils/faceVerification";
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
  salonRole: "STAFF",
  roleTitle: "",
  phone: "",
  avatarUrl: "",
  profileNote: "",
  branchId: "",
  customRoleId: "",
  showInCatalog: false,
  attendanceEnabled: true,
  attendanceEnrollmentPhotoUrl: "",
  serviceIds: [],
  permissions: clonePermissions(DEFAULT_PERMISSIONS),
  joiningDate: "",
  designation: "",
  uanNumber: "",
  reportingToId: "",
  workingHours: "",
  workingHoursStart: "",
  workingHoursEnd: "",
  bankName: "",
  bankBranch: "",
  accountNumber: "",
  ifscCode: ""
});

const moduleCatalog = MODULE_GROUPS.flatMap((group) => group.modules);

export default function UsersPage() {
  const { selectedBranchId, branches } = useBranch();
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(makeEmptyForm);
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [enrollmentCaptureBusy, setEnrollmentCaptureBusy] = useState(false);
  const [enrollmentCameraOpen, setEnrollmentCameraOpen] = useState(false);
  const [enrollmentCameraError, setEnrollmentCameraError] = useState("");
  const enrollmentVideoRef = useRef(null);
  const enrollmentCanvasRef = useRef(null);
  const enrollmentStreamRef = useRef(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const openEnrollmentCamera = async () => {
    setEnrollmentCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      enrollmentStreamRef.current = stream;
      setEnrollmentCameraOpen(true);
    } catch (err) {
      let msg = "Camera permission is required to capture enrollment selfie.";
      if (err?.name === "NotAllowedError") msg = "Camera permission denied. Please allow camera access in browser settings.";
      if (err?.name === "NotFoundError") msg = "No camera found. Please connect a camera.";
      if (err?.name === "NotReadableError") msg = "Camera is already in use by another application.";
      setEnrollmentCameraError(msg);
    }
  };

  const stopEnrollmentCamera = () => {
    if (enrollmentStreamRef.current) {
      enrollmentStreamRef.current.getTracks().forEach((t) => t.stop());
      enrollmentStreamRef.current = null;
    }
    setEnrollmentCameraOpen(false);
  };

  const captureEnrollmentFrame = async () => {
    const video = enrollmentVideoRef.current;
    const canvas = enrollmentCanvasRef.current;
    if (!video || !canvas) {
      setEnrollmentCameraError("Camera not ready. Please close and reopen the camera.");
      return;
    }
    setEnrollmentCaptureBusy(true);
    setEnrollmentCameraError("");
    try {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to access camera capture.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Failed to capture frame.");
      const file = new File([blob], "enrollment-selfie.jpg", { type: "image/jpeg" });
      const url = await uploadEnrollmentImage(file);
      stopEnrollmentCamera();
      setEnrollmentCameraError("");
      setForm((c) => ({ ...c, attendanceEnrollmentPhotoUrl: url, attendanceEnabled: true }));
      setStatus((s) => ({ ...s, success: "Enrollment selfie captured successfully.", error: "" }));
    } catch (err) {
      console.error("[Biometric] Capture failed:", err);
      setEnrollmentCameraError(formatApiError(err, "Could not capture enrollment selfie"));
    } finally {
      setEnrollmentCaptureBusy(false);
    }
  };

  useEffect(() => {
    if (enrollmentCameraOpen && enrollmentVideoRef.current && enrollmentStreamRef.current) {
      enrollmentVideoRef.current.srcObject = enrollmentStreamRef.current;
      enrollmentVideoRef.current.play().catch(() => {});
    }
  }, [enrollmentCameraOpen]);

  useEffect(() => () => stopEnrollmentCamera(), []);

  const uploadEnrollmentImage = async (file) => {
    if (!file) return "";
    console.log("[Biometric] Running face verification...");
    await ensureSingleFaceInImage(file);
    console.log("[Biometric] Face verified, uploading...");
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data?.url || "";
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setStatus((s) => ({ ...s, error: "", success: "" }));
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm((f) => ({ ...f, avatarUrl: response.data?.url || "" }));
      setStatus((s) => ({ ...s, success: "Profile image uploaded successfully." }));
    } catch (err) {
      setStatus((s) => ({ ...s, error: formatApiError(err, "Failed to upload profile image.") }));
    } finally {
      setAvatarUploading(false);
    }
  };

  const load = async (branchId = selectedBranchId) => {
    try {
      const [usersResponse, servicesResponse, rolesResponse, settingsResponse] = await Promise.all([
        api.get("/owner/users", { params: branchId ? { branchId } : {} }),
        api.get("/owner/services", { params: branchId ? { branchId } : {} }),
        api.get("/owner/custom-roles"),
        api.get("/owner/settings")
      ]);
      setRows(usersResponse.data);
      setServices(servicesResponse.data);
      setCustomRoles(rolesResponse.data);
      setDesignationOptions(
        Array.isArray(settingsResponse.data?.advancedSettings?.designations)
          ? settingsResponse.data.advancedSettings.designations.filter((row) => row?.active !== false && row?.name).map((row) => row.name)
          : []
      );
    } catch {
      // Auth expired or network error — will redirect to login
    } finally {
      setStatus((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => {
    let active = true;
    load();
    return () => { active = false; };
  }, [selectedBranchId]);

  useEffect(() => {
    loadFaceVerificationModels()
      .then(() => console.log("[Biometric] Face verification models loaded"))
      .catch((err) => console.error("[Biometric] Failed to load face models:", err));
  }, []);

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

  const openAccessControl = () => {
    window.open("/#/admin/roles-permissions", "_blank", "noopener,noreferrer");
  };

  const startCreate = () => {
    resetForm();
    setForm((current) => ({ ...current, branchId: selectedBranchId || "" }));
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
      attendanceEnabled: Boolean(row.attendanceEnabled),
      attendanceEnrollmentPhotoUrl: row.attendanceEnrollmentPhotoUrl || "",
      serviceIds: Array.isArray(row.serviceAssignments) ? row.serviceAssignments.map((item) => item.serviceId) : [],
      permissions: clonePermissions(row.permissions || {}),
      joiningDate: row.joiningDate ? new Date(row.joiningDate).toISOString().split('T')[0] : "",
      designation: row.designation || "",
      uanNumber: row.uanNumber || "",
      reportingToId: row.reportingToId || "",
      workingHours: row.workingHours || "",
      workingHoursStart: row.workingHours ? row.workingHours.split(/\s*-\s*/)[0] || "" : "",
      workingHoursEnd: row.workingHours ? row.workingHours.split(/\s*-\s*/)[1] || "" : "",
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
      salonRole: roleId ? "STAFF" : current.salonRole,
      roleTitle: role?.name || current.roleTitle,
      permissions: clonePermissions(role?.permissions || DEFAULT_PERMISSIONS)
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      if (!editingId) {
        if (!form.name?.trim()) return setStatus((current) => ({ ...current, error: "Name is required" }));
        if (form.name.trim().length < 2) return setStatus((current) => ({ ...current, error: "Name must be at least 2 characters" }));
        if (!form.email?.trim()) return setStatus((current) => ({ ...current, error: "Email is required" }));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setStatus((current) => ({ ...current, error: "Enter a valid email address" }));
        if (!form.password) return setStatus((current) => ({ ...current, error: "Password is required" }));
        if (form.password.length < 8) return setStatus((current) => ({ ...current, error: "Password must be at least 8 characters" }));
        if (form.password.length > 128) return setStatus((current) => ({ ...current, error: "Password must be at most 128 characters" }));
        if (form.phone && !/^\+91\d{10}$/.test(form.phone)) return setStatus((current) => ({ ...current, error: "Phone must be a valid 10-digit Indian number" }));
        if (form.uanNumber && !/^\d{12}$/.test(form.uanNumber)) return setStatus((current) => ({ ...current, error: "UAN must be exactly 12 digits" }));
        if (form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber)) return setStatus((current) => ({ ...current, error: "Account number must be 9-18 digits" }));
        if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) return setStatus((current) => ({ ...current, error: "Invalid IFSC code format (e.g. HDFC0001234)" }));
      } else {
        if (form.phone && !/^\+91\d{10}$/.test(form.phone)) return setStatus((current) => ({ ...current, error: "Phone must be a valid 10-digit Indian number" }));
        if (form.uanNumber && !/^\d{12}$/.test(form.uanNumber)) return setStatus((current) => ({ ...current, error: "UAN must be exactly 12 digits" }));
        if (form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber)) return setStatus((current) => ({ ...current, error: "Account number must be 9-18 digits" }));
        if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) return setStatus((current) => ({ ...current, error: "Invalid IFSC code format (e.g. HDFC0001234)" }));
      }
      const payload = {
        salonRole: form.salonRole,
        roleTitle: form.roleTitle || undefined,
        phone: form.phone || undefined,
        avatarUrl: form.avatarUrl || undefined,
        profileNote: form.profileNote || undefined,
        branchId: selectedBranchId || branches[0]?.id || null,
        customRoleId: form.customRoleId || undefined,
        showInCatalog: Boolean(form.showInCatalog),
        attendanceEnabled: Boolean(form.attendanceEnabled),
        attendanceEnrollmentPhotoUrl: form.attendanceEnrollmentPhotoUrl || undefined,
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
          branchId: selectedBranchId || branches[0]?.id || undefined,
          name: form.name.trim(),
          email: form.email.trim(),
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
      await load(selectedBranchId);
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Could not save staff user"), success: "" }));
    }
  };

  const toggleUserStatus = async (row) => {
    try {
      await api.patch(`/owner/users/${row.id}/status`, { isActive: !row.user.isActive });
      await load(selectedBranchId);
    } catch (err) {
      alert("Failed to update user status.");
    }
  };

  const archiveUser = async (row) => {
    try {
      await api.patch(`/owner/users/${row.id}/archive`);
      if (editingId === row.id) {
        resetForm();
      }
      await load(selectedBranchId);
    } catch (err) {
      alert("Failed to archive user.");
    }
  };

  const handleDirectorySelect = (rowId) => {
    startTransition(() => {
      setSelectedId(rowId);
    });
  };

  return (
    <div className="page-shell" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {enrollmentCameraOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 16 }}>
          <div style={{ width: 'min(100%, 480px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Biometric Enrollment</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>Position face inside the oval and hold still</div>
              </div>
              <button type="button" onClick={stopEnrollmentCamera} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
              <video ref={enrollmentVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 180, height: 240, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.6)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
              </div>
              <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '6px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                Front Camera Active
              </div>
            </div>
            <canvas ref={enrollmentCanvasRef} style={{ display: 'none' }} />
            {enrollmentCameraError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', fontSize: 12, fontWeight: 500, lineHeight: 1.5 }}>
                {enrollmentCameraError}
              </div>
            )}
            <button
              type="button"
              onClick={() => void captureEnrollmentFrame()}
              disabled={enrollmentCaptureBusy}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: enrollmentCaptureBusy ? '#64748b' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: enrollmentCaptureBusy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {enrollmentCaptureBusy ? (
                <>
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinAround 0.8s linear infinite' }} />
                  Verifying & Uploading...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="13" r="4" />
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  </svg>
                  Capture & Verify Face
                </>
              )}
            </button>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center' }}>Photo will be validated for a single clear face before saving</div>
          </div>
        </div>
      )}
      {status.loading ? (
        <PageLoader title="Loading staff workspace" message="Pulling users, saved roles, branches, and services into one permission-controlled workspace." />
      ) : null}

      <div className="hub-container" style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Left Sidebar: Directory */}
        <div className="hub-sidebar" style={{ width: 340, display: 'flex', flexDirection: 'column', background: 'white', borderRight: '1px solid #e2e8f0', paddingTop: 0 }}>
          <div className="hub-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', fontWeight: 600 }}>Team Directory</h3>
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
                    {row.branch?.name || "All branches"} • {moduleCount} enabled modules • {row.attendanceEnabled ? "Attendance Ready" : "Attendance Off"}
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
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
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
                      
                      {/* PRIMARY: Custom role from Access Control */}
                      <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>🎯 Access Role (from Access Control)</span>
                              <span style={{ background: '#2563eb', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, letterSpacing: 0.5 }}>RECOMMENDED</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                              Roles created in <strong>Settings → Access Control</strong>. Pick one to auto-apply its full permission set.
                            </div>
                          </div>
                          <button type="button" onClick={openAccessControl} className="secondary-button" style={{ background: 'white', border: '1px solid #2563eb', color: '#1d4ed8', padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}>
                            + Create New Role
                          </button>
                        </div>
                        <select
                          className="hub-input"
                          style={{ width: '100%', background: 'white', fontSize: 14, fontWeight: 600 }}
                          value={form.customRoleId || ""}
                          onChange={(event) => applyCustomRole(event.target.value)}
                        >
                          <option value="">— No saved access role (use system role below) —</option>
                          {customRoles.length === 0 && (
                            <option value="" disabled>No custom roles yet — create one in Access Control</option>
                          )}
                          {customRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}{role.description ? ` — ${role.description}` : ""}
                            </option>
                          ))}
                        </select>
                        {form.customRoleId && (() => {
                          const sel = customRoles.find((r) => r.id === form.customRoleId);
                          if (!sel) return null;
                          const grantedModules = Object.entries(sel.permissions || {}).filter(([, actions]) => Array.isArray(actions) && actions.length > 0).length;
                          return (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span>✓ Permissions loaded: <strong>{grantedModules}</strong> module{grantedModules === 1 ? "" : "s"}</span>
                              {sel.isSystemPreset && <span style={{ background: '#fbbf24', color: '#78350f', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>PRESET</span>}
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="responsive-grid" className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>System role (fallback) <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 11 }}>— auto-set when access role picked</span></label>
                          <select className="hub-input" value={form.salonRole} onChange={(event) => applyRolePreset(event.target.value)} disabled={Boolean(form.customRoleId)} style={form.customRoleId ? { background: '#f1f5f9', cursor: 'not-allowed' } : undefined}>
                            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                          </select>
                        </div>
                        <div className="hub-form-group">
                          <label>Role title (Visible designation)</label>
                          <input type="text" className="hub-input" value={form.roleTitle} onChange={(event) => setForm({ ...form, roleTitle: event.target.value })} placeholder="e.g. Senior Stylist, Floor Manager" />
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
                  <IndianPhoneInput required={false} value={form.phone} onChange={(phone) => setForm({ ...form, phone })} className="hub-input" inputStyle={{ padding: "12px 14px" }} />
                        </div>
                        <div className="hub-form-group">
                          <label>Profile Avatar</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {form.avatarUrl ? (
                              <img src={form.avatarUrl} alt="Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                              </div>
                            )}
                            <label className="secondary-button" style={{ fontSize: 12, padding: '6px 12px', cursor: 'pointer', display: 'inline-block', margin: 0 }}>
                              {avatarUploading ? "Uploading..." : "Upload Image"}
                              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} style={{ display: 'none' }} />
                            </label>
                            {form.avatarUrl && (
                              <button type="button" onClick={() => setForm({...form, avatarUrl: ""})} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>Remove</button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="hub-form-group" style={{ marginTop: 16 }}>
                        <div className="hub-toggle-group">
                          <input type="checkbox" checked={form.showInCatalog} onChange={(event) => setForm({ ...form, showInCatalog: event.target.checked })} />
                          <span>Show this staff member in salon catalog / expert listing</span>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, padding: 16, border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fbff' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 10 }}>Owner-side Attendance Biometric</div>
                        <div className="hub-toggle-group" style={{ marginBottom: 12 }}>
                          <input type="checkbox" checked={form.attendanceEnabled} onChange={(event) => setForm({ ...form, attendanceEnabled: event.target.checked })} />
                          <span>Enable selfie attendance for this staff account</span>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 8 }}>Enrollment Selfie</label>
                        {form.attendanceEnrollmentPhotoUrl ? (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <img src={form.attendanceEnrollmentPhotoUrl} alt="Enrollment selfie" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid #22c55e' }} />
                            <div style={{ display: 'grid', gap: 6 }}>
                              <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Enrollment selfie captured</div>
                              <button type="button" className="secondary-button" style={{ fontSize: 12, padding: '6px 12px', width: 'fit-content', cursor: 'pointer' }} onClick={openEnrollmentCamera}>Retake</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={openEnrollmentCamera} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '28px 16px', borderRadius: 10, border: '2px dashed #93c5fd', background: '#eff6ff', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                              <circle cx="12" cy="13" r="3" />
                            </svg>
                            <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>Capture Enrollment Selfie</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Click to open live camera and capture staff face for biometric enrollment</div>
                          </button>
                        )}
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                          Staff can only use self check-in after owner enables attendance and captures an enrollment selfie.
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
                      <div className="responsive-grid" className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                          <input type="text" className="hub-input" value={form.uanNumber} onChange={(event) => setForm({ ...form, uanNumber: event.target.value })} placeholder="12-digit UAN" pattern="\d{12}" maxLength={12} />
                        </div>
                        <div className="hub-form-group">
                          <label>Working Hours</label>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input type="time" className="hub-input" value={form.workingHoursStart || ""} onChange={e => {
                              const start = e.target.value;
                              const end = form.workingHoursEnd || "";
                              setForm({ ...form, workingHoursStart: start, workingHours: start && end ? `${start} - ${end}` : start || "" });
                            }} style={{ flex: 1 }} />
                            <span style={{ color: "#64748b", fontSize: 13, flexShrink: 0 }}>to</span>
                            <input type="time" className="hub-input" value={form.workingHoursEnd || ""} onChange={e => {
                              const end = e.target.value;
                              const start = form.workingHoursStart || "";
                              setForm({ ...form, workingHoursEnd: end, workingHours: start && end ? `${start} - ${end}` : "" });
                            }} style={{ flex: 1 }} />
                          </div>
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
                      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="hub-form-group">
                          <label>Bank Name</label>
                          <input type="text" className="hub-input" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} placeholder="e.g. HDFC Bank" maxLength={200} />
                        </div>
                        <div className="hub-form-group">
                          <label>Branch Name</label>
                          <input type="text" className="hub-input" value={form.bankBranch} onChange={(event) => setForm({ ...form, bankBranch: event.target.value })} placeholder="Branch Area" maxLength={200} />
                        </div>
                        <div className="hub-form-group">
                          <label>Account Number</label>
                          <input type="text" className="hub-input" value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} placeholder="Account No." pattern="\d{9,18}" maxLength={18} />
                        </div>
                        <div className="hub-form-group">
                          <label>IFSC / Routing Code</label>
                          <input type="text" className="hub-input" value={form.ifscCode} onChange={(event) => setForm({ ...form, ifscCode: event.target.value.toUpperCase() })} placeholder="IFSC Code" pattern="[A-Z]{4}0[A-Z0-9]{6}" maxLength={11} style={{ textTransform: 'uppercase' }} />
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
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Create New Staff
              <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 4, display: "flex" }}><X size={18} /></button>
            </div>
            
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {status.error && <div className="form-error-banner" style={{ padding: '10px 14px', background: '#fef2f2', color: '#b91c1c', fontSize: 13, borderBottom: '1px solid #fecaca', flexShrink: 0 }}>{status.error}</div>}
              <div className="hub-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Full Name *</label>
                  <input type="text" required className="hub-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" minLength={2} maxLength={200} />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Email Address *</label>
                  <input type="email" required className="hub-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" maxLength={254} />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Password *</label>
                  <input type="password" required className="hub-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 chars, uppercase + lowercase + digit" minLength={8} maxLength={128} />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Access Role
                    <span style={{ background: '#2563eb', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, letterSpacing: 0.5 }}>FROM ACCESS CONTROL</span>
                  </label>
                  <select className="hub-input" value={form.customRoleId || ""} onChange={e => applyCustomRole(e.target.value)}>
                    <option value="">— Select access role —</option>
                    {customRoles.length === 0 && (
                      <option value="" disabled>No custom roles yet — create one in Settings → Access Control</option>
                    )}
                    {customRoles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}{role.description ? ` — ${role.description}` : ""}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Roles from Settings → Access Control</span>
                    <button type="button" onClick={openAccessControl} style={{ fontSize: 11, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>+ Create role</button>
                  </div>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Branch Assignment</label>
                  <div style={{ padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 14, color: "#334155", background: "#f8fafc" }}>
                    {selectedBranchId ? (branches.find(b => b.id === selectedBranchId)?.name || "Selected Branch") : "All Branches"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Auto-assigned from topbar branch selector</div>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Role Title (Visible designation)</label>
                  <input type="text" className="hub-input" value={form.roleTitle} onChange={e => setForm({ ...form, roleTitle: e.target.value })} placeholder="e.g. Senior Stylist, Floor Manager" />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Phone</label>
                  <IndianPhoneInput required={true} value={form.phone} onChange={(phone) => setForm({ ...form, phone })} className="hub-input" inputStyle={{ padding: "12px 14px" }} />
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Profile Avatar</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      </div>
                    )}
                    <label className="secondary-button" style={{ fontSize: 12, padding: '6px 12px', cursor: 'pointer', display: 'inline-block', margin: 0 }}>
                      {avatarUploading ? "Uploading..." : "Upload Image"}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} style={{ display: 'none' }} />
                    </label>
                    {form.avatarUrl && (
                      <button type="button" onClick={() => setForm({...form, avatarUrl: ""})} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>Remove</button>
                    )}
                  </div>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <div className="hub-toggle-group">
                    <input type="checkbox" checked={form.showInCatalog} onChange={(event) => setForm({ ...form, showInCatalog: event.target.checked })} />
                    <span>Show this staff member in salon catalog / expert listing</span>
                  </div>
                </div>

                <div style={{ marginBottom: 16, padding: 16, border: '1px solid #dbeafe', borderRadius: 10, background: '#f8fbff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 10 }}>Owner-side Attendance Biometric</div>
                  <div className="hub-form-group" style={{ marginBottom: 10 }}>
                    <div className="hub-toggle-group">
                      <input type="checkbox" checked={form.attendanceEnabled} onChange={(event) => setForm({ ...form, attendanceEnabled: event.target.checked })} />
                      <span>Enable selfie attendance for this staff account</span>
                    </div>
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 0 }}>
                    <label>Enrollment Selfie</label>
                    {form.attendanceEnrollmentPhotoUrl ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                        <img src={form.attendanceEnrollmentPhotoUrl} alt="Enrollment selfie" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid #22c55e' }} />
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Enrollment selfie captured</div>
                          <button type="button" className="secondary-button" style={{ fontSize: 12, padding: '6px 12px', width: 'fit-content', cursor: 'pointer' }} onClick={openEnrollmentCamera}>Retake</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={openEnrollmentCamera} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '28px 16px', borderRadius: 10, border: '2px dashed #93c5fd', background: '#eff6ff', cursor: 'pointer', marginTop: 6, transition: 'border-color 0.2s' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        <div style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>Capture Enrollment Selfie</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Click to open live camera and capture staff face for biometric enrollment</div>
                      </button>
                    )}
                  </div>
                </div>

                <div className="hub-form-group" style={{ marginBottom: 16 }}>
                  <label>Designation</label>
                  <select className="hub-input" value={designationOptions.includes(form.designation) ? form.designation : ""} onChange={e => setForm({ ...form, designation: e.target.value })}>
                    <option value="">Select designation</option>
                    {designationOptions.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                  </select>
                </div>

                <h4 style={{ fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, margin: '8px 0 12px' }}>Employment & HR Details</h4>
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Date of Joining</label>
                    <input type="date" className="hub-input" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>UAN Number</label>
                    <input type="text" className="hub-input" value={form.uanNumber} onChange={e => setForm({ ...form, uanNumber: e.target.value })} placeholder="12-digit UAN" pattern="\d{12}" maxLength={12} />
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Working Hours</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="time" className="hub-input" value={form.workingHoursStart || ""} onChange={e => {
                        const start = e.target.value;
                        const end = form.workingHoursEnd || "";
                        setForm({ ...form, workingHoursStart: start, workingHours: start && end ? `${start} - ${end}` : start || "" });
                      }} style={{ flex: 1 }} />
                      <span style={{ color: "#64748b", fontSize: 13, flexShrink: 0 }}>to</span>
                      <input type="time" className="hub-input" value={form.workingHoursEnd || ""} onChange={e => {
                        const end = e.target.value;
                        const start = form.workingHoursStart || "";
                        setForm({ ...form, workingHoursEnd: end, workingHours: start && end ? `${start} - ${end}` : "" });
                      }} style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Reporting To</label>
                    <select className="hub-input" value={form.reportingToId} onChange={e => setForm({ ...form, reportingToId: e.target.value })}>
                      <option value="">None / Self</option>
                      {rows.map((r) => <option key={r.id} value={r.id}>{r.user?.name || r.phone}</option>)}
                    </select>
                  </div>
                </div>

                <h4 style={{ fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, margin: '8px 0 12px' }}>Bank & Payroll Details</h4>
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Bank Name</label>
                    <input type="text" className="hub-input" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HDFC Bank" maxLength={200} />
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Branch Name</label>
                    <input type="text" className="hub-input" value={form.bankBranch} onChange={e => setForm({ ...form, bankBranch: e.target.value })} placeholder="Branch Area" maxLength={200} />
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>Account Number</label>
                    <input type="text" className="hub-input" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account No." pattern="\d{9,18}" maxLength={18} />
                  </div>
                  <div className="hub-form-group" style={{ marginBottom: 16 }}>
                    <label>IFSC / Routing Code</label>
                    <input type="text" className="hub-input" value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC Code" pattern="[A-Z]{4}0[A-Z0-9]{6}" maxLength={11} style={{ textTransform: 'uppercase' }} />
                  </div>
                </div>

                <h4 style={{ fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, margin: '8px 0 12px' }}>Assigned Services</h4>
                <div className="staff-chip-grid" style={{ marginBottom: 16 }}>
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
