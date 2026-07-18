const fs = require('fs');
let code = fs.readFileSync('src/pages/owner/MembershipsPage.jsx', 'utf8');

const startMForm = code.indexOf(`{(activeSection === "memberships") && !customerMembershipMode && (`);
const endMForm = code.indexOf(`)}`, code.indexOf(`</form>`, startMForm)) + 2;

const startPForm = code.indexOf(`{(activeSection === "packages") && !customerPackageMode && (`);
const endPForm = code.indexOf(`)}`, code.indexOf(`</form>`, startPForm)) + 2;

const startMList = code.indexOf(`{(activeSection === "memberships") && <div className="panel-card">`);
const endMList = code.indexOf(`</div>}`, startMList) + 7;

const startPList = code.indexOf(`{(activeSection === "packages") && <div className="panel-card">`);
const endPList = code.indexOf(`</div>}`, startPList) + 7;

const mForm = code.substring(startMForm, endMForm);
const pForm = code.substring(startPForm, endPForm);
const mList = code.substring(startMList, endMList);
const pList = code.substring(startPList, endPList);

code = code.replace(mForm, '___M_FORM___').replace(pForm, '___P_FORM___').replace(mList, '___M_LIST___').replace(pList, '___P_LIST___');
code = code.replace('___M_FORM___', mList).replace('___P_FORM___', pList).replace('___M_LIST___', mForm).replace('___P_LIST___', pForm);

fs.writeFileSync('src/pages/owner/MembershipsPage.jsx', code);
console.log("Done");
