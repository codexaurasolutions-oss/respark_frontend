const fs = require('fs');

const files = [
  'frontend/src/pages/owner/SettingsPage.jsx',
  'frontend/src/pages/superAdmin/AuditLogsPage.jsx',
  'frontend/src/pages/customer/CustomerPortalPage.jsx',
  'frontend/src/pages/owner/MessageTemplatesPage.jsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    // owner/SettingsPage.jsx
    if (f.includes('SettingsPage')) {
      content = content.replace(/<div className="summary-box" style={{ marginTop: 16 }}>\s*<strong>Saved snapshot<\/strong>[\s\S]*?<\/div>/g, '');
    }

    // superAdmin/AuditLogsPage.jsx
    if (f.includes('AuditLogsPage')) {
      content = content.replace(/<pre>\{JSON\.stringify\(row\.meta, null, 2\)\}<\/pre>/g, '<div className="muted">Detailed metadata securely archived.</div>');
    }

    // customer/CustomerPortalPage.jsx
    if (f.includes('CustomerPortalPage')) {
      content = content.replace(/<pre[^>]*>\{JSON\.stringify\(data, null, 2\)\}<\/pre>/g, '<div className="muted">Dashboard data loaded.</div>');
    }

    // owner/MessageTemplatesPage.jsx
    if (f.includes('MessageTemplatesPage')) {
      content = content.replace(/<label>\s*<span className="muted">.*?<\/span>\s*<textarea[^>]*JSON\.stringify[^>]*\/>\s*<\/label>/gs, '');
      // fallback if label is not there
      content = content.replace(/<textarea[^>]*JSON\.stringify[^>]*\/>/gs, '');
    }

    if (content !== original) {
      fs.writeFileSync(f, content, 'utf8');
      console.log(`Cleaned up ${f}`);
    }
  }
});
