import { useEffect, useState, useCallback, useRef } from "react";
import { X, Trash2, Edit2, Search, Plus, Package } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { useBranch } from "../../context/BranchContext";
import PageLoader from "../../components/PageLoader";
import "./ServiceHubPage.css";

const defaultProductForm = {
  name: "",
  categoryId: "",
  branchId: "",
  featured: false,
  isActive: true,
  targetGroup: "BOTH",
  hideFromCatalogue: false,
  costPrice: 0,
  sellingPrice: 0,
  salePrice: 0,
  currentStock: 0,
  nonDiscountable: false,
  sku: "",
  productType: "RETAIL",
  description: "",
  videoLink: "",
  benefits: "",
  ingredients: "",
  usageInstructions: "",
  displayImages: [],
  variations: [],
  weight: "",
  length: "",
  width: "",
  height: ""
};

export default function ProductCategoriesPage() {
  const { currencySymbol } = useSalonSettings();
  const { selectedBranchId, branches } = useBranch();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ ...defaultProductForm });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", sortOrder: 1, isPublicVisible: true });
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [catRes, prodRes] = await Promise.all([
        api.get("/owner/inventory/categories", { params: branchParams }),
        api.get("/owner/inventory/products", { params: branchParams })
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to load"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory ? p.categoryId === selectedCategory.id : true;
    const matchQ = searchQ ? p.name.toLowerCase().includes(searchQ.toLowerCase()) || (p.sku || "").toLowerCase().includes(searchQ.toLowerCase()) : true;
    return matchCat && matchQ && p.isActive;
  });

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/owner/inventory/categories", categoryForm);
      setStatus({ success: "Category saved", error: "" });
      setShowCategoryModal(false);
      setCategoryForm({ name: "", sortOrder: categories.length + 1, isPublicVisible: true });
      loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to save category"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setSaving(true);
    try {
      await api.delete(`/owner/inventory/categories/${categoryToDelete.id}`);
      setStatus({ success: "Category deleted", error: "" });
      if (selectedCategory?.id === categoryToDelete.id) setSelectedCategory(null);
      loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to delete category"), success: "" });
    } finally {
      setSaving(false);
      setCategoryToDelete(null);
    }
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ ...defaultProductForm, categoryId: selectedCategory?.id || "", branchId: selectedBranchId || "" });
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name || "",
      categoryId: p.categoryId || "",
      branchId: p.branchId || "",
      featured: Boolean(p.featured),
      isActive: p.isActive !== false,
      targetGroup: p.targetGroup || "BOTH",
      hideFromCatalogue: Boolean(p.hideFromCatalogue),
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      salePrice: Number(p.salePrice) || 0,
      currentStock: Number(p.currentStock) || 0,
      nonDiscountable: Boolean(p.nonDiscountable),
      sku: p.sku || "",
      productType: p.productType || "RETAIL",
      description: p.description || "",
      videoLink: p.videoLink || "",
      benefits: p.benefits || "",
      ingredients: p.ingredients || "",
      usageInstructions: p.usageInstructions || "",
      displayImages: Array.isArray(p.displayImages) ? p.displayImages : [],
      variations: Array.isArray(p.variations) ? p.variations : [],
      weight: p.weight ?? "",
      length: p.length ?? "",
      width: p.width ?? "",
      height: p.height ?? ""
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...productForm,
        branchId: productForm.branchId || selectedBranchId || null,
        costPrice: Number(productForm.costPrice),
        sellingPrice: Number(productForm.sellingPrice),
        salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
        currentStock: Number(productForm.currentStock),
        featured: Boolean(productForm.featured),
        targetGroup: productForm.targetGroup || "BOTH",
        hideFromCatalogue: Boolean(productForm.hideFromCatalogue),
        nonDiscountable: Boolean(productForm.nonDiscountable),
        description: productForm.description || null,
        videoLink: productForm.videoLink || null,
        benefits: productForm.benefits || null,
        ingredients: productForm.ingredients || null,
        usageInstructions: productForm.usageInstructions || null,
        displayImages: Array.isArray(productForm.displayImages) ? productForm.displayImages : [],
        variations: Array.isArray(productForm.variations) ? productForm.variations : [],
        weight: productForm.weight !== "" ? Number(productForm.weight) : null,
        length: productForm.length !== "" ? Number(productForm.length) : null,
        width: productForm.width !== "" ? Number(productForm.width) : null,
        height: productForm.height !== "" ? Number(productForm.height) : null
      };
      if (editingProduct) {
        await api.patch(`/owner/inventory/products/${editingProduct.id}`, payload);
      } else {
        await api.post("/owner/inventory/products", payload);
      }
      setStatus({ success: "Product saved", error: "" });
      setShowProductModal(false);
      loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to save product"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  const handlePriceFocus = (field) => {
    if (productForm[field] === 0) setProductForm(prev => ({ ...prev, [field]: "" }));
  };

  const handlePriceBlur = (field) => {
    if (productForm[field] === "") setProductForm(prev => ({ ...prev, [field]: 0 }));
  };

  if (loading) return <PageLoader title="Loading products" />;

  return (
    <div className="responsive-page-layout" style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", overflow: "hidden" }}>
      {status.error && <div style={{ position: "fixed", top: 80, right: 24, background: "#fef2f2", color: "#dc2626", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12, fontWeight: 500 }}>{status.error}<button onClick={() => setStatus({...status, error: ""})} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", display: "flex" }}><X size={16} /></button></div>}
      {status.success && <div style={{ position: "fixed", top: 80, right: 24, background: "#ecfdf5", color: "#059669", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 12, fontWeight: 500 }}>{status.success}<button onClick={() => setStatus({...status, success: ""})} style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", display: "flex" }}><X size={16} /></button></div>}

      {/* Left Sidebar - Categories */}
      <div className="responsive-sidebar" style={{ width: 280, background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>Categories</h3>
          <button onClick={() => setShowCategoryModal(true)} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(59,130,246,0.2)", transition: "all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#2563eb"} onMouseLeave={e=>e.currentTarget.style.background="#3b82f6"}>
            <Plus size={16} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
          <div
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              background: !selectedCategory ? "#eff6ff" : "transparent",
              color: !selectedCategory ? "#1d4ed8" : "#475569",
              fontWeight: !selectedCategory ? 600 : 500,
              fontSize: 14,
              borderRadius: 8,
              marginBottom: 4,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
            onMouseEnter={e => { if(selectedCategory) e.currentTarget.style.background = "#f8fafc" }}
            onMouseLeave={e => { if(selectedCategory) e.currentTarget.style.background = "transparent" }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: !selectedCategory ? "#3b82f6" : "#cbd5e1" }} />
            All Categories
          </div>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                background: selectedCategory?.id === cat.id ? "#eff6ff" : "transparent",
                color: selectedCategory?.id === cat.id ? "#1d4ed8" : "#475569",
                fontWeight: selectedCategory?.id === cat.id ? 600 : 500,
                fontSize: 14,
                borderRadius: 8,
                marginBottom: 4,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
              onMouseEnter={e => { 
                if(selectedCategory?.id !== cat.id) e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.querySelector(".del-btn").style.opacity = "1";
              }}
              onMouseLeave={e => { 
                if(selectedCategory?.id !== cat.id) e.currentTarget.style.background = "transparent";
                e.currentTarget.querySelector(".del-btn").style.opacity = "0";
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, overflow: "hidden" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedCategory?.id === cat.id ? "#3b82f6" : "#cbd5e1", flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.name}</span>
              </div>
              <button 
                className="del-btn"
                onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat); }}
                style={{ opacity: 0, background: "none", border: "none", color: "#ef4444", cursor: "pointer", display: "flex", padding: 4, borderRadius: 4, transition: "all 0.2s", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                title="Delete Category"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {categories.length === 0 && <div style={{ padding: "32px 16px", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>No categories yet</div>}
        </div>
      </div>

      {/* Right Panel - Products */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
        {/* Header */}
        <div style={{ padding: "20px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#0f172a", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#eff6ff", padding: 8, borderRadius: 8, color: "#3b82f6", display: "flex" }}><Package size={20} /></div>
            {selectedCategory ? selectedCategory.name : "All Products"}
          </h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products, SKU..."
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px 10px 36px", fontSize: 14, width: 260, outline: "none", transition: "border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#cbd5e1"}
              />
            </div>
            <button onClick={openNewProduct} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#1e293b"} onMouseLeave={e=>e.currentTarget.style.background="#0f172a"}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* Product List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {filteredProducts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {filteredProducts.map(p => (
                <div key={p.id} style={{ background: "#ffffff", borderRadius: 12, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 16, transition: "transform 0.2s, box-shadow 0.2s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.02)"; }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📦"}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", lineHeight: 1.3 }}>
                        {p.name}
                        {p.featured && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontWeight: 700, display: "inline-flex", alignItems: "center", height: 18 }}>★ Featured</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>SKU: {p.sku || "N/A"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 16, marginTop: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{currencySymbol}{Number(p.sellingPrice).toFixed(0)}</span>
                      {p.productType === "CONSUMABLE" && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>Customisable</span>}
                    </div>
                    <button onClick={() => openEditProduct(p)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px", cursor: "pointer", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; }} onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#334155"; e.currentTarget.style.borderColor = "#e2e8f0"; }} title="Edit Product">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "80px 40px", textAlign: "center", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff", borderRadius: 16, border: "1px dashed #cbd5e1" }}>
              <div style={{ background: "#f1f5f9", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#94a3b8" }}><Package size={32} /></div>
              <h4 style={{ margin: "0 0 8px", fontSize: 18, color: "#0f172a" }}>No products found</h4>
              <p style={{ margin: 0, fontSize: 14 }}>There are no products in this category matching your search.</p>
              <button onClick={openNewProduct} style={{ marginTop: 24, background: "#fff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add your first product</button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="hub-modal-overlay" onClick={() => setCategoryToDelete(null)} style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, padding: 32, textAlign: 'center', borderRadius: 16, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ width: 64, height: 64, background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#ef4444" }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: "0 0 12px", color: "#0f172a", fontSize: 20, fontWeight: 800 }}>Delete Category?</h3>
            <p style={{ color: "#475569", fontSize: 15, marginBottom: 28, lineHeight: 1.5 }}>Are you sure you want to delete <strong style={{ color: "#0f172a" }}>"{categoryToDelete.name}"</strong>? This will permanently delete the category and may affect associated products.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              <button type="button" onClick={() => setCategoryToDelete(null)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>Cancel</button>
              <button type="button" onClick={handleDeleteCategory} disabled={saving} style={{ flex: 1, padding: "12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background 0.2s" }} onMouseEnter={e => { if(!saving) e.currentTarget.style.background = "#dc2626" }} onMouseLeave={e => { if(!saving) e.currentTarget.style.background = "#ef4444" }}>{saving ? "Deleting..." : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="hub-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, borderRadius: 16 }}>
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>New Category</span>
              <button type="button" onClick={() => setShowCategoryModal(false)} style={{ background: "#f1f5f9", border: "none", cursor: "pointer", color: "#64748b", padding: 6, borderRadius: "50%", display: "flex" }} onMouseEnter={e=>e.currentTarget.style.background="#e2e8f0"} onMouseLeave={e=>e.currentTarget.style.background="#f1f5f9"}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCategory} style={{ padding: "24px" }}>
              <div className="hub-form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Name *</label>
                <input type="text" required className="hub-input" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="e.g. Skin Care" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
              </div>
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                <div className="hub-form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Position (Sort Order)</label>
                  <input type="number" className="hub-input" value={categoryForm.sortOrder} onChange={e => setCategoryForm({...categoryForm, sortOrder: parseInt(e.target.value) || 0})} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                </div>
                <div className="hub-form-group" style={{ flex: 1, display: "flex", alignItems: "end", paddingBottom: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={categoryForm.isPublicVisible} onChange={e => setCategoryForm({...categoryForm, isPublicVisible: e.target.checked})} style={{ width: 20, height: 20, accentColor: "#2563eb" }} />
                    Active Category
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} style={{ padding: "10px 20px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 24px", background: "#2563eb", border: "none", borderRadius: 8, fontWeight: 600, color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Create Category"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="hub-modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 16 }}>
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                {editingProduct ? <Edit2 size={18} color="#3b82f6" /> : <Plus size={18} color="#3b82f6" />}
                {selectedCategory ? <span style={{ color: "#64748b" }}>{selectedCategory.name} / </span> : ""}{editingProduct ? "Edit Item" : "New Item"}
              </span>
              <button type="button" onClick={() => setShowProductModal(false)} style={{ background: "#e2e8f0", border: "none", cursor: "pointer", color: "#475569", padding: 6, borderRadius: "50%", display: "flex" }} onMouseEnter={e=>e.currentTarget.style.background="#cbd5e1"} onMouseLeave={e=>e.currentTarget.style.background="#e2e8f0"}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
              <div className="hub-modal-body" style={{ overflowY: "auto", flex: 1, padding: "24px 28px" }}>
                {/* Name, Featured, Active */}
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr", gap: 20, marginBottom: 24, alignItems: "end" }}>
                  <div className="hub-form-group" style={{ position: "relative" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Name *</label>
                    <input
                      ref={nameRef}
                      type="text"
                      required
                      className="hub-input"
                      value={productForm.name}
                      onChange={e => {
                        const val = e.target.value;
                        setProductForm({...productForm, name: val});
                        if (val.length >= 2) {
                          const matches = products.filter(p => p.name.toLowerCase().includes(val.toLowerCase()) && p.name !== val).slice(0, 5);
                          setNameSuggestions(matches);
                          setShowSuggestions(matches.length > 0);
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (productForm.name.length >= 2) {
                          const matches = products.filter(p => p.name.toLowerCase().includes(productForm.name.toLowerCase()) && p.name !== productForm.name).slice(0, 5);
                          setNameSuggestions(matches);
                          setShowSuggestions(matches.length > 0);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Product name"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                    />
                    {showSuggestions && nameSuggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
                        {nameSuggestions.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={() => {
                              setProductForm({...productForm, name: p.name, sellingPrice: Number(p.sellingPrice) || 0, costPrice: Number(p.costPrice) || 0, sku: p.sku || ""});
                              setShowSuggestions(false);
                            }}
                            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.background = "white"}
                          >
                            <span style={{ fontWeight: 500, color: "#0f172a" }}>{p.name}</span>
                            <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>{currencySymbol}{Number(p.sellingPrice || 0).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end", paddingBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.featured} onChange={e => setProductForm({...productForm, featured: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#f59e0b" }} />
                      Featured
                    </label>
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end", paddingBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.isActive} onChange={e => setProductForm({...productForm, isActive: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      Active
                    </label>
                  </div>
                </div>

                {/* Branch, Group + Hide from catalogue */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "16px 20px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#f8fafc", gap: 16, flexWrap: "wrap" }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Current Stock</label>
                    <input type="number" className="hub-input" value={productForm.currentStock} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, currentStock: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("currentStock")} onBlur={() => handlePriceBlur("currentStock")} style={{ width: 120, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Target Group:</span>
                    <div style={{ display: "flex", gap: 16, background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      {[{ value: "BOTH", label: "Both" }, { value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }].map(g => (
                        <label key={g.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                          <input type="radio" name="targetGroup" value={g.value} checked={productForm.targetGroup === g.value} onChange={e => setProductForm({...productForm, targetGroup: e.target.value})} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                          {g.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={productForm.hideFromCatalogue} onChange={e => setProductForm({...productForm, hideFromCatalogue: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                    Hide from catalogue
                  </label>
                </div>

                {/* Cost Price, Price, Sale Price, Non Discountable */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 24, alignItems: "end" }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Cost Price</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                      <span style={{ padding: "10px 12px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" className="hub-input" value={productForm.costPrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, costPrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("costPrice")} onBlur={() => handlePriceBlur("costPrice")} style={{ border: "none", flex: 1, padding: "10px", fontSize: 14 }} />
                    </div>
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Selling Price *</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                      <span style={{ padding: "10px 12px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" required className="hub-input" value={productForm.sellingPrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, sellingPrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("sellingPrice")} onBlur={() => handlePriceBlur("sellingPrice")} style={{ border: "none", flex: 1, padding: "10px", fontSize: 14, fontWeight: 600 }} />
                    </div>
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Sale Price</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                      <span style={{ padding: "10px 12px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" className="hub-input" value={productForm.salePrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, salePrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("salePrice")} onBlur={() => handlePriceBlur("salePrice")} style={{ border: "none", flex: 1, padding: "10px", fontSize: 14 }} />
                    </div>
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end", paddingBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.nonDiscountable} onChange={e => setProductForm({...productForm, nonDiscountable: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      No Discount
                    </label>
                  </div>
                </div>

                {/* Store SKU + Retail */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24, alignItems: "end" }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>SKU (Stock Keeping Unit)</label>
                    <input type="text" className="hub-input" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} placeholder="e.g. SHAMP-001" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontFamily: "monospace" }} />
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end", paddingBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.productType === "RETAIL"} onChange={e => setProductForm({...productForm, productType: e.target.checked ? "RETAIL" : "CONSUMABLE"})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      Retail Product
                    </label>
                  </div>
                </div>

                {/* Size & Dimensions */}
                <div style={{ marginBottom: 24, padding: "16px 20px", border: "1px solid #f1f5f9", borderRadius: 12, background: "#f8fafc" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", display: "block", marginBottom: 16 }}>Size & Dimensions</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Weight (g)</label>
                      <input type="number" className="hub-input" value={productForm.weight} onChange={e => setProductForm({...productForm, weight: e.target.value})} placeholder="0" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Length (cm)</label>
                      <input type="number" className="hub-input" value={productForm.length} onChange={e => setProductForm({...productForm, length: e.target.value})} placeholder="0" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Width (cm)</label>
                      <input type="number" className="hub-input" value={productForm.width} onChange={e => setProductForm({...productForm, width: e.target.value})} placeholder="0" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Height (cm)</label>
                      <input type="number" className="hub-input" value={productForm.height} onChange={e => setProductForm({...productForm, height: e.target.value})} placeholder="0" min="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="hub-form-group" style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Category</label>
                  <select className="hub-input" value={productForm.categoryId} onChange={e => setProductForm({...productForm, categoryId: e.target.value})} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff" }}>
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Variations */}
                <div style={{ marginBottom: 24, padding: "20px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Variations</span>
                    <button type="button" onClick={() => setProductForm({...productForm, variations: [...productForm.variations, { name: "", sku: "", price: 0, stock: 0 }]})} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#dbeafe"} onMouseLeave={e=>e.currentTarget.style.background="#eff6ff"}>+ Add Variation</button>
                  </div>
                  {productForm.variations.map((v, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr auto", gap: 12, marginBottom: 12, alignItems: "end", background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #f1f5f9" }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Name</label>
                        <input type="text" className="hub-input" value={v.name} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], name: e.target.value}; setProductForm({...productForm, variations: next}); }} placeholder="e.g. 500ml" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>SKU</label>
                        <input type="text" className="hub-input" value={v.sku} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], sku: e.target.value}; setProductForm({...productForm, variations: next}); }} placeholder="SKU" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Price</label>
                        <input type="number" className="hub-input" value={v.price} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], price: parseFloat(e.target.value) || 0}; setProductForm({...productForm, variations: next}); }} placeholder="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>Stock</label>
                        <input type="number" className="hub-input" value={v.stock} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], stock: parseInt(e.target.value) || 0}; setProductForm({...productForm, variations: next}); }} placeholder="0" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }} />
                      </div>
                      <button type="button" onClick={() => setProductForm({...productForm, variations: productForm.variations.filter((_, i) => i !== idx)})} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#fecaca"} onMouseLeave={e=>e.currentTarget.style.background="#fee2e2"} title="Remove Variation"><X size={16} /></button>
                    </div>
                  ))}
                  {productForm.variations.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>No variations added.</div>}
                </div>

                {/* Description + Video Link */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Description <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>(Optional)</span></label>
                    <textarea className="hub-input" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Detailed product description..." rows={4} style={{ width: "100%", resize: "vertical", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Video Link <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>(Optional)</span></label>
                    <input type="text" className="hub-input" value={productForm.videoLink} onChange={e => setProductForm({...productForm, videoLink: e.target.value})} placeholder="https://youtube.com/..." style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 16 }} />
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Benefits <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>(Optional)</span></label>
                    <textarea className="hub-input" value={productForm.benefits} onChange={e => setProductForm({...productForm, benefits: e.target.value})} placeholder="Key benefits..." rows={2} style={{ width: "100%", resize: "vertical", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </div>
                </div>

                {/* Ingredients + Usage Instructions */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Ingredients <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>(Optional)</span></label>
                    <textarea className="hub-input" value={productForm.ingredients} onChange={e => setProductForm({...productForm, ingredients: e.target.value})} placeholder="List of ingredients..." rows={3} style={{ width: "100%", resize: "vertical", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>Usage Instructions <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11 }}>(Optional)</span></label>
                    <textarea className="hub-input" value={productForm.usageInstructions} onChange={e => setProductForm({...productForm, usageInstructions: e.target.value})} placeholder="How to use this product..." rows={3} style={{ width: "100%", resize: "vertical", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
                  </div>
                </div>

                {/* Display Images */}
                <div style={{ padding: "20px", border: "1px dashed #cbd5e1", borderRadius: 12, background: "#f8fafc" }}>
                  <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12, display: "block" }}>Display Images</label>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {(productForm.displayImages || []).map((img, idx) => (
                      <div key={idx} style={{ position: "relative", width: 100, height: 100, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                        <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => setProductForm({...productForm, displayImages: productForm.displayImages.filter((_, i) => i !== idx)})} style={{ position: "absolute", top: 4, right: 4, background: "rgba(220, 38, 38, 0.9)", color: "white", border: "none", borderRadius: "50%", width: 22, height: 22, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#b91c1c"} onMouseLeave={e=>e.currentTarget.style.background="rgba(220, 38, 38, 0.9)"}><X size={14} /></button>
                      </div>
                    ))}
                    <label style={{ width: 100, height: 100, borderRadius: 12, border: "2px dashed #94a3b8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", fontSize: 12, fontWeight: 600, gap: 8, transition: "all 0.2s", background: "#fff" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#94a3b8"; e.currentTarget.style.color = "#64748b"; }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} /></div>
                      Add Image
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const maxSize = 2 * 1024 * 1024;
                        files.forEach(file => {
                          if (file.size > maxSize) {
                            setStatus({ error: `"${file.name}" exceeds 2MB limit. Please choose a smaller image.`, success: "" });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setProductForm(prev => ({...prev, displayImages: [...(prev.displayImages || []), ev.target.result]}));
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = "";
                      }} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="hub-modal-footer" style={{ borderTop: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", justifyContent: "flex-end", gap: 12, background: "#f8fafc", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ padding: "10px 24px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, color: "#475569", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 32px", background: "#0f172a", border: "none", borderRadius: 8, fontWeight: 600, color: "#fff", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background 0.2s" }} onMouseEnter={e=>{if(!saving) e.currentTarget.style.background="#1e293b"}} onMouseLeave={e=>{if(!saving) e.currentTarget.style.background="#0f172a"}}>{saving ? "Saving..." : "Save Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
