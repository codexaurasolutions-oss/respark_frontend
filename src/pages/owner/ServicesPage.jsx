import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyForm = {
  name: "",
  price: 0,
  durationMin: 30,
  branchId: "",
  description: "",
  taxRate: 0,
  commissionPct: 0,
  onlineBookingEnabled: false,
  isFeatured: false,
  isPopular: false
};

export default function ServicesPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const title = useMemo(() => (editingId ? "Update Service" : "Add Service"), [editingId]);

  const load = async (branchId = selectedBranch) => {
    const [servicesResponse, branchesResponse] = await Promise.all([
      api.get("/owner/services", { params: branchId ? { branchId } : {} }),
      api.get("/owner/branches")
    ]);
    setRows(servicesResponse.data);
    setBranches(branchesResponse.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/services"),
      api.get("/owner/branches")
    ]).then(([servicesResponse, branchesResponse]) => {
      if (!active) return;
      setRows(servicesResponse.data);
      setBranches(branchesResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = selectedBranch ? { branchId: selectedBranch } : {};
    Promise.all([
      api.get("/owner/services", { params }),
      api.get("/owner/branches")
    ]).then(([servicesResponse, branchesResponse]) => {
      if (!active) return;
      setRows(servicesResponse.data);
      setBranches(branchesResponse.data);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, [selectedBranch]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    const payload = {
      ...form,
      price: Number(form.price),
      durationMin: Number(form.durationMin),
      branchId: form.branchId || undefined,
      taxRate: Number(form.taxRate || 0),
      commissionPct: Number(form.commissionPct || 0)
    };
    try {
      if (editingId) {
        await api.patch(`/owner/services/${editingId}`, payload);
        setStatus({ error: "", success: "Service updated." });
      } else {
        await api.post("/owner/services", payload);
        setStatus({ error: "", success: "Service added." });
      }
      resetForm();
      await load(selectedBranch);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save service"), success: "" });
    }
  };

  const archiveService = async (serviceId) => {
    await api.patch(`/owner/services/${serviceId}/archive`);
    if (editingId === serviceId) resetForm();
    await load(selectedBranch);
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      price: Number(service.price || 0),
      durationMin: Number(service.durationMin || 30),
      branchId: service.branchId || "",
      description: service.description || "",
      taxRate: Number(service.taxRate || 0),
      commissionPct: Number(service.commissionPct || 0),
      onlineBookingEnabled: Boolean(service.onlineBookingEnabled),
      isFeatured: Boolean(service.isFeatured),
      isPopular: Boolean(service.isPopular)
    });
  };

  const branchLabel = selectedBranch ? branches.find((item) => item.id === selectedBranch)?.name : "All";

  return (
    <div className="page-shell">
      <div className="item-head" style={{ marginBottom: 18 }}>
        <div>
          <h2>Services</h2>
          <p className="muted">Services stay branch-aware so POS, invoices, and reports always use the right active catalog.</p>
        </div>
        <div>
          <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="settings-section-grid">
        <div className="panel-card">
          <h3>{title}</h3>
          <form onSubmit={submit} className="form-grid">
            <input placeholder="Service name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input type="number" min="0" placeholder="Price" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            <input type="number" min="1" placeholder="Duration (minutes)" value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: event.target.value })} />
            <select value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
              <option value="">All branches / salon wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <input type="number" min="0" placeholder="Tax rate %" value={form.taxRate} onChange={(event) => setForm({ ...form, taxRate: event.target.value })} />
            <input type="number" min="0" placeholder="Commission %" value={form.commissionPct} onChange={(event) => setForm({ ...form, commissionPct: event.target.value })} />
            <textarea style={{ gridColumn: "1 / -1" }} rows="4" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <div className="badge-row" style={{ gridColumn: "1 / -1" }}>
              <label className="badge" style={{ gap: 8 }}><input type="checkbox" checked={form.onlineBookingEnabled} onChange={(event) => setForm({ ...form, onlineBookingEnabled: event.target.checked })} />Online booking</label>
              <label className="badge" style={{ gap: 8 }}><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />Featured</label>
              <label className="badge" style={{ gap: 8 }}><input type="checkbox" checked={form.isPopular} onChange={(event) => setForm({ ...form, isPopular: event.target.checked })} />Popular</label>
            </div>
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button>{editingId ? "Save Service" : "Create Service"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Catalog Summary</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Visible Services</div>
              <div className="stat-value">{rows.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Branch Filter</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{branchLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {status.loading ? (
        <PageLoader
          title="Loading service catalog"
          message="Refreshing branch-aware services, pricing, duration, and booking visibility controls."
        />
      ) : null}

      <div className="list-stack" style={{ marginTop: 18 }}>
        {rows.map((service) => (
          <div key={service.id} className={`list-card ${editingId === service.id ? "active-row" : ""}`}>
            <div className="item-head">
              <div>
                <strong>{service.name}</strong>
                <div className="item-meta">Price {String(service.price)} | Duration {service.durationMin} min | Tax {String(service.taxRate || 0)}%</div>
                <div className="item-meta">{service.branch?.name || "Available across branches"}</div>
                <div className="item-meta">Commission {String(service.commissionPct || 0)}% | Booking {service.onlineBookingEnabled ? "Enabled" : "Disabled"}</div>
                <div className="item-meta">{service.description || "No description added"}</div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(service)}>Edit</button>
                <button type="button" className="danger-button" onClick={() => archiveService(service.id)}>Archive</button>
              </div>
            </div>
            <div className="badge-row">
              {service.isFeatured && <span className="badge">Featured</span>}
              {service.isPopular && <span className="badge">Popular</span>}
            </div>
          </div>
        ))}
        {!status.loading && !rows.length && (
          <EmptyState
            title="No services found"
            message="No service entries match the selected branch scope right now."
          />
        )}
      </div>
    </div>
  );
}

