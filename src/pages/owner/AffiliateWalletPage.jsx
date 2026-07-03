import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useBranch } from "../../context/BranchContext";
import ModuleTabs from "../../components/ModuleTabs";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

export default function AffiliateWalletPage() {
  const { selectedBranchId } = useBranch();
  const [wallets, setWallets] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetail, setWalletDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("wallets");
  const [ratios, setRatios] = useState({ service: 1, cash: 0.5 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, payoutRes, settingsRes] = await Promise.all([
        api.get("/owner/referrals/wallets", { params: { branchId: selectedBranchId || undefined, search: search || undefined } }),
        api.get("/owner/referrals/payouts", { params: { branchId: selectedBranchId || undefined, status: payoutStatusFilter || undefined } }),
        api.get("/owner/settings"),
      ]);
      setWallets(walletRes.data || []);
      setPayouts(payoutRes.data?.requests || []);
      const referralSettings = settingsRes.data?.advancedSettings?.referralSettings || {};
      setRatios({
        service: Number(referralSettings.affiliateServiceCreditValue || 1) || 1,
        cash: Number(referralSettings.affiliateCashCreditValue || 0.5) || 0.5
      });
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load affiliate data"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, search, payoutStatusFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!status.error && !status.success) return;
    const t = setTimeout(() => setStatus({ error: "", success: "" }), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const loadWalletDetail = async (partnerId) => {
    setDetailLoading(true);
    setWalletDetail(null);
    try {
      const res = await api.get(`/owner/referrals/wallets/${partnerId}`, {
        params: { branchId: selectedBranchId || undefined },
      });
      setWalletDetail(res.data);
      setSelectedWallet(partnerId);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not load wallet details"), success: "" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePayoutAction = async (payoutId, newStatus, reason) => {
    try {
      await api.patch(`/owner/referrals/payouts/${payoutId}`, { status: newStatus, rejectionReason: reason || null });
      setStatus({ error: "", success: `Payout ${newStatus.toLowerCase()}.` });
      await load();
      if (selectedWallet) await loadWalletDetail(selectedWallet);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not update payout"), success: "" });
    }
  };

  const handleRedeemService = async (partnerId) => {
    const amount = prompt("Enter credits to redeem for services (1 credit = ₹1):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try {
      await api.post(`/owner/referrals/wallets/${partnerId}/redeem-service`, { amount: Number(amount), note: "Manual service redemption" });
      setStatus({ error: "", success: `${amount} credits redeemed for services.` });
      await load();
      if (selectedWallet) await loadWalletDetail(partnerId);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not redeem credits"), success: "" });
    }
  };

  const handleRequestPayout = async (partnerId) => {
    const amount = prompt("Enter credits to request as cash payout (1 credit = ₹0.50):");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    try {
      await api.post(`/owner/referrals/wallets/${partnerId}/payout`, { creditsRedeemed: Number(amount) });
      setStatus({ error: "", success: `Cash payout requested for ${amount} credits.` });
      await load();
      if (selectedWallet) await loadWalletDetail(partnerId);
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not request payout"), success: "" });
    }
  };

  const tabs = [
    { label: "Referral Coupons", to: "/admin/referral-coupons" },
    { label: "Affiliate Wallets", to: "/admin/affiliate-wallets" },
  ];

  const statusColors = { PENDING: "#eab308", APPROVED: "#22c55e", REJECTED: "#ef4444", PAID: "#6366f1" };

  return (
    <div className="page-shell">
      <ModuleTabs title="Referral & Affiliate" description="Manage partner wallets and payout requests" items={tabs} />

      {status.error && (
        <div className="panel-card">
          <p className="error-text">{status.error}</p>
        </div>
      )}
      {status.success && (
        <div className="panel-card">
          <p className="success-text">{status.success}</p>
        </div>
      )}

      {loading && <PageLoader title="Loading affiliate data..." message="Please wait" />}

      {!loading && !selectedWallet && (
        <>
          <div className="panel-card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <button
                className="btn"
                onClick={() => setActiveTab("wallets")}
                style={{
                  fontSize: 13, padding: "6px 14px", borderRadius: 6,
                  background: activeTab === "wallets" ? "#6366f1" : "transparent",
                  color: activeTab === "wallets" ? "#fff" : "#94a3b8",
                  border: activeTab === "wallets" ? "none" : "1px solid #334155",
                }}
              >
                Wallets ({wallets.length})
              </button>
              <button
                className="btn"
                onClick={() => setActiveTab("payouts")}
                style={{
                  fontSize: 13, padding: "6px 14px", borderRadius: 6,
                  background: activeTab === "payouts" ? "#6366f1" : "transparent",
                  color: activeTab === "payouts" ? "#fff" : "#94a3b8",
                  border: activeTab === "payouts" ? "none" : "1px solid #334155",
                }}
              >
                Payout Requests ({payouts.length})
              </button>
            </div>

            {activeTab === "wallets" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search partner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0", fontSize: 13, width: 220 }}
                />
              </div>
            )}
            {activeTab === "payouts" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {["", "PENDING", "APPROVED", "REJECTED", "PAID"].map((s) => (
                  <button
                    key={s || "all"}
                    className="btn"
                    onClick={() => setPayoutStatusFilter(s)}
                    style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 6,
                      background: payoutStatusFilter === s ? "#6366f1" : "transparent",
                      color: payoutStatusFilter === s ? "#fff" : "#94a3b8",
                      border: payoutStatusFilter === s ? "none" : "1px solid #334155",
                    }}
                  >
                    {s || "All"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === "wallets" && (
            <div className="panel-card">
              {wallets.length === 0 ? (
                <EmptyState title="No affiliate wallets" description="Wallets are created automatically when a partner earns referral credits." />
              ) : (
                <div className="list-stack">
                  {wallets.map((w) => (
                    <div key={w.id} className="list-item" style={{ cursor: "pointer" }} onClick={() => loadWalletDetail(w.partnerId)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <strong style={{ color: "#e2e8f0" }}>
                            {w.partner?.name}
                          </strong>
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            {w.partner?.phone || w.partner?.email || ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13 }}>
                          <span style={{ color: "#22c55e" }}>Balance: {Number(w.balance)} cr</span>
                          <span style={{ color: "#94a3b8" }}>Earned: {Number(w.totalEarned)} cr</span>
                          <span style={{ color: "#94a3b8" }}>Redeemed: {Number(w.totalRedeemed)} cr</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b" }}>View Details →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "payouts" && (
            <div className="panel-card">
              {payouts.length === 0 ? (
                <EmptyState title="No payout requests" description="Partners can request cash withdrawal from their wallet." />
              ) : (
                <div className="list-stack">
                  {payouts.map((p) => (
                    <div key={p.id} className="list-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <strong style={{ color: "#e2e8f0" }}>
                            {p.partner?.name}
                          </strong>
                          <span
                            style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 4,
                              background: `${statusColors[p.status]}20`,
                              color: statusColors[p.status],
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                          Credits: {Number(p.creditsRedeemed)} → Cash: ₹{Number(p.cashAmount).toFixed(2)}
                          <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b" }}>
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {p.rejectionReason && (
                          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>
                            Reason: {p.rejectionReason}
                          </div>
                        )}
                      </div>
                      {p.status === "PENDING" && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handlePayoutAction(p.id, "APPROVED")}
                            style={{ fontSize: 12, color: "#22c55e" }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => {
                              const reason = prompt("Rejection reason:");
                              if (reason !== null) handlePayoutAction(p.id, "REJECTED", reason);
                            }}
                            style={{ fontSize: 12, color: "#ef4444" }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {p.status === "APPROVED" && (
                        <button
                          className="btn btn-ghost"
                          onClick={() => handlePayoutAction(p.id, "PAID")}
                          style={{ fontSize: 12, color: "#6366f1" }}
                        >
                          Mark Paid
                        </button>
                      )}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={() => { setSelectedWallet(null); setWalletDetail(null); }} style={{ fontSize: 13 }}>
              ← Back to wallets
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleRedeemService(selectedWallet)}
              style={{ fontSize: 13 }}
            >
              Redeem for Services
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => handleRequestPayout(selectedWallet)}
              style={{ fontSize: 13, border: "1px solid #eab308", color: "#eab308" }}
            >
              Request Cash Payout
            </button>
          </div>

          {detailLoading ? (
            <PageLoader title="Loading wallet details..." message="Please wait" />
          ) : walletDetail?.wallet ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Available Balance</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
                    {Number(walletDetail.wallet.balance || 0)} cr
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>₹{(Number(walletDetail.wallet.balance || 0) * ratios.service).toFixed(2)} for services</div>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Total Earned</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>
                    {Number(walletDetail.wallet.totalEarned || 0)} cr
                  </div>
                </div>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Total Redeemed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#eab308" }}>
                    {Number(walletDetail.wallet.totalRedeemed || 0)} cr
                  </div>
                </div>
              </div>

              <h4 style={{ margin: "0 0 8px 0", color: "#e2e8f0", fontSize: 14 }}>Transaction Ledger</h4>
              {(walletDetail.transactions || []).length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 13 }}>No transactions yet.</p>
              ) : (
                <div className="list-stack">
                  {(walletDetail.transactions || []).map((t) => (
                    <div key={t.id} className="list-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 4,
                              background: t.type === "EARN" ? "#22c55e20" : t.type === "REDEEM_SERVICE" ? "#6366f120" : t.type === "CASH_WITHDRAWAL" ? "#eab30820" : "#94a3b820",
                              color: t.type === "EARN" ? "#22c55e" : t.type === "REDEEM_SERVICE" ? "#6366f1" : t.type === "CASH_WITHDRAWAL" ? "#eab308" : "#94a3b8",
                            }}
                          >
                            {t.type}
                          </span>
                          <span style={{ fontSize: 13, color: t.amount > 0 ? "#22c55e" : "#ef4444" }}>
                            {t.amount > 0 ? "+" : ""}{Number(t.amount)} cr
                          </span>
                          {t.invoice && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              Inv: {t.invoice.invoiceNumber}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {t.note || "No note"}
                        </div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
