import { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../api/client";
import { formatCurrency, normalizeCurrencyCode } from "../../utils/currency";

export default function HomePage() {
  const { salon, genericSettings: layoutGenericSettings } = useOutletContext();
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [genericSettings, setGenericSettings] = useState({});
  const [visibility, setVisibility] = useState({});
  const categoryRollerRef = useRef(null);
  const currencyCode = normalizeCurrencyCode(
    genericSettings?.defaultCurrency ||
    genericSettings?.currency ||
    layoutGenericSettings?.defaultCurrency ||
    layoutGenericSettings?.currency ||
    salon?.defaultCurrency ||
    salon?.currency ||
    "INR"
  );
  const money = (value) => formatCurrency(value, currencyCode);
  const listStyle = genericSettings.showProductGrid === false
    ? { display: "grid", gridTemplateColumns: "1fr", gap: 24 }
    : undefined;
  const showThumbnails = genericSettings.showProductThumbnails !== false;
  const includeProductsOnHome = genericSettings.showProductsOnHome !== false;
  const featuredItems = [
    ...services.slice(0, 4),
    ...(visibility.products && includeProductsOnHome ? products.slice(0, 4) : [])
  ].slice(0, 8);

  const scrollRoller = (dir) => {
    if (categoryRollerRef.current) {
      const scrollAmount = 300;
      categoryRollerRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // In a real app, config comes from the website editor payload
  const config = {
    heroTitle: salon?.websiteConfig?.heroTitle || "Elevate Your Beauty Experience",
    heroSubtitle: salon?.websiteConfig?.heroSubtitle || "Discover premium salon services and exclusive products curated just for you.",
    heroImage: salon?.websiteConfig?.heroImage || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1600&auto=format&fit=crop"
  };

  useEffect(() => {
    // Fetch some dynamic data for the storefront
    api.get(`/public/salon/${salon.slug}`).then(res => {
      setServices(res.data.services || []);
      setProducts(res.data.products || []);
      setGenericSettings(res.data.genericSettings || {});
      setVisibility(res.data.visibility || {});
      setBranches(res.data.branches || []);
      // Extract unique categories from services for the collections view
      const cats = [...new Set(res.data.services?.map(s => s.categoryId).filter(Boolean))];
      setCategories(cats);
    }).catch(console.error);
  }, [salon.slug]);

  return (
    <>
      {/* Section 1: Hero */}
      <section className="sf-hero">
        <div className="sf-hero-content">
          <h1>{config.heroTitle}</h1>
          <p>{config.heroSubtitle}</p>
          <div className="sf-hero-buttons">
            <Link to={`/site/${salon.slug}/collections`} className="sf-btn sf-btn-primary">Shop Collections</Link>
            <Link to={`/site/${salon.slug}/book`} className="sf-btn sf-btn-secondary">Book Appointment</Link>
          </div>
        </div>
        <div className="sf-hero-visual">
          {config.heroImage ? (
            <img src={config.heroImage} alt="Salon Hero" />
          ) : (
            <div className="sf-placeholder-img">Image</div>
          )}
        </div>
      </section>

      {/* Branch Selector */}
      {genericSettings?.showAllBranchesInCatalogue && branches.length > 0 && (
        <section className="sf-section" style={{ background: '#fff', padding: '40px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ marginBottom: 20, fontSize: '1.1rem', color: 'var(--sf-text-light)' }}>Our Locations</h3>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {branches.map((b) => (
                <div key={b.id} style={{ padding: '12px 24px', border: '1px solid var(--sf-border)', borderRadius: 'var(--sf-radius-md)', background: '#fafafa' }}>
                  <strong>{b.name}</strong>
                  {b.address && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--sf-text-light)' }}>{b.address}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Featured Collections */}
      <section className="sf-section" style={{ background: '#fafafa' }}>
        <div className="sf-section-header">
          <span style={{ color: 'var(--sf-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Discover</span>
          <h2>{genericSettings.serviceListHeading || "Featured Collections"}</h2>
          <p>Explore our carefully curated salon categories</p>
        </div>
        
        <div className="sf-roller-wrapper">
          <button className="sf-roller-btn left" onClick={() => scrollRoller('left')}>&larr;</button>
          
          <div className="sf-category-roller" ref={categoryRollerRef}>
            {[
              { id: 1, name: "Hair Care", img: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop" },
              { id: 2, name: "Skin Therapy", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop" },
              { id: 3, name: "Nail Artistry", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop" },
              { id: 4, name: "Spa Retreat", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
              { id: 5, name: "Bridal Makeup", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=800&auto=format&fit=crop" },
              { id: 6, name: "Massage Therapy", img: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop" }
            ].map(cat => (
              <Link to={`/site/${salon.slug}/category/${cat.id}`} key={cat.id} className="sf-category-circle-card">
                <div className="sf-category-circle">
                  <img src={cat.img} alt={cat.name} />
                </div>
                <h3 className="sf-category-circle-title">{cat.name}</h3>
              </Link>
            ))}
          </div>

          <button className="sf-roller-btn right" onClick={() => scrollRoller('right')}>&rarr;</button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to={`/site/${salon.slug}/collections`} className="sf-btn sf-btn-secondary">View All Services</Link>
        </div>
      </section>

      {/* Section 3: Popular Services/Products */}
      <section className="sf-section">
        <div className="sf-section-header">
          <span style={{ color: 'var(--sf-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Trending</span>
          <h2>{visibility.products && includeProductsOnHome ? (genericSettings.productListHeading || "Popular Experiences") : (genericSettings.serviceListHeading || "Popular Services")}</h2>
          <p>{visibility.products && includeProductsOnHome ? "Our most booked services and top-rated products" : "Our most booked services"}</p>
        </div>
        
        <div className="sf-grid" style={listStyle}>
          {featuredItems.map((service, idx) => (
            <Link to={`/site/${salon.slug}/product/${service.id}`} key={service.id || idx} className="sf-product-card">
              {showThumbnails ? <div className="sf-product-media">
                <div className="sf-product-badge">Top Rated</div>
                <img src={`https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop&sig=${idx}`} alt={service.name} />
              </div> : null}
              <div className="sf-product-info">
                <span className="sf-product-category">Signature Service</span>
                <h3 className="sf-product-title">{service.name}</h3>
                <p className="sf-product-price">{money(service.price)}</p>
                {(genericSettings.showAddButtonOnProductCard || genericSettings.showGetQuoteButton) ? (
                  <div style={{ marginTop: 'auto', paddingTop: '20px', paddingBottom: '24px' }}>
                    <span className="sf-btn-outline">{genericSettings.showGetQuoteButton ? "Get Quote" : "Add"}</span>
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
          {/* Fallback if no dynamic services exist */}
          {services.length === 0 && [1, 2, 3, 4].map(i => (
            <Link to={`/site/${salon.slug}/product/${i}`} key={i} className="sf-product-card">
              {showThumbnails ? <div className="sf-product-media">
                <img src={`https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop&sig=${i}`} alt="Sample Service" />
              </div> : null}
              <div className="sf-product-info">
                <span className="sf-product-category">Sample Category</span>
                <h3 className="sf-product-title">Luxury Treatment {i}</h3>
                <p className="sf-product-price">{money(99)}</p>
                <div style={{ marginTop: 'auto', paddingTop: '20px', paddingBottom: '24px' }}>
                  <span className="sf-btn-outline">Purchase Now</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 4: Why Choose Us (Features Split) */}
      <section className="sf-section" style={{ background: '#fff' }}>
        <div className="sf-section-header">
          <span style={{ color: 'var(--sf-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>The {salon.name} Standard</span>
          <h2>Why Choose Us</h2>
          <p>Experience the difference of true professional care.</p>
        </div>
        <div className="sf-features-split">
          <div className="sf-features-image">
            <img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop&sig=100" alt="Premium Salon" />
            <div className="sf-features-image-badge">
              <span className="sf-features-badge-number">10+</span>
              <span className="sf-features-badge-text">Years of Excellence</span>
            </div>
          </div>
          <div className="sf-features-list">
            <div className="sf-feature-item">
              <span className="sf-feature-number">01</span>
              <div>
                <h3 className="sf-feature-title">Premium Products</h3>
                <p className="sf-feature-text">We exclusively use top-tier, industry-leading products to ensure the best possible results for your hair and skin.</p>
              </div>
            </div>
            <div className="sf-feature-item">
              <span className="sf-feature-number">02</span>
              <div>
                <h3 className="sf-feature-title">Expert Stylists</h3>
                <p className="sf-feature-text">Our team consists of award-winning professionals continuously trained in the latest global trends and techniques.</p>
              </div>
            </div>
            <div className="sf-feature-item">
              <span className="sf-feature-number">03</span>
              <div>
                <h3 className="sf-feature-title">Serene Atmosphere</h3>
                <p className="sf-feature-text">Step into an oasis of calm. Our salon is designed to provide a relaxing, luxurious retreat from the busy world outside.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Section 5: The Story / About */}
      <section className="sf-section" style={{ padding: '120px 20px' }}>
        <div className="sf-about">
          <div className="sf-about-images">
            <img src="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop" alt="Salon interior" />
            <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop" alt="Stylist working" style={{ marginTop: 60 }} />
          </div>
          <div className="sf-about-content">
            <span style={{ color: 'var(--sf-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Our Heritage</span>
            <h2 className="sf-about-headline">The Story Behind {salon.name}</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--sf-text-light)', lineHeight: 1.8, marginBottom: 32 }}>
              We believe in delivering an exceptional experience tailored to your unique style. Our team of professionals is dedicated to making you look and feel your absolute best in a luxurious, relaxing environment.
            </p>
            <Link to={`/site/${salon.slug}/about`} className="sf-btn sf-btn-primary">Discover Our Story</Link>
          </div>
        </div>
      </section>
      {/* Section 6: Client Reviews (Marquee) */}
      <section className="sf-section" style={{ padding: '80px 0', overflow: 'hidden' }}>
        <div className="sf-section-header">
          <span style={{ color: 'var(--sf-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>Testimonials</span>
          <h2>Client Stories</h2>
        </div>
        
        <div className="sf-marquee-container">
          {/* Double content for seamless looping */}
          <div className="sf-marquee-content">
            {[1, 2].map((loop) => (
              <div key={loop} style={{ display: 'flex', gap: '24px' }}>
                <div className="sf-review-card">
                  <div className="sf-review-header">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop" className="sf-review-avatar" alt="Sarah" />
                    <div>
                      <span className="sf-review-author">Sarah Jenkins</span>
                      <div className="sf-review-stars">★★★★★</div>
                    </div>
                  </div>
                  <p className="sf-review-text">"Absolutely the best salon experience I've ever had. The stylists truly listened to what I wanted and delivered perfection."</p>
                </div>
                <div className="sf-review-card">
                  <div className="sf-review-header">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop" className="sf-review-avatar" alt="Michael" />
                    <div>
                      <span className="sf-review-author">Michael R.</span>
                      <div className="sf-review-stars">★★★★★</div>
                    </div>
                  </div>
                  <p className="sf-review-text">"The atmosphere is incredibly relaxing. I came in for a massage and facial, and felt like a completely new person leaving."</p>
                </div>
                <div className="sf-review-card">
                  <div className="sf-review-header">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop" className="sf-review-avatar" alt="Emma" />
                    <div>
                      <span className="sf-review-author">Emma Watson</span>
                      <div className="sf-review-stars">★★★★★</div>
                    </div>
                  </div>
                  <p className="sf-review-text">"Top-notch products and amazing service. They really know how to treat their clients. Highly recommended!"</p>
                </div>
                <div className="sf-review-card">
                  <div className="sf-review-header">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop" className="sf-review-avatar" alt="Chloe" />
                    <div>
                      <span className="sf-review-author">Chloe M.</span>
                      <div className="sf-review-stars">★★★★★</div>
                    </div>
                  </div>
                  <p className="sf-review-text">"I got my bridal makeup done here and it stayed flawless all day. The team was so supportive and professional."</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
