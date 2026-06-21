import fs from 'fs';
let f = fs.readFileSync('src/pages/owner/PosPage.jsx', 'utf8');

const targetFormStart = '<form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>';
f = f.replace(targetFormStart, '<form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>');

const injectionPoint = '</select>';
const additionalFields = `</select>
              <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, marginTop: 4 }}>Additional Details (Optional)</div>
              <IndianPhoneInput
                value={newGuestForm.alternatePhone}
                onChange={(alternatePhone) => setNewGuestForm(c => ({ ...c, alternatePhone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
                placeholder="Alternate Phone"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: 2 }}>Date of Birth</label>
                  <input type="date" style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.dateOfBirth} onChange={e => setNewGuestForm(c => ({ ...c, dateOfBirth: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: 2 }}>Anniversary</label>
                  <input type="date" style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.anniversary} onChange={e => setNewGuestForm(c => ({ ...c, anniversary: e.target.value }))} />
                </div>
              </div>
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="GST Number" value={newGuestForm.gst} onChange={e => setNewGuestForm(c => ({ ...c, gst: e.target.value }))} />`;

if (f.indexOf(injectionPoint) > -1 && f.indexOf('Additional Details (Optional)') === -1) {
    f = f.replace(injectionPoint, additionalFields);
}

fs.writeFileSync('src/pages/owner/PosPage.jsx', f);
