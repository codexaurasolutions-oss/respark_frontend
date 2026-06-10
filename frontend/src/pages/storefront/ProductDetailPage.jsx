import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";

export default function ProductDetailPage() {
  const { salon, addToCart } = useOutletContext();
  const { id } = useParams();
  const [qty, setQty] = useState(1);

  const product = { 
    id, 
    name: `Luxury Styling ${id}`, 
    price: 120.00,
    durationMin: 60,
    isPopular: true,
    description: "Experience our premium signature styling service designed to revitalize and refresh your look. Our expert professionals use only the highest quality products."
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '60px 20px' }}>
      <Link to={`/site/${salon.slug}/collections`} style={{ color: 'var(--sf-text-light)', textDecoration: 'none', marginBottom: 32, display: 'inline-block' }}>&larr; Back</Link>
      
      <div className="sf-product-detail-layout">
        <div className="sf-product-image-container">
          <img src={`https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop&sig=${id}`} alt="Product" />
        </div>

        <div className="sf-product-meta">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span className="sf-badge-premium">Signature Service</span>
            {product.isPopular && <span className="sf-badge-light">🔥 Popular</span>}
            <span className="sf-badge-light">⏱️ {product.durationMin} Mins</span>
          </div>

          <h1 className="sf-product-headline">{product.name}</h1>
          <p className="sf-product-price-large">{salon.currency} {product.price.toFixed(2)}</p>
          
          <div className="sf-product-divider"></div>

          <p style={{ fontSize: '1.05rem', color: 'var(--sf-text-light)', lineHeight: 1.8, marginBottom: 32 }}>
            {product.description}
          </p>

          <div className="sf-product-highlights">
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontFamily: 'var(--sf-font-serif)', color: 'var(--sf-primary)' }}>What to Expect</h3>
            <ul className="sf-checklist">
              <li>Premium consultation with an expert stylist</li>
              <li>Use of industry-leading, high-end products</li>
              <li>Relaxing hot towel finish and massage</li>
            </ul>
          </div>

          <div className="sf-product-divider"></div>

          <div className="sf-purchase-action-area">
            <div className="sf-qty-selector">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="sf-qty-btn">-</button>
              <input type="text" value={qty} readOnly className="sf-qty-input" />
              <button onClick={() => setQty(qty + 1)} className="sf-qty-btn">+</button>
            </div>
            <button className="sf-btn sf-btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1rem', borderRadius: '100px' }} onClick={() => addToCart({...product, qty})}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
