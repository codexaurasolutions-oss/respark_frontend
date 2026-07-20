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
    <div className="page-shell" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ padding: '0 4px 24px 4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '8px' }}>Invoices & Billing</h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '800px', margin: 0 }}>
          View comprehensive invoice snapshots that remain stable over time. Manage payments, track cancellations, and download receipts directly from this dashboard.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', padding: '0 4px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Search</div>
          <input 
            value={filters.q} 
            placeholder="Search by invoice number or customer name..." 
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
        </div>
        <div style={{ width: '200px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</div>
          <select 
            value={filters.status} 
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#fff', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '0.65em auto', boxSizing: 'border-box' }}
          >
            <option value="">All statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button 
            type="button" 
            onClick={() => setFilters({ q: "", status: "" })} 
            style={{ height: '46px', padding: '0 24px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {status.error && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca' }}>{status.error}</div>}
      {status.success && <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>{status.success}</div>}

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: '32px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {status.loading ? <PageLoader compact title="Loading invoices" message="Preparing invoice list..." /> : null}
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentRows.map((row) => {
              const isSelected = selectedInvoice?.id === row.id;
              return (
              <div 
                key={row.id} 
                onClick={() => openDetail(row.id)}
                style={{ 
                  cursor: "pointer", 
                  transition: "all 0.2s ease-in-out",
                  padding: "20px",
                  borderRadius: "16px",
                  backgroundColor: isSelected ? "#f8fafc" : "#ffffff",
                  border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  boxShadow: isSelected ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "0 2px 4px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.04)'; } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; } }}
              >
                {isSelected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: '#3b82f6' }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{row.invoiceNumber}</h3>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '500', color: '#334155' }}>{row.customer?.name || "Walk-in"}</span>
                      <span>•</span>
                      <span>{row.branch?.name || "Main salon"}</span>
                    </div>
                  </div>
                  <span className={`badge badge-${String(row.status).toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>{row.status}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Amount</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>₹{String(row.total)}</span>
                  </div>
                  <div style={{ width: '1px', height: '30px', backgroundColor: '#cbd5e1' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Amount Paid</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: row.paidAmount < row.total ? '#eab308' : '#10b981' }}>₹{String(row.paidAmount)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openDetail(row.id)} style={{ flex: 1, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#334155", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                    <Eye size={16} color="#64748b" /> View
                  </button>
                  <button type="button" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/receipt`, { fallbackFilename: `receipt-${row.invoiceNumber || row.id}.html` })} style={{ flex: 1, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#334155", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                    <Download size={16} color="#64748b" /> Receipt
                  </button>
                  <button type="button" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/pdf`, { fallbackFilename: `invoice-${row.invoiceNumber || row.id}.pdf` })} style={{ flex: 1, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", color: "#334155", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                    <FileText size={16} color="#64748b" /> PDF
                  </button>
                </div>
              </div>
            )})}
            {!status.loading && !rows.length && <EmptyState title="No invoices found" message="Try another branch or status filter to find matching invoices." />}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.9rem", color: '#64748b', fontWeight: '500' }}>Showing page <strong style={{ color: '#0f172a' }}>{currentPage}</strong> of <strong style={{ color: '#0f172a' }}>{totalPages}</strong></span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={{ width: '36px', height: '36px', display: "flex", alignItems: "center", justifyContent: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                >
                  <ChevronLeft size={18} color="#334155" />
                </button>
                <button
                  type="button"
                  style={{ width: '36px', height: '36px', display: "flex", alignItems: "center", justifyContent: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                >
                  <ChevronRight size={18} color="#334155" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: '24px' }}>
          {!selectedInvoice && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 24px', border: '1px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <FileText size={48} color="#94a3b8" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '1.25rem' }}>No Invoice Selected</h3>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', maxWidth: '250px' }}>Choose an invoice from the list to view its complete receipt and record payments.</p>
            </div>
          )}
          {selectedInvoice && (
            <>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 12 }}>
                {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                  <button type="button" onClick={() => sendReminder(selectedInvoice.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}>
                    Send Reminder
                  </button>
                )}
                {selectedInvoice.status !== "CANCELLED" && selectedInvoice.payments.length === 0 && (
                  <button type="button" onClick={() => cancelInvoice(selectedInvoice.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: '#fef2f2', color: '#b91c1c', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}>
                    Cancel Invoice
                  </button>
                )}
              </div>
              {reminderPreview && <p className="muted no-print" style={{ marginBottom: 16, textAlign: 'right', fontSize: '0.9rem' }}>{reminderPreview}</p>}

              {/* Replacing the old HTML invoice view with PosReceipt inline */}
              <div style={{ background: '#ffffff', padding: '0', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <PosReceipt 
                  invoice={selectedInvoice} 
                  inline={true} 
                  onPrint={handlePrint}
                  onDownload={() => downloadFromApi(`/owner/invoices/${selectedInvoice.id}/receipt`, { fallbackFilename: `receipt-${selectedInvoice.invoiceNumber || selectedInvoice.id}.html` })}
                />
              </div>

              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '24px' }} className="no-print">
                  <h4 style={{ marginTop: 0, fontSize: '1.2rem', color: '#0f172a', marginBottom: '8px' }}>Record Payment</h4>
                  <div style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    Outstanding Balance: <strong style={{ color: "#dc2626", fontSize: '1.1rem' }}>₹{String(selectedInvoice.balanceAmount)}</strong>
                  </div>
                  <div style={{ display: "flex", gap: '16px', flexWrap: "wrap", alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Method</div>
                      <select 
                        value={paymentForm.mode} 
                        onChange={(event) => setPaymentForm({ ...paymentForm, mode: event.target.value })}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '0.65em auto' }}
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Tx</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Amount</div>
                      <input 
                        type="number" min="0" step="0.01" inputMode="decimal" 
                        max={Number(selectedInvoice?.balanceAmount || 0) || undefined} 
                        value={paymentForm.amount || ""} 
                        onFocus={() => {
                          const balanceAmt = Number(selectedInvoice?.balanceAmount || 0);
                          if (balanceAmt > 0 && !paymentForm.amount) setPaymentForm(prev => ({ ...prev, amount: balanceAmt }));
                        }} 
                        onChange={(event) => {
                          const balanceAmt = Number(selectedInvoice?.balanceAmount || 0);
                          const val = Math.min(Number(event.target.value) || 0, balanceAmt || Infinity);
                          setPaymentForm({ ...paymentForm, amount: val });
                        }} 
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#fff', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                      />
                    </div>
                    <div style={{ flex: 2, minWidth: '160px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Internal Note <span style={{ color: '#94a3b8', fontWeight: '400' }}>(Optional)</span></div>
                      <input 
                        value={paymentForm.note} 
                        onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} 
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', backgroundColor: '#fff', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        placeholder="e.g. Txn ID"
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => addPayment(selectedInvoice.id)} 
                      style={{ height: '46px', padding: '0 24px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)', flexShrink: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)'; }}
                    >
                      Pay
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
