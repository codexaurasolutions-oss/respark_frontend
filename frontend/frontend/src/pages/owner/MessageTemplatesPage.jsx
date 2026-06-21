/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function MessageTemplatesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [preview, setPreview] = useState("");
  const [previewMeta, setPreviewMeta] = useState({ whatsappLink: "", variables: {} });
  const [previewInput, setPreviewInput] = useState({
    phone: "",
    customerId: "",
    appointmentId: "",
    invoiceId: "",
    orderId: "",
    customerMembershipId: "",
    customerPackageId: ""
  });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const isEdit = location.pathname.endsWith("/edit");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/owner/message-templates");
      setRows(response.data || []);
      if (params.type) {
        const detailResponse = await api.get(`/owner/message-templates/${params.type}`);
        setDetail(detailResponse.data);
        setForm({ title: detailResponse.data.title || "", content: detailResponse.data.content || "" });
      } else {
        setDetail(null);
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load message templates"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [params.type]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.patch(`/owner/message-templates/${params.type}`, form);
      setStatus({ error: "", success: "Template saved." });
      navigate(`/admin/message-templates/${params.type}`);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save template"), success: "" });
    }
  };

  const loadPreview = async () => {
    try {
      const response = await api.post(`/owner/message-templates/${params.type}/preview`, previewInput);
      setPreview(response.data.preview || "");
      setPreviewMeta({
        whatsappLink: response.data.whatsappLink || "",
        variables: response.data.variables || {}
      });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not generate preview"), success: "" });
    }
  };

  const resetTemplate = async () => {
    try {
      await api.post(`/owner/message-templates/${params.type}/reset`);
      setStatus({ error: "", success: "Template reset to default." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not reset template"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Message Templates"
        description="Salon-scoped editable templates with variable preview and WhatsApp-safe generation."
        tabs={[
          { label: "Template List", to: "/admin/message-templates", hint: "Library" },
          ...(params.type ? [
            { label: "Template Detail", to: `/admin/message-templates/${params.type}`, hint: "Open" },
            { label: "Edit Template", to: `/admin/message-templates/${params.type}/edit`, hint: "Modify" }
          ] : [])
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Message Templates</h1>
            <p style={{ marginBottom: 0 }}>Keep reusable customer communication templates editable, previewable, and ready for WhatsApp-safe output.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Templates {rows.length}</span>
            <span className="badge">{params.type ? "Focused Template" : "Library"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading message templates" message="Preparing the template library, preview context, and editable communication blocks." />}

      {!loading && !params.type && <div className="panel-card"><div className="list-stack">{rows.map((row) => <div key={row.id} className="list-item"><div><strong>{row.title}</strong><div className="item-meta">{row.type}</div></div><div className="inline-actions"><Link className="secondary-button" to={`/admin/message-templates/${row.type}`}>Open</Link><Link className="secondary-button" to={`/admin/message-templates/${row.type}/edit`}>Edit</Link></div></div>)}{!rows.length && <EmptyState title="No message templates found" message="The template library will appear here once salon-scoped template records are available." />}</div></div>}

      {!loading && params.type && !isEdit && detail && (
        <div className="two-col">
          <div className="panel-card">
            <h3>{detail.title}</h3>
            <div className="item-meta">{detail.type}</div>
            <pre style={{ whiteSpace: "pre-wrap" }}>{detail.content}</pre>
            <div className="badge-row" style={{ marginTop: 12 }}>
              {(detail.variables || []).map((variable) => <span key={variable} className="badge">{variable}</span>)}
            </div>
            <div className="inline-actions" style={{ marginTop: 16 }}>
              <button type="button" onClick={loadPreview}>Generate Preview</button>
              <button type="button" className="secondary-button" onClick={resetTemplate}>Reset Default</button>
            </div>
          </div>
          <div className="panel-card">
            <h3>Preview Context</h3>
            <div className="form-grid">
              <label>
              <span className="muted">Phone override (optional)</span>
              <input placeholder="Phone override (optional)" value={previewInput.phone} onChange={(event) => setPreviewInput((current) => ({ ...current, phone: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Customer ID</span>
              <input placeholder="Customer ID" value={previewInput.customerId} onChange={(event) => setPreviewInput((current) => ({ ...current, customerId: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Appointment ID</span>
              <input placeholder="Appointment ID" value={previewInput.appointmentId} onChange={(event) => setPreviewInput((current) => ({ ...current, appointmentId: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Invoice ID</span>
              <input placeholder="Invoice ID" value={previewInput.invoiceId} onChange={(event) => setPreviewInput((current) => ({ ...current, invoiceId: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Order ID</span>
              <input placeholder="Order ID" value={previewInput.orderId} onChange={(event) => setPreviewInput((current) => ({ ...current, orderId: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Customer Membership ID</span>
              <input placeholder="Customer Membership ID" value={previewInput.customerMembershipId} onChange={(event) => setPreviewInput((current) => ({ ...current, customerMembershipId: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Customer Package ID</span>
              <input placeholder="Customer Package ID" value={previewInput.customerPackageId} onChange={(event) => setPreviewInput((current) => ({ ...current, customerPackageId: event.target.value }))} />
            </label>
            </div>
            {preview ? <div className="summary-box" style={{ marginTop: 16 }}><strong>Preview Output</strong><p style={{ marginBottom: 12 }}>{preview}</p>{previewMeta.whatsappLink ? <div className="inline-actions"><a className="secondary-button" href={previewMeta.whatsappLink} target="_blank" rel="noreferrer">Open WhatsApp Link</a><button type="button" className="secondary-button" onClick={() => navigator.clipboard.writeText(previewMeta.whatsappLink)}>Copy Share Link</button></div> : null}</div> : <p className="muted" style={{ marginTop: 16 }}>Generate a preview with live IDs to test variable replacement.</p>}
            {Object.keys(previewMeta.variables || {}).length ? <div className="summary-box" style={{ marginTop: 16 }}><strong>Resolved Variables</strong><div className="list-stack" style={{ marginTop: 10 }}>{Object.entries(previewMeta.variables).map(([key, value]) => <div key={key} className="list-item"><strong>{key}</strong><div className="item-meta">{String(value ?? "")}</div></div>)}</div></div> : null}
          </div>
        </div>
      )}
      {!loading && params.type && isEdit && <div className="panel-card"><h3>Edit Template</h3><form className="form-grid" onSubmit={save}><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /><textarea rows="8" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} /><button>Save Template</button></form></div>}
    </div>
  );
}
