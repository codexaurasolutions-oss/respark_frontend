import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { formatApiError } from '../../utils/apiError';
import PageLoader from '../../components/PageLoader';
import './ServiceHubPage.css';

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" }
];

export default function ServiceHubPage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGender, setSelectedGender] = useState("ALL");
  const [searchItem, setSearchItem] = useState('');
  const [editingId, setEditingId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ error: '', success: '' });
  
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '' });

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [srvForm, setSrvForm] = useState({
    name: '',
    branchId: '',
    categoryId: '',
    gender: 'UNISEX',
    price: 0,
    durationMin: 30,
    taxRate: 0,
    commissionPct: 0,
    onlineBookingEnabled: false,
    description: '',
    isFeatured: false,
    isPopular: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, srvRes, branchRes] = await Promise.allSettled([
        api.get('/owner/service-categories'),
        api.get('/owner/services'),
        api.get('/owner/branches')
      ]);
      if (catRes.status === "fulfilled") setCategories(catRes.value.data || []);
      else throw catRes.reason;
      if (srvRes.status === "fulfilled") setServices(srvRes.value.data || []);
      else throw srvRes.reason;
      if (branchRes.status === "fulfilled") setBranches(branchRes.value.data || []);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to load data"), success: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    services.forEach((service) => {
      const key = service.category?.id || service.categoryId || "uncategorized";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [services]);

  const visibleServices = useMemo(() => {
    let list = services;
    if (selectedCategory) {
      list = list.filter((service) => service.category?.id === selectedCategory || service.categoryId === selectedCategory);
    }
    if (selectedGender !== "ALL") {
      list = list.filter((service) => !service.gender || ["UNISEX", "BOTH", "ALL"].includes(service.gender.toUpperCase()) || service.gender.toUpperCase() === selectedGender);
    }
    if (searchItem) {
      const query = searchItem.toLowerCase();
      list = list.filter((service) => service.name.toLowerCase().includes(query) || (service.description || "").toLowerCase().includes(query));
    }
    return list;
  }, [services, selectedCategory, selectedGender, searchItem]);

  const visibleCategoryLabel = useMemo(() => {
    if (!selectedCategory) return "All categories";
    for (const cat of categories) {
      if (cat.id === selectedCategory) return cat.name;
      for (const sub of (cat.children || [])) {
        if (sub.id === selectedCategory) return `${cat.name} / ${sub.name}`;
      }
    }
    return "Selected category";
  }, [categories, selectedCategory]);

  const groupedServices = useMemo(() => {
    const groupMap = new Map();
    visibleServices.forEach((service) => {
      const title = service.category?.name || "Uncategorized";
      if (!groupMap.has(title)) groupMap.set(title, []);
      groupMap.get(title).push(service);
    });
    return Array.from(groupMap.entries()).map(([title, items]) => ({ title, items }));
  }, [visibleServices]);

  const resetServiceForm = () => {
    setEditingId('');
    setSrvForm({
      name: '',
      branchId: '',
      categoryId: selectedCategory || '',
      gender: 'UNISEX',
      price: 0,
      durationMin: 30,
      taxRate: 0,
      commissionPct: 0,
      onlineBookingEnabled: false,
      description: '',
      isFeatured: false,
      isPopular: false
    });
  };

  const openNewService = () => {
    resetServiceForm();
    setIsServiceModalOpen(true);
  };

  const startEditService = (service) => {
    setEditingId(service.id);
    setSrvForm({
      name: service.name || '',
      branchId: service.branchId || '',
      categoryId: service.categoryId || service.category?.id || '',
      gender: service.gender || 'UNISEX',
      price: Number(service.price || 0),
      durationMin: Number(service.durationMin || 30),
      taxRate: Number(service.taxRate || 0),
      commissionPct: Number(service.commissionPct || 0),
      onlineBookingEnabled: Boolean(service.onlineBookingEnabled),
      description: service.description || '',
      isFeatured: Boolean(service.isFeatured),
      isPopular: Boolean(service.isPopular)
    });
    setIsServiceModalOpen(true);
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setStatus({ error: '', success: '' });
    try {
      await api.post('/owner/service-categories', { name: catForm.name.trim() });
      setStatus({ error: '', success: 'Category created successfully!' });
      setIsCategoryModalOpen(false);
      setCatForm({ name: '' });
      await loadData();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to create category"), success: '' });
    }
  };

  const handleServiceSubmit = async (event) => {
    event.preventDefault();
    setStatus({ error: '', success: '' });
    const payload = {
      name: srvForm.name.trim(),
      branchId: srvForm.branchId || undefined,
      categoryId: srvForm.categoryId || undefined,
      gender: srvForm.gender || undefined,
      price: Number(srvForm.price),
      durationMin: Number(srvForm.durationMin),
      taxRate: Number(srvForm.taxRate),
      commissionPct: Number(srvForm.commissionPct),
      onlineBookingEnabled: Boolean(srvForm.onlineBookingEnabled),
      description: srvForm.description || undefined,
      isFeatured: Boolean(srvForm.isFeatured),
      isPopular: Boolean(srvForm.isPopular)
    };
    try {
      if (editingId) {
        await api.patch(`/owner/services/${editingId}`, payload);
        setStatus({ error: '', success: 'Service updated successfully!' });
      } else {
        await api.post("/owner/services", payload);
        setStatus({ error: '', success: 'Service created successfully!' });
      }
      setIsServiceModalOpen(false);
      resetServiceForm();
      await loadData();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to save service"), success: '' });
    }
  };

  const archiveService = async (serviceId) => {
    try {
      await api.patch(`/owner/services/${serviceId}/archive`);
      if (editingId === serviceId) {
        resetServiceForm();
      }
      await loadData();
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to archive service"), success: '' });
    }
  };

  if (loading) return <PageLoader title="Loading Catalog Hub" message="Preparing services and categories..." />;

  return (
    <div className="service-hub-container">
      <div className="hub-categories-col">
        <div className="hub-col-header">Categories</div>
        <div className="hub-categories-list">
          <div
            className={`hub-category-item ${selectedCategory === "" ? "active" : ""}`}
            onClick={() => setSelectedCategory("")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span>All</span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{services.length}</span>
            </div>
          </div>
          {categories.map((cat) => (
            <div key={cat.id}>
              <div
                className={`hub-category-item ${selectedCategory === cat.id ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <span>{cat.name}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{categoryCounts.get(cat.id) || 0}</span>
                </div>
              </div>
              {(cat.children || []).map((sub) => (
                <div
                  key={sub.id}
                  className={`hub-category-item ${selectedCategory === sub.id ? "active" : ""}`}
                  onClick={() => setSelectedCategory(sub.id)}
                  style={{ paddingLeft: 24 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13 }}>{sub.name}</span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>{categoryCounts.get(sub.id) || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!categories.length && (
            <div style={{ padding: 24, color: "#94a3b8", fontSize: 14 }}>
              Create service categories to group items by family and gender.
            </div>
          )}
        </div>
        <div className="hub-col-footer">
          <button
            type="button"
            className="btn-new-category"
            onClick={() => {
              setCatForm({ name: '' });
              setIsCategoryModalOpen(true);
            }}
          >
            + New Category
          </button>
        </div>
      </div>

      <div className="hub-items-col">
        <div className="hub-items-header-bar">
          <div>
            <div style={{ color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>Services</div>
            <div style={{ color: '#64748b', fontSize: 13 }}>{visibleCategoryLabel} • {visibleServices.length} visible</div>
          </div>
          <div className="hub-items-actions">
            {['ALL', 'FEMALE', 'MALE'].map((gender) => (
              <button
                key={gender}
                type="button"
                className="btn-import"
                style={{
                  background: selectedGender === gender ? '#2563eb' : '#ffffff',
                  color: selectedGender === gender ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1'
                }}
                onClick={() => setSelectedGender(gender)}
              >
                {gender === 'ALL' ? 'All' : gender.toLowerCase()}
              </button>
            ))}
            <button
              type="button"
              className="btn-import"
              style={{ background: '#10b981' }}
              onClick={openNewService}
            >
              + New Service
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="hub-search-input"
            placeholder="Search services"
            value={searchItem}
            onChange={(e) => setSearchItem(e.target.value)}
          />
          <button
            type="button"
            className="btn-import"
            style={{ background: '#2563eb' }}
            onClick={() => {
              setCatForm({ name: '' });
              setIsCategoryModalOpen(true);
            }}
          >
            + Category
          </button>
        </div>

        <div className="hub-items-list">
          {groupedServices.map((group) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                    {selectedGender === 'ALL' ? group.title : `${group.title} (${selectedGender === 'MALE' ? 'M' : 'F'})`}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                    {group.items.length} service{group.items.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.items.map((service) => (
                  <div key={service.id} className="hub-item-card" style={{ alignItems: 'flex-start' }}>
                    <div className="hub-item-info" style={{ width: '100%' }}>
                      <strong>{service.name}</strong>
                      <div className="hub-item-meta" style={{ marginTop: 4 }}>
                        <span>Price {Number(service.price || 0)}</span>
                        <span>Duration {service.durationMin} min</span>
                        <span>Tax {Number(service.taxRate || 0)}%</span>
                      </div>
                      <div className="hub-item-meta" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                        <span>{service.category?.name || 'Uncategorized'}</span>
                        <span>{service.branch?.name || 'Salon wide'}</span>
                        <span>Gender {service.gender || 'UNISEX'}</span>
                        <span>Booking {service.onlineBookingEnabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      {service.description && (
                        <div className="hub-item-meta" style={{ marginTop: 6, color: '#475569' }}>
                          {service.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{ padding: '6px 14px', border: '1px solid #3b82f6', borderRadius: 6, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                        onClick={() => startEditService(service)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        style={{ padding: '6px 14px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                        onClick={() => archiveService(service.id)}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!groupedServices.length && (
            <EmptyState
              title="No services found"
              message="No service entries match the selected category, gender, or search text."
            />
          )}
        </div>
      </div>

      {isCategoryModalOpen && (
        <div className="hub-modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
          <form className="hub-modal-content" onSubmit={handleCategorySubmit} onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-header">New Category</div>
            <div className="hub-modal-body">
              <div className="hub-form-group">
                <label>Name *</label>
                <input
                  type="text"
                  className="hub-input"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ name: e.target.value })}
                  placeholder="Hair, Skin, Nails..."
                />
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                Categories keep the service catalog organized for appointments and POS.
              </p>
            </div>
            <div className="hub-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-submit">Save Category</button>
            </div>
          </form>
        </div>
      )}

      {isServiceModalOpen && (
        <div className="hub-modal-overlay" onClick={() => setIsServiceModalOpen(false)}>
          <form className="hub-modal-content" onSubmit={handleServiceSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="hub-modal-header">{editingId ? 'Edit Service' : 'New Service'}</div>
            <div className="hub-modal-body">
              <div className="hub-form-row">
                <div className="hub-form-group" style={{ flex: 2 }}>
                  <label>Name *</label>
                  <input type="text" className="hub-input" value={srvForm.name} onChange={e => setSrvForm({...srvForm, name: e.target.value})} placeholder="Haircut, Beard Trim..." />
                </div>
                <div className="hub-form-group" style={{ flex: 1 }}>
                  <label>Branch</label>
                  <select className="hub-input" value={srvForm.branchId} onChange={e => setSrvForm({...srvForm, branchId: e.target.value})}>
                    <option value="">Salon wide</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="hub-form-row">
                <div className="hub-form-group">
                  <label>Category</label>
                  <select className="hub-input" value={srvForm.categoryId} onChange={e => setSrvForm({...srvForm, categoryId: e.target.value})}>
                    <option value="">Select category</option>
                    {categories.flatMap(c => [
                      <option key={c.id} value={c.id}>{c.name}</option>,
                      ...(c.children || []).map(sub => (
                        <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{c.name} / {sub.name}</option>
                      ))
                    ])}
                  </select>
                </div>
                <div className="hub-form-group">
                  <label>Gender</label>
                  <select className="hub-input" value={srvForm.gender} onChange={e => setSrvForm({...srvForm, gender: e.target.value})}>
                    <option value="UNISEX">Unisex</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </div>
              </div>

              <div className="hub-form-row">
                <div className="hub-form-group">
                  <label>Price</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.price} onChange={e => setSrvForm({...srvForm, price: e.target.value})} />
                </div>
                <div className="hub-form-group">
                  <label>Duration (min)</label>
                  <select className="hub-input" value={srvForm.durationMin} onChange={e => setSrvForm({...srvForm, durationMin: e.target.value})}>
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="hub-form-row">
                <div className="hub-form-group">
                  <label>Tax Rate %</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.taxRate} onChange={e => setSrvForm({...srvForm, taxRate: e.target.value})} />
                </div>
                <div className="hub-form-group">
                  <label>Commission %</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.commissionPct} onChange={e => setSrvForm({...srvForm, commissionPct: e.target.value})} />
                </div>
              </div>

              <div className="hub-form-group">
                <label>Description</label>
                <textarea className="hub-input" rows="3" value={srvForm.description} onChange={e => setSrvForm({...srvForm, description: e.target.value})} placeholder="Optional service notes..." />
              </div>

              <div className="hub-form-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <div className="hub-toggle-group">
                  <input type="checkbox" checked={srvForm.onlineBookingEnabled} onChange={e => setSrvForm({...srvForm, onlineBookingEnabled: e.target.checked})} />
                  <span>Enable Online Booking</span>
                </div>
                <div className="hub-toggle-group">
                  <input type="checkbox" checked={srvForm.isFeatured} onChange={e => setSrvForm({...srvForm, isFeatured: e.target.checked})} />
                  <span>Featured</span>
                </div>
                <div className="hub-toggle-group">
                  <input type="checkbox" checked={srvForm.isPopular} onChange={e => setSrvForm({...srvForm, isPopular: e.target.checked})} />
                  <span>Popular</span>
                </div>
              </div>
            </div>

            <div className="hub-modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setIsServiceModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-submit">{editingId ? 'Save Changes' : 'Create Service'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
