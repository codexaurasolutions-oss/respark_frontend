import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

export default function ServiceCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows((await api.get("/owner/service-categories")).data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/owner/service-categories").then((response) => {
      if (active) {
        setRows(response.data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      if (editingId) {
        await api.patch(`/owner/service-categories/${editingId}`, { name });
        setStatus({ error: "", success: "Category updated." });
      } else {
        await api.post("/owner/service-categories", { name });
        setStatus({ error: "", success: "Category added." });
      }
      setName("");
      setEditingId("");
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save category"), success: "" });
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setName(row.name);
  };

  const archiveCategory = async (categoryId) => {
    await api.patch(`/owner/service-categories/${categoryId}/archive`);
    if (editingId === categoryId) {
      setEditingId("");
      setName("");
    }
    await load();
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Service Categories</h1>
            <p style={{ marginBottom: 0 }}>Keep service taxonomy tidy so booking, catalog, and reporting surfaces stay organized as the salon grows.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Categories {rows.length}</span>
            <span className="badge">{editingId ? "Editing" : "Ready"}</span>
          </div>
        </div>
      </div>
      <div className="two-col">
        <div className="panel-card">
          <h3>{editingId ? "Update Category" : "Add Category"}</h3>
          <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label>
              <span className="muted">Category name</span>
              <input value={name} placeholder="Category name" onChange={(event) => setName(event.target.value)} />
            </label>
            <button>{editingId ? "Save" : "Add Category"}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(""); setName(""); }}>Cancel</button>}
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
        <div className="panel-card">
          <h3>Category Purpose</h3>
          <p className="muted">Categories keep the service catalog organized for the owner panel today and public/booking surfaces later.</p>
        </div>
      </div>

      {loading ? <PageLoader title="Loading service categories" message="Preparing the current service taxonomy and editing state." /> : (
        <div className="list-stack" style={{ marginTop: 18 }}>
          {rows.map((row) => (
            <div key={row.id} className={`list-card ${editingId === row.id ? "active-row" : ""}`}>
              <div className="item-head">
                <div>
                  <strong>{row.name}</strong>
                  <div className="item-meta">Created {new Date(row.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="inline-actions">
                  <button type="button" className="secondary-button" onClick={() => startEdit(row)}>Edit</button>
                  <button type="button" className="danger-button" onClick={() => archiveCategory(row.id)}>Archive</button>
                </div>
              </div>
            </div>
          ))}
          {!rows.length && <EmptyState title="No categories yet" message="Create the first category to organize service listings across booking, catalog, and internal operations." />}
        </div>
      )}
    </div>
  );
}

