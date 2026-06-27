import { useEffect, useState, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import PageLoader from "../../components/PageLoader";
import "./ServiceHubPage.css";

const defaultProductForm = {
  name: "",
  categoryId: "",
  featured: false,
  isActive: true,
  targetGroup: "BOTH",
  hideFromCatalogue: false,
  costPrice: 0,
  sellingPrice: 0,
  salePrice: 0,
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
  const [status, setStatus] = useState({ error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get("/owner/inventory/categories"),
        api.get("/owner/inventory/products")
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Failed to load"), success: "" });
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ ...defaultProductForm, categoryId: selectedCategory?.id || "" });
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name || "",
      categoryId: p.categoryId || "",
      featured: Boolean(p.featured),
      isActive: p.isActive !== false,
      targetGroup: p.targetGroup || "BOTH",
      hideFromCatalogue: Boolean(p.hideFromCatalogue),
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      salePrice: Number(p.salePrice) || 0,
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
        costPrice: Number(productForm.costPrice),
        sellingPrice: Number(productForm.sellingPrice),
        salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
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
    if (productForm[field] === 0) {
      setProductForm(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handlePriceBlur = (field) => {
    if (productForm[field] === "") {
      setProductForm(prev => ({ ...prev, [field]: 0 }));
    }
  };

  if (loading) return <PageLoader title="Loading products" />;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", gap: 0, background: "#fff", borderRadius: 12, overflow: "hidden" }}>
      {status.error && <div style={{ position: "fixed", top: 80, right: 24, background: "#fef2f2", color: "#dc2626", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{status.error}<button onClick={() => setStatus({...status, error: ""})} style={{ marginLeft: 12, background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>x</button></div>}
      {status.success && <div style={{ position: "fixed", top: 80, right: 24, background: "#f0fdf4", color: "#16a34a", padding: "12px 20px", borderRadius: 8, fontSize: 14, zIndex: 1000, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{status.success}<button onClick={() => setStatus({...status, success: ""})} style={{ marginLeft: 12, background: "none", border: "none", color: "#16a34a", cursor: "pointer" }}>x</button></div>}

      {/* Left Panel - Categories */}
      <div style={{ width: 280, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#0f172a" }}>Categories</h3>
          <button onClick={() => setShowCategoryModal(true)} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ New</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              background: !selectedCategory ? "#dbeafe" : "transparent",
              color: !selectedCategory ? "#1d4ed8" : "#334155",
              fontWeight: !selectedCategory ? 600 : 400,
              fontSize: 14,
              borderBottom: "1px solid #f1f5f9"
            }}
          >
            All
          </div>
          {categories.map(cat => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                background: selectedCategory?.id === cat.id ? "#dbeafe" : "transparent",
                color: selectedCategory?.id === cat.id ? "#1d4ed8" : "#334155",
                fontWeight: selectedCategory?.id === cat.id ? 600 : 400,
                fontSize: 14,
                borderBottom: "1px solid #f1f5f9"
              }}
            >
              {cat.name}
            </div>
          ))}
          {categories.length === 0 && <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>No categories yet</div>}
        </div>
      </div>

      {/* Right Panel - Products */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#2563eb" }}>
            {selectedCategory ? selectedCategory.name : "All Products"}/Items
          </h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search Items"
              style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px", fontSize: 13, width: 200 }}
            />
          </div>
        </div>

        {/* Product List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {filteredProducts.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /> : "📦"}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                    {p.name}
                    {p.featured && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>★ Featured</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{p.sku || "No SKU"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{currencySymbol}{Number(p.sellingPrice).toFixed(0)}</span>
                {p.productType === "CONSUMABLE" && <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4 }}>Customisable</span>}
                <button onClick={() => openEditProduct(p)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 14 }} title="Edit">✏️</button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No products found</div>
          )}
        </div>

        {/* Add Product Button */}
        <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={openNewProduct} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Add product</button>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="hub-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              New Category
              <button type="button" onClick={() => setShowCategoryModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 4, display: "flex" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCategory} style={{ padding: 24 }}>
              <div className="hub-form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Name *</label>
                <input type="text" required className="hub-input" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="Category name" style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div className="hub-form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Position</label>
                  <input type="number" className="hub-input" value={categoryForm.sortOrder} onChange={e => setCategoryForm({...categoryForm, sortOrder: parseInt(e.target.value) || 0})} style={{ width: "100%" }} />
                </div>
                <div className="hub-form-group" style={{ flex: 1, display: "flex", alignItems: "end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={categoryForm.isPublicVisible} onChange={e => setCategoryForm({...categoryForm, isPublicVisible: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                    Active
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <button type="button" className="btn-cancel" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Saving..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="hub-modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{selectedCategory ? `${selectedCategory.name} → ` : ""}{editingProduct ? "Edit Item" : "New Item"}</span>
              <button type="button" onClick={() => setShowProductModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 4, display: "flex" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
              <div className="hub-modal-body" style={{ overflowY: "auto", flex: 1, padding: 24 }}>
                {/* Name, Featured, Active */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 20, alignItems: "end" }}>
                  <div className="hub-form-group" style={{ position: "relative" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Name *</label>
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
                      style={{ width: "100%" }}
                    />
                    {showSuggestions && nameSuggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 160, overflowY: "auto" }}>
                        {nameSuggestions.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={() => {
                              setProductForm({...productForm, name: p.name, sellingPrice: Number(p.sellingPrice) || 0, costPrice: Number(p.costPrice) || 0, sku: p.sku || ""});
                              setShowSuggestions(false);
                            }}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.background = "white"}
                          >
                            <span>{p.name}</span>
                            <span style={{ color: "#94a3b8", fontSize: 11 }}>₹{Number(p.sellingPrice || 0).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.featured} onChange={e => setProductForm({...productForm, featured: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#f59e0b" }} />
                      Featured
                    </label>
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.isActive} onChange={e => setProductForm({...productForm, isActive: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      Active
                    </label>
                  </div>
                </div>

                {/* Group + Hide from catalogue */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Group</span>
                    <div style={{ display: "flex", gap: 16, marginLeft: 12 }}>
                      {[{ value: "BOTH", label: "Both" }, { value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }].map(g => (
                        <label key={g.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                          <input type="radio" name="targetGroup" value={g.value} checked={productForm.targetGroup === g.value} onChange={e => setProductForm({...productForm, targetGroup: e.target.value})} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                          {g.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={productForm.hideFromCatalogue} onChange={e => setProductForm({...productForm, hideFromCatalogue: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                    Hide from catalogue
                  </label>
                </div>

                {/* Cost Price, Price, Sale Price, Non Discountable */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20, alignItems: "end" }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Cost Price</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                      <span style={{ padding: "8px 10px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 13, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" className="hub-input" value={productForm.costPrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, costPrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("costPrice")} onBlur={() => handlePriceBlur("costPrice")} style={{ border: "none", flex: 1 }} />
                    </div>
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Price</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                      <span style={{ padding: "8px 10px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 13, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" className="hub-input" value={productForm.sellingPrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, sellingPrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("sellingPrice")} onBlur={() => handlePriceBlur("sellingPrice")} style={{ border: "none", flex: 1 }} />
                    </div>
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Sale Price</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                      <span style={{ padding: "8px 10px", background: "#f8fafc", borderRight: "1px solid #e2e8f0", fontSize: 13, color: "#64748b" }}>{currencySymbol}</span>
                      <input type="number" className="hub-input" value={productForm.salePrice} onChange={e => { const val = e.target.value; setProductForm(prev => ({...prev, salePrice: val === "" ? "" : (parseFloat(val) || 0)})); }} onFocus={() => handlePriceFocus("salePrice")} onBlur={() => handlePriceBlur("salePrice")} style={{ border: "none", flex: 1 }} />
                    </div>
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.nonDiscountable} onChange={e => setProductForm({...productForm, nonDiscountable: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      Non Discountable
                    </label>
                  </div>
                </div>

                {/* Store SKU + Retail */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20, alignItems: "end" }}>
                  <div className="hub-form-group">
                    <input type="text" className="hub-input" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} placeholder="Store SKU" style={{ width: "100%" }} />
                  </div>
                  <div className="hub-form-group" style={{ display: "flex", alignItems: "end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                      <input type="checkbox" checked={productForm.productType === "RETAIL"} onChange={e => setProductForm({...productForm, productType: e.target.checked ? "RETAIL" : "CONSUMABLE"})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                      Retail
                    </label>
                  </div>
                </div>

                {/* Size & Dimensions */}
                <div style={{ marginBottom: 20, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", display: "block", marginBottom: 10 }}>Size & Dimensions</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Weight (g)</label>
                      <input type="number" className="hub-input" value={productForm.weight} onChange={e => setProductForm({...productForm, weight: e.target.value})} placeholder="0" min="0" style={{ width: "100%" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Length (cm)</label>
                      <input type="number" className="hub-input" value={productForm.length} onChange={e => setProductForm({...productForm, length: e.target.value})} placeholder="0" min="0" style={{ width: "100%" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Width (cm)</label>
                      <input type="number" className="hub-input" value={productForm.width} onChange={e => setProductForm({...productForm, width: e.target.value})} placeholder="0" min="0" style={{ width: "100%" }} />
                    </div>
                    <div className="hub-form-group">
                      <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Height (cm)</label>
                      <input type="number" className="hub-input" value={productForm.height} onChange={e => setProductForm({...productForm, height: e.target.value})} placeholder="0" min="0" style={{ width: "100%" }} />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="hub-form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Category</label>
                  <select className="hub-input" value={productForm.categoryId} onChange={e => setProductForm({...productForm, categoryId: e.target.value})} style={{ width: "100%" }}>
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Variations */}
                <div style={{ marginBottom: 20, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Variations</span>
                    <button type="button" onClick={() => setProductForm({...productForm, variations: [...productForm.variations, { name: "", sku: "", price: 0, stock: 0 }]})} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Add Variations</button>
                  </div>
                  {productForm.variations.map((v, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end" }}>
                      <input type="text" className="hub-input" value={v.name} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], name: e.target.value}; setProductForm({...productForm, variations: next}); }} placeholder="Variation name" />
                      <input type="text" className="hub-input" value={v.sku} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], sku: e.target.value}; setProductForm({...productForm, variations: next}); }} placeholder="SKU" />
                      <input type="number" className="hub-input" value={v.price} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], price: parseFloat(e.target.value) || 0}; setProductForm({...productForm, variations: next}); }} placeholder="Price" />
                      <input type="number" className="hub-input" value={v.stock} onChange={e => { const next = [...productForm.variations]; next[idx] = {...next[idx], stock: parseInt(e.target.value) || 0}; setProductForm({...productForm, variations: next}); }} placeholder="Stock" />
                      <button type="button" onClick={() => setProductForm({...productForm, variations: productForm.variations.filter((_, i) => i !== idx)})} style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer" }}>x</button>
                    </div>
                  ))}
                </div>

                {/* Description + Video Link */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Description</label>
                    <textarea className="hub-input" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Product description" rows={3} style={{ width: "100%", resize: "vertical" }} />
                  </div>
                  <div className="hub-form-group">
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Video Link</label>
                    <input type="text" className="hub-input" value={productForm.videoLink} onChange={e => setProductForm({...productForm, videoLink: e.target.value})} placeholder="Video Link" style={{ width: "100%" }} />
                  </div>
                </div>

                {/* Benefits */}
                <div className="hub-form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Benefits</label>
                  <textarea className="hub-input" value={productForm.benefits} onChange={e => setProductForm({...productForm, benefits: e.target.value})} placeholder="Benefits" rows={2} style={{ width: "100%", resize: "vertical" }} />
                </div>

                {/* Ingredients */}
                <div className="hub-form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Ingredients</label>
                  <textarea className="hub-input" value={productForm.ingredients} onChange={e => setProductForm({...productForm, ingredients: e.target.value})} placeholder="Ingredients" rows={2} style={{ width: "100%", resize: "vertical" }} />
                </div>

                {/* Usage Instructions */}
                <div className="hub-form-group" style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4, display: "block" }}>Usage Instructions</label>
                  <textarea className="hub-input" value={productForm.usageInstructions} onChange={e => setProductForm({...productForm, usageInstructions: e.target.value})} placeholder="Usage Instructions" rows={2} style={{ width: "100%", resize: "vertical" }} />
                </div>

                {/* Display Images */}
                <div style={{ marginBottom: 20, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, display: "block" }}>Display Images</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {(productForm.displayImages || []).map((img, idx) => (
                      <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => setProductForm({...productForm, displayImages: productForm.displayImages.filter((_, i) => i !== idx)})} style={{ position: "absolute", top: 2, right: 2, background: "#dc2626", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                      </div>
                    ))}
                    <label style={{ width: 80, height: 80, borderRadius: 8, border: "2px dashed #cbd5e1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: 10, gap: 4, transition: "border-color 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"} onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}>
                      <span style={{ fontSize: 20 }}>+</span>
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

              <div className="hub-modal-footer" style={{ borderTop: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12, background: "#f8fafc" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowProductModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={saving}>{saving ? "Saving..." : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
