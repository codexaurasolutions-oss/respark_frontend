import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { Package, Search, ShoppingCart, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Tag, Layers, RefreshCw, Users, FileText, Activity, Plus } from "lucide-react";

const emptyCategory = { name: "", description: "", imageUrl: "", sortOrder: 0, isPublicVisible: true };
const emptyProduct = { branchId: "", categoryId: "", name: "", productType: "RETAIL", costPrice: 0, sellingPrice: 0, minStock: 0, sku: "", barcode: "", imageUrl: "" };
const emptyMovement = { productId: "", branchId: "", movementType: "STOCK_IN", quantity: 1, note: "" };

export default function InventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    if (path.includes("/products")) return "Products Catalog";
    if (path.includes("/categories")) return "Categories";
    if (path.includes("/stock-movements")) return "Stock Ledger";
    if (path.includes("/low-stock")) return "Low Stock Alerts";
    if (path.includes("/purchases/vendors")) return "Vendor Management";
    if (path.includes("/purchases/orders")) return "Purchase Order";
    return "Dashboard";
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [movementForm, setMovementForm] = useState(emptyMovement);

  const loadAll = async () => {
    try {
      api.get("/owner/inventory/categories").then(res => setCategories(res.data)).catch(console.error);
      api.get("/owner/inventory/products").then(res => setProducts(res.data)).catch(console.error);
      api.get("/owner/inventory/stock-movements").then(res => setMovements(res.data)).catch(console.error);
      api.get("/owner/inventory/low-stock").then(res => setLowStock(res.data)).catch(console.error);
      api.get("/owner/branches").then(res => setBranches(res.data)).catch(console.error);
      api.get("/owner/purchases/orders").then(res => setOrders(res.data)).catch(console.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (isProductModalOpen || isCategoryModalOpen || isMovementModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isProductModalOpen, isCategoryModalOpen, isMovementModalOpen]);

  const totalStock = products.reduce((acc, p) => acc + Number(p.currentStock || 0), 0);
  const activeItems = products.filter(p => p.isActive !== false).length;
  const pendingOrders = orders.filter(o => o.status === "DRAFT" || o.status === "SENT").length;
  const approvedOrders = orders.filter(o => o.status === "APPROVED" || o.status === "RECEIVED").length;
  const rejectedOrders = orders.filter(o => o.status === "CANCELLED").length;

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/inventory/products", { ...productForm, costPrice: Number(productForm.costPrice), sellingPrice: Number(productForm.sellingPrice), minStock: Number(productForm.minStock) });
      setIsProductModalOpen(false);
      setProductForm(emptyProduct);
      loadAll();
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/inventory/categories", { ...categoryForm, sortOrder: Number(categoryForm.sortOrder) });
      setIsCategoryModalOpen(false);
      setCategoryForm(emptyCategory);
      loadAll();
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    }
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/inventory/stock-movements", { ...movementForm, quantity: Number(movementForm.quantity) });
      setIsMovementModalOpen(false);
      setMovementForm(emptyMovement);
      loadAll();
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    }
  };

  const tabs = [
    { name: "Dashboard", icon: <Activity size={18} /> },
    { name: "Products Catalog", icon: <Package size={18} /> },
    { name: "Categories", icon: <Layers size={18} /> },
    { name: "Stock Ledger", icon: <RefreshCw size={18} /> },
    { name: "Purchase Order", icon: <ShoppingCart size={18} /> },
    { name: "Low Stock Alerts", icon: <AlertTriangle size={18} /> },
    { name: "Vendor Management", icon: <Users size={18} /> },
  ];

  return (
    <div style={{ display: "flex", flexGrow: 1, minHeight: 0, overflow: "hidden", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR */}
      <div style={{ width: 260, minWidth: 260, background: "#1e293b", color: "white", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", fontSize: "1.1rem", fontWeight: "700", borderBottom: "1px solid #334155", display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={22} color="#3b82f6" />
          Inventory Hub
        </div>
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => {
                setActiveTab(tab.name);
                if (tab.name === "Dashboard") navigate("/admin/inventory");
                if (tab.name === "Products Catalog") navigate("/admin/inventory/products");
                if (tab.name === "Categories") navigate("/admin/inventory/categories");
                if (tab.name === "Stock Ledger") navigate("/admin/inventory/stock-movements");
                if (tab.name === "Low Stock Alerts") navigate("/admin/inventory/low-stock");
                if (tab.name === "Purchase Order") navigate("/admin/purchases/orders");
                if (tab.name === "Vendor Management") navigate("/admin/purchases/vendors");
                }}
              style={{
                display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: "12px 16px",
                border: "none", borderRadius: "8px", background: activeTab === tab.name ? "#334155" : "transparent",
                color: activeTab === tab.name ? "#fff" : "#94a3b8", fontSize: "0.95rem", fontWeight: activeTab === tab.name ? "600" : "500",
                cursor: "pointer", transition: "all 0.2s", textAlign: "left"
              }}
            >
              <div style={{ color: activeTab === tab.name ? "#3b82f6" : "#64748b" }}>{tab.icon}</div>
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flexGrow: 1, overflowY: "auto", padding: "32px", background: "#f1f5f9", position: "relative" }}>
        {loading && <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}><PageLoader title="Loading..." /></div>}
        
        {activeTab === "Dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a", fontWeight: "700" }}>Inventory Dashboard</h2>
            
            {/* Top KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.2)" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Pending PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{pendingOrders}</div>
                </div>
                <ShoppingCart size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Approved PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{approvedOrders}</div>
                </div>
                <CheckCircle size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Rejected PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{rejectedOrders}</div>
                </div>
                <XCircle size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Min Stock Items</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{lowStock.length}</div>
                </div>
                <AlertTriangle size={40} opacity={0.3} />
              </div>
            </div>

            {/* Summary Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#334155" }}>Inventory Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stock In Hand</div>
                    <div style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 700, marginTop: 8 }}>{totalStock.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stock Yet To Be Received</div>
                    <div style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 700, marginTop: 8 }}>0</div>
                  </div>
                </div>
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#334155" }}>Product Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Total Items</div>
                    <div style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 700, marginTop: 8 }}>{products.length}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Active Items</div>
                    <div style={{ fontSize: "1.8rem", color: "#10b981", fontWeight: 700, marginTop: 8 }}>{activeItems}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Inactive Items</div>
                    <div style={{ fontSize: "1.8rem", color: "#ef4444", fontWeight: 700, marginTop: 8 }}>{products.length - activeItems}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Row */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 700 }}>Most Used Consumables</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 24px", fontWeight: 600 }}>Product Name</th>
                    <th style={{ padding: "12px 24px", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "12px 24px", fontWeight: 600 }}>Total Consumed</th>
                    <th style={{ padding: "12px 24px", fontWeight: 600 }}>Date Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 5).map(m => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#334155", fontWeight: 500 }}>{m.product?.name || "-"}</td>
                      <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#334155" }}>{m.movementType}</td>
                      <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{m.quantity}</td>
                      <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#64748b" }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && <tr><td colSpan="4" style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dynamic Tab Implementations */}
        {activeTab !== "Dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a", fontWeight: "700" }}>{activeTab}</h2>
              {activeTab === "Products Catalog" && <button onClick={() => setIsProductModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)" }}><Plus size={18} /> Create Product</button>}
              {activeTab === "Categories" && <button onClick={() => setIsCategoryModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)" }}><Plus size={18} /> Add Category</button>}
              {activeTab === "Stock Ledger" && <button onClick={() => setIsMovementModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.95rem", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)" }}><Plus size={18} /> Record Movement</button>}
            </div>

            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>
                    {activeTab === "Products Catalog" && (
                      <>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Name</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Type</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Category</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Stock</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Selling Price</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                      </>
                    )}
                    {activeTab === "Categories" && (
                      <>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Name</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Description</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Sort Order</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                      </>
                    )}
                    {activeTab === "Stock Ledger" && (
                      <>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Date</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Product</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Movement</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Quantity</th>
                      </>
                    )}
                    {activeTab === "Low Stock Alerts" && (
                      <>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Product</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Category</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600, color: "#ef4444" }}>Current Stock</th>
                        <th style={{ padding: "16px 24px", fontWeight: 600 }}>Min Stock Level</th>
                      </>
                    )}
                    {activeTab === "Purchase Order" && (
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Details</th>
                    )}
                    {activeTab === "Vendor Management" && (
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Details</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "Products Catalog" && products.map(p => (
                    <tr key={p.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{p.name}</td>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{p.productType}</td>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{p.category?.name || "Uncategorized"}</td>
                      <td style={{ padding: "16px 24px", color: "#0f172a", fontWeight: 600 }}>{p.currentStock || 0}</td>
                      <td style={{ padding: "16px 24px", color: "#0f172a" }}>₹{p.sellingPrice}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: p.isActive !== false ? "#dcfce7" : "#fee2e2", color: p.isActive !== false ? "#166534" : "#991b1b" }}>
                          {p.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "Products Catalog" && products.length === 0 && (
                     <tr><td colSpan="6" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No products found. Click "Create Product" to add one.</td></tr>
                  )}

                  {activeTab === "Categories" && categories.map(c => (
                    <tr key={c.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{c.name}</td>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{c.description || "-"}</td>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{c.sortOrder}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: c.isActive !== false ? "#dcfce7" : "#fee2e2", color: c.isActive !== false ? "#166534" : "#991b1b" }}>
                          {c.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeTab === "Categories" && categories.length === 0 && (
                     <tr><td colSpan="4" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No categories found. Click "Add Category" to create one.</td></tr>
                  )}

                  {activeTab === "Stock Ledger" && movements.map(m => (
                    <tr key={m.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString()}</td>
                      <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{m.product?.name || "Unknown Product"}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: m.movementType === "STOCK_IN" ? "#dcfce7" : m.movementType === "STOCK_OUT" ? "#fee2e2" : "#fef3c7", color: m.movementType === "STOCK_IN" ? "#166534" : m.movementType === "STOCK_OUT" ? "#991b1b" : "#92400e" }}>
                          {m.movementType.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", color: "#0f172a", fontWeight: 600 }}>{m.movementType === "STOCK_IN" ? "+" : "-"}{m.quantity}</td>
                    </tr>
                  ))}
                  {activeTab === "Stock Ledger" && movements.length === 0 && (
                     <tr><td colSpan="4" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No stock movements recorded yet.</td></tr>
                  )}

                  {activeTab === "Low Stock Alerts" && lowStock.map(p => (
                    <tr key={p.id} style={{ borderTop: "1px solid #e2e8f0", background: "#fef2f2" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{p.name}</td>
                      <td style={{ padding: "16px 24px", color: "#64748b", fontSize: "0.9rem" }}>{p.category?.name || "Uncategorized"}</td>
                      <td style={{ padding: "16px 24px", color: "#dc2626", fontWeight: 700 }}>{p.currentStock || 0}</td>
                      <td style={{ padding: "16px 24px", color: "#0f172a", fontWeight: 600 }}>{p.minStock || 0}</td>
                    </tr>
                  ))}
                  {activeTab === "Low Stock Alerts" && lowStock.length === 0 && (
                     <tr><td colSpan="4" style={{ padding: 32, textAlign: "center", color: "#10b981", fontWeight: 500 }}><CheckCircle size={48} style={{ opacity: 0.5, marginBottom: 16 }} /><br/>All products have sufficient stock levels!</td></tr>
                  )}

                  {activeTab === "Purchase Order" && (
                     <tr>
                        <td colSpan="6">
                          <div style={{ padding: "48px 32px", textAlign: "center" }}>
                            <Layers size={64} color="#cbd5e1" style={{ marginBottom: 16 }} />
                            <h2 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>{activeTab} Coming Soon</h2>
                            <p style={{ color: "#64748b", maxWidth: 400, margin: "0 auto" }}>This module is currently being re-designed and will be available in the next phase of the update.</p>
                          </div>
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODALS - SLIDE PANELS */}
      <style>{`
        .slide-panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); z-index: 1000; backdrop-filter: blur(2px); }
        .slide-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 450px; background: #fff; z-index: 1050; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.1); transform: translateX(100%); animation: slideIn 0.3s forwards; }
        @keyframes slideIn { to { transform: translateX(0); } }
        .sp-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
        .sp-header h3 { margin: 0; font-size: 1.2rem; color: #0f172a; font-weight: 700; }
        .sp-close { background: #f1f5f9; border: none; border-radius: 50%; padding: 8px; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .sp-close:hover { background: #e2e8f0; color: #0f172a; }
        .sp-body { flex-grow: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; background: #f8fafc; }
        .sp-group { display: flex; flex-direction: column; gap: 6px; }
        .sp-label { font-size: 0.85rem; font-weight: 600; color: #475569; }
        .sp-input { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; background: white; transition: all 0.2s; }
        .sp-input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .sp-btn { padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.2s; margin-top: 10px; }
        .sp-btn:hover { background: #2563eb; }
      `}</style>

      {isProductModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" onClick={() => setIsProductModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>Create Product</h3>
            </div>
            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div className="sp-body">
                {status.error && <div style={{ color: '#ef4444', padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: '0.9rem' }}>{status.error}</div>}
                <div className="sp-group">
                  <label className="sp-label">Product Name</label>
                  <input className="sp-input" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="E.g., L'Oreal Shampoo" />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Type</label>
                  <select className="sp-input" value={productForm.productType} onChange={e => setProductForm({...productForm, productType: e.target.value})}>
                    <option value="RETAIL">Retail</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="sp-group">
                    <label className="sp-label">Cost Price (₹)</label>
                    <input type="number" className="sp-input" required value={productForm.costPrice} onChange={e => setProductForm({...productForm, costPrice: e.target.value})} />
                  </div>
                  <div className="sp-group">
                    <label className="sp-label">Selling Price (₹)</label>
                    <input type="number" className="sp-input" required value={productForm.sellingPrice} onChange={e => setProductForm({...productForm, sellingPrice: e.target.value})} />
                  </div>
                </div>
                <div className="sp-group">
                  <label className="sp-label">Category</label>
                  <select className="sp-input" value={productForm.categoryId} onChange={e => setProductForm({...productForm, categoryId: e.target.value})}>
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", background: "white" }}>
                <button type="submit" className="sp-btn">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsCategoryModalOpen(false)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" onClick={() => setIsCategoryModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>Create Category</h3>
            </div>
            <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div className="sp-body">
                {status.error && <div style={{ color: '#ef4444', padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: '0.9rem' }}>{status.error}</div>}
                <div className="sp-group">
                  <label className="sp-label">Category Name</label>
                  <input className="sp-input" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="E.g., Hair Care" />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Description</label>
                  <textarea className="sp-input" rows="4" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} placeholder="Short description" />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", background: "white" }}>
                <button type="submit" className="sp-btn">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMovementModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsMovementModalOpen(false)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" onClick={() => setIsMovementModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>Record Stock Movement</h3>
            </div>
            <form onSubmit={handleMovementSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div className="sp-body">
                {status.error && <div style={{ color: '#ef4444', padding: 12, background: '#fef2f2', borderRadius: 8, fontSize: '0.9rem' }}>{status.error}</div>}
                <div className="sp-group">
                  <label className="sp-label">Product</label>
                  <select className="sp-input" required value={movementForm.productId} onChange={e => setMovementForm({...movementForm, productId: e.target.value})}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="sp-group">
                  <label className="sp-label">Movement Type</label>
                  <select className="sp-input" value={movementForm.movementType} onChange={e => setMovementForm({...movementForm, movementType: e.target.value})}>
                    <option value="STOCK_IN">Stock In</option>
                    <option value="STOCK_OUT">Stock Out</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div className="sp-group">
                  <label className="sp-label">Quantity</label>
                  <input type="number" className="sp-input" required value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", background: "white" }}>
                <button type="submit" className="sp-btn">Save Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
