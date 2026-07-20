import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { downloadFromApi } from "../../utils/download";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useBranch } from "../../context/BranchContext";
import { formatApiError } from "../../utils/apiError";

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" }
];

const initialServiceForm = {
  name: "",
  branchId: "",
  gender: "UNISEX",
  price: 0,
  durationMin: 30,
  taxRate: 0,
  commissionPct: 0,
  onlineBookingEnabled: false,
  description: "",
  isFeatured: false,
  isPopular: false,
  consumables: []
};

function IconButton({ title, color = "#64748b", onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color,
        padding: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {children}
    </button>
  );
}

export default function ServiceCategoriesPage() {
  const { selectedBranchId } = useBranch();
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });

  const [catInput, setCatInput] = useState("");
  const [editingCatId, setEditingCatId] = useState("");
  const [subInput, setSubInput] = useState("");
  const [editingSubId, setEditingSubId] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceForm, setServiceForm] = useState(initialServiceForm);

  const setError = (message) => setStatus({ error: message, success: "" });
  const setSuccess = (message) => setStatus({ error: "", success: message });

  const load = async () => {
    setLoading(true);
    try {
      const [categoriesRes, branchesRes, productsRes] = await Promise.all([
        api.get("/owner/service-categories", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/branches"),
        api.get("/owner/inventory/products")
      ]);
      setCategories(categoriesRes.data || []);
      setBranches(branchesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      setError(formatApiError(err, "Failed to load service manager"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedBranchId]);

  // Strict client-side branch filter — only show categories belonging to selected branch
  const filteredCategories = useMemo(
    () => selectedBranchId
      ? categories.filter(cat => cat.branchId === selectedBranchId)
      : categories,
    [categories, selectedBranchId]
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.id === selectedCatId) || null,
    [filteredCategories, selectedCatId]
  );

  const subcategories = selectedCategory?.children || [];

  const selectedSubcategory = useMemo(
    () => subcategories.find((subcategory) => subcategory.id === selectedSubId) || null,
    [subcategories, selectedSubId]
  );

  const items = useMemo(() => {
    if (!selectedSubcategory) return [];
    const query = svcSearch.trim().toLowerCase();
    const services = selectedSubcategory.services || [];
    if (!query) return services;
    return services.filter((service) => {
      const haystack = [
        service.name,
        service.description,
        service.gender,
        service.branch?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [selectedSubcategory, svcSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubcategory, svcSearch]);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const currentItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const totalSubcategories = useMemo(
    () => filteredCategories.reduce((count, category) => count + (category.children?.length || 0), 0),
    [filteredCategories]
  );

  useEffect(() => {
    if (!selectedCatId || !filteredCategories.length) return;
    const freshCategory = filteredCategories.find((category) => category.id === selectedCatId);
    if (!freshCategory) {
      setSelectedCatId("");
      setSelectedSubId("");
      return;
    }
    if (selectedSubId) {
      const freshSub = (freshCategory.children || []).find((subcategory) => subcategory.id === selectedSubId);
      if (!freshSub) setSelectedSubId("");
    }
  }, [filteredCategories, selectedCatId, selectedSubId]);

  const resetServiceForm = (categoryId = selectedSubId || "") => {
    setEditingServiceId("");
    setServiceForm({ ...initialServiceForm, categoryId });
  };

  const openNewService = () => {
    if (!selectedSubId) {
      setError("First select a subcategory, then services can be added.");
      return;
    }
    setStatus({ error: "", success: "" });
    resetServiceForm(selectedSubId);
    setServiceModalOpen(true);
  };

  const startEditService = (service) => {
    setStatus({ error: "", success: "" });
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name || "",
      branchId: service.branchId || "",
      categoryId: service.categoryId || selectedSubId || "",
      gender: service.gender || "UNISEX",
      price: Number(service.price || 0),
      durationMin: Number(service.durationMin || 30),
      taxRate: Number(service.taxRate || 0),
      commissionPct: Number(service.commissionPct || 0),
      onlineBookingEnabled: Boolean(service.onlineBookingEnabled),
      description: service.description || "",
      imageUrl: service.imageUrl || "",
      isFeatured: Boolean(service.isFeatured),
      isPopular: Boolean(service.isPopular),
      consumables: (service.consumables || []).map(c => ({ productId: c.productId || c.product?.id || "", reqdQty: Number(c.reqdQty || 0), productName: c.product?.name || "" }))
    });
    setServiceModalOpen(true);
  };

  const addCategory = async () => {
    if (!catInput.trim() || catInput.trim().length < 2) {
      setError("Category name must be at least 2 characters.");
      return;
    }
    setStatus({ error: "", success: "" });
    try {
      if (editingCatId) {
        await api.patch(`/owner/service-categories/${editingCatId}`, { name: catInput.trim() });
        setSuccess("Category updated.");
      } else {
        await api.post("/owner/service-categories", { name: catInput.trim(), branchId: selectedBranchId || null });
        setSuccess("Category added.");
      }
      setCatInput("");
      setEditingCatId("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not save category"));
    }
  };

  const archiveCategory = async (id) => {
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/owner/service-categories/${id}/archive`);
      if (selectedCatId === id) {
        setSelectedCatId("");
        setSelectedSubId("");
      }
      if (editingCatId === id) {
        setEditingCatId("");
        setCatInput("");
      }
      setSuccess("Category archived.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not archive category"));
    }
  };

  const addSubcategory = async () => {
    if (!selectedCategory) {
      setError("First select a category.");
      return;
    }
    if (!subInput.trim() || subInput.trim().length < 2) {
      setError("Subcategory name must be at least 2 characters.");
      return;
    }
    setStatus({ error: "", success: "" });
    try {
      if (editingSubId) {
        await api.patch(`/owner/service-categories/${editingSubId}`, { name: subInput.trim() });
        setSuccess("Subcategory updated.");
      } else {
        await api.post("/owner/service-categories", { name: subInput.trim(), parentId: selectedCategory.id, branchId: selectedBranchId || null });
        setSuccess("Subcategory added.");
      }
      setSubInput("");
      setEditingSubId("");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not save subcategory"));
    }
  };

  const archiveSubcategory = async (id) => {
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/owner/service-categories/${id}/archive`);
      if (selectedSubId === id) {
        setSelectedSubId("");
      }
      if (editingSubId === id) {
        setEditingSubId("");
        setSubInput("");
      }
      setSuccess("Subcategory archived.");
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not archive subcategory"));
    }
  };

  const saveService = async (event) => {
    event.preventDefault();
    if (!serviceForm.name.trim()) {
      setError("Service name is required.");
      return;
    }
    if (!serviceForm.categoryId) {
      setError("Save the service under a subcategory.");
      return;
    }
    const payload = {
      name: serviceForm.name.trim(),
      branchId: serviceForm.branchId || undefined,
      categoryId: serviceForm.categoryId,
      gender: serviceForm.gender || "UNISEX",
      price: Number(serviceForm.price || 0),
      durationMin: Number(serviceForm.durationMin || 30),
      taxRate: Number(serviceForm.taxRate || 0),
      commissionPct: Number(serviceForm.commissionPct || 0),
      onlineBookingEnabled: Boolean(serviceForm.onlineBookingEnabled),
      description: serviceForm.description || undefined,
      imageUrl: serviceForm.imageUrl || undefined,
      isFeatured: Boolean(serviceForm.isFeatured),
      isPopular: Boolean(serviceForm.isPopular),
      consumables: (serviceForm.consumables || []).filter(c => c.productId).map(c => ({ productId: c.productId, reqdQty: Number(c.reqdQty) }))
    };
    setStatus({ error: "", success: "" });
    try {
      if (editingServiceId) {
        await api.patch(`/owner/services/${editingServiceId}`, payload);
        setSuccess("Service updated.");
      } else {
        await api.post("/owner/services", payload);
        setSuccess("Service created.");
      }
      setServiceModalOpen(false);
      resetServiceForm();
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not save service"));
    }
  };

  const archiveService = async (serviceId) => {
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/owner/services/${serviceId}/archive`);
      setSuccess("Service archived.");
      if (editingServiceId === serviceId) {
        setServiceModalOpen(false);
        resetServiceForm();
      }
      await load();
    } catch (err) {
      setError(formatApiError(err, "Could not archive service"));
    }
  };

  const handleExport = async () => {
    setStatus({ error: "", success: "" });
    try {
      setLoading(true);
      await downloadFromApi("/owner/service-categories/export", { fallbackFilename: `services_export_${new Date().toISOString().slice(0,10)}.csv` });
      setSuccess("Export downloaded successfully.");
    } catch (err) {
      setError(formatApiError(err, "Could not export services"));
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append("file", file);

      setStatus({ error: "", success: "" });
      setLoading(true);
      try {
        const response = await api.post("/owner/service-categories/import", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        setSuccess(response.data.message || "CSV imported successfully!");
        await load();
      } catch (err) {
        setError(formatApiError(err, "Could not import CSV"));
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  if (loading) {
    return <PageLoader title="Loading service catalog" message="Preparing categories, subcategories, and services." />;
  }

  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s" };
  const labelStyle = { display: "block", marginBottom: 6, fontWeight: 700, color: "#475569", fontSize: 13 };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Toast Notifications */}
      {status.error && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "#fef2f2", color: "#dc2626", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 99999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 12, fontWeight: 600, maxWidth: 380 }}>
          {status.error}
          <button onClick={() => setStatus({...status, error: ""})} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontWeight: 800, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}
      {status.success && (
        <div style={{ position: "fixed", top: 80, right: 24, background: "#ecfdf5", color: "#059669", padding: "12px 20px", borderRadius: 10, fontSize: 14, zIndex: 99999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
          ✓ {status.success}
          <button onClick={() => setStatus({...status, success: ""})} style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", fontWeight: 800, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Service Catalog</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Manage categories, subcategories and services</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
            {filteredCategories.length} Categories
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
            {totalSubcategories} Subcategories
          </span>
          {selectedSubcategory && <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "#fef3c7", color: "#d97706", border: "1px solid #fde68a" }}>
            {items.length} Services
          </span>}
        </div>
      </div>

      {/* Three-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 240px 1fr", height: "calc(100vh - 130px)", overflow: "hidden" }}>
        
        {/* Column 1 - Categories */}
        <div style={{ background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Categories</span>
            <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: 12, fontWeight: 600 }}>{filteredCategories.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {/* All */}
            <div
              onClick={() => { setSelectedCatId(""); setSelectedSubId(""); setEditingCatId(""); setCatInput(""); }}
              style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 10, background: !selectedCatId ? "#eff6ff" : "transparent", color: !selectedCatId ? "#1d4ed8" : "#475569", fontWeight: !selectedCatId ? 700 : 500, fontSize: 14, transition: "all 0.15s" }}
              onMouseEnter={e => { if(selectedCatId) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if(selectedCatId) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: !selectedCatId ? "#3b82f6" : "#cbd5e1", flexShrink: 0 }} />
              All Categories
            </div>
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => { setSelectedCatId(category.id); setSelectedSubId(""); setEditingCatId(""); setEditingSubId(""); setSubInput(""); }}
                style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: selectedCatId === category.id ? "#eff6ff" : "transparent", transition: "all 0.15s" }}
                onMouseEnter={e => {
                  if(selectedCatId !== category.id) e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.querySelector(".cat-actions").style.opacity = "1";
                }}
                onMouseLeave={e => {
                  if(selectedCatId !== category.id) e.currentTarget.style.background = "transparent";
                  e.currentTarget.querySelector(".cat-actions").style.opacity = "0";
                }}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ color: selectedCatId === category.id ? "#1d4ed8" : "#0f172a", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {category.name}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{(category.children || []).length} subcategories</div>
                </div>
                <div className="cat-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                  <button type="button" onClick={e => { e.stopPropagation(); setEditingCatId(category.id); setCatInput(category.name); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 4, display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background = "none"} title="Edit">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); archiveCategory(category.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 4, display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "none"} title="Delete">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", padding: "14px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder={editingCatId ? "Edit name..." : "New category..."} style={{ ...inputStyle, flex: 1, padding: "9px 12px", fontSize: 13 }} />
              <button type="button" onClick={addCategory} style={{ padding: "9px 14px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                {editingCatId ? "Save" : "+ Add"}
              </button>
            </div>
            {editingCatId && <button type="button" onClick={() => { setEditingCatId(""); setCatInput(""); }} style={{ marginTop: 6, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Cancel</button>}
          </div>
        </div>

        {/* Column 2 - Subcategories */}
        <div style={{ background: "#fdfdff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
              {selectedCategory ? selectedCategory.name : "Subcategories"}
            </span>
            {selectedCategory && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: 12, fontWeight: 600 }}>{subcategories.length}</span>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {!selectedCategory ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>←</div>
                <p style={{ margin: 0, fontSize: 13 }}>Select a category first</p>
              </div>
            ) : subcategories.length === 0 ? (
              <EmptyState title="No subcategories yet" message="Add a subcategory below to get started." />
            ) : (
              subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  onClick={() => { setSelectedSubId(subcategory.id); setEditingSubId(""); setSubInput(""); }}
                  style={{ padding: "10px 14px", borderRadius: 8, cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: selectedSubId === subcategory.id ? "#eff6ff" : "transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => {
                    if(selectedSubId !== subcategory.id) e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.querySelector(".sub-actions").style.opacity = "1";
                  }}
                  onMouseLeave={e => {
                    if(selectedSubId !== subcategory.id) e.currentTarget.style.background = "transparent";
                    e.currentTarget.querySelector(".sub-actions").style.opacity = "0";
                  }}
                >
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ color: selectedSubId === subcategory.id ? "#1d4ed8" : "#0f172a", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {subcategory.name}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{(subcategory.services || []).length} services</div>
                  </div>
                  <div className="sub-actions" style={{ display: "flex", gap: 2, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                    <button type="button" onClick={e => { e.stopPropagation(); setEditingSubId(subcategory.id); setSubInput(subcategory.name); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 4, display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background = "none"} title="Edit">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); archiveSubcategory(subcategory.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 4, display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "none"} title="Delete">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", padding: "14px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubcategory()} placeholder={editingSubId ? "Edit name..." : "New subcategory..."} disabled={!selectedCategory} style={{ ...inputStyle, flex: 1, padding: "9px 12px", fontSize: 13, opacity: selectedCategory ? 1 : 0.5 }} />
              <button type="button" onClick={addSubcategory} disabled={!selectedCategory} style={{ padding: "9px 14px", background: selectedCategory ? "#0f172a" : "#e2e8f0", color: selectedCategory ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, fontWeight: 700, cursor: selectedCategory ? "pointer" : "not-allowed", fontSize: 13, whiteSpace: "nowrap" }}>
                {editingSubId ? "Save" : "+ Add"}
              </button>
            </div>
            {editingSubId && <button type="button" onClick={() => { setEditingSubId(""); setSubInput(""); }} style={{ marginTop: 6, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Cancel</button>}
          </div>
        </div>

        {/* Column 3 - Services */}
        <div style={{ display: "flex", flexDirection: "column", background: "#f8fafc" }}>
          {/* Top bar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {selectedSubcategory ? `${selectedCategory?.name} / ${selectedSubcategory.name}` : "Services"}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={handleImportClick} style={{ padding: "7px 14px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Import CSV</button>
              <button type="button" onClick={handleExport} style={{ padding: "7px 14px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Export CSV</button>
              <button type="button" onClick={openNewService} style={{ padding: "7px 18px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ Add Service</button>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input placeholder="Search services..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 36, fontSize: 13 }} />
            </div>
          </div>

          {/* Service List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {!selectedSubcategory ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", gap: 12 }}>
                <div style={{ width: 64, height: 64, background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✂️</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#64748b" }}>Select a subcategory</p>
                <p style={{ margin: 0, fontSize: 13 }}>Choose from the left columns to view services</p>
              </div>
            ) : currentItems.length === 0 ? (
              <EmptyState title={svcSearch ? "No matching services" : "No services yet"} message={svcSearch ? "Clear the search and try again." : "Click '+ Add Service' to add the first service."} />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                  {currentItems.map((service) => (
                    <div
                      key={service.id}
                      style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.03)", transition: "box-shadow 0.2s, transform 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.07)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.03)"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{service.name}</span>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button type="button" onClick={() => startEditService(service)} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#475569", display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"} onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"} title="Edit">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button type="button" onClick={() => archiveService(service.id)} style={{ background: "#f1f5f9", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", color: "#ef4444", display: "flex", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"} title="Delete">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>₹{Number(service.price || 0)}</span>
                        <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{service.durationMin || 30} min</span>
                        <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{service.gender || "UNISEX"}</span>
                        {service.isFeatured && <span style={{ background: "#fef3c7", color: "#d97706", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>★ Featured</span>}
                        {service.onlineBookingEnabled && <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Online</span>}
                      </div>
                      {service.description && <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{service.description}</p>}
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                    <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ padding: "7px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}>← Prev</button>
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
                    <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ padding: "7px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {serviceModalOpen && (
        <div onClick={() => setServiceModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 9999 }}>
          <form onSubmit={saveService} onClick={e => e.stopPropagation()} style={{ width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 25px 60px rgba(15,23,42,0.3)", display: "flex", flexDirection: "column" }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{editingServiceId ? "✏️ Edit Service" : "✦ Create Service"}</span>
              <button type="button" onClick={() => setServiceModalOpen(false)} style={{ background: "#e2e8f0", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#cbd5e1"} onMouseLeave={e => e.currentTarget.style.background = "#e2e8f0"}>×</button>
            </div>

            {status.error && (
              <div style={{ margin: "16px 28px 0", padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
                {status.error}
              </div>
            )}

            <div style={{ padding: "24px 28px", display: "grid", gap: 20 }}>
              {/* Name + Branch */}
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Service Name *</label>
                  <input value={serviceForm.name} onChange={e => { setServiceForm(c => ({ ...c, name: e.target.value })); if (status.error) setStatus(c => ({ ...c, error: "" })); }} placeholder="e.g. Trendy Cut, Deep Cleanup..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Branch</label>
                  <select value={serviceForm.branchId} onChange={e => setServiceForm(c => ({ ...c, branchId: e.target.value }))} style={inputStyle}>
                    <option value="">Salon wide</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Subcategory + Gender */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Subcategory</label>
                  <input value={selectedSubcategory ? `${selectedCategory?.name} / ${selectedSubcategory.name}` : ""} disabled style={{ ...inputStyle, background: "#f8fafc", color: "#64748b" }} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select value={serviceForm.gender} onChange={e => setServiceForm(c => ({ ...c, gender: e.target.value }))} style={inputStyle}>
                    <option value="UNISEX">Unisex</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </div>
              </div>

              {/* Price + Duration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Price *</label>
                  <input type="number" min="0" value={serviceForm.price} onChange={e => setServiceForm(c => ({ ...c, price: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <select value={serviceForm.durationMin} onChange={e => setServiceForm(c => ({ ...c, durationMin: e.target.value }))} style={inputStyle}>
                    {DURATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Tax + Commission */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Tax Rate %</label>
                  <input type="number" min="0" value={serviceForm.taxRate} onChange={e => setServiceForm(c => ({ ...c, taxRate: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Commission %</label>
                  <input type="number" min="0" value={serviceForm.commissionPct} onChange={e => setServiceForm(c => ({ ...c, commissionPct: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} value={serviceForm.description} onChange={e => setServiceForm(c => ({ ...c, description: e.target.value }))} placeholder="Optional service notes..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {/* Consumables */}
              <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Consumables</label>
                  <button type="button" onClick={() => setServiceForm({...serviceForm, consumables: [...(serviceForm.consumables || []), { productId: "", reqdQty: 0, productName: "" }]})} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                </div>
                {(serviceForm.consumables || []).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      {idx === 0 && <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Product</label>}
                      <select value={item.productId} onChange={e => { const ni = [...serviceForm.consumables]; const prod = products.find(p => p.id === e.target.value); ni[idx] = {...ni[idx], productId: e.target.value, productName: prod?.name || ""}; setServiceForm({...serviceForm, consumables: ni}); }} style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }}>
                        <option value="">Select product</option>
                        {products.filter(p => p.isActive && p.productType === "CONSUMABLE").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      {idx === 0 && <label style={{ ...labelStyle, fontSize: 11, marginBottom: 4 }}>Qty</label>}
                      <input type="number" min="0" value={item.reqdQty} onChange={e => { const ni = [...serviceForm.consumables]; ni[idx] = {...ni[idx], reqdQty: e.target.value}; setServiceForm({...serviceForm, consumables: ni}); }} style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }} />
                    </div>
                    <button type="button" onClick={() => setServiceForm({...serviceForm, consumables: serviceForm.consumables.filter((_, i) => i !== idx)})} style={{ background: "#fee2e2", border: "none", borderRadius: 6, padding: "8px 10px", cursor: "pointer", color: "#dc2626", marginBottom: 0, display: "flex", alignItems: "center" }}>✕</button>
                  </div>
                ))}
                {!(serviceForm.consumables || []).length && <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No consumables added</p>}
              </div>

              {/* Service Image */}
              <div>
                <label style={labelStyle}>Service Image</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {serviceForm.imageUrl ? (
                    <div style={{ position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <img src={serviceForm.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={() => setServiceForm({...serviceForm, imageUrl: ""})} style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  ) : (
                    <label style={{ width: 80, height: 80, borderRadius: 10, border: "2px dashed #cbd5e1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: 11, gap: 4, transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"} onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}>
                      <span style={{ fontSize: 24 }}>+</span>
                      Add Image
                      <input type="file" accept="image/*" hidden onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setError("Image exceeds 2MB."); return; } const reader = new FileReader(); reader.onload = ev => setServiceForm(p => ({...p, imageUrl: ev.target.result})); reader.readAsDataURL(file); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                {[
                  { key: "onlineBookingEnabled", label: "Enable Online Booking" },
                  { key: "isFeatured", label: "Featured" },
                  { key: "isPopular", label: "Popular" }
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#334155", fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={serviceForm[key]} onChange={e => setServiceForm(c => ({ ...c, [key]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12, background: "#f8fafc", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
              <button type="button" onClick={() => setServiceModalOpen(false)} style={{ padding: "10px 24px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button type="submit" style={{ padding: "10px 28px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                {editingServiceId ? "Save Changes" : "Create Service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
