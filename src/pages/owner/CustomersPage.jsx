import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Filter, Plus, Download, Upload, MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, ChevronDown } from "lucide-react";
import { api } from "../../api/client";
import { downloadFromApi } from "../../utils/download";
import PageLoader from "../../components/PageLoader";

export default function CustomersPage() {
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    alternatePhone: "",
    name: "",
    email: "",
    dateOfBirth: "",
    anniversary: "",
    gst: "",
    gender: "female"
  });

  const load = async (searchText = query, selectedFilter = filterType) => {
    setLoading(true);
    try {
      const response = await api.get("/owner/customers", { params: { q: searchText, filter: selectedFilter } });
      setRows(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextQuery = params.get("q") || "";
    const nextFilter = params.get("filter") || "";
    setQuery(nextQuery);
    setFilterType(nextFilter);
  }, [location.search]);

  useEffect(() => {
    load(query, filterType);
  }, [query, filterType]);

  const handleExport = async (format) => {
    setShowExportMenu(false);
    try {
      await downloadFromApi(`/owner/customers/export?format=${format}`, { fallbackFilename: `Customers.${format}` });
    } catch (e) {
      alert("Could not export customers");
    }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    try {
      await api.post("/owner/customers", formData);
      setShowAddGuest(false);
      setFormData({ phone: "", alternatePhone: "", name: "", email: "", dateOfBirth: "", anniversary: "", gst: "", gender: "female" });
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to add guest");
    }
  };

  return (
    <div style={{ padding: "16px 24px", background: "#f8fafc", minHeight: "100%", width: "100%" }}>
      <style>
        {`
          .crm-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            background: transparent;
          }
          .crm-search {
            display: flex;
            align-items: center;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            padding: 8px 16px;
            width: 320px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .crm-search input {
            border: none;
            outline: none;
            margin-left: 8px;
            font-size: 0.9rem;
            width: 100%;
            color: #334155;
          }
          .crm-actions {
            display: flex;
            gap: 12px;
          }
          .crm-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
          }
          .crm-btn:hover {
            background: #2563eb;
          }
          .crm-btn-light {
            background: #f8fafc;
            color: #3b82f6;
            border: 1px solid #bfdbfe;
            box-shadow: none;
          }
          .crm-btn-light:hover {
            background: #eff6ff;
          }
          .crm-table-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow-x: auto;
          }
          .crm-table {
            width: 100%;
            border-collapse: collapse;
            white-space: nowrap;
          }
          .crm-table th {
            background: #f8fafc;
            color: #475569;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 16px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          .crm-table td {
            padding: 14px 16px;
            font-size: 0.85rem;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          .crm-table tr:hover {
            background: #f8fafc;
          }
          .crm-table-checkbox {
            width: 16px;
            height: 16px;
            border-radius: 3px;
            border: 1px solid #cbd5e1;
            cursor: pointer;
            accent-color: #3b82f6;
          }
          .crm-pagination {
            display: flex;
            align-items: center;
            padding: 16px;
            background: white;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 0.85rem;
            gap: 16px;
          }
          .crm-pagination button {
            background: none;
            border: none;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
          }
          .crm-pagination button:hover {
            color: #0f172a;
          }
          @media (max-width: 768px) {
            .crm-toolbar {
              flex-direction: column;
              align-items: stretch;
            }
            .crm-search {
              max-width: 100%;
            }
            .crm-actions {
              overflow-x: auto;
              padding-bottom: 8px;
            }
          }
          
          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-content {
            background: white;
            border-radius: 16px;
            width: min(90vw, 500px);
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0,0,0,0.1);
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #f1f5f9;
          }
          .modal-header h3 {
            margin: 0;
            font-size: 1.2rem;
            color: #0f172a;
          }
          .modal-close {
            background: none; border: none; cursor: pointer; color: #64748b;
          }
          .modal-body {
            padding: 24px;
            display: grid;
            gap: 16px;
          }
          .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .form-group label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #475569;
          }
          .form-group input {
            padding: 10px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 0.95rem;
          }
          .radio-group {
            display: flex;
            gap: 16px;
            align-items: center;
          }
          .radio-group label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
            cursor: pointer;
          }

          /* Dropdown Styles */
          .export-dropdown {
            position: relative;
            display: inline-block;
          }
          .export-menu {
            position: absolute;
            top: calc(100% + 4px);
            right: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            min-width: 140px;
            z-index: 50;
            overflow: hidden;
          }
          .export-item {
            width: 100%;
            text-align: left;
            padding: 10px 16px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 0.9rem;
            color: #475569;
          }
          .export-item:hover {
            background: #f8fafc;
            color: #0f172a;
          }

          /* Sidebar Filter Modal */
          .sidebar-modal {
            position: fixed;
            top: 0; right: 0; bottom: 0;
            width: 400px;
            background: white;
            box-shadow: -10px 0 30px rgba(0,0,0,0.1);
            z-index: 1050;
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            animation: slideIn 0.3s forwards;
          }
          @keyframes slideIn {
            to { transform: translateX(0); }
          }
          .sidebar-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #f1f5f9;
          }
          .sidebar-modal-header h3 {
            margin: 0; font-size: 1.2rem;
          }
          .sidebar-modal-body {
            flex-grow: 1;
            display: flex;
            overflow: hidden;
          }
          .filter-categories {
            width: 160px;
            background: #f8fafc;
            border-right: 1px solid #f1f5f9;
            overflow-y: auto;
          }
          .filter-category-btn {
            width: 100%;
            text-align: left;
            padding: 14px 16px;
            background: none; border: none;
            font-size: 0.9rem;
            color: #475569;
            cursor: pointer;
            border-bottom: 1px solid #e2e8f0;
          }
          .filter-category-btn.active {
            background: white;
            color: #0f766e;
            font-weight: 600;
            border-left: 3px solid #0f766e;
          }
          .filter-options {
            flex-grow: 1;
            padding: 24px;
            overflow-y: auto;
          }
          .sidebar-modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
        `}
      </style>

      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="sidebar-modal" onClick={e => e.stopPropagation()}>
            <div className="sidebar-modal-header">
              <h3>Filters</h3>
              <button className="modal-close" onClick={() => setShowFilters(false)}><X size={20} /></button>
            </div>
            <div className="sidebar-modal-body">
              <div className="filter-categories">
                <button className="filter-category-btn active">Criteria</button>
              </div>
              <div className="filter-options">
                <div className="form-group">
                  <label>Select Pre-defined Filter</label>
                  <select 
                    className="crm-btn" 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    <option value="">All Customers</option>
                    <option value="high_spender">High Spenders (₹10k+)</option>
                    <option value="lost_customer">Non-Returning (90+ Days)</option>
                    <option value="active_membership">Active Membership</option>
                    <option value="active_package">Active Package</option>
                    <option value="birthday_month">Birthday This Month</option>
                    <option value="anniversary_month">Anniversary This Month</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="sidebar-modal-footer">
              <button className="crm-btn" onClick={() => { setFilterType(""); setShowFilters(false); }}>Clear</button>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowFilters(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {showAddGuest && (
        <div className="modal-overlay" onClick={() => setShowAddGuest(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Guest</h3>
              <button className="modal-close" onClick={() => setShowAddGuest(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddGuest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +91 9876543210" />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Guest Name" />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <div className="radio-group">
                    <label><input type="radio" name="gender" checked={formData.gender === 'female'} onChange={() => setFormData({...formData, gender: 'female'})} /> Female</label>
                    <label><input type="radio" name="gender" checked={formData.gender === 'male'} onChange={() => setFormData({...formData, gender: 'male'})} /> Male</label>
                  </div>
                </div>
                <div className="form-group">
                  <label>Alternate Mobile Number</label>
                  <input type="text" value={formData.alternatePhone} onChange={e => setFormData({...formData, alternatePhone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>DOB</label>
                  <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Anniversary Date</label>
                  <input type="date" value={formData.anniversary} onChange={e => setFormData({...formData, anniversary: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input type="text" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="crm-btn" onClick={() => setShowAddGuest(false)}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="crm-toolbar">
        <div className="crm-search">
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Name Or Number" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <div className="crm-actions">
          <button className="crm-btn crm-btn-light" onClick={() => setShowFilters(true)}>
            <Filter size={16} /> Filters
          </button>
          <button className="crm-btn" onClick={() => setShowAddGuest(true)}>
            <Plus size={16} /> Add Guest
          </button>
          <button className="crm-btn">
            <Download size={16} /> Import
          </button>
          <div className="export-dropdown">
            <button className="crm-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Upload size={16} /> Export <ChevronDown size={16} />
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button className="export-item" onClick={() => handleExport('xlsx')}>Export as XLSX</button>
                <button className="export-item" onClick={() => handleExport('xls')}>Export as XLS</button>
                <button className="export-item" onClick={() => handleExport('csv')}>Export as CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="crm-table-container">
        {loading ? (
          <PageLoader title="Loading Customers..." message="Please wait while we fetch your CRM data." />
        ) : (
          <>
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" className="crm-table-checkbox" /></th>
                  <th>MOBILE NO.</th>
                  <th>NAME</th>
                  <th>GENDER</th>
                  <th>LAST VISITED</th>
                  <th>TOTAL<br/>ORDERS</th>
                  <th>TOTAL<br/>PURCHASE AMOUNT</th>
                  <th>AVERAGE<br/>PURCHASE AMOUNT</th>
                  <th>ONLINE<br/>VISITS</th>
                  <th>LOYALTY</th>
                  <th>REFERRAL<br/>CODE</th>
                  <th>ADVANCE</th>
                  <th>BALANCE</th>
                  <th>MEMBERSHIP<br/>COUNT</th>
                  <th>BIRTH<br/>DATE</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><input type="checkbox" className="crm-table-checkbox" /></td>
                    <td style={{ color: "#333", fontWeight: 500 }}>{row.phone || "-"}</td>
                    <td style={{ textTransform: "uppercase", fontWeight: 500 }}>{row.name || "-"}</td>
                    <td>{row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1).toLowerCase() : "-"}</td>
                    <td>{row.lastVisitAt ? new Date(row.lastVisitAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : "-"}</td>
                    <td>{row.invoices?.length || "-"}</td>
                    <td>{row.totalSpend || "-"}</td>
                    <td>{row.averageSpend || "-"}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, '-') : "-"}</td>
                    <td><MoreVertical size={16} color="#94a3b8" style={{ cursor: "pointer" }} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="16" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      No customers found. Try a different search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="crm-pagination">
              <div style={{ display: "flex", gap: 8 }}>
                <button><ChevronsLeft size={18} /></button>
                <button><ChevronLeft size={18} /></button>
                <button><ChevronRight size={18} /></button>
                <button><ChevronsRight size={18} /></button>
              </div>
              <div>1-{rows.length || 0} of {rows.length || 0}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

