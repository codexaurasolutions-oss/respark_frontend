const fs = require('fs');
let f = fs.readFileSync('src/pages/owner/PosPage.jsx', 'utf8');

const target1 = /    \/\/ Validation removed: If they don't enter a payment amount, we will automatically assume full CASH payment\.\r?\n    return "";\r?\n  }, \[form\]\);/;

const replacement1 = `    if (mode === "complete") {
      const paidAmount = form.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const totalDue = Math.round(totals.total);
      if (Math.round(paidAmount) < totalDue) {
        return \`Please enter full payment amount before completing. Total is ₹\${totalDue} but only ₹\${Math.round(paidAmount)} is paid.\`;
      }
    }
    return "";
  }, [form, totals.total]);`;

f = f.replace(target1, replacement1);

const target2 = /      \/\/ Auto-fill full amount as CASH if user didn't enter any payments\r?\n      if \(finalPayments\.length === 0 && totals\.total > 0\) \{\r?\n        finalPayments = \[\{ mode: "CASH", amount: totals\.total, note: "Auto-filled full amount" \}\];\r?\n      \}/;

f = f.replace(target2, "");

fs.writeFileSync('src/pages/owner/PosPage.jsx', f);
