import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";

export default function ConsumablesTab({ products, loadAll, branches, selectedBranchId }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", unit: "ml", currentStock: 0, costPrice: 0 });

  const consumables = useMemo(() => {
    return products.filter(p => p.productType === "CONSUMABLE");
  }, [products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ error: "", success: "" });
    try {
      const payload = {
        name: form.name,
        unit: form.unit,
        currentStock: Number(form.currentStock),
        costPrice: Number(form.costPrice),
        sellingPrice: 0, // consumables aren't sold directly
        productType: "CONSUMABLE",
        branchId: selectedBranchId || branches[0]?.id || null,
      };

      if (form.id) {
        await api.patch(`/owner/inventory/products/${form.id}`, payload);
        setStatus({ success: "Consumable updated successfully!", error: "" });
      } else {
        await api.post("/owner/inventory/products", payload);
        setStatus({ success: "Consumable added successfully!", error: "" });
      }
      setIsModalOpen(false);
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this consumable?")) return;
    setLoading(true);
    try {
      await api.patch(`/owner/inventory/products/${id}/archive`);
      setStatus({ success: "Consumable archived successfully!", error: "" });
      loadAll();
    } catch (err) {
      setStatus({ error: formatApiError(err), success: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#0f172a", fontWeight: "700" }}>Consumables</h2>
        <button
          onClick={() => { setForm({ id: null, name: "", unit: "ml", currentStock: 0, costPrice: 0 }); setIsModalOpen(true); }}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f172a", color: "white", padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}
        >
          <Plus size={18} />
          Add Consumable
        </button>
      </div>

      {status.success && <div style={{ background: "#dcfce7", color: "#166534", padding: 12, borderRadius: 8 }}>{status.success}</div>}
      {status.error && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8 }}>{status.error}</div>}

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase" }}>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Name</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Unit</th>
              <th style={{ padding: "12px 24px", fontWeight: 600 }}>Current Stock</th>
              <th style={{ padding: "12px 24px", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {consumables.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "14px 24px", fontSize: "0.95rem", color: "#0f172a", fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#64748b" }}>{c.unit || "N/A"}</td>
                <td style={{ padding: "14px 24px", fontSize: "0.9rem", color: "#64748b" }}>{Number(c.currentStock || 0)}</td>
                <td style={{ padding: "14px 24px", textAlign: "right" }}>
                  <button onClick={() => { setForm({ id: c.id, name: c.name, unit: c.unit || "ml", currentStock: c.currentStock, costPrice: c.costPrice }); setIsModalOpen(true); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#3b82f6", marginRight: 12 }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {consumables.length === 0 && <tr><td colSpan="4" style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No consumables found.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", width: "100%", maxWidth: 400, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>{form.id ? "Edit Consumable" : "Add Consumable"}</h3>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: 6 }}>Name</label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: 6 }}>Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", background: "white" }}>
                  <option value="ml">ml</option>
                  <option value="gm">gm</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: 6 }}>Initial Stock</label>
                  <input type="number" min="0" step="0.01" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "#475569", fontWeight: 600, marginBottom: 6 }}>Cost Price (per {form.unit})</label>
                  <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 16px", background: "white", border: "1px solid #cbd5e1", borderRadius: 8, color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ padding: "10px 16px", background: "#0f172a", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
