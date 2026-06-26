import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import { downloadFromApi } from "../../utils/download";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const reportSections = [
  { key: "overview", label: "Overview", to: "/admin/reports", hint: "KPIs" },
  { key: "operations", label: "Operations", to: "/admin/reports/appointments", hint: "Service Ops" },
  { key: "sales", label: "Sales", to: "/admin/reports/staff-performance", hint: "Revenue" },
  { key: "loyalty", label: "Loyalty", to: "/admin/reports/loyalty", hint: "Retention" },
  { key: "inventory", label: "Inventory", to: "/admin/reports/stock", hint: "Risk" },
  { key: "finance", label: "Finance", to: "/admin/reports/profit-loss", hint: "P&L" },
  { key: "engagement", label: "Engagement", to: "/admin/reports/campaigns", hint: "Growth" },
  { key: "workforce", label: "Payroll", to: "/admin/reports/payroll", hint: "Team Costs" }
];

const initialData = {
  branches: [],
  sales: null,
  payments: null,
  appointments: [],
  staff: [],
  products: [],
  services: [],
  memberships: [],
  packages: [],
  stock: [],
  customers: [],
  branchSales: [],
  cancelled: [],
  lowStock: [],
  advanced: null,
  profitLoss: null,
  campaignRoi: [],
  payroll: [],
  tax: null,
  loyalty: null,
  coupons: null,
  giftCards: null,
  feedback: null,
  enquiries: null,
  expenses: null
};

const cardCurrency = (value) => Number(value || 0).toFixed(2);

const MetricCard = ({ label, value, tone = "default", caption }) => (
  <div className={`stat-card metric-${tone}`}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {caption ? <div className="item-meta">{caption}</div> : null}
  </div>
);

const ReportList = ({ title, rows, emptyText, renderMeta }) => (
  <div className="panel-card report-panel">
    <h3>{title}</h3>
    <div className="list-stack">
      {rows?.length ? rows.map((row, index) => (
        <div key={row.id || row.code || row.invoiceNumber || row.name || index} className="list-item">
          <strong>{row.name || row.title || row.invoiceNumber || row.customer?.name || row.branch || row.code || row.staffName || "Record"}</strong>
          {renderMeta ? <div className="item-meta">{renderMeta(row)}</div> : null}
        </div>
      )) : <EmptyState title={title} message={emptyText} />}
    </div>
  </div>
);

const QUICK_RANGES = [
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d",        label: "Last 7 Days" },
  { key: "30d",       label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

function computeRange(key) {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  switch (key) {
    case "today":
      return { start: fmt(now), end: fmt(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "7d": {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(now) };
    }
    case "30d": {
      const s = new Date(now); s.setDate(s.getDate() - 29);
      return { start: fmt(s), end: fmt(now) };
    }
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(s), end: fmt(now) };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(s), end: fmt(e) };
    }
    default:
      return { start: "", end: "" };
  }
}

export default function ReportsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ branchId: "", start: "", end: "" });
  const [quickRange, setQuickRange] = useState("");
  const [state, setState] = useState({ loading: true, error: "", data: initialData });

  const reportView = useMemo(() => {
    const path = location.pathname;
    if (path.includes("/reports/appointments") || path.includes("/reports/customers") || path.includes("/reports/branch-sales")) return "operations";
    if (path.includes("/reports/staff-performance") || path.includes("/reports/product-sales") || path.includes("/reports/service-sales") || path.includes("/reports/payments") || path.includes("/reports/cancelled-invoices")) return "sales";
    if (path.includes("/reports/loyalty") || path.includes("/reports/memberships") || path.includes("/reports/packages") || path.includes("/reports/coupons") || path.includes("/reports/gift-cards")) return "loyalty";
    if (path.includes("/reports/stock") || path.includes("/reports/low-stock")) return "inventory";
    if (path.includes("/reports/profit-loss") || path.includes("/reports/expenses") || path.includes("/reports/tax")) return "finance";
    if (path.includes("/reports/campaigns") || path.includes("/reports/feedback") || path.includes("/reports/enquiries")) return "engagement";
    if (path.includes("/reports/payroll")) return "workforce";
    return "overview";
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const sharedParams = {
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.start ? { start: filters.start } : {}),
        ...(filters.end ? { end: filters.end } : {})
      };

      const requests = {
        branches: api.get("/owner/branches"),
        sales: api.get("/reports/sales-summary", { params: sharedParams }),
        payments: api.get("/reports/payment-modes", { params: sharedParams }),
        appointments: api.get("/reports/appointments", { params: sharedParams }),
        staff: api.get("/reports/staff-performance", { params: sharedParams }),
        products: api.get("/reports/product-sales", { params: sharedParams }),
        services: api.get("/reports/service-sales", { params: sharedParams }),
        memberships: api.get("/reports/memberships", { params: sharedParams }),
        packages: api.get("/reports/packages", { params: sharedParams }),
        stock: api.get("/reports/stock", { params: sharedParams }),
        customers: api.get("/reports/customers", { params: sharedParams }),
        branchSales: api.get("/reports/branch-sales", { params: sharedParams }),
        cancelled: api.get("/reports/cancelled-invoices", { params: sharedParams }),
        lowStock: api.get("/reports/low-stock", { params: sharedParams }),
        advanced: api.get("/owner/reports/advanced", { params: sharedParams }),
        profitLoss: api.get("/owner/reports/profit-loss", { params: sharedParams }),
        campaignRoi: api.get("/owner/reports/campaign-roi", { params: sharedParams }),
        payroll: api.get("/owner/reports/payroll", { params: sharedParams }),
        tax: api.get("/owner/reports/tax", { params: sharedParams }),
        loyalty: api.get("/owner/loyalty/reports", { params: sharedParams }),
        coupons: api.get("/owner/coupons/reports", { params: sharedParams }),
        giftCards: api.get("/owner/gift-cards/reports", { params: sharedParams }),
        feedback: api.get("/owner/feedback/reports", { params: sharedParams }),
        enquiries: api.get("/owner/enquiries/reports", { params: sharedParams }),
        expenses: api.get("/owner/expenses/reports", { params: sharedParams })
      };

      const entries = Object.entries(requests);
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      if (!active) return;

      const nextData = { ...initialData };
      const softErrors = [];
      entries.forEach(([key], index) => {
        const result = results[index];
        if (result.status === "fulfilled") {
          nextData[key] = result.value.data;
        } else if (!["advanced", "profitLoss", "campaignRoi", "payroll", "tax", "loyalty", "coupons", "giftCards", "feedback", "enquiries", "expenses"].includes(key)) {
          softErrors.push(key);
        }
      });

      setState({
        loading: false,
        error: softErrors.length ? `Some report widgets could not load: ${softErrors.join(", ")}` : "",
        data: nextData
      });
    };

    load().catch((error) => {
      if (!active) return;
      setState({ loading: false, error: formatApiError(error, "Could not load reports"), data: initialData });
    });

    return () => {
      active = false;
    };
  }, [filters.branchId, filters.end, filters.start]);

  const jumpToReport = (nextView) => {
    const section = reportSections.find((item) => item.key === nextView);
    navigate(section?.to || "/admin/reports");
  };

  const exportCurrent = async () => {
    const query = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.start ? { start: filters.start } : {}),
      ...(filters.end ? { end: filters.end } : {})
    };

    const advancedModuleMap = {
      finance: location.pathname.includes("/reports/expenses")
        ? "expenses"
        : location.pathname.includes("/reports/tax")
          ? "tax"
          : "profit-loss",
      workforce: "payroll",
      engagement: location.pathname.includes("/reports/feedback")
        ? "feedback"
        : location.pathname.includes("/reports/enquiries")
          ? "enquiries"
          : "campaigns",
      loyalty: location.pathname.includes("/reports/coupons")
        ? "coupons"
        : location.pathname.includes("/reports/gift-cards")
          ? "gift-cards"
          : "loyalty"
    };

    try {
      if (["finance", "workforce", "engagement", "loyalty"].includes(reportView)) {
        await downloadFromApi("/owner/reports/export", {
          params: { ...query, module: advancedModuleMap[reportView] || "profit-loss" },
          fallbackFilename: `${reportView}-report.csv`
        });
        return;
      }

      await downloadFromApi("/reports/export.csv", {
        params: query,
        fallbackFilename: "reports-export.csv"
      });
    } catch (error) {
      setState((current) => ({ ...current, error: formatApiError(error, "Could not export CSV report") }));
    }
  };

  const exportExcel = async () => {
    try {
      await downloadFromApi("/reports/export.xls", {
        params: {
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.start ? { start: filters.start } : {}),
          ...(filters.end ? { end: filters.end } : {})
        },
        fallbackFilename: "reports-export.xls"
      });
    } catch (error) {
      setState((current) => ({ ...current, error: formatApiError(error, "Could not export Excel report") }));
    }
  };

  const { data, loading, error } = state;
  const advancedCards = data.advanced?.summaryCards || {};

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Business Reports"
        description="Operational, financial, loyalty, engagement, payroll, and stock intelligence from one owner dashboard."
        items={reportSections}
        actions={(
          <>
            <label>
              <span className="muted">Select Option</span>
              <select value={reportView} onChange={(event) => jumpToReport(event.target.value)}>
              {reportSections.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            </label>
            <label>
              <span className="muted">Branches</span>
              <select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}>
              <option value="">All branches</option>
              {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            </label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {QUICK_RANGES.map((qr) => (
                <button
                  key={qr.key}
                  type="button"
                  className="quick-range-chip"
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                    background: quickRange === qr.key ? "#6366f1" : "#f1f5f9",
                    color: quickRange === qr.key ? "white" : "#64748b",
                  }}
                  onClick={() => {
                    const range = computeRange(qr.key);
                    setQuickRange(qr.key);
                    setFilters((current) => ({ ...current, start: range.start, end: range.end }));
                  }}
                >{qr.label}</button>
              ))}
            </div>
            <input type="date" value={filters.start} onChange={(event) => { setQuickRange(""); setFilters((current) => ({ ...current, start: event.target.value })); }} max={filters.end || undefined} />
            <input type="date" value={filters.end} onChange={(event) => { setQuickRange(""); setFilters((current) => ({ ...current, end: event.target.value })); }} min={filters.start || undefined} />
            <button type="button" className="secondary-button" onClick={() => { setQuickRange(""); setFilters((current) => ({ ...current, start: "", end: "" })); }}>Clear Dates</button>
            <button type="button" className="secondary-button" onClick={exportCurrent}>Export CSV</button>
            <button type="button" className="secondary-button" onClick={exportExcel}>Export Excel</button>
          </>
        )}
      />

      {loading ? (
        <PageLoader
          title="Loading report intelligence"
          message="Blending operational, finance, loyalty, and engagement widgets for this reporting window."
        />
      ) : null}
      {error ? <div className="panel-card"><p className="error-text">{error}</p></div> : null}

      {!loading && (
        <>
          <div className="stats-grid" style={{ marginBottom: 18 }}>
            <MetricCard label="Invoices" value={data.sales?.count || 0} caption="Completed and partial billing count" />
            <MetricCard label="Gross Sales" value={cardCurrency(data.sales?.totalSales)} tone="success" caption="All billed revenue in current filter" />
            <MetricCard label="Collected" value={cardCurrency(data.sales?.totalPaid)} caption="Captured payments" />
            <MetricCard label="Outstanding" value={cardCurrency(data.sales?.totalDue)} tone="warning" caption="Pending balance still open" />
            <MetricCard label="Expenses" value={cardCurrency(advancedCards.expenses)} caption="Approved and tracked spend" />
            <MetricCard label="Payroll" value={cardCurrency(advancedCards.payroll)} caption="Current payroll liability" />
            <MetricCard label="Avg Feedback" value={Number(advancedCards.averageFeedback || 0).toFixed(1)} caption="Customer sentiment snapshot" />
            <MetricCard label="Enquiries" value={advancedCards.enquiries || 0} caption="Leads in pipeline" />
          </div>

          {(reportView === "overview" || reportView === "operations") && (
            <div className="two-col">
              <ReportList
                title="Appointment Flow"
                rows={data.appointments.slice(0, 8)}
                emptyText="No appointments in this filter yet."
                renderMeta={(item) => `${item.branch?.name || "Branch"} | ${new Date(item.startAt).toLocaleString()} | ${item.status}`}
              />
              <ReportList
                title="Customer Value"
                rows={data.customers.slice(0, 8)}
                emptyText="No customers found for the selected scope."
                renderMeta={(item) => `Spend ${cardCurrency(item.totalSpend)} | Avg ${cardCurrency(item.averageSpend)} | Visits ${item.totalVisits || 0}`}
              />
            </div>
          )}

          {(reportView === "overview" || reportView === "sales") && (
            <div className="three-col" style={{ marginTop: 18 }}>
              <ReportList
                title="Staff Performance"
                rows={data.staff.slice(0, 6)}
                emptyText="No staff performance rows yet."
                renderMeta={(item) => `Revenue ${cardCurrency(item.revenue)} | Commission ${cardCurrency(item.commission)}`}
              />
              <ReportList
                title="Product Sales"
                rows={data.products.slice(0, 6)}
                emptyText="No product sales captured yet."
                renderMeta={(item) => `Qty ${item.qty || 0} | Sales ${cardCurrency(item.sales)}`}
              />
              <ReportList
                title="Service Sales"
                rows={data.services.slice(0, 6)}
                emptyText="No service sales captured yet."
                renderMeta={(item) => `Qty ${item.qty || 0} | Sales ${cardCurrency(item.sales)}`}
              />
            </div>
          )}

          {(reportView === "overview" || reportView === "loyalty") && (
            <div className="three-col" style={{ marginTop: 18 }}>
              <div className="panel-card report-panel">
                <h3>Loyalty Summary</h3>
                <div className="badge-row">
                  <span className="badge">Earned {data.loyalty?.summary?.earned || 0}</span>
                  <span className="badge">Redeemed {data.loyalty?.summary?.redeemed || 0}</span>
                  <span className="badge">Coupon Savings {cardCurrency(data.coupons?.totalSavings)}</span>
                  <span className="badge">Gift Card Use {cardCurrency(data.giftCards?.totalRedeemed)}</span>
                </div>
                <div className="list-stack" style={{ marginTop: 14 }}>
                  {(data.loyalty?.topCustomers || []).slice(0, 5).map((customer) => (
                    <div key={customer.id} className="list-item">
                      <strong>{customer.name}</strong>
                      <div className="item-meta">Points {customer.loyaltyPoints || 0} | Spend {cardCurrency(customer.totalSpend)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <ReportList
                title="Coupon Redemptions"
                rows={(data.coupons?.redemptions || []).slice(0, 6)}
                emptyText="No coupon redemptions recorded."
                renderMeta={(item) => `${item.coupon?.code || "Coupon"} | Saved ${cardCurrency(item.amountSaved)} | ${item.customer?.name || "Guest"}`}
              />
              <ReportList
                title="Gift Card Activity"
                rows={(data.giftCards?.redemptions || []).slice(0, 6)}
                emptyText="No gift card activity recorded."
                renderMeta={(item) => `${item.giftCard?.code || "Gift card"} | Used ${cardCurrency(item.amountUsed)} | ${item.customer?.name || "Guest"}`}
              />
            </div>
          )}

          {(reportView === "overview" || reportView === "inventory") && (
            <div className="two-col" style={{ marginTop: 18 }}>
              <ReportList
                title="Stock Movements"
                rows={data.stock.slice(0, 8)}
                emptyText="No stock movement history yet."
                renderMeta={(item) => `${item.product?.name || "Product"} | ${item.movementType} | ${cardCurrency(item.quantity)}`}
              />
              <ReportList
                title="Low Stock Watchlist"
                rows={(data.lowStock || []).slice(0, 8)}
                emptyText="Inventory health looks good."
                renderMeta={(item) => `${item.branch?.name || "Shared"} | Current ${cardCurrency(item.currentStock)} | Min ${cardCurrency(item.minStock)}`}
              />
            </div>
          )}

          {reportView === "finance" && (
            <div className="two-col" style={{ marginTop: 18 }}>
              <div className="panel-card report-panel">
                <h3>Profit & Loss</h3>
                <div className="stats-grid compact-stats">
                  <MetricCard label="Revenue" value={cardCurrency(data.profitLoss?.revenue)} tone="success" />
                  <MetricCard label="Expenses" value={cardCurrency(data.profitLoss?.expenses)} tone="warning" />
                  <MetricCard label="Profit" value={cardCurrency(data.profitLoss?.profit)} />
                  <MetricCard label="Tax Collected" value={cardCurrency(data.tax?.taxCollected)} />
                </div>
                <div className="list-stack" style={{ marginTop: 14 }}>
                  {(data.profitLoss?.expenseRows || []).slice(0, 5).map((row) => (
                    <div key={row.id} className="list-item">
                      <strong>{row.title}</strong>
                      <div className="item-meta">{row.status} | {cardCurrency(row.amount)} | {new Date(row.expenseDate).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <ReportList
                title="Tax Rows"
                rows={(data.tax?.rows || []).slice(0, 8)}
                emptyText="No tax rows available."
                renderMeta={(item) => `${item.invoiceNumber} | Total ${cardCurrency(item.total)} | Tax ${cardCurrency(item.tax)}`}
              />
            </div>
          )}

          {reportView === "engagement" && (
            <div className="three-col" style={{ marginTop: 18 }}>
              <div className="panel-card report-panel">
                <h3>Campaign ROI</h3>
                <div className="list-stack">
                  {(data.campaignRoi || []).slice(0, 6).map((campaign) => (
                    <div key={campaign.id} className="list-item">
                      <strong>{campaign.name}</strong>
                      <div className="item-meta">Revenue {cardCurrency(campaign.revenue)} | Conversions {campaign.conversions} | Sends {campaign.sends}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-card report-panel">
                <h3>Feedback Health</h3>
                <div className="badge-row">
                  <span className="badge">Total {data.feedback?.summary?.total || 0}</span>
                  <span className="badge">Average {Number(data.feedback?.summary?.averageRating || 0).toFixed(1)}</span>
                  <span className="badge">Negative {data.feedback?.summary?.negativeCount || 0}</span>
                </div>
                <div className="list-stack" style={{ marginTop: 14 }}>
                  {(data.feedback?.rows || []).slice(0, 5).map((row) => (
                    <div key={row.id} className="list-item">
                      <strong>{row.staffUserSalon?.user?.name || row.service?.name || "Feedback"}</strong>
                      <div className="item-meta">Rating {row.rating} | {row.branch?.name || "Branch"} | {row.status}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-card report-panel">
                <h3>Enquiry Funnel</h3>
                <div className="badge-row">
                  <span className="badge">Total {data.enquiries?.total || 0}</span>
                  <span className="badge">Converted {data.enquiries?.converted || 0}</span>
                </div>
                <div className="list-stack" style={{ marginTop: 14 }}>
                  {Object.entries(data.enquiries?.sourceBreakdown || {}).map(([key, value]) => (
                    <div key={key} className="list-item">
                      <strong>{key}</strong>
                      <div className="item-meta">{value} leads</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportView === "workforce" && (
            <div className="two-col" style={{ marginTop: 18 }}>
              <ReportList
                title="Payroll Runs"
                rows={data.payroll.slice(0, 8)}
                emptyText="No payroll runs created yet."
                renderMeta={(row) => `${new Date(row.periodStart).toLocaleDateString()} - ${new Date(row.periodEnd).toLocaleDateString()} | ${row.status} | Net ${cardCurrency(row.totalNet)}`}
              />
              <div className="panel-card report-panel">
                <h3>Advanced Cost Snapshot</h3>
                <div className="stats-grid compact-stats">
                  <MetricCard label="Payroll" value={cardCurrency(advancedCards.payroll)} />
                  <MetricCard label="Expenses" value={cardCurrency(advancedCards.expenses)} />
                  <MetricCard label="Coupon Savings" value={cardCurrency(advancedCards.couponSavings)} />
                  <MetricCard label="Gift Card Use" value={cardCurrency(advancedCards.giftCardUse)} />
                </div>
                <div className="item-meta" style={{ marginTop: 14 }}>
                  Use this panel to compare payroll load against salon spend, campaign incentives, and discount pressure in the same reporting window.
                </div>
              </div>
            </div>
          )}

          {(reportView === "overview" || reportView === "operations" || reportView === "sales") && (
            <div className="two-col" style={{ marginTop: 18 }}>
              <ReportList
                title="Branch Sales"
                rows={data.branchSales}
                emptyText="No branch sales rows available."
                renderMeta={(item) => `Sales ${cardCurrency(item.sales)} | Paid ${cardCurrency(item.paid)}`}
              />
              <ReportList
                title="Cancelled / Refunded"
                rows={data.cancelled.slice(0, 8)}
                emptyText="No cancelled or refunded invoices."
                renderMeta={(item) => `${item.customer?.name || "Customer"} | ${item.status} | Refund ${cardCurrency(item.refundAmount)}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
