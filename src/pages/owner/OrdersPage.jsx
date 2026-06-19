/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock3, Edit3, FileText, PackageCheck, Phone, Store, X, ShoppingBag, ArrowRight, CheckCircle2, Truck, Check, XCircle } from "lucide-react";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function OrdersPage() {
  const { formatMoney } = useSalonSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailNote, setDetailNote] = useState("");
  const [detailStatus, setDetailStatus] = useState("NEW");
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const filter = useMemo(() => {
    if (location.pathname.endsWith("/new")) return "NEW";
    if (location.pathname.endsWith("/accepted")) return "ACCEPTED";
    if (location.pathname.endsWith("/ready")) return "READY";
    if (location.pathname.endsWith("/completed")) return "COMPLETED";
    if (location.pathname.endsWith("/cancelled")) return "CANCELLED";
    return "";
  }, [location.pathname]);

  const returnPath = useMemo(() => {
    const from = new URLSearchParams(location.search).get("from");
    return from || "/admin/orders";
  }, [location.search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        api.get("/owner/orders", { params: filter ? { status: filter } : {} }),
        api.get("/owner/orders/reports/summary")
      ]);
      setRows(ordersResponse.data || []);
      setSummary(summaryResponse.data);
      if (params.id) {
        const detailResponse = await api.get(`/owner/orders/${params.id}`);
        setDetail(detailResponse.data);
      } else {
        setDetail(null);
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load online orders"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [filter, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    setDetailStatus(detail.status || "NEW");
    setDetailNote("");
  }, [detail]);

  const openOrder = (id) => {
    navigate(`/admin/orders/${id}?from=${encodeURIComponent(location.pathname + location.search)}`);
  };

  const closeDetail = () => {
    navigate(returnPath);
  };

  const updateStatus = async (id, nextStatus, note = "") => {
    try {
      await api.patch(`/owner/orders/${id}/status`, { status: nextStatus, note });
      setStatus({ error: "", success: `Order moved to ${nextStatus}.` });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update order"), success: "" });
    }
  };

  const cancelOrder = async (id) => {
    if(!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.patch(`/owner/orders/${id}/cancel`, { note: "Cancelled from owner panel" });
      setStatus({ error: "", success: "Order cancelled." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel order"), success: "" });
    }
  };

  const convertToInvoice = async (id) => {
    try {
      await api.post(`/owner/orders/${id}/convert-to-invoice`);
      setStatus({ error: "", success: "Order successfully converted to invoice." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not convert order to invoice"), success: "" });
    }
  };

  const getStatusColor = (s) => {
    switch (s?.toUpperCase()) {
      case "NEW": return { bg: "#dbeafe", text: "#1e3a8a", border: "#bfdbfe" };
      case "ACCEPTED": return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
      case "READY": return { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" };
      case "COMPLETED": return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
      case "CANCELLED": return { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" };
      default: return { bg: "#f1f5f9", text: "#334155", border: "#e2e8f0" };
    }
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        .o-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.2s; position: relative; cursor: pointer; }
        .o-card:hover { transform: translateY(-3px); box-shadow: none; border-color: #cbd5e1; }
        .o-stat-box { background: rgba(255,255,255,0.1); padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
        
        .o-pill { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
        
        .modal-glass { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: white; width: 100%; max-width: 900px; max-height: 90vh; border-radius: 24px; display: grid; grid-template-columns: 1fr 340px; overflow: hidden; box-shadow: none; animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .modal-body { padding: 32px; overflow-y: auto; background: #f8fafc; max-height: 90vh; }
        .modal-sidebar { padding: 32px; background: white; border-left: 1px solid #e2e8f0; overflow-y: auto; max-height: 90vh; }
        
        @keyframes popIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .action-btn { width: 100%; padding: 12px; border-radius: 12px; font-weight: 600; font-size: 14px; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; }
        .action-primary { background: #6366f1; color: white; box-shadow: none; }
        .action-primary:hover { background: #4f46e5; transform: translateY(-1px); }
        .action-secondary { background: white; border-color: #cbd5e1; color: #334155; }
        .action-secondary:hover { background: #f8fafc; border-color: #94a3b8; }
        .action-danger { background: #fee2e2; color: #991b1b; }
        .action-danger:hover { background: #fecaca; }
      `}</style>

      <ModuleTabs
        title="Online Orders"
        tabs={[
          { label: "All Orders", to: "/admin/orders" },
          { label: "New", to: "/admin/orders/new" },
          { label: "Accepted", to: "/admin/orders/accepted" },
          { label: "Ready", to: "/admin/orders/ready" },
          { label: "Completed", to: "/admin/orders/completed" },
          { label: "Cancelled", to: "/admin/orders/cancelled" }
        ]}
      />

      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 24, padding: 32, color: "white", marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
              <ShoppingBag size={28} color="#818cf8" />
              Online Orders
            </h1>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 15 }}>Monitor & fulfill incoming storefront orders.</p>
          </div>
          <div style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {filter || "ALL"} QUEUE
          </div>
        </div>

        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            <div className="o-stat-box">
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Total Orders</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{summary.totalOrders}</div>
            </div>
            <div className="o-stat-box">
              <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>New</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#bfdbfe" }}>{summary.newOrders}</div>
            </div>
            <div className="o-stat-box">
              <div style={{ fontSize: 12, color: "#86efac", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#bbf7d0" }}>{summary.completedOrders}</div>
            </div>
            <div className="o-stat-box" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))", borderColor: "rgba(99,102,241,0.4)" }}>
              <div style={{ fontSize: 12, color: "#818cf8", marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Total Sales</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{formatMoney(summary.totalSales || 0)}</div>
            </div>
          </div>
        )}
      </div>

      {status.error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500 }}>{status.error}</div>}
      {status.success && <div style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500 }}>{status.success}</div>}
      
      {loading ? <PageLoader title="Loading Orders..." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {rows.map(row => {
            const st = getStatusColor(row.status);
            const totalItems = (row.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
            
            return (
              <div key={row.id} className="o-card" onClick={() => openOrder(row.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>{row.orderNumber}</h3>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{row.customerName}</div>
                  </div>
                  <span className="o-pill" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                    {row.status}
                  </span>
                </div>

                <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, marginBottom: 16 }}>
                  {(row.items || []).slice(0, 2).map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "#475569" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{item.qty}x {item.productName}</span>
                    </div>
                  ))}
                  {(row.items || []).length > 2 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>+ {(row.items || []).length - 2} more items</div>}
                  {!(row.items || []).length && <div style={{ fontSize: 12, color: "#94a3b8" }}>No items</div>}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #e2e8f0", paddingTop: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#64748b" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock3 size={12} /> {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Store size={12} /> {row.branch?.name || "Main Branch"}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{formatMoney(row.total || 0)}</div>
                </div>
              </div>
            );
          })}
          {!rows.length && (
            <div style={{ gridColumn: "1/-1" }}>
              <EmptyState title={`No ${filter ? filter.toLowerCase() : ""} orders found`} message="When customers place orders, they will appear in this queue." />
            </div>
          )}
        </div>
      )}

      {/* ── MODERN MODAL ── */}
      {detail && (
        <div className="modal-glass" onClick={closeDetail}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            
            {/* Modal Body */}
            <div className="modal-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Order Details</div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "#0f172a" }}>{detail.orderNumber}</h2>
                </div>
                <span className="o-pill" style={{ background: getStatusColor(detail.status).bg, color: getStatusColor(detail.status).text }}>
                  {detail.status}
                </span>
              </div>

              <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>{detail.customerName}</h3>
                    <div style={{ fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Phone size={14} /> {detail.customerPhone || "N/A"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Method</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <PackageCheck size={16} /> {detail.fulfillmentMethod || "PICKUP"}
                    </div>
                  </div>
                </div>
              </div>

              <h4 style={{ margin: "0 0 16px", color: "#0f172a", fontSize: 16 }}>Order Items</h4>
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 24 }}>
                {(detail.items || []).map((item, idx) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: idx !== detail.items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#64748b" }}>
                        {item.qty}x
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 15 }}>{item.productName}</div>
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>{formatMoney(item.unitPrice || 0)} each</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatMoney(item.lineTotal || 0)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Sidebar */}
            <div className="modal-sidebar">
              <button onClick={closeDetail} style={{ position: "absolute", top: 24, right: 24, background: "#f1f5f9", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>

              <h4 style={{ margin: "0 0 20px", fontSize: 18, color: "#0f172a" }}>Payment Summary</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 14 }}><span>Subtotal</span><span>{formatMoney(detail.subtotal || 0)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 14 }}><span>Discount</span><span>-{formatMoney(detail.discount || 0)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 14 }}><span>Tax</span><span>+{formatMoney(detail.tax || 0)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#0f172a", fontSize: 18, fontWeight: 800, marginTop: 8, paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}><span>Total</span><span>{formatMoney(detail.total || 0)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981", fontSize: 14, fontWeight: 600, marginTop: 8 }}><span>Paid Amount</span><span>{formatMoney(detail.paidAmount || 0)}</span></div>
              </div>

              <h4 style={{ margin: "0 0 16px", fontSize: 16, color: "#0f172a" }}>Update Status</h4>
              <select style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", outline: "none", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "#334155" }} value={detailStatus} onChange={(e) => setDetailStatus(e.target.value)}>
                <option value="NEW">New</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <input style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #cbd5e1", outline: "none", marginBottom: 16, fontSize: 14 }} value={detailNote} placeholder="Internal note..." onChange={(e) => setDetailNote(e.target.value)} />
              
              <button className="action-btn action-primary" onClick={() => updateStatus(detail.id, detailStatus, detailNote)}>
                <ArrowRight size={16} /> Save Status
              </button>

              <div style={{ margin: "32px 0", height: 1, background: "#e2e8f0" }} />

              <h4 style={{ margin: "0 0 16px", fontSize: 14, color: "#64748b", textTransform: "uppercase" }}>Quick Actions</h4>
              <button className="action-btn action-secondary" onClick={() => updateStatus(detail.id, "ACCEPTED", detailNote)}><Check size={16}/> Accept Order</button>
              <button className="action-btn action-secondary" onClick={() => updateStatus(detail.id, "READY", detailNote)}><Truck size={16}/> Mark Ready</button>
              <button className="action-btn action-secondary" onClick={() => convertToInvoice(detail.id)}><FileText size={16}/> Convert to Invoice</button>
              <button className="action-btn action-danger" onClick={() => cancelOrder(detail.id)} style={{ marginTop: 24 }}><XCircle size={16}/> Cancel Order</button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
