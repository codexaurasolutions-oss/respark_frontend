import fs from 'fs';
let f = fs.readFileSync('src/pages/owner/PosPage.jsx', 'utf8');

const injectionPoint = `<h3 style={{ marginTop: 0, marginBottom: 16, color: "#0f172a", fontSize: "18px" }}>Quick Add Guest</h3>`;

if (f.indexOf(injectionPoint) === -1) {
    console.error("COULD NOT FIND injection point");
    process.exit(1);
}

const formStart = `<form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>`;
const formStartReplace = `<form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>`;

// First replace the form tag ONLY in the modal
let modalIndex = f.indexOf(injectionPoint);
let beforeModal = f.substring(0, modalIndex);
let afterModal = f.substring(modalIndex);

afterModal = afterModal.replace(formStart, formStartReplace);

const selectEnd = `</select>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>`;
const selectEndReplace = `</select>
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
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="GST Number" value={newGuestForm.gst} onChange={e => setNewGuestForm(c => ({ ...c, gst: e.target.value }))} />
              
              <div style={{ display: "flex", gap: 8, marginTop: 8, position: "sticky", bottom: 0, background: "white", padding: "8px 0" }}>`;

const selectEndCrlf = selectEnd.replace(/\n/g, '\r\n');

if (afterModal.includes(selectEnd)) {
    afterModal = afterModal.replace(selectEnd, selectEndReplace);
} else if (afterModal.includes(selectEndCrlf)) {
    afterModal = afterModal.replace(selectEndCrlf, selectEndReplace);
} else {
    console.error("COULD NOT FIND selectEnd in modal");
    process.exit(1);
}

f = beforeModal + afterModal;
fs.writeFileSync('src/pages/owner/PosPage.jsx', f);
console.log("Successfully replaced!");
