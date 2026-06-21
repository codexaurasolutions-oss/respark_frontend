import fs from 'fs';

let content = fs.readFileSync('src/pages/owner/PosPage.jsx', 'utf8');

const target1 = `<IndianPhoneInput
                required
                value={newGuestForm.phone}
                onChange={(phone) => setNewGuestForm(c => ({ ...c, phone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
              />`;

const replace1 = `<IndianPhoneInput
                required
                value={newGuestForm.phone}
                onChange={(phone) => setNewGuestForm(c => ({ ...c, phone }))}
                style={{ width: "100%", borderRadius: 6 }}
              />`;

const target1Crlf = target1.replace(/\n/g, '\r\n');
if (content.includes(target1)) content = content.replace(target1, replace1);
else if (content.includes(target1Crlf)) content = content.replace(target1Crlf, replace1);


const target2 = `<IndianPhoneInput
                value={newGuestForm.alternatePhone}
                onChange={(alternatePhone) => setNewGuestForm(c => ({ ...c, alternatePhone }))}
                style={{ width: "100%", borderRadius: 6 }}
                inputStyle={{ padding: "10px" }}
                placeholder="Alternate Phone"
              />`;

const replace2 = `<IndianPhoneInput
                value={newGuestForm.alternatePhone}
                onChange={(alternatePhone) => setNewGuestForm(c => ({ ...c, alternatePhone }))}
                style={{ width: "100%", borderRadius: 6 }}
                placeholder="Alternate Phone"
              />`;

const target2Crlf = target2.replace(/\n/g, '\r\n');
if (content.includes(target2)) content = content.replace(target2, replace2);
else if (content.includes(target2Crlf)) content = content.replace(target2Crlf, replace2);

fs.writeFileSync('src/pages/owner/PosPage.jsx', content);
console.log("Successfully removed inputStyle from IndianPhoneInput!");
