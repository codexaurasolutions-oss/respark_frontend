import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { compareFaceSources, loadFaceVerificationModels, verifyFaceMatch } from "../../utils/faceVerification";

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

const emptyFlow = {
  open: false,
  action: "",
  step: "gps",
  busy: false,
  error: "",
  success: "",
  coords: null
};

const flowAccent = {
  gps: { tone: "#0f766e", surface: "linear-gradient(135deg, rgba(15,118,110,0.12), rgba(14,165,233,0.10))", border: "rgba(15,118,110,0.18)" },
  camera: { tone: "#1d4ed8", surface: "linear-gradient(135deg, rgba(29,78,216,0.12), rgba(56,189,248,0.10))", border: "rgba(29,78,216,0.18)" },
  capture: { tone: "#7c2d12", surface: "linear-gradient(135deg, rgba(249,115,22,0.13), rgba(250,204,21,0.10))", border: "rgba(249,115,22,0.18)" },
  submitting: { tone: "#6d28d9", surface: "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(14,165,233,0.10))", border: "rgba(109,40,217,0.18)" },
  success: { tone: "#166534", surface: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(16,185,129,0.10))", border: "rgba(34,197,94,0.18)" }
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
  const [flow, setFlow] = useState(emptyFlow);
  const [liveFaceStatus, setLiveFaceStatus] = useState({ checking: false, ready: false, matched: false, message: "" });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const liveCheckTimerRef = useRef(null);

  const load = async () => {
    const response = await api.get("/owner/my-dashboard");
    setData(response.data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadFaceVerificationModels().catch(() => {});
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => () => {
    stopCameraStream();
  }, []);

  useEffect(() => {
    if (!flow.open || flow.step !== "capture" || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {});
  }, [flow.open, flow.step]);

  const requiresSelfieForAction = (action) =>
    action === "check-in" || (action === "check-out" && Boolean(data.attendanceSettings?.checkoutSelfieRequired));

  const getCurrentPosition = async () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location permission is required."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  const getBranchGeofenceValidation = (coords) => {
    const branch = data.profile?.branch;
    const latitude = Number(branch?.latitude);
    const longitude = Number(branch?.longitude);
    const radius = Number(branch?.geofenceRadiusMeters || 75);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { valid: false, error: "Salon geofence is not configured for this branch." };
    }
    const distance = haversineDistanceMeters(latitude, longitude, coords.latitude, coords.longitude);
    if (distance > radius) {
      return { valid: false, error: "You are outside the salon premises." };
    }
    return { valid: true, distance };
  };

  const requestCameraStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera permission is required.");
    }
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
  };

  const closeFlow = () => {
    stopCameraStream();
    if (liveCheckTimerRef.current) {
      clearInterval(liveCheckTimerRef.current);
      liveCheckTimerRef.current = null;
    }
    setLiveFaceStatus({ checking: false, ready: false, matched: false, message: "" });
    setFlow(emptyFlow);
  };

  const openFlow = (action) => {
    setAttendanceStatus({ loading: false, error: "", success: "" });
    setFlow({
      open: true,
      action,
      step: "gps",
      busy: false,
      error: "",
      success: "",
      coords: null
    });
  };

  const submitAttendanceAction = async ({ action, coords, selfieBlob = null }) => {
    setFlow((current) => ({ ...current, step: "submitting", busy: true, error: "" }));
    setAttendanceStatus({ loading: true, error: "", success: "" });
    try {
      let verificationNote = "";
      if (selfieBlob && data.profile?.attendanceEnrollmentPhotoUrl) {
        const faceMatch = await verifyFaceMatch({
          enrollmentImageUrl: data.profile.attendanceEnrollmentPhotoUrl,
          liveImageBlob: selfieBlob
        });
        if (!faceMatch.matched) {
          throw new Error(`Live selfie did not match the enrollment face. Match distance: ${faceMatch.distance.toFixed(3)}`);
        }
        verificationNote = `Face matched (${faceMatch.distance.toFixed(3)})`;
      }
      const selfieUrl = selfieBlob
        ? await uploadImage(selfieBlob, action === "check-in" ? "check-in-selfie.jpg" : "check-out-selfie.jpg")
        : "";
      const endpoint = action === "check-in" ? "/owner/attendance/check-in-self" : "/owner/attendance/check-out-self";
      await api.post(endpoint, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracyMeters,
        selfieUrl,
        note: verificationNote || undefined
      });
      await load();
      const successMessage = action === "check-in" ? "Check-in successful." : "Check-out successful.";
      setAttendanceStatus({ loading: false, error: "", success: successMessage });
      setFlow((current) => ({ ...current, step: "success", busy: false, success: successMessage }));
    } catch (error) {
      const message = formatApiError(error, "Attendance action failed");
      setAttendanceStatus({ loading: false, error: message, success: "" });
      setFlow((current) => ({
        ...current,
        busy: false,
        error: message,
        step: current.action === "check-in" || requiresSelfieForAction(current.action) ? "capture" : "gps"
      }));
    }
  };

  const handleRequestGps = async () => {
    setFlow((current) => ({ ...current, busy: true, error: "" }));
    try {
      const position = await getCurrentPosition();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy
      };
      const geofence = getBranchGeofenceValidation(coords);
      if (!geofence.valid) {
        setFlow((current) => ({ ...current, busy: false, error: geofence.error }));
        return;
      }
      if (requiresSelfieForAction(flow.action)) {
        setFlow((current) => ({ ...current, busy: false, coords, step: "camera", error: "" }));
        return;
      }
      await submitAttendanceAction({ action: flow.action, coords });
    } catch (error) {
      let message = formatApiError(error, "Attendance action failed");
      if (error?.code === 1) message = "Location permission is required.";
      if (error?.code === 2 || error?.code === 3) message = "Location permission is required.";
      setFlow((current) => ({ ...current, busy: false, error: message }));
    }
  };

  const handleRequestCamera = async () => {
    setFlow((current) => ({ ...current, busy: true, error: "" }));
    try {
      streamRef.current = await requestCameraStream();
      setFlow((current) => ({ ...current, busy: false, step: "capture", error: "" }));
    } catch (error) {
      let message = formatApiError(error, "Camera permission is required.");
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        message = "Camera permission is required.";
      }
      setFlow((current) => ({ ...current, busy: false, error: message }));
    }
  };

  const captureAndSubmitSelfie = async () => {
    if (!videoRef.current || !canvasRef.current || !flow.coords || !liveFaceStatus.ready) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const context = canvas.getContext("2d");
    context?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    stopCameraStream();
    await submitAttendanceAction({ action: flow.action, coords: flow.coords, selfieBlob: blob });
  };

  const todayAttendance = data.todayAttendance;
  const isCheckedIn = todayAttendance && !todayAttendance.checkOutAt;
  const currentFlowAccent = flowAccent[flow.step] || flowAccent.gps;
  const liveFaceTone = liveFaceStatus.matched
    ? { background: "linear-gradient(135deg, rgba(220,252,231,0.95), rgba(236,253,245,0.95))", border: "1px solid rgba(34,197,94,0.22)", color: "#166534" }
    : { background: "linear-gradient(135deg, rgba(255,247,237,0.96), rgba(254,243,199,0.92))", border: "1px solid rgba(245,158,11,0.2)", color: "#92400e" };

  useEffect(() => {
    if (!flow.open || flow.step !== "capture" || !data.profile?.attendanceEnrollmentPhotoUrl) {
      if (liveCheckTimerRef.current) {
        clearInterval(liveCheckTimerRef.current);
        liveCheckTimerRef.current = null;
      }
      setLiveFaceStatus((current) => current.ready || current.message
        ? { checking: false, ready: false, matched: false, message: "" }
        : current);
      return undefined;
    }

    let active = true;
    let busy = false;

    const runLiveCheck = async () => {
      if (!active || busy || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      busy = true;
      setLiveFaceStatus((current) => ({ ...current, checking: true, message: current.ready ? current.message : "Checking live face match..." }));
      try {
        const canvas = previewCanvasRef.current || document.createElement("canvas");
        previewCanvasRef.current = canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
        const match = await compareFaceSources({
          enrollmentSource: data.profile.attendanceEnrollmentPhotoUrl,
          liveSource: blob
        });
        if (!active) return;
        setLiveFaceStatus({
          checking: false,
          ready: match.matched,
          matched: match.matched,
          message: match.matched
            ? `Face matched live (${match.distance.toFixed(3)})`
            : `Face detected but match failed (${match.distance.toFixed(3)})`
        });
      } catch (error) {
        if (!active) return;
        setLiveFaceStatus({
          checking: false,
          ready: false,
          matched: false,
          message: error?.message || "Live face verification failed."
        });
      } finally {
        busy = false;
      }
    };

    void runLiveCheck();
    liveCheckTimerRef.current = setInterval(() => {
      void runLiveCheck();
    }, 1800);

    return () => {
      active = false;
      if (liveCheckTimerRef.current) {
        clearInterval(liveCheckTimerRef.current);
        liveCheckTimerRef.current = null;
      }
    };
  }, [flow.open, flow.step, data.profile?.attendanceEnrollmentPhotoUrl]);

  const renderFlowBody = () => {
    if (!flow.open) return null;
    if (flow.step === "gps") {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: currentFlowAccent.surface, border: `1px solid ${currentFlowAccent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: currentFlowAccent.tone }}>
              Attendance Gate
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Location Access" : "Confirm Current Location"}</h3>
            <div className="item-meta">Click continue to allow location access and validate your salon geofence before attendance is saved.</div>
          </div>
          <button type="button" onClick={() => void handleRequestGps()} disabled={flow.busy}>
            {flow.busy ? "Checking Location..." : "Continue"}
          </button>
        </>
      );
    }
    if (flow.step === "camera") {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: currentFlowAccent.surface, border: `1px solid ${currentFlowAccent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: currentFlowAccent.tone }}>
              Camera Ready
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Camera Access" : "Selfie Verification"}</h3>
            <div className="item-meta">
              {flow.action === "check-in"
                ? "Camera permission is required before opening the selfie capture step."
                : "Camera permission is enabled for this check-out flow before selfie capture."}
            </div>
          </div>
          <button type="button" onClick={() => void handleRequestCamera()} disabled={flow.busy}>
            {flow.busy ? "Opening Camera..." : "Open Camera"}
          </button>
        </>
      );
    }
    if (flow.step === "capture") {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: currentFlowAccent.surface, border: `1px solid ${currentFlowAccent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: currentFlowAccent.tone }}>
              Live Verification
            </div>
            <h3 style={{ margin: 0 }}>Capture Selfie</h3>
            <div className="item-meta">Align your face clearly inside the frame. Capture stays locked until the live face check is valid.</div>
          </div>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, border: "1px solid rgba(148,163,184,0.18)", background: "#0f172a" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 22, background: "#0f172a", display: "block", minHeight: 280, objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 16, borderRadius: 18, border: "2px dashed rgba(255,255,255,0.45)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 14, top: 14, padding: "8px 10px", borderRadius: 999, background: "rgba(15,23,42,0.72)", color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>
              {liveFaceStatus.ready ? "Face Ready" : liveFaceStatus.checking ? "Checking Face" : "Align Face"}
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {data.profile?.attendanceEnrollmentPhotoUrl ? (
            <div style={{ padding: "12px 14px", borderRadius: 16, ...liveFaceTone }}>
              {liveFaceStatus.message || "Checking live face match..."}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" className="secondary-button" onClick={closeFlow}>Cancel</button>
            <button type="button" onClick={() => void captureAndSubmitSelfie()} disabled={!liveFaceStatus.ready && Boolean(data.profile?.attendanceEnrollmentPhotoUrl)}>
              {liveFaceStatus.checking ? "Checking Face..." : "Capture Selfie"}
            </button>
          </div>
        </>
      );
    }
    if (flow.step === "submitting") {
      return (
        <>
          <div style={{ padding: 18, borderRadius: 18, background: currentFlowAccent.surface, border: `1px solid ${currentFlowAccent.border}`, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: currentFlowAccent.tone }}>
              Finalizing
            </div>
            <h3 style={{ margin: 0 }}>{flow.action === "check-in" ? "Saving Attendance" : "Completing Attendance"}</h3>
          </div>
          <PageLoader compact title="Uploading selfie + GPS coordinates" message="Saving your attendance record and calculating working hours." />
        </>
      );
    }
    return (
      <>
        <div style={{ padding: 18, borderRadius: 18, background: currentFlowAccent.surface, border: `1px solid ${currentFlowAccent.border}`, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: currentFlowAccent.tone }}>
            Verified
          </div>
          <h3 style={{ margin: 0 }}>Attendance Completed</h3>
          <div className="success-text" style={{ margin: 0 }}>{flow.success}</div>
        </div>
        <button type="button" onClick={closeFlow}>Done</button>
      </>
    );
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
          <div className="panel-card" style={{ width: "min(100%, 620px)", display: "grid", gap: 14, padding: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,252,0.96))" }}>
            {renderFlowBody()}
            {flow.error ? <div className="error-text">{flow.error}</div> : null}
            {flow.step !== "capture" && flow.step !== "success" && flow.step !== "submitting" ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="secondary-button" onClick={closeFlow}>Close</button>
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
            <span className="badge">Today {data.todayAppointments.length}</span>
            <span className="badge">Recent {data.recentAppointments.length}</span>
            <span className="badge">Notifications {data.notifications.length}</span>
          </div>
        </div>
      </div>
      {loading ? <PageLoader title="Loading your workspace" message="Preparing your bookings, services, attendance, and daily notification context." /> : <>
        <div className="panel-card" style={{ marginBottom: 18, overflow: "hidden" }}>
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
              <button type="button" onClick={() => openFlow("check-in")} disabled={attendanceStatus.loading || Boolean(todayAttendance)} style={{ minWidth: 140 }}>
                {attendanceStatus.loading ? "Processing..." : "Check In"}
              </button>
              <button type="button" className="secondary-button" onClick={() => openFlow("check-out")} disabled={attendanceStatus.loading || !isCheckedIn} style={{ minWidth: 140 }}>
                {attendanceStatus.loading ? "Processing..." : "Check Out"}
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(15,118,110,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(15,118,110,0.14)" }}>
              <div className="stat-label">Branch Verified</div>
              <div className="item-meta" style={{ marginTop: 4 }}>GPS and salon radius must match before attendance is accepted.</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(29,78,216,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(29,78,216,0.14)" }}>
              <div className="stat-label">Face Verified</div>
              <div className="item-meta" style={{ marginTop: 4 }}>Live selfie is checked against the owner-enrolled attendance face.</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.92))", border: "1px solid rgba(249,115,22,0.14)" }}>
              <div className="stat-label">Shift Status</div>
              <div className="item-meta" style={{ marginTop: 4 }}>{todayAttendance ? todayAttendance.status : "Waiting for first check-in today."}</div>
            </div>
          </div>
          {attendanceStatus.error ? <p className="error-text" style={{ marginTop: 12 }}>{attendanceStatus.error}</p> : null}
          {attendanceStatus.success ? <p className="success-text" style={{ marginTop: 12 }}>{attendanceStatus.success}</p> : null}
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Today Appointments</div><div className="stat-value">{data.todayAppointments.length}</div></div>
          <div className="stat-card"><div className="stat-label">Recent Assigned</div><div className="stat-value">{data.recentAppointments.length}</div></div>
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
