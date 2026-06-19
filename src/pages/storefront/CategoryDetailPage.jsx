import { useState, useEffect } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import { api } from "../../api/client";
import { formatCurrency, normalizeCurrencyCode } from "../../utils/currency";

export default function CategoryDetailPage() {
  const { salon, genericSettings } = useOutletContext();
  const { categoryId } = useParams();
  const [services, setServices] = useState([]);
  const currencyCode = normalizeCurrencyCode(
    genericSettings?.defaultCurrency ||
    genericSettings?.currency ||
    salon?.defaultCurrency ||
    salon?.currency ||
    "INR"
  );
  const money = (value) => formatCurrency(value, currencyCode);
  const listStyle = genericSettings.showProductGrid === false
    ? { display: "grid", gridTemplateColumns: "1fr", gap: 24 }
    : undefined;
  const showThumbnails = genericSettings.showProductThumbnails !== false;

  useEffect(() => {
    // In a real app, fetch products specific to this category
    api.get(`/public/salon/${salon.slug}`).then(res => {
      setServices(res.data.services || []);
    }).catch(console.error);
  }, [salon.slug]);

  return (
    <div>
      <div style={{ background: '#fafafa', padding: '60px 20px', borderBottom: '1px solid var(--sf-border)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <Link to={`/site/${salon.slug}/collections`} style={{ color: 'var(--sf-text-light)', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>&larr; Back to Collections</Link>
          <h1 style={{ fontFamily: 'var(--sf-font-serif)', fontSize: '3rem', margin: 0, color: 'var(--sf-primary)' }}>Collection: Signature Styles</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--sf-text-light)', marginTop: 12 }}>Explore the best items in this category.</p>
        </div>
      </div>

      <section className="sf-section">
        <div className="sf-category-layout">
          
          <aside className="sf-category-sidebar">
            <div className="sf-sticky-sidebar">
              <h3 className="sf-filter-heading">Filters</h3>
              <div className="sf-filter-list">
                <label className="sf-checkbox-label">
                  <input type="checkbox" className="sf-checkbox" defaultChecked /> Services
                </label>
                <label className="sf-checkbox-label">
                  <input type="checkbox" className="sf-checkbox" /> Products
                </label>
                <label className="sf-checkbox-label">
                  <input type="checkbox" className="sf-checkbox" /> Packages
                </label>
              </div>

              <h3 className="sf-filter-heading" style={{ marginTop: 32 }}>Sort By</h3>
              <div className="sf-select-wrapper">
                <select >
                  <option>Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest Arrivals</option>
                </select>
                <span className="sf-select-icon">▼</span>
              </div>
            </div>
          </aside>

          <div className="sf-grid" style={listStyle}>
            {services.length === 0 ? (
              [1, 2, 3, 4, 5, 6].map(i => (
                <Link to={`/site/${salon.slug}/product/${i}`} key={i} className="sf-product-card">
                  {showThumbnails ? <div className="sf-product-media">
                    <img src={`https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop&sig=${i+10}`} alt="Sample Service" />
                  </div> : null}
                  <div className="sf-product-info">
                    <span className="sf-product-category">Sample Category</span>
                    <h3 className="sf-product-title">Luxury Item {i}</h3>
                    <p className="sf-product-price">{money(99)}</p>
                    <div style={{ marginTop: 'auto', paddingTop: '20px', paddingBottom: '24px' }}>
                      <span className="sf-btn-outline">Purchase Now</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              services.map(service => (
                <Link to={`/site/${salon.slug}/product/${service.id}`} key={service.id} className="sf-product-card">
                  {showThumbnails ? <div className="sf-product-media">
                    <img src={`https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop&sig=${service.id}`} alt={service.name} />
                  </div> : null}
                  <div className="sf-product-info">
                    <span className="sf-product-category">Signature Service</span>
                    <h3 className="sf-product-title">{service.name}</h3>
                    <p className="sf-product-price">{money(service.price)}</p>
                    <div style={{ marginTop: 'auto', paddingTop: '20px', paddingBottom: '24px' }}>
                      <span className="sf-btn-outline">Purchase Now</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
