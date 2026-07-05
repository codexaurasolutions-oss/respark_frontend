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

  const [wallets, setWallets] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [walletSearch, setWalletSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetail, setWalletDetail] = useState(null);
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
    setShowCouponForm(true);
  };

  const handleCreateCoupon = () => { setEditingCoupon(null); setCouponForm(defaultCouponForm); setShowCouponForm(true); };

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
      setShowCouponForm(false); setEditingCoupon(null); setCouponForm(defaultCouponForm); await loadCoupons();
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
    } catch (err) { setStatus({ error: formatApiError(err, "Could not onboard"), success: "" }); }
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

  const handleRedeemService = async (partnerId) => {
    const amount = prompt("Enter credits to redeem for services (1 credit = ₹1):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try { await api.post(`/owner/referrals/wallets/${partnerId}/redeem-service`, { amount: Number(amount), note: "Manual service redemption" }); setStatus({ error: "", success: `${amount} credits redeemed.` }); await loadWallets(); if (selectedWallet) await loadWalletDetail(partnerId); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not redeem"), success: "" }); }
  };

  const handleRequestPayout = async (partnerId) => {
    const amount = prompt("Enter credits for cash payout (1 credit = ₹0.50):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try { await api.post(`/owner/referrals/wallets/${partnerId}/payout`, { creditsRedeemed: Number(amount) }); setStatus({ error: "", success: `Payout requested for ${amount} credits.` }); await loadWallets(); if (selectedWallet) await loadWalletDetail(partnerId); }
    catch (err) { setStatus({ error: formatApiError(err, "Could not request payout"), success: "" }); }
  };

  const statusColors = { PENDING: "#eab308", APPROVED: "#22c55e", REJECTED: "#ef4444", PAID: "#6366f1" };
  const tabBtnStyle = (key) => ({ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", background: activeTab === key ? "#0f172a" : "transparent", color: activeTab === key ? "#fff" : "#64748b", transition: "all 0.15s" });

  return (
    <div className="page-shell">
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
        <div className="panel-card">
          {!showCouponForm ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Referral Coupons <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>({filteredCoupons.length})</span></h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="text" placeholder="Search..." value={couponSearch} onChange={(e) => setCouponSearch(e.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, width: 180 }} />
                  <label style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                    Archived
                  </label>
                  <button onClick={handleCreateCoupon} className="btn btn-primary" style={{ fontSize: 13 }}>+ New Coupon</button>
                </div>
              </div>
              {filteredCoupons.length === 0 ? (
                <EmptyState title="No referral coupons" description="Create your first referral coupon to start rewarding partners." />
              ) : (
                <div className="list-stack">
                  {filteredCoupons.map((c) => (
                    <div key={c.id} className="list-item" style={{ opacity: c.isArchived ? 0.5 : 1 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <strong>{c.code}</strong>
                          <span style={{ color: "#334155", fontSize: 13 }}>{c.title}</span>
                          {c.isArchived && <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>Archived</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          Discount: {c.discountType === "PERCENT" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                          {c.minBillAmount ? ` | Min: ₹${c.minBillAmount}` : ""}
                          {c.partnerCreditType && <span> | Partner: {c.partnerCreditType === "PERCENT" ? `${c.partnerCreditValue}%` : `₹${c.partnerCreditValue}`}</span>}
                          {c.partnerCustomerId && <span> | Partner: {partnerLabel(c)}</span>}
                          {` | Used: ${c._count?.redemptions || 0}${c.usageLimit ? `/${c.usageLimit}` : ""}`}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {!c.eligibleCategories?.length && !c.eligibleServices?.length ? "All items" : ""}
                          {c.eligibleCategories?.length > 0 && `Categories: ${c.eligibleCategories.map((e) => e.category?.name).filter(Boolean).join(", ")}`}
                          {c.eligibleServices?.length > 0 && `${c.eligibleCategories?.length > 0 ? " | " : ""}Services: ${c.eligibleServices.map((e) => e.service?.name).filter(Boolean).join(", ")}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => handleEditCoupon(c)} className="btn btn-ghost" style={{ fontSize: 12 }}>Edit</button>
                        <button onClick={() => handleArchiveToggle(c)} className="btn btn-ghost" style={{ fontSize: 12, color: c.isArchived ? "#22c55e" : "#eab308" }}>{c.isArchived ? "Restore" : "Archive"}</button>
                        <button onClick={() => handleDeleteCoupon(c.id)} className="btn btn-ghost" style={{ fontSize: 12, color: "#ef4444" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleCouponSubmit}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{editingCoupon ? "Edit" : "New"} Referral Coupon</h3>
                <button type="button" onClick={() => { setShowCouponForm(false); setEditingCoupon(null); }} className="btn btn-ghost" style={{ fontSize: 13 }}>Back to list</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {!editingCoupon && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Coupon Code</label>
                    {couponForm.code ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "2px solid #22c55e", background: "#f0fdf4", color: "#16a34a", fontSize: 18, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2 }}>{couponForm.code}</div>
                        <button type="button" onClick={() => setCouponForm(prev => ({ ...prev, code: "" }))} className="btn btn-ghost" style={{ fontSize: 12, color: "#ef4444" }}>Remove</button>
                      </div>
                    ) : (
                      <button type="button" onClick={handleGenerateCode} disabled={generatingCode} className="btn btn-primary" style={{ width: "100%", padding: "10px 16px", fontSize: 13 }}>{generatingCode ? "Generating..." : "Auto Generate Code"}</button>
                    )}
                  </div>
                )}
                {editingCoupon && <div><label style={{ fontSize: 12, color: "#475569" }}>Code</label><div style={{ padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontFamily: "monospace", fontSize: 13 }}>{editingCoupon.code}</div></div>}
                <div><label style={{ fontSize: 12, color: "#475569" }}>Title *</label><input required value={couponForm.title} onChange={(e) => setCouponForm(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Referral Discount" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, color: "#475569" }}>Description</label><input value={couponForm.description} onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Discount Type *</label><select value={couponForm.discountType} onChange={(e) => setCouponForm(prev => ({ ...prev, discountType: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}><option value="PERCENT">Percentage (%)</option><option value="FIXED">Fixed (₹)</option></select></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Discount Value *</label><input type="number" required min="0" step="0.01" value={couponForm.discountValue} onChange={(e) => setCouponForm(prev => ({ ...prev, discountValue: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Min Bill (₹)</label><input type="number" min="0" value={couponForm.minBillAmount} onChange={(e) => setCouponForm(prev => ({ ...prev, minBillAmount: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Usage Limit</label><input type="number" min="0" value={couponForm.usageLimit} onChange={(e) => setCouponForm(prev => ({ ...prev, usageLimit: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Per Customer Limit</label><input type="number" min="0" value={couponForm.customerUsageLimit} onChange={(e) => setCouponForm(prev => ({ ...prev, customerUsageLimit: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Start Date</label><input type="date" value={couponForm.startsAt} onChange={(e) => setCouponForm(prev => ({ ...prev, startsAt: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>End Date</label><input type="date" value={couponForm.endsAt} onChange={(e) => setCouponForm(prev => ({ ...prev, endsAt: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 4 }}><h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Partner Credits</h4></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Credit Type</label><select value={couponForm.partnerCreditType} onChange={(e) => setCouponForm(prev => ({ ...prev, partnerCreditType: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}><option value="FIXED">Fixed (₹)</option><option value="PERCENT">Percentage (%)</option></select></div>
                <div><label style={{ fontSize: 12, color: "#475569" }}>Credit Value</label><input type="number" min="0" step="0.01" value={couponForm.partnerCreditValue} onChange={(e) => setCouponForm(prev => ({ ...prev, partnerCreditValue: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, color: "#475569" }}>Partner</label><select value={couponForm.partnerCustomerId} onChange={(e) => setCouponForm(prev => ({ ...prev, partnerCustomerId: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}><option value="">Select partner (optional)</option>{customers.map((c) => (<option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>))}</select></div>
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 4 }}><h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Eligibility (empty = all items)</h4></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>Categories</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{categories.map((cat) => (<label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: couponForm.categoryIds.includes(cat.id) ? "1px solid #6366f1" : "1px solid #e2e8f0", background: couponForm.categoryIds.includes(cat.id) ? "#eef2ff" : "#f8fafc", fontSize: 12, cursor: "pointer" }}><input type="checkbox" checked={couponForm.categoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} style={{ accentColor: "#6366f1" }} />{cat.name}</label>))}</div></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>Services</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>{services.map((svc) => (<label key={svc.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: couponForm.serviceIds.includes(svc.id) ? "1px solid #6366f1" : "1px solid #e2e8f0", background: couponForm.serviceIds.includes(svc.id) ? "#eef2ff" : "#f8fafc", fontSize: 12, cursor: "pointer" }}><input type="checkbox" checked={couponForm.serviceIds.includes(svc.id)} onChange={() => toggleService(svc.id)} style={{ accentColor: "#6366f1" }} />{svc.name}</label>))}</div></div>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, color: "#475569" }}>Notes</label><input value={couponForm.notes} onChange={(e) => setCouponForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Internal notes" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>{editingCoupon ? "Update" : "Create"} Coupon</button>
                <button type="button" onClick={() => { setShowCouponForm(false); setEditingCoupon(null); }} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {!loading && activeTab === "partners" && (
        <div className="panel-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Affiliate Partners</h3>
            <button onClick={() => { setOnboardForm({ name: "", phone: "", discountValue: 10, partnerCreditValue: 5, title: "" }); setShowOnboardModal(true); }} className="btn btn-primary" style={{ fontSize: 13 }}>+ Onboard Partner</button>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>Partners are automatically created when you onboard them. Each partner gets a unique coupon code and wallet.</p>
          {customers.filter(c => c.source === "AFFILIATE_PARTNER" || c.tags?.includes("AFFILIATE_PARTNER")).length === 0 ? (
            <EmptyState title="No partners yet" description="Onboard your first affiliate partner to start the referral program." />
          ) : (
            <div className="list-stack">
              {customers.filter(c => c.source === "AFFILIATE_PARTNER" || c.tags?.includes("AFFILIATE_PARTNER")).map((p) => {
                const wallet = wallets.find(w => w.partnerId === p.id);
                return (
                  <div key={p.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => { setActiveTab("wallets"); if (wallet) loadWalletDetail(wallet.partnerId); }}>
                    <div style={{ flex: 1 }}>
                      <strong>{p.name}</strong>
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{p.phone || ""}</span>
                      {wallet && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Balance: {Number(wallet.balance)} cr | Earned: {Number(wallet.totalEarned)} cr</div>}
                    </div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>View Wallet →</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "wallets" && !selectedWallet && (
        <>
          <div className="panel-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setWalletSubTab("wallets")} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, background: walletSubTab === "wallets" ? "#6366f1" : "transparent", color: walletSubTab === "wallets" ? "#fff" : "#94a3b8", border: walletSubTab === "wallets" ? "none" : "1px solid #e2e8f0" }}>Wallets ({wallets.length})</button>
              <button onClick={() => setWalletSubTab("payouts")} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, background: walletSubTab === "payouts" ? "#6366f1" : "transparent", color: walletSubTab === "payouts" ? "#fff" : "#94a3b8", border: walletSubTab === "payouts" ? "none" : "1px solid #e2e8f0" }}>Payouts ({payouts.length})</button>
              {walletSubTab === "wallets" && <input type="text" placeholder="Search partner..." value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, width: 200 }} />}
              {walletSubTab === "payouts" && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  {["", "PENDING", "APPROVED", "REJECTED", "PAID"].map((s) => (
                    <button key={s || "all"} onClick={() => setPayoutStatusFilter(s)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: payoutStatusFilter === s ? "#6366f1" : "transparent", color: payoutStatusFilter === s ? "#fff" : "#94a3b8", border: payoutStatusFilter === s ? "none" : "1px solid #e2e8f0", cursor: "pointer" }}>{s || "All"}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {walletSubTab === "wallets" && (
            <div className="panel-card">
              {wallets.length === 0 ? (
                <EmptyState title="No wallets" description="Wallets are created automatically when partners earn credits." />
              ) : (
                <div className="list-stack">
                  {wallets.map((w) => (
                    <div key={w.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => loadWalletDetail(w.partnerId)}>
                      <div style={{ flex: 1 }}>
                        <strong>{w.partner?.name}</strong>
                        <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{w.partner?.phone || ""}</span>
                        <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13 }}>
                          <span style={{ color: "#22c55e" }}>Balance: {Number(w.balance)} cr</span>
                          <span style={{ color: "#64748b" }}>Earned: {Number(w.totalEarned)} cr</span>
                          <span style={{ color: "#64748b" }}>Redeemed: {Number(w.totalRedeemed)} cr</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Details →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {walletSubTab === "payouts" && (
            <div className="panel-card">
              {payouts.length === 0 ? (
                <EmptyState title="No payout requests" description="Partners can request cash withdrawal from their wallet." />
              ) : (
                <div className="list-stack">
                  {payouts.map((p) => (
                    <div key={p.id} className="list-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <strong>{p.partner?.name}</strong>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: `${statusColors[p.status]}20`, color: statusColors[p.status] }}>{p.status}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                          Credits: {Number(p.creditsRedeemed ?? 0)} → Cash: ₹{Number(p.cashAmount ?? 0).toFixed(2)}
                          <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                        {p.rejectionReason && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>Reason: {p.rejectionReason}</div>}
                      </div>
                      {p.status === "PENDING" && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => handlePayoutAction(p.id, "APPROVED")} className="btn btn-ghost" style={{ fontSize: 12, color: "#22c55e" }}>Approve</button>
                          <button onClick={() => { const r = prompt("Rejection reason:"); if (r !== null) handlePayoutAction(p.id, "REJECTED", r); }} className="btn btn-ghost" style={{ fontSize: 12, color: "#ef4444" }}>Reject</button>
                        </div>
                      )}
                      {p.status === "APPROVED" && <button onClick={() => handlePayoutAction(p.id, "PAID")} className="btn btn-ghost" style={{ fontSize: 12, color: "#6366f1" }}>Mark Paid</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && selectedWallet && (
        <div className="panel-card">
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => { setSelectedWallet(null); setWalletDetail(null); }} className="btn btn-ghost" style={{ fontSize: 13 }}>← Back</button>
            <button onClick={() => handleRedeemService(selectedWallet)} className="btn btn-primary" style={{ fontSize: 13 }}>Redeem for Services</button>
            <button onClick={() => handleRequestPayout(selectedWallet)} className="btn btn-ghost" style={{ fontSize: 13, border: "1px solid #eab308", color: "#eab308" }}>Request Cash Payout</button>
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
                <div className="list-stack">
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
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, width: 420, maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Onboard Affiliate Partner</h3>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Name *</label><input value={onboardForm.name} onChange={(e) => setOnboardForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. John Doe" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Phone *</label><input value={onboardForm.phone} onChange={(e) => setOnboardForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="e.g. 9876543210" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Coupon Title</label><input value={onboardForm.title} onChange={(e) => setOnboardForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Auto from name if blank" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Customer Discount %</label><input type="number" value={onboardForm.discountValue} onChange={(e) => setOnboardForm(prev => ({ ...prev, discountValue: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
              <div><label style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 4 }}>Partner Credit %</label><input type="number" value={onboardForm.partnerCreditValue} onChange={(e) => setOnboardForm(prev => ({ ...prev, partnerCreditValue: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowOnboardModal(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={submitOnboard} disabled={onboardLoading} className="btn btn-primary" style={{ fontSize: 13 }}>{onboardLoading ? "Onboarding..." : "Onboard"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
