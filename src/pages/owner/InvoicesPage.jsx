import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";
import { downloadFromApi } from "../../utils/download";
import { useAuth } from "../../context/AuthContext";
import { Ticket, X, Download, FileText, Send, Printer } from "lucide-react";
import PosReceipt from "../../components/PosReceipt";
import "./InvoicesPage.css";

const currency = (value) => `₹${Number(value || 0).toFixed(0)}`;

export default function InvoicesPage() {
  const { auth } = useAuth();
  const { id: routeInvoiceId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ mode: "CASH", amount: 0, note: "" });
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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = {
      ...(selectedBranch ? { branchId: selectedBranch } : {}),
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {})
    };
    api.get("/owner/invoices", { params }).then((res) => {
      if (!active) return;
      setRows(res.data);
    });
    return () => { active = false; };
  }, [selectedBranch, filters]);

  const openDetail = useCallback(async (invoiceId) => {
    const response = await api.get(`/owner/invoices/${invoiceId}`);
    setSelectedInvoice(response.data);
    navigate(`/admin/invoices/${invoiceId}`, { replace: true });
  }, [navigate]);

  const closeDetail = () => {
    setSelectedInvoice(null);
    navigate(`/admin/invoices`, { replace: true });
  }

  useEffect(() => {
    let active = true;
    if (!routeInvoiceId) return () => { active = false; };
    (async () => {
      try {
        const response = await api.get(`/owner/invoices/${routeInvoiceId}`);
        if (!active) return;
        setSelectedInvoice(response.data);
      } catch (err) {}
    })();
    return () => { active = false; };
  }, [routeInvoiceId]);

  const addPayment = async (invoiceId) => {
    setStatus({ error: "", success: "", loading: false });
    try {
      await api.post("/owner/payments", { invoiceId, ...paymentForm, amount: Number(paymentForm.amount) });
      setPaymentForm({ mode: "CASH", amount: 0, note: "" });
      await load(selectedBranch);
      await openDetail(invoiceId);
      setStatus({ error: "", success: "Payment added.", loading: false });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not add payment"), success: "", loading: false });
    }
  };

  const cancelInvoice = async (invoiceId) => {
    setStatus({ error: "", success: "", loading: false });
    try {
      await api.patch(`/owner/invoices/${invoiceId}/cancel`);
      await load(selectedBranch);
      closeDetail();
      setStatus({ error: "", success: "Invoice cancelled.", loading: false });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not cancel invoice"), success: "", loading: false });
    }
  };

  const sendReminder = async (invoiceId) => {
    setStatus({ error: "", success: "", loading: false });
    try {
      await api.post(`/owner/invoices/${invoiceId}/payment-reminder`);
      setStatus({ error: "", success: "Payment reminder logged.", loading: false });
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not log reminder"), success: "", loading: false });
    }
  };

  const salonName = auth?.membership?.salon?.name || auth?.membership?.salonName || "Skillify Salon";
  const salonPhone = auth?.membership?.salon?.phone || "";
  const salonEmail = auth?.membership?.salon?.email || "";
  const salonAddress = auth?.membership?.salon?.address || selectedInvoice?.branch?.address || selectedInvoice?.branch?.name || "Main branch";

  return (
    <div className="invoices-page">
      <div className="invoices-header-area">
        <div className="invoices-header-left">
          <h2>Invoices</h2>
          <div className="invoices-search-bar">
             <input type="text" placeholder="Search invoice or customer..." value={filters.q} onChange={(e) => setFilters(c => ({...c, q: e.target.value}))} />
          </div>
          <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div className="invoices-header-right">
          <div className="invoices-status-filters">
            <button className={`invoice-filter-pill ${filters.status === '' ? 'active' : ''}`} onClick={() => setFilters(c => ({...c, status: ''}))}>Total <span>{rows.length}</span></button>
            <button className={`invoice-filter-pill ${filters.status === 'UNPAID' ? 'active' : ''}`} onClick={() => setFilters(c => ({...c, status: 'UNPAID'}))}>Unpaid</button>
            <button className={`invoice-filter-pill ${filters.status === 'PARTIAL' ? 'active' : ''}`} onClick={() => setFilters(c => ({...c, status: 'PARTIAL'}))}>Partial</button>
            <button className={`invoice-filter-pill ${filters.status === 'PAID' ? 'active' : ''}`} onClick={() => setFilters(c => ({...c, status: 'PAID'}))}>Paid</button>
            <button className={`invoice-filter-pill ${filters.status === 'CANCELLED' ? 'active' : ''}`} onClick={() => setFilters(c => ({...c, status: 'CANCELLED'}))}>Cancelled</button>
          </div>
        </div>
      </div>

      {status.error && <p className="error-text" style={{ padding: '0 16px', marginBottom: 16 }}>{status.error}</p>}
      {status.success && <p className="success-text" style={{ padding: '0 16px', marginBottom: 16 }}>{status.success}</p>}

      {status.loading ? (
        <PageLoader title="Loading Invoices" message="Fetching billing data..." />
      ) : (
        <div className="invoice-grid">
          {rows.map(row => (
            <div key={row.id} className="invoice-card" onClick={() => openDetail(row.id)}>
               <div className="invoice-card-header">
                  <div className="invoice-card-id">{row.invoiceNumber}</div>
                  <div className={`invoice-badge ${String(row.status).toLowerCase()}`}>{row.status}</div>
               </div>
               <div className="invoice-card-body">
                  <div className="invoice-card-customer">{row.customer?.name || "Walk-in Customer"}</div>
                  <div className="invoice-card-meta">
                    <span>{row.branch?.name || "Main salon"}</span>
                    <span>{new Date(row.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                  </div>
               </div>
               <div className="invoice-card-footer">
                  <div>
                    <div className="invoice-card-total">Total {currency(row.total)}</div>
                    <div className="invoice-card-paid">Paid {currency(row.paidAmount)}</div>
                  </div>
                  <div className="invoice-card-actions" onClick={e => e.stopPropagation()}>
                     <button className="invoice-card-btn" title="Download PDF" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/pdf`, { fallbackFilename: `invoice-${row.invoiceNumber}.pdf` })}><Download size={16} /></button>
                     <button className="invoice-card-btn" title="Download HTML Receipt" onClick={() => downloadFromApi(`/owner/invoices/${row.id}/receipt`, { fallbackFilename: `receipt-${row.invoiceNumber}.html` })}><FileText size={16} /></button>
                  </div>
               </div>
            </div>
          ))}
          {!rows.length && (
            <div style={{ gridColumn: '1 / -1' }}>
               <EmptyState title="No invoices found" message="Try another branch or status filter to find matching invoices." />
            </div>
          )}
        </div>
      )}

      {selectedInvoice && (
        <div className="premium-modal-overlay bill-modal-overlay" onClick={closeDetail}>
          <div className="premium-modal-content bill-invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bill-invoice-header">
              Bill Invoice
              <button onClick={closeDetail} style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <div className="bill-invoice-body">
              <div className="bill-invoice-logo">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                <div className="bill-invoice-company">{salonName}</div>
              </div>
              
              <div className="bill-invoice-meta">
                <div className="bill-invoice-meta-col">
                  <strong>Bill To : {selectedInvoice.customer?.name || "Walk-in Customer"}</strong>
                  <span>Phone : {selectedInvoice.customer?.phone || "N/A"}</span>
                  <span>Invoice ID : {selectedInvoice.invoiceNumber}</span>
                  <span style={{marginTop: 6}}><strong>Status : </strong> <span className={`invoice-badge ${String(selectedInvoice.status).toLowerCase()}`} style={{fontSize: 9}}>{selectedInvoice.status}</span></span>
                </div>
                <div className="bill-invoice-address">
                  {salonAddress}
                  <br />
                  {salonPhone && <span>+91 {salonPhone}<br/></span>}
                  {salonEmail && <span>{salonEmail}<br/></span>}
                  GSTIN 36ACCFA5913E1ZR
                  <br /><br />
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                    <span><strong>Date : </strong> {new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                    <span><strong>Time : </strong> {new Date(selectedInvoice.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="bill-invoice-table-title">Service Bill</div>
              <table className="bill-invoice-table">
                <thead>
                  <tr>
                    <th>Sr.</th>
                    <th>Item</th>
                    <th>Expert</th>
                    <th>Rate</th>
                    <th>Qty.</th>
                    <th>Amt.</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, index) => {
                    const price = Number(item.unitPrice || 0);
                    const qty = Number(item.qty || 1);
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item.serviceName || item.productName || item.name || "Item"}</td>
                        <td>{item.staff?.user?.name || item.staffName || "-"}</td>
                        <td>{price.toFixed(0)}</td>
                        <td>{qty}</td>
                        <td>{(price * qty).toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="bill-invoice-summary" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div>SubTotal {currency(selectedInvoice.subtotal || selectedInvoice.total)}</div>
                {Number(selectedInvoice.discount || 0) > 0 && <div style={{ color: '#22c55e' }}>Discount -{currency(selectedInvoice.discount)}</div>}
                {Number(selectedInvoice.tax || 0) > 0 && <div style={{ color: '#ef4444' }}>Tax {currency(selectedInvoice.tax)}</div>}
                <div style={{ fontSize: 16 }}>Grand Total {currency(selectedInvoice.total)}</div>
                <div style={{ color: '#22c55e' }}>Paid Amount {currency(selectedInvoice.paidAmount)}</div>
                <div style={{ color: '#ef4444' }}>Balance Due {currency(selectedInvoice.balanceAmount)}</div>
              </div>

              {selectedInvoice.payments?.length > 0 && (
                 <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                    <div className="bill-invoice-table-title" style={{color: '#64748b'}}>Payment History</div>
                    <table className="bill-invoice-table" style={{marginTop: 8}}>
                       <thead>
                          <tr>
                             <th>Date</th>
                             <th>Method</th>
                             <th>Amount</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedInvoice.payments.map((p, i) => (
                             <tr key={i}>
                                <td>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                                <td>{p.mode}</td>
                                <td>{currency(p.amount)}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}

              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                 <div className="payment-form-section">
                    <div style={{fontWeight: 600, color: '#0f172a', marginBottom: 12}}>Record Payment</div>
                    <div className="payment-form-grid">
                       <div className="payment-form-group">
                          <label>Method</label>
                          <select value={paymentForm.mode} onChange={(e) => setPaymentForm(c => ({...c, mode: e.target.value}))}>
                             <option value="CASH">Cash</option>
                             <option value="CARD">Card</option>
                             <option value="UPI">UPI</option>
                             <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                       </div>
                       <div className="payment-form-group">
                          <label>Amount</label>
                          <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(c => ({...c, amount: e.target.value}))} />
                       </div>
                       <div className="payment-form-group">
                          <label>Note (Optional)</label>
                          <input type="text" placeholder="Add payment note..." value={paymentForm.note} onChange={(e) => setPaymentForm(c => ({...c, note: e.target.value}))} />
                       </div>
                       <button className="btn-pay" onClick={() => addPayment(selectedInvoice.id)}>Add Payment</button>
                    </div>
                 </div>
              )}

              <div className="bill-invoice-footer-info" style={{ marginTop: 24 }}>
                <span>Transaction managed by {auth?.user?.name || "Admin"}</span>
              </div>
            </div>

            <div className="bill-invoice-actions">
              {selectedInvoice.status !== "PAID" && selectedInvoice.status !== "CANCELLED" && (
                 <button className="btn-icon-action text" onClick={() => sendReminder(selectedInvoice.id)} style={{marginRight: 'auto', color: '#3b82f6', borderColor: '#3b82f6'}}><Send size={14}/> Send Reminder</button>
              )}
              {selectedInvoice.status !== "CANCELLED" && selectedInvoice.payments?.length === 0 && (
                 <button className="btn-icon-action text" onClick={() => cancelInvoice(selectedInvoice.id)} style={{marginRight: 'auto', color: '#ef4444', borderColor: '#ef4444'}}>Cancel Invoice</button>
              )}

              <button className="btn-icon-action text" onClick={() => setShowReceipt(true)} style={{background: '#3b82f6', color: 'white', borderColor: '#3b82f6'}}>View Receipt</button>
              <button className="btn-icon-action" title="Print" onClick={() => window.print()}><Printer size={16} /></button>
              <button
                className="btn-icon-action"
                title="Download PDF"
                onClick={() => downloadFromApi(`/owner/invoices/${selectedInvoice.id}/pdf`, {
                  fallbackFilename: `invoice-${selectedInvoice.invoiceNumber}.pdf`
                })}
              >
                <Download size={16} />
              </button>
              <button className="btn-icon-action text" onClick={closeDetail}>✕ Close</button>
            </div>
          </div>
        </div>
      )}

      {showReceipt && selectedInvoice && (
        <PosReceipt
          invoice={selectedInvoice}
          salonName={salonName}
          salonAddress={salonAddress}
          salonPhone={salonPhone}
          onClose={() => setShowReceipt(false)}
          onPrint={() => {
             downloadFromApi(`/owner/invoices/${selectedInvoice.id}/receipt`, { fallbackFilename: `receipt-${selectedInvoice.invoiceNumber}.html` });
          }}
          onDownload={() => {
             downloadFromApi(`/owner/invoices/${selectedInvoice.id}/pdf`, { fallbackFilename: `invoice-${selectedInvoice.invoiceNumber}.pdf` });
          }}
        />
      )}
    </div>
  );
}
