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
  product_sales: ["SR. NO.", "Date", "Time", "Guest Name", "Guest Number", "Staff", "Invoice No", "Product", "Category", "Qty", "Unit Price", "Discount", "Complimentary", "Redemption Amount", "Redemption Sources", "Tax", "Subtotal", "Total"],
  service_sales: ["SR. NO.", "Date", "Time", "Guest Name", "Guest Number", "Staff", "Invoice No", "Service", "Category", "Duration", "Qty", "Unit Price", "Discount", "Complimentary", "Redemption Amount", "Redemption Sources", "Tax", "Subtotal", "Total"],
  staff_performance: ["Staff", "Appointments", "Completed", "Revenue", "Commission", "Qty"],
  monthly_sale: ["Month", "Invoices", "Gross Sales", "Discounts", "Net Sales", "Paid", "Due"],
  day_wise: ["Date", "Invoices", "Cash", "Card", "UPI", "Online", "Total"],
  tip_report: ["Date", "Staff", "Customer", "Invoice #", "Tip Amount"],
  complimentary: ["Date", "Service", "Staff", "Customer", "Reason", "Value"],
  cancelled_invoices: ["Invoice", "Customer", "Branch", "Status", "Total", "Paid", "Refunded"],
  pnl_report: ["Month", "Revenue", "COGS", "Gross Profit", "Expenses", "Net Profit", "Margin Percentage"],
  customers: ["SR. NO.", "GUEST NAME", "GUEST NUMBER", "COUNT", "TAXES", "GIFT CARD", "COUPON", "REFERRAL", "LOYALTY", "BALANCE PENDING", "ADVANCE UTILIZED", "PACKAGE REDEMPTION", "BALANCE CLEARED", "MEMBERSHIP REDEMPTION", "ONLINE", "OFFLINE", "TOTAL"],
  service_reminder: ["Customer", "Phone", "Last Service", "Service", "Due Date", "Status"],
  feedback: ["Date", "Customer", "Staff", "Service", "Rating", "Comment"],
  guest_followups: ["Customer", "Phone", "Last Visit", "Days Since", "Follow-up Status"],
  appointments: ["Date", "Customer", "Service", "Staff", "Branch", "Status", "Amount"],
  staff_attendance: ["Staff", "Date", "Check-In", "Check-Out", "Hours", "Status"],
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
  gst_returns: ["Month", "Total Sales", "Tax Collected", "Tax Paid", "Net Tax Payable"],
  gst_outwards: ["Invoice #", "Date", "Customer", "Taxable Amt", "Tax Rate", "Tax Amt", "Total"],
  daily_stock: ["Product", "Category", "Opening Stock", "Received", "Consumed", "Sold", "Closing"],
  stock_transaction: ["Date", "Product", "Type", "Qty", "Staff", "Note"],
  material_received: ["Date", "Product", "Vendor", "Qty", "Unit Cost", "Total Cost", "PO #"],
  minimum_stock: ["Product", "Category", "Current Stock", "Min Stock", "Deficit", "Status"],
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
    "Customer": ["name", "customerName"],
    "Total Visits": ["totalVisits"],
    "Last Visit": ["lastVisitDate"],
    "Loyalty Pts": ["rewardPoints"],
    "Total Spend": ["totalSpend"],
    "Invoice #": ["invoiceNumber", "invoice"],
    "Date": ["date", "createdAt"],
    "Sales": ["sales", "revenue"]
  };

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
    <div className="crm-table-container">
      <style>{`
        .crm-table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow-x: auto;
        }
        .crm-table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
        }
        .crm-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 8px;
          text-align: left;
          border-bottom: 2px solid #e2e8f0;
        }
        .crm-table td {
          padding: 8px;
          font-size: 0.75rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .crm-table tr:hover {
          background: #f8fafc;
        }
      `}</style>
      <table className="crm-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {cols.map((_, ci) => (
                  <td key={ci}>
                    <div style={{ height: 12, background: "#f1f5f9", borderRadius: 4, width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows?.length ? rows.map((row, ri) => (
            <tr key={ri}>
              {cols.map((col, ci) => {
                let val = col === "SR. NO." ? (ri + 1) : getCellValue(row, col);
                return (
                  <td key={ci}>
                    {val ?? "—"}
                  </td>
                );
              })}
            </tr>
          )) : <EmptyRows cols={cols.length} />}
        </tbody>
      </table>
    </div>
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
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden", background: "#334155" }}>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; }
            #report-filters { display: none !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>
      {/* LEFT SIDEBAR */}
      <div className="no-print" style={{ width: 240, minWidth: 240, background: "#475569", borderRight: "1px solid #e2e8f0", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #334155" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.9rem" }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              style={{ width: "100%", padding: "8px 10px 8px 30px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", color: "#334155", background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, padding: "8px 0" }}>
          {filteredReports.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => { setActiveReport(report.key); setSearch(""); }}
              style={{
                width: "100%", display: "block", padding: "12px 14px 12px 20px", background: activeReport === report.key ? "white" : "none",
                border: "none", borderLeft: activeReport === report.key ? "4px solid #1e293b" : "4px solid transparent",
                cursor: "pointer", fontSize: "0.85rem", color: activeReport === report.key ? "#0f172a" : "#cbd5e1",
                fontWeight: activeReport === report.key ? 700 : 500, textAlign: "left", transition: "all 0.15s"
              }}>
              {report.label}
            </button>
          ))}
        </div>
      </div>


      {/* MAIN CONTENT */}
      <div id="printable-report" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>{currentReport?.label || "Report"}</h2>
          </div>
          <div id="report-filters" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>FROM</span>
              <input type="date" value={filters.start} onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", color: "#334155" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>TO</span>
              <input type="date" value={filters.end} onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
                style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: "0.85rem", color: "#334155" }} />
            </div>
            {(filters.start || filters.end) && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, start: "", end: "" }))}
                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: "0.82rem", cursor: "pointer", fontWeight: 600 }}>✕ Clear</button>
            )}
            <button type="button" onClick={handleExportCSV}
              style={{ background: "#0f172a", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
              ⬇ Export CSV
            </button>
            <button type="button" onClick={() => window.print()}
              style={{ background: "#1d4ed8", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
              🖨 Print
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ padding: "16px 24px 0", display: "flex", gap: 12 }}>
          {[
            { label: "Total Records", value: loading ? "..." : rows.length },
            { label: "Date Range", value: filters.start && filters.end ? `${filters.start} → ${filters.end}` : "All Time" },
            { label: "Status", value: loading ? "Loading..." : "Loaded", color: loading ? "#f59e0b" : "#10b981" },
          ].map((s) => (
            <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "12px 18px", border: "1px solid #e2e8f0", minWidth: 140 }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: s.color || "#0f172a" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ margin: 24, background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <ReportTable reportKey={activeReport} rows={rows} loading={loading} />
        </div>
      </div>
    </div>
  );
}
