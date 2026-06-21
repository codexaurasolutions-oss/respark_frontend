import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

const targetCols = `  customers: ["Customer", "Phone", "Email", "Total Visits", "Last Visit", "Total Spend", "Loyalty Pts"],`;
const replacementCols = `  customers: ["SR. NO.", "GUEST NAME", "GUEST NUMBER", "COUNT", "TAXES", "GIFT CARD", "COUPON", "REFERRAL", "LOYALTY", "BALANCE PENDING", "ADVANCE UTILIZED", "PACKAGE REDEMPTION", "BALANCE CLEARED", "MEMBERSHIP REDEMPTION", "ONLINE", "OFFLINE", "TOTAL"],`;

content = content.replace(targetCols, replacementCols);
fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
console.log("Patched ReportsHubPage customer columns!");
