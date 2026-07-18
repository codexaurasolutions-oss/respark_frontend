import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  User, Mail, Phone, Calendar, DollarSign, Activity, FileText, 
  CalendarDays, Gift, Briefcase, MapPin, Tag, Clock, CheckCircle2,
  AlertCircle
} from "lucide-react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import "./CustomerHistoryPage.css";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");
const formatShortDate = (value) => (value ? String(value).slice(0, 10) : "—");

const getStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (['completed', 'paid', 'active'].includes(s)) return "status-completed";
  if (['booked', 'pending', 'confirmed'].includes(s)) return "status-booked";
  if (['cancelled', 'failed', 'expired', 'no_show'].includes(s)) return "status-cancelled";
  return "status-default";
};

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
    <div className="page-shell customer-timeline-page">
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
          <div className="customer-stats-grid">
            <div className="customer-stat-card">
              <div className="customer-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <FileText size={24} />
              </div>
              <div className="customer-stat-content">
                <div className="customer-stat-value">{summary.invoices}</div>
                <div className="customer-stat-label">Invoices</div>
              </div>
            </div>
            <div className="customer-stat-card">
              <div className="customer-stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <CalendarDays size={24} />
              </div>
              <div className="customer-stat-content">
                <div className="customer-stat-value">{summary.appointments}</div>
                <div className="customer-stat-label">Appointments</div>
              </div>
            </div>
            <div className="customer-stat-card">
              <div className="customer-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                <Gift size={24} />
              </div>
              <div className="customer-stat-content">
                <div className="customer-stat-value">{summary.memberships}</div>
                <div className="customer-stat-label">Memberships</div>
              </div>
            </div>
            <div className="customer-stat-card">
              <div className="customer-stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                <Briefcase size={24} />
              </div>
              <div className="customer-stat-content">
                <div className="customer-stat-value">{summary.packages}</div>
                <div className="customer-stat-label">Packages</div>
              </div>
            </div>
          </div>

          <div className="customer-timeline-layout">
            {/* Left Column: Profile Card */}
            <div className="customer-profile-card">
              <div className="customer-profile-header"></div>
              <div className="customer-profile-body">
                <div className="customer-avatar-wrapper">
                  <div className="customer-avatar">
                    {customer.name?.charAt(0)?.toUpperCase() || <User size={40} />}
                  </div>
                </div>
                <h3 className="customer-name">{customer.name}</h3>
                <div className="customer-type-badge">{customer.source || "Customer"}</div>
                
                <div className="customer-info-list">
                  <div className="customer-info-item">
                    <Phone size={16} className="customer-info-icon" />
                    <span>{customer.phone || "No phone"}</span>
                  </div>
                  <div className="customer-info-item">
                    <Mail size={16} className="customer-info-icon" />
                    <span>{customer.email || "No email"}</span>
                  </div>
                  <div className="customer-info-item">
                    <User size={16} className="customer-info-icon" />
                    <span>{customer.gender || "Unspecified gender"}</span>
                  </div>
                  <div className="customer-info-item">
                    <Calendar size={16} className="customer-info-icon" />
                    <span>DOB: {formatShortDate(customer.dateOfBirth)}</span>
                  </div>
                  <div className="customer-info-item">
                    <DollarSign size={16} className="customer-info-icon" />
                    <span>Spend: ₹{Number(customer.totalSpend || 0).toFixed(2)} | Visits: {customer.visitCount || 0}</span>
                  </div>
                </div>

                <div className="customer-tags-section">
                  <div className="customer-tags-title">Tags</div>
                  <div className="customer-tags-container">
                    {(customer.tags || []).map((tag) => <span key={tag} className="customer-tag">{tag}</span>)}
                    {!customer.tags?.length && <span className="muted" style={{ fontSize: 12 }}>No tags yet</span>}
                  </div>
                </div>
                
                <div className="customer-tags-section" style={{ marginTop: 16 }}>
                  <div className="customer-tags-title">Notes</div>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>{customer.notes || "No notes added yet."}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Activity Panel */}
            <div className="customer-activity-panel">
              <div className="customer-activity-tabs">
                {[
                  { key: "timeline", label: "Timeline", icon: Activity },
                  { key: "appointments", label: "Appointments", icon: CalendarDays },
                  { key: "billing", label: "Billing", icon: FileText },
                  { key: "loyalty", label: "Loyalty", icon: Gift }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button 
                      key={item.key} 
                      type="button" 
                      className={`customer-activity-tab ${tab === item.key ? "active" : ""}`} 
                      onClick={() => setTab(item.key)}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="customer-activity-content">
                {tab === "timeline" && (
                  <div className="customer-timeline-list">
                    {(customer.timelineEntries || []).map((entry) => (
                      <div key={entry.id} className="customer-timeline-item">
                        <div className="timeline-icon-wrapper" style={{ background: '#f1f5f9', color: '#64748b' }}>
                          <Activity size={20} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{entry.title}</div>
                            <span className="timeline-date"><Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }}/>{formatDate(entry.createdAt)}</span>
                          </div>
                          <div className="timeline-desc">{entry.details || "No extra detail"}</div>
                          <div className="timeline-meta">
                            <span className="timeline-badge">{entry.eventType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!customer.timelineEntries?.length && <EmptyState title="No timeline activity yet" message="Customer visits, purchases, and CRM updates will appear here over time." />}
                  </div>
                )}

                {tab === "appointments" && (
                  <div className="customer-timeline-list">
                    {(customer.appointments || []).map((appointment) => (
                      <div key={appointment.id} className="customer-timeline-item">
                        <div className="timeline-icon-wrapper" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                          <CalendarDays size={20} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{appointment.title || appointment.branch?.name || "Appointment"}</div>
                            <span className={`status-badge ${getStatusClass(appointment.status)}`}>{appointment.status}</span>
                          </div>
                          <div className="timeline-desc"><Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-top' }}/>{formatDate(appointment.startAt)} - {formatDate(appointment.endAt)}</div>
                          <div className="timeline-meta">
                            {(appointment.items || []).map((item) => <span key={item.id} className="timeline-badge"><Tag size={10} style={{ display: 'inline', marginRight: 4 }}/>{item.service?.name}</span>)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!customer.appointments?.length && <EmptyState title="No appointments yet" message="Upcoming or past appointments will appear here once bookings exist for this customer." />}
                  </div>
                )}

                {tab === "billing" && (
                  <div className="customer-timeline-list">
                    {(customer.invoices || []).map((invoice) => (
                      <div key={invoice.id} className="customer-timeline-item">
                        <div className="timeline-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                          <FileText size={20} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{invoice.invoiceNumber}</div>
                            <span className={`status-badge ${getStatusClass(invoice.status)}`}>{invoice.status}</span>
                          </div>
                          <div className="timeline-desc">
                            <MapPin size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-top' }}/>{invoice.branch?.name || "Main salon"}
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                            Total: ₹{Number(invoice.total || 0).toFixed(2)}
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                            Paid: ₹{Number(invoice.paidAmount || 0).toFixed(2)}
                          </div>
                          <div className="timeline-meta">
                            {(invoice.items || []).map((item) => <span key={item.id} className="timeline-badge">{item.serviceName} x {item.qty}</span>)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!customer.invoices?.length && <EmptyState title="No invoices yet" message="As soon as this customer has billing activity, invoice history will populate here." />}
                  </div>
                )}

                {tab === "loyalty" && (
                  <div className="customer-timeline-list">
                    {(customer.memberships || []).map((membership) => (
                      <div key={membership.id} className="customer-timeline-item">
                        <div className="timeline-icon-wrapper" style={{ background: '#fef2f2', color: '#ef4444' }}>
                          <Gift size={20} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{membership.membershipPlan?.name}</div>
                            <span className={`status-badge ${getStatusClass(membership.status)}`}>{membership.status}</span>
                          </div>
                          <div className="timeline-desc">
                            Ends: {formatShortDate(membership.endsAt)}
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                            Wallet: ₹{Number(membership.remainingWalletValue || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(customer.packages || []).map((pack) => (
                      <div key={pack.id} className="customer-timeline-item">
                        <div className="timeline-icon-wrapper" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                          <Briefcase size={20} />
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{pack.package?.name}</div>
                            <span className={`status-badge ${getStatusClass(pack.status)}`}>{pack.status}</span>
                          </div>
                          <div className="timeline-desc">
                            Ends: {formatShortDate(pack.endsAt)}
                            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                            Remaining sessions: {pack.remainingSessions}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!customer.memberships?.length && !customer.packages?.length && <EmptyState title="No loyalty products assigned yet" message="Memberships and packages will show up here once they are assigned to this customer." />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
