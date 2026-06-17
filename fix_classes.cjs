const fs = require('fs');
let code = fs.readFileSync('src/pages/owner/SettingsPage.jsx', 'utf8');

code = code.replace(/className="table-wrap"/g, 'className="settings-table-wrap"');
code = code.replace(/className="data-table"/g, 'className="settings-table"');
code = code.replace(/className="list-stack"/g, 'className="settings-list-stack"');

// Fix empty table state
const tableHtml = `              {roster.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.staffName}</td>
                  <td><input type="time" value={row.fromTime || "09:00"} onChange={(event) => updateRow(row.id, { fromTime: event.target.value })} /></td>
                  <td><input type="time" value={row.toTime || "21:00"} onChange={(event) => updateRow(row.id, { toTime: event.target.value })} /></td>
                  <td><label className="mini-toggle-label"><input type="checkbox" className="premium-toggle-input" checked={Boolean(row.isWorking)} onChange={(event) => updateRow(row.id, { isWorking: event.target.checked })} /><div className="mini-toggle-switch"></div></label></td>
                  <td><input value={row.breakLabel || ""} onChange={(event) => updateRow(row.id, { breakLabel: event.target.value })} placeholder="Add break" /></td>
                </tr>
              ))}
              {roster.rows.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                    No staff found. Staff data is populated dynamically from the users list.
                  </td>
                </tr>
              )}`;

code = code.replace(
  /              \{roster\.rows\.map\(\(row\) => \([\s\S]*?\}\)\)\}\s*<\/tbody>/,
  tableHtml + '\n            </tbody>'
);

fs.writeFileSync('src/pages/owner/SettingsPage.jsx', code);
console.log('Classes updated!');
