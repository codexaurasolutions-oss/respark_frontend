import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");
const formatShortDate = (value) => (value ? String(value).slice(0, 10) : "—");

export default function CustomerHistoryPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("timeline");
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    api.get(`/owner/customers/${id}/history`).then((response) => {
      if (!active) return;
      setCustomer(response.data);
      setStatus({ loading: false, error: "" });
    }).catch((error) => {
      if (!active) return;
      setStatus({ loading: false, error: formatApiError(error, "Could not load customer history") });
    });
    return () => {
      active = false;
    };
  }, [id]);

  const summary = useMemo(() => {
    if (!customer) return null;
    return {
      invoices: customer.invoices?.length || 0,
      appointments: customer.appointments?.length || 0,
      memberships: customer.memberships?.length || 0,
      packages: customer.packages?.length || 0
    };
  }, [customer]);

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Customer Timeline"
        description="Complete CRM view with service history, billing, memberships, packages, and event trail."
        items={[
          { label: "Customer List", to: "/admin/customers", hint: "Back" },
          { label: "History View", to: `/admin/customers/${id}/history`, hint: "Profile" },
          { label: "Memberships", to: `/admin/customers/${id}/memberships`, hint: "Loyalty" },
          { label: "Packages", to: `/admin/customers/${id}/packages`, hint: "Prepaid" }
        ]}
        actions={<Link to="/admin/customers" className="module-tab">Back to Customers</Link>}
      />

      {status.loading && (
        <PageLoader
          title="Loading customer timeline"
          message="Pulling CRM history, loyalty activity, and billing records into one view."
        />
      )}
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}

      {customer && (
        <>
          <div className="stats-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card"><div className="stat-label">Invoices</div><div className="stat-value">{summary.invoices}</div></div>
            <div className="stat-card"><div className="stat-label">Appointments</div><div className="stat-value">{summary.appointments}</div></div>
            <div className="stat-card"><div className="stat-label">Memberships</div><div className="stat-value">{summary.memberships}</div></div>
            <div className="stat-card"><div className="stat-label">Packages</div><div className="stat-value">{summary.packages}</div></div>
          </div>

          <div className="two-col">
            <div className="panel-card">
              <h3 style={{ marginTop: 0 }}>{customer.name}</h3>
              <div className="item-meta">{customer.phone} | {customer.email || "No email"}</div>
              <div className="item-meta">{[customer.gender, customer.source].filter(Boolean).join(" | ") || "No gender/source metadata"}</div>
              <div className="item-meta">DOB {formatShortDate(customer.dateOfBirth)} | Anniversary {formatShortDate(customer.anniversary)}</div>
              <div className="item-meta">Spend {Number(customer.totalSpend || 0).toFixed(2)} | Visits {customer.visitCount || 0}</div>
              <p className="muted" style={{ marginTop: 12 }}>{customer.notes || "No notes added yet."}</p>
              <div className="badge-row">
                {(customer.tags || []).map((tag) => <span key={tag} className="badge">{tag}</span>)}
                {!customer.tags?.length && <span className="muted">No tags yet</span>}
              </div>
            </div>

            <div className="panel-card">
              <div className="inline-actions" style={{ marginBottom: 12 }}>
                {[
                  { key: "timeline", label: "Timeline" },
                  { key: "appointments", label: "Appointments" },
                  { key: "billing", label: "Billing" },
                  { key: "loyalty", label: "Loyalty" }
                ].map((item) => (
                  <button key={item.key} type="button" className={tab === item.key ? "" : "secondary-button"} onClick={() => setTab(item.key)}>
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === "timeline" && (
                <div className="list-stack">
                  {(customer.timelineEntries || []).map((entry) => (
                    <div key={entry.id} className="list-item">
                      <div className="item-head">
                        <strong>{entry.title}</strong>
                        <span className="badge">{entry.eventType}</span>
                      </div>
                      <div className="item-meta">{entry.details || "No extra detail"}</div>
                      <div className="item-meta">{formatDate(entry.createdAt)}</div>
                    </div>
                  ))}
                  {!customer.timelineEntries?.length && <EmptyState title="No timeline activity yet" message="Customer visits, purchases, and CRM updates will appear here over time." />}
                </div>
              )}

              {tab === "appointments" && (
                <div className="list-stack">
                  {(customer.appointments || []).map((appointment) => (
                    <div key={appointment.id} className="list-item">
                      <div className="item-head">
                        <strong>{appointment.title || appointment.branch?.name || "Appointment"}</strong>
                        <span className={`badge badge-${String(appointment.status).toLowerCase()}`}>{appointment.status}</span>
                      </div>
                      <div className="item-meta">{formatDate(appointment.startAt)} - {formatDate(appointment.endAt)}</div>
                      <div className="badge-row">
                        {(appointment.items || []).map((item) => <span key={item.id} className="badge">{item.service?.name}</span>)}
                      </div>
                    </div>
                  ))}
                  {!customer.appointments?.length && <EmptyState title="No appointments yet" message="Upcoming or past appointments will appear here once bookings exist for this customer." />}
                </div>
              )}

              {tab === "billing" && (
                <div className="list-stack">
                  {(customer.invoices || []).map((invoice) => (
                    <div key={invoice.id} className="list-item">
                      <div className="item-head">
                        <strong>{invoice.invoiceNumber}</strong>
                        <span className={`badge badge-${String(invoice.status).toLowerCase()}`}>{invoice.status}</span>
                      </div>
                      <div className="item-meta">{invoice.branch?.name || "Main salon"} | Total {Number(invoice.total || 0).toFixed(2)} | Paid {Number(invoice.paidAmount || 0).toFixed(2)}</div>
                      <div className="badge-row">
                        {(invoice.items || []).map((item) => <span key={item.id} className="badge">{item.serviceName} x {item.qty}</span>)}
                      </div>
                    </div>
                  ))}
                  {!customer.invoices?.length && <EmptyState title="No invoices yet" message="As soon as this customer has billing activity, invoice history will populate here." />}
                </div>
              )}

              {tab === "loyalty" && (
                <div className="list-stack">
                  {(customer.memberships || []).map((membership) => (
                    <div key={membership.id} className="list-item">
                      <div className="item-head">
                        <strong>{membership.membershipPlan?.name}</strong>
                        <span className="badge">{membership.status}</span>
                      </div>
                      <div className="item-meta">Ends {formatShortDate(membership.endsAt)} | Wallet {Number(membership.remainingWalletValue || 0).toFixed(2)}</div>
                    </div>
                  ))}
                  {(customer.packages || []).map((pack) => (
                    <div key={pack.id} className="list-item">
                      <div className="item-head">
                        <strong>{pack.package?.name}</strong>
                        <span className="badge">{pack.status}</span>
                      </div>
                      <div className="item-meta">Remaining sessions {pack.remainingSessions} | Ends {formatShortDate(pack.endsAt)}</div>
                    </div>
                  ))}
                  {!customer.memberships?.length && !customer.packages?.length && <EmptyState title="No loyalty products assigned yet" message="Memberships and packages will show up here once they are assigned to this customer." />}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
