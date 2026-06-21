import { Link, useOutletContext } from "react-router-dom";

export default function CheckoutPage() {
  const { salon } = useOutletContext();

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 60 }}>
        
        {/* Left Form */}
        <div>
          <Link to={`/site/${salon.slug}/cart`} style={{ color: 'var(--sf-text-light)', textDecoration: 'none', marginBottom: 32, display: 'inline-block' }}>&larr; Back to Cart</Link>
          <h1 style={{ fontFamily: 'var(--sf-font-serif)', fontSize: '2.5rem', margin: '0 0 32px' }}>Checkout</h1>
          
          <div style={{ background: 'white', padding: 32, borderRadius: 'var(--sf-radius-lg)', boxShadow: 'var(--sf-shadow)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 16 }}>Contact Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="email" placeholder="Email Address" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <input type="text" placeholder="First Name" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
                <input type="text" placeholder="Last Name" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
              </div>
              <input type="text" placeholder="Phone Number" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
            </div>

            <h2 style={{ fontSize: '1.2rem', margin: '40px 0 24px', borderBottom: '1px solid #eee', paddingBottom: 16 }}>Payment</h2>
            <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, border: '1px solid #ddd', textAlign: 'center' }}>
              <p style={{ color: 'var(--sf-text-light)', margin: 0 }}>Pay at salon counter</p>
            </div>

            <button className="sf-btn sf-btn-primary" style={{ width: '100%', padding: 16, marginTop: 40 }}>Confirm Order / Booking</button>
          </div>
        </div>

        {/* Right Summary */}
        <div>
          <div className="sf-sticky-sidebar">
            <h3 style={{ margin: '0 0 24px', fontSize: '1.2rem' }}>Order Summary</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=100&auto=format&fit=crop" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} alt="Item" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0 }}>Luxury Styling</h4>
                <p style={{ margin: 0, color: 'var(--sf-text-light)', fontSize: '0.9rem' }}>Qty: 1</p>
              </div>
              <div style={{ fontWeight: 600 }}>$120.00</div>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--sf-text-light)' }}>
                <span>Subtotal</span>
                <span>$120.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--sf-text-light)' }}>
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee', fontSize: '1.5rem', fontWeight: 700 }}>
                <span>Total</span>
                <span>$120.00</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
