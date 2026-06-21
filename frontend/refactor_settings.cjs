const fs = require('fs');
let code = fs.readFileSync('src/pages/owner/SettingsPage.jsx', 'utf8');

// 1. Import CSS
if (!code.includes('./SettingsPage.css')) {
  code = code.replace(
    'import { SETTINGS_WORKSPACE_SECTIONS, getSettingsSection } from "./settingsWorkspaceConfig";',
    'import { SETTINGS_WORKSPACE_SECTIONS, getSettingsSection } from "./settingsWorkspaceConfig";\nimport "./SettingsPage.css";'
  );
}

// 2. ToggleRow component
const oldToggleRow = `const ToggleRow = ({ checked, label, helper, onChange }) => (
  <label className="settings-toggle-row">
    <span>
      <strong>{label}</strong>
      {helper ? <small>{helper}</small> : null}
    </span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>
);`;

const newToggleRow = `const ToggleRow = ({ checked, label, helper, onChange }) => (
  <label className="premium-toggle-label">
    <div className="premium-toggle-text">
      <strong>{label}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
    <input type="checkbox" className="premium-toggle-input" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
    <div className="premium-toggle-switch"></div>
  </label>
);`;
code = code.replace(oldToggleRow, newToggleRow);

// 3. Layout replacements
code = code.replace(/<div className="page-shell">/g, '<div className="settings-workspace-wrapper">'); // don't conflict with inner

code = code.replace(
  /<div className="hero-card settings-hub-hero">[\s\S]*?<\/div>\s*<\/div>/,
  `<div className="settings-page-header">
        <div className="settings-header-title">
          <h1>Respark ERP Settings</h1>
          <p>Search, configure, and govern salon-wide behavior from one polished settings hub instead of scattering controls across the main sidebar.</p>
        </div>
        <div className="settings-header-actions">
          <div className="badge-row">
            {liveStats.slice(0, 4).map((item) => <span key={item.label} className="badge">{item.label} {item.value}</span>)}
          </div>
          <button type="button" className="secondary-button" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
          <button type="button" className="btn-save-workspace" onClick={saveWorkspace} disabled={saving}>{saving ? "Saving..." : "Save Workspace"}</button>
        </div>
      </div>`
);

code = code.replace(
  /<div className="settings-workspace">\s*<aside className="panel-card settings-workspace-sidebar">/,
  `<div className="settings-layout">
          <aside className="settings-sidebar">`
);

code = code.replace(
  /<div className="settings-search">\s*<input value={search} onChange={\(event\) => setSearch\(event.target.value\)} placeholder="Search settings" \/>\s*<\/div>/,
  `<input className="settings-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search settings" />`
);

code = code.replace(
  /<span>\{item.label\}<\/span>\s*<small>\{item.hint\}<\/small>/g,
  `<strong>{item.label}</strong>\n                  <small>{item.hint}</small>`
);

code = code.replace(
  /<section className="settings-workspace-content">/,
  `<section className="settings-content">`
);

// 4. Classes replacement
code = code.replace(/className="panel-card"/g, 'className="settings-panel-card"');
code = code.replace(/className="form-grid"/g, 'className="settings-form-grid"');
code = code.replace(/style=\{inputLabelStyle\}/g, 'className="settings-input-group"');

// 5. Roster table checkboxes
code = code.replace(
  /<td><input type="checkbox" checked=\{Boolean\(row.isWorking\)\} onChange=\{\(event\) => updateRow\(row.id, \{ isWorking: event.target.checked \}\)\} \/><\/td>/g,
  `<td><label className="mini-toggle-label"><input type="checkbox" className="premium-toggle-input" checked={Boolean(row.isWorking)} onChange={(event) => updateRow(row.id, { isWorking: event.target.checked })} /><div className="mini-toggle-switch"></div></label></td>`
);

// 6. Generic checkbox mappings in SimpleListSection
code = code.replace(
  /type="checkbox" checked=\{Boolean\(row\[field.key\]\)\} onChange=\{\(event\) => updateRow\(row.id, \{ \[field.key\]: event.target.checked \}\)\} \/>/g,
  `type="checkbox" className="premium-toggle-input" checked={Boolean(row[field.key])} onChange={(event) => updateRow(row.id, { [field.key]: event.target.checked })} /><div className="mini-toggle-switch"></div>`
);

code = code.replace(
  /\{field.type === "checkbox" \? \(\s*<input type="checkbox" className="premium-toggle-input"/g,
  `{field.type === "checkbox" ? (<label className="mini-toggle-label"><input type="checkbox" className="premium-toggle-input"`
);
code = code.replace(
  /event.target.checked \}\)\} \/><div className="mini-toggle-switch"><\/div>\s*\) : \(/g,
  `event.target.checked })} /><div className="mini-toggle-switch"></div></label>) : (`
);

fs.writeFileSync('src/pages/owner/SettingsPage.jsx', code);
console.log('SettingsPage refactored successfully!');
