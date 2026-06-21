import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

content = content.replace(
  'sales_summary: ["Date", "Invoice #", "Customer", "Services", "Products", "Discount", "Tax", "Total", "Paid", "Due"]',
  'sales_summary: ["SR. NO.", "DATE", "TIME", "INVOICE NO", "GUEST NAME", "GUEST NUMBER", "ITEMS", "GROSS AMOUNT", "DISCOUNT", "TAX", "NET TOTAL", "PAID AMOUNT", "DUE AMOUNT", "PAYMENT MODE"]'
);

fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Patched Sales Summary frontend columns!");
