/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";

export default function OrdersPage() {
  const location = useLocation();
  const params = useParams();
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
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

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id, nextStatus) => {
    try {
      await api.patch(`/owner/orders/${id}/status`, { status: nextStatus });
      setStatus({ error: "", success: `Order moved to ${nextStatus}.` });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update order"), success: "" });
    }
  };

  const cancelOrder = async (id) => {
    try {
      await api.patch(`/owner/orders/${id}/cancel`, { note: "Cancelled from owner panel" });
      setStatus({ error: "", success: "Order cancelled." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel order"), success: "" });
    }
  };

  const convertToInvoice = async (id) => {
    try {
      await api.post(`/owner/orders/${id}/convert-to-invoice`);
      setStatus({ error: "", success: "Order converted to invoice." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not convert order to invoice"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Online Orders"
        description="Manage new, accepted, ready, completed, and cancelled online orders."
        tabs={[
          { label: "All Orders", to: "/admin/orders", hint: "Queue" },
          { label: "New", to: "/admin/orders/new", hint: "Incoming" },
          { label: "Accepted", to: "/admin/orders/accepted", hint: "Picked" },
          { label: "Ready", to: "/admin/orders/ready", hint: "Fulfillment" },
          { label: "Completed", to: "/admin/orders/completed", hint: "Closed" },
          { label: "Cancelled", to: "/admin/orders/cancelled", hint: "Reversed" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Online Orders</h1>
            <p style={{ marginBottom: 0 }}>Monitor every incoming storefront order from queue to invoice conversion with clean status control.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Visible {rows.length}</span>
            <span className="badge">Filter {filter || "ALL"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading online orders" message="Preparing order queue, detail records, and storefront fulfillment summaries." />}
      {summary && <div className="badge-row" style={{ marginBottom: 12 }}><span className="badge">Orders {summary.totalOrders}</span><span className="badge">New {summary.newOrders}</span><span className="badge">Completed {summary.completedOrders}</span><span className="badge">Cancelled {summary.cancelledOrders}</span><span className="badge">Sales {Number(summary.totalSales || 0).toFixed(2)}</span></div>}
      <div className="two-col">
        <div className="panel-card">
          <h3>{filter || "All"} Orders</h3>
          <div className="list-stack">
            {!loading && rows.map((row) => (
              <div key={row.id} className="list-item">
                <div>
                  <strong>{row.orderNumber}</strong>
                  <div className="item-meta">{row.customerName} | {row.status} | {Number(row.total).toFixed(2)}</div>
                </div>
                <div className="inline-actions">
                  <Link className="secondary-button" to={`/admin/orders/${row.id}`}>View</Link>
                  {row.status !== "CANCELLED" && <button type="button" onClick={() => updateStatus(row.id, "ACCEPTED")}>Accept</button>}
                  {row.status === "ACCEPTED" && <button type="button" onClick={() => updateStatus(row.id, "READY")}>Ready</button>}
                  {row.status === "READY" && <button type="button" onClick={() => updateStatus(row.id, "COMPLETED")}>Complete</button>}
                </div>
              </div>
            ))}
            {!loading && !rows.length && <EmptyState title="No orders in this queue" message="When public storefront orders match this status, they will appear here automatically." />}
          </div>
        </div>
        <div className="panel-card">
          <h3>Order Detail</h3>
          {!loading && !detail && <EmptyState title="Select an order to inspect" message="Line items, customer contact, payment state, and status history will appear in this detail pane." />}
          {!loading && detail && (
            <>
              <strong>{detail.orderNumber}</strong>
              <div className="item-meta">{detail.customerName} | {detail.customerPhone} | {detail.paymentStatus}</div>
              <div className="item-meta">Status {detail.status} | Total {Number(detail.total).toFixed(2)}</div>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => convertToInvoice(detail.id)}>Convert to Invoice</button>
                <button type="button" className="secondary-button" onClick={() => window.print()}>Print Receipt</button>
                <button type="button" className="danger-button" onClick={() => cancelOrder(detail.id)}>Cancel Order</button>
              </div>
              <h4>Items</h4>
              <div className="list-stack">{detail.items?.map((item) => <div key={item.id} className="list-item"><strong>{item.productName}</strong><div className="item-meta">Qty {item.qty} | {Number(item.lineTotal).toFixed(2)}</div></div>)}{!detail.items?.length && <EmptyState title="No order items found" message="Product line items are missing for this order record." />}</div>
              <h4>Status History</h4>
              <div className="list-stack">{detail.logs?.map((log) => <div key={log.id} className="list-item"><strong>{log.toStatus}</strong><div className="item-meta">{log.actorName || "System"} | {log.note || "No note"}</div></div>)}{!detail.logs?.length && <EmptyState title="No status history yet" message="Status changes and actor notes will populate here once transitions happen." />}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
