/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { customerApi, getCustomerSession, setCustomerSession } from "../../api/customerClient";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import AppointmentFeedbackForm from "../../components/customer/AppointmentFeedbackForm";
import PageLoader from "../../components/PageLoader";

const routeMap = {
  "/customer": { key: "profile", endpoint: "/customer/profile", title: "My Profile" },
  "/customer/home": { key: "profile", endpoint: "/customer/profile", title: "My Profile" },
  "/customer/profile": { key: "profile", endpoint: "/customer/profile", title: "My Profile" },
  "/customer/bookings": { key: "appointments", endpoint: "/customer/appointments", title: "My Appointments" },
  "/customer/appointments": { key: "appointments", endpoint: "/customer/appointments", title: "My Appointments" },
  "/customer/invoices": { key: "invoices", endpoint: "/customer/invoices", title: "My Invoices" },
  "/customer/packages": { key: "packages", endpoint: "/customer/packages", title: "My Packages" },
  "/customer/memberships": { key: "memberships", endpoint: "/customer/memberships", title: "My Memberships" },
  "/customer/loyalty": { key: "loyalty", endpoint: "/customer/loyalty", title: "My Loyalty" },
  "/customer/orders": { key: "orders", endpoint: "/customer/orders", title: "My Orders" },
  "/customer/coupons": { key: "coupons", endpoint: "/customer/coupons", title: "My Coupons" },
  "/customer/notifications": { key: "notifications", endpoint: "/customer/notifications", title: "Notifications" }
};

export default function CustomerPortalPage() {
  const session = getCustomerSession();
  const location = useLocation();
  const params = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", email: "", preferences: "", allergies: "", skinNotes: "" });
  const [rescheduleForm, setRescheduleForm] = useState({ startAt: "", endAt: "", note: "" });
  const nowStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const route = useMemo(() => {
    if (location.pathname.startsWith("/customer/appointments/")) return { key: "appointmentDetail", endpoint: `/customer/appointments/${params.id}`, title: "Appointment Detail" };
    if (location.pathname.startsWith("/customer/invoices/")) return { key: "invoiceDetail", endpoint: `/customer/invoices/${params.id}`, title: "Invoice Detail" };
    if (location.pathname.startsWith("/customer/orders/")) return { key: "orderDetail", endpoint: `/customer/orders/${params.id}`, title: "Order Detail" };
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
  const bookingLink = storefrontSlug ? `/salon/${storefrontSlug}/book` : "";
  const shopLink = storefrontSlug ? `/salon/${storefrontSlug}/shop` : "";
  const catalogLink = storefrontSlug ? `/salon/${storefrontSlug}` : "";

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await customerApi.patch("/customer/profile", profileForm);
      await load();
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
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0, marginBottom: 8 }}>Customer Portal</h1>
            <p style={{ margin: 0 }}>
              Track appointments, orders, invoices, points, and offers from one salon-aware workspace.
            </p>
          </div>
          {portalContext?.salonName ? (
            <div className="badge-row">
              <span className="badge">{portalContext.salonName}</span>
              {storefrontSlug ? <span className="badge">{storefrontSlug}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="two-col" style={{ alignItems: "start" }}>
        <aside className="panel-card">
          <h3>Customer Portal</h3>
          {portalContext?.salonName && <p className="muted">Connected to {portalContext.salonName}</p>}
          <div className="module-tabs" style={{ display: "grid", gap: 8 }}>
            {Object.entries(routeMap).map(([href, item]) => <Link key={href} className={`module-tab ${location.pathname === href ? "active" : ""}`} to={href}>{item.title}</Link>)}
          </div>
          {catalogLink && (
            <div className="list-stack" style={{ marginTop: 16 }}>
              <Link className="secondary-button" to={catalogLink}>Open Catalog</Link>
              <Link className="secondary-button" to={bookingLink}>Book Appointment</Link>
              <Link className="secondary-button" to={shopLink}>Shop Products</Link>
            </div>
          )}
          <button type="button" className="secondary-button" onClick={logout} style={{ marginTop: 16 }}>Logout</button>
        </aside>
        <section className="panel-card">
          <h2>{route.title}</h2>
          {status.loading && (
            <PageLoader
              compact
              title={`Loading ${route.title.toLowerCase()}`}
              message="Pulling your latest portal data and account activity."
            />
          )}
          {status.error && <p className="error-text">{status.error}</p>}

          {!status.loading && !status.error && route.key === "profile" && (
            <>
              {portalContext && (
                <div className="summary-box" style={{ marginBottom: 16 }}>
                  <strong>{portalContext.salonName || "Connected Salon"}</strong>
                  <div className="item-meta">Salon slug: {portalContext.salonSlug || storefrontSlug || "Not available"}</div>
                  <div className="item-meta">Storefront slug: {storefrontSlug || "Not available"}</div>
                </div>
              )}
              <form className="form-grid" onSubmit={saveProfile}>
                <input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
                <input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
                <input value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
                <textarea value={profileForm.preferences} onChange={(event) => setProfileForm((current) => ({ ...current, preferences: event.target.value }))} placeholder="Preferences" />
                <textarea value={profileForm.allergies} onChange={(event) => setProfileForm((current) => ({ ...current, allergies: event.target.value }))} placeholder="Allergies" />
                <textarea value={profileForm.skinNotes} onChange={(event) => setProfileForm((current) => ({ ...current, skinNotes: event.target.value }))} placeholder="Skin notes" />
                <button>Save Profile</button>
              </form>
            </>
          )}

          {!status.loading && !status.error && route.key === "appointmentDetail" && data && (
            <>
              <div className="summary-box">
                <strong>{data.title || "Appointment"}</strong>
                <div className="item-meta">{data.status} | {data.branch?.name || "Branch"} | {new Date(data.startAt).toLocaleString()}</div>
                <div className="item-meta">Notes: {data.notes || "None"}</div>
              </div>
              <div className="list-stack" style={{ marginTop: 16 }}>
                {(data.items || []).map((item) => (
                  <div key={item.id} className="list-item">
                    <strong>{item.service?.name || "Service"}</strong>
                    <div className="item-meta">
                      {(item.assignedStaff || []).map((staffRow) => staffRow.userSalon?.user?.name).filter(Boolean).join(", ") || "Unassigned"}
                    </div>
                  </div>
                ))}
              </div>
              {["PENDING", "CONFIRMED"].includes(data.status) && (
                <div className="two-col" style={{ marginTop: 16 }}>
                  <div className="summary-box">
                    <strong>Reschedule</strong>
                    <form className="form-grid" onSubmit={rescheduleAppointment} style={{ marginTop: 12 }}>
                      <label><span className="muted">New start time</span><input type="datetime-local" min={nowStr} value={rescheduleForm.startAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, startAt: event.target.value }))} /></label>
                      <label><span className="muted">New end time</span><input type="datetime-local" min={nowStr} value={rescheduleForm.endAt} onChange={(event) => setRescheduleForm((current) => ({ ...current, endAt: event.target.value }))} /></label>
                      <textarea rows="3" placeholder="Reason" value={rescheduleForm.note} onChange={(event) => setRescheduleForm((current) => ({ ...current, note: event.target.value }))} />
                      <button>Reschedule Appointment</button>
                    </form>
                  </div>
                  <div className="summary-box">
                    <strong>Cancel</strong>
                    <p className="muted">If salon policy allows it, you can cancel this booking from your portal.</p>
                    <button type="button" className="danger-button" onClick={cancelAppointment}>Cancel Appointment</button>
                  </div>
                </div>
              )}
              {data.status === "COMPLETED" && (
                <AppointmentFeedbackForm appointmentId={data.id} onSubmitted={load} />
              )}
              <div className="summary-box" style={{ marginTop: 16 }}>
                <strong>Status History</strong>
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {(data.logs || []).map((row) => (
                    <div key={row.id} className="list-item">
                      <strong>{row.action}</strong>
                      <div className="item-meta">{row.details || "No detail"}</div>
                    </div>
                  ))}
                  {!(data.logs || []).length && <EmptyState title="No status history yet" message="When this appointment changes, its activity timeline will appear here." />}
                </div>
              </div>
            </>
          )}

          {!status.loading && !status.error && route.key === "invoiceDetail" && data && (
            <>
              <div className="summary-box">
                <strong>{data.invoiceNumber}</strong>
                <div className="item-meta">{data.status} | {Number(data.total || 0).toFixed(2)}</div>
              </div>
              <div className="list-stack" style={{ marginTop: 16 }}>
                {(data.items || []).map((row) => (
                  <div key={row.id} className="list-item">
                    <strong>{row.serviceName || "Item"}</strong>
                    <div className="item-meta">Qty {row.qty} | {Number(row.lineTotal || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!status.loading && !status.error && route.key === "orderDetail" && data && (
            <>
              <div className="summary-box">
                <strong>{data.orderNumber}</strong>
                <div className="item-meta">{data.status} | {data.paymentStatus} | {Number(data.total || 0).toFixed(2)}</div>
              </div>
              <div className="list-stack" style={{ marginTop: 16 }}>
                {(data.items || []).map((row) => (
                  <div key={row.id} className="list-item">
                    <strong>{row.productName}</strong>
                    <div className="item-meta">Qty {row.qty} | {Number(row.lineTotal || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!status.loading && !status.error && !["profile", "appointmentDetail", "invoiceDetail", "orderDetail"].includes(route.key) && (
            <div className="list-stack">
              {route.key === "loyalty" && data && (
                <>
                  <div className="summary-box">
                    <strong>{Number(data.loyaltyPoints || 0)} Loyalty Points</strong>
                    <div className="item-meta">Total Spend {Number(data.totalSpend || 0).toFixed(2)} | Average Spend {Number(data.averageSpend || 0).toFixed(2)}</div>
                    {data.activeRule && (
                      <div className="item-meta">
                        Earn {data.activeRule.pointsPerCurrency} pts per currency | Min redeem {data.activeRule.minRedeemPoints}
                      </div>
                    )}
                  </div>
                  <div className="summary-box" style={{ marginTop: 16 }}>
                    <strong>Loyalty History</strong>
                    <div className="list-stack" style={{ marginTop: 12 }}>
                      {(data.history || []).map((row) => (
                        <div key={row.id} className="list-item">
                          <strong>{row.type}</strong>
                          <div className="item-meta">{row.points} pts | Balance {row.balanceAfter}</div>
                        </div>
                      ))}
                      {!(data.history || []).length && <EmptyState title="No loyalty activity yet" message="Earned and redeemed points will show here once loyalty activity starts." />}
                    </div>
                  </div>
                </>
              )}

              {route.key === "coupons" && data && !Array.isArray(data) && (
                <>
                  <div className="summary-box">
                    <strong>Assigned Coupons</strong>
                    <div className="list-stack" style={{ marginTop: 12 }}>
                      {(data.assignedCoupons || []).map((row) => (
                        <div key={row.id} className="list-item">
                          <strong>{row.code}</strong>
                          <div className="item-meta">{row.title} | {row.discountType || "Offer"} {row.discountValue ? `| ${Number(row.discountValue).toFixed(2)}` : ""}</div>
                        </div>
                      ))}
                      {!(data.assignedCoupons || []).length && <EmptyState title="No assigned coupons" message="Targeted coupons from the salon will appear here when available." />}
                    </div>
                  </div>
                  <div className="summary-box" style={{ marginTop: 16 }}>
                    <strong>Active Gift Cards</strong>
                    <div className="list-stack" style={{ marginTop: 12 }}>
                      {(data.giftCards || []).map((row) => (
                        <div key={row.id} className="list-item">
                          <strong>{row.code}</strong>
                          <div className="item-meta">Balance {Number(row.balanceAmount || 0).toFixed(2)}</div>
                        </div>
                      ))}
                      {!(data.giftCards || []).length && <EmptyState title="No active gift cards" message="Purchased or assigned gift cards will show here with their remaining balance." />}
                    </div>
                  </div>
                  <div className="summary-box" style={{ marginTop: 16 }}>
                    <strong>Available Offers</strong>
                    <div className="list-stack" style={{ marginTop: 12 }}>
                      {(data.activeCoupons || []).map((row) => (
                        <div key={row.id} className="list-item">
                          <strong>{row.code}</strong>
                          <div className="item-meta">{row.title} | {row.discountType} {Number(row.discountValue || 0).toFixed(2)}</div>
                        </div>
                      ))}
                      {!(data.activeCoupons || []).length && <EmptyState title="No salon offers right now" message="Fresh public or member offers will appear here when the salon launches them." />}
                    </div>
                  </div>
                </>
              )}

              {route.key === "notifications" && Array.isArray(data) && (
                <>
                  <div className="inline-actions" style={{ marginBottom: 12 }}>
                    <button type="button" className="secondary-button" onClick={markAllCustomerNotificationsRead}>Mark All Read</button>
                  </div>
                  {data.map((row) => (
                    <div key={row.id} className="list-item">
                      <div>
                        <strong>{row.title || "Notification"}</strong>
                        <div className="item-meta">{row.message || ""}</div>
                        <div className="item-meta">{row.isRead ? "Read" : "Unread"}{row.linkUrl ? ` | ${row.linkUrl}` : ""}</div>
                      </div>
                      {!row.isRead ? <button type="button" className="secondary-button" onClick={() => markCustomerNotificationRead(row.id)}>Mark Read</button> : null}
                    </div>
                  ))}
                  {!data.length && <EmptyState title="No notifications yet" message="Appointment alerts, order updates, and offers will land here once they are sent." />}
                </>
              )}

              {Array.isArray(data) && route.key !== "notifications" ? data.map((row) => (
                <div key={row.id || row.code || row.title} className="list-item">
                  <div>
                    <strong>{row.orderNumber || row.invoiceNumber || row.name || row.title || row.code || row.status || "Record"}</strong>
                    <div className="item-meta">{row.status || row.message || row.note || row.phone || row.email || ""}</div>
                  </div>
                  {"id" in row && route.key === "appointments" && <Link className="secondary-button" to={`/customer/appointments/${row.id}`}>Open</Link>}
                  {"id" in row && route.key === "invoices" && <Link className="secondary-button" to={`/customer/invoices/${row.id}`}>Open</Link>}
                  {"id" in row && route.key === "orders" && <Link className="secondary-button" to={`/customer/orders/${row.id}`}>Open</Link>}
                </div>
              )) : (
                <div className="muted">Dashboard data loaded.</div>
              )}
              {Array.isArray(data) && route.key !== "notifications" && !data.length && (
                <EmptyState title="No records yet" message="As soon as the salon creates activity in this section, it will appear here for you." />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
