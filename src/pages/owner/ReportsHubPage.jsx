import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, ComposedChart
} from "recharts";

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

const ALL_COLUMN_KEY = "ALL";

const REPORT_FILTERS = {
  sales_summary: [
    { key: "categoryId", label: "Category", type: "select", endpoint: "/owner/service-categories", optionLabel: "name" },
    { key: "serviceId", label: "Service", type: "select", endpoint: "/owner/services", optionLabel: "name" }
  ],
  product_sales: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" },
    { key: "productId", label: "Product", type: "select", endpoint: "/owner/inventory/products", optionLabel: "name" },
    { key: "group", label: "Group", type: "select", options: [{ value: "both", label: "Both" }, { value: "product", label: "Product Only" }, { value: "service", label: "Service Only" }], defaultValue: "both" },
    { key: "groupData", label: "Group Data", type: "select", options: [{ value: "none", label: "None" }, { value: "category", label: "Category" }, { value: "date", label: "Date" }], defaultValue: "none" },
    { key: "redemption", label: "Redemption", type: "select", options: [{ value: "all", label: "All" }, { value: "loyalty", label: "Loyalty" }, { value: "coupon", label: "Coupon" }, { value: "gift", label: "Gift Card" }], defaultValue: "all" }
  ],
  service_sales: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" },
    { key: "categoryId", label: "Category", type: "select", endpoint: "/owner/service-categories", optionLabel: "name", defaultLabel: "All" },
    { key: "serviceId", label: "Service", type: "select", endpoint: "/owner/services", optionLabel: "name" },
    { key: "group", label: "Group", type: "select", options: [{ value: "both", label: "Both" }, { value: "product", label: "Product Only" }, { value: "service", label: "Service Only" }], defaultValue: "both" },
    { key: "groupData", label: "Group Data", type: "select", options: [{ value: "none", label: "None" }, { value: "category", label: "Category" }, { value: "date", label: "Date" }], defaultValue: "none" },
    { key: "redemption", label: "Redemption", type: "select", options: [{ value: "all", label: "All" }, { value: "loyalty", label: "Loyalty" }, { value: "coupon", label: "Coupon" }, { value: "gift", label: "Gift Card" }], defaultValue: "all" }
  ],
  customers: [
    { key: "customerId", label: "Guest", type: "select", endpoint: "/owner/customers", optionLabel: "name", defaultLabel: "All" }
  ],
  staff_performance: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" }
  ],
  incentive_report: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" },
    { key: "type", label: "Type", type: "select", options: [{ value: "all", label: "All" }, { value: "service", label: "Service" }, { value: "product", label: "Product" }, { value: "package", label: "Package" }], defaultValue: "all" },
    { key: "categoryId", label: "Category", type: "select", endpoint: "/owner/service-categories", optionLabel: "name", defaultLabel: "All" },
    { key: "upgraded", label: "Upgraded", type: "select", options: [{ value: "all", label: "All" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }], defaultValue: "all" },
    { key: "status", label: "Status", type: "select", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "expired", label: "Expired" }], defaultValue: "all" },
    { key: "basedOn", label: "Based ON", type: "select", options: [{ value: "purchased", label: "Purchased" }, { value: "created", label: "Created" }], defaultValue: "purchased" }
  ],
  memberships: [
    { key: "type", label: "Type", type: "select", options: [{ value: "all", label: "All" }, { value: "membership", label: "Membership" }, { value: "package", label: "Package" }], defaultValue: "all" }
  ],
  packages: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" },
    { key: "packageId", label: "Packages", type: "select", endpoint: "/owner/packages", optionLabel: "name", defaultLabel: "All" }
  ],
  gift_card_sold: [],
  gift_card_redemption: [],
  advance_received: [],
  balance_received: [],
  coupon_redemption: [],
  day_wise: [],
  tip_report: [],
  complimentary: [],
  cancelled_invoices: [],
  appointments: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" },
    { key: "status", label: "Status", type: "select", options: [{ value: "all", label: "All" }, { value: "SCHEDULED", label: "Scheduled" }, { value: "CONFIRMED", label: "Confirmed" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }, { value: "NO_SHOW", label: "No Show" }], defaultValue: "all" },
    { key: "basedOn", label: "Based ON", type: "select", options: [{ value: "created", label: "Created" }, { value: "appointment", label: "Appointment" }], defaultValue: "created" }
  ],
  gst_returns: [],
  gst_outwards: [],
  guest_followups: [],
  daily_stock: [
    { key: "productId", label: "Item", type: "select", endpoint: "/owner/inventory/products", optionLabel: "name" },
    { key: "stockType", label: "Stock Type", type: "select", options: [{ value: "all", label: "All" }, { value: "RETAIL", label: "Retail" }, { value: "CONSUMABLE", label: "Consumable" }], defaultValue: "all" }
  ],
  stock_transaction: [
    { key: "productId", label: "Item", type: "select", endpoint: "/owner/inventory/products", optionLabel: "name" }
  ],
  material_received: [
    { key: "productId", label: "Item", type: "select", endpoint: "/owner/inventory/products", optionLabel: "name" },
    { key: "transactionId", label: "Transaction Id", type: "select", options: [{ value: "all", label: "All" }], defaultValue: "all" },
    { key: "vendorId", label: "Vendor", type: "select", endpoint: "/owner/purchases/vendors", optionLabel: "name", defaultLabel: "All" },
    { key: "vendorInvoiceId", label: "Vendor Invoice Id", type: "select", options: [{ value: "all", label: "All" }], defaultValue: "all" }
  ],
  minimum_stock: [],
  reconcile_stock: [],
  consumable_tracking: [],
  total_consumed: [],
  purchase_order: [],
  inventory_transaction: [
    { key: "productId", label: "Item", type: "select", endpoint: "/owner/inventory/products", optionLabel: "name" }
  ],
  service_reminder: [],
  feedback: [],
  staff_attendance: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" }
  ],
  membership_redemption: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" }
  ],
  package_redemption: [
    { key: "stylistId", label: "Stylist", type: "select", endpoint: "/owner/staff-users", optionLabel: "name", defaultLabel: "All" }
  ],
  inter_store_membership: [],
  pnl_report: []
};

const REPORTS_WITH_CHARTS = new Set([
  "sales_summary", "product_sales", "service_sales", "customers", "staff_performance",
  "monthly_sale", "day_wise", "memberships", "packages", "gift_card_sold",
  "membership_redemption", "package_redemption", "tip_report", "appointments",
  "daily_stock", "material_received", "feedback", "pnl_report", "incentive_report",
  "balance_received", "advance_received", "coupon_redemption", "complimentary",
  "cancelled_invoices", "service_reminder", "guest_followups", "gst_returns",
  "gst_outwards", "reconcile_stock", "consumable_tracking", "total_consumed",
  "purchase_order", "inventory_transaction", "minimum_stock", "stock_transaction",
  "inter_store_membership", "staff_attendance", "gift_card_redemption"
]);

const REPORTS_WITH_COLUMN_PICKER = new Set(["day_wise"]);

const buildDefaultFilterValues = (filterConfig) => {
  const defaults = {};
  filterConfig.forEach((f) => {
    if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    else if (f.options) defaults[f.key] = f.options[0]?.value ?? "";
    else if (f.endpoint) defaults[f.key] = "all";
    else defaults[f.key] = "";
  });
  return defaults;
};

const REPORT_ENDPOINTS = {
  sales_summary: "/reports/sales-summary-list",
  product_sales: "/reports/product-sales",
  service_sales: "/reports/service-sales",
  service_reminder: "/reports/service-reminder",
  customers: "/reports/customers",
  feedback: "/reports/feedback",
  staff_performance: "/reports/staff-performance",
  incentive_report: "/reports/incentive",
  monthly_sale: "/reports/sales-summary-list",
  staff_attendance: "/reports/staff-attendance",
  memberships: "/reports/memberships",
  membership_redemption: "/reports/membership-redemption",
  inter_store_membership: "/reports/inter-store-membership",
  packages: "/reports/packages",
  package_redemption: "/reports/package-redemption",
  gift_card_sold: "/reports/gift-card-sold",
  gift_card_redemption: "/reports/gift-card-redemption",
  advance_received: "/reports/advance-received",
  balance_received: "/reports/balance-received",
  coupon_redemption: "/reports/coupon-redemption",
  day_wise: "/reports/branch-sales",
  tip_report: "/reports/tip",
  complimentary: "/reports/complimentary",
  cancelled_invoices: "/reports/cancelled-invoices",
  appointments: "/reports/appointments",
  gst_returns: "/reports/gst-returns",
  guest_followups: "/reports/guest-followups",
  daily_stock: "/reports/stock",
  stock_transaction: "/reports/stock",
  material_received: "/reports/material-received",
  minimum_stock: "/reports/low-stock",
  reconcile_stock: "/reports/reconcile-stock",
  consumable_tracking: "/reports/consumable-tracking",
  total_consumed: "/reports/total-consumed",
  purchase_order: "/reports/purchase-order",
  gst_outwards: "/reports/gst-outwards",
  inventory_transaction: "/reports/inventory-transaction",
  pnl_report: "/reports/pnl",
};

const normalizeColumnKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const prettifyDate = (value) => {
  if (!value) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const normalizeRowForReport = (reportKey, row, index) => {
  if (!row || typeof row !== "object") return row;

  if (reportKey === "appointments") {
    return {
      Date: prettifyDate(row.startAt || row.createdAt),
      Customer: row.customer?.name || "Walk-in",
      Service: row.items?.map((item) => item.service?.name || item.serviceName).filter(Boolean).join(", ") || "-",
      Staff: row.items?.flatMap((item) => item.assignedStaff || []).map((assignment) => assignment.userSalon?.user?.name).filter(Boolean).join(", ") || "-",
      Branch: row.branch?.name || "-",
      Status: row.status || "-",
      Amount: row.totalAmount ?? row.total ?? 0
    };
  }

  if (reportKey === "memberships") {
    return {
      Date: prettifyDate(row.createdAt),
      Customer: row.customer?.name || "-",
      "Membership Plan": row.membershipPlan?.name || "-",
      Price: row.pricePaid ?? row.soldInvoice?.total ?? 0,
      Validity: row.validUntil ? prettifyDate(row.validUntil) : row.membershipPlan?.validityDays ? `${row.membershipPlan.validityDays} days` : "-",
      Branch: row.soldInvoice?.branchName || row.branch?.name || "-"
    };
  }

  if (reportKey === "packages") {
    return {
      Date: prettifyDate(row.createdAt),
      Customer: row.customer?.name || "-",
      Package: row.package?.name || "-",
      "Price Paid": row.pricePaid ?? row.soldInvoice?.total ?? 0,
      Validity: row.validUntil ? prettifyDate(row.validUntil) : row.package?.validityDays ? `${row.package.validityDays} days` : "-",
      "Services Included": row.package?.sessionCount ?? row.package?.items?.length ?? "-"
    };
  }

  if (reportKey === "cancelled_invoices") {
    return {
      Invoice: row.invoiceNumber || "-",
      Customer: row.customer?.name || "Walk-in",
      Branch: row.branch?.name || "-",
      Status: row.status || "-",
      Total: row.total ?? 0,
      Paid: row.paidAmount ?? 0,
      Refunded: row.refundAmount ?? 0
    };
  }

  if (reportKey === "day_wise") {
    return {
      Date: row.branch || `Branch ${index + 1}`,
      Invoices: row.count ?? 0,
      Cash: row.paid ?? 0,
      Card: "-",
      UPI: "-",
      Online: "-",
      Total: row.sales ?? 0
    };
  }

  if (reportKey === "daily_stock" || reportKey === "minimum_stock") {
    return {
      "SR. NO.": index + 1,
      "ITEM NAME": row.name || row.productName || "-",
      "VARIATION NAME": row.variantName || row.variationName || "-",
      "CATEGORY NAME": row.category?.name || row.categoryName || "-",
      "STORE SKU": row.sku || "-",
      SKU: row.sku || "-",
      "OPENING STOCK": row.openingStock ?? "-",
      "CURRENT STOCK": row.currentStock ?? 0,
      "CURRENT ONFLOOR": row.currentOnFloor ?? "-",
      "UNIT PRICE": row.price ?? row.unitPrice ?? 0,
      "TOTAL STOCK PRICE": row.totalStockPrice ?? "-",
      "TOTAL ONFLOOR PRICE": row.totalOnFloorPrice ?? "-",
      "TOTAL PRICE": row.totalPrice ?? "-",
      "STOCK TYPE": row.stockType || "-",
      "MINIMUM QUANTITY": row.minStock ?? row.minimumQuantity ?? "-"
    };
  }

  if (reportKey === "stock_transaction") {
    return {
      Date: prettifyDate(row.createdAt),
      Product: row.product?.name || row.name || "-",
      Type: row.type || row.reason || "-",
      Qty: row.qty ?? row.quantity ?? 0,
      Staff: row.staffName || "-",
      Note: row.note || row.reference || "-"
    };
  }

  // For most new reports, the backend already returns data in the right format.
  // We just need to ensure dates are properly formatted.
  if (row && typeof row === "object") {
    const normalized = { ...row };
    // Prettify all date-like fields
    for (const key of Object.keys(normalized)) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey === "date" || lowerKey.endsWith("date") || lowerKey.includes("date")) && normalized[key]) {
        normalized[key] = prettifyDate(normalized[key]);
      }
    }
    return normalized;
  }

  return row;
};

const getCellValue = (row, col) => {
  if (!row || typeof row !== "object") return null;

  if (row[col] !== undefined && row[col] !== null) {
    return row[col];
  }

  const aliases = {
    Product: ["name", "productName"],
    Service: ["name", "serviceName"],
    Staff: ["staffName", "name"],
    Completed: ["completedAppointments"],
    Qty: ["qty", "quantity"],
    Customer: ["customerName"],
    "Total Visits": ["totalVisits"],
    "Last Visit": ["lastVisitDate"],
    "Loyalty Pts": ["rewardPoints"],
    "Total Spend": ["totalSpend"],
    "Invoice #": ["invoiceNumber", "invoice"],
    Date: ["date", "createdAt"],
    Sales: ["sales", "revenue"]
  };

  const normalizedCol = normalizeColumnKey(col);
  const matchingKey = Object.keys(row).find((key) => normalizeColumnKey(key) === normalizedCol);
  if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
    return row[matchingKey];
  }

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
  const camelKey = col.toLowerCase().replace(/ ([a-z])/g, (_, char) => char.toUpperCase());

  let value = row[defaultKey] ?? row[defaultKey2] ?? row[camelKey];
  if (col === "Invoice #") value = row.invoiceNumber || row.invoice || value;
  if (col === "Invoice") value = row.invoiceNumber || row.invoice || value;
  if (col === "Total") value = row.total ?? row.amount ?? value;
  if (col === "Paid") value = row.paidAmount ?? value;
  if (col === "Refunded") value = row.refundAmount ?? value;
  if (col === "Status") value = row.status ?? value;

  if (value !== null && value !== undefined && typeof value === "object") {
    return value.name || value.label || JSON.stringify(value);
  }

  return value;
};

function GuestCollectionChart({ rows }) {
  const { formatMoney } = useSalonSettings();
  const dataRows = (rows || []).filter((r) => r && r["GUEST NAME"] && r["GUEST NAME"] !== "TOTAL" && (Number(r["TOTAL"]) || 0) > 0);

  const chartData = useMemo(() => {
    return dataRows
      .map((r) => ({
        name: r["GUEST NAME"] || r["Guest Name"] || "Guest",
        phone: r["GUEST NUMBER"] || r["Guest Number"] || "",
        value: Number(r["TOTAL"]) || 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [dataRows]);

  const PIE_COLORS = ["#86c7a3", "#5fa67d", "#7fb59a", "#a3d4b9", "#c5e0d0", "#6b9b80", "#9bc1a8", "#b3d4c0", "#5a8c6a", "#7faa8c", "#a4c5ad", "#cce0d4"];

  if (chartData.length === 0) {
    return (
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginTop: 16, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No data available for the chart. Run the report to see guest-wise sales visualization.
      </div>
    );
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginTop: 16 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Guest wise sale</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "center" }}>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={130}
                innerRadius={50}
                paddingAngle={1}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="#ffffff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} angle={-20} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(value) => `₹${value}`} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="value" fill="#86c7a3" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {chartData.map((entry, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: PIE_COLORS[index % PIE_COLORS.length] }} />
            <span style={{ fontWeight: 600 }}>{entry.name}</span>
            <span>({formatMoney(entry.value)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHART_PALETTE = ["#2563eb", "#10b981", "#f97316", "#a855f7", "#ec4899", "#06b6d4", "#facc15", "#ef4444", "#14b8a6", "#8b5cf6", "#22c55e", "#3b82f6", "#eab308", "#fb7185"];

function useReportOptions(activeReport) {
  const [options, setOptions] = useState({});
  const filterConfig = REPORT_FILTERS[activeReport] || [];

  useEffect(() => {
    const endpoints = [...new Set(filterConfig.filter((f) => f.endpoint).map((f) => f.endpoint))];
    if (endpoints.length === 0) {
      setOptions({});
      return;
    }
    let cancelled = false;
    Promise.all(
      endpoints.map((ep) =>
        api.get(ep, { params: { limit: 500 } })
          .then((res) => [ep, Array.isArray(res.data) ? res.data : (res.data?.rows || [])])
          .catch(() => [ep, []])
      )
    ).then((entries) => {
      if (cancelled) return;
      const map = {};
      entries.forEach(([ep, list]) => { map[ep] = list; });
      setOptions(map);
    });
    return () => { cancelled = true; };
  }, [activeReport, filterConfig]);

  return { options, filterConfig };
}

function getFilterOptions(filter, optionsState) {
  if (filter.options) return filter.options;
  if (filter.endpoint) {
    const list = optionsState[filter.endpoint] || [];
    const items = [{ value: "all", label: filter.defaultLabel || "All" }];
    list.forEach((item) => {
      const id = item.id || item._id || item.userId || item.staffId;
      const label = filter.optionLabel ? item[filter.optionLabel] : (item.name || item.label || String(id));
      if (id && label) items.push({ value: String(id), label });
    });
    return items;
  }
  return [];
}

function ReportChart({ reportKey, rows }) {
  const { formatMoney } = useSalonSettings();
  const data = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const filtered = rows.filter((r) => r && typeof r === "object");
    if (reportKey === "customers") {
      return filtered
        .filter((r) => r["GUEST NAME"] && r["GUEST NAME"] !== "TOTAL")
        .map((r) => ({ name: r["GUEST NAME"] || r["Guest Name"] || "Guest", value: Number(r["TOTAL"]) || 0 }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
    if (reportKey === "product_sales") {
      return filtered
        .map((r) => ({ name: r.Product || r["Product"] || "-", value: Number(r.Sales || r["Sales"] || r["Value"] || 0) }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
    if (reportKey === "service_sales") {
      const grouped = {};
      filtered.forEach((r) => {
        const name = r.Service || r["Service"] || "-";
        const total = Number(r.Total || r["Total"] || 0);
        grouped[name] = (grouped[name] || 0) + total;
      });
      return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
    if (reportKey === "staff_performance") {
      return filtered
        .map((r) => ({ name: r.Staff || r["Staff"] || r.staff || "-", value: Number(r.Revenue || r["Revenue"] || 0) }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
    if (reportKey === "memberships" || reportKey === "packages" || reportKey === "gift_card_sold") {
      const nameCol = reportKey === "memberships" ? "Membership Plan" : (reportKey === "packages" ? "Package" : "Customer");
      const valCol = reportKey === "gift_card_sold" ? "Value" : "Price";
      return filtered
        .map((r) => ({ name: r[nameCol] || "-", value: Number(r[valCol] || 0) }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }
    if (reportKey === "day_wise") {
      return filtered
        .filter((r) => r.Date && r.Date !== "TOTAL")
        .map((r) => ({ name: r.Date, value: Number(r.Total || 0) }));
    }
    if (reportKey === "monthly_sale") {
      return filtered
        .filter((r) => r.DATE && r.DATE !== "TOTAL")
        .map((r) => ({ name: r.DATE, value: Number(r.TOTAL || 0) }))
        .slice(0, 30);
    }
    if (reportKey === "appointments") {
      const grouped = {};
      filtered.forEach((r) => {
        const d = r.Date || "-";
        grouped[d] = (grouped[d] || 0) + (Number(r.Amount || 0));
      });
      return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }
    if (reportKey === "daily_stock") {
      return filtered
        .slice(0, 15)
        .map((r) => ({ name: r["ITEM NAME"] || "-", value: Number(r["CURRENT STOCK"] || 0) }));
    }
    if (reportKey === "pnl_report") {
      return filtered.map((r) => ({ name: r.Month || r["Month"] || "-", value: Number(r.Revenue || r["Revenue"] || 0) }));
    }
    if (reportKey === "tip_report") {
      const grouped = {};
      filtered.forEach((r) => {
        const name = r["GUEST NAME"] || "-";
        grouped[name] = (grouped[name] || 0) + Number(r["TIP AMOUNT"] || 0);
      });
      return Object.entries(grouped).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);
    }
    if (reportKey === "complimentary" || reportKey === "cancelled_invoices") {
      return filtered
        .slice(0, 10)
        .map((r) => ({ name: r.Customer || r["Customer"] || r["Guest Name"] || "-", value: Number(r.Value || r["Value"] || r["Total"] || 0) }));
    }
    return filtered
      .slice(0, 10)
      .map((r, idx) => {
        const numericKey = Object.keys(r).find((k) => {
          const v = r[k];
          return typeof v === "number" || (!isNaN(parseFloat(v)) && v !== "" && k !== "SR. NO.");
        });
        const nameKey = Object.keys(r).find((k) => k.toLowerCase().includes("name") || k.toLowerCase().includes("customer") || k.toLowerCase().includes("date") || k.toLowerCase().includes("product") || k.toLowerCase().includes("service") || k.toLowerCase().includes("staff") || k.toLowerCase().includes("code"));
        return { name: r[nameKey] || r[Object.keys(r)[0]] || `Row ${idx + 1}`, value: Number(r[numericKey] || 0) };
      });
  }, [reportKey, rows]);

  if (!data || data.length === 0) {
    return (
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginTop: 16, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No data available for the chart. Run the report to see the visualization.
      </div>
    );
  }

  const isHorizontal = ["staff_performance", "product_sales", "service_sales", "memberships", "packages", "gift_card_sold", "tip_report"].includes(reportKey);

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginTop: 16 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{currentChartTitle(reportKey)}</h3>
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          {isHorizontal ? (
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `₹${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={150} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} angle={-20} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip formatter={(value) => formatMoney(value)} />
              <Bar dataKey="value" fill="#86c7a3" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function currentChartTitle(reportKey) {
  const map = {
    customers: "Guest wise sale",
    product_sales: "Product wise revenue",
    service_sales: "Service wise revenue",
    staff_performance: "Stylist wise revenue",
    memberships: "Membership wise revenue",
    packages: "Package wise revenue",
    gift_card_sold: "Gift Card wise sale",
    day_wise: "Day wise sales",
    monthly_sale: "Monthly sales",
    appointments: "Appointments by date",
    daily_stock: "Current stock levels",
    pnl_report: "Revenue by month",
    tip_report: "Top tippers",
    complimentary: "Complimentary by customer",
    cancelled_invoices: "Cancelled invoice amounts"
  };
  return map[reportKey] || "Visualization";
}

function ColumnPicker({ reportKey, visibleColumns, onToggle, onClose, onSelectAll, onClearAll }) {
  const allCols = COLUMNS[reportKey] || ["Data"];
  return (
    <div
      style={{
        position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
        background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10,
        minWidth: 220, maxHeight: 320, overflowY: "auto", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid #e2e8f0", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Columns</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", cursor: "pointer", fontSize: 13, color: "#0f172a", fontWeight: 600, borderBottom: "1px solid #f1f5f9", marginBottom: 4 }}>
        <input type="checkbox" checked={visibleColumns.length === allCols.length} onChange={(e) => e.target.checked ? onSelectAll() : onClearAll()} />
        <span>{ALL_COLUMN_KEY}</span>
      </label>
      {allCols.map((col) => (
        <label key={col} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", cursor: "pointer", fontSize: 13, color: "#334155" }}>
          <input type="checkbox" checked={visibleColumns.includes(col)} onChange={() => onToggle(col)} />
          <span>{col}</span>
        </label>
      ))}
    </div>
  );
}

function ReportTable({ reportKey, rows, loading, visibleColumns }) {
  const cols = (visibleColumns && visibleColumns.length > 0 ? visibleColumns : (COLUMNS[reportKey] || ["Data"]));

  return (
    <table className="rpt-table">
      <thead>
        <tr>
          {cols.map((col) => <th key={col}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <tr key={index} className="rpt-loading">
              {cols.map((_, cellIndex) => <td key={cellIndex}>&nbsp;</td>)}
            </tr>
          ))
        ) : rows?.length ? rows.map((row, rowIndex) => {
          const isTotalRow = row && (row["GUEST NAME"] === "TOTAL" || row["Product"] === "TOTAL" || row["Service"] === "TOTAL" || row["Staff"] === "TOTAL");
          return (
            <tr key={rowIndex} style={isTotalRow ? { fontWeight: 700, background: "#f1f5f9", borderTop: "2px solid #334155" } : undefined}>
              {cols.map((col, cellIndex) => {
                const value = col === "SR. NO." ? (isTotalRow ? "" : rowIndex + 1) : getCellValue(row, col);
                return <td key={cellIndex} style={isTotalRow ? { fontWeight: 700 } : undefined}>{value ?? "—"}</td>;
              })}
            </tr>
          );
        }) : (
          <tr>
            <td colSpan={cols.length} className="rpt-empty">No records found for the selected filters.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function SalesSummaryDashboard({ data, loading }) {
  const [activeDetailsCard, setActiveDetailsCard] = useState(null);

  const formatVal = (val) => Number(val || 0).toFixed(2).replace(/\.00$/, "");

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDetailsCard(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "12px" }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          width: "32px",
          height: "32px",
          border: "4px solid #f1f5f9",
          borderTop: "4px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>Loading Sales Summary...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
        <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>No records found for the selected filters.</span>
      </div>
    );
  }

  const cardList = [
    {
      label: "Gross Sale",
      value: data.cards.grossSale.value,
      count: data.cards.grossSale.count,
      color: "#10b981",
      bgColor: "#ecfdf5",
      tooltip: "Final Sale Excluding Redemption From Net Sale And Adding Membership / Packages Sold Amount",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      label: "Service Net Sale",
      value: data.cards.serviceNetSale.value,
      count: data.cards.serviceNetSale.count,
      color: "#8b5cf6",
      bgColor: "#f5f3ff",
      tooltip: "Overall Services Sale Excluding (Taxes, Discount, Complimentary & Redemptions)",
      details: data.cards.serviceNetSale.details ? [
        { label: "Total Service Sale With Taxes", value: data.cards.serviceNetSale.details.totalServiceSaleWithTaxes },
        { label: "Inclusive Taxes", value: data.cards.serviceNetSale.details.inclusiveTaxes },
        { label: "Exclusive Taxes", value: data.cards.serviceNetSale.details.exclusiveTaxes },
        { label: "Membership Redemption", value: data.cards.serviceNetSale.details.membershipRedemption }
      ] : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      )
    },
    {
      label: "Product Net Sale",
      value: data.cards.productNetSale.value,
      count: data.cards.productNetSale.count,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      tooltip: "Overall Products Sale Excluding (Taxes, Discount, Complimentary & Redemptions)",
      details: data.cards.productNetSale.details ? [
        { label: "Total Product Sale With Taxes", value: data.cards.productNetSale.details.totalProductSaleWithTaxes },
        { label: "Inclusive Taxes", value: data.cards.productNetSale.details.inclusiveTaxes },
        { label: "Exclusive Taxes", value: data.cards.productNetSale.details.exclusiveTaxes },
        { label: "Membership Redemption", value: data.cards.productNetSale.details.membershipRedemption }
      ] : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      label: "Package Net Sale",
      value: data.cards.packageNetSale.value,
      count: data.cards.packageNetSale.count,
      color: "#ec4899",
      bgColor: "#fdf2f8",
      tooltip: "Overall Packages Sale Excluding (Taxes, Discount, Complimentary & Redemptions)",
      details: data.cards.packageNetSale.details ? [
        { label: "Total Package Sale With Taxes", value: data.cards.packageNetSale.details.totalPackageSaleWithTaxes },
        { label: "Inclusive Taxes", value: data.cards.packageNetSale.details.inclusiveTaxes },
        { label: "Exclusive Taxes", value: data.cards.packageNetSale.details.exclusiveTaxes }
      ] : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12v10H4V12" />
          <path d="M2 7h20v5H2z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      )
    },
    {
      label: "Membership Net Sale",
      value: data.cards.membershipNetSale.value,
      count: data.cards.membershipNetSale.count,
      color: "#3b82f6",
      bgColor: "#eff6ff",
      tooltip: "Overall Memberships Sale Excluding (Taxes, Discount, Complimentary & Redemptions)",
      details: data.cards.membershipNetSale.details ? [
        { label: "Total Membership Sale With Taxes", value: data.cards.membershipNetSale.details.totalMembershipSaleWithTaxes },
        { label: "Topup Amount Without Taxes", value: data.cards.membershipNetSale.details.topupAmountWithoutTaxes },
        { label: "Inclusive Taxes", value: data.cards.membershipNetSale.details.inclusiveTaxes },
        { label: "Exclusive Taxes", value: data.cards.membershipNetSale.details.exclusiveTaxes }
      ] : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      )
    },
    {
      label: "Gift Card Net Sale",
      value: data.cards.giftCardNetSale.value,
      count: data.cards.giftCardNetSale.count,
      color: "#6366f1",
      bgColor: "#e0e7ff",
      tooltip: "Overall Gift Cards Sale",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M12 2v9" />
          <path d="M8 5h8" />
        </svg>
      )
    }
  ];

  return (
    <div className="dash-container" style={{ padding: "8px 0px 24px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
      <style>{`
        .respark-tooltip-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .respark-tooltip-content {
          visibility: hidden;
          width: 210px;
          background-color: #1e293b;
          color: #ffffff;
          text-align: center;
          border-radius: 6px;
          padding: 8px 10px;
          position: absolute;
          z-index: 120;
          top: 130%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.2s;
          font-size: 0.7rem;
          font-weight: 500;
          line-height: 1.3;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          pointer-events: none;
        }
        .respark-tooltip-container:hover .respark-tooltip-content {
          visibility: visible;
          opacity: 1;
        }
        .respark-tooltip-content::after {
          content: "";
          position: absolute;
          bottom: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent #1e293b transparent;
        }
        .respark-card-details-item {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 6px;
        }
        .respark-card-details-item:last-child {
          margin-bottom: 0;
        }
        .respark-card-details-label {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 2px;
          display: block;
        }
        .respark-card-details-value {
          font-size: 0.85rem;
          color: #0f172a;
          font-weight: 700;
        }
      `}</style>

      {/* 1. Metrics Cards Row */}
      <div className="dash-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        {cardList.map((card) => (
          <div key={card.label} style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>{card.label} ({card.count})</span>
                <div className="respark-tooltip-container">
                  <div style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    fontSize: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }} onClick={(e) => {
                    e.stopPropagation();
                    if (card.details) {
                      setActiveDetailsCard(activeDetailsCard === card.label ? null : card.label);
                    }
                  }}>i</div>

                  {card.tooltip && (
                    <div className="respark-tooltip-content">
                      {card.tooltip}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>₹ {formatVal(card.value)}</div>
            </div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: card.bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {card.icon}
            </div>

            {/* DETAILS DROPDOWN POPUP */}
            {activeDetailsCard === card.label && card.details && (
              <div 
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "12px",
                  marginTop: "6px",
                  zIndex: 100,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  borderRadius: "8px",
                  padding: "10px",
                  width: "190px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  boxSizing: "border-box"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {card.details.map((detail, idx) => (
                  <div key={idx} className="respark-card-details-item">
                    <span className="respark-card-details-label">{detail.label}</span>
                    <div className="respark-card-details-value">₹ {formatVal(detail.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. Middle Row Grid: Revenue, Adjustments, Collection, Footfall */}
      <div className="dash-mid-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* Revenue & Adjustments Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          {/* Revenue Sources */}
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "8px", marginTop: 0 }}>Revenue Sources</h3>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", margin: "6px 0", color: "#334155" }}>
              <span>Service Sale</span>
              <span style={{ fontWeight: 600 }}>₹ {data.revenueSources.serviceSale}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", margin: "6px 0", color: "#334155", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", fontWeight: "bold" }}>
              <span>Total Sale</span>
              <span>₹ {data.revenueSources.totalSale}</span>
            </div>
          </div>

          {/* Adjustments */}
          <div style={{ borderLeft: "1px dashed #e2e8f0", paddingLeft: "16px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ef4444", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "8px", marginTop: 0 }}>Adjustments</h3>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", margin: "6px 0", color: "#334155" }}>
              <span>Discount</span>
              <span style={{ fontWeight: 600 }}>₹ {data.adjustments.discount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", margin: "6px 0", color: "#334155", borderTop: "1px dashed #e2e8f0", paddingTop: "6px", fontWeight: "bold" }}>
              <span>Total Redemption</span>
              <span>₹ {data.adjustments.totalRedemption}</span>
            </div>
          </div>
        </div>

        {/* Collection Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#059669", marginBottom: "12px", marginTop: 0 }}>Collection</h3>
          <div style={{ display: "flex", gap: "12px", marginBottom: "4px" }}>
            {/* Offline block */}
            <div style={{
              flex: 1,
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "#ffffff"
            }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Offline</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155" }}>₹ {data.collection.offline}</span>
            </div>
            {/* Online block */}
            <div style={{
              flex: 1,
              border: "1px solid #a7f3d0",
              background: "#ecfdf5",
              borderRadius: "8px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px"
            }}>
              <span style={{ fontSize: "0.7rem", color: "#065f46", fontWeight: 600 }}>Online</span>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#047857" }}>₹ {data.collection.online}</span>
            </div>
          </div>
        </div>

        {/* Footfall Summary Card */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f43f5e", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", marginBottom: "8px", marginTop: 0 }}>Footfall Summary</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#334155" }}>
              <span>Total Guest Footfall</span>
              <span style={{ fontWeight: 700 }}>{data.footfall.totalGuestFootfall}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b" }}>
              <span>New Guest Footfall</span>
              <span style={{ fontWeight: 600 }}>{data.footfall.newGuestFootfall}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b" }}>
              <span>Repetitive Guest Footfall</span>
              <span style={{ fontWeight: 600 }}>{data.footfall.repetitiveGuestFootfall}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#334155", borderTop: "1px dashed #e2e8f0", paddingTop: "4px" }}>
              <span>Guest Purchased Services & Products</span>
              <span style={{ fontWeight: 700, color: "#f43f5e" }}>{data.footfall.purchasedPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Charts and Lists: Top 5 tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* Service Sale Top 5 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Service Sale <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Top 5)</span></h3>
            <button onClick={() => setActiveReport("service_sales")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topServices.length ? data.topServices.map((item, idx) => {
              const maxVal = data.topServices[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹ {item.value}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#ec4899", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>

        {/* Product Sale Top 5 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Product Sale <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Top 5)</span></h3>
            <button onClick={() => setActiveReport("product_sales")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topProducts.length ? data.topProducts.map((item, idx) => {
              const maxVal = data.topProducts[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹ {item.value}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>

        {/* Stylist Sale Top 5 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Stylist Sale <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Top 5)</span></h3>
            <button onClick={() => setActiveReport("staff_performance")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topStylists.length ? data.topStylists.map((item, idx) => {
              const maxVal = data.topStylists[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹ {item.value}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#3b82f6", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>
      </div>

      {/* 4. Second Row charts: Membership, Package, Client Count */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* Membership Sale Top 5 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Membership Sale <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Top 5)</span></h3>
            <button onClick={() => setActiveReport("memberships")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topMemberships.length ? data.topMemberships.map((item, idx) => {
              const maxVal = data.topMemberships[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹ {item.value}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#6366f1", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>

        {/* Package Sale Top 5 */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Package Sale <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Top 5)</span></h3>
            <button onClick={() => setActiveReport("packages")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.topPackages.length ? data.topPackages.map((item, idx) => {
              const maxVal = data.topPackages[0]?.value || 1;
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹ {item.value}</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#ec4899", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>

        {/* Client Count */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Client Count</h3>
            <button onClick={() => setActiveReport("customers")} style={{ background: "#eff6ff", border: "none", color: "#2563eb", fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.clientCount.length ? data.clientCount.map((item, idx) => {
              const maxVal = Math.max(...data.clientCount.map(c => c.value), 1);
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={item.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#475569", marginBottom: "3px" }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 600 }}>{item.value} visit(s)</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#10b981", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            }) : <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>No data available</div>}
          </div>
        </div>
      </div>

      {/* 5. Average Sale Summary */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
      }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px", marginTop: 0 }}>Average Sale Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
          <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "16px" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Total Gross Sale</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", marginTop: "4px" }}>₹ {data.averageSale.totalGrossSale}</div>
          </div>
          <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "16px" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Total Transactions</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", marginTop: "4px" }}>{data.averageSale.totalTransactions}</div>
          </div>
          <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "16px" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Average Bill Value</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", marginTop: "4px" }}>₹ {data.averageSale.avgBillValue}</div>
          </div>
          <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: "16px" }}>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Average Service Bill Value</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", marginTop: "4px" }}>₹ {data.averageSale.avgServiceBillValue}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Average Product Bill Value</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", marginTop: "4px" }}>₹ {data.averageSale.avgProductBillValue}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsHubPage() {
  const [activeReport, setActiveReport] = useState("sales_summary");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ start: "", end: "", branchId: "", date: "" });
  const [reportFilters, setReportFilters] = useState({});
  const [rows, setRows] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Loaded");
  const [showChart, setShowChart] = useState(false);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(null);

  const { options: filterOptions, filterConfig } = useReportOptions(activeReport);
  const currentReport = ALL_REPORTS.find((report) => report.key === activeReport);

  useEffect(() => {
    const defaults = buildDefaultFilterValues(filterConfig);
    setReportFilters(defaults);
    setVisibleColumns(null);
    setShowChart(false);
    setColumnPickerOpen(false);
  }, [activeReport, filterConfig]);

  useEffect(() => {
    const endpoint = activeReport === "sales_summary" ? "/reports/sales-summary-dashboard" : REPORT_ENDPOINTS[activeReport];
    setRows([]);
    setDashboardData(null);

    if (!endpoint) {
      setLoading(false);
      setStatusText("Pending wiring");
      return;
    }

    setLoading(true);
    setStatusText("Loading...");

    const params = {};
    if (filters.date) {
      params.date = filters.date;
    } else {
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;
    }
    if (filters.branchId) params.branchId = filters.branchId;
    filterConfig.forEach((f) => {
      const v = reportFilters[f.key];
      if (v && v !== "all") params[f.key] = v;
    });

    api.get(endpoint, { params })
      .then((res) => {
        if (activeReport === "sales_summary") {
          setDashboardData(res.data);
        } else {
          const payload = Array.isArray(res.data) ? res.data : res.data?.rows || [];
          setRows(payload.map((row, index) => normalizeRowForReport(activeReport, row, index)));
        }
        setStatusText("Loaded");
      })
      .catch(() => {
        setRows([]);
        setDashboardData(null);
        setStatusText("Load failed");
      })
      .finally(() => setLoading(false));
  }, [activeReport, filters.branchId, filters.date, filters.end, filters.start, filterConfig, reportFilters]);

  const filteredReports = ALL_REPORTS.filter((report) => !search || report.label.toLowerCase().includes(search.toLowerCase()));

  const handleExportCSV = () => {
    if (!rows.length) return;

    const cols = visibleColumns && visibleColumns.length > 0 ? visibleColumns : (COLUMNS[activeReport] || ["Data"]);
    let csv = `${cols.join(",")}\n`;

    rows.forEach((row) => {
      const csvRow = cols.map((col) => {
        const value = getCellValue(row, col) ?? "—";
        return `"${String(value).replace(/"/g, "\"\"")}"`;
      });
      csv += `${csvRow.join(",")}\n`;
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

  const toggleColumn = (col) => {
    setVisibleColumns((current) => {
      const all = COLUMNS[activeReport] || ["Data"];
      const currentList = current || all;
      if (currentList.includes(col)) {
        return currentList.filter((c) => c !== col);
      }
      return [...currentList, col];
    });
  };

  const allColumns = COLUMNS[activeReport] || ["Data"];
  const activeVisibleColumns = visibleColumns && visibleColumns.length > 0 ? visibleColumns : allColumns;

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
          .rpt-empty { text-align: center; padding: 48px; color: #94a3b8; font-size: 0.82rem; }
          .rpt-loading td { animation: rpt-shimmer 1.2s infinite; background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%); background-size: 200% 100%; height: 28px; }
          @keyframes rpt-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .rpt-icon-btn { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 7px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; min-height: unset; }
          .rpt-icon-btn:hover { background: #f1f5f9; color: #1e293b; }
          .rpt-icon-btn.active { background: #dbeafe; border-color: #3b82f6; color: #1d4ed8; }
          .rpt-filter-chip { display: flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 6px; }
          .rpt-filter-chip select { border: none; outline: none; background: transparent; font-size: 0.72rem; color: #334155; padding: 0; cursor: pointer; min-height: unset; box-shadow: none; }
          .rpt-filter-chip input[type="date"] { border: none; outline: none; background: transparent; font-size: 0.72rem; color: #334155; padding: 0; width: 110px; }
        `}
      </style>

      <div className="rpt-sidebar no-print">
        <div className="rpt-search-box">
          <div className="rpt-search-wrap">
            <svg className="rpt-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="rpt-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
              onClick={() => {
                setActiveReport(report.key);
                setSearch("");
              }}
            >
              {report.label}
            </button>
          ))}
        </div>
      </div>

      <div id="printable-report" className="rpt-main">
        <div className="rpt-topbar">
          {REPORTS_WITH_CHARTS.has(activeReport) && (
            <button
              type="button"
              className={`rpt-icon-btn ${showChart ? "active" : ""}`}
              title={showChart ? "Hide Chart" : "Show Chart"}
              onClick={() => setShowChart((current) => !current)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.78 1.02 6.43 2.66" />
                <path d="M21 4v5h-5" />
                <path d="M12 7v5l3 3" />
              </svg>
            </button>
          )}
          {REPORTS_WITH_COLUMN_PICKER.has(activeReport) && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className={`rpt-icon-btn ${columnPickerOpen ? "active" : ""}`}
                title="Toggle Columns"
                onClick={() => setColumnPickerOpen((current) => !current)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                  <line x1="7" y1="3" x2="7" y2="21" />
                </svg>
              </button>
              {columnPickerOpen && (
                <ColumnPicker
                  reportKey={activeReport}
                  visibleColumns={activeVisibleColumns}
                  onToggle={toggleColumn}
                  onSelectAll={() => setVisibleColumns([...allColumns])}
                  onClearAll={() => setVisibleColumns([])}
                  onClose={() => setColumnPickerOpen(false)}
                />
              )}
            </div>
          )}
          <h2 className="rpt-title">{currentReport?.label || "Report"}</h2>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Records</div>
            <div className="rpt-stat-val">{loading ? "..." : rows.length}</div>
          </div>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Range</div>
            <div className="rpt-stat-val">{filters.date ? filters.date : (filters.start && filters.end ? `${filters.start} to ${filters.end}` : "All Time")}</div>
          </div>
          <div className="rpt-stat" style={{ flexShrink: 0 }}>
            <div className="rpt-stat-label">Status</div>
            <div
              className="rpt-stat-val"
              style={{
                color: loading
                  ? "#f59e0b"
                  : statusText === "Load failed"
                    ? "#dc2626"
                    : statusText === "Pending wiring"
                      ? "#64748b"
                      : "#10b981"
              }}
            >
              {statusText}
            </div>
          </div>
          <div id="report-filters" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
            {filterConfig.map((f) => {
              const opts = getFilterOptions(f, filterOptions);
              const value = reportFilters[f.key] ?? "";
              return (
                <div key={f.key} className="rpt-filter-chip">
                  <span className="rpt-filter-label">{f.label}:</span>
                  <select value={value} onChange={(e) => setReportFilters((current) => ({ ...current, [f.key]: e.target.value }))}>
                    {opts.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              );
            })}

            <div className="rpt-filter-chip">
              <input type="date" value={filters.date} onChange={(e) => setFilters((current) => ({ ...current, date: e.target.value, start: e.target.value ? "" : current.start, end: e.target.value ? "" : current.end }))} />
            </div>

            {(filters.date || filters.start || filters.end) && (
              <button type="button" className="rpt-btn rpt-btn-clear" onClick={() => setFilters((current) => ({ ...current, date: "", start: "", end: "" }))}>×</button>
            )}
            <button type="button" className="rpt-btn" style={{
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              borderRadius: "6px",
              padding: "5px 14px",
              fontWeight: 700,
              fontSize: "0.72rem",
              border: "none",
              cursor: loading ? "default" : "pointer",
              boxShadow: "0 1px 3px rgba(37, 99, 235, 0.2)",
              transition: "all 0.15s ease"
            }} disabled={loading}>{loading ? "Loading..." : "Show Report"}</button>
            {activeReport !== "sales_summary" && (
              <button type="button" className="rpt-btn rpt-btn-dark" onClick={handleExportCSV}>Export CSV</button>
            )}
            <button type="button" className="rpt-btn rpt-btn-blue" onClick={() => window.print()}>Print</button>
          </div>
        </div>

        <div className="rpt-table-wrap" style={{
          background: activeReport === "sales_summary" ? "transparent" : "#ffffff",
          border: activeReport === "sales_summary" ? "none" : "1px solid #e2e8f0"
        }}>
          {activeReport === "sales_summary" ? (
            <SalesSummaryDashboard data={dashboardData} loading={loading} />
          ) : (
            <ReportTable reportKey={activeReport} rows={rows} loading={loading} visibleColumns={activeVisibleColumns} />
          )}
        </div>

        {showChart && REPORTS_WITH_CHARTS.has(activeReport) && activeReport !== "sales_summary" && (
          activeReport === "customers" ? <GuestCollectionChart rows={rows} /> : <ReportChart reportKey={activeReport} rows={rows} />
        )}
      </div>
    </div>
  );
}
