import fs from 'fs';
let f = fs.readFileSync('src/pages/owner/PosPage.jsx', 'utf8');

const targetState = `  const [newGuestForm, setNewGuestForm] = useState({ name: "", phone: "", email: "", gender: "FEMALE" });`;
const replacementState = `  const [newGuestForm, setNewGuestForm] = useState({ name: "", phone: "", email: "", gender: "FEMALE", alternatePhone: "", dateOfBirth: "", anniversary: "", gst: "" });`;

f = f.replace(targetState, replacementState);

const targetReset = `      setNewGuestForm({ name: "", phone: "", email: "", gender: "FEMALE" });`;
const replacementReset = `      setNewGuestForm({ name: "", phone: "", email: "", gender: "FEMALE", alternatePhone: "", dateOfBirth: "", anniversary: "", gst: "" });`;

f = f.replace(targetReset, replacementReset);

const targetForm = `            <form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="Full Name *" required value={newGuestForm.name} onChange={e => setNewGuestForm(c => ({ ...c, name: e.target.value }))} />
              <IndianPhoneInput
                required
                value={newGuestForm.phone}
                onChange={(phone) => setNewGuestForm(c => ({ ...c, phone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
              />
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} type="email" placeholder="Email (Optional)" value={newGuestForm.email} onChange={e => setNewGuestForm(c => ({ ...c, email: e.target.value }))} />
              <select style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.gender} onChange={e => setNewGuestForm(c => ({ ...c, gender: e.target.value }))}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="UNISEX">Other</option>
              </select>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#475569" }} onClick={() => setShowAddGuestModal(false)}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "10px", background: "#0f172a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Save Guest</button>
              </div>
            </form>`;

const replacementForm = `            <form onSubmit={handleAddGuest} style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} placeholder="Full Name *" required value={newGuestForm.name} onChange={e => setNewGuestForm(c => ({ ...c, name: e.target.value }))} />
              <IndianPhoneInput
                required
                value={newGuestForm.phone}
                onChange={(phone) => setNewGuestForm(c => ({ ...c, phone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
              />
              <input style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} type="email" placeholder="Email (Optional)" value={newGuestForm.email} onChange={e => setNewGuestForm(c => ({ ...c, email: e.target.value }))} />
              <select style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: 6, width: "100%", boxSizing: "border-box", outline: "none" }} value={newGuestForm.gender} onChange={e => setNewGuestForm(c => ({ ...c, gender: e.target.value }))}>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="UNISEX">Other</option>
              </select>
              
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
              
              <div style={{ display: "flex", gap: 8, marginTop: 8, position: "sticky", bottom: 0, background: "white", padding: "8px 0" }}>
                <button type="button" style={{ flex: 1, padding: "10px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, color: "#475569" }} onClick={() => setShowAddGuestModal(false)}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "10px", background: "#0f172a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Save Guest</button>
              </div>
            </form>`;

// To handle CRLF vs LF:
let targetFormCrlf = targetForm.replace(/\n/g, '\r\n');

if (f.includes(targetForm)) {
  f = f.replace(targetForm, replacementForm);
} else if (f.includes(targetFormCrlf)) {
  f = f.replace(targetFormCrlf, replacementForm);
}

fs.writeFileSync('src/pages/owner/PosPage.jsx', f);
