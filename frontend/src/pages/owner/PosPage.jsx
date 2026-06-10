import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyServiceItem = { itemType: "SERVICE", serviceId: "", staffUserId: "", qty: 1, taxPct: 0 };
const emptyProductItem = { itemType: "PRODUCT", productId: "", qty: 1, taxPct: 0 };
const emptyPayment = { mode: "CASH", amount: 0, note: "" };
const emptyRedemption = { customerPackageId: "", serviceId: "", sessionsUsed: 1, note: "" };

export default function PosPage() {
  const [tab, setTab] = useState("billing");
  const [context, setContext] = useState({ customers: [], branches: [], services: [], staffUsers: [], products: [], memberships: [], packages: [], coupons: [], giftCards: [], customerProfile: null, settings: null });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [result, setResult] = useState(null);
  const [dayClosing, setDayClosing] = useState(null);
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLinkForm, setPaymentLinkForm] = useState({ gatewayName: "RAZORPAY_PLACEHOLDER", expiresAt: "", note: "" });
  const [form, setForm] = useState({
    customerId: "",
    branchId: "",
    appliedMembershipId: "",
    discount: 0,
    tax: 0,
    couponCode: "",
    giftVoucherCode: "",
    loyaltyPointsUsed: 0,
    notes: "",
    items: [emptyServiceItem],
    packageRedemptions: [],
    payments: [emptyPayment]
  });

  const loadContext = useCallback(async (customerId = form.customerId, branchId = form.branchId) => {
    setLoading(true);
    const params = {};
    if (customerId) params.customerId = customerId;
    if (branchId) params.branchId = branchId;
    const [contextResponse, closingResponse] = await Promise.all([
      api.get("/owner/pos/context", { params }),
      api.get("/owner/pos/day-closing", { params: branchId ? { branchId } : {} })
    ]);
    setContext(contextResponse.data);
    setDayClosing(closingResponse.data);
    setLoading(false);
  }, [form.branchId, form.customerId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const params = {};
      if (form.customerId) params.customerId = form.customerId;
      if (form.branchId) params.branchId = form.branchId;
      const [contextResponse, closingResponse] = await Promise.all([
        api.get("/owner/pos/context", { params }),
        api.get("/owner/pos/day-closing", { params: form.branchId ? { branchId: form.branchId } : {} })
      ]);
      if (!active) return;
      setContext(contextResponse.data);
      setDayClosing(closingResponse.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [form.branchId, form.customerId]);

  const serviceLookup = useMemo(() => Object.fromEntries((context.services || []).map((service) => [service.id, service])), [context.services]);
  const productLookup = useMemo(() => Object.fromEntries((context.products || []).map((product) => [product.id, product])), [context.products]);
  const selectedCoupon = useMemo(() => (context.coupons || []).find((coupon) => coupon.code === form.couponCode) || null, [context.coupons, form.couponCode]);
  const selectedGiftCard = useMemo(() => (context.giftCards || []).find((giftCard) => giftCard.code === form.giftVoucherCode) || null, [context.giftCards, form.giftVoucherCode]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      const basePrice = item.itemType === "PRODUCT" ? Number(productLookup[item.productId]?.sellingPrice || 0) : Number(serviceLookup[item.serviceId]?.price || 0);
      return sum + Number(item.qty || 0) * basePrice;
    }, 0);
    const itemTax = form.items.reduce((sum, item) => {
      const basePrice = item.itemType === "PRODUCT" ? Number(productLookup[item.productId]?.sellingPrice || 0) : Number(serviceLookup[item.serviceId]?.price || 0);
      return sum + ((Number(item.qty || 0) * basePrice) * Number(item.taxPct || 0)) / 100;
    }, 0);
    const extraTax = Number(form.tax || 0);
    const discount = Number(form.discount || 0);
    const total = subtotal + itemTax + extraTax - discount;
    const paid = form.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return { subtotal, itemTax, total, paid, due: Math.max(0, total - paid) };
  }, [form, productLookup, serviceLookup]);

  const updateItem = (index, patch) => {
    const nextItems = [...form.items];
    nextItems[index] = { ...nextItems[index], ...patch };
    setForm((current) => ({ ...current, items: nextItems }));
  };

  const updateRedemption = (index, patch) => {
    const next = [...form.packageRedemptions];
    next[index] = { ...next[index], ...patch };
    setForm((current) => ({ ...current, packageRedemptions: next }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const response = await api.post("/owner/pos/invoices", {
        ...form,
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
        loyaltyPointsUsed: Number(form.loyaltyPointsUsed || 0),
        items: form.items.map((item) => ({
          ...item,
          qty: Number(item.qty || 1),
          taxPct: Number(item.taxPct || 0)
        })),
        packageRedemptions: form.packageRedemptions.map((item) => ({
          ...item,
          sessionsUsed: Number(item.sessionsUsed || 1)
        })),
        payments: form.payments.filter((payment) => Number(payment.amount) > 0).map((payment) => ({
          ...payment,
          amount: Number(payment.amount)
        }))
      });
      setResult(response.data);
      setStatus({ error: "", success: `Invoice ${response.data.invoiceNumber} created.` });
      setForm({
        customerId: form.customerId,
        branchId: form.branchId,
        appliedMembershipId: "",
        discount: 0,
        tax: 0,
        couponCode: "",
        giftVoucherCode: "",
        loyaltyPointsUsed: 0,
        notes: "",
        items: [emptyServiceItem],
        packageRedemptions: [],
        payments: [emptyPayment]
      });
      await loadContext(form.customerId, form.branchId);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not create invoice"), success: "" });
    }
  };

  const generatePaymentLink = async () => {
    if (!result?.id) {
      setStatus({ error: "Create an invoice first to generate a payment link.", success: "" });
      return;
    }
    const response = await api.post(`/owner/invoices/${result.id}/payment-link`, paymentLinkForm);
    setPaymentLink(response.data);
    setStatus({ error: "", success: "Payment link placeholder generated." });
  };

  const logPaymentLinkStatus = async (linkStatus) => {
    if (!result?.id) return;
    await api.post(`/owner/invoices/${result.id}/payment-link/log`, {
      status: linkStatus,
      note: paymentLinkForm.note || `Marked ${linkStatus.toLowerCase()} from POS`,
      gatewayRef: paymentLink?.paymentLinkToken || ""
    });
    const invoiceResponse = await api.get(`/owner/invoices/${result.id}`);
    setResult(invoiceResponse.data);
    setPaymentLink((current) => current ? { ...current, paymentLinkStatus: linkStatus === "PAID_PLACEHOLDER" ? "PAID" : linkStatus } : current);
    setStatus({ error: "", success: `Payment link marked ${linkStatus.toLowerCase()}.` });
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="POS Billing"
        description="Services, products, memberships, package redemption, split payments, and day closing in one transaction-safe flow."
        items={[
          { label: "Billing", to: "/admin/pos", hint: "Sale" },
          { label: "New Sale", to: "/admin/pos/new", hint: "Create" },
          { label: "Day Closing", to: "/admin/pos/day-closing", hint: "Summary" }
        ]}
        actions={
          <div className="inline-actions">
            {[
              { key: "billing", label: "Billing" },
              { key: "redemptions", label: "Package Use" },
              { key: "closing", label: "Day Closing" }
            ].map((item) => (
              <button key={item.key} type="button" className={tab === item.key ? "" : "secondary-button"} onClick={() => setTab(item.key)}>
                {item.label}
              </button>
            ))}
            {dayClosing && <span className="badge">Cash Drawer {Number(dayClosing.cashDrawer || 0).toFixed(2)}</span>}
          </div>
        }
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>POS Billing</h1>
            <p style={{ marginBottom: 0 }}>Create service and product sales with memberships, packages, coupons, loyalty, payments, and closing data in one desk flow.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Customers {context.customers.length}</span>
            <span className="badge">Products {context.products.length}</span>
            <span className="badge">Services {context.services.length}</span>
          </div>
        </div>
      </div>
      {loading && <PageLoader title="Loading POS workspace" message="Preparing customers, billing context, inventory, memberships, and day-closing totals." />}

      <div className="two-col">
        <div className="panel-card">
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <div className="form-grid">
              <label>
              <span className="muted">Customer</span>
              <select value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">Select customer</option>
                {context.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">Branch</span>
              <select value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
                <option value="">Select branch</option>
                {context.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">No membership apply</span>
              <select value={form.appliedMembershipId} onChange={(event) => setForm((current) => ({ ...current, appliedMembershipId: event.target.value }))}>
                <option value="">No membership apply</option>
                {context.memberships.map((membership) => <option key={membership.id} value={membership.id}>{membership.membershipPlan?.name}</option>)}
              </select>
            </label>
              <label>
              <span className="muted">POS notes</span>
              <input value={form.notes} placeholder="POS notes" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            </div>

            <div className="form-grid">
              <label>
              <span className="muted">Coupon code</span>
              <input value={form.couponCode} placeholder="Coupon code" onChange={(event) => setForm((current) => ({ ...current, couponCode: event.target.value.trim().toUpperCase() }))} />
            </label>
              <label>
              <span className="muted">Gift card code</span>
              <input value={form.giftVoucherCode} placeholder="Gift card code" onChange={(event) => setForm((current) => ({ ...current, giftVoucherCode: event.target.value.trim().toUpperCase() }))} />
            </label>
              <label>
              <span className="muted">Loyalty points to redeem</span>
              <input type="number" min="0" value={form.loyaltyPointsUsed} placeholder="Loyalty points to redeem" onChange={(event) => setForm((current) => ({ ...current, loyaltyPointsUsed: event.target.value }))} />
            </label>
              <label>
              <span className="muted">Manual discount</span>
              <input type="number" min="0" value={form.discount} placeholder="Manual discount" onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} />
            </label>
            </div>

            <div className="badge-row">
              {selectedCoupon ? <span className="badge">Coupon ready: {selectedCoupon.code}</span> : null}
              {selectedGiftCard ? <span className="badge">Gift card balance: {Number(selectedGiftCard.balanceAmount || 0).toFixed(2)}</span> : null}
              {form.loyaltyPointsUsed ? <span className="badge">Redeem request: {Number(form.loyaltyPointsUsed || 0)} points</span> : null}
              {context.customerProfile ? <span className="badge">Available loyalty: {Number(context.customerProfile.loyaltyPoints || 0)} points</span> : null}
            </div>

            {tab !== "closing" && form.items.map((item, index) => (
              <div key={`pos-item-${index}`} className="list-item">
                <div className="form-grid">
                  <label>
              <span className="muted">Service</span>
              <select value={item.itemType} onChange={(event) => updateItem(index, event.target.value === "PRODUCT" ? emptyProductItem : emptyServiceItem)}>
                    <option value="SERVICE">Service</option>
                    <option value="PRODUCT">Product</option>
                  </select>
            </label>
                  {item.itemType === "PRODUCT" ? (
                    <label>
              <span className="muted">Product</span>
              <select value={item.productId || ""} onChange={(event) => updateItem(index, { productId: event.target.value })}>
                      <option value="">Select product</option>
                      {context.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
            </label>
                  ) : (
                    <label>
              <span className="muted">Service</span>
              <select value={item.serviceId || ""} onChange={(event) => updateItem(index, { serviceId: event.target.value })}>
                      <option value="">Select service</option>
                      {context.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
            </label>
                  )}
                  {item.itemType === "SERVICE" ? (
                    <label>
              <span className="muted">Assign staff</span>
              <select value={item.staffUserId || ""} onChange={(event) => updateItem(index, { staffUserId: event.target.value })}>
                      <option value="">Assign staff</option>
                      {context.staffUsers.map((user) => <option key={user.id} value={user.id}>{user.user?.name}</option>)}
                    </select>
            </label>
                  ) : <span className="item-meta">Stock deduct on sale</span>}
                  <input type="number" min="1" value={item.qty} onChange={(event) => updateItem(index, { qty: event.target.value })} />
                </div>
              </div>
            ))}

            <div className="inline-actions">
              {tab !== "closing" && <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyServiceItem] }))}>Add Service</button>}
              {tab !== "closing" && <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyProductItem] }))}>Add Product</button>}
            </div>

            {tab === "redemptions" && (
              <div className="list-stack">
                {(form.packageRedemptions || []).map((item, index) => (
                  <div key={`redemption-${index}`} className="list-item">
                    <div className="form-grid">
                      <label>
              <span className="muted">Package</span>
              <select value={item.customerPackageId} onChange={(event) => updateRedemption(index, { customerPackageId: event.target.value })}>
                        <option value="">Select package</option>
                        {context.packages.map((pack) => <option key={pack.id} value={pack.id}>{pack.package?.name}</option>)}
                      </select>
            </label>
                      <label>
              <span className="muted">Service</span>
              <select value={item.serviceId} onChange={(event) => updateRedemption(index, { serviceId: event.target.value })}>
                        <option value="">Select service</option>
                        {context.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                      </select>
            </label>
                      <input type="number" min="1" value={item.sessionsUsed} onChange={(event) => updateRedemption(index, { sessionsUsed: event.target.value })} />
                      <label>
              <span className="muted">Redemption note</span>
              <input value={item.note} placeholder="Redemption note" onChange={(event) => updateRedemption(index, { note: event.target.value })} />
            </label>
                    </div>
                  </div>
                ))}
                <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, packageRedemptions: [...current.packageRedemptions, emptyRedemption] }))}>
                  Add Package Redemption
                </button>
              </div>
            )}

            <div className="list-stack">
              {form.payments.map((payment, index) => (
                <div key={`payment-${index}`} className="list-item">
                  <div className="form-grid">
                    <label>
              <span className="muted">Cash</span>
              <select value={payment.mode} onChange={(event) => {
                      const next = [...form.payments];
                      next[index] = { ...next[index], mode: event.target.value };
                      setForm((current) => ({ ...current, payments: next }));
                    }}>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="WALLET">Wallet</option>
                      <option value="ONLINE">Online Placeholder</option>
                    </select>
            </label>
                    <input type="number" min="0" value={payment.amount} onChange={(event) => {
                      const next = [...form.payments];
                      next[index] = { ...next[index], amount: event.target.value };
                      setForm((current) => ({ ...current, payments: next }));
                    }} />
                    <label>
              <span className="muted">Payment note</span>
              <input value={payment.note} placeholder="Payment note" onChange={(event) => {
                      const next = [...form.payments];
                      next[index] = { ...next[index], note: event.target.value };
                      setForm((current) => ({ ...current, payments: next }));
                    }} />
            </label>
                  </div>
                </div>
              ))}
            </div>

            {tab !== "closing" && <button type="button" className="secondary-button" onClick={() => setForm((current) => ({ ...current, payments: [...current.payments, emptyPayment] }))}>Add Payment Row</button>}

            <div className="summary-box">
              <strong>POS Preview</strong>
              <div className="item-meta">Subtotal {totals.subtotal.toFixed(2)}</div>
              <div className="item-meta">Item tax {totals.itemTax.toFixed(2)}</div>
              <div className="item-meta">Manual discount {Number(form.discount || 0).toFixed(2)}</div>
              <div className="item-meta">Grand total {totals.total.toFixed(2)}</div>
              <div className="item-meta">Paid now {totals.paid.toFixed(2)}</div>
              <div className="item-meta">Due {totals.due.toFixed(2)}</div>
              <div className="badge-row">
                {selectedCoupon ? <span className="badge">Coupon will be validated on save</span> : null}
                {selectedGiftCard ? <span className="badge">Gift card auto-applies against due amount</span> : null}
                {Number(form.loyaltyPointsUsed || 0) > 0 ? <span className="badge">Loyalty rules still apply minimum redeem limits</span> : null}
              </div>
            </div>
            {tab !== "closing" && <button>Create Invoice</button>}
            {status.error && <p className="error-text">{status.error}</p>}
            {status.success && <p className="success-text">{status.success}</p>}
          </form>
        </div>

        <div className="panel-card">
          <h3>Context & Result</h3>
          <div className="list-stack">
            <div className="list-item">
              <strong>Active Memberships</strong>
              <div className="badge-row">
                {context.memberships.map((membership) => <span key={membership.id} className="badge">{membership.membershipPlan?.name}</span>)}
                {!context.memberships.length && <span className="item-meta">No memberships available</span>}
              </div>
            </div>
            <div className="list-item">
              <strong>Loyalty Balance</strong>
              <div className="item-meta">
                {context.customerProfile ? `${Number(context.customerProfile.loyaltyPoints || 0)} points available` : "Select a customer to view loyalty balance"}
              </div>
            </div>
            <div className="list-item">
              <strong>Active Packages</strong>
              <div className="badge-row">
                {context.packages.map((item) => <span key={item.id} className="badge">{item.package?.name}</span>)}
                {!context.packages.length && <span className="item-meta">No active packages</span>}
              </div>
            </div>
            <div className="list-item">
              <strong>Active Coupons</strong>
              <div className="badge-row">
                {context.coupons.map((coupon) => <span key={coupon.id} className="badge">{coupon.code}</span>)}
                {!context.coupons.length && <span className="item-meta">No active coupons</span>}
              </div>
            </div>
            <div className="list-item">
              <strong>Gift Cards</strong>
              <div className="badge-row">
                {context.giftCards.map((giftCard) => <span key={giftCard.id} className="badge">{giftCard.code} | {Number(giftCard.balanceAmount || 0).toFixed(2)}</span>)}
                {!context.giftCards.length && <span className="item-meta">No active gift cards</span>}
              </div>
            </div>
            {result && (
              <div className="list-item">
                <div className="item-head">
                  <strong>{result.invoiceNumber}</strong>
                  <span className="badge">{result.status}</span>
                </div>
              <div className="item-meta">Total {Number(result.total || 0).toFixed(2)} | Paid {Number(result.paidAmount || 0).toFixed(2)} | Discount {Number(result.discount || 0).toFixed(2)}</div>
              <div className="badge-row">
                {result.couponCode && <span className="badge">Coupon {result.couponCode}</span>}
                {result.giftVoucherCode && <span className="badge">Voucher {result.giftVoucherCode}</span>}
                {result.loyaltyPointsUsed ? <span className="badge">Loyalty {result.loyaltyPointsUsed}</span> : null}
              </div>
              <div className="inline-actions" style={{ marginTop: 10 }}>
                <button type="button" className="secondary-button" onClick={generatePaymentLink}>Generate Payment Link</button>
              </div>
            </div>
            )}
            {paymentLink && (
              <div className="list-item">
                <strong>Payment Link Placeholder</strong>
                <div className="item-meta">{paymentLink.paymentLinkUrl}</div>
                <div className="item-meta">Status {paymentLink.paymentLinkStatus}</div>
                <div className="inline-actions" style={{ marginTop: 10 }}>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Invoice payment link: ${paymentLink.paymentLinkUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="cta-secondary"
                  >
                    Share on WhatsApp
                  </a>
                  <button type="button" className="secondary-button" onClick={() => logPaymentLinkStatus("SENT")}>Mark Sent</button>
                  <button type="button" className="secondary-button" onClick={() => logPaymentLinkStatus("FAILED")}>Log Failed</button>
                  <button type="button" onClick={() => logPaymentLinkStatus("PAID_PLACEHOLDER")}>Mark Paid</button>
                </div>
              </div>
            )}
            {result && (
              <div className="list-item">
                <strong>Gateway Placeholder Settings</strong>
                <div className="form-grid" style={{ marginTop: 10 }}>
                  <label>
              <span className="muted">Razorpay Placeholder</span>
              <select value={paymentLinkForm.gatewayName} onChange={(event) => setPaymentLinkForm((current) => ({ ...current, gatewayName: event.target.value }))}>
                    <option value="RAZORPAY_PLACEHOLDER">Razorpay Placeholder</option>
                    <option value="CASHFREE_PLACEHOLDER">Cashfree Placeholder</option>
                    <option value="PHONEPE_PLACEHOLDER">PhonePe Placeholder</option>
                    <option value="MANUAL_UPI_PLACEHOLDER">Manual UPI Placeholder</option>
                  </select>
            </label>
                  <label><span className="muted">Link Expiry Time</span><input type="datetime-local" value={paymentLinkForm.expiresAt} onChange={(event) => setPaymentLinkForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label>
                  <label>
              <span className="muted">Link note / WhatsApp share note</span>
              <input value={paymentLinkForm.note} placeholder="Link note / WhatsApp share note" onChange={(event) => setPaymentLinkForm((current) => ({ ...current, note: event.target.value }))} />
            </label>
                </div>
              </div>
            )}
            {!loading && !result && !context.customers.length && (
              <EmptyState
                title="POS context is still empty"
                message="Create customers, services, products, or memberships first and this billing workspace will become much richer."
              />
            )}
          </div>
          {dayClosing && (
            <div className="summary-box" style={{ marginTop: 16 }}>
              <strong>Day Closing</strong>
              <div className="item-meta">Invoices {dayClosing.invoiceCount}</div>
              <div className="item-meta">Gross Sales {Number(dayClosing.grossSales || 0).toFixed(2)}</div>
              <div className="item-meta">Paid {Number(dayClosing.paidAmount || 0).toFixed(2)}</div>
              <div className="item-meta">Refunds {Number(dayClosing.refunds || 0).toFixed(2)}</div>
              <div className="badge-row">
                {Object.entries(dayClosing.paymentSummary || {}).map(([key, value]) => (
                  <span key={key} className="badge">{key}: {Number(value || 0).toFixed(2)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

