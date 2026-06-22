import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ChevronLeft, Save, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";

const emptyVendor = {
  name: "",
  firmName: "",
  phone: "",
  alternateMobile: "",
  email: "",
  gstNumber: "",
  address: "",
  area: "",
  landmark: "",
  city: "",
  pincode: "",
  notes: "",
  isActive: true,
  branchId: ""
};

const normalizeDisplayPhone = (value) => {
  if (!value) return "";
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.startsWith("91") && digits.length >= 12) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

const toApiPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return "";
  return `+91${digits}`;
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: "0.95rem",
  boxSizing: "border-box",
  background: "white",
  outline: "none"
};

const labelStyle = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#475569",
  marginBottom: 6
};

const formGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

function Toggle({ checked, onChange, activeLabel = "Active", inactiveLabel = "Inactive" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: checked ? "#3b82f6" : "#64748b" }}>
        {checked ? activeLabel : inactiveLabel}
      </span>
      <button
        type="button"
        onClick={onChange}
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          border: "none",
          background: checked ? "#3b82f6" : "#cbd5e1",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.25s ease",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)"
        }}
        aria-checked={checked}
        role="switch"
      >
        <span style={{
          display: "block",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "white",
          position: "absolute",
          top: 3,
          left: checked ? 27 : 3,
          transition: "left 0.25s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
        }} />
      </button>
    </div>
  );
}

function PhoneInput({ label, required, value, onChange, placeholder }) {
  const digits = value.replace(/\D/g, "");
  const isInvalid = value && digits.length !== 10;
  return (
    <div style={formGroupStyle}>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <div style={{ display: "flex", border: `1px solid ${isInvalid ? "#ef4444" : "#cbd5e1"}`, borderRadius: 8, overflow: "hidden", background: "white" }}>
        <span style={{ padding: "12px 10px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: "0.95rem", borderRight: "1px solid #cbd5e1", display: "flex", alignItems: "center" }}>
          +91
        </span>
        <input
          type="tel"
          maxLength={10}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder={placeholder || "XXXXXXXXXX"}
          style={{ flex: 1, border: "none", padding: "12px 14px", fontSize: "0.95rem", outline: "none", background: "transparent" }}
        />
      </div>
      {isInvalid && <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>Enter exactly 10 digits</span>}
    </div>
  );
}

function TextInput({ label, required, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={formGroupStyle}>
      <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

export default function VendorManagement({ branches = [], formatMoney }) {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [form, setForm] = useState(emptyVendor);
  const [mode, setMode] = useState("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [vendorItems, setVendorItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemPrice, setItemPrice] = useState("");

  useEffect(() => {
    loadVendors();
    api.get("/owner/inventory/products").then(res => setProducts(res.data || [])).catch(console.error);
  }, []);

  const loadVendors = async () => {
    try {
      const res = await api.get("/owner/purchases/vendors");
      setVendors(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(v =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.firmName || "").toLowerCase().includes(q) ||
      (v.phone || "").includes(q)
    );
  }, [vendors, search]);

  const filteredProducts = useMemo(() => {
    if (!itemSearch.trim()) return [];
    const q = itemSearch.toLowerCase();
    const existingIds = new Set(vendorItems.map(vi => vi.productId));
    return products
      .filter(p =>
        !existingIds.has(p.id) &&
        (p.name || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [products, itemSearch, vendorItems]);

  const resetForm = () => setForm(emptyVendor);

  const handleCreate = () => {
    resetForm();
    setSelectedVendor(null);
    setMode("create");
    setStatus({ error: "", success: "" });
  };

  const handleSelect = (vendor) => {
    setSelectedVendor(vendor);
    setForm({
      name: vendor.name || "",
      firmName: vendor.firmName || "",
      phone: normalizeDisplayPhone(vendor.phone || ""),
      alternateMobile: normalizeDisplayPhone(vendor.alternateMobile || ""),
      email: vendor.email || "",
      gstNumber: vendor.gstNumber || "",
      address: vendor.address || "",
      area: vendor.area || "",
      landmark: vendor.landmark || "",
      city: vendor.city || "",
      pincode: vendor.pincode || "",
      notes: vendor.notes || "",
      isActive: vendor.isActive !== false,
      branchId: vendor.branchId || ""
    });
    setMode("edit");
    setStatus({ error: "", success: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setStatus({ error: "Mobile number must be exactly 10 digits", success: "" });
      return;
    }
    if (form.alternateMobile && form.alternateMobile.replace(/\D/g, "").length !== 10) {
      setStatus({ error: "Alternate mobile number must be exactly 10 digits", success: "" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        phone: toApiPhone(form.phone),
        alternateMobile: form.alternateMobile ? toApiPhone(form.alternateMobile) : ""
      };
      if (selectedVendor) {
        await api.patch(`/owner/purchases/vendors/${selectedVendor.id}`, payload);
        setStatus({ success: "Vendor updated successfully!", error: "" });
      } else {
        await api.post("/owner/purchases/vendors", payload);
        setStatus({ success: "Vendor created successfully!", error: "" });
      }
      await loadVendors();
      if (!selectedVendor) {
        resetForm();
      }
    } catch (error) {
      setStatus({ error: formatApiError(error), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const loadVendorItems = async (vendorId) => {
    try {
      const res = await api.get(`/owner/purchases/vendors/${vendorId}/items`);
      setVendorItems(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenItems = (vendor) => {
    setSelectedVendor(vendor);
    setMode("items");
    setItemSearch("");
    setSelectedProduct(null);
    setItemPrice("");
    loadVendorItems(vendor.id);
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;
    try {
      await api.post(`/owner/purchases/vendors/${selectedVendor.id}/items`, {
        productId: selectedProduct.id,
        price: Number(itemPrice || 0),
        isActive: true
      });
      setItemSearch("");
      setSelectedProduct(null);
      setItemPrice("");
      await loadVendorItems(selectedVendor.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateItem = async (item) => {
    try {
      await api.patch(`/owner/purchases/vendor-items/${item.id}`, {
        price: Number(item.price || 0),
        isActive: item.isActive
      });
      await loadVendorItems(selectedVendor.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm("Delete this vendor item?")) return;
    try {
      await api.delete(`/owner/purchases/vendor-items/${item.id}`);
      await loadVendorItems(selectedVendor.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 140px)", background: "#f1f5f9", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      {/* LEFT SIDEBAR */}
      <div style={{ width: 320, background: "white", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                placeholder="Search By Firm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", paddingLeft: 32, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }}
              />
              <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "#94a3b8" }} />
            </div>
          </div>
          <button
            onClick={handleCreate}
            style={{ width: "100%", padding: "10px 12px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Plus size={16} /> Create
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => handleSelect(vendor)}
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #f1f5f9",
                cursor: "pointer",
                background: selectedVendor?.id === vendor.id ? "#eff6ff" : "white",
                borderLeft: selectedVendor?.id === vendor.id ? "3px solid #3b82f6" : "3px solid transparent"
              }}
            >
              <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>{vendor.firmName || vendor.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{vendor.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{vendor.phone || "No phone"}</div>
            </div>
          ))}
          {filteredVendors.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
              No vendors found.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f8fafc" }}>
        {mode === "list" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Vendor Management</div>
            <div style={{ fontSize: "0.9rem" }}>Select a vendor from the list or create a new one.</div>
          </div>
        )}

        {(mode === "create" || mode === "edit") && (
          <div style={{ maxWidth: 900, margin: "0 auto", background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.3rem", color: "var(--accent, #3b82f6)", fontWeight: 600 }}>{mode === "create" ? "Create Vendor" : "Update Vendor"}</h2>
              <Toggle
                checked={form.isActive}
                onChange={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              />
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              {status.error && <div style={{ color: "#ef4444", padding: 12, background: "#fef2f2", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>{status.error}</div>}
              {status.success && <div style={{ color: "#10b981", padding: 12, background: "#f0fdf4", borderRadius: 8, fontSize: "0.9rem", marginBottom: 16 }}>{status.success}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px 20px", marginBottom: 24 }}>
                <TextInput label="Vendor Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Name*" />
                <TextInput label="Firm Name" required value={form.firmName} onChange={(v) => setForm({ ...form, firmName: v })} placeholder="Firm Name*" />

                <PhoneInput
                  label="Mobile"
                  required
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="XXXXXXXXXX"
                />
                <PhoneInput
                  label="Alternate Mobile"
                  value={form.alternateMobile}
                  onChange={(v) => setForm({ ...form, alternateMobile: v })}
                  placeholder="XXXXXXXXXX"
                />

                <TextInput label="Email" required type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="Email*" />
                <TextInput label="GST Number" value={form.gstNumber} onChange={(v) => setForm({ ...form, gstNumber: v })} placeholder="GstNo" />

                <div style={{ ...formGroupStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Address <span style={{ color: "#ef4444" }}>*</span></label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address*" style={inputStyle} />
                </div>

                <TextInput label="Area" value={form.area} onChange={(v) => setForm({ ...form, area: v })} placeholder="Area" />
                <TextInput label="Landmark" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} placeholder="Landmark" />

                <TextInput label="City" required value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="City*" />
                <TextInput label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} placeholder="Pincode" />

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Branch</label>
                  <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} style={inputStyle}>
                    <option value="">Salon wide</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
                <TextInput label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Notes" />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
                {mode === "edit" && (
                  <button type="button" onClick={() => handleOpenItems(selectedVendor)} style={{ padding: "12px 24px", background: "white", border: "1px solid var(--accent, #3b82f6)", color: "var(--accent, #3b82f6)", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                    Vendor Items
                  </button>
                )}
                <button type="button" onClick={() => setMode("list")} style={{ padding: "12px 24px", background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ padding: "12px 32px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {mode === "create" ? "Create" : "Update"}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "items" && (
          <div style={{ maxWidth: 900, margin: "0 auto", background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setMode("edit")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <ChevronLeft size={20} />
              </button>
              <h2 style={{ margin: 0, fontSize: "1.3rem", color: "var(--accent, #3b82f6)", fontWeight: 600 }}>Update Vendor Items</h2>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 24 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <label style={labelStyle}>Item</label>
                  <input
                    placeholder="Search Item By Name"
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setSelectedProduct(null); }}
                    style={inputStyle}
                  />
                  {filteredProducts.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto", zIndex: 10 }}>
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setItemSearch(p.name); }}
                          style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ width: 120 }}>
                  <label style={labelStyle}>Price</label>
                  <input type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
                <button
                  onClick={handleAddItem}
                  disabled={!selectedProduct}
                  style={{ padding: "12px 24px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: selectedProduct ? "pointer" : "not-allowed", opacity: selectedProduct ? 1 : 0.6 }}
                >
                  Add
                </button>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#e0f2fe", color: "#0f172a", fontSize: "0.9rem" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Sr.No.</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Item Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Price</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>Active</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>{idx + 1}.</td>
                      <td style={{ padding: "12px 16px" }}>{item.product?.name}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => {
                            const next = [...vendorItems];
                            next[idx].price = e.target.value;
                            setVendorItems(next);
                          }}
                          style={{ width: 80, padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6 }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={item.isActive !== false}
                          onChange={(e) => {
                            const next = [...vendorItems];
                            next[idx].isActive = e.target.checked;
                            setVendorItems(next);
                          }}
                          style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button onClick={() => handleUpdateItem(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent, #3b82f6)", marginRight: 8 }}>
                          <Save size={18} />
                        </button>
                        <button onClick={() => handleDeleteItem(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {vendorItems.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No items added for this vendor.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button onClick={() => setMode("edit")} style={{ padding: "12px 24px", background: "white", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                  Back
                </button>
                <button onClick={() => setMode("edit")} style={{ padding: "12px 32px", background: "var(--button-bg-solid, #3b82f6)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
