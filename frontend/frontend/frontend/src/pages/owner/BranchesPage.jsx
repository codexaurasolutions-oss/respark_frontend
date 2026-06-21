import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyForm = { name: "", phone: "", email: "", address: "", businessHours: "", weeklyOff: "" };

export default function BranchesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const heading = useMemo(() => (editingId ? "Update Branch" : "Create Branch"), [editingId]);

  const load = async () => {
    const response = await api.get("/owner/branches");
    setRows(response.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    api.get("/owner/branches").then((response) => {
      if (active) {
        setRows(response.data);
        setStatus((current) => ({ ...current, loading: false }));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      if (editingId) {
        await api.patch(`/owner/branches/${editingId}`, form);
        setStatus({ error: "", success: "Branch updated." });
      } else {
        await api.post("/owner/branches", form);
        setStatus({ error: "", success: "Branch created." });
      }
      resetForm();
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save branch"), success: "" });
    }
  };

  const archiveBranch = async (branchId) => {
    await api.patch(`/owner/branches/${branchId}/archive`);
    if (editingId === branchId) resetForm();
    await load();
  };

  const startEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      phone: branch.phone || "",
      email: branch.email || "",
      address: branch.address || "",
      businessHours: branch.businessHours || "",
      weeklyOff: branch.weeklyOff || ""
    });
  };

  return (
    <div className="page-shell">
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Branches</h1>
        <p style={{ margin: 0 }}>Manage salon locations, operating context, and outlet identity from one coordinated setup screen.</p>
      </div>
      <div className="two-col">
        <div className="panel-card">
          <h3>{heading}</h3>
          <form onSubmit={submit} className="form-grid">
            <label>
              <span className="muted">Branch name</span>
              <input value={form.name} placeholder="Branch name" onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              <span className="muted">Phone</span>
              <input value={form.phone} placeholder="Phone" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              <span className="muted">Email</span>
              <input value={form.email} placeholder="Email" onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              <span className="muted">Address</span>
              <input value={form.address} placeholder="Address" onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <label>
              <span className="muted">Business hours</span>
              <input value={form.businessHours} placeholder="Business hours e.g. 10am - 8pm" onChange={(event) => setForm({ ...form, businessHours: event.target.value })} />
            </label>
            <label>
              <span className="muted">Weekly off</span>
              <input value={form.weeklyOff} placeholder="Weekly off e.g. Sunday" onChange={(event) => setForm({ ...form, weeklyOff: event.target.value })} />
            </label>
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button>{editingId ? "Save Branch" : "Add Branch"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Why branches matter</h3>
          <p className="muted">Branches drive POS selection, service availability, invoices, payments, dashboard filters, and later appointment or inventory flows.</p>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Active Branches</div>
              <div className="stat-value">{rows.length}</div>
            </div>
          </div>
        </div>
      </div>

      {status.loading ? (
        <PageLoader
          title="Loading branch workspace"
          message="Preparing location cards, branch setup, and usage counts across the salon."
        />
      ) : null}

      <div className="list-stack" style={{ marginTop: 18 }}>
        {rows.map((branch) => (
          <div key={branch.id} className={`list-card ${editingId === branch.id ? "active-row" : ""}`}>
            <div className="item-head">
              <div>
                <strong>{branch.name}</strong>
                <div className="item-meta">{branch.phone || "No phone"} | {branch.email || "No email"}</div>
                <div className="item-meta">{branch.address || "No address added"}</div>
                <div className="item-meta">Hours: {branch.businessHours || "Not set"} | Weekly off: {branch.weeklyOff || "Not set"}</div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(branch)}>Edit</button>
                <button type="button" className="danger-button" onClick={() => archiveBranch(branch.id)}>Archive</button>
              </div>
            </div>
            <div className="badge-row">
              <span className="badge">Users {branch._count?.users || 0}</span>
              <span className="badge">Services {branch._count?.services || 0}</span>
              <span className="badge">Invoices {branch._count?.invoices || 0}</span>
            </div>
          </div>
        ))}
        {!status.loading && !rows.length && (
          <EmptyState
            title="No branches yet"
            message="Create the first branch to start assigning services, staff, inventory, and POS activity."
          />
        )}
      </div>
    </div>
  );
}

