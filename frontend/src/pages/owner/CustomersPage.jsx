import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import { formatApiError } from "../../utils/apiError";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  source: "",
  tagsText: "",
  notes: "",
  preferences: "",
  allergies: "",
  skinNotes: ""
};

const formatDateInput = (value) => (value ? String(value).slice(0, 10) : "");

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [branchId, setBranchId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState({ error: "", success: "", loading: true });

  const load = async (searchText = query, activeFilter = filter, activeBranchId = branchId) => {
    const params = {};
    if (searchText) params.q = searchText;
    if (activeFilter) params.filter = activeFilter;
    if (activeBranchId) params.branchId = activeBranchId;
    const response = await api.get("/owner/customers", { params });
    setRows(response.data);
    setStatus((current) => ({ ...current, loading: false }));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/owner/customers"),
      api.get("/owner/branches")
    ]).then(([customersResponse, branchesResponse]) => {
      if (!active) return;
      setRows(customersResponse.data);
      setBranches(branchesResponse.data || []);
      setStatus((current) => ({ ...current, loading: false }));
    });
    return () => {
      active = false;
    };
  }, []);

  const openDetail = async (customerId) => {
    const response = await api.get(`/owner/customers/${customerId}/history`);
    setSelectedCustomer(response.data);
  };

  const toPayload = () => ({
    name: form.name,
    phone: form.phone,
    email: form.email,
    gender: form.gender || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    source: form.source || undefined,
    tags: form.tagsText.split(",").map((item) => item.trim()).filter(Boolean),
    notes: form.notes,
    preferences: form.preferences || undefined,
    allergies: form.allergies || undefined,
    skinNotes: form.skinNotes || undefined
  });

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      if (editingId) {
        await api.patch(`/owner/customers/${editingId}`, toPayload());
        setStatus({ error: "", success: "Customer updated." });
      } else {
        await api.post("/owner/customers", toPayload());
        setStatus({ error: "", success: "Customer added." });
      }
      const currentEditingId = editingId;
      setForm(emptyForm);
      setEditingId("");
      await load(query);
      if (selectedCustomer && selectedCustomer.id === currentEditingId) {
        await openDetail(currentEditingId);
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save customer"), success: "" });
    }
  };

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      gender: customer.gender || "",
      dateOfBirth: formatDateInput(customer.dateOfBirth),
      source: customer.source || "",
      tagsText: Array.isArray(customer.tags) ? customer.tags.join(", ") : "",
      notes: customer.notes || "",
      preferences: customer.preferences || "",
      allergies: customer.allergies || "",
      skinNotes: customer.skinNotes || ""
    });
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Customers"
        description="CRM, billing memory, and lifecycle data in one searchable customer workspace."
        items={[
          { label: "Customer List", to: "/admin/customers", hint: "CRM" },
          { label: "History View", to: selectedCustomer ? `/admin/customers/${selectedCustomer.id}/history` : "/admin/customers", hint: "Timeline" }
        ]}
        actions={(
          <>
            <input value={query} placeholder="Search by name, phone, email, or source" onChange={(event) => setQuery(event.target.value)} />
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">All customers</option>
              <option value="high_spender">High spenders</option>
              <option value="lost_customer">Lost customers</option>
              <option value="birthday_month">Birthdays this month</option>
              <option value="anniversary_month">Anniversaries this month</option>
              <option value="active_membership">Active memberships</option>
              <option value="active_package">Active packages</option>
            </select>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <button type="button" className="secondary-button" onClick={() => load(query, filter, branchId)}>Search</button>
            <button type="button" className="secondary-button" onClick={() => { setQuery(""); setFilter(""); setBranchId(""); load("", "", ""); }}>Reset</button>
          </>
        )}
      />

      <div className="two-col">
        <div className="panel-card">
          <h3>{editingId ? "Update Customer" : "Add Customer"}</h3>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input value={form.name} placeholder="Customer name" onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <input value={form.phone} placeholder="Phone" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              <input value={form.email} placeholder="Email" onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                <option value="">Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <input value={form.source} placeholder="Lead source (walk-in, Instagram, referral)" onChange={(event) => setForm({ ...form, source: event.target.value })} />
            </div>
            <label>
              <span className="muted">Date of birth</span>
              <input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
            </label>
            <input value={form.tagsText} placeholder="Tags separated by commas" onChange={(event) => setForm({ ...form, tagsText: event.target.value })} />
            <textarea rows="3" value={form.preferences} placeholder="Customer preferences" onChange={(event) => setForm({ ...form, preferences: event.target.value })} />
            <textarea rows="3" value={form.allergies} placeholder="Allergies" onChange={(event) => setForm({ ...form, allergies: event.target.value })} />
            <textarea rows="3" value={form.skinNotes} placeholder="Skin / treatment notes" onChange={(event) => setForm({ ...form, skinNotes: event.target.value })} />
            <textarea rows="4" value={form.notes} placeholder="Notes" onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            <div className="form-actions">
              <button>{editingId ? "Save Customer" : "Add Customer"}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(""); setForm(emptyForm); }}>Cancel Edit</button>}
            </div>
          </form>
          {status.error && <p className="error-text">{status.error}</p>}
          {status.success && <p className="success-text">{status.success}</p>}
        </div>

        <div className="panel-card">
          <h3>Customer History</h3>
          {!selectedCustomer && <EmptyState title="Select a customer" message="Pick any customer from the list to inspect timeline, invoices, notes, and loyalty activity." />}
          {selectedCustomer && (
            <>
              <strong>{selectedCustomer.name}</strong>
              <div className="item-meta">{selectedCustomer.phone} | {selectedCustomer.email || "No email"}</div>
              <div className="item-meta">
                {[selectedCustomer.gender, selectedCustomer.source].filter(Boolean).join(" | ") || "No demographic/source metadata"}
              </div>
              <div className="item-meta">DOB {formatDateInput(selectedCustomer.dateOfBirth) || "-"}</div>
              <div className="item-meta">Last visit {formatDateInput(selectedCustomer.lastVisitAt) || "-"} | Spend {Number(selectedCustomer.totalSpend || 0).toFixed(2)} | Avg {Number(selectedCustomer.averageSpend || 0).toFixed(2)}</div>
              <div className="item-meta">{selectedCustomer.preferences || "No customer preferences added"}</div>
              <div className="item-meta">{selectedCustomer.allergies || "No allergies recorded"}</div>
              <div className="item-meta">{selectedCustomer.skinNotes || "No skin/treatment notes added"}</div>
              <div className="item-meta">{selectedCustomer.notes || "No notes added"}</div>
              <div className="badge-row" style={{ marginTop: 8 }}>
                {(selectedCustomer.tags || []).map((tag, index) => (
                  <span key={`${selectedCustomer.id}-${tag}-${index}`} className="badge">{tag}</span>
                ))}
                {!selectedCustomer.tags?.length && <span className="muted">No tags yet</span>}
              </div>
              <div className="form-actions" style={{ marginTop: 12 }}>
                <Link to={`/admin/customers/${selectedCustomer.id}/history`} className="cta-secondary">Open Full Timeline</Link>
              </div>
              <div className="list-stack" style={{ marginTop: 12 }}>
                {selectedCustomer.invoices.map((invoice) => (
                  <div key={invoice.id} className="list-item">
                    <div className="item-head">
                      <strong>{invoice.invoiceNumber}</strong>
                      <span className={`badge badge-${String(invoice.status).toLowerCase()}`}>{invoice.status}</span>
                    </div>
                    <div className="item-meta">{invoice.branch?.name || "Main salon"} | Total {String(invoice.total)} | Paid {String(invoice.paidAmount)}</div>
                    <div className="badge-row">
                      {invoice.items.map((item) => (
                        <span key={item.id} className="badge">{item.serviceName} x {item.qty}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {!selectedCustomer.invoices.length && <EmptyState title="No invoices yet" message="This customer has not generated any invoice history yet." />}
              </div>
            </>
          )}
        </div>
      </div>

      {status.loading ? (
        <PageLoader
          title="Loading customer workspace"
          message="Preparing CRM search, customer cards, and detailed history for this branch scope."
        />
      ) : null}

      <div className="list-stack" style={{ marginTop: 18 }}>
        {rows.map((row) => (
          <div key={row.id} className={`list-card ${selectedCustomer?.id === row.id ? "active-row" : ""}`}>
            <div className="item-head">
              <div>
                <strong>{row.name}</strong>
                <div className="item-meta">{row.phone} | {row.email || "No email"}</div>
                <div className="item-meta">{[row.gender, row.source].filter(Boolean).join(" | ") || "No source/gender metadata"}</div>
                <div className="item-meta">Last visit {formatDateInput(row.lastVisitAt) || "-"} | Spend {Number(row.totalSpend || 0).toFixed(2)} | Avg {Number(row.averageSpend || 0).toFixed(2)}</div>
                <div className="item-meta">{row.preferences || row.notes || "No notes"}</div>
              </div>
              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => openDetail(row.id)}>View History</button>
                <Link to={`/admin/customers/${row.id}/history`} className="cta-secondary">Open Timeline</Link>
                <button type="button" className="secondary-button" onClick={() => startEdit(row)}>Edit</button>
              </div>
            </div>
            <div className="badge-row">
              {(row.tags || []).map((tag, index) => (
                <span key={`${row.id}-${tag}-${index}`} className="badge">{tag}</span>
              ))}
            </div>
          </div>
        ))}
        {!status.loading && !rows.length && <EmptyState title="No customers found" message="Try a different search, branch, or CRM filter to widen the result set." />}
      </div>
    </div>
  );
}

