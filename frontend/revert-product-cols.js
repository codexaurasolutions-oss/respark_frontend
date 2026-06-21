import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

content = content.replace(
  'product_sales: ["SR. NO.", "Date", "Time", "Guest Name", "Guest Number", "Staff", "Invoice No", "Product", "Category", "Qty", "Unit Price", "Discount", "Complimentary", "Redemption Amount", "Redemption Sources", "Tax", "Subtotal", "Total"],',
  'product_sales: ["Product", "Category", "Qty", "Sales"],'
);

fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Reverted Product Revenue frontend columns!");
