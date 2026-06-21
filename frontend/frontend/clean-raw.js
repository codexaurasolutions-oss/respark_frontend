const fs = require('fs');

const removeRaw = (file, strToFind) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(strToFind)) {
      fs.writeFileSync(file, content.replace(strToFind, ''), 'utf8');
      console.log(`Cleaned up ${file}`);
    }
  }
};

const replaceRaw = (file, strToFind, replacement) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(strToFind)) {
      fs.writeFileSync(file, content.replace(strToFind, replacement), 'utf8');
      console.log(`Replaced in ${file}`);
    }
  }
};

// owner/SettingsPage.jsx
replaceRaw('frontend/src/pages/owner/SettingsPage.jsx', 
  `<div className="summary-box" style={{ marginTop: 16 }}>
            <strong>Saved snapshot</strong>
            {saved ? <pre>{JSON.stringify(saved, null, 2)}</pre> : <EmptyState title="No saved snapshot yet" message="Save settings once to generate a live readback snapshot for quick verification." />}
          </div>`, 
  '');

// superAdmin/AuditLogsPage.jsx
replaceRaw('frontend/src/pages/superAdmin/AuditLogsPage.jsx', 
  `<pre>{JSON.stringify(row.meta, null, 2)}</pre>`, 
  `<div className="muted">Detailed metadata securely archived.</div>`);

// customer/CustomerPortalPage.jsx
replaceRaw('frontend/src/pages/customer/CustomerPortalPage.jsx', 
  `<pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>`, 
  `<div className="muted">Dashboard data loaded.</div>`);

// owner/MessageTemplatesPage.jsx
replaceRaw('frontend/src/pages/owner/MessageTemplatesPage.jsx',
  `<textarea rows="3" placeholder='Optional variables JSON array, e.g. ["customer_name","salon_name"]' value={JSON.stringify(detail?.variables || [], null, 2)} readOnly />`,
  '');

// owner/CatalogPage.jsx
replaceRaw('frontend/src/pages/owner/CatalogPage.jsx',
  `<textarea rows="4" placeholder='Social links JSON, e.g. { "instagram": "https://..." }' value={settings.socialLinks} onChange={(event) => setSettings((current) => ({ ...current, socialLinks: event.target.value }))} />`,
  '');
replaceRaw('frontend/src/pages/owner/CatalogPage.jsx',
  `<textarea rows="4" placeholder='Branch display JSON, e.g. { "showAddress": true, "showPhone": true }' value={settings.branchDisplaySettings} onChange={(event) => setSettings((current) => ({ ...current, branchDisplaySettings: event.target.value }))} />`,
  '');
replaceRaw('frontend/src/pages/owner/CatalogPage.jsx',
  `<textarea rows="8" placeholder={'Before / after gallery JSON, e.g. [{ "title": "Keratin Smooth", "serviceName": "Hair Treatment", "beforeImageUrl": "https://...", "afterImageUrl": "https://...", "resultNote": "Shine restored" }]'} value={settings.beforeAfterGallery} onChange={(event) => setSettings((current) => ({ ...current, beforeAfterGallery: event.target.value }))} />`,
  '');

// owner/CampaignTemplatesPage.jsx
replaceRaw('frontend/src/pages/owner/CampaignTemplatesPage.jsx',
  `<textarea rows="8" placeholder='Layout JSON, e.g. { "headlineAlign": "center" }' value={form.layoutJson} onChange={(event) => setForm((current) => ({ ...current, layoutJson: event.target.value }))} />`,
  '');
