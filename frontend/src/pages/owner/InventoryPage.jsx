import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyCategory = { name: "", description: "", imageUrl: "", sortOrder: 0, isPublicVisible: true };
const emptyProduct = { branchId: "", categoryId: "", name: "", productType: "RETAIL", costPrice: 0, sellingPrice: 0, minStock: 0, sku: "", barcode: "", imageUrl: "" };
const emptyMovement = { productId: "", branchId: "", movementType: "STOCK_IN", quantity: 1, note: "" };
const emptyVendor = { branchId: "", name: "", phone: "", email: "", address: "", notes: "" };
const emptyOrder = { branchId: "", vendorId: "", notes: "", items: [{ productId: "", quantityOrdered: 1, unitCost: 0, expiryDate: "" }] };
const emptyTransfer = { fromBranchId: "", toBranchId: "", note: "", items: [{ productId: "", quantity: 1 }] };
const emptyRecon = { branchId: "", note: "", items: [{ productId: "", physicalStock: 0 }] };

export default function InventoryPage() {
  const location = useLocation();
  const { id: routeId } = useParams();
  const productEditMode = location.pathname.includes("/inventory/products/") && location.pathname.includes("/edit");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [branches, setBranches] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [productDirty, setProductDirty] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [reconForm, setReconForm] = useState(emptyRecon);
  const [branchFilter, setBranchFilter] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const productParams = {
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(productQuery ? { q: productQuery } : {}),
      ...(categoryFilter ? { categoryId: categoryFilter } : {})
    };
    const movementParams = {
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(movementTypeFilter ? { movementType: movementTypeFilter } : {})
    };
    const [categoriesResponse, productsResponse, movementsResponse, lowStockResponse, branchesResponse, vendorsResponse, ordersResponse] = await Promise.all([
      api.get("/owner/inventory/categories"),
      api.get("/owner/inventory/products", { params: productParams }),
      api.get("/owner/inventory/stock-movements", { params: movementParams }),
      api.get("/owner/inventory/low-stock", { params: productParams }),
      api.get("/owner/branches"),
      api.get("/owner/purchases/vendors"),
      api.get("/owner/purchases/orders")
    ]);
    setCategories(categoriesResponse.data);
    setProducts(productsResponse.data);
    setMovements(movementsResponse.data);
    setLowStock(lowStockResponse.data);
    setBranches(branchesResponse.data);
    setVendors(vendorsResponse.data);
    setOrders(ordersResponse.data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const productParams = {
        ...(branchFilter ? { branchId: branchFilter } : {}),
        ...(productQuery ? { q: productQuery } : {}),
        ...(categoryFilter ? { categoryId: categoryFilter } : {})
      };
      const movementParams = {
        ...(branchFilter ? { branchId: branchFilter } : {}),
        ...(movementTypeFilter ? { movementType: movementTypeFilter } : {})
      };
      const [categoriesResponse, productsResponse, movementsResponse, lowStockResponse, branchesResponse, vendorsResponse, ordersResponse] = await Promise.all([
        api.get("/owner/inventory/categories"),
        api.get("/owner/inventory/products", { params: productParams }),
        api.get("/owner/inventory/stock-movements", { params: movementParams }),
        api.get("/owner/inventory/low-stock", { params: productParams }),
        api.get("/owner/branches"),
        api.get("/owner/purchases/vendors"),
        api.get("/owner/purchases/orders")
      ]);
      if (!active) return;
      setCategories(categoriesResponse.data);
      setProducts(productsResponse.data);
      setMovements(movementsResponse.data);
      setLowStock(lowStockResponse.data);
      setBranches(branchesResponse.data);
      setVendors(vendorsResponse.data);
      setOrders(ordersResponse.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [branchFilter, categoryFilter, movementTypeFilter, productQuery]);

  const visibleProducts = products;
  const visibleLowStock = lowStock;
  const visibleMovements = movements;
  const purchaseSection = useMemo(() => {
    if (location.pathname.includes("/purchases/orders")) return "orders";
    if (location.pathname.includes("/purchases/transfers")) return "transfers";
    if (location.pathname.includes("/purchases/reconciliation")) return "reconciliation";
    return "vendors";
  }, [location.pathname]);
  const routeProduct = useMemo(() => {
    if (!productEditMode || !routeId) return null;
    return products.find((item) => item.id === routeId) || null;
  }, [productEditMode, products, routeId]);
  const effectiveProductForm = routeProduct && !productDirty ? {
    branchId: routeProduct.branchId || "",
    categoryId: routeProduct.categoryId || "",
    name: routeProduct.name || "",
    productType: routeProduct.productType || "RETAIL",
    costPrice: routeProduct.costPrice || 0,
    sellingPrice: routeProduct.sellingPrice || 0,
    minStock: routeProduct.minStock || 0,
    sku: routeProduct.sku || "",
    barcode: routeProduct.barcode || "",
    imageUrl: routeProduct.imageUrl || ""
  } : productForm;
  const updateProductForm = (patch) => {
    setProductDirty(true);
    setProductForm((current) => ({ ...current, ...patch }));
  };

  const section = location.pathname.includes("/products")
    ? "products"
    : location.pathname.includes("/categories")
      ? "categories"
      : location.pathname.includes("/stock-movements")
        ? "movements"
        : location.pathname.includes("/low-stock")
          ? "low-stock"
          : location.pathname.includes("/purchases/")
            ? "purchases"
            : "overview";

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Inventory"
        description="Manage stock categories, product catalog, movements, procurement, receiving, transfers, and low stock visibility from one workspace."
        items={[
          { label: "Overview", to: "/admin/inventory", hint: "Summary" },
          { label: "Products", to: "/admin/inventory/products", hint: "Catalog" },
          { label: "Create Product", to: "/admin/inventory/products/create", hint: "New" },
          { label: "Categories", to: "/admin/inventory/categories", hint: "Structure" },
          { label: "Stock Movements", to: "/admin/inventory/stock-movements", hint: "Ledger" },
          { label: "Low Stock", to: "/admin/inventory/low-stock", hint: "Alerts" },
          { label: "Purchases", to: "/admin/purchases/vendors", hint: "Procurement" }
        ]}
        actions={(
          <>
            <label>
              <span className="muted">Search inventory</span>
              <input value={productQuery} placeholder="Search product, SKU, or barcode" onChange={(event) => setProductQuery(event.target.value)} />
            </label>
            <label>
              <span className="muted">Branch filter</span>
              <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option value="">All branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Category filter</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Movement type filter</span>
              <select value={movementTypeFilter} onChange={(event) => setMovementTypeFilter(event.target.value)}>
                <option value="">All movement types</option>
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="PURCHASE_RECEIVED">Purchase Received</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
                <option value="CONSUMABLE_USAGE">Consumable Usage</option>
                <option value="PRODUCT_RETURN">Product Return</option>
              </select>
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setProductQuery("");
                setBranchFilter("");
                setCategoryFilter("");
                setMovementTypeFilter("");
              }}
            >
              Reset Filters
            </button>
          </>
        )}
      />

      <div className="three-col">
        {(section === "overview" || section === "categories") && <div className="panel-card">
          <h3>Categories</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (editingCategoryId) {
              await api.patch(`/owner/inventory/categories/${editingCategoryId}`, { ...categoryForm, sortOrder: Number(categoryForm.sortOrder || 0) });
            } else {
              await api.post("/owner/inventory/categories", { ...categoryForm, sortOrder: Number(categoryForm.sortOrder || 0) });
            }
            setCategoryForm(emptyCategory);
            setEditingCategoryId("");
            await loadAll();
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Category name</span>
              <input value={categoryForm.name} placeholder="Category name" onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Category sort order</span>
              <input type="number" min="0" value={categoryForm.sortOrder} placeholder="0" onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Category description</span>
              <textarea rows="3" value={categoryForm.description} placeholder="Short description for the public website category page" onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Category image URL</span>
              <input value={categoryForm.imageUrl} placeholder="Category image URL" onChange={(event) => setCategoryForm((current) => ({ ...current, imageUrl: event.target.value }))} />
            </label>
            <div className="summary-box" style={{ gridColumn: "1 / -1" }}>
              <strong>Category image upload</strong>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <label className="secondary-button" style={{ cursor: "pointer" }}>
                  Upload Category Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("image", file);
                      setStatus({ error: "", success: "Uploading category image..." });
                      try {
                        const { data } = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                        setCategoryForm((current) => ({ ...current, imageUrl: data.url }));
                        setStatus({ error: "", success: "Category image uploaded successfully." });
                      } catch {
                        setStatus({ error: "Failed to upload category image.", success: "" });
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <label className="badge" style={{ width: "fit-content" }}>
              <input type="checkbox" checked={Boolean(categoryForm.isPublicVisible)} onChange={(event) => setCategoryForm((current) => ({ ...current, isPublicVisible: event.target.checked }))} /> Show this category on public website
            </label>
            <div className="inline-actions">
              <button>{editingCategoryId ? "Save Category" : "Add Category"}</button>
              {editingCategoryId ? <button type="button" className="secondary-button" onClick={() => { setEditingCategoryId(""); setCategoryForm(emptyCategory); }}>Cancel Edit</button> : null}
            </div>
          </form>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {categories.map((item) => (
              <div key={item.id} className="list-item">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 14 }} /> : null}
                  <div>
                    <strong>{item.name}</strong>
                    <div className="item-meta">{item.description || "No category description yet"}</div>
                    <div className="badge-row">
                      <span className="badge">Order {item.sortOrder || 0}</span>
                      <span className="badge">{item.isPublicVisible !== false ? "Public Visible" : "Public Hidden"}</span>
                      <span className={`badge ${item.isActive === false ? "badge-cancelled" : ""}`}>{item.isActive === false ? "Archived" : "Active"}</span>
                    </div>
                  </div>
                </div>
                <div className="inline-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setEditingCategoryId(item.id);
                      setCategoryForm({
                        name: item.name || "",
                        description: item.description || "",
                        imageUrl: item.imageUrl || "",
                        sortOrder: item.sortOrder || 0,
                        isPublicVisible: item.isPublicVisible !== false
                      });
                    }}
                  >
                    Edit
                  </button>
                  {item.isActive !== false ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={async () => {
                        await api.patch(`/owner/inventory/categories/${item.id}/archive`);
                        if (editingCategoryId === item.id) {
                          setEditingCategoryId("");
                          setCategoryForm(emptyCategory);
                        }
                        await loadAll();
                      }}
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {!categories.length ? <EmptyState title="No categories yet" message="Create product categories here and publish the right ones to the public storefront." /> : null}
          </div>
        </div>}

        {(section === "overview" || section === "products") && <div className="panel-card">
          <h3>{productEditMode ? "Edit Product" : "Product"}</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            const payload = { ...effectiveProductForm, costPrice: Number(effectiveProductForm.costPrice), sellingPrice: Number(effectiveProductForm.sellingPrice), minStock: Number(effectiveProductForm.minStock) };
            if (productEditMode && routeId) {
              await api.patch(`/owner/inventory/products/${routeId}`, payload);
            } else {
              await api.post("/owner/inventory/products", payload);
            }
            setProductForm(emptyProduct);
            setProductDirty(false);
            await loadAll();
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Branch</span>
              <select value={effectiveProductForm.branchId} onChange={(event) => updateProductForm({ branchId: event.target.value })}>
                <option value="">All branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Category</span>
              <select value={effectiveProductForm.categoryId} onChange={(event) => updateProductForm({ categoryId: event.target.value })}>
                <option value="">No category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Product name</span>
              <input value={effectiveProductForm.name} placeholder="Product name" onChange={(event) => updateProductForm({ name: event.target.value })} />
            </label>
            <label>
              <span className="muted">SKU</span>
              <input value={effectiveProductForm.sku} placeholder="SKU" onChange={(event) => updateProductForm({ sku: event.target.value })} />
            </label>
            <label>
              <span className="muted">Barcode</span>
              <input value={effectiveProductForm.barcode} placeholder="Barcode" onChange={(event) => updateProductForm({ barcode: event.target.value })} />
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="muted" style={{ minWidth: 100 }}>Product image</span>
              <input type="file" accept="image/*" onChange={async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("image", file);
                setStatus({ error: "", success: "Uploading image..." });
                try {
                  const { data } = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                  updateProductForm({ imageUrl: data.url });
                  setStatus({ error: "", success: "Image uploaded successfully." });
                } catch {
                  setStatus({ error: "Failed to upload image.", success: "" });
                }
              }} />
            </div>
            <label>
              <span className="muted">Product type</span>
              <select value={effectiveProductForm.productType} onChange={(event) => updateProductForm({ productType: event.target.value })}>
                <option value="RETAIL">Retail</option>
                <option value="CONSUMABLE">Consumable</option>
              </select>
            </label>
            <label>
              <span className="muted">Cost price</span>
              <input type="number" min="0" value={effectiveProductForm.costPrice} placeholder="Cost price" onChange={(event) => updateProductForm({ costPrice: event.target.value })} />
            </label>
            <label>
              <span className="muted">Selling price</span>
              <input type="number" min="0" value={effectiveProductForm.sellingPrice} placeholder="Selling price" onChange={(event) => updateProductForm({ sellingPrice: event.target.value })} />
            </label>
            <label>
              <span className="muted">Minimum stock</span>
              <input type="number" min="0" value={effectiveProductForm.minStock} placeholder="Minimum stock" onChange={(event) => updateProductForm({ minStock: event.target.value })} />
            </label>
            {effectiveProductForm.imageUrl ? (
              <div className="list-item" style={{ gridColumn: "1 / -1" }}>
                <strong style={{ marginBottom: 8, display: "block" }}>Image Preview</strong>
                <img
                  src={effectiveProductForm.imageUrl}
                  alt={effectiveProductForm.name || "Product preview"}
                  style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 16, border: "1px solid var(--border-color)" }}
                />
              </div>
            ) : null}
            <button>{productEditMode ? "Save Product" : "Add Product"}</button>
          </form>
          {productEditMode && (
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <Link to="/admin/inventory/products" className="cta-secondary">Back to Products</Link>
            </div>
          )}
        </div>}

        {(section === "overview" || section === "movements") && <div className="panel-card">
          <h3>Stock Movement</h3>
          <form onSubmit={async (event) => {
            event.preventDefault();
            await api.post("/owner/inventory/stock-movements", { ...movementForm, quantity: Number(movementForm.quantity) });
            setMovementForm(emptyMovement);
            await loadAll();
          }} style={{ display: "grid", gap: 10 }}>
            <label>
              <span className="muted">Product</span>
              <select value={movementForm.productId} onChange={(event) => setMovementForm((current) => ({ ...current, productId: event.target.value }))}>
                <option value="">Select product</option>
                {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Branch</span>
              <select value={movementForm.branchId} onChange={(event) => setMovementForm((current) => ({ ...current, branchId: event.target.value }))}>
                <option value="">Auto branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              <span className="muted">Movement type</span>
              <select value={movementForm.movementType} onChange={(event) => setMovementForm((current) => ({ ...current, movementType: event.target.value }))}>
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="PRODUCT_RETURN">Product Return</option>
                <option value="CONSUMABLE_USAGE">Consumable Usage</option>
              </select>
            </label>
            <label>
              <span className="muted">Quantity</span>
              <input type="number" min="1" value={movementForm.quantity} onChange={(event) => setMovementForm((current) => ({ ...current, quantity: event.target.value }))} />
            </label>
            <label>
              <span className="muted">Movement note</span>
              <input value={movementForm.note} placeholder="Movement note" onChange={(event) => setMovementForm((current) => ({ ...current, note: event.target.value }))} />
            </label>
            <button>Save Movement</button>
          </form>
        </div>}
      </div>

      <div className="two-col" style={{ marginTop: 18 }}>
      {(section === "overview" || section === "products" || section === "purchases") && <div className="panel-card">
          <h3>Products</h3>
          {loading ? <PageLoader compact title="Loading products" message="Refreshing product catalog, stock counts, and procurement context." /> : null}
          <div className="list-stack">
            {visibleProducts.map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{item.name}</strong>
                  <span className="badge">{Number(item.currentStock || 0).toFixed(2)}</span>
                </div>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border-color)", marginTop: 10 }}
                  />
                ) : null}
                <div className="item-meta">{item.category?.name || "No category"} | {item.branch?.name || "Shared"} | {item.productType}</div>
                <div className="inline-actions" style={{ marginTop: 10 }}>
                  <Link to={`/admin/inventory/products/${item.id}/edit`} className="cta-secondary">Edit</Link>
                </div>
              </div>
            ))}
            {!loading && !visibleProducts.length && <EmptyState title="No products found" message="No products matched the current search or inventory filters." />}
          </div>
        </div>}

        {(section === "overview" || section === "low-stock") && <div className="panel-card">
          <h3>Low Stock</h3>
          <div className="list-stack">
            {visibleLowStock.map((item) => (
              <div key={item.id} className="list-item">
                <div className="item-head">
                  <strong>{item.name}</strong>
                  <span className="badge badge-cancelled">{Number(item.currentStock || 0).toFixed(2)}</span>
                </div>
                <div className="item-meta">Minimum {Number(item.minStock || 0).toFixed(2)}</div>
              </div>
            ))}
            {!loading && !visibleLowStock.length && <EmptyState title="No low stock products" message="Inventory health looks good for the current branch and category filter." />}
          </div>
        </div>}
      </div>

      {(section === "overview" || section === "movements" || section === "purchases") && <div className="panel-card" style={{ marginTop: 18 }}>
        <h3>Stock Ledger</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Movement</th>
                <th>Qty</th>
                <th>Before</th>
                <th>After</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {visibleMovements.map((row) => (
                <tr key={row.id}>
                  <td>{row.product?.name}</td>
                  <td>{row.movementType}</td>
                  <td>{Number(row.quantity || 0).toFixed(2)}</td>
                  <td>{Number(row.stockBefore || 0).toFixed(2)}</td>
                  <td>{Number(row.stockAfter || 0).toFixed(2)}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {(section === "overview" || section === "purchases") && (
        <div className="three-col" style={{ marginTop: 18 }}>
          <div className="panel-card">
            <h3>Warehouse & In-Transit</h3>
            <p className="muted">Warehouse transfer and in-transit stock are kept as Phase 2 placeholders with clean UI visibility. Current live branch transfer flow is active; warehouse leg can be layered on top without breaking today’s stock ledger.</p>
            <div className="badge-row">
              <span className="badge">Warehouse Transfer Placeholder</span>
              <span className="badge">In-Transit Placeholder</span>
            </div>
          </div>
          <div className="panel-card">
            <h3>Barcode & Receiving</h3>
            <p className="muted">Products already support barcode fields and purchase receiving is live. Barcode-assisted receiving remains a guided placeholder so teams can keep the data model ready without adding unstable scanner logic in this phase.</p>
            <div className="badge-row">
              <span className="badge">Barcode Field Ready</span>
              <span className="badge">Receiving Live</span>
            </div>
          </div>
          <div className="panel-card">
            <h3>Consumables & Variance</h3>
            <p className="muted">Consumable usage movements and reconciliation are active. Service-linked consumable templates and advanced variance analytics stay isolated placeholders for the next phase, while current stock variance already lands in reconciliation movement history.</p>
            <div className="badge-row">
              <span className="badge">Consumable Usage Live</span>
              <span className="badge">Variance Placeholder</span>
            </div>
          </div>
        </div>
      )}

      {section === "purchases" && (
        <>
          <div className="module-tabs" style={{ marginBottom: 18 }}>
            {[
              { key: "vendors", label: "Vendors", to: "/admin/purchases/vendors", hint: "Suppliers" },
              { key: "orders", label: "Orders", to: "/admin/purchases/orders", hint: "Procurement" },
              { key: "transfers", label: "Transfers", to: "/admin/purchases/transfers", hint: "Branches" },
              { key: "reconciliation", label: "Reconciliation", to: "/admin/purchases/reconciliation", hint: "Audit" }
            ].map((item) => (
              <NavLink key={item.key} to={item.to} className={`module-tab ${purchaseSection === item.key ? "active" : ""}`}>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </NavLink>
            ))}
          </div>

          <div className="three-col" style={{ marginTop: 18 }}>
            {(purchaseSection === "vendors" || purchaseSection === "orders") && <div className="panel-card">
              <h3>Vendor</h3>
              <form onSubmit={async (event) => {
                event.preventDefault();
                setStatus({ error: "", success: "" });
                try {
                  await api.post("/owner/purchases/vendors", { ...vendorForm, branchId: vendorForm.branchId || null });
                  setVendorForm(emptyVendor);
                  await loadAll();
                  setStatus({ error: "", success: "Vendor saved." });
                } catch (error) {
                  setStatus({ error: formatApiError(error, "Could not save vendor"), success: "" });
                }
              }} style={{ display: "grid", gap: 10 }}>
                <label>
                  <span className="muted">Branch</span>
                  <select value={vendorForm.branchId} onChange={(event) => setVendorForm((current) => ({ ...current, branchId: event.target.value }))}>
                    <option value="">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="muted">Vendor name</span>
                  <input value={vendorForm.name} placeholder="Vendor name" onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label>
                  <span className="muted">Phone</span>
                  <input value={vendorForm.phone} placeholder="Phone" onChange={(event) => setVendorForm((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label>
                  <span className="muted">Email</span>
                  <input value={vendorForm.email} placeholder="Email" onChange={(event) => setVendorForm((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label>
                  <span className="muted">Address</span>
                  <input value={vendorForm.address} placeholder="Address" onChange={(event) => setVendorForm((current) => ({ ...current, address: event.target.value }))} />
                </label>
                <label>
                  <span className="muted">Notes</span>
                  <textarea rows="3" value={vendorForm.notes} placeholder="Notes" onChange={(event) => setVendorForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <button>Save Vendor</button>
              </form>
            </div>}

            {(purchaseSection === "orders" || purchaseSection === "vendors") && <div className="panel-card">
              <h3>Purchase Order</h3>
              <form onSubmit={async (event) => {
                event.preventDefault();
                setStatus({ error: "", success: "" });
                try {
                  await api.post("/owner/purchases/orders", {
                    ...orderForm,
                    items: orderForm.items.map((item) => ({
                      ...item,
                      quantityOrdered: Number(item.quantityOrdered),
                      unitCost: Number(item.unitCost),
                      expiryDate: item.expiryDate || undefined
                    }))
                  });
                  setOrderForm(emptyOrder);
                  await loadAll();
                  setStatus({ error: "", success: "Purchase order created." });
                } catch (error) {
                  setStatus({ error: formatApiError(error, "Could not create order"), success: "" });
                }
              }} style={{ display: "grid", gap: 10 }}>
                <select value={orderForm.branchId} onChange={(event) => setOrderForm((current) => ({ ...current, branchId: event.target.value }))}>
                  <option value="">Select branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                <select value={orderForm.vendorId} onChange={(event) => setOrderForm((current) => ({ ...current, vendorId: event.target.value }))}>
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
                {orderForm.items.map((item, index) => (
                  <div key={`po-item-${index}`} className="list-item">
                    <div className="form-grid">
                      <select value={item.productId} onChange={(event) => {
                        const next = [...orderForm.items];
                        next[index] = { ...next[index], productId: event.target.value };
                        setOrderForm((current) => ({ ...current, items: next }));
                      }}>
                        <option value="">Select product</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                      <input type="number" min="1" value={item.quantityOrdered} onChange={(event) => {
                        const next = [...orderForm.items];
                        next[index] = { ...next[index], quantityOrdered: event.target.value };
                        setOrderForm((current) => ({ ...current, items: next }));
                      }} />
                      <input type="number" min="0" value={item.unitCost} onChange={(event) => {
                        const next = [...orderForm.items];
                        next[index] = { ...next[index], unitCost: event.target.value };
                        setOrderForm((current) => ({ ...current, items: next }));
                      }} />
                      <input type="date" value={item.expiryDate} onChange={(event) => {
                        const next = [...orderForm.items];
                        next[index] = { ...next[index], expiryDate: event.target.value };
                        setOrderForm((current) => ({ ...current, items: next }));
                      }} />
                    </div>
                  </div>
                ))}
                <button type="button" className="secondary-button" onClick={() => setOrderForm((current) => ({ ...current, items: [...current.items, { productId: "", quantityOrdered: 1, unitCost: 0, expiryDate: "" }] }))}>
                  Add Order Row
                </button>
                <textarea rows="3" value={orderForm.notes} placeholder="Order notes" onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} />
                <button>Create Order</button>
              </form>
            </div>}

            {purchaseSection === "transfers" && <div className="panel-card">
              <h3>Stock Transfer</h3>
              <form onSubmit={async (event) => {
                event.preventDefault();
                setStatus({ error: "", success: "" });
                try {
                  await api.post("/owner/purchases/transfers", {
                    ...transferForm,
                    items: transferForm.items.map((item) => ({ ...item, quantity: Number(item.quantity) }))
                  });
                  setTransferForm(emptyTransfer);
                  await loadAll();
                  setStatus({ error: "", success: "Branch transfer posted." });
                } catch (error) {
                  setStatus({ error: formatApiError(error, "Could not create transfer"), success: "" });
                }
              }} style={{ display: "grid", gap: 10 }}>
                <select value={transferForm.fromBranchId} onChange={(event) => setTransferForm((current) => ({ ...current, fromBranchId: event.target.value }))}>
                  <option value="">From branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                <select value={transferForm.toBranchId} onChange={(event) => setTransferForm((current) => ({ ...current, toBranchId: event.target.value }))}>
                  <option value="">To branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                {transferForm.items.map((item, index) => (
                  <div key={`transfer-item-${index}`} className="form-grid">
                    <select value={item.productId} onChange={(event) => {
                      const next = [...transferForm.items];
                      next[index] = { ...next[index], productId: event.target.value };
                      setTransferForm((current) => ({ ...current, items: next }));
                    }}>
                      <option value="">Select product</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantity} onChange={(event) => {
                      const next = [...transferForm.items];
                      next[index] = { ...next[index], quantity: event.target.value };
                      setTransferForm((current) => ({ ...current, items: next }));
                    }} />
                  </div>
                ))}
                <button type="button" className="secondary-button" onClick={() => setTransferForm((current) => ({ ...current, items: [...current.items, { productId: "", quantity: 1 }] }))}>
                  Add Transfer Row
                </button>
                <textarea rows="3" value={transferForm.note} placeholder="Transfer note" onChange={(event) => setTransferForm((current) => ({ ...current, note: event.target.value }))} />
                <button>Create Transfer</button>
              </form>
            </div>}
          </div>

          <div className="two-col" style={{ marginTop: 18 }}>
            {purchaseSection === "reconciliation" && <div className="panel-card">
              <h3>Reconciliation</h3>
              <form onSubmit={async (event) => {
                event.preventDefault();
                setStatus({ error: "", success: "" });
                try {
                  await api.post("/owner/purchases/reconciliation", {
                    ...reconForm,
                    items: reconForm.items.map((item) => ({ ...item, physicalStock: Number(item.physicalStock) }))
                  });
                  setReconForm(emptyRecon);
                  await loadAll();
                  setStatus({ error: "", success: "Reconciliation posted." });
                } catch (error) {
                  setStatus({ error: formatApiError(error, "Could not reconcile stock"), success: "" });
                }
              }} style={{ display: "grid", gap: 10 }}>
                <select value={reconForm.branchId} onChange={(event) => setReconForm((current) => ({ ...current, branchId: event.target.value }))}>
                  <option value="">Select branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
                {reconForm.items.map((item, index) => (
                  <div key={`recon-item-${index}`} className="form-grid">
                    <select value={item.productId} onChange={(event) => {
                      const next = [...reconForm.items];
                      next[index] = { ...next[index], productId: event.target.value };
                      setReconForm((current) => ({ ...current, items: next }));
                    }}>
                      <option value="">Select product</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    <input type="number" min="0" value={item.physicalStock} onChange={(event) => {
                      const next = [...reconForm.items];
                      next[index] = { ...next[index], physicalStock: event.target.value };
                      setReconForm((current) => ({ ...current, items: next }));
                    }} />
                  </div>
                ))}
                <button type="button" className="secondary-button" onClick={() => setReconForm((current) => ({ ...current, items: [...current.items, { productId: "", physicalStock: 0 }] }))}>
                  Add Reconciliation Row
                </button>
                <textarea rows="3" value={reconForm.note} placeholder="Reconciliation note" onChange={(event) => setReconForm((current) => ({ ...current, note: event.target.value }))} />
                <button>Post Reconciliation</button>
              </form>
            </div>}

            <div className="panel-card">
              <h3>
                {purchaseSection === "vendors" && "Vendor Directory"}
                {purchaseSection === "orders" && "Purchase Orders"}
                {purchaseSection === "transfers" && "Transfer Snapshot"}
                {purchaseSection === "reconciliation" && "Recent Orders & Audit Context"}
              </h3>
              {(purchaseSection === "vendors" || purchaseSection === "orders" || purchaseSection === "reconciliation") && <div className="list-stack">
              {vendors.map((vendor) => (
                  <div key={vendor.id} className="list-item">
                    <strong>{vendor.name}</strong>
                    <div className="item-meta">{vendor.phone || "No phone"} | {vendor.email || "No email"}</div>
                  </div>
              ))}
                {!loading && !vendors.length && <EmptyState title="No vendors yet" message="Add suppliers here to start purchase order and receiving workflows." />}
              </div>}
              {(purchaseSection === "orders" || purchaseSection === "reconciliation") && <div className="list-stack" style={{ marginTop: 14 }}>
                {orders.map((order) => (
                  <div key={order.id} className="list-item">
                    <div className="item-head">
                      <strong>{order.orderNumber}</strong>
                      <span className="badge">{order.status}</span>
                    </div>
                    <div className="item-meta">{order.vendor?.name} | {order.branch?.name || "Branch"} | Cost {Number(order.totalCost || 0).toFixed(2)}</div>
                    <div className="badge-row">
                      {(order.items || []).map((item) => <span key={item.id} className="badge">{item.product?.name} x {item.quantityOrdered}</span>)}
                    </div>
                    {order.status !== "RECEIVED" && (
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ marginTop: 10 }}
                        onClick={async () => {
                          setStatus({ error: "", success: "" });
                          try {
                            await api.post(`/owner/purchases/orders/${order.id}/receive`, {
                              items: order.items.map((item) => ({
                                purchaseOrderItemId: item.id,
                                quantityReceived: Math.max(0, Number(item.quantityOrdered || 0) - Number(item.quantityReceived || 0))
                              })).filter((item) => item.quantityReceived > 0)
                            });
                            await loadAll();
                            setStatus({ error: "", success: `Goods received for ${order.orderNumber}.` });
                          } catch (error) {
                            setStatus({ error: formatApiError(error, "Could not receive goods"), success: "" });
                          }
                        }}
                      >
                        Receive Remaining Goods
                      </button>
                    )}
                  </div>
                ))}
                {!loading && !orders.length && <EmptyState title="No purchase orders yet" message="Create your first order to start procurement and receiving history." />}
              </div>}
              {purchaseSection === "transfers" && (
                <div className="list-stack">
                  {visibleMovements.filter((row) => ["TRANSFER_IN", "TRANSFER_OUT"].includes(row.movementType)).slice(0, 10).map((row) => (
                    <div key={row.id} className="list-item">
                      <strong>{row.product?.name}</strong>
                      <div className="item-meta">{row.movementType} | Qty {Number(row.quantity || 0).toFixed(2)} | {new Date(row.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                  {!loading && !visibleMovements.some((row) => ["TRANSFER_IN", "TRANSFER_OUT"].includes(row.movementType)) && <EmptyState title="No transfer movements yet" message="Branch transfer history will appear here once stock is moved between outlets." />}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {(status.error || status.success) && (
        <div className="panel-card" style={{ marginTop: 18 }}>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>
      )}
    </div>
  );
}

