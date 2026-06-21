import { useState, useEffect } from "react";
import { Outlet, Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import "../../storefront.css";

export default function StorefrontLayout() {
  const { slug } = useParams();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart([...cart, item]);
    alert("Added to cart!");
  };

  useEffect(() => {
    api.get(`/public/salon/${slug}`)
      .then(res => {
        const fullSalon = { ...res.data.salon, websiteConfig: res.data.websiteConfig };
        setSalon(fullSalon);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="storefront-wrapper"><div className="sf-placeholder-img">Loading...</div></div>;
  if (!salon) return <div className="storefront-wrapper"><div className="sf-placeholder-img">Store Not Found</div></div>;

  return (
    <div className="storefront-wrapper">
      <header className="sf-header">
        <div className="sf-nav-container">
          <Link to={`/site/${salon.slug}`} className="sf-brand">
            {salon.logoUrl ? <img src={salon.logoUrl} alt={salon.name} /> : <div style={{ width: 40, height: 40, background: '#111', borderRadius: 8 }} />}
            {salon.name}
          </Link>
          
          <nav className="sf-nav-links">
            <Link to={`/site/${salon.slug}`}>Home</Link>
            <Link to={`/site/${salon.slug}/collections`}>Collections</Link>
            <Link to={`/site/${salon.slug}/about`}>About Us</Link>
          </nav>
          
          <div className="sf-header-actions">
            <Link to={`/site/${salon.slug}/cart`} className="sf-btn sf-btn-secondary">
              Cart ({cart.length})
            </Link>
            <Link to={`/site/${salon.slug}/book`} className="sf-btn sf-btn-primary">
              Book Appointment
            </Link>
          </div>
        </div>
      </header>
      
      <main>
        <Outlet context={{ salon, cart, addToCart }} />
      </main>
      
      <footer style={{ padding: '60px 20px', background: '#111', color: 'white', textAlign: 'center', marginTop: 'auto' }}>
        <p>&copy; {new Date().getFullYear()} {salon.name}. All rights reserved.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <Link to={`/site/${salon.slug}/terms`} style={{ color: "#cbd5e1" }}>Terms</Link>
          <Link to={`/site/${salon.slug}/privacy`} style={{ color: "#cbd5e1" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
