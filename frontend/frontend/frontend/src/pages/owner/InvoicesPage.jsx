import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

export default function InvoicesPage() {
  const { id: routeInvoiceId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ mode: "CASH", amount: 0, note: "" });
  const [reminderPreview, setReminderPreview] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const load = async (branchId = selectedBranch) => {
    const params = {
      ...(branchId ? { branchId } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {})
    };
    const [invoiceResponse, branchResponse] = await Promise.all([
      api.get("/owner/invoices", { params }),
      api.get("/owner/branches")
    ]);
    setRows(invoiceResponse.data);
    setBranches(branchResponse.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/owner/invoices"), api.get("/owner/branches")]).then(([invoiceResponse, branchResponse]) => {
      if (!active) return;
      setRows(invoiceResponse.data);
      setBranches(branchResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = {
      ...(selectedBranch ? { branchId: selectedBranch } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {})
    };
    Promise.all([api.get("/owner/invoices", { params }), api.get("/owner/branches")]).then(([invoiceResponse, branchResponse]) => {
      if (!active) return;
      setRows(invoiceResponse.data);
      setBranches(branchResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, [selectedBranch, filters]);

  const openDetail = useCallback(async (invoiceId) => {
    const response = await api.get(`/owner/invoices/${invoiceId}`);
    setSelectedInvoice(response.data);
    navigate(`/admin/invoices/${invoiceId}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    let active = true;
    if (!routeInvoiceId) return () => {
      active = false;
    };
    (async () => {
      const response = await api.get(`/owner/invoices/${routeInvoiceId}`);
      if (!active) return;
      setSelectedInvoice(response.data);
    })();
    return () => {
      active = false;
    };
  }, [routeInvoiceId]);

  const addPayment = async (invoiceId) => {
    setStatus({ error: "", success: "" });
    try {
      await api.post("/owner/payments", { invoiceId, ...paymentForm, amount: Number(paymentForm.amount) });
      setPaymentForm({ mode: "CASH", amount: 0, note: "" });
      await load(selectedBranch);
      await openDetail(invoiceId);
      setStatus({ error: "", success: "Payment added." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not add payment"), success: "" });
    }
  };

  const cancelInvoice = async (invoiceId) => {
    setStatus({ error: "", success: "" });
    try {
      await api.patch(`/owner/invoices/${invoiceId}/cancel`);
      await load(selectedBranch);
      setSelectedInvoice(null);
      navigate("/admin/invoices", { replace: true });
      setStatus({ error: "", success: "Invoice cancelled." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel invoice"), success: "" });
    }
  };

  const sendReminder = async (invoiceId) => {
    setStatus({ error: "", success: "" });
    try {
      const response = await api.post(`/owner/invoices/${invoiceId}/payment-reminder`);
      setReminderPreview(response.data.reminderPreview || "");
      await openDetail(invoiceId);
      setStatus({ error: "", success: "Payment reminder placeholder logged." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not log reminder"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <div className="item-head" style={{ marginBottom: 18 }}>
        <div>
          <h2>Invoices</h2>
          <p className="muted">Invoice snapshots stay stable even if service prices change later. Payments and cancellation history are enforced from backend rules.</p>
        </div>
        <label>
              <span className="muted">Branches</span>
              <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
            </label>
      </div>
      <div className="form-grid" style={{ marginBottom: 18 }}>
        <label>
              <span className="muted">Search invoice number or customer</span>
              <input value={filters.q} placeholder="Search invoice number or customer" onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} />
            </label>
        <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">All statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
            </label>
        <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "" })}>Reset</button>
      </div>

      {status.error && <p className="error-text">{status.error}</p>}
      {status.success && <p className="success-text">{status.success}</p>}

      <div className="two-col">
        <div className="panel-card">
          {status.loading ? <PageLoader compact title="Loading invoices" message="Preparing invoice list, branch scope, and payment status." /> : null}
          <div className="list-stack">
            {rows.map((row) => (
              <div key={row.id} className={`list-item ${selectedInvoice?.id === row.id ? "active-row" : ""}`}>
                <div className="item-head">
                  <div>
                    <strong>{row.invoiceNumber}</strong>
                    <div className="item-meta">{row.customer?.name || "Walk-in"} | {row.branch?.name || "Main salon"}</div>
                    <div className="item-meta">Total {String(row.total)} | Paid {String(row.paidAmount)}</div>
                  </div>
                  <span className={`badge badge-${String(row.status).toLowerCase()}`}>{row.status}</span>
                </div>
                <div className="inline-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="secondary-button" onClick={() => openDetail(row.id)}>View Detail</button>
                  <a href={`http://127.0.0.1:5050/api/v1/owner/invoices/${row.id}/receipt`} target="_blank" rel="noreferrer">Open Receipt</a>
                  <a href={`http://127.0.0.1:5050/api/v1/owner/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer">Open PDF</a>
                </div>
              </div>
            ))}
            {!status.loading && !rows.length && <EmptyState title="No invoices found" message="Try another branch or status filter to find matching invoices." />}
          </div>
        </div>

        <div className="panel-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
          {!selectedInvoice && (
            <div className="panel-card">
              <h3>Invoice Detail</h3>
              <EmptyState title="Select an invoice" message="Choose an invoice from the list to inspect items, payments, reminders, and receipt actions." />
            </div>
          )}
          {selectedInvoice && (
            <>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 10 }}>
                <button type="button" className="secondary-button" onClick={() => window.print()}>Print Invoice</button>
                {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                  <button type="button" className="secondary-button" onClick={() => sendReminder(selectedInvoice.id)}>Send Reminder</button>
                )}
                {selectedInvoice.status !== "CANCELLED" && selectedInvoice.payments.length === 0 && (
                  <button type="button" className="danger-button" onClick={() => cancelInvoice(selectedInvoice.id)}>Cancel Invoice</button>
                )}
              </div>
              {reminderPreview && <p className="muted no-print" style={{ marginBottom: 12, textAlign: 'right' }}>{reminderPreview}</p>}

              <div className="invoice-paper">
                <div className="invoice-header">
                  <div>
                    <h1>INVOICE</h1>
                    <p style={{ margin: 0, color: '#64748b' }}>Invoice #: <strong>{selectedInvoice.invoiceNumber}</strong></p>
                    <p style={{ margin: '6px 0 0 0', color: '#64748b' }}>Status: <span className={`badge badge-${String(selectedInvoice.status).toLowerCase()}`}>{selectedInvoice.status}</span></p>
                  </div>
                  <div className="invoice-meta-info">
                    <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>{selectedInvoice.branch?.name || "Main salon"}</h2>
                    <p style={{ margin: 0, color: '#475569' }}>Billed To: <strong>{selectedInvoice.customer?.name || "Walk-in Customer"}</strong></p>
                    <p style={{ margin: '6px 0 0 0', color: '#475569' }}>Date: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Staff</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.serviceName}</strong></td>
                        <td>{item.staffName || "-"}</td>
                        <td>{item.qty}</td>
                        <td>{String(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{String(Number(item.qty) * Number(item.unitPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="invoice-totals">
                  <div className="invoice-totals-box">
                    <div className="invoice-totals-row">
                      <span>Subtotal</span>
                      <span>{String(selectedInvoice.total)}</span>
                    </div>
                    <div className="invoice-totals-row">
                      <span>Discount</span>
                      <span>{String(selectedInvoice.discount)}</span>
                    </div>
                    <div className="invoice-totals-row">
                      <span>Tax</span>
                      <span>{String(selectedInvoice.tax)}</span>
                    </div>
                    <div className="invoice-totals-row grand-total">
                      <span>Total</span>
                      <span>{String(selectedInvoice.total)}</span>
                    </div>
                    <div className="invoice-totals-row" style={{ marginTop: 8 }}>
                      <span>Amount Paid</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{String(selectedInvoice.paidAmount)}</span>
                    </div>
                    <div className="invoice-totals-row balance-due">
                      <span>Balance Due</span>
                      <span>{String(selectedInvoice.balanceAmount)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.payments.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <h4 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: 8, margin: '0 0 16px 0' }}>Payment History</h4>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Method</th>
                          <th>Note</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "Recorded"}</td>
                            <td><span className="badge">{payment.mode}</span></td>
                            <td className="muted">{payment.note || "-"}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{String(payment.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                <div className="panel-card no-print" style={{ marginTop: 24 }}>
                  <h4 style={{ marginTop: 0 }}>Record Payment</h4>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: 'flex-end' }}>
                    <label style={{ flex: 1, minWidth: 150 }}>
                      <span className="muted">Method</span>
                      <select value={paymentForm.mode} onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </label>
                    <label style={{ flex: 1, minWidth: 150 }}>
                      <span className="muted">Amount</span>
                      <input type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                    </label>
                    <label style={{ flex: 2, minWidth: 200 }}>
                      <span className="muted">Note (Optional)</span>
                      <input value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} />
                    </label>
                    <button type="button" onClick={() => addPayment(selectedInvoice.id)} style={{ height: 44 }}>Add Payment</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

