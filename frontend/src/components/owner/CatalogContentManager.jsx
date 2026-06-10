import { useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";

const emptyBanner = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true
};

const emptyOffer = {
  title: "",
  description: "",
  imageUrl: "",
  ctaLabel: "",
  ctaUrl: "",
  branchId: "",
  startsAt: "",
  endsAt: "",
  isActive: true
};

export default function CatalogContentManager({ type, rows, branches, onReload, onStatus }) {
  const isBanner = type === "banners";
  const [form, setForm] = useState(isBanner ? emptyBanner : emptyOffer);
  const [editingId, setEditingId] = useState("");

  const save = async (event) => {
    event.preventDefault();
    try {
      const endpoint = isBanner ? "/owner/catalog/banners" : "/owner/catalog/offers";
      const payload = isBanner
        ? { ...form, sortOrder: Number(form.sortOrder || 0) }
        : {
            ...form,
            branchId: form.branchId || null,
            startsAt: form.startsAt || undefined,
            endsAt: form.endsAt || undefined
          };
      if (editingId) {
        await api.patch(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setForm(isBanner ? emptyBanner : emptyOffer);
      setEditingId("");
      onStatus({ error: "", success: `${isBanner ? "Banner" : "Offer"} saved.` });
      await onReload();
    } catch (error) {
      onStatus({ error: formatApiError(error, `Could not save ${isBanner ? "banner" : "offer"}`), success: "" });
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm(
      isBanner
        ? {
            title: row.title || "",
            subtitle: row.subtitle || "",
            imageUrl: row.imageUrl || "",
            linkUrl: row.linkUrl || "",
            sortOrder: row.sortOrder || 0,
            isActive: row.isActive !== false
          }
        : {
            title: row.title || "",
            description: row.description || "",
            imageUrl: row.imageUrl || "",
            ctaLabel: row.ctaLabel || "",
            ctaUrl: row.ctaUrl || "",
            branchId: row.branchId || "",
            startsAt: row.startsAt ? new Date(row.startsAt).toISOString().slice(0, 16) : "",
            endsAt: row.endsAt ? new Date(row.endsAt).toISOString().slice(0, 16) : "",
            isActive: row.isActive !== false
          }
    );
  };

  const remove = async (id) => {
    try {
      const endpoint = isBanner ? "/owner/catalog/banners" : "/owner/catalog/offers";
      await api.delete(`${endpoint}/${id}`);
      onStatus({ error: "", success: `${isBanner ? "Banner" : "Offer"} deleted.` });
      await onReload();
    } catch (error) {
      onStatus({ error: formatApiError(error, `Could not delete ${isBanner ? "banner" : "offer"}`), success: "" });
    }
  };

  return (
    <div className="two-col">
      <div className="panel-card">
        <h3>{isBanner ? "Banner Form" : "Offer Form"}</h3>
        <form className="form-grid" onSubmit={save}>
          <input placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          {isBanner ? (
            <>
              <input placeholder="Subtitle" value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} />
              <input placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
              <input placeholder="Link URL" value={form.linkUrl} onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))} />
              <input type="number" min="0" placeholder="Sort order" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            </>
          ) : (
            <>
              <textarea rows="4" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              <input placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} />
              <input placeholder="CTA Label" value={form.ctaLabel} onChange={(event) => setForm((current) => ({ ...current, ctaLabel: event.target.value }))} />
              <input placeholder="CTA URL" value={form.ctaUrl} onChange={(event) => setForm((current) => ({ ...current, ctaUrl: event.target.value }))} />
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
                <option value="">All branches</option>
                {(branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
              <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
              <input type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
            </>
          )}
          <label className="badge">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active
          </label>
          <div className="inline-actions">
            <button>{editingId ? `Update ${isBanner ? "Banner" : "Offer"}` : `Create ${isBanner ? "Banner" : "Offer"}`}</button>
            {editingId ? <button type="button" className="secondary-button" onClick={() => { setEditingId(""); setForm(isBanner ? emptyBanner : emptyOffer); }}>Cancel Edit</button> : null}
          </div>
        </form>
      </div>

      <div className="panel-card">
        <h3>{isBanner ? "Banners" : "Offers"}</h3>
        <div className="list-stack">
          {rows.map((row) => (
            <div key={row.id} className="list-item">
              <div>
                <strong>{row.title}</strong>
                <div className="item-meta">
                  {isBanner ? (row.subtitle || "No subtitle") : (row.description || "No description")}
                </div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(row)}>Edit</button>
                <button type="button" className="danger-button" onClick={() => remove(row.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!rows.length && <p className="muted">Nothing added yet.</p>}
        </div>
      </div>
    </div>
  );
}
