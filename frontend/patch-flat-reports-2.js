import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/ReportsHubPage.jsx', 'utf8');

// I will extract from <div className="no-print" to {/* RIGHT PANEL */}
const startMarker = '<div className="no-print"';
const endMarker = '{/* RIGHT PANEL */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newSidebar = `<div className="no-print" style={{ width: 240, minWidth: 240, background: "#475569", borderRight: "1px solid #e2e8f0", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #334155" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.9rem" }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              style={{ width: "100%", padding: "8px 10px 8px 30px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", color: "#334155", background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, padding: "8px 0" }}>
          {filteredReports.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => { setActiveReport(report.key); setSearch(""); }}
              style={{
                width: "100%", display: "block", padding: "12px 14px 12px 20px", background: activeReport === report.key ? "white" : "none",
                border: "none", borderLeft: activeReport === report.key ? "4px solid #1e293b" : "4px solid transparent",
                cursor: "pointer", fontSize: "0.85rem", color: activeReport === report.key ? "#0f172a" : "#cbd5e1",
                fontWeight: activeReport === report.key ? 700 : 500, textAlign: "left", transition: "all 0.15s"
              }}>
              {report.label}
            </button>
          ))}
        </div>
      </div>
      `;
      
  content = content.substring(0, startIndex) + newSidebar + content.substring(endIndex);
  fs.writeFileSync('src/pages/owner/ReportsHubPage.jsx', content);
  console.log("Sidebar strictly replaced!");
} else {
  console.log("Could not find markers");
}
