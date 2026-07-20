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
  [STEPS.PERMISSIONS]: { tone: "#6366f1", surface: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.05) 100%)", border: "rgba(99,102,241,0.2)" },
  [STEPS.GPS]: { tone: "#0ea5e9", surface: "linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(14,165,233,0.05) 100%)", border: "rgba(14,165,233,0.2)" },
  [STEPS.CAPTURE]: { tone: "#8b5cf6", surface: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.05) 100%)", border: "rgba(139,92,246,0.2)" },
  [STEPS.SUBMITTING]: { tone: "#d946ef", surface: "linear-gradient(135deg, rgba(217,70,239,0.1) 0%, rgba(217,70,239,0.05) 100%)", border: "rgba(217,70,239,0.2)" },
  [STEPS.SUCCESS]: { tone: "#10b981", surface: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)", border: "rgba(16,185,129,0.2)" }
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
      const hasGeo = !!navigator.geolocation;
      const hasCamera = !!navigator.mediaDevices;
      if (hasGeo && hasCamera) {
        autoOpenedRef.current = true;
        handleStartCheckIn();
      }
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
    const lat = parseFloat(String(branch?.latitude));
    const lng = parseFloat(String(branch?.longitude));
    const radius = Number(branch?.geofenceRadiusMeters || 200);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return { valid: true, distance: 0, warning: "Branch GPS coordinates are not set. Geofence check skipped. Please ask your manager to set the branch location." };
    }
    const distance = haversineDistanceMeters(lat, lng, coords.latitude, coords.longitude);
    const accuracy = coords.accuracyMeters ? Math.round(coords.accuracyMeters) : "?";
    if (distance > radius) {
      return {
        valid: false,
        debug: { branchLat: lat, branchLng: lng, yourLat: coords.latitude, yourLng: coords.longitude, distance: Math.round(distance), radius, accuracy },
        error: `You are ${Math.round(distance)}m from the salon (GPS accuracy: ~${accuracy}m). Allowed radius: ${radius}m. Please move closer to the salon.`
      };
    }
    return { valid: true, distance, debug: { branchLat: lat, branchLng: lng, yourLat: coords.latitude, yourLng: coords.longitude, distance: Math.round(distance), radius, accuracy } };
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
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
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

      if (coords.accuracyMeters > 200) {
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

      if (coords.accuracyMeters > 200) {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 16, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone, display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={14} /> Step 1 of 3 — Permissions
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{flow.action === "check-in" ? "Requesting Access" : "Confirming Access"}</h3>
            <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              {flow.busy
                ? "Requesting location and camera permissions..."
                : flow.error
                  ? "Both location and camera permissions are required for attendance."
                  : "Permissions granted. Verifying your location..."}
            </div>
          </div>
          {flow.busy && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ width: 36, height: 36, border: "3px solid #f1f5f9", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
            </div>
          )}
        </div>
      );
    }

    if (flow.step === STEPS.GPS) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 16, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone, display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} /> Step 2 of 3 — Location
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Verifying Geofence</h3>
            <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              {flow.busy ? "Fetching your GPS coordinates and checking salon radius..." : "Location verified. Opening camera..."}
            </div>
          </div>
          {flow.busy && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ width: 36, height: 36, border: "3px solid #f1f5f9", borderTopColor: "#0f766e", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
            </div>
          )}
          {flow.warning && !flow.busy && (
            <div style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>{flow.warning}</div>
          )}
        </div>
      );
    }

    if (flow.step === STEPS.CAPTURE) {
      const hasCamera = streamReady && Boolean(streamRef.current);
      const isCheckOut = flow.action === "check-out";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ padding: 20, borderRadius: 16, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone, display: "flex", alignItems: "center", gap: 6 }}>
              <Camera size={14} /> Step 3 of 3 — Selfie {isCheckOut ? "(Optional)" : ""}
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{hasCamera ? "Capture Selfie" : "Selfie Capture"}</h3>
            <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              {hasCamera
                ? "Align your face clearly inside the frame and click the capture button below."
                : isCheckOut
                  ? "Camera is not available. You can skip the selfie and submit with GPS coordinates only."
                  : "Camera is required for check-in. Please allow camera access and try again."}
            </div>
          </div>
          {hasCamera ? (
            <>
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, border: "1px solid rgba(226,232,240,0.8)", background: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 20, background: "#0f172a", display: "block", minHeight: 320, maxHeight: 400, objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 20, borderRadius: 16, border: "2px dashed rgba(255,255,255,0.4)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: 16, top: 16, padding: "6px 12px", borderRadius: 20, background: "rgba(15,23,42,0.8)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  📷 Live Feed
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div style={{ padding: "12px 16px", borderRadius: 12, background: isCheckOut ? "#fff9db" : "#eff6ff", border: isCheckOut ? "1px solid #ffe3e3" : "1px solid #bfdbfe", color: isCheckOut ? "#854d0e" : "#1e40af", fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>
                {isCheckOut
                  ? "Selfie is optional for check-out. Your GPS coordinates will be recorded."
                  : data.profile?.attendanceEnrollmentPhotoUrl
                    ? "Face verification active. We'll match this selfie against your profile photo."
                    : "Selfie is mandatory to verify your attendance presence."}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                <button type="button" className="secondary-button" onClick={closeFlow} style={{ padding: "10px 20px", borderRadius: 8 }}>Cancel</button>
                {isCheckOut && !data.profile?.attendanceEnrollmentPhotoUrl && (
                  <button type="button" className="secondary-button" onClick={() => void handleSkipSelfie()} disabled={flow.busy} style={{ padding: "10px 20px", borderRadius: 8 }}>
                    Skip Selfie
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleCaptureAndSubmit()}
                  disabled={flow.busy}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: flow.busy ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.2)"
                  }}
                >
                  {flow.busy ? (data.profile?.attendanceEnrollmentPhotoUrl ? "Verifying Face..." : "Capturing...") : "Capture & Submit"}
                </button>
              </div>
            </>
          ) : (
            <>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              {isCheckOut ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.profile?.attendanceEnrollmentPhotoUrl ? (
                    <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 500 }}>
                      Camera is required for biometric check-out. Please allow camera access in your browser settings and try again.
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                      <button type="button" className="secondary-button" onClick={closeFlow} style={{ padding: "10px 20px", borderRadius: 8 }}>Cancel</button>
                      <button
                        type="button"
                        onClick={() => void handleSkipSelfie()}
                        disabled={flow.busy}
                        style={{
                          padding: "10px 24px",
                          background: "#0f766e",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Submit Without Selfie
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#991b1b", fontSize: 13, fontWeight: 500 }}>
                  Camera is required for check-in. Please allow camera access in your browser settings and try again.
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (flow.step === STEPS.SUBMITTING) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ padding: 20, borderRadius: 16, background: accent.surface, border: `1px solid ${accent.border}`, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: accent.tone, display: "flex", alignItems: "center", gap: 6 }}>
              <Upload size={14} /> Uploading
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{flow.action === "check-in" ? "Saving Attendance" : "Completing Attendance"}</h3>
            <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
              {flow.action === "check-in" ? "Uploading selfie and GPS coordinates to the server..." : "Submitting GPS coordinates and check-out time..."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #f1f5f9", borderTopColor: "#d946ef", borderRadius: "50%", animation: "spinAround 0.8s linear infinite" }} />
          </div>
        </div>
      );
    }

    if (flow.step === STEPS.SUCCESS) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", padding: "10px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", border: "2px solid #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", fontSize: 32, marginBottom: 8, boxShadow: "0 4px 12px rgba(16,185,129,0.15)" }}>
            ✓
          </div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
              {flow.action === "check-in" ? "Attendance Marked Successfully" : "Check-Out Successful"}
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "8px 0 0", lineHeight: 1.5 }}>{flow.success}</p>
          </div>
          <button
            type="button"
            onClick={closeFlow}
            style={{
              marginTop: 12,
              padding: "10px 32px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16,185,129,0.2)"
            }}
          >
            Done
          </button>
        </div>
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
          { label: "My Profile", to: "/admin/my-profile", hint: "Profile" }
        ]}
      />

      {/* Selfie Flow Modal */}
      {flow.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ width: "min(100%, 540px)", maxHeight: "92vh", overflowY: "auto", display: "grid", gap: 16, padding: 28, background: "#fff", borderRadius: 20, boxShadow: "0 25px 60px rgba(15,23,42,0.35)", border: "1px solid rgba(226,232,240,0.8)" }}>
            {renderFlowBody()}
            {flow.error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fee2e2", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{flow.error}</div>}
            {flow.error && flow.step !== STEPS.SUBMITTING && flow.step !== STEPS.SUCCESS && (
              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                <button type="button" className="secondary-button" onClick={closeFlow} style={{ padding: "8px 18px", borderRadius: 8 }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Banner */}
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 6 }}>My Dashboard</h1>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>Your staff-scoped overview for bookings, attendance, service assignments, and daily alerts.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
              📅 Today: {data.todayAppointments.length}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
              🕒 Recent: {data.recentAppointments.length}
            </span>
          </div>
        </div>
      </div>

      {loadError && (
        <div style={{ padding: "14px 20px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fee2e2", color: "#dc2626", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <PageLoader title="Loading your workspace" message="Preparing your bookings, services, attendance, and daily notification context." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Attendance Section */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: isCheckedIn ? "linear-gradient(90deg, #10b981, #34d399)" : "linear-gradient(90deg, #0ea5e9, #38bdf8)", borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", borderBottom: "1px solid #f1f5f9", paddingBottom: 20, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⏱️</span> Attendance Controls
                </h3>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span>📍 {data.profile?.branch?.name || "No branch assigned"}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: isCheckedIn ? "#059669" : "#64748b" }}>
                    {todayAttendance ? `Status: ${todayAttendance.status}` : "No attendance marked today"}
                  </span>
                </div>
                {data.profile?.branch?.latitude && data.profile?.branch?.longitude ? (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    Branch GPS: {Number(data.profile.branch.latitude).toFixed(6)}, {Number(data.profile.branch.longitude).toFixed(6)} | Radius: {data.profile.branch.geofenceRadiusMeters || 200}m
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 500, marginTop: 6 }}>
                    ⚠️ Branch GPS coordinates not set. Ask your manager to configure this branch location.
                  </div>
                )}
                {todayAttendance && (
                  <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, marginTop: 6, background: "#f8fafc", padding: "4px 10px", borderRadius: 6, display: "inline-block" }}>
                    Check-in: {new Date(todayAttendance.checkInAt).toLocaleTimeString()}
                    {todayAttendance.checkOutAt ? ` | Check-out: ${new Date(todayAttendance.checkOutAt).toLocaleTimeString()}` : ""}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => void handleStartCheckIn()}
                  disabled={attendanceStatus.loading || Boolean(todayAttendance)}
                  style={{
                    minWidth: 130,
                    padding: "10px 20px",
                    background: todayAttendance ? "#f1f5f9" : "linear-gradient(135deg, #10b981, #059669)",
                    color: todayAttendance ? "#94a3b8" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: todayAttendance ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: todayAttendance ? "none" : "0 4px 12px rgba(16,185,129,0.2)",
                    transition: "all 0.2s"
                  }}
                >
                  <LogIn size={14} /> Check In
                </button>
                <button
                  type="button"
                  onClick={() => void handleStartCheckOut()}
                  disabled={attendanceStatus.loading || !isCheckedIn}
                  style={{
                    minWidth: 130,
                    padding: "10px 20px",
                    background: !isCheckedIn ? "#f1f5f9" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                    color: !isCheckedIn ? "#94a3b8" : "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: !isCheckedIn ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: !isCheckedIn ? "none" : "0 4px 12px rgba(59,130,246,0.2)",
                    transition: "all 0.2s"
                  }}
                >
                  <LogOut size={14} /> Check Out
                </button>
              </div>
            </div>

            {/* Verification highlights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: "#f0fdfa", border: "1px solid #ccfbf1", display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f766e", fontSize: 16, flexShrink: 0 }}>
                  📍
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#115e59" }}>Location Verification</div>
                  <div style={{ fontSize: 11, color: "#14b8a6", marginTop: 2, lineHeight: 1.4 }}>GPS coordinates are dynamically matched against your branch radius.</div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "#f5f3ff", border: "1px solid #ede9fe", display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#6d28d9", fontSize: 16, flexShrink: 0 }}>
                  📷
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#5b21b6" }}>Selfie & Biometrics</div>
                  <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 2, lineHeight: 1.4 }}>Photos verified against face registration profile in database.</div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "#fff8e1", border: "1px solid #ffe8cc", display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#b25e00", fontSize: 16, flexShrink: 0 }}>
                  🕒
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#b25e00" }}>Roster Shift Status</div>
                  <div style={{ fontSize: 11, color: "#e67e00", marginTop: 2, lineHeight: 1.4 }}>
                    {todayAttendance ? todayAttendance.status : "Waiting for check-in to begin your shift."}
                  </div>
                </div>
              </div>
            </div>

            {attendanceStatus.error && <p style={{ margin: "16px 0 0", color: "#dc2626", fontSize: 13, fontWeight: 600, background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca" }}>{attendanceStatus.error}</p>}
            {attendanceStatus.success && <p style={{ margin: "16px 0 0", color: "#059669", fontSize: 13, fontWeight: 600, background: "#ecfdf5", padding: "8px 12px", borderRadius: 8, border: "1px solid #bbf7d0" }}>{attendanceStatus.success}</p>}
          </div>

          {/* Today's Appointments Section */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span> Today's Assigned Appointments
            </h3>
            <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 13 }}>Schedule queue for services assigned to you</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {data.recentAppointments.map((item) => {
                const statusColors = {
                  SCHEDULED: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
                  IN_PROGRESS: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
                  COMPLETED: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
                  CANCELLED: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" }
                };
                const sc = statusColors[item.status] || statusColors.SCHEDULED;

                return (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 18, boxShadow: "0 2px 4px rgba(0,0,0,0.01)", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <strong style={{ fontSize: 15, color: "#1e293b", fontWeight: 700 }}>{item.customer?.name}</strong>
                      <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, color: "#64748b", fontSize: 12, fontWeight: 600, marginTop: "auto" }}>
                      <span>🕒 {new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>📍 {item.branch?.name || "Salon"}</span>
                    </div>
                  </div>
                );
              })}
              {!data.recentAppointments.length && <EmptyState title="No assigned appointments yet" message="Your next assigned bookings will appear here as soon as they are scheduled." />}
            </div>
          </div>

          {/* Two-Column split at bottom */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            
            {/* Services */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🎯</span> My Services
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 13 }}>Your active performing specialties</p>
              
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(data.assignedServices || []).map((item) => (
                  <span key={item.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 14px", borderRadius: 8, fontSize: 13, color: "#334155", fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,0.01)" }}>
                    ✓ {item.service?.name}
                  </span>
                ))}
                {!data.assignedServices?.length && <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>No service assignments yet.</div>}
              </div>
            </div>

            {/* Notifications */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.04)", border: "1px solid rgba(226,232,240,0.8)" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔔</span> Notifications
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: 13 }}>Recent alerts and updates</p>
              
              <div style={{ display: "grid", gap: 12 }}>
                {(data.notifications || []).map((item) => (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#1e293b", fontSize: 14, fontWeight: 700 }}>{item.action}</strong>
                      <span style={{ background: "#e2e8f0", color: "#475569", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                        {item.appointment?.status || "Alert"}
                      </span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                      {item.appointment?.customer?.name || "Customer"} | {item.appointment?.branch?.name || "Branch"}
                    </div>
                    <div style={{ color: "#475569", fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{item.details || "No extra note"}</div>
                  </div>
                ))}
                {!data.notifications?.length && <EmptyState title="No notifications yet" message="Booking and workflow notifications will show here when something needs your attention." />}
              </div>
            </div>

          </div>

        </div>
      )}
      
      <style>{`
        @keyframes spinAround { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
