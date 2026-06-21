import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });

  const [catInput, setCatInput] = useState("");
  const [editingCatId, setEditingCatId] = useState("");
  const [subInput, setSubInput] = useState("");
  const [editingSubId, setEditingSubId] = useState("");
  const [svcSearch, setSvcSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/owner/service-categories");
      setCategories(res.data);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to load"), success: "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selectedCat) {
      const fresh = categories.find(c => c.id === selectedCat.id);
      if (fresh) setSelectedCat(fresh);
    }
    if (selectedSub) {
      for (const c of categories) {
        const s = (c.children || []).find(ch => ch.id === selectedSub.id);
        if (s) { setSelectedSub(s); return; }
      }
    }
  }, [categories]);

  const addCategory = async () => {
    if (!catInput.trim() || catInput.trim().length < 2) return;
    setStatus({ error: "", success: "" });
    try {
      if (editingCatId) {
        await api.patch(`/owner/service-categories/${editingCatId}`, { name: catInput.trim() });
        setStatus({ error: "", success: "Category updated." });
      } else {
        await api.post("/owner/service-categories", { name: catInput.trim() });
        setStatus({ error: "", success: "Category added." });
      }
      setCatInput(""); setEditingCatId("");
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not save category"), success: "" });
    }
  };

  const archiveCategory = async (id) => {
    await api.patch(`/owner/service-categories/${id}/archive`);
    if (selectedCat?.id === id) { setSelectedCat(null); setSelectedSub(null); }
    if (editingCatId === id) { setEditingCatId(""); setCatInput(""); }
    await load();
  };

  const addSubcategory = async () => {
    if (!subInput.trim() || subInput.trim().length < 2 || !selectedCat) return;
    setStatus({ error: "", success: "" });
    try {
      if (editingSubId) {
        await api.patch(`/owner/service-categories/${editingSubId}`, { name: subInput.trim() });
        setStatus({ error: "", success: "Subcategory updated." });
      } else {
        await api.post("/owner/service-categories", { name: subInput.trim(), parentId: selectedCat.id });
        setStatus({ error: "", success: "Subcategory added." });
      }
      setSubInput(""); setEditingSubId("");
      await load();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not save subcategory"), success: "" });
    }
  };

  const archiveSubcategory = async (id) => {
    await api.patch(`/owner/service-categories/${id}/archive`);
    if (selectedSub?.id === id) setSelectedSub(null);
    if (editingSubId === id) { setEditingSubId(""); setSubInput(""); }
    await load();
  };

  const subcategories = selectedCat ? (categories.find(c => c.id === selectedCat.id)?.children || []) : [];
  const items = selectedSub
    ? (selectedSub.services || []).filter(s => s.name.toLowerCase().includes(svcSearch.toLowerCase()))
    : [];

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Service Categories</h1>
            <p style={{ marginBottom: 0 }}>Organize your services with categories and subcategories.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Categories {categories.length}</span>
            {selectedCat && <span className="badge">{selectedCat.name}</span>}
            {selectedSub && <span className="badge">{selectedSub.name}</span>}
          </div>
        </div>
      </div>

      {status.error && <div style={{ padding: "8px 16px", marginBottom: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>{status.error}</div>}
      {status.success && <div style={{ padding: "8px 16px", marginBottom: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#16a34a", fontSize: 13 }}>{status.success}</div>}

      {loading ? <PageLoader title="Loading categories" message="Preparing service taxonomy." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 280px 1fr", gap: 0, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", minHeight: 500 }}>

          {/* Column 1: Categories */}
          <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#2563eb", fontSize: 14, textAlign: "center" }}>Categories</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div
                onClick={() => { setSelectedCat(null); setSelectedSub(null); setCatInput(""); setEditingCatId(""); }}
                style={{ padding: "10px 16px", cursor: "pointer", background: !selectedCat ? "#e0e7ff" : "transparent", fontWeight: !selectedCat ? 600 : 400, color: !selectedCat ? "#3730a3" : "#334155", fontSize: 14, borderBottom: "1px solid #f1f5f9" }}
              >All</div>
              {categories.map(cat => (
                <div key={cat.id} onClick={() => { setSelectedCat(cat); setSelectedSub(null); setEditingCatId(""); setEditingSubId(""); setSubInput(""); }} style={{ padding: "10px 16px", cursor: "pointer", background: selectedCat?.id === cat.id ? "#e0e7ff" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span style={{ fontWeight: selectedCat?.id === cat.id ? 600 : 400, color: selectedCat?.id === cat.id ? "#3730a3" : "#334155" }}>{cat.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setCatInput(cat.name); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }} title="Edit">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); archiveCategory(cat.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2 }} title="Archive">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 6 }}>
              <input value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder="New category..." style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
              <button onClick={addCategory} style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New</button>
            </div>
          </div>

          {/* Column 2: Subcategories */}
          <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#2563eb", fontSize: 14, textAlign: "center" }}>
              {selectedCat ? `${selectedCat.name}/` : "Select a category"}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {!selectedCat ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Select a category first</div>
              ) : subcategories.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No subcategories yet</div>
              ) : subcategories.map(sub => (
                <div key={sub.id} onClick={() => { setSelectedSub(sub); setEditingSubId(""); setSubInput(""); }} style={{ padding: "10px 16px", cursor: "pointer", background: selectedSub?.id === sub.id ? "#e0e7ff" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span style={{ fontWeight: selectedSub?.id === sub.id ? 600 : 400, color: selectedSub?.id === sub.id ? "#3730a3" : "#334155" }}>{sub.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingSubId(sub.id); setSubInput(sub.name); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }} title="Edit">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); archiveSubcategory(sub.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2 }} title="Archive">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 6 }}>
              <input value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubcategory()} placeholder="New subcategory..." disabled={!selectedCat} style={{ flex: 1, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, opacity: selectedCat ? 1 : 0.5 }} />
              <button onClick={addSubcategory} disabled={!selectedCat} style={{ padding: "6px 12px", background: selectedCat ? "#2563eb" : "#94a3b8", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: selectedCat ? "pointer" : "not-allowed" }}>+ New</button>
            </div>
          </div>

          {/* Column 3: Items / Services */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#2563eb", fontSize: 14, textAlign: "center" }}>
              {selectedSub ? `${selectedCat?.name}/${selectedSub.name}/Items` : "Select a subcategory"}
              <div style={{ float: "right", display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Import
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const res = await api.post("/owner/service-categories/import", formData, {
                          headers: { "Content-Type": "multipart/form-data" }
                        });
                        alert(res.data.message);
                        await load();
                      } catch (error) {
                        alert(formatApiError(error, "Could not import service categories"));
                      }
                    }}
                  />
                </label>
                <button
                  onClick={async () => {
                    try {
                      await downloadFromApi("/owner/service-categories/export", { fallbackFilename: "ServiceCategories.csv" });
                    } catch (error) {
                      alert("Could not export service categories");
                    }
                  }}
                  style={{ padding: "4px 12px", background: "#f8fafc", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Export
                </button>
              </div>
            </div>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #e2e8f0" }}>
              <input placeholder="Search Items" value={svcSearch} onChange={e => setSvcSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {!selectedSub ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Select a subcategory first</div>
              ) : items.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{svcSearch ? "No matching items" : "No items in this subcategory"}</div>
              ) : items.map(svc => (
                <div key={svc.id} style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                  <span style={{ color: "#334155" }}>{svc.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 600, color: "#334155" }}>₹ {Number(svc.price || 0)}</span>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }} title="Edit">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
