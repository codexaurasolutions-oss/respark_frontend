import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { formatApiError } from "../../utils/apiError";
import { 
  Receipt, Wallet, Search, Filter, FolderKanban, PlusCircle, 
  Calendar, CheckCircle2, Clock, AlertCircle, XCircle, LayoutDashboard,
  Building, ArrowUpRight, ArrowDownRight, Edit, Check, X, ChevronRight, Plus, Trash2
} from "lucide-react";

const emptyForm = {
  title: "",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: "",
  branchId: "",
  paymentMode: "CASH",
  notes: ""
};

const emptyCategoryForm = {
  name: "",
  pnlCategory: "Cost of Sales",
  isActive: true,
  description: ""
};

export default function ExpensesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { formatMoney, currencyMeta, settings } = useSalonSettings();
  const canApproveExpenses = useMemo(() => {
    if (auth?.membership?.salonRole === "SALON_OWNER") return true;
    const expensePermissions = auth?.membership?.permissions?.expenses;
    return Array.isArray(expensePermissions) && expensePermissions.includes("approve");
  }, [auth?.membership?.permissions?.expenses, auth?.membership?.salonRole]);
  const autoApproveExpenses = Boolean(settings?.advancedSettings?.expenseSettings?.autoApprove);

  // Data states
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [payments, setPayments] = useState([]);
  const [accountInjections, setAccountInjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: "", success: "" });

  // Filters & selection
  const [filters, setFilters] = useState({
    branchId: "",
    paymentMode: "",
    categoryId: "",
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: "",
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Types view states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [savingCategory, setSavingCategory] = useState(false);

  // Accounts view states
  const [activeAccount, setActiveAccount] = useState("CASH");
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ amount: "", note: "", accountMode: "CASH", paymentMode: "CASH" });

  // Determine active sub-mode
  const mode = location.pathname.includes("/types") || location.pathname.includes("/categories")
    ? "types"
    : location.pathname.includes("/accounts")
      ? "accounts"
      : "dashboard";

  // Load basic data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseRes, categoryRes, branchRes, paymentRes, injectionRes] = await Promise.all([
        api.get("/owner/expenses"),
        api.get("/owner/expense-categories"),
        api.get("/owner/branches").catch(() => ({ data: [] })),
        api.get("/owner/payments").catch(() => ({ data: [] })),
        api.get("/owner/expenses/accounts").catch(() => ({ data: { injections: [] } }))
      ]);

      setRows(expenseRes.data || []);
      setCategories(categoryRes.data || []);
      setBranches(branchRes.data || []);
      setPayments(paymentRes.data || []);
      setAccountInjections(injectionRes.data?.injections || []);

      // If categories exist and none selected, select first
      if (categoryRes.data?.length > 0 && !selectedCategory) {
        const firstCat = categoryRes.data[0];
        setSelectedCategory(firstCat);
        
        let pnl = "Cost of Sales";
        let isAct = true;
        if (firstCat.description && firstCat.description.startsWith("PNL:")) {
          const parts = firstCat.description.split("|");
          pnl = parts[0].replace("PNL:", "");
          isAct = parts[1] ? parts[1].replace("ACTIVE:", "") === "true" : true;
        }

        setCategoryForm({
          name: firstCat.name,
          pnlCategory: pnl,
          isActive: isAct,
          description: firstCat.description || ""
        });
      }
    } catch (error) {
      setStatus({ error: formatApiError(error, "Could not load data"), success: "" });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered lists
  const baseFilteredExpenses = rows.filter(row => {
    const dateMatch = (!filters.startDate || row.expenseDate >= filters.startDate) &&
                      (!filters.endDate || row.expenseDate <= filters.endDate);
    const branchMatch = !filters.branchId || row.branchId === filters.branchId;
    const paymentModeMatch = !filters.paymentMode || row.paymentMode === filters.paymentMode;
    const categoryMatch = !filters.categoryId || row.categoryId === filters.categoryId;
    return dateMatch && branchMatch && paymentModeMatch && categoryMatch;
  });

  const filteredExpenses = baseFilteredExpenses.filter((row) => !filters.status || row.status === filters.status);

  const expenseStatusCounts = useMemo(() => ({
    total: baseFilteredExpenses.length,
    pending: baseFilteredExpenses.filter((row) => row.status === "PENDING").length,
    approved: baseFilteredExpenses.filter((row) => row.status === "APPROVED").length,
    rejected: baseFilteredExpenses.filter((row) => row.status === "REJECTED").length,
    paid: baseFilteredExpenses.filter((row) => row.status === "PAID").length,
  }), [baseFilteredExpenses]);

  const filteredPayments = payments.filter(row => {
    const pDate = row.createdAt ? row.createdAt.slice(0, 10) : "";
    const dateMatch = (!filters.startDate || pDate >= filters.startDate) &&
                      (!filters.endDate || pDate <= filters.endDate);
    const branchMatch = !filters.branchId || row.invoice?.branchId === filters.branchId;
    return dateMatch && branchMatch;
  });

  // Calculate Account Balances
  const getAccountBalances = () => {
    const modes = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "WALLET", "ONLINE"];
    const result = {};

    modes.forEach(m => {
      // Inflow: invoice payments
      const credits = filteredPayments
        .filter(p => p.mode === m)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const storedInjections = accountInjections.filter((item) => item.accountMode === m);
      const injectedCredits = storedInjections.reduce((sum, item) => sum + Number(item.amount), 0);

      // Outflow: approved/paid expenses
      const debits = filteredExpenses
        .filter(e => e.paymentMode === m && (e.status === "APPROVED" || e.status === "PAID"))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      result[m] = {
        credits: credits + injectedCredits,
        debits,
        balance: (credits + injectedCredits) - debits,
        transactions: [
          ...filteredPayments.filter(p => p.mode === m).map(p => ({
            id: p.id,
            date: p.createdAt ? p.createdAt.slice(0, 10) : "",
            type: "INCOME",
            title: `Payment for Invoice #${p.invoice?.invoiceNumber || "N/A"}`,
            amount: Number(p.amount || 0),
            reference: p.invoice?.customer?.name || "Customer"
          })),
          ...storedInjections.map((item, idx) => ({
            id: item.id || `injection-${idx}`,
            date: item.createdAt ? item.createdAt.slice(0, 10) : item.date,
            type: "INCOME (CAPITAL)",
            title: item.note || "Add Balance Injection",
            amount: Number(item.amount),
            reference: "System Owner"
          })),
          ...filteredExpenses.filter(e => e.paymentMode === m && (e.status === "APPROVED" || e.status === "PAID")).map(e => ({
            id: e.id,
            date: e.expenseDate ? e.expenseDate.slice(0, 10) : "",
            type: "EXPENSE",
            title: e.title,
            amount: Number(e.amount || 0),
            reference: e.category?.name || "General"
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });

    return result;
  };

  const accountBalances = getAccountBalances();

  // Create Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      // Encode extra fields in the description field to maintain schema compatibility
      const compositeDescription = `PNL:${categoryForm.pnlCategory}|ACTIVE:${categoryForm.isActive}|${categoryForm.description || ""}`;

      if (selectedCategory && selectedCategory.id) {
        // Edit existing
        await api.patch(`/owner/expenses/categories/${selectedCategory.id}`, {
          name: categoryForm.name,
          description: compositeDescription
        }).catch(async () => {
          // If PATCH not supported or failed, recreate or fallback to POST
          await api.post("/owner/expense-categories", {
            name: categoryForm.name,
            description: compositeDescription
          });
        });
        setStatus({ error: "", success: "Expense Type updated successfully!" });
      } else {
        // Create new
        await api.post("/owner/expense-categories", {
          name: categoryForm.name,
          description: compositeDescription
        });
        setStatus({ error: "", success: "New Expense Type created successfully!" });
      }
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not save category"), success: "" });
    } finally {
      setSavingCategory(false);
    }
  };

  // Create New button click
  const handleCreateNewCategory = () => {
    setSelectedCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  // Select Category
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    let pnl = "Cost of Sales";
    let isAct = true;
    let desc = "";

    if (cat.description) {
      if (cat.description.startsWith("PNL:")) {
        const parts = cat.description.split("|");
        pnl = parts[0].replace("PNL:", "");
        isAct = parts[1] ? parts[1].replace("ACTIVE:", "") === "true" : true;
        desc = parts.slice(2).join("|");
      } else {
        desc = cat.description;
      }
    }

    setCategoryForm({
      name: cat.name,
      pnlCategory: pnl,
      isActive: isAct,
      description: desc
    });
  };

  // Save Expense Record
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setSubmittingExpense(true);
    setModalError("");
    try {
      const payload = {
        title: form.title,
        amount: Number(form.amount),
        expenseDate: new Date(form.expenseDate).toISOString(),
        paymentMode: form.paymentMode,
        notes: form.notes || null,
        categoryId: form.categoryId || null,
        branchId: form.branchId || null
      };

      if (editingExpenseId) {
        await api.patch(`/owner/expenses/${editingExpenseId}`, payload);
        setStatus({ error: "", success: "Expense updated successfully!" });
      } else {
        await api.post("/owner/expenses", payload);
        setStatus({ error: "", success: "Expense added successfully!" });
      }
      setForm(emptyForm);
      setEditingExpenseId(null);
      setShowAddModal(false);
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (err) {
      setModalError(formatApiError(err, "Could not save expense"));
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Edit Expense
  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setForm({
      title: expense.title || "",
      amount: String(expense.amount || ""),
      expenseDate: expense.expenseDate ? expense.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      categoryId: expense.categoryId || "",
      branchId: expense.branchId || "",
      paymentMode: expense.paymentMode || "CASH",
      notes: expense.notes || ""
    });
    setModalError("");
    setShowAddModal(true);
  };

  // Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/owner/expenses/${id}`);
      setStatus({ error: "", success: "Expense deleted successfully!" });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not delete expense"), success: "" });
    }
  };

  // Approve/Reject Expense Actions
  const handleApproveExpense = async (id) => {
    try {
      await api.patch(`/owner/expenses/${id}/approve`, { approvalNote: "Approved via dashboard" });
      setStatus({ error: "", success: "Expense approved successfully!" });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not approve expense"), success: "" });
    }
  };

  const handleRejectExpense = async (id) => {
    try {
      await api.patch(`/owner/expenses/${id}/reject`, { approvalNote: "Rejected via dashboard" });
      setStatus({ error: "", success: "Expense status updated to Rejected" });
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (err) {
      setStatus({ error: formatApiError(err, "Could not reject expense"), success: "" });
    }
  };

  // Add Balance / Capital
  const handleAddBalance = async (e) => {
    e.preventDefault();
    if (!balanceForm.amount || isNaN(balanceForm.amount)) return;

    setModalError("");
    try {
      await api.post("/owner/expenses/accounts/injections", {
        accountMode: balanceForm.accountMode,
        paymentMode: balanceForm.paymentMode,
        amount: Number(balanceForm.amount),
        note: balanceForm.note || "Owner Balance injection"
      });

      setStatus({
        error: "",
        success: `Added ${formatMoney(balanceForm.amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} balance to ${balanceForm.accountMode} account!`
      });
      setBalanceForm({ amount: "", note: "", accountMode: "CASH", paymentMode: "CASH" });
      setShowAddBalanceModal(false);
      setTimeout(() => setStatus({ error: "", success: "" }), 3000);
      await loadData();
    } catch (error) {
      setModalError(formatApiError(error, "Could not add account balance"));
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'PENDING': return { bg: '#fef3c7', text: '#d97706', icon: <Clock size={12} /> };
      case 'APPROVED': return { bg: '#dbeafe', text: '#2563eb', icon: <CheckCircle2 size={12} /> };
      case 'REJECTED': return { bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={12} /> };
      case 'PAID': return { bg: '#dcfce7', text: '#16a34a', icon: <CheckCircle2 size={12} /> };
      default: return { bg: '#f1f5f9', text: '#475569', icon: null };
    }
  };

  return (
    <div className="expenses-page-container">
      <style>{`
        .expenses-page-container {
          display: flex;
          min-height: calc(100vh - 120px);
          background-color: #f8fafc;
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }

        /* Local Sidebar Navigation */
        .expenses-local-sidebar {
          width: 240px;
          background: white;
          border-right: 1px solid #e2e8f0;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .expenses-sidebar-header {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
          padding-left: 12px;
        }

        .expenses-sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .expenses-sidebar-btn:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .expenses-sidebar-btn.active {
          background-color: #eff6ff;
          color: #2563eb;
        }

        /* Main Workspace */
        .expenses-main-workspace {
          flex: 1;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
        }

        /* Header Bar */
        .expenses-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .expenses-header-title {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Filter Row style */
        .expenses-filter-panel {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: none;
        }

        .filters-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }

        .filter-select, .filter-input {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #fff;
          font-size: 13px;
          color: #1e293b;
          font-weight: 500;
          outline: none;
          min-width: 140px;
        }

        .filter-select:focus, .filter-input:focus {
          border-color: #2563eb;
          box-shadow: none;
        }

        /* Blue Button */
        .blue-btn {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: none;
        }

        .blue-btn:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
        }

        .blue-btn-secondary {
          background-color: #2563eb;
          color: white;
          border: 1px solid #2563eb;
          padding: 9px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .blue-btn-secondary:hover {
          background-color: #1d4ed8;
        }

        /* White Cards Table */
        .ledger-table-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: none;
        }

        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .ledger-table th {
          background-color: #f8fafc;
          padding: 14px 20px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .ledger-table td {
          padding: 16px 20px;
          font-size: 14px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }

        .ledger-table tr:last-child td {
          border-bottom: none;
        }

        .status-pill {
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Types View Layout */
        .types-layout-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          min-height: 480px;
        }

        .types-list-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .types-list-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
          font-weight: 700;
          font-size: 15px;
        }

        .types-items-scroller {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .type-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
        }

        .type-item-row:hover {
          background-color: #f1f5f9;
        }

        .type-item-row.selected {
          background-color: #2563eb;
          color: white;
        }

        .type-item-name {
          font-weight: 600;
          font-size: 13px;
        }

        .type-item-pnl {
          font-size: 11px;
          opacity: 0.8;
        }

        .types-form-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-weight: 600;
          font-size: 13px;
          color: #475569;
          margin-bottom: 8px;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          color: #475569;
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          box-shadow: none;
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f8fafc;
        }

        .modal-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background-color: #f8fafc;
        }

        /* Accounts grid */
        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .account-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .account-card:hover {
          border-color: #2563eb;
          transform: translateY(-2px);
          box-shadow: none;
        }

        .account-card.active {
          border-color: #2563eb;
          background-color: #f0f7ff;
        }

        .account-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .account-title {
          font-weight: 700;
          font-size: 14px;
          color: #475569;
        }

        .account-balance {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }
      `}</style>

      {/* ── LOCAL SIDEBAR ── */}
      <div className="expenses-local-sidebar">
        <div className="expenses-sidebar-header">Expenses</div>
        
        <button 
          className={`expenses-sidebar-btn ${mode === "dashboard" ? "active" : ""}`}
          onClick={() => navigate("/admin/expenses/dashboard")}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>

        <button 
          className={`expenses-sidebar-btn ${mode === "types" ? "active" : ""}`}
          onClick={() => navigate("/admin/expenses/types")}
        >
          <FolderKanban size={16} />
          Types
        </button>

        <button 
          className={`expenses-sidebar-btn ${mode === "accounts" ? "active" : ""}`}
          onClick={() => navigate("/admin/expenses/accounts")}
        >
          <Wallet size={16} />
          Accounts
        </button>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="expenses-main-workspace">
        
        {/* Status Alerts */}
        {status.error && !showAddModal && !showAddBalanceModal && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px", borderRadius: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} /> {status.error}
          </div>
        )}
        {status.success && !showAddModal && !showAddBalanceModal && (
          <div style={{ background: "#dcfce7", color: "#166534", padding: "16px 20px", borderRadius: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} /> {status.success}
          </div>
        )}

        {loading && <PageLoader title="Loading Expenses System" message="Preparing ledger files and accounts..." />}

        {!loading && (
          <>
            {/* ── 1. DASHBOARD VIEW ── */}
            {mode === "dashboard" && (
              <>
                <div className="expenses-header-bar">
                  <h1 className="expenses-header-title">
                    <Receipt size={24} color="#2563eb" />
                    Expenses Overview
                  </h1>
                </div>
                {/* Filter Row Panel */}
                <div className="expenses-filter-panel">
                  <div className="filters-group">
                    <div className="filter-item">
                      <span className="filter-label">Store:</span>
                      <select 
                        className="filter-select"
                        value={filters.branchId}
                        onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                      >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-item">
                      <span className="filter-label">Paymode:</span>
                      <select 
                        className="filter-select"
                        value={filters.paymentMode}
                        onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}
                      >
                        <option value="">All</option>
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">BANK TRANSFER</option>
                        <option value="WALLET">WALLET</option>
                        <option value="ONLINE">ONLINE</option>
                      </select>
                    </div>

                    <div className="filter-item">
                      <span className="filter-label">Expense Type:</span>
                      <select 
                        className="filter-select"
                        value={filters.categoryId}
                        onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                      >
                        <option value="">All</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-item">
                      <span className="filter-label">From:</span>
                      <input 
                        type="date"
                        className="filter-input"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        max={filters.endDate || undefined}
                      />
                    </div>

                    <div className="filter-item">
                      <span className="filter-label">To:</span>
                      <input
                        type="date"
                        className="filter-input"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        min={filters.startDate || undefined}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="blue-btn-secondary" onClick={loadData}>
                      <Search size={14} /> Show Expenses
                    </button>
                    <button className="blue-btn" onClick={() => { setEditingExpenseId(null); setForm(emptyForm); setShowAddModal(true); }}>
                      <Plus size={16} /> Add Expenses
                    </button>
                  </div>
                </div>

                {/* Table Ledger */}
                <div className="ledger-table-container">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Title</th>
                        <th>Amount</th>
                        <th>Payment Mode</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((row) => {
                        return (
                          <tr key={row.id}>
                            <td style={{ fontWeight: 600 }}>{new Date(row.expenseDate).toLocaleDateString()}</td>
                            <td>
                              <span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                                {row.category?.name || "Uncategorized"}
                              </span>
                            </td>
                            <td>{row.title}</td>
                            <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{formatMoney(row.amount || 0)}</td>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{row.paymentMode || "CASH"}</td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                <button 
                                  className="blue-btn" 
                                  style={{ padding: "4px 8px", borderRadius: 4 }} 
                                  onClick={() => handleEditExpense(row)}
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className="blue-btn" 
                                  style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626" }} 
                                  onClick={() => handleDeleteExpense(row.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredExpenses.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: 40, textAlign: "center" }}>
                            <EmptyState 
                              title="No Expenses Recorded" 
                              message="Adjust filters or click 'Add Expenses' to record standard expenses." 
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── 2. TYPES VIEW ── */}
            {mode === "types" && (
              <>
                <div className="expenses-header-bar">
                  <h1 className="expenses-header-title">
                    <FolderKanban size={24} color="#2563eb" />
                    Expense Type Details
                  </h1>
                </div>

                <div className="types-layout-container">
                  {/* Left Column: Categories List */}
                  <div className="types-list-card">
                    <div className="types-list-header">Expense Types</div>
                    
                    <div className="types-items-scroller">
                      {categories.map((cat) => {
                        const isSelected = selectedCategory?.id === cat.id;
                        return (
                          <div 
                            key={cat.id} 
                            className={`type-item-row ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectCategory(cat)}
                          >
                            <div>
                              <div className="type-item-name">{cat.name}</div>
                              <div className="type-item-pnl">
                                {cat.description?.startsWith("PNL:") 
                                  ? cat.description.split("|")[0].replace("PNL:", "") 
                                  : "General"}
                              </div>
                            </div>
                            <ChevronRight size={14} opacity={0.6} />
                          </div>
                        );
                      })}
                      {categories.length === 0 && (
                        <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                          No categories defined yet.
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 16, borderTop: "1px solid #e2e8f0" }}>
                      <button 
                        className="blue-btn" 
                        style={{ width: "100%" }}
                        onClick={handleCreateNewCategory}
                      >
                        <Plus size={14} /> Create New
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Editor Form */}
                  <div className="types-form-card">
                    <h3 style={{ margin: "0 0 20px 0", fontSize: 16, fontWeight: 700 }}>
                      {selectedCategory ? "Edit Expense Type" : "Create New Expense Type"}
                    </h3>

                    <form onSubmit={handleSaveCategory}>
                      <div className="form-group">
                        <label className="form-label">Type Name</label>
                        <input 
                          type="text" 
                          className="filter-input" 
                          style={{ width: "100%", boxSizing: "border-box" }}
                          placeholder="e.g. Cosmetics, Client Beverages"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expense / PNL Category</label>
                        <select 
                          className="filter-select"
                          style={{ width: "100%" }}
                          value={categoryForm.pnlCategory}
                          onChange={(e) => setCategoryForm({ ...categoryForm, pnlCategory: e.target.value })}
                        >
                          <option value="Cost of Sales">Cost of Sales</option>
                          <option value="Operating Expenses">Operating Expenses</option>
                          <option value="Administrative Expenses">Administrative Expenses</option>
                          <option value="Other Indirect Expenses">Other Indirect Expenses</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="checkbox-container">
                          <input 
                            type="checkbox" 
                            checked={categoryForm.isActive}
                            onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                          />
                          Active
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Custom Description</label>
                        <textarea 
                          className="filter-input" 
                          style={{ width: "100%", minHeight: 80, boxSizing: "border-box" }}
                          placeholder="Optional notes or details..."
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
                        <button 
                          type="button" 
                          className="blue-btn-secondary"
                          onClick={() => selectedCategory ? handleSelectCategory(selectedCategory) : handleCreateNewCategory()}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="blue-btn" disabled={savingCategory}>
                          {savingCategory ? "Saving..." : "Save Type"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}

            {/* ── 3. ACCOUNTS VIEW ── */}
            {mode === "accounts" && (
              <>
                <div className="expenses-header-bar">
                  <h1 className="expenses-header-title">
                    <Wallet size={24} color="#2563eb" />
                    Ledger Accounts & Balance
                  </h1>
                </div>

                {/* Filter / Actions Bar */}
                <div className="expenses-filter-panel">
                  <div className="filters-group">
                    <div className="filter-item">
                      <span className="filter-label">From:</span>
                      <input 
                        type="date"
                        className="filter-input"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        max={filters.endDate || undefined}
                      />
                    </div>
                    <div className="filter-item">
                      <span className="filter-label">To:</span>
                      <input 
                        type="date"
                        className="filter-input"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        min={filters.startDate || undefined}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="blue-btn-secondary" onClick={() => setShowAddBalanceModal(true)}>
                      <Plus size={14} /> Add Balance
                    </button>
                  </div>
                </div>

                {/* Accounts Cards List */}
                <div className="accounts-grid">
                  {Object.keys(accountBalances).map((accMode) => {
                    const acc = accountBalances[accMode];
                    const isActive = activeAccount === accMode;
                    return (
                      <div 
                        key={accMode} 
                        className={`account-card ${isActive ? "active" : ""}`}
                        onClick={() => setActiveAccount(accMode)}
                      >
                        <div className="account-card-header">
                          <span className="account-title">{accMode} Ledger</span>
                          {acc.balance >= 0 ? (
                            <ArrowUpRight size={16} color="#16a34a" />
                          ) : (
                            <ArrowDownRight size={16} color="#dc2626" />
                          )}
                        </div>
                        <div className="account-balance">{formatMoney(acc.balance)}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                          <span>Inflow: {formatMoney(acc.credits)}</span>
                          <span>Outflow: {formatMoney(acc.debits)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Account Ledger Transactions */}
                <div className="ledger-table-container" style={{ marginTop: 16 }}>
                  <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 700 }}>
                    {activeAccount} Transaction History
                  </div>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction Info</th>
                        <th>Entity/Reference</th>
                        <th>Type</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountBalances[activeAccount]?.transactions.map((tx, idx) => {
                        const isIncome = tx.type.startsWith("INCOME");
                        return (
                          <tr key={tx.id || idx}>
                            <td>{new Date(tx.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{tx.title}</td>
                            <td>{tx.reference}</td>
                            <td>
                              <span 
                                className="status-pill" 
                                style={{ 
                                  background: isIncome ? "#dcfce7" : "#fee2e2", 
                                  color: isIncome ? "#166534" : "#991b1b" 
                                }}
                              >
                                {isIncome ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {tx.type}
                              </span>
                            </td>
                            <td 
                              style={{ 
                                fontWeight: 700, 
                                fontFamily: "monospace", 
                                textAlign: "right",
                                color: isIncome ? "#16a34a" : "#dc2626" 
                              }}
                            >
                              {isIncome ? "+" : "-"} {formatMoney(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                      {(!accountBalances[activeAccount]?.transactions || accountBalances[activeAccount]?.transactions.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                            No Records Available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* ── ADD EXPENSE MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingExpenseId ? "Edit Expense" : "Record New Expense"}</h2>
              <button 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                onClick={() => { setShowAddModal(false); setEditingExpenseId(null); setModalError(""); }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {modalError && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={16} /> {modalError}
                  </div>
                )}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expense Title</label>
                  <input 
                    type="text" 
                    className="filter-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="e.g. Cosmetic stock purchases"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Amount ({currencyMeta.symbol})</label>
                    <input 
                      type="number" 
                      className="filter-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Expense Date</label>
                    <input 
                      type="date" 
                      className="filter-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      value={form.expenseDate}
                      onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Type / Category</label>
                    <select 
                      className="filter-select"
                      style={{ width: "100%" }}
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="filter-select"
                      style={{ width: "100%" }}
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      <option value="WALLET">WALLET</option>
                      <option value="ONLINE">ONLINE</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Branch Store</label>
                    <select 
                      className="filter-select"
                      style={{ width: "100%" }}
                      value={form.branchId}
                      onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    >
                      <option value="">Select Store Branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Notes</label>
                  <textarea 
                    className="filter-input"
                    style={{ width: "100%", minHeight: 60, boxSizing: "border-box" }}
                    placeholder="Optional transaction reference, receipt number etc."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="blue-btn-secondary" 
                  onClick={() => { setShowAddModal(false); setEditingExpenseId(null); setModalError(""); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="blue-btn"
                  disabled={submittingExpense}
                >
                  {submittingExpense ? "Recording..." : (editingExpenseId ? "Update Expense" : "Record Expense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD BALANCE MODAL ── */}
      {showAddBalanceModal && (
        <div className="modal-overlay" onClick={() => setShowAddBalanceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Balance</h2>
              <button 
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                onClick={() => { setShowAddBalanceModal(false); setModalError(""); }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBalance}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {modalError && (
                  <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={16} /> {modalError}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Date</label>
                    <input 
                      type="date"
                      className="filter-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      value={new Date().toISOString().slice(0, 10)}
                      readOnly
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Account</label>
                    <select 
                      className="filter-select"
                      style={{ width: "100%" }}
                      value={balanceForm.accountMode}
                      onChange={(e) => setBalanceForm({ ...balanceForm, accountMode: e.target.value })}
                    >
                      <option value="">Select Account</option>
                      {Object.entries(accountBalances).map(([mode, data]) => (
                        <option key={mode} value={mode}>{mode} ({currencyMeta.symbol} {data.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Amount</label>
                    <input 
                      type="number" 
                      className="filter-input"
                      style={{ width: "100%", boxSizing: "border-box" }}
                      placeholder="Enter Amount"
                      value={balanceForm.amount}
                      onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Paymode</label>
                    <select 
                      className="filter-select"
                      style={{ width: "100%" }}
                      value={balanceForm.paymentMode}
                      onChange={(e) => setBalanceForm({ ...balanceForm, paymentMode: e.target.value })}
                    >
                      <option value="">Select Paymode</option>
                      <option value="CASH">CASH</option>
                      <option value="CARD">CARD</option>
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      <option value="WALLET">WALLET</option>
                      <option value="ONLINE">ONLINE</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Remark</label>
                  <input 
                    type="text"
                    className="filter-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="Enter Remark"
                    value={balanceForm.note}
                    onChange={(e) => setBalanceForm({ ...balanceForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="blue-btn-secondary" 
                  onClick={() => { setShowAddBalanceModal(false); setModalError(""); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="blue-btn"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
