import { useEffect, useState } from "react";
import { api } from "../../api/client";

const ALL_REPORTS = [
  { key: "sales_summary", label: "Sales Summary" },
  { key: "product_sales", label: "Product Revenue" },
  { key: "service_sales", label: "Service Revenue" },
  { key: "service_reminder", label: "Service Reminder" },
  { key: "customers", label: "Guest Collection" },
  { key: "feedback", label: "Feedback" },
  { key: "staff_performance", label: "Stylist Revenue" },
  { key: "incentive_report", label: "Incentive Report" },
  { key: "monthly_sale", label: "Monthly Sale" },
  { key: "staff_attendance", label: "Staff Attendance" },
  { key: "memberships", label: "Membership Sold" },
  { key: "membership_redemption", label: "Membership Redemption" },
  { key: "inter_store_membership", label: "Inter-Store Membership Report" },
  { key: "packages", label: "Packages Sold" },
  { key: "package_redemption", label: "Package Redemption" },
  { key: "gift_card_sold", label: "Gift Card Sold Report" },
  { key: "gift_card_redemption", label: "Gift Card Redemption" },
  { key: "advance_received", label: "Advance Received" },
  { key: "balance_received", label: "Balance Received" },
  { key: "coupon_redemption", label: "Coupon Redemption" },
  { key: "day_wise", label: "Day Wise Report" },
  { key: "tip_report", label: "Tip Report" },
  { key: "complimentary", label: "Complimentary Report" },
  { key: "cancelled_invoices", label: "Cancelled Orders" },
  { key: "appointments", label: "Appointment Report" },
  { key: "gst_returns", label: "GST Returns Report" },
  { key: "guest_followups", label: "Guest Followups" },
  { key: "daily_stock", label: "Daily Stock" },
  { key: "stock_transaction", label: "Stock Transaction" },
  { key: "material_received", label: "Material Received" },
  { key: "minimum_stock", label: "Minimum Stock" },
  { key: "reconcile_stock", label: "Reconcile Stock" },
  { key: "consumable_tracking", label: "Consumable Tracking" },
  { key: "total_consumed", label: "Total Consumed" },
  { key: "purchase_order", label: "Purchase Order Report" },
  { key: "gst_outwards", label: "GST Outwards Report" },
  { key: "inventory_transaction", label: "Inventory Transaction Report" },
  { key: "pnl_report", label: "PnL Report" },
];

const COLUMNS = {
  sales_summary: ["SR. NO.", "DATE", "TIME", "INVOICE NO", "GUEST NAME", "GUEST NUMBER", "ITEMS", "GROSS AMOUNT", "DISCOUNT", "TAX", "NET TOTAL", "PAID AMOUNT", "DUE AMOUNT", "PAYMENT MODE"],
  product_sales: ["Product", "Category", "Qty", "Sales"],
  service_sales: ["SR. NO.", "Date", "Time", "Guest Name", "Guest Number", "Staff", "Invoice No", "Service", "Category", "Duration", "Qty", "Unit Price", "Discount", "Complimentary", "Redemption Amount", "Redemption Sources", "Tax", "Subtotal", "Total"],
  staff_performance: ["Staff", "Appointments", "Completed", "Revenue", "Commission", "Qty"],
  monthly_sale: ["SR. NO.", "DATE", "INVOICE", "GUEST NAME", "GUEST NUMBER", "STAFF", "SUBTOTAL", "DISCOUNT", "INCLUSIVE TAX", "EXCLUSIVE TAX", "TOTAL", "PAYMENT MODE", "REDEMPTION AMOUNT", "BALANCE CLEARED", "ACTUAL TOTAL"],
  day_wise: ["Date", "Invoices", "Cash", "Card", "UPI", "Online", "Total"],
  tip_report: ["SR. NO.", "DATE", "GUEST NAME", "GUEST NUMBER", "INVOICE NO", "STAFF", "TIP AMOUNT", "PAYMENT MODE"],
  complimentary: ["Date", "Service", "Staff", "Customer", "Reason", "Value"],
  cancelled_invoices: ["Invoice", "Customer", "Branch", "Status", "Total", "Paid", "Refunded"],
  pnl_report: ["Month", "Revenue", "COGS", "Gross Profit", "Expenses", "Net Profit", "Margin Percentage"],
  customers: ["SR. NO.", "GUEST NAME", "GUEST NUMBER", "COUNT", "TAXES", "GIFT CARD", "COUPON", "REFERRAL", "LOYALTY", "BALANCE PENDING", "ADVANCE UTILIZED", "PACKAGE REDEMPTION", "BALANCE CLEARED", "MEMBERSHIP REDEMPTION", "ONLINE", "OFFLINE", "TOTAL"],
  service_reminder: ["Customer", "Phone", "Last Service", "Service", "Due Date", "Status"],
  feedback: ["Date", "Customer", "Staff", "Service", "Rating", "Comment"],
  guest_followups: ["Customer", "Phone", "Last Visit", "Days Since", "Follow-up Status"],
  appointments: ["Date", "Customer", "Service", "Staff", "Branch", "Status", "Amount"],
  staff_attendance: ["SR. NO.", "STAFF", "DESIGNATION", "STAFF NUMBER", "TOTAL WORKING HOURS", "TOTAL BREAK TIME"],
  incentive_report: ["Staff", "Month", "Revenue Generated", "Commission %", "Commission Amt", "Bonus", "Total"],
  memberships: ["Date", "Customer", "Membership Plan", "Price", "Validity", "Branch"],
  membership_redemption: ["Date", "Customer", "Membership", "Service Redeemed", "Sessions Used", "Remaining"],
  inter_store_membership: ["Date", "Customer", "Home Branch", "Redeemed Branch", "Service", "Value Transfer"],
  packages: ["Date", "Customer", "Package", "Price Paid", "Validity", "Services Included"],
  package_redemption: ["Date", "Customer", "Package", "Service Redeemed", "Sessions Used", "Remaining"],
  gift_card_sold: ["Date", "Code", "Customer", "Value", "Expiry", "Branch"],
  gift_card_redemption: ["Date", "Code", "Customer", "Amount Used", "Invoice #", "Remaining Balance"],
  coupon_redemption: ["Date", "Code", "Customer", "Invoice #", "Discount Applied"],
  advance_received: ["Date", "Customer", "Invoice #", "Advance Amount", "Mode", "Staff"],
  balance_received: ["Date", "Customer", "Invoice #", "Balance Amt", "Mode", "Collected By"],
  gst_returns: ["SR. NO.", "INVOICE DATE", "INVOICE NO", "GUEST NAME", "GUEST GSTN", "HSN/SAC", "AMOUNT", "QTY", "DISCOUNT", "TAXABLE AMOUNT", "INVOICE AMOUNT"],
  gst_outwards: ["Invoice #", "Date", "Customer", "Taxable Amt", "Tax Rate", "Tax Amt", "Total"],
  daily_stock: ["SR. NO.", "ITEM NAME", "VARIATION NAME", "CATEGORY NAME", "SKU", "OPENING STOCK", "CURRENT STOCK", "CURRENT ONFLOOR", "UNIT PRICE", "TOTAL STOCK PRICE", "TOTAL ONFLOOR PRICE", "TOTAL PRICE", "STOCK TYPE"],
  stock_transaction: ["Date", "Product", "Type", "Qty", "Staff", "Note"],
  material_received: ["Date", "Product", "Vendor", "Qty", "Unit Cost", "Total Cost", "PO #"],
  minimum_stock: ["SR. NO.", "CATEGORY NAME", "ITEM NAME", "VARIATION NAME", "STORE SKU", "CURRENT STOCK", "MINIMUM QUANTITY"],
  reconcile_stock: ["Product", "System Stock", "Physical Count", "Variance", "Date", "Staff"],
  consumable_tracking: ["Product", "Service", "Qty Used Per Service", "Total Used", "Cost"],
  total_consumed: ["Product", "Category", "Total Quantity Consumed", "Value"],
  purchase_order: ["PO #", "Date", "Vendor", "Products", "Amount", "Status", "Received On"],
  inventory_transaction: ["Date", "Product", "Type", "Qty", "Reference", "Branch", "Staff"],
};

const getCellValue = (row, col) => {
  const aliases = {
    "Product": ["name", "productName"],
    "Service": ["name", "serviceName"],
    "Staff": ["staffName", "name"],
    "Completed": ["completedAppointments"],
    "Qty": ["qty", "quantity"],
    "Customer": ["customerName"],
    "Total Visits": ["totalVisits"],
    "Last Visit": ["lastVisitDate"],
    "Loyalty Pts": ["rewardPoints"],
    "Total Spend": ["totalSpend"],
    "Invoice #": ["invoiceNumber", "invoice"],
    "Date": ["date", "createdAt"],
    "Sales": ["sales", "revenue"]
  };

  if (col === "Customer") {
    if (row.customer?.name) return row.customer.name;
    if (row.guestName) return row.guestName;
  }
  if (col === "Guest Name") {
    if (row.customer?.name) return row.customer.name;
    if (row.guestName) return row.guestName;
  }
  if (col === "Guest Number") {
    if (row.customer?.phone) return row.customer.phone;
    if (row.guestNumber) return row.guestNumber;
  }
  if (col === "Branch") {
    if (row.branch?.name) return row.branch.name;
    if (row.branchName) return row.branchName;
  }

  if (aliases[col]) {
    for (const key of aliases[col]) {
      if (row[key] !== undefined && row[key] !== null) {
        if (col === "Last Visit" || (col === "Date" && typeof row[key] === "string" && row[key].includes("T"))) {
          return new Date(row[key]).toLocaleDateString();
        }
        return row[key];
      }
    }
  }

  const defaultKey = col.toLowerCase().replace(/ /g, "_");
  const defaultKey2 = col.toLowerCase();
  
  let val = row[col] ?? row[defaultKey] ?? row[defaultKey2];
  if (col === "Invoice #") val = row.invoiceNumber || row.invoice;
  if (col === "Invoice") val = row.invoiceNumber || row.invoice || val;
  if (col === "Total") val = row.total ?? row.amount ?? val;
  if (col === "Paid") val = row.paidAmount ?? val;
  if (col === "Refunded") val = row.refundAmount ?? val;
  if (col === "Status") val = row.status ?? val;
  
  if (val !== null && val !== undefined && typeof val === "object") {
    return val.name || val.label || JSON.stringify(val);
  }
  
  return val;
};

function EmptyRows({ cols }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: "center", padding: "48px 0", color: "#cbd5e1", fontSize: "0.95rem" }}>
        No records found for the selected filters.
      </td>
    </tr>
  );
}

function ReportTable({ reportKey, rows, loading }) {
  const cols = COLUMNS[reportKey] || ["Data"];
  return (
    <table className="rpt-table">
      <thead>
        <tr>
          {cols.map((col) => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="rpt-loading">
              {cols.map((_, ci) => <td key={ci}>&nbsp;</td>)}
            </tr>
          ))
        ) : rows?.length ? rows.map((row, ri) => (
          <tr key={ri}>
            {cols.map((col, ci) => {
              const val = col === "SR. NO." ? (ri + 1) : getCellValue(row, col);
              return <td key={ci}>{val ?? "—"}</td>;
            })}
          </tr>
        )) : (
          <tr><td colSpan={cols.length} className="rpt-empty">No records found for the selected filters.</td></tr>
        )}
      </tbody>
    </table>
  );
}

export default function ReportsHubPage() {
  const [activeReport, setActiveReport] = useState("sales_summary");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ start: "", end: "", branchId: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const currentReport = ALL_REPORTS.find((r) => r.key === activeReport);

  useEffect(() => {
    setLoading(true);
    setRows([]);
    const params = {};
    if (filters.start) params.start = filters.start;
    if (filters.end) params.end = filters.end;
    if (filters.branchId) params.branchId = filters.branchId;

    let endpoint = `/reports/${activeReport.replace(/_/g, "-")}`;
    if (activeReport === "sales_summary") endpoint = "/reports/sales-summary-list";

    api.get(endpoint, { params })
      .then((res) => setRows(Array.isArray(res.data) ? res.data : res.data?.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [activeReport, filters.start, filters.end, filters.branchId]);

  const filteredReports = ALL_REPORTS.filter((r) => !search || r.label.toLowerCase().includes(search.toLowerCase()));

  const handleExportCSV = () => {
    if (!rows.length) return alert("No data to export");
    const cols = COLUMNS[activeReport] || ["Data"];
    
    let csv = cols.join(",") + "\n";
    rows.forEach(row => {
      const csvRow = cols.map(col => {
        let val = getCellValue(row, col) ?? "—";
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csv += csvRow.join(",") + "\n";
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentReport?.label || "Report"}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 108px)", overflow: "hidden", background: "#f8fafc" }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
            #report-filters, .no-print { display: none !important; }
          }
          .rpt-sidebar { width: 170px; min-width: 170px; background: #fff; border-right: 1px solid #e2e8f0; overflow-y: auto; display: flex; flex-direction: column; }
          .rpt-search-box { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .rpt-search-input { width: 100%; padding: 6px 10px 6px 28px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.75rem; outline: none; background: #f8fafc; box-sizing: border-box; min-height: unset; }
          .rpt-search-input:focus { border-color: #3b82f6; background: #fff; }
          .rpt-search-wrap { position: relative; }
          .rpt-search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
          .rpt-nav-item { width: 100%; text-align: left; padding: 9px 12px; border: none; background: none; font-size: 0.78rem; color: #475569; cursor: pointer; border-left: 3px solid transparent; min-height: unset; box-shadow: none; font-weight: 500; transition: background 140ms, color 140ms; }
          .rpt-nav-item:hover { background: #f8fafc; color: #0f172a; transform: none; filter: none; }
          .rpt-nav-item.active { background: #f0f9ff; color: #0284c7; border-left-color: #0284c7; font-weight: 700; }
          .rpt-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: #f8fafc; }
          .rpt-topbar { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 8px 14px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
          .rpt-title { font-size: 0.82rem; font-weight: 700; color: #0f172a; margin: 0; white-space: nowrap; min-width: 90px; }
          .rpt-filter-label { font-size: 0.68rem; color: #94a3b8; font-weight: 600; white-space: nowrap; }
          .rpt-date-input { border: 1px solid #e2e8f0; border-radius: 5px; padding: 4px 7px; font-size: 0.72rem; color: #334155; min-height: unset; width: 120px; }
          .rpt-btn { border: none; border-radius: 5px; padding: 5px 10px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; min-height: unset; box-shadow: none; white-space: nowrap; }
          .rpt-btn:hover { opacity: 0.85; transform: none; filter: none; }
          .rpt-btn-dark { background: #1e293b; color: #fff; }
          .rpt-btn-blue { background: #2563eb; color: #fff; }
          .rpt-btn-clear { background: #fee2e2; color: #dc2626; }
          .rpt-stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; }
          .rpt-stat-label { font-size: 0.58rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1px; }
          .rpt-stat-val { font-size: 0.78rem; font-weight: 700; color: #0f172a; white-space: nowrap; }
          .rpt-table-wrap { flex: 1; margin: 10px 12px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: auto; }
          .rpt-table { width: 100%; border-collapse: collapse; white-space: nowrap; }
          .rpt-table th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; z-index: 2; font-size: 0.68rem; }
          .rpt-table td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; font-size: 0.78rem; }
          .rpt-table tr:hover td { background: #f8fafc; }
          .rpt-table tfoot td { background: #f8fafc; font-weight: 700; color: #0f172a; padding: 7px 12px; border-top: 2px solid #e2e8f0; }
          .rpt-empty { text-align: center; padding: 48px; color: #94a3b8; font-size: 0.82rem; }
          .rpt-loading td { animation: rpt-shimmer 1.2s infinite; background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%); background-size: 200% 100%; height: 28px; }
          @keyframes rpt-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}
      </style>

      {/* LEFT SIDEBAR */}
      <div className="rpt-sidebar no-print">
        <div className="rpt-search-box">
          <div className="rpt-search-wrap">
            <svg className="rpt-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="rpt-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
            />
          </div>
        </div>
        <div style={{ flex: 1, paddingTop: 4 }}>
          {filteredReports.map((report) => (
            <button
              key={report.key}
              type="button"
              className={`rpt-nav-item ${activeReport === report.key ? "active" : ""}`}
              onClick={() => { setActiveReport(report.key); setSearch(""); }}
            >
              {report.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div id="printable-report" className="rpt-main">

        {/* Top bar — stats + filters all in ONE row */}
        <div className="rpt-topbar">
          <h2 className="rpt-title">{currentReport?.label || "Report"}</h2>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Records</div>
            <div className="rpt-stat-val">{loading ? "..." : rows.length}</div>
          </div>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Range</div>
            <div className="rpt-stat-val">{filters.start && filters.end ? `${filters.start} → ${filters.end}` : "All Time"}</div>
          </div>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Status</div>
            <div className="rpt-stat-val" style={{ color: loading ? "#f59e0b" : "#10b981" }}>{loading ? "Loading..." : "Loaded"}</div>
          </div>
          <div id="report-filters" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
            <span className="rpt-filter-label">FROM</span>
            <input type="date" className="rpt-date-input" value={filters.start} onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))} />
            <span className="rpt-filter-label">TO</span>
            <input type="date" className="rpt-date-input" value={filters.end} onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))} />
            {(filters.start || filters.end) && (
              <button type="button" className="rpt-btn rpt-btn-clear" onClick={() => setFilters((f) => ({ ...f, start: "", end: "" }))}>✕</button>
            )}
            <button type="button" className="rpt-btn rpt-btn-dark" onClick={handleExportCSV}>⬇ Export CSV</button>
            <button type="button" className="rpt-btn rpt-btn-blue" onClick={() => window.print()}>🖨 Print</button>
          </div>
        </div>

        {/* Table */}
        <div className="rpt-table-wrap">
          <ReportTable reportKey={activeReport} rows={rows} loading={loading} />
        </div>
      </div>
    </div>
  );
}
