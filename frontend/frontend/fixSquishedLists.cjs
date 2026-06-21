const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Fix Packages List
  code = code.replace(
    '{/* Packages List */}\n              <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }} className="no-scrollbar">',
    '{/* Packages List */}\n              <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px", flexShrink: 0, minHeight: "170px" }} className="no-scrollbar">'
  );

  // Fix Memberships List
  code = code.replace(
    '{/* Memberships List */}\n              <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }} className="no-scrollbar">',
    '{/* Memberships List */}\n              <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px", flexShrink: 0, minHeight: "170px" }} className="no-scrollbar">'
  );

  fs.writeFileSync(file, code);
}

fixFile('src/pages/owner/PosPage.jsx');
fixFile('src/pages/owner/AppointmentCheckoutModal.jsx');
