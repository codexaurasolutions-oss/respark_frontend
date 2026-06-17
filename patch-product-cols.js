import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

content = content.replace(
  'product_sales: ["Product", "Category", "Qty", "Sales"],',
  'product_sales: ["SR. NO.", "Date", "Time", "Guest Name", "Guest Number", "Staff", "Invoice No", "Product", "Category", "Qty", "Unit Price", "Discount", "Complimentary", "Redemption Amount", "Redemption Sources", "Tax", "Subtotal", "Total"],'
);

fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Patched Product Revenue frontend columns!");
