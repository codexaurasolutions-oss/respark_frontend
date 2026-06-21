import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyCoupon = {
  code: "",
  title: "",
  discountType: "PERCENT",
  discountValue: 10,
  minBillAmount: 0
};

const emptyGiftCard = {
  code: "",
  title: "",
  originalAmount: 1000,
  note: ""
};

export default function CouponsPage() {
  const location = useLocation();
  const [coupons, setCoupons] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [reports, setReports] = useState(null);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [giftCardForm, setGiftCardForm] = useState(emptyGiftCard);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [gcSearch, setGcSearch] = useState("");
  const [editingGc, setEditingGc] = useState(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [editingCoupon, setEditingCoupon] = useState(null);

  const mode = location.pathname.includes("/gift-cards")
    ? "giftCards"
    : location.pathname.includes("/reports")
      ? "reports"
      : "coupons";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [couponResponse, giftCardResponse, reportResponse] = await Promise.all([
        api.get("/owner/coupons"),
        api.get("/owner/gift-cards"),
        api.get("/owner/coupons/reports")
      ]);
      setCoupons(couponResponse.data || []);
      setGiftCards(giftCardResponse.data || []);
      setReports(reportResponse.data || null);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load coupons module"), success: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const saveCoupon = async (event) => {
    event.preventDefault();
    try {
      if (editingCoupon) {
        await api.patch(`/owner/coupons/${editingCoupon.id}`, {
          ...couponForm,
          discountValue: Number(couponForm.discountValue),
          minBillAmount: Number(couponForm.minBillAmount)
        });
        setStatus({ error: "", success: "Coupon updated." });
      } else {
        await api.post("/owner/coupons", {
          ...couponForm,
          discountValue: Number(couponForm.discountValue),
          minBillAmount: Number(couponForm.minBillAmount)
        });
        setStatus({ error: "", success: "Coupon created." });
      }
      setCouponForm(emptyCoupon);
      setEditingCoupon(null);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save coupon"), success: "" });
    }
  };

  const deleteCoupon = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api.delete(`/owner/coupons/${id}`);
      setStatus({ error: "", success: "Coupon deleted." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not delete coupon"), success: "" });
    }
  };

  const saveGiftCard = async (event) => {
    event.preventDefault();
    try {
      if (editingGc) {
        await api.patch(`/owner/gift-cards/${editingGc.id}`, {
          code: giftCardForm.code,
          title: giftCardForm.title,
          originalAmount: Number(giftCardForm.originalAmount),
          note: giftCardForm.note
        });
        setStatus({ error: "", success: "Gift card updated." });
      } else {
        await api.post("/owner/gift-cards", {
          code: giftCardForm.code,
          title: giftCardForm.title,
          originalAmount: Number(giftCardForm.originalAmount),
          note: giftCardForm.note
        });
        setStatus({ error: "", success: "Gift card created." });
      }
      setGiftCardForm(emptyGiftCard);
      setEditingGc(null);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save gift card"), success: "" });
    }
  };

  const deleteGiftCard = async (id) => {
    if (!confirm("Delete this gift card?")) return;
    try {
      await api.delete(`/owner/gift-cards/${id}`);
      setStatus({ error: "", success: "Gift card deleted." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not delete gift card"), success: "" });
    }
  };

  const toggleGiftCardActive = async (gc) => {
    try {
      await api.patch(`/owner/gift-cards/${gc.id}`, { isActive: !gc.isActive });
      setStatus({ error: "", success: `Gift card ${gc.isActive ? "deactivated" : "activated"}.` });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not update gift card"), success: "" });
    }
  };

  const filteredGiftCards = giftCards.filter(gc =>
    gc.code?.toLowerCase().includes(gcSearch.toLowerCase()) ||
    gc.title?.toLowerCase().includes(gcSearch.toLowerCase())
  );

  const filteredCoupons = coupons.filter(c =>
    c.code?.toLowerCase().includes(couponSearch.toLowerCase()) ||
    c.title?.toLowerCase().includes(couponSearch.toLowerCase())
  );

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Coupons & Gift Cards"
        description="Promotions, vouchers, gift card balances and redemption reporting."
        items={[
          { label: "Coupons", to: "/admin/coupons" },
          { label: "Gift Cards", to: "/admin/gift-cards" },
          { label: "Reports", to: "/admin/coupons/reports" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Coupons & Gift Cards</h1>
            <p style={{ marginBottom: 0 }}>Manage promotions, vouchers, balances, and redemption performance without leaving the revenue workspace.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Coupons {coupons.length}</span>
            <span className="badge">Gift Cards {giftCards.length}</span>
            <span className="badge">{mode === "reports" ? "Reports" : "Active Setup"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading promotions workspace" message="Bringing together coupon rules, gift card balances, and redemption insights." />}

      {!loading && mode === "coupons" && (
        <div className="panel-card">
          <h3>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</h3>
          <form className="form-grid" onSubmit={saveCoupon}>
            <label>
              <span className="muted">Code</span>
              <input placeholder="e.g. SUMMER20" required value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} />
            </label>
            <label>
              <span className="muted">Title</span>
              <input placeholder="e.g. Summer Sale Discount" required value={couponForm.title} onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })} />
            </label>
            <label>
              <span className="muted">Discount Type</span>
              <select value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}>
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </label>
            <label>
              <span className="muted">Discount Value</span>
              <input type="number" min="0" placeholder="e.g. 10" required value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })} />
            </label>
            <label>
              <span className="muted">Minimum Bill Amount</span>
              <input type="number" min="0" placeholder="e.g. 500" value={couponForm.minBillAmount} onChange={(e) => setCouponForm({ ...couponForm, minBillAmount: e.target.value })} />
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button type="submit">{editingCoupon ? "Update Coupon" : "Create Coupon"}</button>
              {editingCoupon && <button type="button" onClick={() => { setEditingCoupon(null); setCouponForm(emptyCoupon); }} style={{ background: "#f1f5f9", color: "#475569" }}>Cancel</button>}
            </div>
          </form>

          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <input placeholder="Search coupons..." value={couponSearch} onChange={(e) => setCouponSearch(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div className="list-stack">
            {filteredCoupons.map((row) => (
              <div key={row.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{row.code} - {row.title}</strong>
                  <div className="item-meta">{row.discountType} | {row.discountType === "PERCENT" ? `${row.discountValue}%` : `$${row.discountValue}`} off | Min bill: ${row.minBillAmount || 0} | Used {row.usageCount}x</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditingCoupon(row); setCouponForm({ code: row.code, title: row.title, discountType: row.discountType, discountValue: row.discountValue, minBillAmount: row.minBillAmount }); }} style={{ padding: "4px 10px", fontSize: 12, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", color: "#1d4ed8", fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteCoupon(row.id)} style={{ padding: "4px 10px", fontSize: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", color: "#dc2626", fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            ))}
            {!filteredCoupons.length && <EmptyState title="No coupons found" message={couponSearch ? "No coupons match your search." : "Create a coupon to support discounts, campaigns, and front-desk offers."} />}
          </div>
        </div>
      )}

      {!loading && mode === "giftCards" && (
        <div className="panel-card">
          <h3>{editingGc ? "Edit Gift Card" : "Create Gift Card"}</h3>
          <form className="form-grid" onSubmit={saveGiftCard}>
            <label>
              <span className="muted">Code</span>
              <input placeholder="e.g. GC-2024-001" required value={giftCardForm.code} onChange={(e) => setGiftCardForm({ ...giftCardForm, code: e.target.value.toUpperCase() })} />
            </label>
            <label>
              <span className="muted">Title</span>
              <input placeholder="e.g. Birthday Voucher" required value={giftCardForm.title} onChange={(e) => setGiftCardForm({ ...giftCardForm, title: e.target.value })} />
            </label>
            <label>
              <span className="muted">Amount ($)</span>
              <input type="number" min="1" placeholder="e.g. 1000" required value={giftCardForm.originalAmount} onChange={(e) => setGiftCardForm({ ...giftCardForm, originalAmount: e.target.value })} />
            </label>
            <label>
              <span className="muted">Note (Optional)</span>
              <input placeholder="Internal note" value={giftCardForm.note} onChange={(e) => setGiftCardForm({ ...giftCardForm, note: e.target.value })} />
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button type="submit">{editingGc ? "Update Gift Card" : "Create Gift Card"}</button>
              {editingGc && <button type="button" onClick={() => { setEditingGc(null); setGiftCardForm(emptyGiftCard); }} style={{ background: "#f1f5f9", color: "#475569" }}>Cancel</button>}
            </div>
          </form>

          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <input placeholder="Search gift cards by code or title..." value={gcSearch} onChange={(e) => setGcSearch(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
            {filteredGiftCards.map((gc) => {
              const balance = Number(gc.balanceAmount || 0);
              const original = Number(gc.originalAmount || 0);
              const usedPct = original > 0 ? Math.round(((original - balance) / original) * 100) : 0;
              const isExpired = gc.expiresAt && new Date(gc.expiresAt) < new Date();
              const daysLeft = gc.expiresAt ? Math.max(0, Math.ceil((new Date(gc.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : null;
              return (
                <div key={gc.id} style={{ background: gc.isActive ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#f1f5f9", borderRadius: 12, padding: 16, color: gc.isActive ? "#fff" : "#64748b", position: "relative", overflow: "hidden" }}>
                  {gc.isActive && <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>Gift Card</div>
                      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>{gc.code}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: gc.isActive ? "rgba(255,255,255,0.2)" : "#e2e8f0" }}>
                        {isExpired ? "Expired" : gc.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>{gc.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "8px 0", borderTop: `1px solid ${gc.isActive ? "rgba(255,255,255,0.2)" : "#e2e8f0"}` }}>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>Balance</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>${balance.toFixed(0)} <span style={{ fontSize: 12, opacity: 0.6 }}>/ ${original.toFixed(0)}</span></div>
                    </div>
                    {daysLeft !== null && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Expires</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{isExpired ? "Expired" : `${daysLeft} days`}</div>
                      </div>
                    )}
                  </div>
                  {usedPct > 0 && (
                    <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${usedPct}%`, borderRadius: 2, background: "#fff" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={() => { setEditingGc(gc); setGiftCardForm({ code: gc.code, title: gc.title, originalAmount: gc.originalAmount, note: gc.note || "" }); }} style={{ flex: 1, padding: "5px 0", fontSize: 12, background: gc.isActive ? "rgba(255,255,255,0.2)" : "#fff", border: `1px solid ${gc.isActive ? "rgba(255,255,255,0.3)" : "#e2e8f0"}`, borderRadius: 6, cursor: "pointer", color: gc.isActive ? "#fff" : "#1d4ed8", fontWeight: 600 }}>Edit</button>
                    <button onClick={() => toggleGiftCardActive(gc)} style={{ flex: 1, padding: "5px 0", fontSize: 12, background: gc.isActive ? "rgba(255,255,255,0.2)" : "#dcfce7", border: `1px solid ${gc.isActive ? "rgba(255,255,255,0.3)" : "#86efac"}`, borderRadius: 6, cursor: "pointer", color: gc.isActive ? "#fff" : "#166534", fontWeight: 600 }}>{gc.isActive ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => deleteGiftCard(gc.id)} style={{ padding: "5px 10px", fontSize: 12, background: gc.isActive ? "rgba(255,255,255,0.15)" : "#fef2f2", border: `1px solid ${gc.isActive ? "rgba(255,255,255,0.2)" : "#fecaca"}`, borderRadius: 6, cursor: "pointer", color: gc.isActive ? "#fca5a5" : "#dc2626", fontWeight: 600 }}>&#x2715;</button>
                  </div>
                </div>
              );
            })}
          </div>
          {!filteredGiftCards.length && <EmptyState title="No gift cards found" message={gcSearch ? "No gift cards match your search." : "Create a gift card to issue vouchers for salon credit."} />}
        </div>
      )}

      {!loading && mode === "reports" && reports && (
        <div className="panel-card">
          <h3>Promotion Reports</h3>
          <div className="badge-row" style={{ marginBottom: 16 }}>
            <span className="badge">Coupon Savings ${reports.totalSavings || 0}</span>
          </div>
          <div className="list-stack">
            {(reports.redemptions || []).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.coupon?.code || "-"}</strong>
                <div className="item-meta">Saved ${row.amountSaved}</div>
              </div>
            ))}
            {!reports.redemptions?.length && <EmptyState title="No promotion redemptions yet" message="Savings and gift card usage will appear here once customers begin using promotions." />}
          </div>
        </div>
      )}
    </div>
  );
}
