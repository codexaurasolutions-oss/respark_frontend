import { Link, useOutletContext } from "react-router-dom";

export default function CollectionsPage() {
  const { salon } = useOutletContext();

  const collections = [
    { id: 1, name: "Hair Styling & Cutting", img: "https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?q=80&w=800&auto=format&fit=crop", count: 12 },
    { id: 2, name: "Skin & Facial Therapy", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop", count: 8 },
    { id: 3, name: "Nail Artistry", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop", count: 24 },
    { id: 4, name: "Bridal Packages", img: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=800&auto=format&fit=crop", count: 5 },
    { id: 5, name: "Massage & Spa", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop", count: 10 },
    { id: 6, name: "Premium Retail Products", img: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=800&auto=format&fit=crop", count: 45 }
  ];

  return (
    <div>
      <div style={{ background: '#111', color: 'white', padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--sf-font-serif)', fontSize: '3.5rem', margin: 0 }}>All Collections</h1>
        <p style={{ fontSize: '1.2rem', color: '#aaa', marginTop: 16 }}>Browse our complete range of services and products.</p>
      </div>

      <section className="sf-section">
        <div className="sf-grid">
          {collections.map(cat => (
            <Link to={`/site/${salon.slug}/category/${cat.id}`} key={cat.id} className="sf-category-card">
              <img src={cat.img} alt={cat.name} />
              <div className="sf-category-overlay">
                <h3>{cat.name}</h3>
                <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>{cat.count} Items <span style={{ fontSize: '1.2rem' }}>&rarr;</span></p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
