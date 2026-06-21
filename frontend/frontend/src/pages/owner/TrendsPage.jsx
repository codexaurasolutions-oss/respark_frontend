import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart
} from "recharts";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { IndianRupee, Scissors, Package, Droplet, TrendingUp, FileText, Users, Star, BarChart2, Trophy, Loader2 } from "lucide-react";

/* ── constants ─────────────────────────────────── */
const TIME_RANGES = ["1D", "7D", "14D", "1M", "2M", "YTD", "1Y"];
const LINE_PERIODS = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
];
const PALETTE = {
  total: "#6366f1", service: "#3b82f6", product: "#10b981",
  package: "#f59e0b", membership: "#ec4899", giftCard: "#8b5cf6",
};
const FILTERS = [
  { key: "overall", label: "Overall", icon: TrendingUp },
  { key: "service", label: "Service",  icon: Scissors },
  { key: "product", label: "Product",  icon: Droplet },
  { key: "stylist", label: "Stylist",  icon: Users },
];

/* ── helpers ───────────────────────────────────── */

/* ── CustomTooltip ─────────────────────────────── */
const CustomTooltip = ({ active, payload, label, moneyFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: "12px 16px", minWidth: 190 }}>
      <p style={{ color: "#94a3b8", marginBottom: 8, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 5 }}>
          <span style={{ color: p.color, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block" }} />
            {p.name}
          </span>
          <strong style={{ color: "white", fontSize: 12, fontFamily: "monospace" }}>{moneyFormatter(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── StatCard ───────────────────────────────────── */
function StatCard({ label, value, color, icon: Icon, sub, trend, moneyFormatter }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "20px 24px",
      border: "1px solid #e2e8f0", boxShadow: "none",
      display: "flex", alignItems: "flex-start", gap: 16, position: "relative", overflow: "hidden"
    }}>
      {/* colored accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: color, borderRadius: "4px 0 0 4px" }} />
      <div style={{ background: color + "18", borderRadius: 12, padding: 12, flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>{moneyFormatter(value)}</div>
        {sub != null && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── ProgressBar ────────────────────────────────── */
function ProgressBar({ label, value, max, color, moneyFormatter }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{pct}%</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>{moneyFormatter(value)}</span>
        </div>
      </div>
      <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

/* ── RankRow ─────────────────────────────────────── */
function RankRow({ rank, name, revenue, moneyFormatter }) {
  const colors = ["#f59e0b", "#94a3b8", "#cd7c2f"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: rank <= 3 ? colors[rank - 1] + "22" : "#f1f5f9",
        color: rank <= 3 ? colors[rank - 1] : "#94a3b8",
        fontWeight: 800, fontSize: 12,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {rank <= 3 ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={13} color={colors[rank - 1]} />
          </span>
        ) : rank}
      </div>
      <span style={{ flex: 1, fontSize: 13, color: "#334155", fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>{moneyFormatter(revenue)}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export default function TrendsPage() {
  const { formatMoney, currencyMeta } = useSalonSettings();
  const [timeRange,     setTimeRange]     = useState("7D");
  const [linePeriod,    setLinePeriod]    = useState("week");
  const [activeFilter,  setActiveFilter]  = useState("overall");
  const [loading,       setLoading]       = useState(true);
  const [data,          setData]          = useState(null);
  const fmtShortCurrency = (v) => {
    const amount = Number(v || 0);
    const symbol = currencyMeta?.symbol || "";
    if (amount >= 1e6) return `${symbol}${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `${symbol}${(amount / 1e3).toFixed(0)}K`;
    return `${symbol}${amount}`;
  };

  useEffect(() => {
    setLoading(true);
    api.get("/owner/reports/trends", { params: { range: timeRange, period: linePeriod, filter: activeFilter } })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [timeRange, linePeriod, activeFilter]);

  /* derived */
  const revenueBar = data?.revenueSplit || [
    { name: "Total",      value: 0, fill: PALETTE.total },
    { name: "Service",    value: 0, fill: PALETTE.service },
    { name: "Product",    value: 0, fill: PALETTE.product },
    { name: "Package",    value: 0, fill: PALETTE.package },
    { name: "Membership", value: 0, fill: PALETTE.membership },
    { name: "Gift Card",  value: 0, fill: PALETTE.giftCard },
  ];

  const trendLine = useMemo(() => {
    if (data?.trendLine?.length) return data.trendLine;
    const days = linePeriod === "week" ? 7 : linePeriod === "month" ? 30 : 14;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      return { date: d.toISOString().slice(0, 10), total: 0, service: 0, product: 0 };
    });
  }, [data, linePeriod]);

  const totalRevenue  = revenueBar.find((r) => r.name === "Total")?.value    || 0;
  const serviceRev    = revenueBar.find((r) => r.name === "Service")?.value  || 0;
  const productRev    = revenueBar.find((r) => r.name === "Product")?.value  || 0;
  const packageRev    = revenueBar.find((r) => r.name === "Package")?.value  || 0;
  const summary       = data?.summary || {};
  const topServices   = data?.topServices || [];
  const topStaff      = data?.topStaff    || [];

  return (
    <div className="page-shell" style={{ paddingBottom: 48 }}>
      <style>{`
        .trend-pill-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; border-radius: 40px; border: 1.5px solid #e2e8f0;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.18s; background: white; color: #64748b;
        }
        .trend-pill-btn.active {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-color: #6366f1; color: white;
          box-shadow: none;
        }
        .trend-pill-btn:hover:not(.active) { background: #f8fafc; border-color: #cbd5e1; }
        .range-chip {
          padding: 5px 12px; border-radius: 8px; border: none; font-size: 12px;
          font-weight: 600; cursor: pointer; transition: all 0.15s; background: #f1f5f9; color: #64748b;
        }
        .range-chip.active { background: #6366f1; color: white; box-shadow: none; }
        .chart-card {
          background: white; border-radius: 20px; padding: 24px;
          border: 1px solid #e2e8f0; box-shadow: none;
        }
        .chart-card-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
        .chart-card-sub { font-size: 12px; color: #94a3b8; margin: 0 0 20px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 6px", letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart2 size={24} color="#6366f1" />
            Trends & Analytics
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
            Revenue performance, service trends, and business insights at a glance.
          </p>
        </div>
        {/* time range pills */}
        <div style={{ display: "flex", gap: 6, background: "white", padding: "6px 10px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "none" }}>
          {TIME_RANGES.map((r) => (
            <button key={r} className={`range-chip ${timeRange === r ? "active" : ""}`} onClick={() => setTimeRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`trend-pill-btn ${activeFilter === key ? "active" : ""}`} onClick={() => setActiveFilter(key)}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Revenue"  value={totalRevenue} color="#6366f1" icon={IndianRupee} sub={`${summary.totalInvoices || 0} invoices`} moneyFormatter={formatMoney} />
        <StatCard label="Services"       value={serviceRev}   color="#3b82f6" icon={Scissors}    sub={`${totalRevenue ? Math.round(serviceRev / totalRevenue * 100) : 0}% of total`} moneyFormatter={formatMoney} />
        <StatCard label="Products"       value={productRev}   color="#10b981" icon={Droplet}     sub={`${totalRevenue ? Math.round(productRev / totalRevenue * 100) : 0}% of total`} moneyFormatter={formatMoney} />
        <StatCard label="Avg Bill Value" value={summary.avgBillValue || 0} color="#f59e0b" icon={Star} sub="per invoice" moneyFormatter={formatMoney} />
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, marginBottom: 20 }}>
        {/* Revenue Split Bar */}
        <div className="chart-card">
          <p className="chart-card-title">Revenue Split</p>
          <p className="chart-card-sub">Breakdown by category</p>
          {loading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}><Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} /></div>Loading...
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueBar} margin={{ top: 4, right: 8, left: -12, bottom: 44 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={fmtShortCurrency} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip moneyFormatter={formatMoney} />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
                <Bar dataKey="value" name="Revenue" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {revenueBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Area Trend */}
        <div className="chart-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <p className="chart-card-title" style={{ margin: 0 }}>Revenue Trend</p>
              <p className="chart-card-sub" style={{ margin: "2px 0 0" }}>Over-time performance</p>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {LINE_PERIODS.map((p) => (
                <button key={p.key} className={`range-chip ${linePeriod === p.key ? "active" : ""}`} onClick={() => setLinePeriod(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} /> Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendLine} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradService" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={fmtShortCurrency} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip moneyFormatter={formatMoney} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="total"   stroke={PALETTE.total}   strokeWidth={2.5} fill="url(#gradTotal)"   dot={false} name="Total" />
                <Area type="monotone" dataKey="service" stroke={PALETTE.service} strokeWidth={2}   fill="url(#gradService)" dot={false} name="Service" />
                <Line type="monotone" dataKey="product"    stroke={PALETTE.product}    strokeWidth={1.5} dot={false} name="Product" />
                <Line type="monotone" dataKey="package"    stroke={PALETTE.package}    strokeWidth={1.5} dot={false} name="Package" />
                <Line type="monotone" dataKey="membership" stroke={PALETTE.membership} strokeWidth={1.5} dot={false} name="Membership" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Revenue Breakdown progress bars */}
        <div className="chart-card">
          <p className="chart-card-title">Revenue Breakdown</p>
          <p className="chart-card-sub">Category share of total</p>
          {[
            { label: "Services",    value: serviceRev,  color: PALETTE.service },
            { label: "Products",    value: productRev,  color: PALETTE.product },
            { label: "Packages",    value: packageRev,  color: PALETTE.package },
            { label: "Memberships", value: revenueBar.find((r) => r.name === "Membership")?.value || 0, color: PALETTE.membership },
            { label: "Gift Cards",  value: revenueBar.find((r) => r.name === "Gift Card")?.value  || 0, color: PALETTE.giftCard },
          ].map((item) => (
            <ProgressBar key={item.label} {...item} max={totalRevenue} moneyFormatter={formatMoney} />
          ))}
        </div>

        {/* Top Services */}
        <div className="chart-card">
          <p className="chart-card-title" style={{ display: "flex", alignItems: "center", gap: 7 }}><Trophy size={15} color="#f59e0b" /> Top Services</p>
          <p className="chart-card-sub">By revenue earned</p>
          {topServices.length === 0 ? (
            <div style={{ textAlign: "center", color: "#cbd5e1", paddingTop: 32 }}>
              <Scissors size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No service data yet</div>
            </div>
          ) : topServices.map((s, i) => (
            <RankRow key={s.name} rank={i + 1} name={s.name} revenue={s.revenue} moneyFormatter={formatMoney} />
          ))}
        </div>

        {/* Top Staff */}
        <div className="chart-card">
          <p className="chart-card-title" style={{ display: "flex", alignItems: "center", gap: 7 }}><Star size={15} color="#f59e0b" /> Top Stylists</p>
          <p className="chart-card-sub">By revenue generated</p>
          {topStaff.length === 0 ? (
            <div style={{ textAlign: "center", color: "#cbd5e1", paddingTop: 32 }}>
              <Users size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No staff revenue data yet</div>
            </div>
          ) : topStaff.map((s, i) => (
            <RankRow key={s.name} rank={i + 1} name={s.name} revenue={s.revenue} moneyFormatter={formatMoney} />
          ))}
        </div>
      </div>
    </div>
  );
}
