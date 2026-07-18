import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { formatApiError } from '../../utils/apiError';
import { useBranch } from '../../context/BranchContext';
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
  const { selectedBranchId, branches: ctxBranches } = useBranch();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
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
    salePrice: '',
    durationMin: 30,
    taxRate: 0,
    commissionPct: 0,
    onlineBookingEnabled: false,
    descriptions: [''],
    isFeatured: false,
    isPopular: false,
    position: 0,
    isActive: true,
    hideFromCatalogue: false,
    nonDiscountable: false,
    serviceTag: '',
    serviceRemainderDays: 0,
    consumables: [],
    taxes: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [catRes, srvRes, branchRes, prodRes] = await Promise.allSettled([
        api.get('/owner/service-categories', { params: branchParams }),
        api.get('/owner/services', { params: branchParams }),
        api.get('/owner/branches'),
        api.get('/owner/products', { params: branchParams })
      ]);
      if (catRes.status === "fulfilled") setCategories(catRes.value.data || []);
      else throw catRes.reason;
      if (srvRes.status === "fulfilled") setServices(srvRes.value.data || []);
      else throw srvRes.reason;
      if (branchRes.status === "fulfilled") setBranches(branchRes.value.data || []);
      if (prodRes.status === "fulfilled") setProducts(prodRes.value.data || []);
    } catch (error) {
      setStatus({ error: formatApiError(error, "Failed to load data"), success: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

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
      branchId: selectedBranchId || '',
      categoryId: selectedCategory || '',
      gender: 'UNISEX',
      price: 0,
      salePrice: '',
      durationMin: 30,
      taxRate: 0,
      commissionPct: 0,
      onlineBookingEnabled: false,
      descriptions: [''],
      isFeatured: false,
      isPopular: false,
      position: 0,
      isActive: true,
      hideFromCatalogue: false,
      nonDiscountable: false,
      serviceTag: '',
      serviceRemainderDays: 0,
      consumables: [],
      taxes: []
    });
  };

  const openNewService = () => {
    resetServiceForm();
    setIsServiceModalOpen(true);
  };

  const startEditService = (service) => {
    setEditingId(service.id);
    let descs = [''];
    if (Array.isArray(service.description)) {
      descs = service.description.length > 0 ? service.description : [''];
    } else if (service.description && typeof service.description === 'string') {
      descs = [service.description];
    }
    setSrvForm({
      name: service.name || '',
      branchId: service.branchId || '',
      categoryId: service.categoryId || service.category?.id || '',
      gender: service.gender || 'UNISEX',
      price: Number(service.price || 0),
      salePrice: service.salePrice != null ? Number(service.salePrice) : '',
      durationMin: Number(service.durationMin || 30),
      taxRate: Number(service.taxRate || 0),
      commissionPct: Number(service.commissionPct || 0),
      onlineBookingEnabled: Boolean(service.onlineBookingEnabled),
      descriptions: descs,
      isFeatured: Boolean(service.isFeatured),
      isPopular: Boolean(service.isPopular),
      position: service.position ?? 0,
      isActive: service.isActive !== false,
      hideFromCatalogue: Boolean(service.hideFromCatalogue),
      nonDiscountable: Boolean(service.nonDiscountable),
      serviceTag: service.serviceTag || '',
      serviceRemainderDays: service.serviceRemainderDays ?? 0,
      consumables: (service.consumables || []).map(c => ({ productId: c.productId || c.product?.id || '', reqdQty: Number(c.reqdQty || 0), productName: c.product?.name || '' })),
      taxes: (service.taxes || []).map(t => ({ name: t.name || '', rate: Number(t.rate || 0) }))
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
    const filteredDescs = srvForm.descriptions.filter(d => d.trim() !== '');
    const payload = {
      name: srvForm.name.trim(),
      branchId: srvForm.branchId || undefined,
      categoryId: srvForm.categoryId || undefined,
      gender: srvForm.gender || undefined,
      price: Number(srvForm.price),
      salePrice: srvForm.salePrice !== '' && srvForm.salePrice != null ? Number(srvForm.salePrice) : null,
      durationMin: Number(srvForm.durationMin),
      taxRate: Number(srvForm.taxRate),
      commissionPct: Number(srvForm.commissionPct),
      onlineBookingEnabled: Boolean(srvForm.onlineBookingEnabled),
      description: filteredDescs.length === 1 ? filteredDescs[0] : filteredDescs.length > 0 ? filteredDescs : undefined,
      isFeatured: Boolean(srvForm.isFeatured),
      isPopular: Boolean(srvForm.isPopular),
      position: Number(srvForm.position),
      isActive: Boolean(srvForm.isActive),
      hideFromCatalogue: Boolean(srvForm.hideFromCatalogue),
      nonDiscountable: Boolean(srvForm.nonDiscountable),
      serviceTag: srvForm.serviceTag || undefined,
      serviceRemainderDays: Number(srvForm.serviceRemainderDays),
      consumables: srvForm.consumables.filter(c => c.productId).map(c => ({ productId: c.productId, reqdQty: Number(c.reqdQty) })),
      taxes: srvForm.taxes.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), rate: Number(t.rate) }))
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
                  <div key={service.id} className="hub-item-card" style={{ alignItems: 'flex-start', opacity: service.isActive === false ? 0.6 : 1 }}>
                    <div className="hub-item-info" style={{ width: '100%' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong>{service.name}</strong>
                        {service.serviceTag && <span style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "1px 8px", borderRadius: 4 }}>{service.serviceTag}</span>}
                        {service.hideFromCatalogue && <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "1px 8px", borderRadius: 4 }}>Hidden</span>}
                        {service.nonDiscountable && <span style={{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "1px 8px", borderRadius: 4 }}>No Discount</span>}
                      </div>
                      <div className="hub-item-meta" style={{ marginTop: 4 }}>
                        <span>Price ₹{Number(service.price || 0)}</span>
                        {service.salePrice != null && <span style={{ color: "#dc2626" }}>Sale ₹{Number(service.salePrice)}</span>}
                        <span>Duration {service.durationMin} min</span>
                        {Number(service.taxRate || 0) > 0 && <span>Tax {Number(service.taxRate)}%</span>}
                      </div>
                      <div className="hub-item-meta" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                        <span>{service.category?.name || 'Uncategorized'}</span>
                        <span>{service.branch?.name || 'Salon wide'}</span>
                        <span>{service.gender || 'UNISEX'}</span>
                        <span>Booking {service.onlineBookingEnabled ? 'Enabled' : 'Disabled'}</span>
                        {service.consumables?.length > 0 && <span>{service.consumables.length} consumable(s)</span>}
                        {service.taxes?.length > 0 && <span>{service.taxes.length} tax(es)</span>}
                      </div>
                      {Array.isArray(service.description) && service.description.length > 0 && (
                        <div className="hub-item-meta" style={{ marginTop: 6, color: '#475569' }}>
                          {service.description.join(' | ')}
                        </div>
                      )}
                      {typeof service.description === 'string' && service.description && (
                        <div className="hub-item-meta" style={{ marginTop: 6, color: '#475569' }}>
                          {service.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{ padding: '6px 14px', border: "1px solid var(--accent, #3b82f6)", borderRadius: 6, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
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
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              New Category
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 4, display: "flex" }}><X size={18} /></button>
            </div>
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
            <div className="hub-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{editingId ? 'Edit Service' : 'New Service'}</span>
              <button type="button" onClick={() => setIsServiceModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 4, display: "flex" }}><X size={18} /></button>
            </div>
            <div className="hub-modal-body">
              {/* Name + Active toggle */}
              <div className="hub-form-row">
                <div className="hub-form-group" style={{ flex: 2 }}>
                  <label>Name *</label>
                  <input type="text" className="hub-input" value={srvForm.name} onChange={e => setSrvForm({...srvForm, name: e.target.value})} placeholder="Haircut, Beard Trim..." />
                </div>
                <div className="hub-form-group" style={{ flex: 1, display: "flex", alignItems: "end", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={srvForm.isActive} onChange={e => setSrvForm({...srvForm, isActive: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                    Active
                  </label>
                </div>
              </div>

              {/* Category */}
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
              </div>

              {/* Duration + Position + Service Reminder Days */}
              <div className="hub-form-row">
                <div className="hub-form-group">
                  <label>Duration (min)</label>
                  <select className="hub-input" value={srvForm.durationMin} onChange={e => setSrvForm({...srvForm, durationMin: e.target.value})}>
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="hub-form-group">
                  <label>Position *</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.position} onChange={e => setSrvForm({...srvForm, position: e.target.value})} />
                </div>
                <div className="hub-form-group">
                  <label>Service Reminder Days</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.serviceRemainderDays} onChange={e => setSrvForm({...srvForm, serviceRemainderDays: e.target.value})} />
                </div>
              </div>

              {/* Group (Gender) + Hide from catalogue */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid #f1f5f9", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Group</span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                  <input type="checkbox" checked={srvForm.hideFromCatalogue} onChange={e => setSrvForm({...srvForm, hideFromCatalogue: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                  Hide from catalogue
                </label>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                {[{value: "UNISEX", label: "Both"}, {value: "FEMALE", label: "Female"}, {value: "MALE", label: "Male"}].map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#334155", cursor: "pointer" }}>
                    <input type="radio" name="srvGender" checked={srvForm.gender === opt.value} onChange={() => setSrvForm({...srvForm, gender: opt.value})} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                    {opt.label}
                  </label>
                ))}
              </div>

              {/* Price + Sale Price + Non Discountable */}
              <div className="hub-form-row" style={{ alignItems: "end" }}>
                <div className="hub-form-group" style={{ flex: 1 }}>
                  <label>Price (₹)</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.price} onChange={e => setSrvForm({...srvForm, price: e.target.value})} />
                </div>
                <div className="hub-form-group" style={{ flex: 1 }}>
                  <label>Sale Price (₹)</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.salePrice} onChange={e => setSrvForm({...srvForm, salePrice: e.target.value})} placeholder="Optional" />
                </div>
                <div className="hub-form-group" style={{ flex: 1, display: "flex", alignItems: "end", paddingBottom: 2 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155", cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={srvForm.nonDiscountable} onChange={e => setSrvForm({...srvForm, nonDiscountable: e.target.checked})} style={{ width: 18, height: 18, accentColor: "#2563eb" }} />
                    Non Discountable
                  </label>
                </div>
              </div>

              {/* Tax Rate + Commission % + Service Tag */}
              <div className="hub-form-row">
                <div className="hub-form-group">
                  <label>Tax Rate %</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.taxRate} onChange={e => setSrvForm({...srvForm, taxRate: e.target.value})} />
                </div>
                <div className="hub-form-group">
                  <label>Commission %</label>
                  <input type="number" min="0" className="hub-input" value={srvForm.commissionPct} onChange={e => setSrvForm({...srvForm, commissionPct: e.target.value})} />
                </div>
                <div className="hub-form-group">
                  <label>Service Tag</label>
                  <input type="text" className="hub-input" value={srvForm.serviceTag} onChange={e => setSrvForm({...srvForm, serviceTag: e.target.value})} placeholder="e.g. Premium, Basic..." />
                </div>
              </div>

              {/* Multiple Descriptions */}
              <div style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Description</span>
                  <button type="button" onClick={() => setSrvForm({...srvForm, descriptions: [...srvForm.descriptions, '']})} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                {srvForm.descriptions.map((desc, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <input type="text" className="hub-input" value={desc} onChange={e => {
                        const newDescs = [...srvForm.descriptions];
                        newDescs[idx] = e.target.value;
                        setSrvForm({...srvForm, descriptions: newDescs});
                      }} placeholder={`Service description ${idx + 1}`} style={{ width: "100%" }} />
                    </div>
                    {srvForm.descriptions.length > 1 && (
                      <button type="button" onClick={() => {
                        const newDescs = srvForm.descriptions.filter((_, i) => i !== idx);
                        setSrvForm({...srvForm, descriptions: newDescs});
                      }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 20, padding: "4px 8px", lineHeight: 1 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Consumables */}
              <div style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Consumables</span>
                  <button type="button" onClick={() => setSrvForm({...srvForm, consumables: [...srvForm.consumables, { productId: '', reqdQty: 0, productName: '' }]})} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                {srvForm.consumables.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div style={{ flex: 2 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Item</label>}
                      <select className="hub-input" value={item.productId} onChange={e => {
                        const newItems = [...srvForm.consumables];
                        const prod = products.find(p => p.id === e.target.value);
                        newItems[idx] = {...newItems[idx], productId: e.target.value, productName: prod?.name || ''};
                        setSrvForm({...srvForm, consumables: newItems});
                      }} style={{ width: "100%" }}>
                        <option value="">Select product</option>
                        {products.filter(p => p.isActive && p.productType === "CONSUMABLE").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Reqd Qty</label>}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" min="0" className="hub-input" value={item.reqdQty} onChange={e => {
                          const newItems = [...srvForm.consumables];
                          newItems[idx] = {...newItems[idx], reqdQty: e.target.value};
                          setSrvForm({...srvForm, consumables: newItems});
                        }} style={{ flex: 1, minWidth: 0 }} />
                        {item.productId && (
                          <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0 }}>
                            {products.find(p => p.id === item.productId)?.unit || "pcs"}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => {
                      const newItems = srvForm.consumables.filter((_, i) => i !== idx);
                      setSrvForm({...srvForm, consumables: newItems});
                    }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 20, padding: "4px 8px", lineHeight: 1, marginBottom: 2 }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Taxes */}
              <div style={{ padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#0f172a" }}>Taxes</span>
                  <button type="button" onClick={() => setSrvForm({...srvForm, taxes: [...srvForm.taxes, { name: '', rate: 0 }]})} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                {srvForm.taxes.map((tax, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "end" }}>
                    <div style={{ flex: 2 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Tax Name</label>}
                      <input type="text" className="hub-input" value={tax.name} onChange={e => {
                        const newTaxes = [...srvForm.taxes];
                        newTaxes[idx] = {...newTaxes[idx], name: e.target.value};
                        setSrvForm({...srvForm, taxes: newTaxes});
                      }} placeholder="GST, VAT..." style={{ width: "100%" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {idx === 0 && <label style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "block" }}>Rate %</label>}
                      <input type="number" min="0" className="hub-input" value={tax.rate} onChange={e => {
                        const newTaxes = [...srvForm.taxes];
                        newTaxes[idx] = {...newTaxes[idx], rate: e.target.value};
                        setSrvForm({...srvForm, taxes: newTaxes});
                      }} style={{ width: "100%" }} />
                    </div>
                    <button type="button" onClick={() => {
                      const newTaxes = srvForm.taxes.filter((_, i) => i !== idx);
                      setSrvForm({...srvForm, taxes: newTaxes});
                    }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 20, padding: "4px 8px", lineHeight: 1, marginBottom: 2 }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Toggle Row */}
              <div className="hub-form-row" style={{ marginTop: 8, flexWrap: 'wrap', borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
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
