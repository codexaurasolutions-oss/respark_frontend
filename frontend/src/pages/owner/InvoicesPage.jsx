import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { downloadFromApi } from "../../utils/download";
import "./InvoicesPage.css";

export default function InvoicesPage() {
  const { id: routeInvoiceId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ mode: "CASH", amount: "", note: "" });
  const [reminderPreview, setReminderPreview] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load branches once
  useEffect(() => {
    let active = true;
    api.get("/owner/branches")
      .then((res) => {
        if (active) setBranches(res.data);
      })
      .catch((err) => console.error("Could not load branches:", err));
    return () => {
      active = false;
    };
  }, []);

  // Main load function for invoices
  const loadInvoices = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true }));
    try {
      const params = {
        ...(selectedBranch ? { branchId: selectedBranch } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.status ? { status: filters.status } : {})
      };
      const res = await api.get("/owner/invoices", { params });
      setRows(res.data);
      setStatus((current) => ({ ...current, loading: false, error: "" }));
    } catch (err) {
      setStatus((current) => ({ ...current, loading: false, error: formatApiError(err, "Could not load invoices") }));
    }
  }, [selectedBranch, filters]);

  // Load invoices on search/filter/branch update
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Load invoice details if route contains ID
  useEffect(() => {
    let active = true;
    if (!routeInvoiceId) {
      setSelectedInvoice(null);
      return;
    }
    (async () => {
      try {
        const response = await api.get(`/owner/invoices/${routeInvoiceId}`);
        if (active) {
          setSelectedInvoice(response.data);
          // Pre-fill payment form with remaining balance
          setPaymentForm({
            mode: "CASH",
            amount: String(response.data.balanceAmount || 0),
            note: ""
          });
        }
      } catch (err) {
        console.error("Could not load invoice details:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [routeInvoiceId]);

  const openDetail = useCallback((invoiceId) => {
    navigate(`/admin/invoices/${invoiceId}`, { replace: true });
  }, [navigate]);

  const handleDownload = async (invoiceId, type) => {
    setStatus({ error: "", success: "" });
    setDownloadingId({ id: invoiceId, type });
    try {
      const url = `/owner/invoices/${invoiceId}/${type}`;
      const filename = `${type === "receipt" ? "receipt" : "invoice"}-${invoiceId}.${type === "receipt" ? "html" : "pdf"}`;
      await downloadFromApi(url, { fallbackFilename: filename });
      setStatus({ error: "", success: `Invoice ${type === "receipt" ? "receipt" : "PDF"} downloaded successfully.` });
    } catch (err) {
      console.error(err);
      setStatus({ error: formatApiError(err, `Could not download invoice ${type}`), success: "" });
    } finally {
      setDownloadingId(null);
    }
  };

  const addPayment = async (invoiceId) => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setStatus({ error: "Please enter a valid payment amount.", success: "" });
      return;
    }
    setStatus({ error: "", success: "" });
    setActionLoading(true);
    try {
      await api.post("/owner/payments", {
        invoiceId,
        mode: paymentForm.mode,
        amount: Number(paymentForm.amount),
        note: paymentForm.note
      });
      
      // Reload invoices list and details
      await loadInvoices();
      const response = await api.get(`/owner/invoices/${invoiceId}`);
      setSelectedInvoice(response.data);
      setPaymentForm({ mode: "CASH", amount: String(response.data.balanceAmount || 0), note: "" });
      setStatus({ error: "", success: "Payment successfully added." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not add payment"), success: "" });
    } finally {
      setActionLoading(false);
    }
  };

  const cancelInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to cancel this invoice? This action cannot be undone.")) return;
    setStatus({ error: "", success: "" });
    setActionLoading(true);
    try {
      await api.patch(`/owner/invoices/${invoiceId}/cancel`);
      await loadInvoices();
      setSelectedInvoice(null);
      navigate("/admin/invoices", { replace: true });
      setStatus({ error: "", success: "Invoice cancelled successfully." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel invoice"), success: "" });
    } finally {
      setActionLoading(false);
    }
  };

  const sendReminder = async (invoiceId) => {
    setStatus({ error: "", success: "" });
    setActionLoading(true);
    try {
      const response = await api.post(`/owner/invoices/${invoiceId}/payment-reminder`);
      setReminderPreview(response.data.reminderPreview || "Payment reminder has been sent.");
      setStatus({ error: "", success: "Payment reminder successfully sent to guest." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send reminder email"), success: "" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="invoices-page page-shell">
      {/* Header Area */}
      <div className="invoices-header-area">
        <div className="invoices-header-left">
          <h2>Invoices Management</h2>
          <p>Inspect invoices, view payment details, print receipts, and manage outstanding balances.</p>
        </div>
        <div className="branch-select-wrapper no-print">
          <span>Branch Scope</span>
          <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Card */}
      <div className="filters-card no-print">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search Invoice or Guest</label>
            <input 
              value={searchQuery} 
              placeholder="Search by invoice number or guest name..." 
              onChange={(event) => setSearchQuery(event.target.value)} 
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setFilters((current) => ({ ...current, q: searchQuery }));
                }
              }}
            />
          </div>
          <div className="filter-group">
            <label>Statuses</label>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div className="filter-actions">
            <button type="button" className="btn-filter-search" onClick={() => setFilters((current) => ({ ...current, q: searchQuery }))}>Apply Filters</button>
            <button type="button" className="btn-filter-reset" onClick={() => {
              setSearchQuery("");
              setSelectedBranch("");
              setFilters({ q: "", status: "" });
            }}>Reset</button>
          </div>
        </div>
      </div>

      {status.error && (
        <div className="alert-box error no-print">
          <span>⚠️</span> {status.error}
        </div>
      )}
      {status.success && (
        <div className="alert-box success no-print">
          <span>✅</span> {status.success}
        </div>
      )}

      {/* Two Columns Layout */}
      <div className="invoices-layout">
        {/* Left column - list of invoices */}
        <div className="invoices-list-panel no-print">
          {status.loading && rows.length === 0 ? (
            <PageLoader compact title="Loading Invoices" message="Preparing invoice records..." />
          ) : (
            <div className="list-stack">
              {rows.map((row) => (
                <div 
                  key={row.id} 
                  className={`invoice-card ${selectedInvoice?.id === row.id ? "active-card" : ""}`}
                  onClick={() => openDetail(row.id)}
                >
                  <div className="invoice-card-header">
                    <span className="invoice-id">{row.invoiceNumber}</span>
                    <span className={`invoice-status-badge ${String(row.status).toLowerCase()}`}>{row.status}</span>
                  </div>
                  <div className="customer-name">{row.customer?.name || "Walk-in Guest"}</div>
                  <div className="meta-details">
                    <span>Branch: <strong>{row.branch?.name || "Main salon"}</strong></span>
                    <span>Total: <strong>₹{Number(row.total || 0).toFixed(2)}</strong> | Paid: <strong style={{ color: "#16a34a" }}>₹{Number(row.paidAmount || 0).toFixed(2)}</strong></span>
                  </div>
                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="btn-card-action view-detail" onClick={() => openDetail(row.id)}>View Detail</button>
                    <button 
                      type="button" 
                      className="btn-card-action" 
                      disabled={downloadingId?.id === row.id && downloadingId?.type === "receipt"}
                      onClick={() => handleDownload(row.id, "receipt")}
                    >
                      {downloadingId?.id === row.id && downloadingId?.type === "receipt" ? "Downloading..." : "Receipt 📄"}
                    </button>
                    <button 
                      type="button" 
                      className="btn-card-action"
                      disabled={downloadingId?.id === row.id && downloadingId?.type === "pdf"}
                      onClick={() => handleDownload(row.id, "pdf")}
                    >
                      {downloadingId?.id === row.id && downloadingId?.type === "pdf" ? "Downloading..." : "PDF 📥"}
                    </button>
                  </div>
                </div>
              ))}
              {!status.loading && !rows.length && <EmptyState title="No invoices found" message="Try adjusting your filters or search terms." />}
            </div>
          )}
        </div>

        {/* Right column - invoice details & paper receipt view */}
        <div className="invoice-detail-panel">
          {!selectedInvoice ? (
            <div className="invoice-paper-wrapper" style={{ padding: "40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
              <EmptyState title="Select Invoice" message="Choose an invoice from the list to display thermal layout, transaction notes, and payment functions." />
            </div>
          ) : (
            <>
              {/* Detail Actions Bar */}
              <div className="detail-actions-bar no-print">
                <button type="button" className="btn-action-secondary" onClick={() => window.print()}>🖨️ Print Invoice</button>
                {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                  <button type="button" className="btn-action-primary" disabled={actionLoading} onClick={() => sendReminder(selectedInvoice.id)}>
                    {actionLoading ? "Sending..." : "✉️ Send Reminder"}
                  </button>
                )}
                {selectedInvoice.status !== "CANCELLED" && selectedInvoice.payments?.length === 0 && (
                  <button type="button" className="btn-action-danger" disabled={actionLoading} onClick={() => cancelInvoice(selectedInvoice.id)}>
                    {actionLoading ? "Cancelling..." : "🚫 Cancel Invoice"}
                  </button>
                )}
              </div>

              {reminderPreview && (
                <div className="alert-box success no-print" style={{ margin: "0 0 16px 0" }}>
                  <span>📢 Reminder sent:</span> {reminderPreview}
                </div>
              )}

              {/* Thermal Invoice Paper design */}
              <div className="invoice-paper-wrapper">
                <div className="invoice-paper">
                  <div className="invoice-paper-header">
                    <div className="invoice-paper-meta-left">
                      <h1>INVOICE</h1>
                      <div style={{ fontSize: "14px", color: "#64748b" }}>
                        Invoice ID: <strong style={{ color: "#0f172a" }}>{selectedInvoice.invoiceNumber}</strong>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span className={`invoice-status-badge ${String(selectedInvoice.status).toLowerCase()}`}>{selectedInvoice.status}</span>
                      </div>
                    </div>
                    <div className="invoice-paper-meta-right">
                      <h2>{selectedInvoice.branch?.name || "Main salon"}</h2>
                      <div style={{ fontSize: "13px", color: "#475569" }}>
                        Billed To: <strong>{selectedInvoice.customer?.name || "Walk-in Customer"}</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Date: {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <table className="invoice-paper-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Staff</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.serviceName}</strong></td>
                          <td>{item.staffName || "-"}</td>
                          <td>{item.qty}</td>
                          <td>₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>₹{(Number(item.qty || 1) * Number(item.unitPrice || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Summary */}
                  <div className="invoice-totals-container">
                    <div className="invoice-totals-box">
                      <div className="totals-row">
                        <span>Subtotal</span>
                        <span>₹{Number(selectedInvoice.total || 0).toFixed(2)}</span>
                      </div>
                      {Number(selectedInvoice.discount || 0) > 0 && (
                        <div className="totals-row" style={{ color: "#16a34a" }}>
                          <span>Discount</span>
                          <span>- ₹{Number(selectedInvoice.discount).toFixed(2)}</span>
                        </div>
                      )}
                      {Number(selectedInvoice.tax || 0) > 0 && (
                        <div className="totals-row">
                          <span>Tax</span>
                          <span>+ ₹{Number(selectedInvoice.tax).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="totals-row grand-total">
                        <span>Total Amount</span>
                        <span>₹{Number(selectedInvoice.total || 0).toFixed(2)}</span>
                      </div>
                      <div className="totals-row" style={{ marginTop: "4px" }}>
                        <span>Amount Paid</span>
                        <span style={{ color: "#16a34a", fontWeight: 600 }}>₹{Number(selectedInvoice.paidAmount || 0).toFixed(2)}</span>
                      </div>
                      {Number(selectedInvoice.balanceAmount || 0) > 0 && (
                        <div className="totals-row balance-due">
                          <span>Balance Due</span>
                          <span>₹{Number(selectedInvoice.balanceAmount).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment transactions history */}
                  {selectedInvoice.payments?.length > 0 && (
                    <div style={{ marginTop: "24px" }}>
                      <div className="payment-history-title">Payment History</div>
                      <table className="invoice-paper-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Method</th>
                            <th>Note</th>
                            <th style={{ textAlign: "right" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("en-IN") : "Recorded"}</td>
                              <td><span className="invoice-status-badge paid">{payment.mode}</span></td>
                              <td style={{ color: "#64748b", fontSize: "12px" }}>{payment.note || "-"}</td>
                              <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>₹{Number(payment.amount || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Payment transaction card */}
              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                <div className="record-payment-card no-print">
                  <h4>Record Invoice Payment</h4>
                  <div className="payment-fields-grid">
                    <div className="filter-group">
                      <label>Method</label>
                      <select value={paymentForm.mode} onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Amount (₹)</label>
                      <input type="number" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                    </div>
                    <div className="filter-group">
                      <label>Note (Optional)</label>
                      <input placeholder="Receipt reference, check details, etc." value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} />
                    </div>
                    <button type="button" className="btn-add-payment" disabled={actionLoading} onClick={() => addPayment(selectedInvoice.id)}>
                      {actionLoading ? "Recording..." : "Record Payment"}
                    </button>
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
