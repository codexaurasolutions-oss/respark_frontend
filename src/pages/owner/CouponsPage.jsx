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
        ...(couponForm.description ? { description: couponForm.description } : {}),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minBillAmount: Number(couponForm.minBillAmount || 0),
        ...(couponForm.usageLimit ? { usageLimit: Number(couponForm.usageLimit) } : {}),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        isArchived: !couponForm.isActive,
        notes: couponForm.isPrivate ? "PRIVATE" : "",
        ...(selectedBranchId ? { branchId: selectedBranchId } : {})
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .cpn-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.3s; }
        .cpn-input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; box-sizing: border-box; }
        .cpn-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        .cpn-label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; }
        
        .cpn-btn { padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .cpn-btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
        .cpn-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3); }
        .cpn-btn-secondary { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; }
        .cpn-btn-secondary:hover { background: #f1f5f9; border-color: #94a3b8; }
        
        .coupons-layout {
          display: flex;
          gap: 24px;
          margin-top: 20px;
          min-height: 600px;
        }
        .coupons-left-col {
          width: 32%;
          min-width: 300px;
        }
        .coupons-right-col {
          flex: 1;
        }
        .coupons-form-grid-1 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .coupons-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        
        /* Custom Radio & Checkbox */
        .cpn-radio-group { display: flex; gap: 16px; background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .cpn-radio-option { flex: 1; text-align: center; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; color: #64748b; }
        .cpn-radio-option.active { background: white; color: #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

        @media (max-width: 900px) {
          .coupons-layout { flex-direction: column !important; }
          .coupons-left-col { width: 100% !important; min-width: 0 !important; }
          .coupons-right-col { padding: 20px !important; }
          .coupons-form-grid-1, .coupons-form-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginTop: 0 }}>Coupons & Gift Cards</h1>
            <p style={{ marginBottom: 0 }}>Manage promotions, vouchers, balances, and redemption performance without leaving the revenue workspace.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#e0f2fe", color: "#0369a1", whiteSpace: "nowrap" }}>Coupons {coupons.length}</span>
            <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#f0fdf4", color: "#15803d", whiteSpace: "nowrap" }}>Gift Cards {giftCards.length}</span>
            <span style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#f5f3ff", color: "#6d28d9", whiteSpace: "nowrap" }}>{mode === "reports" ? "Reports" : "Active Setup"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading promotions workspace" message="Bringing together coupon rules, gift card balances, and redemption insights." />}

      {!loading && mode === "coupons" && (
        <div className="coupons-layout anim-fade">
          {/* Left Column - List of Coupons */}
          <div className="coupons-left-col cpn-card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
            <div style={{ marginBottom: 16 }}>
              <input 
                placeholder="Search" 
                value={couponSearch} 
                onChange={(e) => setCouponSearch(e.target.value)} 
                className="cpn-input"
                style={{ background: "#f8fafc" }}
              />
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, paddingRight: 4 }}>
              {filteredCoupons.map((row) => {
                const isSelected = editingCoupon && editingCoupon.id === row.id;
                return (
                  <div 
                    key={row.id} 
                    style={{ 
                      padding: "16px 20px", 
                      borderRadius: 12, 
                      cursor: "pointer", 
                      background: isSelected ? "#eff6ff" : "white",
                      border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      transition: "all 0.2s",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      boxShadow: isSelected ? "0 4px 12px rgba(59, 130, 246, 0.1)" : "none"
                    }}
                    onClick={() => handleEditCoupon(row)}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: isSelected ? "#1e40af" : "#0f172a", fontSize: "1rem" }}>
                        {row.discountType === "PERCENT" ? `FLAT ${Number(row.discountValue)}% OFF` : `FLAT ${Number(row.discountValue)} Rs OFF`}
                      </div>
                      <div style={{ color: isSelected ? "#3b82f6" : "#64748b", fontSize: "0.85rem", marginTop: 6, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {row.code}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCoupon(row.id); }}
                      title="Delete coupon"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#fee2e2",
                        border: "none",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#fee2e2"}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {!filteredCoupons.length && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 10px", fontSize: "0.9rem" }}>No coupons found</div>
              )}
            </div>
            <button 
              onClick={() => { setEditingCoupon(null); setCouponForm(defaultCouponForm); setStatus({ error: "", success: "" }); }}
              className="cpn-btn cpn-btn-primary"
              style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
            >
              + Create New Coupon
            </button>
          </div>

          {/* Right Column - Coupon Form */}
          <div className="coupons-right-col cpn-card" style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginTop: 0, marginBottom: 28, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{editingCoupon ? "Update Coupon" : "Create Coupon"}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: couponForm.isActive ? "#dcfce7" : "#f1f5f9", padding: "8px 16px", borderRadius: 30, transition: "all 0.3s" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: couponForm.isActive ? "#166534" : "#64748b", textTransform: "uppercase" }}>{couponForm.isActive ? "Active" : "Inactive"}</span>
                <input 
                  type="checkbox" 
                  checked={couponForm.isActive} 
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#16a34a" }}
                />
              </label>
            </h2>
            
            <form onSubmit={saveCoupon} style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
              
              <div className="coupons-form-grid-1">
                <label>
                  <span className="cpn-label">Name</span>
                  <input 
                    placeholder="e.g. Summer Special" 
                    required 
                    value={couponForm.title} 
                    onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                    className="cpn-input"
                  />
                </label>
                
                <label>
                  <span className="cpn-label">Code</span>
                  <input 
                    placeholder="e.g. SUMMER20" 
                    required 
                    value={couponForm.code} 
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    className="cpn-input"
                    style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}
                  />
                </label>
              </div>

              <label>
                <span className="cpn-label">Description (Optional)</span>
                <input 
                  placeholder="e.g. Valid only for first-time customers..." 
                  value={couponForm.description} 
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="cpn-input"
                />
              </label>

              <div className="coupons-form-grid-2">
                <div>
                  <span className="cpn-label">Benefit Type</span>
                  <div className="cpn-radio-group">
                    <div 
                      className={`cpn-radio-option ${couponForm.discountType === "FIXED" ? "active" : ""}`}
                      onClick={() => setCouponForm({ ...couponForm, discountType: "FIXED" })}
                    >
                      ₹ Fixed
                    </div>
                    <div 
                      className={`cpn-radio-option ${couponForm.discountType === "PERCENT" ? "active" : ""}`}
                      onClick={() => setCouponForm({ ...couponForm, discountType: "PERCENT" })}
                    >
                      % Percent
                    </div>
                  </div>
                </div>
                
                <label>
                  <span className="cpn-label">Benefit Value {couponForm.discountType === "FIXED" ? "(₹)" : "(%)"}</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="50" 
                    required 
                    value={couponForm.discountValue} 
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="cpn-input"
                  />
                </label>
                
                <label>
                  <span className="cpn-label">Coupon Activated Date</span>
                  <input 
                    type="date" 
                    required 
                    value={couponForm.startsAt} 
                    onChange={(e) => setCouponForm({ ...couponForm, startsAt: e.target.value })}
                    min={new Date().toISOString().slice(0, 10)}
                    className="cpn-input"
                  />
                </label>
              </div>

              <div className="coupons-form-grid-2">
                <label>
                  <span className="cpn-label">Min. Bill Amount (₹)</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="0 for none" 
                    value={couponForm.minBillAmount} 
                    onChange={(e) => setCouponForm({ ...couponForm, minBillAmount: e.target.value })}
                    className="cpn-input"
                  />
                </label>
                
                <label>
                  <span className="cpn-label">Usage Limit (Total)</span>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="Leave empty for unlimited" 
                    value={couponForm.usageLimit} 
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="cpn-input"
                  />
                </label>
                
                <label>
                  <span className="cpn-label">Validity (Days)</span>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="90" 
                    required 
                    value={couponForm.validityDays} 
                    onChange={(e) => setCouponForm({ ...couponForm, validityDays: e.target.value })}
                    className="cpn-input"
                  />
                </label>
              </div>

              {/* Toggle Row: Private */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc", marginTop: 10 }}>
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
                    className="cpn-btn cpn-btn-secondary"
                    style={{ marginRight: "auto", color: "#dc2626", borderColor: "#fca5a5", background: "#fef2f2" }}
                  >
                    Delete Coupon
                  </button>
                )}
                
                <button 
                  type="button" 
                  onClick={() => { setEditingCoupon(null); setCouponForm(defaultCouponForm); setStatus({ error: "", success: "" }); }}
                  className="cpn-btn cpn-btn-secondary"
                >
                  Cancel
                </button>
                
                <button 
                  type="submit" 
                  className="cpn-btn cpn-btn-primary"
                >
                  {editingCoupon ? "Save Changes" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!loading && mode === "giftCards" && (
        <div className="anim-fade">
          <div className="cpn-card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              {editingGc ? "Edit Gift Card" : "Issue New Gift Card"}
            </h3>
            <form onSubmit={saveGiftCard}>
              <div className="coupons-form-grid-1" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                <label>
                  <span className="cpn-label">Code</span>
                  <input className="cpn-input" placeholder="e.g. GC-2024-001" required value={giftCardForm.code} onChange={(e) => setGiftCardForm({ ...giftCardForm, code: e.target.value.toUpperCase() })} style={{ textTransform: "uppercase", fontWeight: 600 }} />
                </label>
                <label>
                  <span className="cpn-label">Title</span>
                  <input className="cpn-input" placeholder="e.g. Birthday Voucher" required value={giftCardForm.title} onChange={(e) => setGiftCardForm({ ...giftCardForm, title: e.target.value })} />
                </label>
                <label>
                  <span className="cpn-label">Amount (₹)</span>
                  <input className="cpn-input" type="number" min="1" placeholder="e.g. 1000" required value={giftCardForm.originalAmount} onChange={(e) => setGiftCardForm({ ...giftCardForm, originalAmount: e.target.value })} />
                </label>
                <label>
                  <span className="cpn-label">Note (Optional)</span>
                  <input className="cpn-input" placeholder="Internal note" value={giftCardForm.note} onChange={(e) => setGiftCardForm({ ...giftCardForm, note: e.target.value })} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
                {editingGc && <button type="button" className="cpn-btn cpn-btn-secondary" onClick={() => { setEditingGc(null); setGiftCardForm(emptyGiftCard); }}>Cancel Edit</button>}
                <button type="submit" className="cpn-btn cpn-btn-primary">{editingGc ? "Update Gift Card" : "Create Gift Card"}</button>
              </div>
            </form>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>Gift Card Inventory</h2>
            <input 
              className="cpn-input" 
              placeholder="Search by code or title..." 
              value={gcSearch} 
              onChange={(e) => setGcSearch(e.target.value)} 
              style={{ width: "300px", background: "white", padding: "10px 16px" }} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 12, marginTop: 12 }}>
            {filteredGiftCards.map((gc) => {
              const balance = Number(gc.balanceAmount || 0);
              const original = Number(gc.originalAmount || 0);
              const usedPct = original > 0 ? Math.round(((original - balance) / original) * 100) : 0;
              const isExpired = gc.expiresAt && new Date(gc.expiresAt) < new Date();
              const daysLeft = gc.expiresAt ? Math.max(0, Math.ceil((new Date(gc.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : null;
              return (
                <div key={gc.id} style={{ background: gc.isActive ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" : "#f8fafc", border: gc.isActive ? "none" : "1px solid #e2e8f0", borderRadius: 16, padding: 24, color: gc.isActive ? "#fff" : "#64748b", position: "relative", overflow: "hidden", boxShadow: gc.isActive ? "0 10px 25px -5px rgba(15, 23, 42, 0.4)" : "none", transition: "transform 0.2s" }}>
                  {gc.isActive && <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, position: "relative", zIndex: 1 }}>
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
                      <div style={{ fontSize: 20, fontWeight: 700 }}>₹{balance.toFixed(0)} <span style={{ fontSize: 12, opacity: 0.6 }}>/ ₹{original.toFixed(0)}</span></div>
                    </div>
                    {daysLeft !== null && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Expires</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{isExpired ? "Expired" : `${daysLeft} days`}</div>
                      </div>
                    )}
                  </div>
                  {usedPct > 0 && (
                    <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: gc.isActive ? "rgba(255,255,255,0.1)" : "#e2e8f0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${usedPct}%`, borderRadius: 3, background: gc.isActive ? "#38bdf8" : "#94a3b8" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 16, position: "relative", zIndex: 1 }}>
                    <button onClick={() => { setEditingGc(gc); setGiftCardForm({ code: gc.code, title: gc.title, originalAmount: gc.originalAmount, note: gc.note || "" }); setStatus({ error: "", success: "" }); }} style={{ flex: 1, padding: "8px 0", fontSize: 13, background: gc.isActive ? "rgba(255,255,255,0.1)" : "#fff", border: `1px solid ${gc.isActive ? "rgba(255,255,255,0.2)" : "#cbd5e1"}`, borderRadius: 8, cursor: "pointer", color: gc.isActive ? "#fff" : "#3b82f6", fontWeight: 700, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = gc.isActive ? "rgba(255,255,255,0.2)" : "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = gc.isActive ? "rgba(255,255,255,0.1)" : "#fff"}>Edit</button>
                    <button onClick={() => toggleGiftCardActive(gc)} style={{ flex: 1, padding: "8px 0", fontSize: 13, background: gc.isActive ? "rgba(255,255,255,0.1)" : "#f0fdf4", border: `1px solid ${gc.isActive ? "rgba(255,255,255,0.2)" : "#bbf7d0"}`, borderRadius: 8, cursor: "pointer", color: gc.isActive ? "#e2e8f0" : "#166534", fontWeight: 700, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = gc.isActive ? "rgba(255,255,255,0.2)" : "#dcfce7"} onMouseLeave={e => e.currentTarget.style.background = gc.isActive ? "rgba(255,255,255,0.1)" : "#f0fdf4"}>{gc.isActive ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => deleteGiftCard(gc.id)} style={{ padding: "8px 12px", fontSize: 13, background: "transparent", border: `1px solid ${gc.isActive ? "rgba(248,113,113,0.3)" : "#fecaca"}`, borderRadius: 8, cursor: "pointer", color: gc.isActive ? "#fca5a5" : "#ef4444", fontWeight: 700, transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = gc.isActive ? "rgba(248,113,113,0.15)" : "#fee2e2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>&#x2715;</button>
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
            <span className="badge">Coupon Savings ₹{reports.totalSavings || 0}</span>
          </div>
          <div className="list-stack">
            {(reports.redemptions || []).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.coupon?.code || "-"}</strong>
                <div className="item-meta">Saved ₹{row.amountSaved}</div>
              </div>
            ))}
            {!reports.redemptions?.length && <EmptyState title="No promotion redemptions yet" message="Savings and gift card usage will appear here once customers begin using promotions." />}
          </div>
        </div>
      )}
    </div>
  );
}
