import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { formatApiError } from "../../utils/apiError";
import { 
  Receipt, Wallet, PieChart, Search, Filter, FolderKanban, PlusCircle, 
  Calendar, CheckCircle2, Clock, AlertCircle, XCircle 
} from "lucide-react";

const emptyForm = {
  title: "",
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10)
};

const emptyCategoryForm = {
  name: "",
  description: ""
};

export default function ExpensesPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "", branchId: "" });
  const [form, setForm] = useState(emptyForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
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
      setStatus({ error: "", success: "Expense successfully recorded." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save expense"), success: "" });
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    try {
      await api.post("/owner/expense-categories", categoryForm);
      setCategoryForm(emptyCategoryForm);
      setStatus({ error: "", success: "Expense category successfully created." });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await load();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not save expense category"), success: "" });
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'PENDING': return { bg: '#fef3c7', text: '#b45309', icon: <Clock size={12} /> };
      case 'APPROVED': return { bg: '#e0e7ff', text: '#4338ca', icon: <CheckCircle2 size={12} /> };
      case 'REJECTED': return { bg: '#fee2e2', text: '#b91c1c', icon: <XCircle size={12} /> };
      case 'PAID': return { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={12} /> };
      default: return { bg: '#f1f5f9', text: '#475569', icon: null };
    }
  };

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        
        .ex-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s; }
        .ex-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); border-color: #cbd5e1; }
        
        .ex-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: all 0.2s; background: #fff; }
        .ex-input:focus { border-color: #ea580c; box-shadow: 0 0 0 4px rgba(234,88,12,0.1); }
        .ex-label { display: block; font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .ex-btn { padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .ex-btn-primary { background: linear-gradient(135deg, #ea580c, #c2410c); color: white; box-shadow: 0 4px 12px rgba(234,88,12,0.25); }
        .ex-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(234,88,12,0.35); }
        
        .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 4px; }
      `}</style>

      <ModuleTabs
        title="Expenses"
        items={[
          { label: "Expenses", to: "/admin/expenses" },
          { label: "Categories", to: "/admin/expenses/categories" },
          { label: "Reports", to: "/admin/expenses/reports" }
        ]}
      />

      {/* ── PREMIUM HERO HEADER ── */}
      <div className="anim-fade" style={{ background: "linear-gradient(135deg, #431407, #7c2d12)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <Receipt size={32} color="#fdba74" />
            Expenses Ledger
          </h1>
          <p style={{ margin: 0, color: "#fed7aa", fontSize: 15, maxWidth: 500 }}>Track outgoing spend, manage categories, and oversee approvals across all branches.</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", color: "white", padding: "12px 24px", borderRadius: 20, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,0.2)" }}>
          <Wallet size={20} /> Recorded: {rows.length}
        </div>
      </div>

      {status.error && <div className="anim-fade" style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><AlertCircle size={20} /> {status.error}</div>}
      {status.success && <div className="anim-fade" style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, marginBottom: 24, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={20} /> {status.success}</div>}

      {loading && <PageLoader title="Loading Expense Data" message="Syncing records and categories..." />}

      {!loading && mode === "expenses" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "start" }}>
          
          {/* Add Expense Form */}
          <div className="ex-card anim-fade delay-1">
            <h3 style={{ margin: "0 0 24px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><PlusCircle size={20} color="#ea580c" /> Record Expense</h3>
            <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
              <div>
                <label className="ex-label">Title / Description</label>
                <div style={{ position: "relative" }}>
                  <Receipt size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <input className="ex-input" style={{ paddingLeft: 40 }} placeholder="e.g. Office Supplies" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="ex-label">Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: 11, color: "#94a3b8", fontWeight: 700 }}>₹</span>
                  <input type="number" className="ex-input" style={{ paddingLeft: 40 }} placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="ex-label">Date</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={16} color="#94a3b8" style={{ position: "absolute", left: 14, top: 13 }} />
                  <input type="date" className="ex-input" style={{ paddingLeft: 40 }} value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
                </div>
              </div>
              <button className="ex-btn ex-btn-primary" style={{ width: "100%", marginTop: 8 }}><PlusCircle size={18} /> Save Record</button>
            </form>
          </div>

          {/* Ledger List */}
          <div className="ex-card anim-fade delay-2" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><FolderKanban size={20} color="#ea580c" /> Ledger Overview</h3>
                <button onClick={() => setFilters({ q: "", status: "", branchId: "" })} style={{ border: "none", background: "none", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Reset Filters</button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                  <input className="ex-input" style={{ paddingLeft: 36, padding: "10px 10px 10px 36px", fontSize: 13 }} placeholder="Search expenses..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                </div>
                <div style={{ position: "relative" }}>
                  <Filter size={14} color="#94a3b8" style={{ position: "absolute", left: 12, top: 12 }} />
                  <select className="ex-input" style={{ paddingLeft: 36, padding: "10px 10px 10px 36px", fontSize: 13 }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                <input className="ex-input" style={{ padding: 10, fontSize: 13 }} placeholder="Branch ID" value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })} />
              </div>
            </div>
            
            <div>
              {rows.map((row) => (
                <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 4 }}>{row.title}</strong>
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} /> {new Date(row.expenseDate).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>₹{Number(row.amount || 0).toLocaleString()}</div>
                    <span className="status-pill" style={{ background: getStatusColor(row.status).bg, color: getStatusColor(row.status).text }}>
                      {getStatusColor(row.status).icon} {row.status}
                    </span>
                  </div>
                </div>
              ))}
              {!rows.length && <div style={{ padding: 40 }}><EmptyState title="No expenses matched" message="Try adjusting your search filters or add a new expense." /></div>}
            </div>
          </div>

        </div>
      )}

      {!loading && mode === "categories" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, maxWidth: 1100, margin: "0 auto" }}>
          <div className="ex-card anim-fade delay-1">
            <h3 style={{ margin: "0 0 24px", fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}><PlusCircle size={20} color="#ea580c" /> Add Expense Category</h3>
            <form onSubmit={saveCategory} style={{ display: "grid", gap: 16 }}>
              <div>
                <label className="ex-label">Category Name</label>
                <input className="ex-input" placeholder="e.g. Utilities" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="ex-label">Description</label>
                <textarea className="ex-input" rows="4" placeholder="Optional notes for this category" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
              </div>
              <button className="ex-btn ex-btn-primary" style={{ width: "100%" }}><PlusCircle size={18} /> Save Category</button>
            </form>
          </div>
          <div className="ex-card anim-fade delay-1" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><FolderKanban size={20} color="#ea580c" /> Expense Categories</h3>
            </div>
            <div>
              {categories.map((row) => (
                <div key={row.id} style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                  <strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginBottom: 4 }}>{row.name}</strong>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{row.description || "No description provided"}</div>
                </div>
              ))}
              {!categories.length && <div style={{ padding: 40 }}><EmptyState title="No categories found" message="Category structure will appear here once configured." /></div>}
            </div>
          </div>
        </div>
      )}

      {!loading && mode === "reports" && report && (
        <div className="anim-fade delay-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 800, margin: "0 auto" }}>
          <div className="ex-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "white", border: "none" }}>
            <PieChart size={32} color="#818cf8" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>Total Recorded Spend</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>₹{Number(report.total || 0).toLocaleString()}</div>
          </div>
          <div className="ex-card" style={{ background: "linear-gradient(135deg, #16a34a, #14532d)", color: "white", border: "none" }}>
            <CheckCircle2 size={32} color="#86efac" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 700, color: "#bbf7d0", marginBottom: 8 }}>Total Approved Value</div>
            <div style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace" }}>₹{Number((report.approved || []).reduce((sum, item) => sum + Number(item.amount), 0)).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
