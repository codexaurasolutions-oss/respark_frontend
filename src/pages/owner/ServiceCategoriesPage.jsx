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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCatId) || null,
    [categories, selectedCatId]
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
    () => categories.reduce((count, category) => count + (category.children?.length || 0), 0),
    [categories]
  );

  useEffect(() => {
    if (!selectedCatId || !categories.length) return;
    const freshCategory = categories.find((category) => category.id === selectedCatId);
    if (!freshCategory) {
      setSelectedCatId("");
      setSelectedSubId("");
      return;
    }
    if (selectedSubId) {
      const freshSub = (freshCategory.children || []).find((subcategory) => subcategory.id === selectedSubId);
      if (!freshSub) setSelectedSubId("");
    }
  }, [categories, selectedCatId, selectedSubId]);

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

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ margin: 0 }}>Service Catalog Workspace</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              Manage subcategories within categories and services within subcategories.
            </p>
          </div>
          <div className="badge-row">
            <span className="badge">Categories {categories.length}</span>
            <span className="badge">Subcategories {totalSubcategories}</span>
            <span className="badge">Visible services {items.length}</span>
          </div>
        </div>
      </div>

      {status.error && (
        <div style={{ padding: "10px 16px", marginBottom: 14, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, color: "#dc2626", fontSize: 13 }}>
          {status.error}
        </div>
      )}
      {status.success && (
        <div style={{ padding: "10px 16px", marginBottom: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, color: "#16a34a", fontSize: 13 }}>
          {status.success}
        </div>
      )}

      <div className="catalog-layout-grid">
        <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", textAlign: "center", color: "#2563eb", fontSize: 16, fontWeight: 700 }}>
            Categories
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              onClick={() => {
                setSelectedCatId("");
                setSelectedSubId("");
                setEditingCatId("");
                setCatInput("");
              }}
              style={{
                padding: "16px 14px",
                borderRadius: 14,
                border: !selectedCatId ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                background: !selectedCatId ? "#dbeafe" : "#ffffff",
                cursor: "pointer",
                color: !selectedCatId ? "#1d4ed8" : "#0f172a",
                fontWeight: !selectedCatId ? 700 : 500
              }}
            >
              All
            </div>
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => {
                  setSelectedCatId(category.id);
                  setSelectedSubId("");
                  setEditingCatId("");
                  setEditingSubId("");
                  setSubInput("");
                }}
                style={{
                  padding: "16px 14px",
                  borderRadius: 14,
                  border: selectedCatId === category.id ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                  background: selectedCatId === category.id ? "#dbeafe" : "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <div>
                  <div style={{ color: selectedCatId === category.id ? "#1d4ed8" : "#0f172a", fontWeight: 700 }}>
                    {category.name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                    {(category.children || []).length} subcategories
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <IconButton
                    title="Edit category"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingCatId(category.id);
                      setCatInput(category.name);
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </IconButton>
                  <IconButton
                    title="Archive category"
                    color="#dc2626"
                    onClick={(event) => {
                      event.stopPropagation();
                      archiveCategory(category.id);
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", padding: 18 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={catInput}
                onChange={(event) => setCatInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addCategory()}
                placeholder="New category..."
                style={{ flex: 1, padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={addCategory}
                style={{ padding: "12px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
              >
                + New
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", textAlign: "center", color: "#2563eb", fontSize: 16, fontWeight: 700 }}>
            {selectedCategory ? `${selectedCategory.name}/` : "Choose Category"}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {!selectedCategory ? (
              <EmptyState title="Select category" message="Select a category from the left side first." />
            ) : subcategories.length === 0 ? (
              <EmptyState title="No subcategories yet" message="No subcategories have been created in this category yet." />
            ) : (
              subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  onClick={() => {
                    setSelectedSubId(subcategory.id);
                    setEditingSubId("");
                    setSubInput("");
                  }}
                  style={{
                    padding: "16px 14px",
                    borderRadius: 14,
                    border: selectedSubId === subcategory.id ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                    background: selectedSubId === subcategory.id ? "#dbeafe" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ color: selectedSubId === subcategory.id ? "#1d4ed8" : "#0f172a", fontWeight: 700 }}>
                      {subcategory.name}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                      {(subcategory.services || []).length} services
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <IconButton
                      title="Edit subcategory"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSubId(subcategory.id);
                        setSubInput(subcategory.name);
                      }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </IconButton>
                    <IconButton
                      title="Archive subcategory"
                      color="#dc2626"
                      onClick={(event) => {
                        event.stopPropagation();
                        archiveSubcategory(subcategory.id);
                      }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    </IconButton>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", padding: 18 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={subInput}
                onChange={(event) => setSubInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addSubcategory()}
                placeholder="New subcategory..."
                disabled={!selectedCategory}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  fontSize: 14,
                  opacity: selectedCategory ? 1 : 0.55
                }}
              />
              <button
                type="button"
                onClick={addSubcategory}
                disabled={!selectedCategory}
                style={{
                  padding: "12px 18px",
                  background: selectedCategory ? "#2563eb" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: selectedCategory ? "pointer" : "not-allowed"
                }}
              >
                + New
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ color: "#2563eb", fontSize: 16, fontWeight: 700 }}>
              {selectedSubcategory
                ? `${selectedCategory?.name}/${selectedSubcategory.name}/Items`
                : "Choose Subcategory"}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={handleImportClick}
                style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, whiteSpace: "nowrap", fontWeight: 700 }}
              >
                Import CSV
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleExport}
                style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, whiteSpace: "nowrap", fontWeight: 700 }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={openNewService}
                style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, whiteSpace: "nowrap", fontWeight: 700 }}
              >
                + Add service
              </button>
            </div>
          </div>

          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
            <input
              placeholder="Search items"
              value={svcSearch}
              onChange={(event) => setSvcSearch(event.target.value)}
              style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {!selectedSubcategory ? (
              <EmptyState title="Select subcategory" message="Choose a subcategory from the middle column to view and add services." />
            ) : items.length === 0 ? (
              <EmptyState title={svcSearch ? "No matching services" : "No services yet"} message={svcSearch ? "Clear the search and try again." : "Add the first service to this subcategory."} />
            ) : (
              <>
                {currentItems.map((service) => (
                  <div
                    key={service.id}
                    style={{
                      padding: "16px 14px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 14
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{service.name}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="badge">₹ {Number(service.price || 0)}</span>
                        <span className="badge">{service.durationMin || 30} min</span>
                        <span className="badge">{service.gender || "UNISEX"}</span>
                        <span className="badge">{service.branch?.name || "Salon wide"}</span>
                        <span className="badge">{service.onlineBookingEnabled ? "Online booking on" : "Online booking off"}</span>
                      </div>
                      {service.description && (
                        <div style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
                          {service.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconButton title="Edit service" onClick={() => startEditService(service)}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </IconButton>
                      <IconButton title="Archive service" color="#dc2626" onClick={() => archiveService(service.id)}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </IconButton>
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13 }}
                    >
                      Previous
                    </button>
                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13 }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", padding: 18, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={openNewService}
              style={{ padding: "12px 18px", borderRadius: 12, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              + Add service
            </button>
          </div>
        </div>
      </div>

      {serviceModalOpen && (
        <div
          onClick={() => setServiceModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 9999
          }}
        >
          <form
            onSubmit={saveService}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: 24,
              boxShadow: "0 30px 80px rgba(15, 23, 42, 0.25)"
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
              {editingServiceId ? "Edit Service" : "Create Service"}
            </div>

            <div style={{ padding: 24, display: "grid", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Name *</label>
                  <input
                    value={serviceForm.name}
                    onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Trendy Cut, Cleanup, Facial..."
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Branch</label>
                  <select
                    value={serviceForm.branchId}
                    onChange={(event) => setServiceForm((current) => ({ ...current, branchId: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  >
                    <option value="">Salon wide</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Subcategory</label>
                  <input
                    value={selectedSubcategory ? `${selectedCategory?.name} / ${selectedSubcategory.name}` : ""}
                    disabled
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14, background: "#f8fafc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Gender</label>
                  <select
                    value={serviceForm.gender}
                    onChange={(event) => setServiceForm((current) => ({ ...current, gender: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  >
                    <option value="UNISEX">Unisex</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Price</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.price}
                    onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Duration</label>
                  <select
                    value={serviceForm.durationMin}
                    onChange={(event) => setServiceForm((current) => ({ ...current, durationMin: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Tax Rate %</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.taxRate}
                    onChange={(event) => setServiceForm((current) => ({ ...current, taxRate: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Commission %</label>
                  <input
                    type="number"
                    min="0"
                    value={serviceForm.commissionPct}
                    onChange={(event) => setServiceForm((current) => ({ ...current, commissionPct: event.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 700, color: "#334155" }}>Description</label>
                <textarea
                  rows={4}
                  value={serviceForm.description}
                  onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional service notes..."
                  style={{ width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 14, resize: "vertical", marginBottom: 16 }}
                />
              </div>

              <div style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: 0 }}>Consumables</label>
                  <button type="button" onClick={() => setServiceForm({...serviceForm, consumables: [...(serviceForm.consumables || []), { productId: '', reqdQty: 0, productName: '' }]})} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                {(serviceForm.consumables || []).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div style={{ flex: 2, minWidth: 0 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Item</label>}
                      <select value={item.productId} onChange={e => {
                        const newItems = [...serviceForm.consumables];
                        const prod = products.find(p => p.id === e.target.value);
                        newItems[idx] = {...newItems[idx], productId: e.target.value, productName: prod?.name || ''};
                        setServiceForm({...serviceForm, consumables: newItems});
                      }} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 13, background: "white" }}>
                        <option value="">Select product</option>
                        {products.filter(p => p.isActive && p.productType === "CONSUMABLE").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 3, minWidth: 0 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Reqd Qty</label>}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" min="0" value={item.reqdQty} onChange={e => {
                          const newItems = [...serviceForm.consumables];
                          newItems[idx] = {...newItems[idx], reqdQty: e.target.value};
                          setServiceForm({...serviceForm, consumables: newItems});
                        }} style={{ flex: 1, minWidth: 0, padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 13 }} />
                        {item.productId && (
                          <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, whiteSpace: "nowrap" }}>
                            {products.find(p => p.id === item.productId)?.unit || "pcs"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      const newItems = serviceForm.consumables.filter((_, i) => i !== idx);
                      setServiceForm({...serviceForm, consumables: newItems});
                    }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 18, padding: "4px 8px", lineHeight: 1, marginBottom: 2 }}>✕</button>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8, display: "block" }}>Service Image</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {serviceForm.imageUrl && (
                    <div style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <img src={serviceForm.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button type="button" onClick={() => setServiceForm({...serviceForm, imageUrl: ""})} style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                    </div>
                  )}
                  {!serviceForm.imageUrl && (
                    <label style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #cbd5e1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: 10, gap: 4, transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"} onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}>
                      <span style={{ fontSize: 20 }}>+</span>
                      Add Image
                      <input type="file" accept="image/*" hidden onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert("Image exceeds 2MB limit.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setServiceForm(prev => ({...prev, imageUrl: ev.target.result}));
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />
                    </label>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.onlineBookingEnabled}
                    onChange={(event) => setServiceForm((current) => ({ ...current, onlineBookingEnabled: event.target.checked }))}
                  />
                  Enable Online Booking
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.isFeatured}
                    onChange={(event) => setServiceForm((current) => ({ ...current, isFeatured: event.target.checked }))}
                  />
                  Featured
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.isPopular}
                    onChange={(event) => setServiceForm((current) => ({ ...current, isPopular: event.target.checked }))}
                  />
                  Popular
                </label>
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                style={{ padding: "12px 18px", background: "#ffffff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: "12px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}
              >
                {editingServiceId ? "Save Changes" : "Create Service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
