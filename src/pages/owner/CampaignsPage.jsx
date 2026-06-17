/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyForm = {
  name: "",
  type: "WHATSAPP",
  audienceFilter: "ALL_CUSTOMERS",
  audienceMeta: { serviceId: "", segmentId: "" },
  message: "",
  bannerUrl: "",
  scheduledFor: ""
};

export default function CampaignsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [campaignInsights, setCampaignInsights] = useState({
    performance: null,
    roi: null,
    conversions: [],
    audience: null
  });
  const [lastShareLink, setLastShareLink] = useState("");
  const [services, setServices] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [savedSegments, setSavedSegments] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", type: "", audienceFilter: "" });
  const [logFilters, setLogFilters] = useState({ q: "", eventType: "" });
  const [loading, setLoading] = useState(true);

  const shareAssets = useMemo(() => {
    const title = detail?.name || form.name || "Campaign";
    const message = detail?.message || form.message || "";
    const bannerUrl = detail?.bannerUrl || form.bannerUrl || "";
    const combinedText = [title, message].filter(Boolean).join(" - ");
    const shareUrl = bannerUrl || window.location.href;
    return {
      combinedText,
      bannerUrl,
      whatsapp: combinedText ? `https://wa.me/?text=${encodeURIComponent(`${combinedText}${shareUrl ? ` ${shareUrl}` : ""}`)}` : "",
      facebook: shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(combinedText)}` : "",
      linkedin: shareUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` : "",
      x: combinedText || shareUrl ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(combinedText)}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ""}` : ""
    };
  }, [detail, form.bannerUrl, form.message, form.name]);

  const isCreate = location.pathname.endsWith("/create");
  const isEdit = location.pathname.endsWith("/edit");
  const isLogs = location.pathname.endsWith("/logs");

  const load = useCallback(async () => {
    try {
      const response = await api.get("/owner/campaigns", {
        params: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.audienceFilter ? { audienceFilter: filters.audienceFilter } : {})
        }
      });
      const [servicesResponse, couponsResponse, templatesResponse] = await Promise.all([
        api.get("/owner/services"),
        api.get("/owner/coupons").catch(() => ({ data: [] })),
        api.get("/owner/campaign-templates").catch(() => ({ data: [] }))
      ]);
      const settingsResponse = await api.get("/owner/settings").catch(() => ({ data: {} }));
      setRows(response.data || []);
      setServices(servicesResponse.data || []);
      setCoupons(couponsResponse.data || []);
      setTemplates(templatesResponse.data || []);
      setSavedSegments((settingsResponse.data?.advancedSettings?.crmSegments || []).filter((segment) => segment?.active !== false));
      if (params.id) {
        const detailResponse = await api.get(`/owner/campaigns/${params.id}`);
        setDetail(detailResponse.data);
        const [performanceResponse, roiResponse, conversionsResponse, audienceResponse] = await Promise.all([
          api.get(`/owner/campaigns/${params.id}/performance`).catch(() => ({ data: null })),
          api.get(`/owner/campaigns/${params.id}/roi`).catch(() => ({ data: null })),
          api.get(`/owner/campaigns/${params.id}/conversions`).catch(() => ({ data: [] })),
          api.get(`/owner/campaigns/${params.id}/audience`).catch(() => ({ data: null }))
        ]);
        setCampaignInsights({
          performance: performanceResponse.data,
          roi: roiResponse.data,
          conversions: conversionsResponse.data || [],
          audience: audienceResponse.data
        });
        if (isLogs) {
          const logsResponse = await api.get(`/owner/campaigns/${params.id}/logs`, {
            params: {
              ...(logFilters.q ? { q: logFilters.q } : {}),
              ...(logFilters.eventType ? { eventType: logFilters.eventType } : {})
            }
          });
          setCampaignLogs(logsResponse.data || []);
        }
        if (isEdit) {
          setForm({
            name: detailResponse.data.name || "",
            type: detailResponse.data.type || "WHATSAPP",
            audienceFilter: detailResponse.data.audienceFilter || "ALL_CUSTOMERS",
            audienceMeta: {
              serviceId: detailResponse.data.audienceMeta?.serviceId || "",
              segmentId: detailResponse.data.audienceMeta?.segmentId || ""
            },
            message: detailResponse.data.message || "",
            bannerUrl: detailResponse.data.bannerUrl || "",
            scheduledFor: detailResponse.data.scheduledFor ? new Date(detailResponse.data.scheduledFor).toISOString().slice(0, 16) : ""
          });
        }
      } else {
        setDetail(null);
        setCampaignLogs([]);
        setCampaignInsights({ performance: null, roi: null, conversions: [], audience: null });
        setForm(emptyForm);
      }
      setLoading(false);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load campaigns"), success: "" });
      setLoading(false);
    }
  }, [params.id, isEdit, isLogs, filters, logFilters]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        scheduledFor: form.scheduledFor || undefined,
        audienceMeta: form.audienceFilter === "SERVICE_BASED_CUSTOMERS"
          ? { serviceId: form.audienceMeta?.serviceId || "" }
          : form.audienceFilter === "CRM_SEGMENT"
            ? { segmentId: form.audienceMeta?.segmentId || "" }
            : undefined
      };
      if (isEdit) await api.patch(`/owner/campaigns/${params.id}`, payload);
      else await api.post("/owner/campaigns", payload);
      setStatus({ error: "", success: "Campaign saved." });
      navigate("/admin/campaigns");
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save campaign"), success: "" });
    }
  };

  const applyTemplate = (templateId) => {
    const selectedTemplate = templates.find((row) => row.id === templateId);
    if (!selectedTemplate) return;
    setForm((current) => ({
      ...current,
      name: current.name || selectedTemplate.name || "",
      bannerUrl: selectedTemplate.imageUrl || current.bannerUrl,
      message: selectedTemplate.offerText || current.message
    }));
    setStatus({ error: "", success: `Template "${selectedTemplate.title || selectedTemplate.name}" applied to campaign draft.` });
  };

  const duplicate = async (id) => {
    try {
      await api.post(`/owner/campaigns/${id}/duplicate`);
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to duplicate campaign"), success: "" });
    }
  };

  const schedule = async (id) => {
    try {
      const scheduledFor = form.scheduledFor || new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
      const response = await api.post(`/owner/campaigns/${id}/schedule`, { scheduledFor });
      setStatus({ error: "", success: `Campaign scheduled for ${new Date(response.data.scheduledFor).toLocaleString()}.` });
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to schedule campaign"), success: "" });
    }
  };

  const sendPlaceholder = async (id) => {
    try {
      const response = await api.post(`/owner/campaigns/${id}/send-placeholder`);
      setLastShareLink(response.data.whatsappLink || "");
      setStatus({ error: "", success: `Campaign processed. Reachable audience ${response.data.reachableCount}.` });
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to send campaign"), success: "" });
    }
  };

  const linkCoupon = async (campaignId, couponId) => {
    try {
      if (!couponId) {
        setStatus({ error: "Select a coupon before linking it.", success: "" });
        return;
      }
      await api.post(`/owner/campaigns/${campaignId}/link-coupon`, { couponId });
      setStatus({ error: "", success: "Coupon linked to campaign." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not link coupon"), success: "" });
    }
  };

  const uploadToCatalog = async (campaignId) => {
    try {
      await api.post(`/owner/campaigns/${campaignId}/upload-to-catalog`);
      setStatus({ error: "", success: "Campaign banner uploaded to catalog." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not upload campaign to catalog"), success: "" });
    }
  };

  const exportLogs = async (campaignId) => {
    try {
      await downloadFromApi(`/owner/campaigns/${campaignId}/logs/export.csv`, {
        params: {
          ...(logFilters.q ? { q: logFilters.q } : {}),
          ...(logFilters.eventType ? { eventType: logFilters.eventType } : {})
        },
        fallbackFilename: "campaign-logs.csv"
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not export campaign logs"), success: "" });
    }
  };

  const copyShareCaption = async () => {
    try {
      await navigator.clipboard.writeText(shareAssets.combinedText || "");
      setStatus({ error: "", success: "Campaign caption copied." });
    } catch {
      setStatus({ error: "Could not copy campaign caption.", success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Campaign Creator"
        description="Build WhatsApp, SMS, email, social, and catalog banner campaigns from real CRM filters."
        tabs={[
          { label: "Campaign List", to: "/admin/campaigns", hint: "History" },
          { label: "Create Campaign", to: "/admin/campaigns/create", hint: "New" }
        ]}
      />
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {lastShareLink && <div className="panel-card"><strong>Manual WhatsApp Share</strong><p className="muted">Use this generated link for manual dispatch.</p><div className="inline-actions"><a className="secondary-button" href={lastShareLink} target="_blank" rel="noreferrer">Open Share Link</a><button type="button" className="secondary-button" onClick={() => navigator.clipboard.writeText(lastShareLink)}>Copy Link</button></div></div>}

      {(isCreate || isEdit) && (
        <div className="panel-card">
          <h3>{isEdit ? "Edit Campaign" : "Create Campaign"}</h3>
          <form className="form-grid" onSubmit={save}>
            <label>
              <span className="muted">Campaign name</span>
              <input placeholder="Campaign name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span className="muted">WhatsApp</span>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="SOCIAL_BANNER">Social Banner</option>
              <option value="CATALOG_BANNER">Catalog Banner</option>
            </select>
            </label>
            <label>
              <span className="muted">Apply campaign template</span>
              <select defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">Apply campaign template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title || template.name} | {template.tier}
                </option>
              ))}
            </select>
            </label>
            <label>
              <span className="muted">Customers</span>
              <select value={form.audienceFilter} onChange={(event) => setForm((current) => ({ ...current, audienceFilter: event.target.value }))}>
              <option value="ALL_CUSTOMERS">All customers</option>
              <option value="BIRTHDAY_CUSTOMERS">Birthday customers</option>
              <option value="ANNIVERSARY_CUSTOMERS">Anniversary customers</option>
              <option value="LOST_CUSTOMERS">Lost customers</option>
              <option value="HIGH_SPENDERS">High spenders</option>
              <option value="MEMBERSHIP_CUSTOMERS">Membership customers</option>
              <option value="PACKAGE_CUSTOMERS">Package customers</option>
              <option value="SERVICE_BASED_CUSTOMERS">Service-based customers</option>
              <option value="CRM_SEGMENT">Saved CRM segment</option>
            </select>
            </label>
            {form.audienceFilter === "SERVICE_BASED_CUSTOMERS" ? (
              <label>
              <span className="muted">Service</span>
              <select value={form.audienceMeta?.serviceId || ""} onChange={(event) => setForm((current) => ({ ...current, audienceMeta: { ...(current.audienceMeta || {}), serviceId: event.target.value } }))}>
                <option value="">Select service</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </label>
            ) : form.audienceFilter === "CRM_SEGMENT" ? (
              <label>
                <span className="muted">Saved segment</span>
                <select value={form.audienceMeta?.segmentId || ""} onChange={(event) => setForm((current) => ({ ...current, audienceMeta: { ...(current.audienceMeta || {}), segmentId: event.target.value } }))}>
                  <option value="">Select saved segment</option>
                  {savedSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} {segment.filterType ? `| ${segment.filterType.replaceAll("_", " ")}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : <div className="summary-box"><strong>Audience source</strong><p className="item-meta">This filter will use live CRM, invoice, appointment, package, and membership data.</p></div>}
            <label><span className="muted">Scheduled For</span><input type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} /></label>
            <label>
              <span className="muted">Banner URL</span>
              <input placeholder="Banner URL" value={form.bannerUrl} onChange={(event) => setForm((current) => ({ ...current, bannerUrl: event.target.value }))} />
            </label>
            <textarea rows="6" placeholder="Campaign message" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
            <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
              <strong>Live Preview</strong>
              <div className="item-meta" style={{ marginTop: 8 }}>{form.type} | {form.audienceFilter}</div>
              <p style={{ marginTop: 8 }}>{form.message || "Campaign message preview will appear here."}</p>
              {form.bannerUrl ? <div className="item-meta">Banner: {form.bannerUrl}</div> : <div className="item-meta">No banner attached yet.</div>}
            </div>
            <button>{isEdit ? "Save Campaign" : "Create Campaign"}</button>
          </form>
        </div>
      )}

      {!isCreate && !isEdit && (
        <div className="settings-section-grid">
        <div className="panel-card">
          <h3>Campaign List</h3>
          {loading ? <PageLoader compact title="Loading campaigns" message="Preparing campaign history, templates, audience filters, and performance context." /> : null}
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              <span className="muted">Search name, message, type, or audience</span>
              <input value={filters.q} placeholder="Search name, message, type, or audience" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="SENT">Sent</option>
            </select>
            </label>
            <label>
              <span className="muted">Types</span>
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All types</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
              <option value="SOCIAL_BANNER">Social Banner</option>
              <option value="CATALOG_BANNER">Catalog Banner</option>
            </select>
            </label>
            <label>
              <span className="muted">Audiences</span>
              <select value={filters.audienceFilter} onChange={(event) => setFilters((current) => ({ ...current, audienceFilter: event.target.value }))}>
              <option value="">All audiences</option>
              <option value="ALL_CUSTOMERS">All customers</option>
              <option value="BIRTHDAY_CUSTOMERS">Birthday customers</option>
              <option value="ANNIVERSARY_CUSTOMERS">Anniversary customers</option>
              <option value="LOST_CUSTOMERS">Lost customers</option>
              <option value="HIGH_SPENDERS">High spenders</option>
              <option value="MEMBERSHIP_CUSTOMERS">Membership customers</option>
              <option value="PACKAGE_CUSTOMERS">Package customers</option>
              <option value="SERVICE_BASED_CUSTOMERS">Service-based customers</option>
              <option value="CRM_SEGMENT">Saved CRM segment</option>
            </select>
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "", type: "", audienceFilter: "" })}>Reset</button>
          </div>
          <div className="list-stack">
              {rows.map((row) => (
                <div key={row.id} className="list-item">
                  <div>
                    <strong>{row.name}</strong>
                    <div className="item-meta">{row.type} | {row.status} | {row.audienceFilter}</div>
                    <div className="item-meta">Audience count {row.audienceMeta?.audienceCount || 0}</div>
                  </div>
                  <div className="inline-actions">
                    <Link className="secondary-button" to={`/admin/campaigns/${row.id}`}>Open</Link>
                    <Link className="secondary-button" to={`/admin/campaigns/${row.id}/edit`}>Edit</Link>
                    <Link className="secondary-button" to={`/admin/campaigns/${row.id}/logs`}>Logs</Link>
                    <button type="button" onClick={() => duplicate(row.id)}>Duplicate</button>
                    <button type="button" onClick={() => schedule(row.id)}>Schedule</button>
                    <button type="button" onClick={() => sendPlaceholder(row.id)}>Send Placeholder</button>
                  </div>
                </div>
              ))}
              {!loading && !rows.length && <EmptyState title="No campaigns found" message="No campaigns match the current filters yet. Create one to start your outreach workflow." />}
            </div>
          </div>
          <div className="panel-card">
            <h3>{isLogs ? "Campaign Logs" : "Campaign Detail"}</h3>
            {!detail && <EmptyState title="Open a campaign" message="Select any campaign to inspect ROI, audience preview, conversions, and delivery logs." />}
            {detail && (
              <>
                <strong>{detail.name}</strong>
                <div className="item-meta">{detail.type} | {detail.status}</div>
                <div className="item-meta">Reachable audience {detail.reachableAudienceCount ?? detail.audienceMeta?.audienceCount ?? 0} / Matched {detail.audienceMeta?.audienceCount || 0}</div>
                <p>{detail.message || "No message body"}</p>
                <div className="three-col" style={{ marginTop: 16 }}>
                  <div className="summary-box">
                    <strong>Performance</strong>
                    <p className="item-meta" style={{ marginTop: 8 }}>Sent {campaignInsights.performance?.sentCount ?? 0}</p>
                    <p className="item-meta">Conversions {campaignInsights.performance?.conversionCount ?? 0}</p>
                  </div>
                  <div className="summary-box">
                    <strong>ROI Snapshot</strong>
                    <p className="item-meta" style={{ marginTop: 8 }}>Revenue {Number(campaignInsights.roi?.revenue || 0).toFixed(2)}</p>
                    <p className="item-meta">ROI {Number(campaignInsights.roi?.roi || 0).toFixed(2)}</p>
                  </div>
                  <div className="summary-box">
                    <strong>Audience Reach</strong>
                    <p className="item-meta" style={{ marginTop: 8 }}>Rows {campaignInsights.audience?.total ?? 0}</p>
                    <p className="item-meta">Preview {detail.audiencePreview?.length || 0}</p>
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <label>
              <span className="muted">Link coupon to campaign</span>
              <select defaultValue={detail.linkedCouponId || ""} onChange={(event) => linkCoupon(detail.id, event.target.value)}>
                    <option value="">Link coupon to campaign</option>
                    {coupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.code} - {coupon.title}</option>)}
                  </select>
            </label>
                  <button type="button" className="secondary-button" onClick={() => uploadToCatalog(detail.id)}>Upload Banner To Catalog</button>
                </div>
                {detail.unreachablePreview?.length ? (
                  <div className="summary-box" style={{ marginTop: 16 }}>
                    <strong>Skipped Customers</strong>
                    <div className="list-stack" style={{ marginTop: 10 }}>
                      {detail.unreachablePreview.map((customer) => (
                        <div key={customer.id} className="list-item">
                          <strong>{customer.name}</strong>
                          <div className="item-meta">{customer.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="summary-box" style={{ marginTop: 16 }}>
                  <strong>Audience Preview</strong>
                  <div className="list-stack" style={{ marginTop: 10 }}>
                    {(detail.audiencePreview || []).map((customer) => (
                      <div key={customer.id} className="list-item">
                        <strong>{customer.name}</strong>
                        <div className="item-meta">{customer.phone || "No phone"} | {customer.email || "No email"}</div>
                      </div>
                    ))}
                    {!(detail.audiencePreview || []).length && <EmptyState title="No matching audience yet" message="This campaign currently has no matching customers for its selected audience rule." />}
                  </div>
                </div>
                <div className="summary-box" style={{ marginTop: 16 }}>
                  <strong>Conversions</strong>
                  <div className="list-stack" style={{ marginTop: 10 }}>
                    {campaignInsights.conversions.map((conversion) => (
                      <div key={conversion.id} className="list-item">
                        <strong>{conversion.customer?.name || "Customer"}</strong>
                        <div className="item-meta">
                          Revenue {Number(conversion.revenueAmount || 0).toFixed(2)}
                          {" | "}
                          {conversion.invoice?.invoiceNumber || conversion.order?.orderNumber || "No linked record"}
                        </div>
                      </div>
                    ))}
                    {!campaignInsights.conversions.length && <EmptyState title="No conversions yet" message="Once campaign activity leads to orders or invoices, conversion rows will appear here." />}
                  </div>
                </div>
                <div className="summary-box" style={{ marginTop: 16 }}>
                  <strong>Social Share Pack</strong>
                  <p className="item-meta" style={{ marginTop: 8 }}>Use the campaign caption and banner to publish quickly across WhatsApp, Facebook, LinkedIn, and X.</p>
                  <div className="inline-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
                    <button type="button" className="secondary-button" onClick={copyShareCaption}>Copy Caption</button>
                    {shareAssets.whatsapp ? <a className="secondary-button" href={shareAssets.whatsapp} target="_blank" rel="noreferrer">Share on WhatsApp</a> : null}
                    {shareAssets.facebook ? <a className="secondary-button" href={shareAssets.facebook} target="_blank" rel="noreferrer">Share on Facebook</a> : null}
                    {shareAssets.linkedin ? <a className="secondary-button" href={shareAssets.linkedin} target="_blank" rel="noreferrer">Share on LinkedIn</a> : null}
                    {shareAssets.x ? <a className="secondary-button" href={shareAssets.x} target="_blank" rel="noreferrer">Share on X</a> : null}
                  </div>
                  <div className="form-grid" style={{ marginTop: 14 }}>
                    <textarea rows="4" readOnly value={shareAssets.combinedText} />
                    <input readOnly value={shareAssets.bannerUrl || "No campaign banner URL attached"} />
                  </div>
                </div>
                <div className="item-head" style={{ marginTop: 16 }}>
                  <h4>Logs</h4>
                  <button type="button" className="secondary-button" onClick={() => exportLogs(detail.id)}>Export CSV</button>
                </div>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  <label>
              <span className="muted">Search log details</span>
              <input value={logFilters.q} placeholder="Search log details" onChange={(event) => setLogFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
                  <label>
              <span className="muted">Filter by event type</span>
              <input value={logFilters.eventType} placeholder="Filter by event type" onChange={(event) => setLogFilters((current) => ({ ...current, eventType: event.target.value }))} />
            </label>
                  <button type="button" className="secondary-button" onClick={() => setLogFilters({ q: "", eventType: "" })}>Reset</button>
                </div>
                <div className="list-stack">
                  {(isLogs ? campaignLogs : detail.logs || []).map((row) => <div key={row.id} className="list-item"><strong>{row.eventType}</strong><div className="item-meta">{row.details || "No detail"} | {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</div></div>)}
                  {!(isLogs ? campaignLogs : detail.logs || []).length && <EmptyState title="No campaign logs yet" message="Processing, scheduling, send, and engagement events will land here once activity starts." />}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
