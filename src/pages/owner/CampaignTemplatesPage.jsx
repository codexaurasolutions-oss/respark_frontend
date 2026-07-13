/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

const emptyForm = {
  name: "",
  title: "",
  tier: "FREE",
  category: "",
  backgroundColor: "var(--button-bg-solid, #0f766e)",
  textColor: "#ffffff",
  offerText: "",
  logoUrl: "",
  imageUrl: "",
  layoutJson: "{}",
  isActive: true
};

export default function CampaignTemplatesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const isEdit = location.pathname.endsWith("/edit");
  const selectedTemplate = useMemo(
    () => rows.find((row) => row.id === params.id) || null,
    [rows, params.id]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/owner/campaign-templates");
      setRows(response.data || []);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load campaign templates"), success: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isEdit && selectedTemplate) {
      setForm({
        name: selectedTemplate.name || "",
        title: selectedTemplate.title || "",
        tier: selectedTemplate.tier || "FREE",
        category: selectedTemplate.category || "",
        backgroundColor: selectedTemplate.backgroundColor || "#0f766e",
        textColor: selectedTemplate.textColor || "#ffffff",
        offerText: selectedTemplate.offerText || "",
        logoUrl: selectedTemplate.logoUrl || "",
        imageUrl: selectedTemplate.imageUrl || "",
        layoutJson: selectedTemplate.layoutJson ? JSON.stringify(selectedTemplate.layoutJson, null, 2) : "{}",
        isActive: selectedTemplate.isActive ?? true
      });
    } else if (!isEdit) {
      setForm(emptyForm);
    }
  }, [isEdit, selectedTemplate]);

  const save = async (event) => {
    event.preventDefault();
    try {
      let layoutJson = {};
      try {
        layoutJson = form.layoutJson ? JSON.parse(form.layoutJson) : {};
      } catch {
        setStatus({ error: "Layout JSON must be valid JSON.", success: "" });
        return;
      }
      const payload = {
        ...form,
        category: form.category || undefined,
        offerText: form.offerText || undefined,
        logoUrl: form.logoUrl || undefined,
        imageUrl: form.imageUrl || undefined,
        layoutJson
      };
      if (isEdit && params.id) await api.patch(`/owner/campaign-templates/${params.id}`, payload);
      else await api.post("/owner/campaign-templates", payload);
      setStatus({ error: "", success: isEdit ? "Campaign template updated." : "Campaign template created." });
      navigate("/admin/campaign-templates");
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save campaign template"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Campaign Templates"
        description="Manage reusable banner and campaign template blocks for catalog and campaign workflows."
        tabs={[
          { label: "Template Library", to: "/admin/campaign-templates", hint: "All" },
          { label: "Create Template", to: "/admin/campaign-templates/create", hint: "New" },
          ...(params.id ? [{ label: "Edit Template", to: `/admin/campaign-templates/${params.id}/edit`, hint: "Modify" }] : [])
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Campaign Templates</h1>
            <p style={{ marginBottom: 0 }}>Keep reusable promotional layouts, brand styles, and offer-ready blocks organized in one template library.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Templates {rows.length}</span>
            <span className="badge">Editing {isEdit ? "Active" : "Library"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading campaign templates" message="Preparing reusable campaign cards, brand styles, and editing context." />}

      {!loading && (location.pathname.endsWith("/create") || isEdit) ? (
        <div className="panel-card">
          <h3>{isEdit ? "Edit Campaign Template" : "Create Campaign Template"}</h3>
          <form className="form-grid" onSubmit={save}>
            <input placeholder="Template name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Display title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            <select value={form.tier} onChange={(event) => setForm((current) => ({ ...current, tier: event.target.value }))}>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <input placeholder="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            <input placeholder="Background color" value={form.backgroundColor} onChange={(event) => setForm((current) => ({ ...current, backgroundColor: event.target.value }))} />
            <input placeholder="Text color" value={form.textColor} onChange={(event) => setForm((current) => ({ ...current, textColor: event.target.value }))} />
            <input placeholder="Offer text" value={form.offerText} onChange={(event) => setForm((current) => ({ ...current, offerText: event.target.value }))} />
            <input placeholder="Logo URL" value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} />
            <input placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
            <label className="badge"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Active template</label>
            
            <div className="summary-box" style={{ gridColumn: "1 / -1", background: form.backgroundColor, color: form.textColor }}>
              <strong>{form.title || "Preview Title"}</strong>
              <p style={{ marginTop: 8 }}>{form.offerText || "Offer text preview will appear here."}</p>
            </div>
            <button>{isEdit ? "Save Template" : "Create Template"}</button>
          </form>
        </div>
      ) : !loading ? (
        <div className="panel-card">
          <div className="item-head">
            <h3>Template Library</h3>
            <Link className="secondary-button" to="/admin/campaign-templates/create">Create Template</Link>
          </div>
          <div className="list-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {rows.map((row) => (
              <div key={row.id} className="list-item">
                <div>
                  <strong>{row.title}</strong>
                  <div className="item-meta">{row.name} | {row.tier} | {row.category || "General"}</div>
                  <div className="badge-row" style={{ marginTop: 10 }}>
                    <span className="badge">BG {row.backgroundColor || "-"}</span>
                    <span className="badge">Text {row.textColor || "-"}</span>
                    <span className={`badge ${row.isActive ? "" : "badge-cancelled"}`}>{row.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <div className="inline-actions">
                  <Link className="secondary-button" to={`/admin/campaign-templates/${row.id}/edit`}>Edit</Link>
                </div>
              </div>
            ))}
            {!rows.length && <EmptyState title="No campaign templates yet" message="Create your first reusable template to speed up future catalog and campaign launches." />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
