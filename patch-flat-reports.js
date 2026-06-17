import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

const targetReportsList = `const ALL_REPORTS = [
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
];`;

// We will replace the REPORT_GROUPS entirely
const groupsRegex = /const REPORT_GROUPS = \[\s*\{[\s\S]*?\];\s*const ALL_REPORTS = REPORT_GROUPS\.flatMap\(\(g\) => g\.reports\);/m;

if (content.match(groupsRegex)) {
  content = content.replace(groupsRegex, targetReportsList);
}

// Then we must fix the rendering logic in the sidebar
// It currently uses filteredGroups and maps groups
const sidebarLogicRegex = /const filteredGroups = REPORT_GROUPS\.map\(\(g\) => \(\{[\s\S]*?\}\)\)\.filter\(\(g\) => g\.reports\.length\);\s*const toggleGroup = [^\n]+\n/m;

if (content.match(sidebarLogicRegex)) {
  content = content.replace(sidebarLogicRegex, `const filteredReports = ALL_REPORTS.filter((r) => !search || r.label.toLowerCase().includes(search.toLowerCase()));\n`);
}

// We must also remove expandedGroups state
content = content.replace(/const \[expandedGroups, setExpandedGroups\] = useState\(\(\) => Object\.fromEntries\(REPORT_GROUPS\.map\(\(g\) => \[g\.label, true\]\)\)\);\n/m, '');

const sidebarRenderRegex = /\{filteredGroups\.map\(\(group\) => \([\s\S]*?\}\)\)\}\n\s*<\/div>\n\s*\}\)\)\}/m;

const newSidebarRender = `{filteredReports.map((report) => (
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
          ))}`;

// Actually let's just do a string replace on the sidebar content block
const sidebarHtmlRegex = /<div style={{ flex: 1, padding: "8px 0" }}>[\s\S]*?<\/div>\n\s*<\/div>\n\s*\{?\/\* RIGHT PANEL/m;
if (content.match(sidebarHtmlRegex)) {
  content = content.replace(sidebarHtmlRegex, `<div style={{ flex: 1, padding: "8px 0", background: "#475569" }}>
          ${newSidebarRender}
        </div>
      </div>
      {/* RIGHT PANEL`);
}

// Let's also style the sidebar slightly to match the dark aesthetic in the screenshot
// The screenshot shows a dark grey sidebar with white text for active, light grey for inactive.
content = content.replace('width: 240, minWidth: 240, background: "white"', 'width: 240, minWidth: 240, background: "#475569"');
content = content.replace('color: "#94a3b8"', 'color: "#cbd5e1"'); // search icon
content = content.replace('background: "#f8fafc"', 'background: "#334155"'); // search input bg
content = content.replace('color: "#334155"', 'color: "#f8fafc"'); // search input text
content = content.replace('borderBottom: "1px solid #e2e8f0"', 'borderBottom: "1px solid #334155"');

fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Patched ReportsHubPage sidebar to flat list!");
