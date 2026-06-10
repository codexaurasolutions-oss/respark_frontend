const fs = require('fs');

const fileReplacements = [
  {
    file: 'frontend/src/pages/owner/SettingsPage.jsx',
    replacements: [
      {
        find: /<div className="summary-box" style={{ marginTop: 16 }}>\s*<strong>Saved snapshot<\/strong>\s*\{saved \? <pre>\{JSON.stringify\(saved, null, 2\)\}<\/pre> : <EmptyState[^>]*\/>\}\s*<\/div>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/superAdmin/SettingsPage.jsx',
    replacements: [
      {
        find: /<div className="panel-card">\s*<h3>Raw Settings<\/h3>\s*\{data \? <pre>\{JSON\.stringify\(data, null, 2\)\}<\/pre> : <EmptyState[^>]*\/>\}\s*<\/div>/g,
        replace: ''
      },
      {
        find: /<label>\s*<span className="muted">Notification Defaults \(JSON\)<\/span>\s*<textarea rows="4" value=\{form\.notificationDefaultsText\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, notificationDefaultsText: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/superAdmin/AuditLogsPage.jsx',
    replacements: [
      {
        find: /<pre>\{JSON\.stringify\(row\.meta, null, 2\)\}<\/pre>/g,
        replace: '<div className="muted">No detailed metadata preview available.</div>'
      }
    ]
  },
  {
    file: 'frontend/src/pages/customer/CustomerPortalPage.jsx',
    replacements: [
      {
        find: /<pre style=\{\{ whiteSpace: "pre-wrap" \}\}>\{JSON\.stringify\(data, null, 2\)\}<\/pre>/g,
        replace: '<div className="muted">Dashboard data loaded.</div>'
      }
    ]
  },
  {
    file: 'frontend/src/pages/owner/UsersPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Permissions JSON<\/span>\s*<textarea rows="5" value=\{form\.permissionsText\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, permissionsText: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/owner/StaffRolesPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Permissions JSON<\/span>\s*<textarea rows="6" value=\{roleForm\.permissionsText\} onChange=\{\(event\) => setRoleForm\(\(current\) => \(\{ \.\.\.current, permissionsText: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/superAdmin/PlansPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Feature Flags \(JSON\)<\/span>\s*<textarea rows="4" value=\{form\.featureFlagsText\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, featureFlagsText: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/owner/MessageTemplatesPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Optional variables JSON array, e\.g\. \["customer_name","salon_name"\]<\/span>\s*<textarea rows="3" placeholder='Optional variables JSON array, e\.g\. \["customer_name","salon_name"\]' value=\{JSON\.stringify\(detail\?\.variables \|\| \[\], null, 2\)\} readOnly \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/owner/CatalogPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Social links JSON<\/span>\s*<textarea rows="3" value=\{form\.socialLinks\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, socialLinks: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      },
      {
        find: /<label>\s*<span className="muted">Branch settings JSON<\/span>\s*<textarea rows="3" value=\{form\.branchDisplaySettings\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, branchDisplaySettings: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      },
      {
        find: /<label>\s*<span className="muted">Gallery JSON<\/span>\s*<textarea rows="3" value=\{form\.beforeAfterGallery\} onChange=\{\(event\) => setForm\(\(current\) => \(\{ \.\.\.current, beforeAfterGallery: event\.target\.value \}\)\)\} \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  },
  {
    file: 'frontend/src/pages/owner/CampaignTemplatesPage.jsx',
    replacements: [
      {
        find: /<label>\s*<span className="muted">Raw layout JSON<\/span>\s*<textarea rows="4" value=\{form\.layoutJson\} readOnly \/>\s*<\/label>/g,
        replace: ''
      }
    ]
  }
];

fileReplacements.forEach(({ file, replacements }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    replacements.forEach(r => {
      content = content.replace(r.find, r.replace);
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes made to ${file} (Regex didn't match)`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
