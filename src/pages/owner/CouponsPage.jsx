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
  originalAmount: 1000
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
      await api.post("/owner/coupons", {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
        minBillAmount: Number(couponForm.minBillAmount)
      });
      setCouponForm(emptyCoupon);
      setStatus({ error: "", success: "Coupon saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save coupon"), success: "" });
    }
  };

  const saveGiftCard = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/gift-cards", {
        ...giftCardForm,
        originalAmount: Number(giftCardForm.originalAmount)
      });
      setGiftCardForm(emptyGiftCard);
      setStatus({ error: "", success: "Gift card saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save gift card"), success: "" });
    }
  };

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
          <h3>Create Coupon</h3>
          <form className="form-grid" onSubmit={saveCoupon}>
            <label>
              <span className="muted">Code</span>
              <input placeholder="Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
            </label>
            <label>
              <span className="muted">Title</span>
              <input placeholder="Title" value={couponForm.title} onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })} />
            </label>
            <label>
              <span className="muted">Percent</span>
              <select value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}>
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </select>
            </label>
            <label>
              <span className="muted">Discount value</span>
              <input type="number" placeholder="Discount value" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })} />
            </label>
            <label>
              <span className="muted">Minimum bill amount</span>
              <input type="number" placeholder="Minimum bill amount" value={couponForm.minBillAmount} onChange={(e) => setCouponForm({ ...couponForm, minBillAmount: e.target.value })} />
            </label>
            <button>Save Coupon</button>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {coupons.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.code} - {row.title}</strong>
                <div className="item-meta">{row.discountType} | {row.discountValue} | Used {row.usageCount}</div>
              </div>
            ))}
            {!coupons.length && <EmptyState title="No coupons yet" message="Create a coupon to support discounts, campaigns, and front-desk offers." />}
          </div>
        </div>
      )}

      {!loading && mode === "giftCards" && (
        <div className="panel-card">
          <h3>Create Gift Card</h3>
          <form className="form-grid" onSubmit={saveGiftCard}>
            <label>
              <span className="muted">Code</span>
              <input placeholder="Code" value={giftCardForm.code} onChange={(e) => setGiftCardForm({ ...giftCardForm, code: e.target.value })} />
            </label>
            <label>
              <span className="muted">Title</span>
              <input placeholder="Title" value={giftCardForm.title} onChange={(e) => setGiftCardForm({ ...giftCardForm, title: e.target.value })} />
            </label>
            <label>
              <span className="muted">Amount</span>
              <input type="number" placeholder="Amount" value={giftCardForm.originalAmount} onChange={(e) => setGiftCardForm({ ...giftCardForm, originalAmount: e.target.value })} />
            </label>
            <button>Create Gift Card</button>
          </form>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {giftCards.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.code}</strong>
                <div className="item-meta">Original {row.originalAmount} | Balance {row.balanceAmount}</div>
              </div>
            ))}
            {!giftCards.length && <EmptyState title="No gift cards yet" message="Gift cards will appear here once you issue the first voucher for salon credit." />}
          </div>
        </div>
      )}

      {!loading && mode === "reports" && reports && (
        <div className="panel-card">
          <h3>Promotion Reports</h3>
          <div className="badge-row" style={{ marginBottom: 16 }}>
            <span className="badge">Coupon Savings {reports.totalSavings || 0}</span>
          </div>
          <div className="list-stack">
            {(reports.redemptions || []).map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.coupon?.code || "-"}</strong>
                <div className="item-meta">Saved {row.amountSaved}</div>
              </div>
            ))}
            {!reports.redemptions?.length && <EmptyState title="No promotion redemptions yet" message="Savings and gift card usage will appear here once customers begin using promotions." />}
          </div>
        </div>
      )}
    </div>
  );
}
