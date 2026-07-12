import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { useBranch } from "../../context/BranchContext";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import VendorManagement from "./VendorManagement";
import IndianPhoneInput from "../../components/IndianPhoneInput";
import { Package, Search, ShoppingCart, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Tag, Layers, RefreshCw, Users, FileText, Activity, Plus, Trash2, ChevronDown, Save, Upload, Download } from "lucide-react";
import "./InventoryPage.css";

const emptyCategory = { name: "", description: "", imageUrl: "", sortOrder: 0, isPublicVisible: true };
const emptyProduct = { branchId: "", categoryId: "", name: "", productType: "RETAIL", costPrice: 0, sellingPrice: 0, currentStock: 0, minStock: 0, sku: "", barcode: "", imageUrl: "" };
const emptyMovement = { productId: "", branchId: "", movementType: "STOCK_IN", quantity: 1, note: "" };
const emptyVendor = { branchId: "", name: "", phone: "", email: "", address: "", notes: "" };
const createEmptyPoItem = () => ({ productId: "", quantityOrdered: 1, unitCost: 0 });

const getInventoryTabFromPath = (path) => {
  if (path.includes("/approval")) return "Approval";
  if (path.includes("/reconciliation")) return "Stock Reconciliation";
  if (path.includes("/purchases/vendors")) return "Vendor Management";
  if (path.includes("/purchases/orders")) return "Purchase Order";
  return "Dashboard";
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatMoney } = useSalonSettings();
  const { selectedBranchId } = useBranch();

  const [activeTab, setActiveTab] = useState(() => getInventoryTabFromPath(location.pathname));
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [branches, setBranches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [poFilterStatus, setPoFilterStatus] = useState("Placed");
  const [poFromDate, setPoFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [poToDate, setPoToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPoId, setSelectedPoId] = useState(null);
  const [tempPoItems, setTempPoItems] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [reconciliationEdits, setReconciliationEdits] = useState({});
  const [reconSearch, setReconSearch] = useState("");
  const [reconCategoryId, setReconCategoryId] = useState("All");

  const getEditValue = (productId, field, defaultValue) => {
    if (reconciliationEdits[productId]?.[field] !== undefined) {
      return reconciliationEdits[productId][field];
    }
    return defaultValue;
  };

  const handleEditChange = (productId, field, val) => {
    setReconciliationEdits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: val
      }
    }));
  };

  const handleSaveIndividualRecon = async (product) => {
    const edits = reconciliationEdits[product.id] || {};
    const adjustStock = edits.adjustStock !== undefined ? edits.adjustStock : (product.productType === "RETAIL" ? Number(product.currentStock || 0) : 0);
    const adjustConsumable = edits.adjustConsumable !== undefined ? edits.adjustConsumable : (product.productType === "CONSUMABLE" ? Number(product.currentStock || 0) : 0);
    
    // Choose physicalStock based on type
    const physicalStock = product.productType === "CONSUMABLE" ? adjustConsumable : adjustStock;
    const remark = edits.remark || "";
    
    const branchId = product.branchId || branches[0]?.id;
    if (!branchId) {
      setStatus({ error: "No branch ID found to perform reconciliation.", success: "" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/owner/purchases/reconciliation", {
        branchId,
        note: remark || `Reconciliation for ${product.name}`,
        items: [
          {
            productId: product.id,
            physicalStock
          }
        ]
      });
      setStatus({ success: `Stock reconciled for ${product.name}!`, error: "" });
      // Remove edit for this product from state since it is saved
      setReconciliationEdits(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllRecon = async (filteredReconProducts) => {
    const items = [];
    
    // Default to first branch or branch from first product
    const defaultBranchId = branches[0]?.id || (filteredReconProducts[0] && filteredReconProducts[0].branchId);
    if (!defaultBranchId) {
      setStatus({ error: "No branch ID found.", success: "" });
      return;
    }

    // Go through the filtered list of products
    for (const p of filteredReconProducts) {
      const edits = reconciliationEdits[p.id];
      if (edits) {
        const adjustStock = edits.adjustStock !== undefined ? edits.adjustStock : (p.productType === "RETAIL" ? Number(p.currentStock || 0) : 0);
        const adjustConsumable = edits.adjustConsumable !== undefined ? edits.adjustConsumable : (p.productType === "CONSUMABLE" ? Number(p.currentStock || 0) : 0);
        const physicalStock = p.productType === "CONSUMABLE" ? adjustConsumable : adjustStock;
        
        items.push({
          productId: p.id,
          physicalStock
        });
      }
    }

    if (items.length === 0) {
      setStatus({ error: "No stock adjustments modified to update.", success: "" });
      return;
    }

    try {
      setLoading(true);
      await api.post("/owner/purchases/reconciliation", {
        branchId: defaultBranchId,
        note: "Batch stock reconciliation update",
        items
      });
      setStatus({ success: "All stock levels reconciled successfully!", error: "" });
      setReconciliationEdits({});
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllRecon = () => {
    setReconciliationEdits({});
  };

  const handleExportReconCsv = (rows) => {
    const header = ["productId", "sku", "name", "productType", "adjustStock", "adjustConsumable", "remark"];
    const csvRows = rows.map((product) => {
      const actualStock = product.productType === "RETAIL" ? Number(product.currentStock || 0) : 0;
      const actualConsumable = product.productType === "CONSUMABLE" ? Number(product.currentStock || 0) : 0;
      const adjustStock = getEditValue(product.id, "adjustStock", actualStock);
      const adjustConsumable = getEditValue(product.id, "adjustConsumable", actualConsumable);
      const remark = getEditValue(product.id, "remark", "");
      return [
        product.id,
        product.sku || "",
        `"${String(product.name || "").replaceAll('"', '""')}"`,
        product.productType,
        adjustStock,
        adjustConsumable,
        `"${String(remark || "").replaceAll('"', '""')}"`
      ].join(",");
    });

    const blob = new Blob([[header.join(","), ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportReconCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const [, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const nextEdits = {};

    lines.forEach((line) => {
      const cells = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];
      const [productId, sku, name, , adjustStock, adjustConsumable, remark] = cells;
      const product = products.find((entry) => (
        (productId && entry.id === productId) ||
        (sku && entry.sku === sku) ||
        (name && entry.name?.toLowerCase() === name.toLowerCase())
      ));
      if (!product) return;
      nextEdits[product.id] = {
        adjustStock: adjustStock !== undefined && adjustStock !== "" ? Number(adjustStock) : getEditValue(product.id, "adjustStock", Number(product.currentStock || 0)),
        adjustConsumable: adjustConsumable !== undefined && adjustConsumable !== "" ? Number(adjustConsumable) : getEditValue(product.id, "adjustConsumable", Number(product.currentStock || 0)),
        remark: remark || getEditValue(product.id, "remark", "")
      };
    });

    setReconciliationEdits((prev) => ({ ...prev, ...nextEdits }));
    setStatus({ success: `${Object.keys(nextEdits).length} reconciliation rows imported.`, error: "" });
    event.target.value = "";
  };


  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [vendorForm, setVendorForm] = useState(emptyVendor);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState({
    branchId: "",
    vendorId: "",
    notes: "",
    items: [createEmptyPoItem()]
  });
  const reconImportRef = useRef(null);

  const loadAll = async () => {
    try {
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [
        categoriesResponse,
        productsResponse,
        movementsResponse,
        lowStockResponse,
        branchesResponse,
        vendorsResponse,
        ordersResponse,
        topSellingResponse
      ] = await Promise.allSettled([
        api.get("/owner/inventory/categories", { params: branchParams }),
        api.get("/owner/inventory/products", { params: branchParams }),
        api.get("/owner/inventory/stock-movements", { params: branchParams }),
        api.get("/owner/inventory/low-stock", { params: branchParams }),
        api.get("/owner/branches"),
        api.get("/owner/purchases/vendors", { params: branchParams }),
        api.get("/owner/purchases/orders", { params: branchParams }),
        api.get("/owner/inventory/top-selling-items", { params: branchParams })
      ]);

      if (categoriesResponse.status === "fulfilled") setCategories(categoriesResponse.value.data);
      else console.error(categoriesResponse.reason);

      if (productsResponse.status === "fulfilled") setProducts(productsResponse.value.data);
      else console.error(productsResponse.reason);

      if (movementsResponse.status === "fulfilled") {
        const body = movementsResponse.value.data;
        setMovements(Array.isArray(body) ? body : (body?.data || []));
      }
      else console.error(movementsResponse.reason);

      if (lowStockResponse.status === "fulfilled") setLowStock(lowStockResponse.value.data);
      else console.error(lowStockResponse.reason);

      if (branchesResponse.status === "fulfilled") setBranches(branchesResponse.value.data);
      else console.error(branchesResponse.reason);

      if (vendorsResponse.status === "fulfilled") setVendors(vendorsResponse.value.data);
      else console.error(vendorsResponse.reason);

      if (ordersResponse.status === "fulfilled") setOrders(ordersResponse.value.data);
      else console.error(ordersResponse.reason);

      if (topSellingResponse.status === "fulfilled") setTopSelling(topSellingResponse.value.data);
      else console.error(topSellingResponse.reason);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedBranchId]);

  useEffect(() => {
    setActiveTab(getInventoryTabFromPath(location.pathname));
    setIsPurchaseOrderModalOpen(location.pathname.includes("/admin/purchases/orders/create"));
  }, [location.pathname]);

  useEffect(() => {
    if (isProductModalOpen || isCategoryModalOpen || isMovementModalOpen || isVendorModalOpen || isPurchaseOrderModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isProductModalOpen, isCategoryModalOpen, isMovementModalOpen, isVendorModalOpen, isPurchaseOrderModalOpen]);

  const totalStock = products.reduce((acc, p) => acc + Number(p.currentStock || 0), 0);
  const activeItems = products.filter(p => p.isActive !== false).length;
  const pendingOrders = orders.filter(o => o.status === "DRAFT" || o.status === "ORDERED").length;
  const approvedOrders = orders.filter(o => o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED" || o.status === "RECEIVED").length;
  const rejectedOrders = orders.filter(o => o.status === "CANCELLED").length;
  const stockYetToBeReceived = orders.reduce((acc, order) => (
    acc + (order.items || []).reduce((itemAcc, item) => itemAcc + Math.max(Number(item.quantityOrdered || 0) - Number(item.quantityReceived || 0), 0), 0)
  ), 0);
  const poCounts = useMemo(() => {
    const dateFiltered = orders.filter(o => {
      const oDate = new Date(o.createdAt || o.orderedAt).toISOString().slice(0, 10);
      return oDate >= poFromDate && oDate <= poToDate;
    });
    return {
      Placed: dateFiltered.filter(o => o.status === "DRAFT" || o.status === "ORDERED").length,
      Approved: dateFiltered.filter(o => o.status === "ORDERED").length,
      Rejected: dateFiltered.filter(o => o.status === "CANCELLED").length,
      Partial_Settled: dateFiltered.filter(o => o.status === "PARTIALLY_RECEIVED").length,
      Settled: dateFiltered.filter(o => o.status === "RECEIVED").length,
      Cancelled: dateFiltered.filter(o => o.status === "CANCELLED").length,
      Total: dateFiltered.length
    };
  }, [orders, poFromDate, poToDate]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const oDate = new Date(o.createdAt || o.orderedAt).toISOString().slice(0, 10);
      const inDateRange = oDate >= poFromDate && oDate <= poToDate;
      if (!inDateRange) return false;

      if (poFilterStatus === "Placed") return o.status === "DRAFT" || o.status === "ORDERED";
      if (poFilterStatus === "Approved") return o.status === "ORDERED";
      if (poFilterStatus === "Rejected") return o.status === "CANCELLED";
      if (poFilterStatus === "Partial_Settled") return o.status === "PARTIALLY_RECEIVED";
      if (poFilterStatus === "Settled") return o.status === "RECEIVED";
      if (poFilterStatus === "Cancelled") return o.status === "CANCELLED";
      return true;
    });
  }, [orders, poFilterStatus, poFromDate, poToDate]);
  const draftOrders = useMemo(() => orders.filter(o => o.status === "DRAFT"), [orders]);

  useEffect(() => {
    if (draftOrders.length > 0 && !selectedPoId) {
      setSelectedPoId(draftOrders[0].id);
    }
  }, [draftOrders, selectedPoId]);

  const selectedOrder = useMemo(() => {
    return draftOrders.find(o => o.id === selectedPoId) || draftOrders[0] || null;
  }, [draftOrders, selectedPoId]);

  const filteredReconProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(reconSearch.toLowerCase()) || 
                            (p.sku && p.sku.toLowerCase().includes(reconSearch.toLowerCase())) ||
                            (p.barcode && p.barcode.toLowerCase().includes(reconSearch.toLowerCase()));
      const matchesCategory = reconCategoryId === "All" || p.categoryId === reconCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, reconSearch, reconCategoryId]);


  useEffect(() => {
    if (selectedOrder) {
      setTempPoItems(selectedOrder.items || []);
    } else {
      setTempPoItems([]);
    }
  }, [selectedOrder]);

  useEffect(() => {
    setPurchaseOrderForm((prev) => ({
      ...prev,
      branchId: prev.branchId || branches[0]?.id || "",
      vendorId: prev.vendorId || vendors[0]?.id || "",
      items: prev.items.map((item) => {
        if (!item.productId && products[0]?.id) {
          return {
            ...item,
            productId: products[0].id,
            unitCost: item.unitCost || Number(products[0].costPrice || 0)
          };
        }
        return item;
      })
    }));
  }, [branches, vendors, products]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/inventory/products", { ...productForm, costPrice: Number(productForm.costPrice), sellingPrice: Number(productForm.sellingPrice), currentStock: Number(productForm.currentStock), minStock: Number(productForm.minStock) });
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

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/purchases/vendors", {
        ...vendorForm,
        branchId: vendorForm.branchId || null
      });
      setStatus({ success: "Vendor created successfully!", error: "" });
      setVendorForm(emptyVendor);
      setIsVendorModalOpen(false);
      loadAll();
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    }
  };

  const updatePoItem = (index, field, value) => {
    setPurchaseOrderForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const addPoItemRow = () => {
    setPurchaseOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyPoItem()]
    }));
  };

  const removePoItemRow = (index) => {
    setPurchaseOrderForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const closePurchaseOrderModal = () => {
    setIsPurchaseOrderModalOpen(false);
    setPurchaseOrderForm({
      branchId: branches[0]?.id || "",
      vendorId: vendors[0]?.id || "",
      notes: "",
      items: [createEmptyPoItem()]
    });
    if (location.pathname.includes("/admin/purchases/orders/create")) {
      navigate("/admin/purchases/orders");
    }
  };

  const handlePurchaseOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/purchases/orders", {
        branchId: purchaseOrderForm.branchId,
        vendorId: purchaseOrderForm.vendorId,
        notes: purchaseOrderForm.notes,
        items: purchaseOrderForm.items.map((item) => ({
          productId: item.productId,
          quantityOrdered: Number(item.quantityOrdered),
          unitCost: Number(item.unitCost)
        }))
      });
      setStatus({ success: "Purchase order created successfully!", error: "" });
      closePurchaseOrderModal();
      loadAll();
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      setLoading(true);
      await api.patch(`/owner/purchases/orders/${selectedOrder.id}/approve`, { notes: commentText });
      setStatus({ success: "Purchase order approved successfully!", error: "" });
      setSelectedPoId(null);
      setCommentText("");
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    try {
      setLoading(true);
      await api.patch(`/owner/purchases/orders/${selectedOrder.id}/reject`, { notes: commentText });
      setStatus({ success: "Purchase order rejected.", error: "" });
      setSelectedPoId(null);
      setCommentText("");
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (itemId) => {
    setTempPoItems(prev => prev.filter(item => item.id !== itemId));
  };

  const tabs = [
    { name: "Dashboard", icon: <Activity size={18} /> },
    { name: "Purchase Order", icon: <ShoppingCart size={18} /> },
    { name: "Approval", icon: <CheckCircle size={18} /> },
    { name: "Stock Reconciliation", icon: <RefreshCw size={18} /> },
    { name: "Vendor Management", icon: <Users size={18} /> },
  ];

  return (
    <div className="inventory-layout">
      {/* SIDEBAR */}
      <div className="inventory-sidebar">
        <div style={{
          padding: "14px 12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }} />
        <div className="sidebar-nav-container" style={{ flexGrow: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => {
                  setActiveTab(tab.name);
                  if (tab.name === "Dashboard") navigate("/admin/inventory");
                  if (tab.name === "Purchase Order") navigate("/admin/purchases/orders");
                  if (tab.name === "Approval") navigate("/admin/inventory/approval");
                  if (tab.name === "Stock Reconciliation") navigate("/admin/inventory/reconciliation");
                  if (tab.name === "Vendor Management") navigate("/admin/purchases/vendors");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "11px", width: "100%",
                  padding: "10px 12px",
                  border: "none", borderRadius: "8px",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "#e2e8f0" : "#7c8494",
                  fontSize: "0.845rem",
                  fontWeight: isActive ? "600" : "500",
                  cursor: "pointer",
                  transition: "background 140ms ease, color 140ms ease",
                  textAlign: "left",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "#c8cdd6";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#7c8494";
                  }
                }}
              >
                <span style={{ display: "flex", alignItems: "center", color: isActive ? "#c8cdd6" : "#555e6e", flexShrink: 0 }}>
                  {tab.icon}
                </span>
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="inventory-content">
        {loading && <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100 }}><PageLoader title="Loading..." /></div>}
        
        {activeTab === "Dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a", fontWeight: "700" }}>Inventory Dashboard</h2>
            
            {/* Top KPI Row */}
            <div className="inventory-dashboard-kpis">
              <div style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "none" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Pending PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{pendingOrders}</div>
                </div>
                <ShoppingCart size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "none" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Approved PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{approvedOrders}</div>
                </div>
                <CheckCircle size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "none" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Rejected PO</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{rejectedOrders}</div>
                </div>
                <XCircle size={40} opacity={0.3} />
              </div>
              <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 12, padding: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "none" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.9, fontWeight: 500 }}>Min Stock Items</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>{lowStock.length}</div>
                </div>
                <AlertTriangle size={40} opacity={0.3} />
              </div>
            </div>

            {/* Summary Cards Row */}
            <div className="inventory-summary-cards">
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#334155" }}>Inventory Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stock In Hand</div>
                    <div style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 700, marginTop: 8 }}>{totalStock.toFixed(0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stock Yet To Be Received</div>
                    <div style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 700, marginTop: 8 }}>{stockYetToBeReceived}</div>
                  </div>
                </div>
              </div>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#334155" }}>Product Summary</h3>
                <div className="inventory-product-summary">
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

            {/* Top Selling Items */}
            {topSelling.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", fontWeight: 700 }}>Top Selling Items</h3>
                </div>
                <div style={{ padding: "24px", display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
                  {topSelling.map((item) => (
                    <div key={item.product?.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}>
                      <div style={{
                        width: 100, height: 100, borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "#f8fafc", overflow: "hidden"
                      }}>
                        {item.product?.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="12" y="8" width="10" height="32" rx="3" stroke="#94a3b8" strokeWidth="2" fill="#e2e8f0"/>
                            <rect x="26" y="14" width="8" height="26" rx="2" stroke="#94a3b8" strokeWidth="2" fill="#e2e8f0"/>
                            <circle cx="30" cy="12" r="4" stroke="#94a3b8" strokeWidth="2" fill="#e2e8f0"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#0f172a", fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>
                        {item.product?.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
                        {item.totalSold} {item.totalSold === 1 ? "item" : "items"} sold
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        {activeTab !== "Dashboard" && activeTab === "Purchase Order" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Filters Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              {/* Left Side: Date Inputs */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>From :</span>
                  <input 
                    type="date" 
                    value={poFromDate} 
                    onChange={(e) => setPoFromDate(e.target.value)}
                    max={poToDate || undefined}
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", color: "#334155", fontWeight: 500 }} 
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>To :</span>
                  <input 
                    type="date" 
                    value={poToDate} 
                    onChange={(e) => setPoToDate(e.target.value)}
                    min={poFromDate || undefined}
                    style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", color: "#334155", fontWeight: 500 }} 
                  />
                </div>
              </div>

              {/* Right Side: Status Tabs and New Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Placed", count: poCounts.Placed },
                  { label: "Approved", count: poCounts.Approved },
                  { label: "Rejected", count: poCounts.Rejected },
                  { label: "Partial_Settled", count: poCounts.Partial_Settled },
                  { label: "Settled", count: poCounts.Settled },
                  { label: "Cancelled", count: poCounts.Cancelled },
                  { label: "Total", count: poCounts.Total }
                ].map((btn) => {
                  const isActive = poFilterStatus === btn.label;
                  return (
                    <button
                      key={btn.label}
                      onClick={() => setPoFilterStatus(btn.label)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 16px",
                        borderRadius: 6,
                        border: isActive ? "none" : "1px solid #cbd5e1",
                        background: isActive ? "#3b82f6" : "white",
                        color: isActive ? "white" : "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {btn.label.replace("_", " ")}
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px 6px",
                        minWidth: 20,
                        borderRadius: "10px",
                        background: isActive ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                        color: isActive ? "white" : "#64748b",
                        fontSize: "0.75rem",
                        fontWeight: 700
                      }}>
                        {btn.count}
                      </span>
                    </button>
                  );
                })}

                {/* New + button */}
                <button
                  onClick={() => navigate("/admin/purchases/orders/create")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  New <Plus size={16} style={{ color: "var(--accent, #3b82f6)" }} />
                </button>
              </div>
            </div>

            {/* Content Panel */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: filteredOrders.length === 0 ? "80px 24px" : "0px", minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b" }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 600, display: "block" }}>
                    {poFilterStatus.replace("_", " ")} Purchase Orders Not Available
                  </span>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>PO #</th>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Vendor</th>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Products</th>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: "16px 24px", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "16px 24px", fontWeight: 500, color: "#0f172a" }}>{o.orderNumber || o.id?.slice(-6)}</td>
                        <td style={{ padding: "16px 24px", color: "#64748b" }}>{new Date(o.createdAt || o.orderedAt).toLocaleDateString()}</td>
                        <td style={{ padding: "16px 24px", color: "#64748b" }}>{o.vendor?.name || "-"}</td>
                        <td style={{ padding: "16px 24px", color: "#64748b" }}>{o.items?.length || 0} items</td>
                        <td style={{ padding: "16px 24px", fontWeight: 600 }}>{formatMoney(o.totalCost || 0)}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <span style={{ padding: "4px 8px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, background: o.status === "RECEIVED" ? "#dcfce7" : o.status === "CANCELLED" ? "#fee2e2" : "#fef3c7", color: o.status === "RECEIVED" ? "#166534" : o.status === "CANCELLED" ? "#991b1b" : "#92400e" }}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Approval Tab Custom Implementation */}
        {activeTab !== "Dashboard" && activeTab === "Approval" && (
          <div style={{ display: "flex", gap: 24, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", minHeight: 600 }}>
            {/* Left sidebar block */}
            <div style={{ width: 280, minWidth: 280, borderRight: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e293b", fontSize: "0.95rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ChevronDown size={18} color="#64748b" />
                  Purchase Order
                </div>
                <span style={{ background: "#cbd5e1", color: "#475569", borderRadius: 20, fontSize: "0.75rem", padding: "2px 8px", fontWeight: 700 }}>
                  {draftOrders.length}
                </span>
              </div>
              <div style={{ flexGrow: 1, overflowY: "auto" }}>
                {draftOrders.map(o => {
                  const isSelected = selectedPoId === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedPoId(o.id)}
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        textAlign: "left",
                        background: isSelected ? "#3b82f6" : "transparent",
                        color: isSelected ? "white" : "#475569",
                        border: "none",
                        borderBottom: "1px solid #e2e8f0",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        transition: "all 0.2s"
                      }}
                    >
                      {o.orderNumber || o.id?.slice(-6)}
                    </button>
                  );
                })}
                {draftOrders.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                    No pending purchase orders
                  </div>
                )}
              </div>
            </div>

            {/* Right details block */}
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", padding: 24 }}>
              {!selectedOrder ? (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600 }}>
                  Select a purchase order to view details and approval actions.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>
                  {/* Meta Details Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Requested To :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>{selectedOrder.vendor?.name || "-"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Created On :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>
                        {new Date(selectedOrder.createdAt || selectedOrder.orderedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Expected On :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>
                        {new Date(new Date(selectedOrder.createdAt || selectedOrder.orderedAt).getTime() + 48*60*60*1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Po Id :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>{selectedOrder.orderNumber || selectedOrder.id}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Requested By :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>{selectedOrder.createdByUser?.name || "Owner"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Request Remark :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>{selectedOrder.notes || "-"}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Total Items :</span>
                      <span style={{ fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>{tempPoItems.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Total Value :</span>
                      <span style={{ fontSize: "0.95rem", color: "var(--accent, #3b82f6)", fontWeight: 700 }}>
                        {formatMoney(tempPoItems.reduce((acc, item) => acc + (Number(item.quantityOrdered) * Number(item.unitCost)), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Items List Table */}
                  <div style={{ flexGrow: 1, overflowY: "auto", minHeight: 250 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#e0f2fe", color: "#0369a1", fontSize: "0.85rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "12px 16px", fontWeight: 600 }}>Sr.No.</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600 }}>Item Name</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600 }}>In Stock</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, width: 100 }}>Quantity</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600 }}>Price</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600 }}>Total Value</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tempPoItems.map((item, idx) => {
                          const product = products.find(p => p.id === item.productId);
                          const inStock = product ? (product.currentStock || 0) : 0;
                          const totalVal = Number(item.quantityOrdered) * Number(item.unitCost);
                          return (
                            <tr key={item.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#475569" }}>{idx + 1}.</td>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#0f172a", fontWeight: 500 }}>{item.product?.name || product?.name || "-"}</td>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#475569" }}>{inStock}</td>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#334155", fontWeight: 600 }}>
                                {item.quantityOrdered}
                              </td>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#475569" }}>{formatMoney(item.unitCost)}</td>
                              <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>{formatMoney(totalVal)}</td>
                              <td style={{ padding: "14px 16px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>
                                Review only
                              </td>
                            </tr>
                          );
                        })}
                        {tempPoItems.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                              No items in this purchase order
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Comment & Buttons Block */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                    <textarea
                      placeholder="Write a comment"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 60,
                        maxHeight: 120,
                        padding: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        outline: "none",
                        fontSize: "0.9rem",
                        fontFamily: "inherit",
                        resize: "vertical"
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button
                        onClick={handleReject}
                        style={{
                          padding: "10px 24px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          background: "white",
                          color: "#475569",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        style={{
                          padding: "10px 24px",
                          border: "none",
                          borderRadius: 8,
                          background: "var(--button-bg-solid, #3b82f6)",
                          color: "white",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stock Reconciliation Tab */}
        {activeTab === "Stock Reconciliation" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Status Messages */}
            {status.success && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: "0.9rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {status.success}
                <button onClick={() => setStatus({ error: "", success: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700, fontSize: "1rem" }}>x</button>
              </div>
            )}
            {status.error && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", fontSize: "0.9rem", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {status.error}
                <button onClick={() => setStatus({ error: "", success: "" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 700, fontSize: "1rem" }}>x</button>
              </div>
            )}
            {/* Header Filters row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#475569", fontSize: "0.95rem" }}>Item :</span>
                  <div style={{ position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Search By Name"
                      value={reconSearch}
                      onChange={(e) => setReconSearch(e.target.value)}
                      style={{
                        padding: "8px 12px 8px 36px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        fontSize: "0.9rem",
                        outline: "none",
                        width: 220,
                        transition: "all 0.2s"
                      }}
                    />
                  </div>
                </div>

                {/* Category Select */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "#475569", fontSize: "0.95rem" }}>Category:</span>
                  <select
                    value={reconCategoryId}
                    onChange={(e) => setReconCategoryId(e.target.value)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      fontSize: "0.9rem",
                      background: "white",
                      outline: "none",
                      cursor: "pointer",
                      minWidth: 120
                    }}
                  >
                    <option value="All">All</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Import / Export */}
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  ref={reconImportRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleImportReconCsv}
                />
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--button-bg-solid, #3b82f6)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onClick={() => reconImportRef.current?.click()}
                >
                  <Upload size={16} /> Import
                </button>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--button-bg-solid, #3b82f6)",
                    color: "white",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onClick={() => handleExportReconCsv(filteredReconProducts)}
                >
                  <Download size={16} /> Export
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#e0f2fe", color: "#0369a1", textTransform: "none", borderBottom: "1px solid #cbd5e1" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600 }}>Category Name</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600 }}>Item Name</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Actual Stock</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Adjust Stock</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Stock Difference</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Stock Value</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Actual Consumable</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Adjust Consumable</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Unit</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Consumable Difference</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600 }}>Remark*</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReconProducts.map(p => {
                    const actualStock = p.productType === "RETAIL" ? Number(p.currentStock || 0) : 0;
                    const adjustStock = getEditValue(p.id, "adjustStock", actualStock);
                    const stockDiff = adjustStock - actualStock;
                    const stockValue = adjustStock * Number(p.costPrice || 0);

                    const actualConsumable = p.productType === "CONSUMABLE" ? Number(p.currentStock || 0) : 0;
                    const adjustConsumable = getEditValue(p.id, "adjustConsumable", actualConsumable);
                    const consumableDiff = adjustConsumable - actualConsumable;

                    const remark = getEditValue(p.id, "remark", "");
                    const unit = p.productType === "CONSUMABLE" ? "ml" : "gm";

                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", color: "#475569" }}>{p.category?.name || "-"}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a" }}>
                          {p.name}
                          {p.featured && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4, fontWeight: 700, marginLeft: 6 }}>★ Featured</span>}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b" }}>{actualStock}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <input
                            type="number"
                            value={adjustStock}
                            onChange={(e) => handleEditChange(p.id, "adjustStock", Number(e.target.value))}
                            style={{
                              width: 70,
                              padding: "6px 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              textAlign: "center",
                              outline: "none"
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: stockDiff !== 0 ? (stockDiff > 0 ? "#10b981" : "#ef4444") : "#64748b", fontWeight: 600 }}>
                          {stockDiff > 0 ? `+${stockDiff}` : stockDiff}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>
                          {formatMoney(stockValue)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b" }}>{actualConsumable}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <input
                            type="number"
                            value={adjustConsumable}
                            onChange={(e) => handleEditChange(p.id, "adjustConsumable", Number(e.target.value))}
                            style={{
                              width: 70,
                              padding: "6px 8px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              textAlign: "center",
                              outline: "none"
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b" }}>{unit}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: consumableDiff !== 0 ? (consumableDiff > 0 ? "#10b981" : "#ef4444") : "#64748b", fontWeight: 600 }}>
                          {consumableDiff > 0 ? `+${consumableDiff}` : consumableDiff}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <input
                            type="text"
                            placeholder="Add remark"
                            value={remark}
                            onChange={(e) => handleEditChange(p.id, "remark", e.target.value)}
                            style={{
                              width: "100%",
                              minWidth: 100,
                              padding: "6px 10px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              outline: "none"
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <button
                            onClick={() => handleSaveIndividualRecon(p)}
                            style={{
                              padding: 6,
                              background: "#e0f2fe",
                              color: "#0369a1",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s"
                            }}
                            title="Save individual adjustment"
                          >
                            <Save size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReconProducts.length === 0 && (
                    <tr>
                      <td colSpan="12" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                        No products found matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <button
                onClick={handleClearAllRecon}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  background: "white",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Clear All
              </button>
              <button
                onClick={() => handleUpdateAllRecon(filteredReconProducts)}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  background: "var(--button-bg-solid, #3b82f6)",
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                Update All
              </button>
            </div>
          </div>
        )}

        {/* Vendor Management Tab */}
        {activeTab === "Vendor Management" && (
          <VendorManagement branches={branches} formatMoney={formatMoney} />
        )}

      </div>

      {/* MODALS - SLIDE PANELS */}
      <style>{`
        .slide-panel-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); z-index: 1200; backdrop-filter: blur(2px); }
        .slide-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 450px; background: #fff; z-index: 1201; display: flex; flex-direction: column; box-shadow: none; transform: translateX(100%); animation: slideIn 0.3s forwards; }
        @keyframes slideIn { to { transform: translateX(0); } }
        .sp-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
        .sp-header h3 { margin: 0; font-size: 1.2rem; color: #0f172a; font-weight: 700; }
        .sp-close { background: #f1f5f9; border: none; border-radius: 50%; padding: 8px; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .sp-close:hover { background: #e2e8f0; color: #0f172a; }
        .sp-body { flex-grow: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; background: #f8fafc; }
        .sp-group { display: flex; flex-direction: column; gap: 6px; }
        .sp-label { font-size: 0.85rem; font-weight: 600; color: #475569; }
        .sp-input { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; background: white; transition: all 0.2s; }
        .sp-input:focus { border-color: #3b82f6; outline: none; box-shadow: none; }
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
                    <label className="sp-label">Cost Price ({formatMoney(1).replace(/[\d.,]/g, '').trim()})</label>
                    <input type="number" className="sp-input" required value={productForm.costPrice} onChange={e => setProductForm({...productForm, costPrice: e.target.value})} />
                  </div>
                  <div className="sp-group">
                    <label className="sp-label">Selling Price ({formatMoney(1).replace(/[\d.,]/g, '').trim()})</label>
                    <input type="number" className="sp-input" required value={productForm.sellingPrice} onChange={e => setProductForm({...productForm, sellingPrice: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="sp-group">
                    <label className="sp-label">Current Stock</label>
                    <input type="number" className="sp-input" required value={productForm.currentStock} onChange={e => setProductForm({...productForm, currentStock: e.target.value})} />
                  </div>
                  <div className="sp-group">
                    <label className="sp-label">Min Stock</label>
                    <input type="number" className="sp-input" required value={productForm.minStock} onChange={e => setProductForm({...productForm, minStock: e.target.value})} />
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

      {isVendorModalOpen && (
        <div className="slide-panel-overlay" onClick={() => setIsVendorModalOpen(false)}>
          <div className="slide-panel" onClick={e => e.stopPropagation()}>
            <div className="sp-header">
              <button className="sp-close" onClick={() => setIsVendorModalOpen(false)}><ArrowLeft size={18} /></button>
              <h3>Create Vendor</h3>
            </div>
            <form onSubmit={handleVendorSubmit} style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
              <div className="sp-body">
                {status.error && <div style={{ color: "#ef4444", padding: 12, background: "#fef2f2", borderRadius: 8, fontSize: "0.9rem" }}>{status.error}</div>}
                <div className="sp-group">
                  <label className="sp-label">Vendor Name</label>
                  <input className="sp-input" required value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="Enter vendor name" />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Branch</label>
                  <select className="sp-input" value={vendorForm.branchId} onChange={e => setVendorForm({ ...vendorForm, branchId: e.target.value })}>
                    <option value="">Salon wide</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
                <div className="sp-group">
                  <label className="sp-label">Phone</label>
                  <IndianPhoneInput value={vendorForm.phone} onChange={(phone) => setVendorForm(prev => ({ ...prev, phone }))} />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Email</label>
                  <input className="sp-input" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder="vendor@example.com" />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Address</label>
                  <textarea className="sp-input" rows="3" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} placeholder="Vendor address" />
                </div>
                <div className="sp-group">
                  <label className="sp-label">Notes</label>
                  <textarea className="sp-input" rows="3" value={vendorForm.notes} onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })} placeholder="Internal notes" />
                </div>
              </div>
              <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", background: "white" }}>
                <button type="submit" className="sp-btn">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPurchaseOrderModalOpen && (
        <div className="slide-panel-overlay" onClick={closePurchaseOrderModal}>
          <div className="slide-panel" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="sp-header">
              <button className="sp-close" onClick={closePurchaseOrderModal}><ArrowLeft size={18} /></button>
              <h3>Create Purchase Order</h3>
            </div>
            <form onSubmit={handlePurchaseOrderSubmit} style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
              <div className="sp-body">
                {status.error && <div style={{ color: "#ef4444", padding: 12, background: "#fef2f2", borderRadius: 8, fontSize: "0.9rem" }}>{status.error}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="sp-group">
                    <label className="sp-label">Branch</label>
                    <select className="sp-input" required value={purchaseOrderForm.branchId} onChange={e => setPurchaseOrderForm({ ...purchaseOrderForm, branchId: e.target.value })}>
                      <option value="">Select branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                  <div className="sp-group">
                    <label className="sp-label">Vendor</label>
                    <select className="sp-input" required value={purchaseOrderForm.vendorId} onChange={e => setPurchaseOrderForm({ ...purchaseOrderForm, vendorId: e.target.value })}>
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sp-group">
                  <label className="sp-label">Notes</label>
                  <textarea className="sp-input" rows="3" value={purchaseOrderForm.notes} onChange={e => setPurchaseOrderForm({ ...purchaseOrderForm, notes: e.target.value })} placeholder="PO notes" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="sp-label" style={{ fontSize: "1rem" }}>Items</div>
                  <button type="button" onClick={addPoItemRow} style={{ border: "none", background: "transparent", color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>
                    + Add item
                  </button>
                </div>

                {purchaseOrderForm.items.map((item, index) => {
                  const selectedProduct = products.find((product) => product.id === item.productId);
                  return (
                    <div key={`${item.productId || "item"}-${index}`} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                      <div className="sp-group">
                        <label className="sp-label">Product</label>
                        <select
                          className="sp-input"
                          required
                          value={item.productId}
                          onChange={(e) => {
                            const nextProduct = products.find((product) => product.id === e.target.value);
                            updatePoItem(index, "productId", e.target.value);
                            updatePoItem(index, "unitCost", Number(nextProduct?.costPrice || 0));
                          }}
                        >
                          <option value="">Select product</option>
                          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                      </div>
                      <div className="sp-group">
                        <label className="sp-label">Qty</label>
                        <input type="number" min="1" className="sp-input" required value={item.quantityOrdered} onChange={e => updatePoItem(index, "quantityOrdered", Number(e.target.value))} />
                      </div>
                      <div className="sp-group">
                        <label className="sp-label">Unit Cost</label>
                        <input type="number" min="0" step="0.01" className="sp-input" required value={item.unitCost} onChange={e => updatePoItem(index, "unitCost", Number(e.target.value))} />
                      </div>
                      <button type="button" onClick={() => removePoItemRow(index)} style={{ border: "none", background: "#fee2e2", color: "#b91c1c", borderRadius: 10, width: 42, height: 42, cursor: "pointer" }} title="Remove item">
                        <Trash2 size={16} />
                      </button>
                      <div style={{ gridColumn: "1 / -1", fontSize: "0.85rem", color: "#64748b" }}>
                        Current cost: {formatMoney(selectedProduct?.costPrice || 0)} | Current stock: {selectedProduct?.currentStock || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", background: "white" }}>
                <button type="submit" className="sp-btn">Create Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



