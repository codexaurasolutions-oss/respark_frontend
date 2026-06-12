/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams, useNavigate } from "react-router-dom";
import { customerApi, getCustomerSession, setCustomerSession } from "../../api/customerClient";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import AppointmentFeedbackForm from "../../components/customer/AppointmentFeedbackForm";
import PageLoader from "../../components/PageLoader";
import { User, Calendar, FileText, Package, Gift, Award, ShoppingBag, Bell, LogOut, ChevronRight, MapPin, Clock, Edit2, X, Check } from "lucide-react";

/* ── Route Map with Icons ── */
const routeMap = {
  "/customer": { key: "profile", endpoint: "/customer/profile", title: "My Profile", icon: User },
  "/customer/home": { key: "profile", endpoint: "/customer/profile", title: "My Profile", icon: User },
  "/customer/profile": { key: "profile", endpoint: "/customer/profile", title: "My Profile", icon: User },
  "/customer/bookings": { key: "appointments", endpoint: "/customer/appointments", title: "My Appointments", icon: Calendar },
  "/customer/appointments": { key: "appointments", endpoint: "/customer/appointments", title: "My Appointments", icon: Calendar },
  "/customer/invoices": { key: "invoices", endpoint: "/customer/invoices", title: "My Invoices", icon: FileText },
  "/customer/packages": { key: "packages", endpoint: "/customer/packages", title: "My Packages", icon: Package },
  "/customer/memberships": { key: "memberships", endpoint: "/customer/memberships", title: "My Memberships", icon: Award },
  "/customer/loyalty": { key: "loyalty", endpoint: "/customer/loyalty", title: "My Loyalty", icon: Gift },
  "/customer/orders": { key: "orders", endpoint: "/customer/orders", title: "My Orders", icon: ShoppingBag },
  "/customer/coupons": { key: "coupons", endpoint: "/customer/coupons", title: "My Coupons", icon: FileText },
  "/customer/notifications": { key: "notifications", endpoint: "/customer/notifications", title: "Notifications", icon: Bell }
};

/* ── Helper ── */
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function CustomerPortalPage() {
  const session = getCustomerSession();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", email: "", preferences: "", allergies: "", skinNotes: "" });
  const [rescheduleForm, setRescheduleForm] = useState({ startAt: "", endAt: "", note: "" });

  const route = useMemo(() => {
    if (location.pathname.startsWith("/customer/appointments/")) return { key: "appointmentDetail", endpoint: `/customer/appointments/${params.id}`, title: "Appointment Detail", icon: Calendar };
    if (location.pathname.startsWith("/customer/invoices/")) return { key: "invoiceDetail", endpoint: `/customer/invoices/${params.id}`, title: "Invoice Detail", icon: FileText };
    if (location.pathname.startsWith("/customer/orders/")) return { key: "orderDetail", endpoint: `/customer/orders/${params.id}`, title: "Order Detail", icon: ShoppingBag };
    return routeMap[location.pathname] || routeMap["/customer/profile"];
  }, [location.pathname, params.id]);

  const load = useCallback(async () => {
    setStatus({ loading: true, error: "" });
    try {
      const response = await customerApi.get(route.endpoint);
      setData(response.data);
      if (route.key === "profile") {
        setProfileForm({
          name: response.data?.name || "",
          phone: response.data?.phone || "",
          email: response.data?.email || "",
          preferences: response.data?.preferences || "",
          allergies: response.data?.allergies || "",
          skinNotes: response.data?.skinNotes || ""
        });
      }
      if (route.key === "appointmentDetail") {
        setRescheduleForm({
          startAt: response.data?.startAt ? new Date(response.data.startAt).toISOString().slice(0, 16) : "",
          endAt: response.data?.endAt ? new Date(response.data.endAt).toISOString().slice(0, 16) : "",
          note: ""
        });
      }
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not load customer portal data") });
    }
  }, [route.endpoint, route.key]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session?.accessToken) return <Navigate to="/customer/login" replace />;

  const logout = () => {
    customerApi.post("/customer/logout").catch(() => null).finally(() => {
      setCustomerSession(null);
      window.location.href = "/customer/login";
    });
  };

  const portalContext = data?.portalContext || session?.customer || null;
  const storefrontSlug = portalContext?.storefrontSlug || portalContext?.salonSlug || "";
  const bookingLink = storefrontSlug ? `/site/${storefrontSlug}/book` : "";
  const shopLink = storefrontSlug ? `/site/${storefrontSlug}/collections` : "";
  const catalogLink = storefrontSlug ? `/site/${storefrontSlug}` : "";

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await customerApi.patch("/customer/profile", profileForm);
      await load();
      alert("Profile updated successfully!");
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not update profile") });
    }
  };

  const rescheduleAppointment = async (event) => {
    event.preventDefault();
    try {
      await customerApi.patch(`/customer/appointments/${params.id}/reschedule`, rescheduleForm);
      await load();
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not reschedule appointment") });
    }
  };

  const cancelAppointment = async () => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await customerApi.patch(`/customer/appointments/${params.id}/cancel`, { note: "Cancelled from customer portal" });
      await load();
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not cancel appointment") });
    }
  };

  const markCustomerNotificationRead = async (notificationId) => {
    try {
      await customerApi.patch(`/customer/notifications/${notificationId}/read`);
      await load();
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not update notification") });
    }
  };

  const markAllCustomerNotificationsRead = async () => {
    try {
      await customerApi.patch("/customer/notifications/read-all");
      await load();
    } catch (error) {
      setStatus({ loading: false, error: formatApiError(error, "Could not update notifications") });
    }
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .portal-layout { display: grid; grid-template-columns: 260px 1fr; gap: 32px; max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
        .portal-sidebar { background: white; border-radius: 20px; padding: 24px 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); align-self: start; position: sticky; top: 40px; }
        .portal-nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; color: #64748b; text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s; margin-bottom: 4px; }
        .portal-nav-link:hover { background: #f1f5f9; color: #0f172a; }
        .portal-nav-link.active { background: #6366f1; color: white; box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
        .portal-nav-link.active svg { color: white !important; }
        .portal-content { background: white; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); overflow: hidden; }
        .portal-header { padding: 32px; border-bottom: 1px solid #f1f5f9; background: #fff; }
        .portal-body { padding: 32px; background: #fafbfc; min-height: 400px; }
        
        .c-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; transition: all 0.2s; position: relative; overflow: hidden; }
        .c-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-2px); }
        .c-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .c-card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .c-card-sub { font-size: 13px; color: #64748b; margin: 0; display: flex; align-items: center; gap: 6px; }
        .c-status { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .c-status.completed { background: #dcfce7; color: #166534; }
        .c-status.pending { background: #fef3c7; color: #92400e; }
        .c-status.cancelled { background: #fee2e2; color: #991b1b; }
        
        .p-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; transition: all 0.2s; outline: none; background: white; }
        .p-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .p-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .p-btn { padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; }
        .p-btn-primary { background: #6366f1; color: white; box-shadow: 0 4px 12px rgba(99,102,241,0.2); }
        .p-btn-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        .p-btn-outline { background: white; border: 1px solid #cbd5e1; color: #334155; }
        .p-btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
        
        @media (max-width: 900px) {
          .portal-layout { grid-template-columns: 1fr; padding: 20px 16px; }
          .portal-sidebar { position: static; display: flex; overflow-x: auto; padding: 12px; gap: 8px; border-radius: 16px; }
          .portal-nav-link { white-space: nowrap; margin: 0; padding: 8px 16px; }
          .sidebar-brand { display: none; }
          .sidebar-actions { display: none; }
        }
      `}</style>

      {/* Top Navbar for Mobile */}
      <div style={{ background: "white", padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 18 }}>
            {portalContext?.salonName?.[0] || "P"}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>{portalContext?.salonName || "Customer Portal"}</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Welcome back, {session?.customer?.name?.split(" ")[0] || "Guest"}</p>
          </div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500 }}>
          <LogOut size={16} /> <span className="hide-mobile">Logout</span>
        </button>
      </div>

      <div className="portal-layout">
        {/* SIDEBAR NAVIGATION */}
        <aside className="portal-sidebar">
          <div className="sidebar-brand" style={{ padding: "0 12px 20px", marginBottom: 20, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Navigation</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { path: "/customer/profile", label: "My Profile", icon: User },
              { path: "/customer/appointments", label: "Appointments", icon: Calendar },
              { path: "/customer/invoices", label: "Invoices", icon: FileText },
              { path: "/customer/orders", label: "Orders", icon: ShoppingBag },
              { path: "/customer/loyalty", label: "Loyalty & Points", icon: Gift },
              { path: "/customer/coupons", label: "Coupons & Offers", icon: Award },
              { path: "/customer/packages", label: "Packages", icon: Package },
              { path: "/customer/notifications", label: "Notifications", icon: Bell },
            ].map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`portal-nav-link ${location.pathname.startsWith(item.path) ? "active" : ""}`}
              >
                <item.icon size={18} style={{ color: location.pathname.startsWith(item.path) ? "white" : "#94a3b8" }} />
                {item.label}
              </Link>
            ))}
          </div>

          {catalogLink && (
            <div className="sidebar-actions" style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 10 }}>
              <Link to={bookingLink} style={{ display: "block", textAlign: "center", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", padding: "10px", borderRadius: "10px", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }} onMouseOver={e => e.target.style.background = "#f1f5f9"} onMouseOut={e => e.target.style.background = "#f8fafc"}>
                Book Appointment
              </Link>
              <Link to={shopLink} style={{ display: "block", textAlign: "center", background: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", padding: "10px", borderRadius: "10px", textDecoration: "none", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }} onMouseOver={e => e.target.style.background = "#f1f5f9"} onMouseOut={e => e.target.style.background = "#f8fafc"}>
                Shop Products
              </Link>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="portal-content">
          <header className="portal-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {route.icon && <route.icon size={28} color="#6366f1" />}
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{route.title}</h1>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
                  {route.key === "profile" && "Manage your personal information and preferences."}
                  {route.key === "appointments" && "View your upcoming and past bookings."}
                  {route.key === "invoices" && "Access your payment receipts and billing history."}
                </p>
              </div>
            </div>
          </header>

          <div className="portal-body">
            {status.loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
                <PageLoader compact title={`Loading ${route.title.toLowerCase()}`} />
              </div>
            ) : status.error ? (
              <div style={{ background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 12 }}>{status.error}</div>
            ) : (
              <>
                {/* ── PROFILE TAB ── */}
                {route.key === "profile" && (
                  <form onSubmit={saveProfile} style={{ display: "grid", gap: 24, maxWidth: 600 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <label className="p-label">Full Name</label>
                        <input className="p-input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                      </div>
                      <div>
                        <label className="p-label">Phone Number</label>
                        <input className="p-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="p-label">Email Address</label>
                      <input type="email" className="p-input" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="p-label">Preferences</label>
                      <textarea className="p-input" rows={3} value={profileForm.preferences} onChange={(e) => setProfileForm({ ...profileForm, preferences: e.target.value })} placeholder="Favorite stylist, preferred beverages, etc." />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <label className="p-label">Allergies</label>
                        <textarea className="p-input" rows={2} value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} placeholder="Any known allergies" />
                      </div>
                      <div>
                        <label className="p-label">Skin/Hair Notes</label>
                        <textarea className="p-input" rows={2} value={profileForm.skinNotes} onChange={(e) => setProfileForm({ ...profileForm, skinNotes: e.target.value })} placeholder="Sensitive skin, dry scalp, etc." />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button type="submit" className="p-btn p-btn-primary">Save Changes</button>
                    </div>
                  </form>
                )}

                {/* ── LISTINGS (Appointments, Invoices, Orders) ── */}
                {Array.isArray(data) && ["appointments", "invoices", "orders"].includes(route.key) && (
                  <div style={{ display: "grid", gap: 16 }}>
                    {data.length === 0 ? (
                      <EmptyState title={`No ${route.title.split(" ")[1].toLowerCase()} found`} message={`You have no past or upcoming ${route.title.split(" ")[1].toLowerCase()}.`} />
                    ) : (
                      data.map(item => (
                        <div key={item.id} className="c-card" onClick={() => navigate(`/customer/${route.key}/${item.id}`)} style={{ cursor: "pointer" }}>
                          <div className="c-card-header">
                            <div>
                              <h3 className="c-card-title">
                                {route.key === "appointments" && (item.items?.[0]?.service?.name || "Salon Service")}
                                {route.key === "invoices" && item.invoiceNumber}
                                {route.key === "orders" && item.orderNumber}
                              </h3>
                              <div className="c-card-sub">
                                {route.key === "appointments" && <><Clock size={14} /> {fmtDate(item.startAt)}</>}
                                {(route.key === "invoices" || route.key === "orders") && <><Calendar size={14} /> {fmtDate(item.createdAt)}</>}
                              </div>
                            </div>
                            <span className={`c-status ${item.status?.toLowerCase() || 'pending'}`}>{item.status}</span>
                          </div>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                            <div style={{ fontSize: 13, color: "#64748b" }}>
                              {route.key === "appointments" && item.branch?.name && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {item.branch.name}</span>}
                              {(route.key === "invoices" || route.key === "orders") && <strong>Total: ₹{Number(item.total || 0).toLocaleString()}</strong>}
                            </div>
                            <div style={{ color: "#6366f1", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" }}>
                              View Details <ChevronRight size={16} style={{ marginLeft: 4 }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── APPOINTMENT DETAIL ── */}
                {route.key === "appointmentDetail" && data && (
                  <div>
                    <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 0 24px", fontWeight: 500 }}><ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back</button>
                    
                    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, marginBottom: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                        <div>
                          <h2 style={{ fontSize: 22, margin: "0 0 8px", color: "#0f172a" }}>Appointment Summary</h2>
                          <div style={{ display: "flex", gap: 16, color: "#64748b", fontSize: 14 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={16} /> {fmtDate(data.startAt)}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={16} /> {data.branch?.name || "Main Branch"}</span>
                          </div>
                        </div>
                        <span className={`c-status ${data.status?.toLowerCase() || 'pending'}`} style={{ fontSize: 13, padding: "6px 14px" }}>{data.status}</span>
                      </div>

                      <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
                        <h4 style={{ margin: "0 0 12px", color: "#334155" }}>Services Booked</h4>
                        {(data.items || []).map(item => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.service?.name}</div>
                              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Stylist: {(item.assignedStaff || []).map(s => s.userSalon?.user?.name).join(", ") || "Any Available"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {["PENDING", "CONFIRMED"].includes(data.status) && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        <div className="c-card">
                          <h3 style={{ margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}><Edit2 size={18} /> Reschedule</h3>
                          <form onSubmit={rescheduleAppointment}>
                            <div style={{ marginBottom: 12 }}>
                              <label className="p-label">New Date & Time</label>
                              <input type="datetime-local" className="p-input" value={rescheduleForm.startAt} onChange={e => setRescheduleForm({...rescheduleForm, startAt: e.target.value})} required />
                            </div>
                            <button className="p-btn p-btn-primary" style={{ width: "100%" }}>Request Reschedule</button>
                          </form>
                        </div>
                        <div className="c-card" style={{ background: "#fff1f2", borderColor: "#fecdd3" }}>
                          <h3 style={{ margin: "0 0 16px", color: "#e11d48", display: "flex", alignItems: "center", gap: 8 }}><X size={18} /> Cancel Appointment</h3>
                          <p style={{ fontSize: 13, color: "#be123c", marginBottom: 20 }}>Please note our cancellation policy. Frequent cancellations may affect future bookings.</p>
                          <button className="p-btn" style={{ background: "#e11d48", color: "white", width: "100%", border: "none" }} onClick={cancelAppointment}>Cancel Booking</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── INVOICE DETAIL ── */}
                {route.key === "invoiceDetail" && data && (
                  <div>
                    <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 0 24px", fontWeight: 500 }}><ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back</button>
                    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32 }}>
                      <div style={{ textAlign: "center", borderBottom: "1px dashed #cbd5e1", paddingBottom: 24, marginBottom: 24 }}>
                        <h2 style={{ margin: 0, fontSize: 28, fontFamily: "monospace" }}>{data.invoiceNumber}</h2>
                        <p style={{ margin: "8px 0 0", color: "#64748b" }}>{fmtDate(data.createdAt)}</p>
                        <span className={`c-status ${data.status?.toLowerCase() || 'pending'}`} style={{ marginTop: 12, display: "inline-block" }}>{data.status}</span>
                      </div>
                      
                      <div style={{ marginBottom: 24 }}>
                        {(data.items || []).map(row => (
                          <div key={row.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "#334155" }}>{row.serviceName || row.productName || "Item"}</div>
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>Qty: {row.qty} × ₹{Number(row.price || 0).toLocaleString()}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>₹{Number(row.lineTotal || 0).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: 20, borderRadius: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 600, color: "#334155" }}>Total Paid</span>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "#6366f1" }}>₹{Number(data.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── LOYALTY ── */}
                {route.key === "loyalty" && data && (
                  <div style={{ display: "grid", gap: 24 }}>
                    <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 20, padding: 32, color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, opacity: 0.9 }}>Your Loyalty Balance</h2>
                        <div style={{ fontSize: 48, fontWeight: 800, margin: "8px 0", display: "flex", alignItems: "center", gap: 12 }}>
                          {Number(data.loyaltyPoints || 0)} <span style={{ fontSize: 18, fontWeight: 600, background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20 }}>Points</span>
                        </div>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Total Spend: ₹{Number(data.totalSpend || 0).toLocaleString()}</p>
                      </div>
                      <Gift size={80} style={{ opacity: 0.2 }} />
                    </div>

                    <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Reward History</h3>
                    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      {(data.history || []).length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No loyalty history yet.</div>
                      ) : (
                        data.history.map(row => (
                          <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                            <div>
                              <div style={{ fontWeight: 600, color: "#334155", textTransform: "capitalize" }}>{row.type.toLowerCase()}</div>
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>{fmtDate(row.createdAt)}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: row.type === "EARN" ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                              {row.type === "EARN" ? "+" : "-"}{row.points} pts
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* ── COUPONS & OFFERS ── */}
                {route.key === "coupons" && data && !Array.isArray(data) && (
                  <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {(data.activeCoupons || []).map(coupon => (
                      <div key={coupon.id} style={{ background: "white", borderRadius: 16, border: "2px dashed #cbd5e1", padding: 24, position: "relative" }}>
                        <div style={{ position: "absolute", top: -10, left: 24, background: "#6366f1", color: "white", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>OFFER</div>
                        <h3 style={{ margin: "12px 0 4px", color: "#0f172a" }}>{coupon.title}</h3>
                        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}</p>
                        <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: 8, marginTop: 16, textAlign: "center", fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: "#334155", letterSpacing: 2 }}>
                          {coupon.code}
                        </div>
                      </div>
                    ))}
                    {(data.activeCoupons || []).length === 0 && <div style={{ gridColumn: "1/-1" }}><EmptyState title="No active offers" message="Check back later for exciting salon deals." /></div>}
                  </div>
                )}

              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
