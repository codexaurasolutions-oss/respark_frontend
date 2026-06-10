import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";

const emptyForm = {
  title: "",
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10)
};

export default function ExpensesPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "", branchId: "" });
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState(true);

  const mode = location.pathname.includes("/categories")
    ? "categories"
    : location.pathname.includes("/reports")
      ? "reports"
      : "expenses";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseResponse, categoryResponse, reportResponse] = await Promise.all([
        api.get("/owner/expenses", {
          params: {
            ...(filters.q ? { q: filters.q } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.branchId ? { branchId: filters.branchId } : {})
          }
        }),
        api.get("/owner/expense-categories"),
        api.get("/owner/expenses/reports")
      ]);
      setRows(expenseResponse.data || []);
      setCategories(categoryResponse.data || []);
      setReport(reportResponse.data || null);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load expenses"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/expenses", { ...form, amount: Number(form.amount) });
      setForm(emptyForm);
      setStatus({ error: "", success: "Expense saved." });
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save expense"), success: "" });
    }
  };

  return (
    <div className="page-shell">
      <ModuleTabs
        title="Expenses"
        description="Branch expenses, approvals and profit/loss impact."
        items={[
          { label: "Expenses", to: "/admin/expenses" },
          { label: "Categories", to: "/admin/expenses/categories" },
          { label: "Reports", to: "/admin/expenses/reports" }
        ]}
      />
      <div className="hero-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="item-head">
          <div>
            <h1 style={{ marginTop: 0 }}>Expenses</h1>
            <p style={{ marginBottom: 0 }}>Track outgoing spend, category structure, approvals, and reporting impact across branches.</p>
          </div>
          <div className="badge-row">
            <span className="badge">Expenses {rows.length}</span>
            <span className="badge">Categories {categories.length}</span>
            <span className="badge">{mode === "reports" ? "Reports" : "Workspace"}</span>
          </div>
        </div>
      </div>
      {status.error && <div className="panel-card"><p className="error-text">{status.error}</p></div>}
      {status.success && <div className="panel-card"><p className="success-text">{status.success}</p></div>}
      {loading && <PageLoader title="Loading expenses workspace" message="Preparing expense records, category setup, and reporting context." />}

      {!loading && mode === "expenses" && (
        <div className="panel-card">
          <h3>Add Expense</h3>
          <form className="form-grid" onSubmit={save}>
            <label>
              <span className="muted">Title</span>
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              <span className="muted">Amount</span>
              <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
            <button>Save Expense</button>
          </form>
          <div className="form-grid" style={{ marginTop: 16, marginBottom: 16 }}>
            <label>
              <span className="muted">Search title, notes, or payment mode</span>
              <input value={filters.q} placeholder="Search title, notes, or payment mode" onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))} />
            </label>
            <label>
              <span className="muted">Statuses</span>
              <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAID">Paid</option>
            </select>
            </label>
            <label>
              <span className="muted">Filter by branch id</span>
              <input value={filters.branchId} placeholder="Filter by branch id" onChange={(e) => setFilters((current) => ({ ...current, branchId: e.target.value }))} />
            </label>
            <button type="button" className="secondary-button" onClick={() => setFilters({ q: "", status: "", branchId: "" })}>Reset</button>
          </div>
          <div className="list-stack" style={{ marginTop: 16 }}>
            {rows.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.title}</strong>
                <div className="item-meta">{row.amount} | {row.status}</div>
              </div>
            ))}
            {!rows.length && <EmptyState title="No expenses found" message="Add the first expense or widen your filters to see branch spending records." />}
          </div>
        </div>
      )}

      {!loading && mode === "categories" && (
        <div className="panel-card">
          <h3>Expense Categories</h3>
          <div className="list-stack">
            {categories.map((row) => (
              <div key={row.id} className="list-item">
                <strong>{row.name}</strong>
                <div className="item-meta">{row.description || "No description"}</div>
              </div>
            ))}
            {!categories.length && <EmptyState title="No expense categories yet" message="Category structure will appear here once expense taxonomy is configured." />}
          </div>
        </div>
      )}

      {!loading && mode === "reports" && report && (
        <div className="panel-card">
          <h3>Expense Reports</h3>
          <div className="badge-row">
            <span className="badge">Total {report.total || 0}</span>
            <span className="badge">Approved {(report.approved || []).length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
