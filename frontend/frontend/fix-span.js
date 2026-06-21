const fs = require('fs');

const files = [
  'frontend/src/pages/owner/AppointmentDetailPage.jsx',
  'frontend/src/pages/owner/EnquiriesPage.jsx',
  'frontend/src/pages/owner/ReportsPage.jsx',
  'frontend/src/pages/public/SalonCatalogPage.jsx',
  'frontend/src/pages/superAdmin/DemoLeadsPage.jsx',
  'frontend/src/pages/superAdmin/SubscriptionsPage.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  content = content.replace(/<span className="muted">\s*\{.*\}\s*<\/span>/g, '<span className="muted">Select Option</span>');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Fixed ${f}`);
  }
});
