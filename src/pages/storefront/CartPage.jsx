import { Link, useOutletContext } from "react-router-dom";

export default function CartPage() {
  const { salon } = useOutletContext();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 20px', minHeight: '60vh' }}>
      <h1 style={{ fontFamily: 'var(--sf-font-serif)', fontSize: '3rem', margin: '0 0 40px', color: 'var(--sf-primary)' }}>Your Cart</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
        {/* Cart Item */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 24, border: '1px solid var(--sf-border)', borderRadius: 'var(--sf-radius-md)' }}>
          <img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200&auto=format&fit=crop" style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover' }} alt="Item" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Luxury Styling Treatment</h3>
            <p style={{ margin: 0, color: 'var(--sf-text-light)' }}>Signature Service</p>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>$120.00</div>
          <button style={{ background: 'transparent', border: 'none', color: 'red', cursor: 'pointer', padding: 8 }}>Remove</button>
        </div>
      </div>

      <div style={{ background: '#fafafa', padding: 32, borderRadius: 'var(--sf-radius-lg)', textAlign: 'right' }}>
        <p style={{ fontSize: '1.2rem', margin: '0 0 8px', color: 'var(--sf-text-light)' }}>Subtotal: $120.00</p>
        <p style={{ fontSize: '1.5rem', margin: '0 0 24px', fontWeight: 700 }}>Total: $120.00</p>
        <Link to={`/site/${salon.slug}/checkout`} className="sf-btn sf-btn-primary" style={{ padding: '16px 48px' }}>Proceed to Checkout</Link>
      </div>
    </div>
  );
}
