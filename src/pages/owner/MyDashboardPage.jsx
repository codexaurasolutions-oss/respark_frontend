import { useEffect, useRef, useState } from "react";
import { Bell, CalendarCheck, Camera, CameraOff, CheckCircle2, Clock, LogIn, LogOut, MapPin, Send, Shield, Timer, Upload, X } from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { compareFaceSources, loadFaceVerificationModels } from "../../utils/faceVerification";

const uploadImage = async (file, filename = "attendance-selfie.jpg") => {
  if (!file) return "";
  const formData = new FormData();
  formData.append("image", file, filename);
  const response = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data?.url || "";
};

const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const STEPS = {
  PERMISSIONS: "permissions",
  GPS: "gps",
  CAPTURE: "capture",
  SUBMITTING: "submitting",
  SUCCESS: "success"
};

const flowAccent = {
  [STEPS.PERMISSIONS]: { tone: "#7c3aed", surface: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(139,92,246,0.10))", border: "rgba(124,58,237,0.18)" },
  [STEPS.GPS]: { tone: "#0f766e", surface: "linear-gradient(135deg, rgba(15,118,110,0.12), rgba(14,165,233,0.10))", border: "rgba(15,118,110,0.18)" },
  [STEPS.CAPTURE]: { tone: "#1d4ed8", surface: "linear-gradient(135deg, rgba(29,78,216,0.12), rgba(56,189,248,0.10))", border: "rgba(29,78,216,0.18)" },
  [STEPS.SUBMITTING]: { tone: "#6d28d9", surface: "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(14,165,233,0.10))", border: "rgba(109,40,217,0.18)" },
  [STEPS.SUCCESS]: { tone: "#166534", surface: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.10))", border: "rgba(34,197,94,0.18)" }
};

export default function MyDashboardPage() {
  const [data, setData] = useState({
    todayAppointments: [],
    recentAppointments: [],
    assignedServices: [],
    notifications: [],
    todayAttendance: null,
    profile: null,
    attendanceSettings: null
  });
  const [loading, setLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState({ loading: false, error: "", success: "" });
  const [flow, setFlow] = useState({ open: false, action: "", step: "", busy: false, error: "", success: "", coords: null, warning: "" });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const flowIdRef = useRef(0);

  const [loadError, setLoadError] = useState("");
  const [faceReady, setFaceReady] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const autoOpenedRef = useRef(false);

  const load = async () => {
    const response = await api.get("/owner/my-dashboard");
    setData(response.data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((err) => {
      setLoadError(formatApiError(err, "Failed to load dashboard data."));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (data.profile?.attendanceEnrollmentPhotoUrl) {
      loadFaceVerificationModels().then(() => setFaceReady(true)).catch(() => setFaceReady(false));
    }
  }, [data.profile?.attendanceEnrollmentPhotoUrl]);

  useEffect(() => {
    if (!loading && !loadError && data.profile && !data.todayAttendance && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      handleStartCheckIn();
    }
  }, [loading, loadError, data.profile, data.todayAttendance]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
  };

  useEffect(() => () => {
    stopCameraStream();
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!flow.open || flow.step !== STEPS.CAPTURE || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [flow.open, flow.step, streamReady]);

  const closeFlow = () => {
    stopCameraStream();
    setStreamReady(false);
    setFlow({ open: false, action: "", step: "", busy: false, error: "", success: "", coords: null, warning: "" });
  };

  const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(Object.assign(new Error("Geolocation not supported"), { code: 0 })); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  const requestCameraStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not available.");
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  };

  const getBranchGeofenceValidation = (coords) => {
    const branch = data.profile?.branch;
    const lat = Number(branch?.latitude);
    const lng = Number(branch?.longitude);
    const radius = Number(branch?.geofenceRadiusMeters || 75); // default geofence radius in meters
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return { valid: true, distance: 0, warning: "Branch GPS coordinates are not set. Geofence check skipped. Please ask your manager to set the branch location." };
    }
    const distance = haversineDistanceMeters(lat, lng, coords.latitude, coords.longitude);
    if (distance > radius) {
      return { valid: false, error: `You are ${Math.round(distance)}m from the salon (${Math.round(distance - radius)}m outside the allowed ${radius}m radius). Please move closer to the salon.` };
    }
    return { valid: true, distance };
  };

  const formatGeoError = (error) => {
    if (error?.code === 1) return "Location permission denied. Please grant location access in your browser settings and try again.";
    if (error?.code === 2) return "Location information is unavailable. Please check your device settings.";
    if (error?.code === 3) return "Location request timed out. Please try again or move to an open area.";
    return formatApiError(error, "Failed to get your location.");
  };

  const formatCameraError = (error) => {
    if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") return "Camera permission denied. Please allow camera access in your browser settings.";
    if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") return "No camera found. Please connect a camera and try again.";
    if (error?.name === "NotReadableError" || error?.name === "TrackStartError") return "Camera is already in use by another application. Please close other camera apps.";
    return formatApiError(error, "Camera permission is required.");
  };

  const submitAttendance = async ({ action, coords, selfieBlob }) => {
    setFlow((c) => ({ ...c, step: STEPS.SUBMITTING, busy: true, error: "" }));
    setAttendanceStatus({ loading: true, error: "", success: "" });
    try {
      let selfieUrl = "";
      if (selfieBlob) {
        selfieUrl = await uploadImage(selfieBlob, `${action}-selfie.jpg`);
      }
      const endpoint = action === "check-in" ? "/owner/attendance/check-in-self" : "/owner/attendance/check-out-self";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        await api.post(endpoint, {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracyMeters,
          selfieUrl: selfieUrl || undefined
        }, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      stopCameraStream();
      const msg = action === "check-in" ? "Attendance marked successfully." : "Check-out completed successfully.";
      setAttendanceStatus({ loading: false, error: "", success: msg });
      setFlow((c) => ({ ...c, step: STEPS.SUCCESS, busy: false, success: msg }));
      load().catch(() => {});
    } catch (error) {
      const message = error?.name === "CanceledError" || error?.name === "AbortError"
        ? "Request timed out. Please check your network and try again."
        : formatApiError(error, "Attendance action failed.");
      stopCameraStream();
      setAttendanceStatus({ loading: false, error: message, success: "" });
      setFlow((c) => ({ ...c, busy: false, error: message, step: "" }));
    }
  };

  const handleCaptureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || !flow.coords) {
      setFlow((c) => ({ ...c, error: "Camera not ready. Please close and try again." }));
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 720; // default selfie dimensions
    canvas.height = video.videoHeight || 960; // default selfie dimensions
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setFlow((c) => ({ ...c, error: "Failed to access camera capture. Please try again." }));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setFlow((c) => ({ ...c, error: "Failed to capture selfie. Please try again." }));
      return;
    }
    const enrollmentUrl = data.profile?.attendanceEnrollmentPhotoUrl;
    if (enrollmentUrl && faceReady) {
      setFlow((c) => ({ ...c, busy: true, error: "" }));
      try {
        const result = await compareFaceSources({ enrollmentSource: enrollmentUrl, liveSource: blob });
        if (!result.matched) {
          setFlow((c) => ({ ...c, busy: false, error: `Face does not match enrollment photo. Distance: ${result.distance.toFixed(2)} (threshold: ${result.threshold}). Please ensure you are the enrolled staff member.` }));
          return;
        }
      } catch (err) {
        setFlow((c) => ({ ...c, busy: false, error: formatApiError(err, "Face verification failed.") }));
        return;
      }
    }
    await submitAttendance({ action: flow.action, coords: flow.coords, selfieBlob: blob });
  };

  const handleSkipSelfie = async () => {
    if (!flow.coords) return;
    stopCameraStream();
    await submitAttendance({ action: flow.action, coords: flow.coords, selfieBlob: null });
  };

  const handleStartCheckIn = async () => {
    const thisFlowId = ++flowIdRef.current;
    setFlow({ open: true, action: "check-in", step: STEPS.PERMISSIONS, busy: true, error: "", success: "", coords: null });
    setAttendanceStatus({ loading: false, error: "", success: "" });

    try {
      let savedPosition = null;
      const [locPerm, camPerm] = await Promise.allSettled([
        new Promise((resolve, reject) => {
          if (!navigator.geolocation) { reject(Object.assign(new Error("Geolocation not supported"), { code: 0 })); return; }
          navigator.geolocation.getCurrentPosition(
            (pos) => { savedPosition = pos; resolve("granted"); },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
          );
        }),
        navigator.mediaDevices?.getUserMedia
          ? navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((s) => { s.getTracks().forEach((t) => t.stop()); return "granted"; })
          : Promise.reject(new Error("Camera not available"))
      ]);

      if (locPerm.status === "rejected") {
        const msg = formatGeoError(locPerm.reason);
        setFlow((c) => ({ ...c, busy: false, error: msg }));
        return;
      }
      if (camPerm.status === "rejected") {
        const msg = formatCameraError(camPerm.reason);
        setFlow((c) => ({ ...c, busy: false, error: msg }));
        return;
      }

      setFlow((c) => ({ ...c, step: STEPS.GPS, busy: true, error: "" }));

      const position = savedPosition || await getCurrentPosition();

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      };

      if (coords.accuracyMeters > 100) {
        setFlow((c) => ({ ...c, busy: false, error: `GPS accuracy is low (${Math.round(coords.accuracyMeters)}m). Please move to an open area and try again.` }));
        return;
      }

      const geofence = getBranchGeofenceValidation(coords);
      if (!geofence.valid) {
        setFlow((c) => ({ ...c, busy: false, error: geofence.error }));
        return;
      }

      setFlow((c) => ({ ...c, step: STEPS.CAPTURE, busy: true, coords, error: "", warning: geofence.warning || "" }));

      if (flowIdRef.current !== thisFlowId) return;
      try {
        stopCameraStream();
        streamRef.current = await requestCameraStream();
        if (flowIdRef.current !== thisFlowId) { stopCameraStream(); return; }
        setStreamReady(true);
        setFlow((c) => ({ ...c, busy: false }));
      } catch (err) {
        setFlow((c) => ({ ...c, busy: false, error: formatCameraError(err) }));
      }
    } catch (err) {
      setFlow((c) => ({ ...c, busy: false, error: formatApiError(err, "Failed to start attendance flow.") }));
    }
  };

  const handleStartCheckOut = async () => {
    const thisFlowId = ++flowIdRef.current;
    setFlow({ open: true, action: "check-out", step: STEPS.PERMISSIONS, busy: true, error: "", success: "", coords: null });
    setAttendanceStatus({ loading: false, error: "", success: "" });

    try {
      const locPerm = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(Object.assign(new Error("Geolocation not supported"), { code: 0 })); return; }
        navigator.geolocation.getCurrentPosition(
          () => resolve("granted"),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      }).catch((err) => { throw err; });

      setFlow((c) => ({ ...c, step: STEPS.GPS, busy: true, error: "" }));

      let position;
      try {
        position = await getCurrentPosition();
      } catch (err) {
        setFlow((c) => ({ ...c, busy: false, error: formatGeoError(err) }));
        return;
      }

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      };

      if (coords.accuracyMeters > 100) {
        setFlow((c) => ({ ...c, busy: false, error: `GPS accuracy is low (${Math.round(coords.accuracyMeters)}m). Please move to an open area and try again.` }));
        return;
      }

      const geofence = getBranchGeofenceValidation(coords);
      if (!geofence.valid) {
        setFlow((c) => ({ ...c, busy: false, error: geofence.error }));
        return;
      }

      setFlow((c) => ({ ...c, step: STEPS.CAPTURE, busy: true, coords, error: "", warning: geofence.warning || "" }));

      if (flowIdRef.current !== thisFlowId) return;
      try {
        stopCameraStream();
        streamRef.current = await requestCameraStream();
        if (flowIdRef.current !== thisFlowId) { stopCameraStream(); return; }
        setStreamReady(true);
        setFlow((c) => ({ ...c, busy: false }));
      } catch (err) {
        setFlow((c) => ({ ...c, busy: false, coords, error: formatCameraError(err) }));
      }
    } catch (err) {
      setFlow((c) => ({ ...c, busy: false, error: formatApiError(err, "Failed to start check-out flow.") }));
    }
  };

  const todayAttendance = data.todayAttendance;
  const isCheckedIn = todayAttendance && !todayAttendance.checkOutAt;
  const accent = flowAccent[flow.step] || flowAccent[STEPS.PERMISSIONS];

  const renderFlowBody = () => {
    if (!flow.open) return null;

    if (flow.step === STEPS.PERMISSIONS) {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone }}>
              <Shield size={12} /> Step 1 of 3 — Permissions
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Requesting Access" : "Confirming Access"}</h3>
            <div className="item-meta">
              {flow.busy
                ? "Requesting location and camera permissions..."
                : flow.error
                  ? "Both location and camera permissions are required for attendance."
                  : "Permissions granted. Verifying your location..."}
            </div>
          </div>
          {flow.busy && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
            </div>
          )}
        </>
      );
    }

    if (flow.step === STEPS.GPS) {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone }}>
              <MapPin size={12} /> Step 2 of 3 — Location
            </div>
            <h3 style={{ margin: 0 }}>Verifying Geofence</h3>
            <div className="item-meta">
              {flow.busy ? "Fetching your GPS coordinates and checking salon radius..." : "Location verified. Opening camera..."}
            </div>
          </div>
          {flow.busy && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#0f766e", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
            </div>
          )}
          {flow.warning && !flow.busy && (
            <div style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>{flow.warning}</div>
          )}
        </>
      );
    }

    if (flow.step === STEPS.CAPTURE) {
      const hasCamera = streamReady && Boolean(streamRef.current);
      const isCheckOut = flow.action === "check-out";
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone }}>
              <Camera size={12} /> Step 3 of 3 — Selfie {isCheckOut ? "(Optional)" : ""}
            </div>
            <h3 style={{ margin: 0 }}>{hasCamera ? "Capture Selfie" : "Selfie Capture"}</h3>
            <div className="item-meta">
              {hasCamera
                ? "Align your face clearly inside the frame and click the capture button below."
                : isCheckOut
                  ? "Camera is not available. You can skip the selfie and submit with GPS coordinates only."
                  : "Camera is required for check-in. Please allow camera access and try again."}
            </div>
          </div>
          {hasCamera ? (
            <>
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, border: "1px solid rgba(148,163,184,0.18)", background: "#0f172a" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 22, background: "#0f172a", display: "block", minHeight: 280, objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 16, borderRadius: 18, border: "2px dashed rgba(255,255,255,0.45)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: 14, top: 14, padding: "8px 10px", borderRadius: 999, background: "rgba(15,23,42,0.72)", color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>
                  Front Camera Active
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div style={{ padding: "12px 14px", borderRadius: 16, background: isCheckOut ? "linear-gradient(135deg, rgba(254,243,199,0.95), rgba(253,230,138,0.92))" : "linear-gradient(135deg, rgba(239,246,255,0.95), rgba(219,234,254,0.92))", border: isCheckOut ? "1px solid rgba(234,179,8,0.2)" : "1px solid rgba(59,130,246,0.2)", color: isCheckOut ? "#92400e" : "#1e40af", fontSize: 13 }}>
                {isCheckOut
                  ? "Selfie is optional for check-out. Your GPS coordinates will be recorded."
                  : data.profile?.attendanceEnrollmentPhotoUrl
                    ? "Face verification is active. Your selfie will be compared with your enrollment photo."
                    : "Selfie is mandatory. Your photo will be uploaded along with GPS coordinates."}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={closeFlow}><X size={14} /> Cancel</button>
                {isCheckOut && (
                  <button type="button" className="secondary-button" onClick={() => void handleSkipSelfie()} disabled={flow.busy}>
                    <CameraOff size={14} /> Skip Selfie
                  </button>
                )}
                <button type="button" onClick={() => void handleCaptureAndSubmit()} disabled={flow.busy}>
                  {flow.busy ? (data.profile?.attendanceEnrollmentPhotoUrl ? "Verifying Face..." : "Capturing...") : <><Camera size={14} /> Capture & Submit</>}
                </button>
              </div>
            </>
          ) : (
            <>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {isCheckOut ? (
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="secondary-button" onClick={closeFlow}><X size={14} /> Cancel</button>
                  <button type="button" onClick={() => void handleSkipSelfie()} disabled={flow.busy}>
                    <Send size={14} /> Submit Without Selfie
                  </button>
                </div>
              ) : (
                <div style={{ padding: "12px 14px", borderRadius: 16, background: "linear-gradient(135deg, rgba(254,226,226,0.95), rgba(254,202,202,0.92))", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b", fontSize: 13 }}>
                  Camera is required for check-in. Please allow camera access in your browser settings and try again.
                </div>
              )}
            </>
          )}
        </>
      );
    }

    if (flow.step === STEPS.SUBMITTING) {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone }}>
              <Upload size={12} /> Uploading
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Saving Attendance" : "Completing Attendance"}</h3>
            <div className="item-meta">{flow.action === "check-in" ? "Uploading selfie and GPS coordinates to the server..." : "Submitting GPS coordinates and check-out time..."}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#6d28d9", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
          </div>
        </>
      );
    }

    if (flow.step === STEPS.SUCCESS) {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone }}>
              <CheckCircle2 size={12} /> Done
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Attendance Marked Successfully" : "Check-Out Successful"}</h3>
            <div className="success-text" style={{ margin: 0 }}>{flow.success}</div>
          </div>
          <button type="button" onClick={closeFlow}><CheckCircle2 size={14} /> Done</button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="My Dashboard"
        description="Staff-scoped summary for assigned bookings, attendance actions, and quick daily awareness."
        items={[
          { label: "My Dashboard", to: "/admin/my-dashboard", hint: "Today" },
          { label: "My Appointments", to: "/admin/my-appointments", hint: "Bookings" },
          { label: "My Schedule", to: "/admin/my-schedule", hint: "Hours" },
          { label: "My Commission", to: "/admin/my-commission", hint: "Earnings" },
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />
      {flow.open ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.78)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="panel-card" style={{ width: "min(100%, 620px)", maxHeight: "92vh", overflowY: "auto", display: "grid", gap: 14, padding: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,252,0.96))" }}>
            {renderFlowBody()}
            {flow.error ? <div className="error-text">{flow.error}</div> : null}
            {flow.error && flow.step !== STEPS.SUBMITTING && flow.step !== STEPS.SUCCESS ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={closeFlow}><X size={14} /> Close</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="hero-card" style={{ padding: 24, marginBottom: 20, background: "linear-gradient(135deg, rgba(15,118,110,0.10), rgba(14,165,233,0.08), rgba(255,255,255,0.92))" }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>My Dashboard</h1>
            <p style={{ marginBottom: 0 }}>Your staff-scoped overview for bookings, attendance, service assignments, and daily alerts.</p>
          </div>
          <div className="badge-row">
            <span className="badge"><CalendarCheck size={13} /> Today {data.todayAppointments.length}</span>
            <span className="badge"><Clock size={13} /> Recent {data.recentAppointments.length}</span>
            <span className="badge"><Bell size={13} /> Notifications {data.notifications.length}</span>
          </div>
        </div>
      </div>
      {loadError ? <div style={{ padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, rgba(254,226,226,0.95), rgba(254,202,202,0.92))", border: "1px solid rgba(239,68,68,0.25)", color: "#991b1b", fontSize: 13, marginBottom: 14 }}>{loadError}</div> : null}
      {loading ? <PageLoader title="Loading your workspace" message="Preparing your bookings, services, attendance, and daily notification context." /> : <>
        <div className="panel-card" style={{ marginBottom: 18 }}>
          <div style={{ height: 5, background: isCheckedIn ? "linear-gradient(90deg, #16a34a, #10b981)" : "linear-gradient(90deg, #0f766e, #0ea5e9)" }} />
          <div className="item-head" style={{ alignItems: "flex-start" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>Attendance</h3>
              <div className="item-meta">
                {data.profile?.branch?.name || "No branch assigned"} | {todayAttendance ? `Status: ${todayAttendance.status}` : "No attendance marked today"}
              </div>
              {todayAttendance ? (
                <div className="item-meta">
                  {new Date(todayAttendance.checkInAt).toLocaleString()}
                  {todayAttendance.checkOutAt ? ` - ${new Date(todayAttendance.checkOutAt).toLocaleString()}` : ""}
                </div>
              ) : null}
            </div>
            <div className="badge-row" style={{ gap: 12 }}>
              <button type="button" onClick={() => void handleStartCheckIn()} disabled={attendanceStatus.loading || Boolean(todayAttendance)} style={{ minWidth: 140 }}>
                {attendanceStatus.loading ? "Processing..." : <><LogIn size={14} /> Check In</>}
              </button>
              <button type="button" className="secondary-button" onClick={() => void handleStartCheckOut()} disabled={attendanceStatus.loading || !isCheckedIn} style={{ minWidth: 140 }}>
                {attendanceStatus.loading ? "Processing..." : <><LogOut size={14} /> Check Out</>}
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(15,118,110,0.14)" }}>
              <div className="stat-label"><MapPin size={14} /> Location Verified</div>
              <div className="item-meta" style={{ marginTop: 4 }}>GPS coordinates checked against salon geofence radius.</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(29,78,216,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(29,78,216,0.14)" }}>
              <div className="stat-label"><Camera size={14} /> Selfie Captured</div>
              <div className="item-meta" style={{ marginTop: 4 }}>Live selfie uploaded with GPS coordinates for attendance proof.</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(249,115,22,0.14)" }}>
              <div className="stat-label"><Timer size={14} /> Shift Status</div>
              <div className="item-meta" style={{ marginTop: 4 }}>{todayAttendance ? todayAttendance.status : "Waiting for first check-in today."}</div>
            </div>
          </div>
          {attendanceStatus.error ? <p className="error-text" style={{ marginTop: 12 }}>{attendanceStatus.error}</p> : null}
          {attendanceStatus.success ? <p className="success-text" style={{ marginTop: 12 }}>{attendanceStatus.success}</p> : null}
        </div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-label"><CalendarCheck size={14} /> Today Appointments</div><div className="stat-value">{data.todayAppointments.length}</div></div>
            <div className="stat-card"><div className="stat-label"><Clock size={14} /> Recent Assigned</div><div className="stat-value">{data.recentAppointments.length}</div></div>
          </div>
        <div className="panel-card" style={{ marginTop: 18 }}>
          <h3>Assigned Appointments</h3>
          <div className="list-stack">
            {data.recentAppointments.map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{item.customer?.name}</strong>
                  <span className={`badge badge-${String(item.status).toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="item-meta">{new Date(item.startAt).toLocaleString()}</div>
              </div>
            ))}
            {!data.recentAppointments.length && <EmptyState title="No assigned appointments yet" message="Your next assigned bookings will appear here as soon as they are scheduled." />}
          </div>
        </div>
        <div className="two-col" style={{ marginTop: 18 }}>
          <div className="panel-card">
            <h3>My Services</h3>
            <div className="badge-row">
              {(data.assignedServices || []).map((item) => (
                <span key={item.id} className="badge">{item.service?.name}</span>
              ))}
              {!data.assignedServices?.length && <span className="muted">No service assignments yet.</span>}
            </div>
          </div>
          <div className="panel-card">
            <h3>Notifications</h3>
            <div className="list-stack">
              {(data.notifications || []).map((item) => (
                <div key={item.id} className="list-item">
                  <div className="item-head">
                    <strong>{item.action}</strong>
                    <span className="badge">{item.appointment?.status}</span>
                  </div>
                  <div className="item-meta">
                    {item.appointment?.customer?.name || "Customer"} | {item.appointment?.branch?.name || "Branch"}
                  </div>
                  <div className="item-meta">{item.details || "No extra note"}</div>
                </div>
              ))}
              {!data.notifications?.length && <EmptyState title="No notifications yet" message="Booking and workflow notifications will show here when something needs your attention." />}
            </div>
          </div>
        </div>
      </>}
    </div>
  );
}
