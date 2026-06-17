const fs = require('fs');

const logicStr = `
  const handlePackageServiceAdd = (srv) => {
    if(!packageDraft.customServices.find(s => s.id === srv.id)) {
      setPackageDraft({...packageDraft, customServices: [...packageDraft.customServices, srv]});
    }
    setPkgServiceSearch("");
  };
  const handlePackageProductAdd = (prd) => {
    if(!packageDraft.customProducts.find(p => p.id === prd.id)) {
      setPackageDraft({...packageDraft, customProducts: [...packageDraft.customProducts, prd]});
    }
    setPkgProductSearch("");
  };
  const handleMemServiceAdd = (srv) => {
    if(!membershipDraft.customServices.find(s => s.id === srv.id)) {
      setMembershipDraft({...membershipDraft, customServices: [...membershipDraft.customServices, srv]});
    }
    setMemServiceSearch("");
  };
  const handleMemProductAdd = (prd) => {
    if(!membershipDraft.customProducts.find(p => p.id === prd.id)) {
      setMembershipDraft({...membershipDraft, customProducts: [...membershipDraft.customProducts, prd]});
    }
    setMemProductSearch("");
  };
`;

const pkgRealStr = `              {/* Add Services & Products */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {packageDraft.customServices?.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "112px" }}>
                    {packageDraft.customServices.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600 }}>
                        {s.name}
                        <span style={{ cursor: "pointer", color: "#0284c7" }} onClick={() => setPackageDraft({...packageDraft, customServices: packageDraft.customServices.filter(x => x.id !== s.id)})}>&times;</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add services</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" value={pkgServiceSearch} onChange={e => setPkgServiceSearch(e.target.value)} placeholder="Search Service By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem", background: "transparent" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                  {pkgServiceSearch.trim().length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: "112px", right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      {(((typeof context !== 'undefined' ? context.categories : null) || (typeof posContext !== 'undefined' ? posContext.categories : null) || []).flatMap(c => c.services || []))
                        .filter(s => s.name.toLowerCase().includes(pkgServiceSearch.toLowerCase()))
                        .map(s => (
                          <div key={s.id} onClick={() => handlePackageServiceAdd(s)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{s.name}</div>
                        ))
                      }
                    </div>
                  )}
                </div>

                {packageDraft.customProducts?.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "112px" }}>
                    {packageDraft.customProducts.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#dcfce7", color: "#166534", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600 }}>
                        {p.name}
                        <span style={{ cursor: "pointer", color: "#15803d" }} onClick={() => setPackageDraft({...packageDraft, customProducts: packageDraft.customProducts.filter(x => x.id !== p.id)})}>&times;</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add products</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" value={pkgProductSearch} onChange={e => setPkgProductSearch(e.target.value)} placeholder="Search Product By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem", background: "transparent" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                  {pkgProductSearch.trim().length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: "112px", right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      {((typeof context !== 'undefined' ? context.products : null) || (typeof posContext !== 'undefined' ? posContext.products : null) || [])
                        .filter(p => p.name.toLowerCase().includes(pkgProductSearch.toLowerCase()))
                        .map(p => (
                          <div key={p.id} onClick={() => handlePackageProductAdd(p)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{p.name}</div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>`;

const memRealStr = `              {/* Add Services & Products */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {membershipDraft.customServices?.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "112px" }}>
                    {membershipDraft.customServices.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600 }}>
                        {s.name}
                        <span style={{ cursor: "pointer", color: "#0284c7" }} onClick={() => setMembershipDraft({...membershipDraft, customServices: membershipDraft.customServices.filter(x => x.id !== s.id)})}>&times;</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add services</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" value={memServiceSearch} onChange={e => setMemServiceSearch(e.target.value)} placeholder="Search Service By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem", background: "transparent" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                  {memServiceSearch.trim().length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: "112px", right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      {(((typeof context !== 'undefined' ? context.categories : null) || (typeof posContext !== 'undefined' ? posContext.categories : null) || []).flatMap(c => c.services || []))
                        .filter(s => s.name.toLowerCase().includes(memServiceSearch.toLowerCase()))
                        .map(s => (
                          <div key={s.id} onClick={() => handleMemServiceAdd(s)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{s.name}</div>
                        ))
                      }
                    </div>
                  )}
                </div>

                {membershipDraft.customProducts?.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingLeft: "112px" }}>
                    {membershipDraft.customProducts.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#dcfce7", color: "#166534", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600 }}>
                        {p.name}
                        <span style={{ cursor: "pointer", color: "#15803d" }} onClick={() => setMembershipDraft({...membershipDraft, customProducts: membershipDraft.customProducts.filter(x => x.id !== p.id)})}>&times;</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add products</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" value={memProductSearch} onChange={e => setMemProductSearch(e.target.value)} placeholder="Search Product By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem", background: "transparent" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                  {memProductSearch.trim().length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: "112px", right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: "6px", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                      {((typeof context !== 'undefined' ? context.products : null) || (typeof posContext !== 'undefined' ? posContext.products : null) || [])
                        .filter(p => p.name.toLowerCase().includes(memProductSearch.toLowerCase()))
                        .map(p => (
                          <div key={p.id} onClick={() => handleMemProductAdd(p)} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.75rem", borderBottom: "1px solid #f1f5f9" }}>{p.name}</div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>`;


function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');

  // 1. Update draft states
  code = code.replace(
    /const \[packageDraft, setPackageDraft\] = useState\(\{ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", packageId: "" \}\);/g,
    'const [packageDraft, setPackageDraft] = useState({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", packageId: "", customServices: [], customProducts: [] });\n  const [pkgServiceSearch, setPkgServiceSearch] = useState("");\n  const [pkgProductSearch, setPkgProductSearch] = useState("");'
  );

  code = code.replace(
    /const \[membershipDraft, setMembershipDraft\] = useState\(\{ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "" \}\);/g,
    'const [membershipDraft, setMembershipDraft] = useState({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "", customServices: [], customProducts: [] });\n  const [memServiceSearch, setMemServiceSearch] = useState("");\n  const [memProductSearch, setMemProductSearch] = useState("");'
  );

  // 2. Add handle logic functions
  if (!code.includes('const handlePackageServiceAdd =')) {
    code = code.replace('const handleAddPackageToCart', logicStr + '\n  const handleAddPackageToCart');
  }

  // 3. Replace the visual placeholders
  // We use regex to replace the entire placeholder div structure.
  const rePkg = /\{\/\* Add Services & Products \(Visual placeholders for now to match screenshot\) \*\/\}[\s\S]*?<\/div>[\s]*<\/div>[\s]*<\/div>/g;
  
  let matches = code.match(rePkg);
  if (matches && matches.length >= 2) {
    code = code.replace(matches[0], pkgRealStr);
    code = code.replace(matches[1], memRealStr);
  }

  // 4. Update reset states on button click
  code = code.replace(
    /setPackageDraft\(\{ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", packageId: "" \}\);/g,
    'setPackageDraft({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", packageId: "", customServices: [], customProducts: [] });'
  );
  code = code.replace(
    /setMembershipDraft\(\{ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "" \}\);/g,
    'setMembershipDraft({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "", customServices: [], customProducts: [] });'
  );

  // 5. Update payload to cart
  code = code.replace(
    /taxPct: 0\n    \}\];\n    setBillingCart/g,
    'taxPct: 0,\n      customServices: packageDraft.customServices,\n      customProducts: packageDraft.customProducts\n    }];\n    setBillingCart'
  );
  
  code = code.replace(
    /taxPct: 0\n    \}\];\n    setShowMembershipModal/g,
    'taxPct: 0,\n      customServices: membershipDraft.customServices,\n      customProducts: membershipDraft.customProducts\n    }];\n    setShowMembershipModal'
  );

  fs.writeFileSync(file, code);
}

patchFile('src/pages/owner/PosPage.jsx');
patchFile('src/pages/owner/AppointmentCheckoutModal.jsx');
