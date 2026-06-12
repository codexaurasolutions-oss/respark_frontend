  return (
    <div className="pos-layout">
      {/* TOP BAR */}
      <div className="pos-topbar">
        <div className="pos-topbar-left">
          <div className="pos-gender-toggles">
            <button className={`pos-gender-btn ${posGender === "FEMALE" ? "active" : ""}`} onClick={() => setPosGender("FEMALE")}>Female</button>
            <button className={`pos-gender-btn ${posGender === "MALE" ? "active" : ""}`} onClick={() => setPosGender("MALE")}>Male</button>
          </div>
          <div className="pos-search-wrapper">
            <input 
              placeholder={`Search ${tab === 'billing' ? 'Service' : 'Product'}`} 
              value={tab === 'billing' ? serviceSearch : productSearch} 
              onChange={(e) => tab === 'billing' ? setServiceSearch(e.target.value) : setProductSearch(e.target.value)} 
            />
            <svg className="pos-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="pos-topbar-right">
          <button className={`pos-top-tab ${tab === "billing" ? "active" : ""}`} onClick={() => setTab("billing")}>Add Service</button>
          <button className={`pos-top-tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>Add Product</button>
          <button className={`pos-top-tab ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}>Add Package</button>
          <button className={`pos-top-tab ${tab === "giftcards" ? "active" : ""}`} onClick={() => setTab("giftcards")}>Add GiftCard</button>
          <button className={`pos-top-tab ${tab === "memberships" ? "active" : ""}`} onClick={() => setTab("memberships")}>Add Membership</button>
        </div>
      </div>

      <div className="pos-body">
        {/* LEFT SIDEBAR (1-CLICK CATALOG) */}
        <div className="pos-sidebar">
          <div className="pos-cat-grid">
            {tab === "products" ? (
               <>
                 <button className={`pos-cat-btn ${!productCategoryFilter ? "active" : ""}`} onClick={() => setProductCategoryFilter("")}>ALL</button>
                 {productCategories.slice(0, 7).map(c => <button key={c.id} className={`pos-cat-btn ${productCategoryFilter === (c.id || c.name) ? "active" : ""}`} onClick={() => setProductCategoryFilter(c.id || c.name)}>{c.name}</button>)}
               </>
            ) : (
               <>
                 <button className={`pos-cat-btn ${!serviceCategoryFilter ? "active" : ""}`} onClick={() => setServiceCategoryFilter("")}>ALL</button>
                 {serviceCategories.slice(0, 7).map(c => <button key={c.id} className={`pos-cat-btn ${serviceCategoryFilter === c.name ? "active" : ""}`} onClick={() => setServiceCategoryFilter(c.name)}>{c.name}</button>)}
               </>
            )}
          </div>

          <div className="pos-item-list-container">
            {tab === "products" ? (
               productTileGroups.map(group => (
                 <div key={group.title}>
                   <div className="pos-group-header">{group.title}</div>
                   <div className="pos-item-grid">
                     {group.items.map(product => (
                       <div key={product.id} className="pos-item-card" onClick={() => addQuickProduct(product)}>
                         <div className="pos-item-card-name">{product.name}</div>
                         <div className="pos-item-card-prices">
                           <span className="pos-item-card-price-new">{Number(product.sellingPrice || 0).toFixed(0)}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))
            ) : (
               serviceTileGroups.map(group => (
                 <div key={group.title}>
                   <div className="pos-group-header">{group.title}</div>
                   <div className="pos-item-grid">
                     {group.items.map(service => (
                       <div key={service.id} className="pos-item-card" onClick={() => addQuickService(service)}>
                         <div className="pos-item-card-name">{service.name}</div>
                         <div className="pos-item-card-prices">
                           {service.originalPrice && service.originalPrice > service.price && <span className="pos-item-card-price-old">{Number(service.originalPrice).toFixed(0)}</span>}
                           <span className="pos-item-card-price-new">{Number(service.price || 0).toFixed(0)}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* RIGHT MAIN AREA */}
        <div className="pos-main">
          <div className="pos-invoice-section">
            <div className="pos-invoice-header">
              <h4>Invoice</h4>
              <div className="pos-invoice-date">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>

            <div className="pos-guest-row">
              <div className="pos-search-guest">
                <label>
                  Guest : 
                  <div style={{ position: "relative", flex: 1 }}>
                    <input type="text" placeholder="Search By Name Or No." value={form.customerId ? context.customers.find(c => c.id === form.customerId)?.name || "" : ""} onChange={() => {}} />
                    <svg style={{ position: "absolute", right: 8, top: 10, width: 16, height: 16, color: "#94a3b8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </label>
                {!form.customerId && <div className="pos-guest-error">Please select guest</div>}
              </div>
              <button type="button" className="pos-add-guest-btn">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Add Guest
              </button>
            </div>

            <div className="pos-cart-table-wrapper">
              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Staff</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Sub Total</th>
                    <th>Disc%</th>
                    <th>Disc</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Split</th>
                    <th>Batch</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.filter(item => item.serviceId || item.productId).map((item, index) => {
                    const baseObj = item.itemType === "PRODUCT" ? productLookup[item.productId] : serviceLookup[item.serviceId];
                    if (!baseObj) return null;
                    const price = Number(item.itemType === "PRODUCT" ? baseObj.sellingPrice : baseObj.price) || 0;
                    const qty = Number(item.qty) || 1;
                    const subTotal = price * qty;
                    const tax = (subTotal * Number(item.taxPct || 0)) / 100;
                    const total = subTotal + tax;
                    return (
                      <tr key={index}>
                        <td style={{ color: "#334155" }}>{baseObj.name}</td>
                        <td>
                          {item.itemType === "SERVICE" ? (
                            <select className="pos-cart-select" value={item.staffUserId || ""} onChange={(e) => updateItem(index, { staffUserId: e.target.value })}>
                              <option value="">Assign staff</option>
                              {context.staffUsers.map(u => <option key={u.id} value={u.id}>{u.user?.name}</option>)}
                            </select>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <input className="pos-cart-input" type="number" min="1" value={item.qty} onChange={(e) => updateItem(index, { qty: e.target.value })} />
                        </td>
                        <td>{price.toFixed(0)}</td>
                        <td>{subTotal.toFixed(0)}</td>
                        <td><input className="pos-cart-input" style={{ width: 50 }} placeholder="0" /></td>
                        <td><input className="pos-cart-input" style={{ width: 60 }} placeholder="0" /></td>
                        <td>{tax.toFixed(0)}</td>
                        <td>{total.toFixed(0)}</td>
                        <td><input className="pos-cart-input" style={{ width: 50 }} placeholder="0" /></td>
                        <td><span style={{ color: "#94a3b8" }}>N/A</span></td>
                        <td>
                          <button type="button" className="pos-cart-remove" onClick={() => setForm(c => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.filter(item => item.serviceId || item.productId).length === 0 && (
                    <tr>
                      <td colSpan="12" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                        No items added yet. Click a service or product on the left to add.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pos-grand-total-row">
              <div className="pos-grand-total">
                Grand Total <strong>₹{totals.total.toFixed(0)}</strong>
              </div>
            </div>

            <div className="pos-instruction-row">
              <input placeholder="Add Order Instruction (Optional, Max 500 Characters)" value={form.notes} onChange={(e) => setForm(c => ({ ...c, notes: e.target.value }))} />
            </div>

            <div className="pos-payment-details">
              <h5>Payment Details:</h5>
              <div className="pos-payment-grid">
                <div className="pos-payment-input">
                  <label><svg width="16" height="16" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Online</label>
                  <input type="number" placeholder="0.0" />
                </div>
                <div className="pos-payment-input">
                  <label><svg width="16" height="16" style={{ color: "#64748b" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Offline</label>
                  <input type="number" placeholder="0.0" value={form.payments[0]?.amount || ""} onChange={(e) => {
                    const next = [...form.payments];
                    if(next.length === 0) next.push({ mode: "CASH", amount: 0, note: "" });
                    next[0].amount = e.target.value;
                    next[0].mode = "CASH";
                    setForm(c => ({ ...c, payments: next }));
                  }} />
                </div>
              </div>

              <div className="pos-message-config">
                <h5>Message Configurations:</h5>
                <div className="pos-message-options">
                  <label><input type="checkbox" defaultChecked /> Feedback Message</label>
                  <label><input type="checkbox" defaultChecked /> Invoice Message</label>
                </div>
              </div>
            </div>
          </div>

          <div className="pos-footer-bar">
            <button type="button" className="pos-btn-clear" onClick={() => setForm(c => ({ ...c, items: [] }))}>Clear</button>
            <button type="button" className="pos-btn-create">Create</button>
            <button type="button" className="pos-btn-complete" onClick={submit}>Create & Complete</button>
          </div>
        </div>
      </div>
    </div>
  );
