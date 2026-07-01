import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { useBranch } from "../../context/BranchContext";

const defaultCouponForm = {
  code: "",
  title: "",
  description: "",
  discountType: "FIXED",
  discountValue: 50,
  minBillAmount: 59,
  usageLimit: "",
  startsAt: new Date().toISOString().split('T')[0],
  validityDays: 90,
  isActive: true,
  isPrivate: false
};

const emptyGiftCard = {
  code: "",
  title: "",
  originalAmount: 1000,
  note: ""
};

export default function CouponsPage() {
  const location = useLocation();
  const { selectedBranchId } = useBranch();
  const [coupons, setCoupons] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [reports, setReports] = useState(null);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const [giftCardForm, setGiftCardForm] = useState(emptyGiftCard);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [gcSearch, setGcSearch] = useState("");
  const [editingGc, setEditingGc] = useState(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [editingCoupon, setEditingCoupon] = useState(null);

  const handleEditCoupon = (c) => {
    setEditingCoupon(c);
    let valDays = 90;
    if (c.startsAt && c.endsAt) {
      const diffTime = Math.abs(new Date(c.endsAt) - new Date(c.startsAt));
      valDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    setCouponForm({
      code: c.code || "",
      title: c.title || "",
      description: c.description || "",
      discountType: c.discountType || "PERCENT",
      discountValue: c.discountValue ? Number(c.discountValue) : 0,
      minBillAmount: c.minBillAmount ? Number(c.minBillAmount) : 0,
      usageLimit: c.usageLimit || "",
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validityDays: valDays,
      isActive: !c.isArchived,
      isPrivate: c.notes === "PRIVATE"
    });
  };

  const mode = location.pathname.includes("/gift-cards")
    ? "giftCards"
    : location.pathname.includes("/reports")
      ? "reports"
      : "coupons";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [couponResponse, giftCardResponse, reportResponse] = await Promise.all([
        api.get("/owner/coupons", { params: { branchId: selectedBranchId } }),
        api.get("/owner/gift-cards", { params: { branchId: selectedBranchId } }),
        api.get("/owner/coupons/reports", { params: { branchId: selectedBranchId } })
      ]);
      setCoupons(couponResponse.data || []);
      setGiftCards(giftCardResponse.data || []);
      setReports(reportResponse.data || null);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load coupons module"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const saveCoupon = async (event) => {
    event.preventDefault();
    try {
      const start = couponForm.startsAt ? new Date(couponForm.startsAt) : new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + Number(couponForm.validityDays || 0));

      const payload = {
        code: couponForm.code,
        title: couponForm.title,
        description: couponForm.description || null,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minBillAmount: Number(couponForm.minBillAmount || 0),
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        isArchived: !couponForm.isActive,
        notes: couponForm.isPrivate ? "PRIVATE" : "",
        branchId: selectedBranchId || null
      };

      if (editingCoupon) {
        await api.patch(`/owner/coupons/${editingCoupon.id}`, payload);
        setStatus({ error: "", success: "Coupon updated." });
      } else {
        await api.post("/owner/coupons", payload);
        setStatus({ error: "", success: "Coupon created." });
      }
      setCouponForm(defaultCouponForm);
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
          note: giftCardForm.note,
          branchId: selectedBranchId || null
        });
        setStatus({ error: "", success: "Gift card updated." });
      } else {
        await api.post("/owner/gift-cards", {
          code: giftCardForm.code,
          title: giftCardForm.title,
          originalAmount: Number(giftCardForm.originalAmount),
          note: giftCardForm.note,
          branchId: selectedBranchId || null
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
        <div style={{ display: "flex", gap: 24, marginTop: 20, minHeight: 600 }}>
          {/* Left Column - List of Coupons */}
          <div style={{ width: "30%", minWidth: 280, display: "flex", flexDirection: "column", background: "white", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: 16 }}>
              <input 
                placeholder="Search" 
                value={couponSearch} 
                onChange={(e) => setCouponSearch(e.target.value)} 
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, paddingRight: 4 }}>
              {filteredCoupons.map((row) => {
                const isSelected = editingCoupon && editingCoupon.id === row.id;
                return (
                  <div 
                    key={row.id} 
                    onClick={() => handleEditCoupon(row)}
                    style={{ 
                      padding: "16px", 
                      borderRadius: 8, 
                      cursor: "pointer", 
                      background: isSelected ? "#e0f2fe" : "transparent",
                      border: isSelected ? "1px solid #0284c7" : "1px solid #f1f5f9",
                      transition: "all 0.2s" 
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                      {row.discountType === "PERCENT" ? `FLAT ${Number(row.discountValue)}% OFF` : `FLAT ${Number(row.discountValue)} Rs OFF`}
                    </div>
                    <div style={{ color: isSelected ? "#0284c7" : "#475569", fontSize: "0.85rem", marginTop: 4, fontWeight: 500 }}>
                      {row.code}
                    </div>
                  </div>
                );
              })}
              {!filteredCoupons.length && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 10px", fontSize: "0.9rem" }}>No coupons found</div>
              )}
            </div>

            <button 
              onClick={() => { setEditingCoupon(null); setCouponForm(defaultCouponForm); }}
              style={{ 
                marginTop: 16, 
                width: "100%", 
                padding: "12px", 
                background: "var(--button-bg-solid, #3b82f6)", 
                color: "white", 
                border: "none", 
                borderRadius: 8, 
                fontWeight: 700, 
                cursor: "pointer",
                fontSize: "0.95rem"
              }}
            >
              Create New Coupon
            </button>
          </div>

          {/* Right Column - Coupon Form */}
          <div style={{ flex: 1, background: "white", borderRadius: 16, padding: 30, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: "1.4rem", fontWeight: 700, color: "#0f172a" }}>
              {editingCoupon ? "Update Coupon" : "Create Coupon"}
            </h2>
            
            <form onSubmit={saveCoupon} style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
              {/* Row 1: Name, Code, Description, Active */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr auto", gap: 16, alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Name</span>
                  <input 
                    placeholder="e.g. GMAP Review" 
                    required 
                    value={couponForm.title} 
                    onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Code</span>
                  <input 
                    placeholder="e.g. GMAP" 
                    required 
                    value={couponForm.code} 
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Description</span>
                  <input 
                    placeholder="e.g. Once Per Customer Where..." 
                    value={couponForm.description} 
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22, cursor: "pointer", userSelect: "none" }}>
                  <input 
                    type="checkbox" 
                    checked={couponForm.isActive} 
                    onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#475569" }}>Active</span>
                </label>
              </div>

              {/* Row 2: Benefit Type, Benefit Value, Activated Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Benefit Type</span>
                  <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="discountType" 
                        value="FIXED" 
                        checked={couponForm.discountType === "FIXED"} 
                        onChange={() => setCouponForm({ ...couponForm, discountType: "FIXED" })}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#334155" }}>Fixed</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="discountType" 
                        value="PERCENT" 
                        checked={couponForm.discountType === "PERCENT"} 
                        onChange={() => setCouponForm({ ...couponForm, discountType: "PERCENT" })}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "#334155" }}>Percentage</span>
                    </label>
                  </div>
                </div>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Benefit Value in ₹</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="50" 
                    required 
                    value={couponForm.discountValue} 
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Coupon Activated Date</span>
                  <input 
                    type="date" 
                    required 
                    value={couponForm.startsAt} 
                    onChange={(e) => setCouponForm({ ...couponForm, startsAt: e.target.value })}
                    min={new Date().toISOString().slice(0, 10)}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
              </div>

              {/* Row 3: Minimum Amount, Max Used Count, Validity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Minimum Amount for Redemption</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="59" 
                    value={couponForm.minBillAmount} 
                    onChange={(e) => setCouponForm({ ...couponForm, minBillAmount: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Max Used Count</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="Enter Count" 
                    value={couponForm.usageLimit} 
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Validity (In days)</span>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="90" 
                    required 
                    value={couponForm.validityDays} 
                    onChange={(e) => setCouponForm({ ...couponForm, validityDays: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", width: "100%", boxSizing: "border-box" }}
                  />
                </label>
              </div>

              {/* Toggle Row: Private */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", marginTop: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>Private</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>This coupon will not be visible on the public online catalog.</div>
                </div>
                <div 
                  onClick={() => setCouponForm({ ...couponForm, isPrivate: !couponForm.isPrivate })}
                  style={{ 
                    width: 44, 
                    height: 22, 
                    background: couponForm.isPrivate ? "#3b82f6" : "#cbd5e1", 
                    borderRadius: 11, 
                    padding: 2, 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: couponForm.isPrivate ? "flex-end" : "flex-start",
                    transition: "all 0.2s",
                    boxSizing: "border-box"
                  }}
                >
                  <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: "auto", paddingTop: 20 }}>
                {editingCoupon && (
                  <button 
                    type="button" 
                    onClick={() => deleteCoupon(editingCoupon.id)}
                    style={{ 
                      marginRight: "auto", 
                      padding: "10px 16px", 
                      background: "#fef2f2", 
                      color: "#dc2626", 
                      border: "1px solid #fee2e2", 
                      borderRadius: 6, 
                      fontWeight: 600, 
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    Delete
                  </button>
                )}
                
                <button 
                  type="button" 
                  onClick={() => { setEditingCoupon(null); setCouponForm(defaultCouponForm); }}
                  style={{ 
                    padding: "10px 18px", 
                    background: "#f1f5f9", 
                    color: "#475569", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: 6, 
                    fontWeight: 600, 
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  Cancel
                </button>
                
                <button 
                  type="submit" 
                  style={{ 
                    padding: "10px 22px", 
                    background: "var(--button-bg-solid, #3b82f6)", 
                    color: "white", 
                    border: "none", 
                    borderRadius: 6, 
                    fontWeight: 600, 
                    cursor: "pointer", 
                    fontSize: "0.9rem"
                  }}
                >
                  Save
                </button>
              </div>
            </form>
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
