const fs = require('fs');
let code = fs.readFileSync('src/pages/owner/AppointmentCheckoutModal.jsx', 'utf8');

// 1. Add states
const stateCode = `  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [membershipSearch, setMembershipSearch] = useState("");
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [membershipDraft, setMembershipDraft] = useState({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "" });`;
code = code.replace('const [packageDraft, setPackageDraft]', stateCode + '\n  const [packageDraft, setPackageDraft]');

// 2. Add handleAddMembershipToCart
const funcCode = `  const handleAddMembershipToCart = () => {
    if (!selectedMembership && membershipDraft.membershipPlanId !== "CUSTOM") return;
    
    const nextItems = [...activeItems, {
      itemType: "MEMBERSHIP",
      membershipPlanId: selectedMembership ? selectedMembership.id : "CUSTOM",
      name: selectedMembership ? selectedMembership.name : "Custom Membership",
      staffUserId: membershipDraft.staffId || "",
      qty: 1,
      unitPrice: Number(membershipDraft.price || 0),
      taxPct: 0
    }];
    setBillingCart({ ...billingCart, items: nextItems });
    setShowMembershipModal(false);
    setMembershipDraft({ staffId: "", price: "", validityDays: "", online: "", offline: "", remark: "", membershipPlanId: "" });
    setSelectedMembership(null);
  };`;
code = code.replace('const handleAddPackageToCart', funcCode + '\n  const handleAddPackageToCart');

// 3. Update button
code = code.replace('cursor: "not-allowed" }}>Add Membership</button>', 'cursor: "pointer", color: "#1e293b" }} onClick={() => setShowMembershipModal(true)}>Add Membership</button>');
code = code.replace('color: "#cbd5e1", fontSize: "0.75rem", whiteSpace: "nowrap", cursor: "pointer", color: "#1e293b"', 'color: "#1e293b", fontSize: "0.75rem", whiteSpace: "nowrap", cursor: "pointer"');

// 4. Add Modal JSX
const modalJsx = `      {showMembershipModal && (
        <div className="premium-modal-overlay" onClick={() => setShowMembershipModal(false)} style={{ zIndex: 10000, background: "rgba(0,0,0,0.5)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "12px", width: "900px", maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Add memberships</h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "4px 8px" }}>
                  <input type="text" placeholder="Search For Membership" value={membershipSearch} onChange={(e) => setMembershipSearch(e.target.value)} style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.8rem", width: "160px" }} />
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                </div>
                <button onClick={() => setShowMembershipModal(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}><X size={16} /></button>
              </div>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Memberships List */}
              <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }} className="no-scrollbar">
                {(posContext.memberships || []).filter(p => !membershipSearch || p.name.toLowerCase().includes(membershipSearch.toLowerCase())).map(pkg => {
                  const isSelected = selectedMembership?.id === pkg.id;
                  return (
                    <div 
                      key={pkg.id} 
                      onClick={() => {
                        setSelectedMembership(pkg);
                        setMembershipDraft(prev => ({ ...prev, price: pkg.price || pkg.monthlyPrice || "", validityDays: pkg.validityDays || "" }));
                      }}
                      style={{ 
                        flexShrink: 0, width: "300px", minHeight: "150px", padding: "16px", borderRadius: "8px", 
                        background: isSelected ? "#fce7f3" : "#f8fafc", 
                        border: isSelected ? "1px solid #f43f5e" : "1px solid #e2e8f0", 
                        cursor: "pointer", transition: "all 0.2s" 
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: "0.85rem", marginBottom: "8px", textTransform: "uppercase" }}>{pkg.name}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem", marginBottom: "4px" }}>Fee: ₹ {pkg.price || pkg.monthlyPrice}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem", marginBottom: "12px" }}>Validity: {pkg.validityDays || 30} Days</div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.75rem", marginBottom: "6px" }}>Services:</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {(pkg.services || []).map((s, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: "0.7rem" }}>
                            <span>{s.service?.name || "Service"}</span>
                            <span>{s.sessions}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div style={{ flexShrink: 0, width: "200px", minHeight: "150px", padding: "16px", borderRadius: "8px", background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => { setSelectedMembership(null); setMembershipDraft(prev => ({...prev, membershipPlanId: "CUSTOM"})); }}>
                  <span style={{ fontWeight: 700, color: "#3b82f6", fontSize: "0.85rem" }}>CUSTOM MEMBERSHIP</span>
                </div>
              </div>

              {/* Details Form */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>Name</div>
                  <div style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.75rem", color: "#0f172a", fontWeight: 600, height: "36px", display: "flex", alignItems: "center" }}>
                    {selectedMembership ? selectedMembership.name : "CUSTOM"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>Validity</div>
                  <input type="number" value={membershipDraft.validityDays} onChange={(e) => setMembershipDraft({...membershipDraft, validityDays: e.target.value})} placeholder="Enter Validity" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.75rem", outline: "none", height: "36px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>Price</div>
                  <input type="number" value={membershipDraft.price} onChange={(e) => setMembershipDraft({...membershipDraft, price: e.target.value})} placeholder="Enter Price" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.75rem", outline: "none", height: "36px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>Staff</div>
                  <select value={membershipDraft.staffId} onChange={(e) => setMembershipDraft({...membershipDraft, staffId: e.target.value})} style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.75rem", outline: "none", height: "36px", boxSizing: "border-box", background: "white" }}>
                    <option value="" disabled>Select Staff</option>
                    {posContext.staffUsers.map(s => <option key={s.id} value={s.id}>{s.user?.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "4px" }}>Purchase date</div>
                  <div style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.75rem", color: "#475569", height: "36px", display: "flex", alignItems: "center" }}>
                    {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                  </div>
                </div>
              </div>

              {/* Add Services & Products (Visual placeholders for now to match screenshot) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add services</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" placeholder="Search Service By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, width: "100px" }}>Add products</span>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", flex: 1 }}>
                    <input type="text" placeholder="Search Product By Category Or Name" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.75rem" }} />
                    <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>🔍</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Payment Details:</div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Balance</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "120px", background: "white" }}>
                      <span>💰</span>
                      <input type="text" readOnly value={Math.max(0, Number(membershipDraft.price || 0) - (Number(membershipDraft.online || 0) + Number(membershipDraft.offline || 0))).toFixed(1)} style={{ border: "none", outline: "none", width: "100%", fontSize: "0.8rem", borderBottom: "1px solid #e2e8f0", color: "#3b82f6", fontWeight: 600 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Online</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "120px", background: "white" }}>
                      <span>💻</span>
                      <input type="number" value={membershipDraft.online} onChange={(e) => setMembershipDraft({...membershipDraft, online: e.target.value})} placeholder="0.0" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.8rem", borderBottom: "1px solid #e2e8f0", color: "#10b981" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Offline</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", width: "120px", background: "white" }}>
                      <input type="number" value={membershipDraft.offline} onChange={(e) => setMembershipDraft({...membershipDraft, offline: e.target.value})} placeholder="0.0" style={{ border: "none", outline: "none", width: "100%", fontSize: "0.8rem", borderBottom: "1px solid #e2e8f0", color: "#10b981", marginLeft: "24px" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>Remark:</div>
                <textarea value={membershipDraft.remark} onChange={(e) => setMembershipDraft({...membershipDraft, remark: e.target.value})} style={{ width: "100%", minHeight: "60px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.75rem", boxSizing: "border-box" }}></textarea>
              </div>

            </div>

            {/* Footer Buttons */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
              <button onClick={() => setShowMembershipModal(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAddMembershipToCart} disabled={!selectedMembership && membershipDraft.membershipPlanId !== "CUSTOM"} style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: (selectedMembership || membershipDraft.membershipPlanId === "CUSTOM") ? "#3b82f6" : "#94a3b8", color: "white", fontWeight: 600, fontSize: "0.8rem", cursor: (selectedMembership || membershipDraft.membershipPlanId === "CUSTOM") ? "pointer" : "not-allowed", transition: "all 0.2s" }}>Add Membership</button>
            </div>
          </div>
        </div>
      )}`;
code = code.replace('{showPackageModal && (', modalJsx + '\n      {showPackageModal && (');

fs.writeFileSync('src/pages/owner/AppointmentCheckoutModal.jsx', code);
