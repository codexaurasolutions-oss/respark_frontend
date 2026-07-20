import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const defaultCouponForm = {
  code: "", title: "", description: "", discountType: "PERCENT", discountValue: 10,
  minBillAmount: "", usageLimit: "", customerUsageLimit: "", startsAt: "", endsAt: "",
  partnerCreditType: "FIXED", partnerCreditValue: 10, partnerCustomerId: "",
  categoryIds: [], serviceIds: [], notes: "",
};

export default function ReferralProgramPage() {
  const { selectedBranchId } = useBranch();
  const [activeTab, setActiveTab] = useState("coupons");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [couponSearch, setCouponSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);
  const [generatingCode, setGeneratingCode] = useState(false);

  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ name: "", phone: "", discountValue: 10, partnerCreditValue: 5, title: "" });
  const [onboardLoading, setOnboardLoading] = useState(false);

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemType, setRedeemType] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPayoutId, setRejectPayoutId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const [wallets, setWallets] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [walletSearch, setWalletSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetail, setWalletDetail] = useState(null);
  const [partnerSearchInput, setPartnerSearchInput] = useState("");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState("wallets");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [ratios, setRatios] = useState({ service: 1, cash: 0.5 });

  const loadCoupons = useCallback(async () => {
    try {
      const [couponRes, catRes, svcRes, custRes] = await Promise.all([
        api.get("/owner/referrals/coupons", { params: { branchId: selectedBranchId || undefined, includeArchived: showArchived ? "true" : undefined } }),
        api.get("/owner/service-categories", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/services", { params: { branchId: selectedBranchId || undefined } }),
        api.get("/owner/customers", { params: { branchId: selectedBranchId || undefined } }),
      ]);
      setCoupons(couponRes.data || []);
      setCategories(catRes.data || []);
      setServices(svcRes.data || []);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []));
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load coupons"), success: "" });
    }
  }, [selectedBranchId, showArchived]);

  const loadWallets = useCallback(async () => {
    try {
      const [walletRes, payoutRes, settingsRes] = await Promise.all([
        api.get("/owner/referrals/wallets", { params: { branchId: selectedBranchId || undefined, search: walletSearch || undefined } }),
        api.get("/owner/referrals/payouts", { params: { branchId: selectedBranchId || undefined, status: payoutStatusFilter || undefined } }),
        api.get("/owner/settings"),
      ]);
      setWallets(walletRes.data || []);
      setPayouts(payoutRes.data?.requests || []);
      const rs = settingsRes.data?.advancedSettings?.referralSettings || {};
      setRatios({ service: Number(rs.affiliateServiceCreditValue || 1) || 1, cash: Number(rs.affiliateCashCreditValue || 0.5) || 0.5 });
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load wallet data"), success: "" });
    }
  }, [selectedBranchId, walletSearch, payoutStatusFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadCoupons(), loadWallets()]);
    setLoading(false);
  }, [loadCoupons, loadWallets]);

  useEffect(() => { const t = setTimeout(() => void loadAll(), 0); return () => clearTimeout(t); }, [loadAll]);
  useEffect(() => { if (!status.error && !status.success) return; const t = setTimeout(() => setStatus({ error: "", success: "" }), 5000); return () => clearTimeout(t); }, [status]);

  const filteredCoupons = coupons.filter((c) => {
    if (!couponSearch) return true;
    const s = couponSearch.toLowerCase();
    return (c.code || "").toLowerCase().includes(s) || (c.title || "").toLowerCase().includes(s);
  });

  const partnerLabel = (c) => { const cust = customers.find((cu) => cu.id === c.partnerCustomerId); return cust ? cust.name : "N/A"; };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try { const res = await api.get("/owner/referrals/coupons/next-code"); setCouponForm(prev => ({ ...prev, code: res.data.code })); }
    catch { setStatus({ error: "Failed to generate code.", success: "" }); }
    finally { setGeneratingCode(false); }
  };

  const handleEditCoupon = (c) => {
    setEditingCoupon(c);
    setCouponForm({
      code: c.code || "", title: c.title || "", description: c.description || "",
      discountType: c.discountType || "PERCENT", discountValue: c.discountValue != null ? Number(c.discountValue) : 0,
      minBillAmount: c.minBillAmount != null ? Number(c.minBillAmount) : "",
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      customerUsageLimit: c.customerUsageLimit != null ? String(c.customerUsageLimit) : "",
      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().split("T")[0] : "",
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().split("T")[0] : "",
      partnerCreditType: c.partnerCreditType || "FIXED", partnerCreditValue: c.partnerCreditValue != null ? Number(c.partnerCreditValue) : 0,
      partnerCustomerId: c.partnerCustomerId || "",
      categoryIds: (c.eligibleCategories || []).map((e) => e.categoryId),
      serviceIds: (c.eligibleServices || []).map((e) => e.serviceId), notes: c.notes || "",
    });
    const partner = customers.find(cu => cu.id === c.partnerCustomerId);
    setPartnerSearchInput(partner ? partner.name : "");
    setShowCouponForm(true);
  };

  const handleCreateCoupon = () => { setEditingCoupon(null); setCouponForm(defaultCouponForm); setPartnerSearchInput(""); setStatus({ error: "", success: "" }); setShowCouponForm(true); };

  const toggleCategory = (catId) => setCouponForm(prev => ({ ...prev, categoryIds: prev.categoryIds.includes(catId) ? prev.categoryIds.filter((id) => id !== catId) : [...prev.categoryIds, catId] }));
  const toggleService = (svcId) => setCouponForm(prev => ({ ...prev, serviceIds: prev.serviceIds.includes(svcId) ? prev.serviceIds.filter((id) => id !== svcId) : [...prev.serviceIds, svcId] }));

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    if (!couponForm.title?.trim()) { setStatus({ error: "Title is required.", success: "" }); return; }
    try {
      const payload = {
        code: couponForm.code || undefined, title: couponForm.title, description: couponForm.description || null,
        discountType: couponForm.discountType, discountValue: Number(couponForm.discountValue) || 0,
        minBillAmount: couponForm.minBillAmount !== "" ? Number(couponForm.minBillAmount) : null,
        usageLimit: couponForm.usageLimit !== "" ? Number(couponForm.usageLimit) : null,
        customerUsageLimit: couponForm.customerUsageLimit !== "" ? Number(couponForm.customerUsageLimit) : null,
        startsAt: couponForm.startsAt || null, endsAt: couponForm.endsAt || null,
        partnerCreditType: couponForm.partnerCreditType, partnerCreditValue: Number(couponForm.partnerCreditValue) || 0,
        partnerCustomerId: couponForm.partnerCustomerId || null, categoryIds: couponForm.categoryIds,
        serviceIds: couponForm.serviceIds, notes: couponForm.notes || null, branchId: selectedBranchId || null,
      };
      if (editingCoupon) { await api.patch(`/owner/referrals/coupons/${editingCoupon.id}`, payload); setStatus({ error: "", success: "Coupon updated." }); }
      else { await api.post("/owner/referrals/coupons", payload); setStatus({ error: "", success: "Coupon created." }); }
      setShowCouponForm(false); setEditingCoupon(null); setCouponForm(defaultCouponForm); setPartnerSearchInput(""); await loadCoupons();
    } catch (err) { setStatus({ error: formatApiError(err, "Could not save coupon"), success: "" }); }
  };

  const handleDeleteCoupon = async (id) => {
    if (!confirm("Delete this referral coupon?")) return;
    try { await api.delete(`/owner/referrals/coupons/${id}`); setStatus({ error: "", success: "Coupon deleted." }); await loadCoupons(); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not delete"), success: "" }); }
  };

  const handleArchiveToggle = async (c) => {
    try { await api.patch(`/owner/referrals/coupons/${c.id}`, { isArchived: !c.isArchived }); setStatus({ error: "", success: c.isArchived ? "Restored." : "Archived." }); await loadCoupons(); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not update"), success: "" }); }
  };

  const submitOnboard = async () => {
    if (!onboardForm.name.trim() || !onboardForm.phone.trim()) { setStatus({ error: "Name and phone required.", success: "" }); return; }
    
    let phoneDigits = onboardForm.phone.replace(/\D/g, "");
    if (phoneDigits.startsWith("0091")) phoneDigits = phoneDigits.slice(4);
    else if (phoneDigits.startsWith("91") && phoneDigits.length > 12) phoneDigits = phoneDigits.slice(2);
    else if (phoneDigits.startsWith("0") && phoneDigits.length === 11) phoneDigits = phoneDigits.slice(1);
    
    if (phoneDigits.length !== 10) {
      setStatus({ error: "Please enter a valid 10-digit phone number.", success: "" });
      return;
    }

    setOnboardLoading(true);
    try {
      const res = await api.post("/owner/referrals/partners/onboard", {
        branchId: selectedBranchId || null, name: onboardForm.name.trim(), phone: onboardForm.phone.trim(),
        discountType: "PERCENT", discountValue: Number(onboardForm.discountValue) || 10,
        partnerCreditType: "PERCENT", partnerCreditValue: Number(onboardForm.partnerCreditValue) || 5,
        title: onboardForm.title.trim() || `${onboardForm.name.trim()} Affiliate Code`, notes: "Onboarded from referral program page"
      });
      setStatus({ error: "", success: `Partner onboarded. Code ${res.data?.coupon?.code || ""} created.` });
      setShowOnboardModal(false); await loadAll();
    } catch (err) { setStatus({ error: formatApiError(err, "Could not onboard partner (Check phone number)"), success: "" }); }
    finally { setOnboardLoading(false); }
  };

  const loadWalletDetail = async (partnerId) => {
    setDetailLoading(true); setWalletDetail(null);
    try { const res = await api.get(`/owner/referrals/wallets/${partnerId}`, { params: { branchId: selectedBranchId || undefined } }); setWalletDetail(res.data); setSelectedWallet(partnerId); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not load wallet"), success: "" }); }
    finally { setDetailLoading(false); }
  };

  const handlePayoutAction = async (payoutId, newStatus, reason) => {
    try { await api.patch(`/owner/referrals/payouts/${payoutId}`, { status: newStatus, rejectionReason: reason || null }); setStatus({ error: "", success: `Payout ${newStatus.toLowerCase()}.` }); await loadWallets(); if (selectedWallet) await loadWalletDetail(selectedWallet); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not update payout"), success: "" }); }
  };

  const handleRedeemService = () => {
    setRedeemType("service");
    setRedeemAmount("");
    setShowRedeemModal(true);
  };

  const handleRequestPayout = () => {
    setRedeemType("cash");
    setRedeemAmount("");
    setShowRedeemModal(true);
  };

  const submitRedeem = async () => {
    if (!redeemAmount || isNaN(redeemAmount) || Number(redeemAmount) <= 0) return;
    setRedeemLoading(true);
    try {
      if (redeemType === "service") {
        await api.post(`/owner/referrals/wallets/${selectedWallet}/redeem-service`, { amount: Number(redeemAmount), note: "Manual service redemption" });
        setStatus({ error: "", success: `${redeemAmount} credits redeemed for services.` });
      } else {
        await api.post(`/owner/referrals/wallets/${selectedWallet}/payout`, { creditsRedeemed: Number(redeemAmount) });
        setStatus({ error: "", success: `Payout requested for ${redeemAmount} credits.` });
      }
      setShowRedeemModal(false);
      await loadWallets();
      if (selectedWallet) await loadWalletDetail(selectedWallet);
    } catch (err) {
      setStatus({ error: formatApiError(err, redeemType === "service" ? "Could not redeem" : "Could not request payout"), success: "" });
    } finally {
      setRedeemLoading(false);
    }
  };

  const statusColors = { PENDING: "#eab308", APPROVED: "#22c55e", REJECTED: "#ef4444", PAID: "#6366f1" };
  const tabBtnStyle = (key) => ({ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", background: activeTab === key ? "#0f172a" : "transparent", color: activeTab === key ? "#fff" : "#64748b", transition: "all 0.15s" });

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
        .cpn-btn-ghost { background: transparent; color: #64748b; }
        .cpn-btn-ghost:hover { background: #f1f5f9; color: #0f172a; }

        /* Custom Radio & Checkbox */
        .cpn-radio-group { display: flex; gap: 16px; background: #f8fafc; padding: 6px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .cpn-radio-option { flex: 1; text-align: center; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; color: #64748b; }
        .cpn-radio-option.active { background: white; color: #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      `}</style>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Referral Program</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Manage referral coupons, partners, and wallets in one place.</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 18, width: "fit-content" }}>
        <button onClick={() => setActiveTab("coupons")} style={tabBtnStyle("coupons")}>Coupons</button>
        <button onClick={() => setActiveTab("partners")} style={tabBtnStyle("partners")}>Partners</button>
        <button onClick={() => setActiveTab("wallets")} style={tabBtnStyle("wallets")}>Wallets</button>
      </div>

      {status.error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>{status.error}</div>}
      {status.success && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: 13, marginBottom: 12 }}>{status.success}</div>}

      {loading && <PageLoader title="Loading referral program..." message="Please wait" />}

      {!loading && activeTab === "coupons" && (
        <div className="cpn-card anim-fade">
          {!showCouponForm ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <h3 style={{ margin: 0 }}>Referral Coupons <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>({filteredCoupons.length})</span></h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                  <input type="text" className="cpn-input" placeholder="Search..." value={couponSearch} onChange={(e) => setCouponSearch(e.target.value)} style={{ padding: "8px 12px", fontSize: 13, flex: 1, minWidth: 120, maxWidth: 180 }} />
                  <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                    Archived
                  </label>
                  <button onClick={handleCreateCoupon} className="cpn-btn cpn-btn-primary" style={{ fontSize: 13, whiteSpace: "nowrap", padding: "8px 16px" }}>+ New Coupon</button>
                </div>
              </div>
              {filteredCoupons.length === 0 ? (
                <EmptyState title="No referral coupons" description="Create your first referral coupon to start rewarding partners." />
              ) : (
                <div className="list-stack" style={{ gap: 12, maxHeight: "55vh", overflowY: "auto" }}>
                  {filteredCoupons.map((c) => (
                    <div key={c.id} className="list-item" style={{ opacity: c.isArchived ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                            <strong style={{ fontSize: 14, color: "#0f172a", fontFamily: "monospace", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>{c.code}</strong>
                            <span style={{ color: "#334155", fontSize: 14, fontWeight: 600 }}>{c.title}</span>
                            {c.isArchived && <span style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>Archived</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "2px 8px", borderRadius: 12, fontWeight: 500, fontSize: 12 }}>
                              {c.discountType === "PERCENT" ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                            </span>
                            {c.minBillAmount ? <span>Min Bill: ₹{c.minBillAmount}</span> : null}
                            <span>Used: <strong>{c._count?.redemptions || 0}</strong> {c.usageLimit ? `/ ${c.usageLimit}` : ""}</span>
                          </div>
                          {(c.partnerCreditType || c.partnerCustomerId) && (
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></span>
                              {c.partnerCustomerId ? <span>Partner: <strong>{partnerLabel(c)}</strong></span> : <span>Generic Partner Coupon</span>}
                              <span style={{ color: "#cbd5e1" }}>|</span>
                              <span>Partner Earns: <strong>{c.partnerCreditType === "PERCENT" ? `${c.partnerCreditValue}%` : `₹${c.partnerCreditValue}`}</strong></span>
                            </div>
                          )}
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, lineHeight: 1.5 }}>
                            {!c.eligibleCategories?.length && !c.eligibleServices?.length ? "Applies to all services & products" : (
                              <>
                                {c.eligibleCategories?.length > 0 && <div>Categories: {c.eligibleCategories.map((e) => e.category?.name).filter(Boolean).join(", ")}</div>}
                                {c.eligibleServices?.length > 0 && <div>Services: {c.eligibleServices.map((e) => e.service?.name).filter(Boolean).join(", ")}</div>}
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => handleEditCoupon(c)} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}>Edit</button>
                          <button onClick={() => handleArchiveToggle(c)} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 12, padding: "6px 12px", color: c.isArchived ? "#22c55e" : "#eab308" }}>{c.isArchived ? "Restore" : "Archive"}</button>
                          <button onClick={() => handleDeleteCoupon(c.id)} className="cpn-btn" style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #fecaca", color: "#ef4444", background: "#fef2f2" }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleCouponSubmit} className="cpn-card anim-fade" style={{ padding: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editingCoupon ? "Edit Referral Coupon" : "Create New Referral Coupon"}</h3>
                <button type="button" onClick={() => { setShowCouponForm(false); setEditingCoupon(null); setPartnerSearchInput(""); }} className="cpn-btn cpn-btn-ghost" style={{ fontSize: 13 }}>← Back to list</button>
              </div>
              <div className="form-grid" style={{ gap: 20 }}>
                {!editingCoupon && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="cpn-label">Coupon Code</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      <input
                        type="text"
                        className="cpn-input"
                        value={couponForm.code}
                        onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                        placeholder="e.g. SUMMER2024"
                        maxLength={20}
                        style={{ flex: 1, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontSize: 16 }}
                      />
                      <button type="button" onClick={handleGenerateCode} disabled={generatingCode} className="cpn-btn cpn-btn-secondary" style={{ whiteSpace: "nowrap" }}>{generatingCode ? "Generating..." : "Auto Generate"}</button>
                    </div>
                  </div>
                )}
                {editingCoupon && <div><label className="cpn-label">Coupon Code</label><div style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#475569", marginTop: 4, display: "inline-block" }}>{editingCoupon.code}</div></div>}
                
                <div style={{ gridColumn: "1 / -1", height: 0 }}></div>
                
                <div><label className="cpn-label">Title <span style={{ color: "#ef4444" }}>*</span></label><input required className="cpn-input" value={couponForm.title} onChange={(e) => setCouponForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Summer Special" style={{ marginTop: 4 }} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label className="cpn-label">Description</label><input className="cpn-input" value={couponForm.description} onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description of the coupon..." style={{ marginTop: 4 }} /></div>
                
                <div style={{ gridColumn: "1 / -1", height: 1, background: "#f1f5f9", margin: "10px 0" }}></div>
                <div style={{ gridColumn: "1 / -1" }}><h4 style={{ margin: 0, fontSize: 15, color: "#0f172a", fontWeight: 700 }}>Customer Discount</h4></div>
                
                <div>
                  <label className="cpn-label">Discount Type</label>
                  <div className="cpn-radio-group" style={{ marginTop: 4 }}>
                    <div className={`cpn-radio-option ${couponForm.discountType === "PERCENT" ? "active" : ""}`} onClick={() => setCouponForm(prev => ({ ...prev, discountType: "PERCENT" }))}>Percentage (%)</div>
                    <div className={`cpn-radio-option ${couponForm.discountType === "FIXED" ? "active" : ""}`} onClick={() => setCouponForm(prev => ({ ...prev, discountType: "FIXED" }))}>Fixed Amount (₹)</div>
                  </div>
                </div>
                <div><label className="cpn-label">Discount Value <span style={{ color: "#ef4444" }}>*</span></label><input type="number" required min="0" step="0.01" className="cpn-input" value={couponForm.discountValue} onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))} style={{ marginTop: 4 }} /></div>
                <div><label className="cpn-label">Min Bill Amount (₹)</label><input type="number" min="0" className="cpn-input" value={couponForm.minBillAmount} onChange={(e) => setCouponForm(prev => ({ ...prev, minBillAmount: e.target.value }))} style={{ marginTop: 4 }} placeholder="Optional" /></div>
                
                <div style={{ gridColumn: "1 / -1", height: 1, background: "#f1f5f9", margin: "10px 0" }}></div>
                <div style={{ gridColumn: "1 / -1" }}><h4 style={{ margin: 0, fontSize: 15, color: "#0f172a", fontWeight: 700 }}>Partner Credits</h4></div>

                <div>
                  <label className="cpn-label">Credit Type</label>
                  <div className="cpn-radio-group" style={{ marginTop: 4 }}>
                    <div className={`cpn-radio-option ${couponForm.partnerCreditType === "FIXED" ? "active" : ""}`} onClick={() => setCouponForm(prev => ({ ...prev, partnerCreditType: "FIXED" }))}>Fixed Amount (₹)</div>
                    <div className={`cpn-radio-option ${couponForm.partnerCreditType === "PERCENT" ? "active" : ""}`} onClick={() => setCouponForm(prev => ({ ...prev, partnerCreditType: "PERCENT" }))}>Percentage (%)</div>
                  </div>
                </div>
                <div><label className="cpn-label">Credit Value</label><input type="number" min="0" step="0.01" className="cpn-input" value={couponForm.partnerCreditValue} onChange={(e) => setCouponForm(prev => ({ ...prev, partnerCreditValue: e.target.value }))} style={{ marginTop: 4 }} /></div>
                <div><label className="cpn-label">Assign to Partner</label><div style={{ position: "relative", marginTop: 4 }}><input type="text" className="cpn-input" placeholder="Search by name or phone..." value={partnerSearchInput} onChange={(e) => { setPartnerSearchInput(e.target.value); setShowPartnerDropdown(true); const match = customers.find(c => c.name === e.target.value); if (match) { setCouponForm(prev => ({ ...prev, partnerCustomerId: match.id })); } else { setCouponForm(prev => ({ ...prev, partnerCustomerId: "" })); } }} onFocus={() => setShowPartnerDropdown(true)} onBlur={() => setTimeout(() => setShowPartnerDropdown(false), 200)} /><svg style={{ position: "absolute", right: 12, top: 12, width: 18, height: 18, color: "#94a3b8", pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>{showPartnerDropdown && partnerSearchInput && (<div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 6, maxHeight: 240, overflowY: "auto", zIndex: 50, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}><div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontWeight: couponForm.partnerCustomerId === "" ? 700 : 400, color: couponForm.partnerCustomerId === "" ? "#0f172a" : "#64748b" }} onClick={() => { setPartnerSearchInput(""); setCouponForm(prev => ({ ...prev, partnerCustomerId: "" })); setShowPartnerDropdown(false); }}>None (Generic Coupon)</div>{customers.filter(c => c.name?.toLowerCase().includes(partnerSearchInput.toLowerCase()) || c.phone?.includes(partnerSearchInput)).map(c => (<div key={c.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontWeight: couponForm.partnerCustomerId === c.id ? 700 : 400 }} onClick={() => { setPartnerSearchInput(c.name); setCouponForm(prev => ({ ...prev, partnerCustomerId: c.id })); setShowPartnerDropdown(false); }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}><div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{c.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{c.phone}</div></div>))}{customers.filter(c => c.name?.toLowerCase().includes(partnerSearchInput.toLowerCase()) || c.phone?.includes(partnerSearchInput)).length === 0 && (<div style={{ padding: "12px 16px", color: "#64748b", fontSize: 14, textAlign: "center" }}>No matches found</div>)}</div>)}</div></div>
                <div style={{ gridColumn: "1 / -1", height: 1, background: "#f1f5f9", margin: "10px 0" }}></div>
                <div style={{ gridColumn: "1 / -1" }}><h4 style={{ margin: 0, fontSize: 15, color: "#0f172a", fontWeight: 700 }}>Limits & Validity</h4></div>

                <div><label className="cpn-label">Total Usage Limit</label><input type="number" min="0" className="cpn-input" value={couponForm.usageLimit} onChange={(e) => setCouponForm(prev => ({ ...prev, usageLimit: e.target.value }))} style={{ marginTop: 4 }} placeholder="Unlimited if empty" /></div>
                <div><label className="cpn-label">Per Customer Limit</label><input type="number" min="0" className="cpn-input" value={couponForm.customerUsageLimit} onChange={(e) => setCouponForm(prev => ({ ...prev, customerUsageLimit: e.target.value }))} style={{ marginTop: 4 }} placeholder="Unlimited if empty" /></div>
                <div><label className="cpn-label">Start Date</label><input type="date" className="cpn-input" value={couponForm.startsAt} onChange={(e) => setCouponForm(prev => ({ ...prev, startsAt: e.target.value }))} style={{ marginTop: 4 }} /></div>
                <div><label className="cpn-label">End Date</label><input type="date" className="cpn-input" value={couponForm.endsAt} onChange={(e) => setCouponForm(prev => ({ ...prev, endsAt: e.target.value }))} style={{ marginTop: 4 }} /></div>

                <div style={{ gridColumn: "1 / -1", height: 1, background: "#f1f5f9", margin: "10px 0" }}></div>
                <div style={{ gridColumn: "1 / -1" }}><h4 style={{ margin: 0, fontSize: 15, color: "#0f172a", fontWeight: 700 }}>Eligibility (Leave empty for all items)</h4></div>
                
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="cpn-label" style={{ marginBottom: 12 }}>Categories</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {categories.map((cat) => (
                      <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 24, border: couponForm.categoryIds.includes(cat.id) ? "1px solid #3b82f6" : "1px solid #cbd5e1", background: couponForm.categoryIds.includes(cat.id) ? "#eff6ff" : "#fff", color: couponForm.categoryIds.includes(cat.id) ? "#1d4ed8" : "#475569", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
                        <input type="checkbox" checked={couponForm.categoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} style={{ margin: 0, width: 16, height: 16, accentColor: "#3b82f6" }} />{cat.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="cpn-label" style={{ marginBottom: 12 }}>Services</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxHeight: 200, overflowY: "auto", padding: 4 }}>
                    {services.map((svc) => (
                      <label key={svc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 24, border: couponForm.serviceIds.includes(svc.id) ? "1px solid #3b82f6" : "1px solid #cbd5e1", background: couponForm.serviceIds.includes(svc.id) ? "#eff6ff" : "#fff", color: couponForm.serviceIds.includes(svc.id) ? "#1d4ed8" : "#475569", fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontWeight: 600 }}>
                        <input type="checkbox" checked={couponForm.serviceIds.includes(svc.id)} onChange={() => toggleService(svc.id)} style={{ margin: 0, width: 16, height: 16, accentColor: "#3b82f6" }} />{svc.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1" }}><label className="cpn-label">Internal Notes</label><input className="cpn-input" value={couponForm.notes} onChange={(e) => setCouponForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes for staff..." style={{ marginTop: 4 }} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 30, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                <button type="button" onClick={() => { setShowCouponForm(false); setEditingCoupon(null); setPartnerSearchInput(""); }} className="cpn-btn cpn-btn-secondary" style={{ minWidth: 100 }}>Cancel</button>
                <button type="submit" className="cpn-btn cpn-btn-primary" style={{ minWidth: 160 }}>{editingCoupon ? "Save Changes" : "Create Coupon"}</button>
              </div>
            </form>
          )}
        </div>
      )}

      {!loading && activeTab === "partners" && (
        <div className="cpn-card anim-fade">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Affiliate Partners</h3>
            <button onClick={() => { setOnboardForm({ name: "", phone: "", discountValue: 10, partnerCreditValue: 5, title: "" }); setShowOnboardModal(true); }} className="cpn-btn cpn-btn-primary" style={{ fontSize: 13, whiteSpace: "nowrap" }}>+ Onboard Partner</button>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>Partners are automatically created when you onboard them. Each partner gets a unique coupon code and wallet.</p>
          {customers.filter(c => c.source === "AFFILIATE_PARTNER" || c.tags?.includes("AFFILIATE_PARTNER")).length === 0 ? (
            <EmptyState title="No partners yet" description="Onboard your first affiliate partner to start the referral program." />
          ) : (
            <div className="list-stack" style={{ gap: 12, maxHeight: "55vh", overflowY: "auto" }}>
              {customers.filter(c => c.source === "AFFILIATE_PARTNER" || c.tags?.includes("AFFILIATE_PARTNER")).map((p) => {
                const wallet = wallets.find(w => w.partnerId === p.id);
                return (
                  <div key={p.id} className="list-item" style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", transition: "all 0.2s" }} onClick={() => { setActiveTab("wallets"); if (wallet) loadWalletDetail(wallet.partnerId); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 15, color: "#0f172a" }}>{p.name}</strong>
                          {p.phone && <span style={{ fontSize: 13, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 12 }}>{p.phone}</span>}
                        </div>
                        {wallet ? (
                          <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 500 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></div> Balance: {Number(wallet.balance)} cr</span>
                            <span style={{ color: "#64748b" }}>Earned: {Number(wallet.totalEarned)} cr</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>No wallet created yet</div>
                        )}
                      </div>
                    </div>
                    <button className="cpn-btn cpn-btn-secondary" style={{ fontSize: 13, color: "#3b82f6", padding: "6px 12px", border: "1px solid #eff6ff", background: "#eff6ff" }}>View Wallet →</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "wallets" && !selectedWallet && (
        <>
          <div className="cpn-card anim-fade" style={{ marginBottom: 16, padding: "16px 24px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setWalletSubTab("wallets")} style={{ fontSize: 14, padding: "8px 16px", borderRadius: 8, fontWeight: 600, transition: "all 0.2s", background: walletSubTab === "wallets" ? "#1e293b" : "transparent", color: walletSubTab === "wallets" ? "#fff" : "#64748b", border: walletSubTab === "wallets" ? "none" : "1px solid #e2e8f0" }}>Wallets ({wallets.length})</button>
              <button onClick={() => setWalletSubTab("payouts")} style={{ fontSize: 14, padding: "8px 16px", borderRadius: 8, fontWeight: 600, transition: "all 0.2s", background: walletSubTab === "payouts" ? "#1e293b" : "transparent", color: walletSubTab === "payouts" ? "#fff" : "#64748b", border: walletSubTab === "payouts" ? "none" : "1px solid #e2e8f0" }}>Payouts ({payouts.length})</button>
              {walletSubTab === "wallets" && <input type="text" className="cpn-input" placeholder="Search partner..." value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} style={{ marginLeft: "auto", width: "240px", padding: "8px 12px" }} />}
              {walletSubTab === "payouts" && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["", "PENDING", "APPROVED", "REJECTED", "PAID"].map((s) => (
                    <button key={s || "all"} onClick={() => setPayoutStatusFilter(s)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, fontWeight: 500, background: payoutStatusFilter === s ? "#e2e8f0" : "transparent", color: payoutStatusFilter === s ? "#0f172a" : "#64748b", border: payoutStatusFilter === s ? "none" : "1px solid #e2e8f0", cursor: "pointer" }}>{s || "All"}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {walletSubTab === "wallets" && (
            <div className="cpn-card anim-fade">
              {wallets.length === 0 ? (
                <EmptyState title="No wallets" description="Wallets are created automatically when partners earn credits." />
              ) : (
                <div className="list-stack" style={{ gap: 12, maxHeight: "55vh", overflowY: "auto" }}>
                  {wallets.map((w) => (
                    <div key={w.id} className="list-item" style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", transition: "all 0.2s" }} onClick={() => loadWalletDetail(w.partnerId)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, flexShrink: 0 }}>
                          {(w.partner?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ fontSize: 15, color: "#0f172a" }}>{w.partner?.name || "Unknown Partner"}</strong>
                            {w.partner?.phone && <span style={{ fontSize: 13, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 12 }}>{w.partner.phone}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 13 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 600 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}></div> {Number(w.balance)} cr</span>
                            <span style={{ color: "#64748b" }}>Earned: {Number(w.totalEarned)} cr</span>
                            <span style={{ color: "#64748b" }}>Redeemed: {Number(w.totalRedeemed)} cr</span>
                          </div>
                        </div>
                      </div>
                      <button className="cpn-btn cpn-btn-ghost" style={{ fontSize: 13, color: "#16a34a", padding: "6px 12px", border: "1px solid #f0fdf4", background: "#f0fdf4" }}>Ledger →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {walletSubTab === "payouts" && (
            <div className="cpn-card anim-fade">
              {payouts.length === 0 ? (
                <EmptyState title="No payout requests" description="Partners can request cash withdrawal from their wallet." />
              ) : (
                <div className="list-stack" style={{ gap: 12, maxHeight: "55vh", overflowY: "auto" }}>
                  {payouts.map((p) => (
                    <div key={p.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                          💸
                        </div>
                        <div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <strong style={{ fontSize: 15, color: "#0f172a" }}>{p.partner?.name}</strong>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: `${statusColors[p.status]}20`, color: statusColors[p.status], fontWeight: 600 }}>{p.status}</span>
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize: 14, color: "#475569", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{Number(p.creditsRedeemed ?? 0)} cr</span> 
                            <span style={{ color: "#94a3b8" }}>→</span> 
                            <span style={{ fontWeight: 600, color: "#16a34a" }}>₹{Number(p.cashAmount ?? 0).toFixed(2)}</span>
                          </div>
                          {p.rejectionReason && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, background: "#fef2f2", padding: "4px 8px", borderRadius: 4 }}>Reason: {p.rejectionReason}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {p.status === "PENDING" && (
                          <>
                            <button onClick={() => handlePayoutAction(p.id, "APPROVED")} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 12, color: "#16a34a", padding: "6px 12px", border: "1px solid #dcfce7", background: "#f0fdf4" }}>Approve</button>
                            <button onClick={() => { setRejectPayoutId(p.id); setRejectReason(""); setShowRejectModal(true); }} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 12, color: "#ef4444", padding: "6px 12px", border: "1px solid #fee2e2", background: "#fef2f2" }}>Reject</button>
                          </>
                        )}
                        {p.status === "APPROVED" && <button onClick={() => handlePayoutAction(p.id, "PAID")} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 12, color: "#4338ca", padding: "6px 12px", border: "1px solid #e0e7ff", background: "#eef2ff" }}>Mark as Paid</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && selectedWallet && (
        <div className="cpn-card anim-fade">
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <button onClick={() => { setSelectedWallet(null); setWalletDetail(null); }} className="cpn-btn cpn-btn-ghost" style={{ fontSize: 13 }}>← Back</button>
            <button onClick={handleRedeemService} className="cpn-btn cpn-btn-primary" style={{ fontSize: 13, background: "#16a34a" }}>Redeem for Services</button>
            <button onClick={handleRequestPayout} className="cpn-btn cpn-btn-secondary" style={{ fontSize: 13, border: "1px solid #eab308", color: "#eab308" }}>Request Cash Payout</button>
          </div>
          {detailLoading ? <PageLoader title="Loading wallet..." message="Please wait" /> : walletDetail?.wallet ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Balance</div><div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a", marginTop: 4 }}>{Number(walletDetail.wallet.balance)}</div></div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Earned</div><div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{Number(walletDetail.wallet.totalEarned)}</div></div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Redeemed</div><div style={{ fontSize: 24, fontWeight: 700, color: "#64748b", marginTop: 4 }}>{Number(walletDetail.wallet.totalRedeemed)}</div></div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Service Rate</div><div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>1 cr = ₹{ratios.service}</div></div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, textAlign: "center" }}><div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Cash Rate</div><div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>1 cr = ₹{ratios.cash}</div></div>
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Transaction Ledger</h4>
              {walletDetail.transactions?.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>No transactions yet.</p>
              ) : (
                <div className="list-stack" style={{ maxHeight: "55vh", overflowY: "auto" }}>
                  {walletDetail.transactions?.map((t) => (
                    <div key={t.id} className="list-item" style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: t.type === "EARN" ? "#dcfce7" : t.type === "CASH_WITHDRAWAL" ? "#fef3c7" : "#f1f5f9", color: t.type === "EARN" ? "#166534" : t.type === "CASH_WITHDRAWAL" ? "#92400e" : "#475569", fontWeight: 600 }}>{t.type}</span>
                          {t.note && <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{t.note}</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: t.type === "EARN" ? "#16a34a" : "#ef4444" }}>{t.type === "EARN" ? "+" : "-"}{Number(t.amount)}</span>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{new Date(t.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p style={{ fontSize: 13, color: "#94a3b8" }}>No wallet data.</p>}
        </div>
      )}

      {showOnboardModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={() => setShowOnboardModal(false)}>
          <div className="anim-fade" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Onboard Affiliate Partner</h3>
            <div style={{ marginBottom: 16 }}><label className="cpn-label">Name *</label><input className="cpn-input" value={onboardForm.name} onChange={(e) => setOnboardForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. John Doe" /></div>
            <div style={{ marginBottom: 16 }}>
              <label className="cpn-label">Phone *</label>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", overflow: "hidden", transition: "all 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"} onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}>
                <span style={{ padding: "12px 16px", background: "#f8fafc", color: "#475569", fontSize: 14, borderRight: "1px solid #cbd5e1", fontWeight: 600 }}>+91</span>
                <input 
                  type="text"
                  maxLength={10}
                  value={onboardForm.phone} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setOnboardForm(prev => ({ ...prev, phone: val }));
                  }} 
                  placeholder="e.g. 9876543210" 
                  style={{ width: "100%", padding: "12px 16px", border: "none", fontSize: 14, outline: "none", boxSizing: "border-box" }} 
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="cpn-label">Coupon Title</label><input className="cpn-input" value={onboardForm.title} onChange={(e) => setOnboardForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Auto from name if blank" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div><label className="cpn-label">Customer Discount %</label><input type="number" className="cpn-input" value={onboardForm.discountValue} onChange={(e) => setOnboardForm(prev => ({ ...prev, discountValue: e.target.value }))} /></div>
              <div><label className="cpn-label">Partner Credit %</label><input type="number" className="cpn-input" value={onboardForm.partnerCreditValue} onChange={(e) => setOnboardForm(prev => ({ ...prev, partnerCreditValue: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowOnboardModal(false)} className="cpn-btn cpn-btn-secondary" style={{ minWidth: 100 }}>Cancel</button>
              <button onClick={submitOnboard} disabled={onboardLoading} className="cpn-btn cpn-btn-primary" style={{ minWidth: 120 }}>{onboardLoading ? "Onboarding..." : "Onboard"}</button>
            </div>
          </div>
        </div>
      )}

      {showRedeemModal && walletDetail?.wallet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={() => setShowRedeemModal(false)}>
          <div className="anim-fade" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, width: 420, maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{redeemType === "service" ? "Redeem for Services" : "Request Cash Payout"}</h3>
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, color: "#166534", fontWeight: 600 }}>Available Balance</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>{Number(walletDetail.wallet.balance)} credits</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="cpn-label">Credits to {redeemType === "service" ? "redeem" : "withdraw"}</label>
              <input
                type="number"
                min="1"
                className="cpn-input"
                max={Number(walletDetail.wallet.balance)}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder={`Max: ${Number(walletDetail.wallet.balance)}`}
                autoFocus
              />
            </div>
            {redeemAmount && Number(redeemAmount) > 0 && (
              <div style={{ background: redeemType === "service" ? "#f0fdf4" : "#fefce8", borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 14 }}>
                <div style={{ fontWeight: 600, color: redeemType === "service" ? "#166534" : "#854d0e" }}>
                  {redeemType === "service"
                    ? `${redeemAmount} credits = ₹${Number(redeemAmount) * ratios.service} service discount`
                    : `${redeemAmount} credits = ₹${(Number(redeemAmount) * ratios.cash).toFixed(2)} cash payout`
                  }
                </div>
                {redeemType === "cash" && (
                  <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>50% conversion rate applies</div>
                )}
              </div>
            )}
            {redeemAmount && (Number(redeemAmount) > Number(walletDetail.wallet.balance) || Number(redeemAmount) <= 0) && (
              <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 16 }}>Invalid amount. Must be between 1 and {Number(walletDetail.wallet.balance)}.</div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRedeemModal(false)} className="cpn-btn cpn-btn-secondary" style={{ minWidth: 100 }}>Cancel</button>
              <button
                onClick={submitRedeem}
                disabled={redeemLoading || !redeemAmount || isNaN(redeemAmount) || Number(redeemAmount) <= 0 || Number(redeemAmount) > Number(walletDetail.wallet.balance)}
                className="cpn-btn cpn-btn-primary"
                style={{ background: redeemType === "service" ? "#16a34a" : "#eab308", color: redeemType === "service" ? "#fff" : "#000", minWidth: 140 }}
              >
                {redeemLoading ? "Processing..." : redeemType === "service" ? "Redeem" : "Request Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={() => setShowRejectModal(false)}>
          <div className="anim-fade" style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#ef4444" }}>Reject Payout Request</h3>
            <div style={{ marginBottom: 24 }}>
              <label className="cpn-label">Rejection Reason</label>
              <textarea
                className="cpn-input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                autoFocus
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowRejectModal(false)} className="cpn-btn cpn-btn-secondary" style={{ minWidth: 100 }}>Cancel</button>
              <button
                onClick={async () => {
                  setRejectLoading(true);
                  try {
                    await handlePayoutAction(rejectPayoutId, "REJECTED", rejectReason || null);
                    setShowRejectModal(false);
                  } finally {
                    setRejectLoading(false);
                  }
                }}
                disabled={rejectLoading}
                className="cpn-btn cpn-btn-primary"
                style={{ background: "#ef4444", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)", minWidth: 120 }}
              >
                {rejectLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
