import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { downloadFromApi } from "../../utils/download";
import { useBranch } from '../../context/BranchContext';
import PosReceipt from "../../components/PosReceipt";
import { Eye, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";

export default function InvoicesPage() {
  const { id: routeInvoiceId } = useParams();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ mode: "CASH", amount: 0, note: "" });
  const [reminderPreview, setReminderPreview] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const load = async (branchId = selectedBranchId) => {
    try {
      const params = {
        ...(branchId ? { branchId } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.status ? { status: filters.status } : {})
      };
      const response = await api.get("/owner/invoices", { params });
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setRows(data);
      setStatus((current) => ({ ...current, loading: false, error: "" }));
      setCurrentPage(1);
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false, error: formatApiError(error, "Failed to load invoices") }));
    }
  };

  useEffect(() => {
    let active = true;
    const params = {
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {})
    };
    api.get("/owner/invoices", { params }).then((response) => {
      if (!active) return;
      const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setRows(data);
      setStatus((current) => ({ ...current, loading: false, error: "" }));
      setCurrentPage(1);
    }).catch((error) => {
      if (!active) return;
      setStatus((current) => ({ ...current, loading: false, error: formatApiError(error, "Failed to load invoices") }));
    });
    return () => {
      active = false;
    };
  }, [selectedBranchId, filters]);

  const openDetail = useCallback(async (invoiceId) => {
    try {
      setStatus(curr => ({ ...curr, error: "", success: "" }));
      setReminderPreview("");
      const response = await api.get(`/owner/invoices/${invoiceId}`);
      setSelectedInvoice(response.data);
      navigate(`/admin/invoices/${invoiceId}`, { replace: true });
    } catch (error) {
      setStatus((current) => ({ ...current, error: formatApiError(error, "Failed to load invoice detail") }));
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;
    if (!routeInvoiceId) {
      setSelectedInvoice(null);
      return () => { active = false; };
    }
    (async () => {
      try {
        const response = await api.get(`/owner/invoices/${routeInvoiceId}`);
        if (!active) return;
        setSelectedInvoice(response.data);
      } catch (err) {
        if (!active) return;
        console.error(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [routeInvoiceId]);

  const addPayment = async (invoiceId) => {
    setStatus({ error: "", success: "" });
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      setStatus({ error: "Please enter a valid payment amount greater than zero.", success: "" });
      return;
    }
    const balanceAmt = Number(selectedInvoice?.balanceAmount || 0);
    if (balanceAmt > 0 && amt > balanceAmt + 0.01) {
      setStatus({ error: `Payment amount (₹${amt}) exceeds balance due (₹${balanceAmt}). Please check the amount.`, success: "" });
      return;
    }
    try {
      await api.post("/owner/payments", { invoiceId, ...paymentForm, amount: amt });
      setPaymentForm({ mode: "CASH", amount: 0, note: "" });
      await load(selectedBranchId);
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
      await load(selectedBranchId);
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
      setStatus({ error: "", success: "Payment reminder email sent." });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not send reminder email"), success: "" });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const currentRows = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-shell">
      <div className="item-head" style={{ marginBottom: 18 }}>
        <div>
          <h2>Invoices</h2>
          <p className="muted">Invoice snapshots stay stable even if service prices change later. Payments and cancellation history are enforced from backend rules.</p>
        </div>
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
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {status.loading ? <PageLoader compact title="Loading invoices" message="Preparing invoice list, branch scope, and payment status." /> : null}
          <div className="list-stack" style={{ flex: 1 }}>
            {currentRows.map((row) => (
              <div 
                key={row.id} 
                className={`list-item hoverable ${selectedInvoice?.id === row.id ? "active-row" : ""}`}
                onClick={() => openDetail(row.id)}
                style={{ cursor: "pointer", transition: "background 0.2s" }}
              >
                <div className="item-head">
                  <div>
                    <strong>{row.invoiceNumber}</strong>
                    <div className="item-meta">{row.customer?.name || "Walk-in"} | {row.branch?.name || "Main salon"}</div>
                    <div className="item-meta">Total {String(row.total)} | Paid {String(row.paidAmount)}</div>
                  </div>
                  <span className={`badge badge-${String(row.status).toLowerCase()}`}>{row.status}</span>
                </div>
                <div className="inline-actions" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="secondary-button" onClick={() => openDetail(row.id)} style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Eye size={14} /> View
                  </button>
                  <button type="button" className="secondary-button" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/receipt`, { fallbackFilename: `receipt-${row.invoiceNumber || row.id}.html` })} style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Receipt
                  </button>
                  <button type="button" className="secondary-button" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/pdf`, { fallbackFilename: `invoice-${row.invoiceNumber || row.id}.pdf` })} style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={14} /> PDF
                  </button>
                </div>
              </div>
            ))}
            {!status.loading && !rows.length && <EmptyState title="No invoices found" message="Try another branch or status filter to find matching invoices." />}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Showing page {currentPage} of {totalPages}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "6px", display: "flex", alignItems: "center" }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ padding: "6px", display: "flex", alignItems: "center" }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
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
                {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                  <button type="button" className="secondary-button" onClick={() => sendReminder(selectedInvoice.id)}>Send Reminder</button>
                )}
                {selectedInvoice.status !== "CANCELLED" && selectedInvoice.payments.length === 0 && (
                  <button type="button" className="danger-button" onClick={() => cancelInvoice(selectedInvoice.id)}>Cancel Invoice</button>
                )}
              </div>
              {reminderPreview && <p className="muted no-print" style={{ marginBottom: 12, textAlign: 'right' }}>{reminderPreview}</p>}

              {/* Replacing the old HTML invoice view with PosReceipt inline */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <PosReceipt 
                  invoice={selectedInvoice} 
                  inline={true} 
                  onPrint={handlePrint}
                  onDownload={() => downloadFromApi(`/owner/invoices/${selectedInvoice.id}/receipt`, { fallbackFilename: `receipt-${selectedInvoice.invoiceNumber || selectedInvoice.id}.html` })}
                />
              </div>

              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                <div className="panel-card no-print">
                  <h4 style={{ marginTop: 0 }}>Record Payment</h4>
                  <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 8 }}>Balance Due: <strong style={{ color: "#dc2626" }}>{String(selectedInvoice.balanceAmount)}</strong></div>
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
                      <span className="muted">Amount (click field to auto-fill)</span>
                      <input type="number" min="0" step="0.01" inputMode="decimal" max={Number(selectedInvoice?.balanceAmount || 0) || undefined} value={paymentForm.amount || ""} onFocus={() => {
                        const balanceAmt = Number(selectedInvoice?.balanceAmount || 0);
                        if (balanceAmt > 0) setPaymentForm(prev => ({ ...prev, amount: balanceAmt }));
                      }} onChange={(event) => {
                        const balanceAmt = Number(selectedInvoice?.balanceAmount || 0);
                        const val = Math.min(Number(event.target.value) || 0, balanceAmt || Infinity);
                        setPaymentForm({ ...paymentForm, amount: val });
                      }} />
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
