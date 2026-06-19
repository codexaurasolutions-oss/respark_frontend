import { Link, useOutletContext } from "react-router-dom";
import { formatCurrency, normalizeCurrencyCode } from "../../utils/currency";

export default function CheckoutPage() {
  const { salon, genericSettings } = useOutletContext();
  const currencyCode = normalizeCurrencyCode(
    genericSettings?.defaultCurrency || genericSettings?.currency || salon?.defaultCurrency || salon?.currency || "INR"
  );
  const money = (value) => formatCurrency(value, currencyCode);
  const minOrder = Number(genericSettings?.minimumOrderValue) || 0;
  const cartTotal = 120;
  const belowMinOrder = minOrder > 0 && cartTotal < minOrder;

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', padding: '60px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 60 }}>
        
        {/* Left Form */}
        <div>
          <Link to={`/site/${salon.slug}/cart`} style={{ color: 'var(--sf-text-light)', textDecoration: 'none', marginBottom: 32, display: 'inline-block' }}>&larr; Back to Cart</Link>
          <h1 style={{ fontFamily: 'var(--sf-font-serif)', fontSize: '2.5rem', margin: '0 0 32px' }}>Checkout</h1>
          
          <div style={{ background: 'white', padding: 32, borderRadius: 'var(--sf-radius-lg)', boxShadow: "none" }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 16 }}>Contact Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="email" placeholder="Email Address" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <input type="text" placeholder="First Name" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
                <input type="text" placeholder="Last Name" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
              </div>
              <input type="text" placeholder="Phone Number" style={{ padding: 12, border: '1px solid #ccc', borderRadius: 8, width: '100%' }} />
            </div>

            {(genericSettings?.pickupOrderingEnabled !== false || genericSettings?.homeDeliveryEnabled !== false) && (
              <>
                <h2 style={{ fontSize: '1.2rem', margin: '40px 0 24px', borderBottom: '1px solid #eee', paddingBottom: 16 }}>Delivery Method</h2>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  {genericSettings?.pickupOrderingEnabled !== false && (
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 16, border: '2px solid #2563eb', borderRadius: 8, cursor: 'pointer', background: '#eff6ff' }}>
                      <input type="radio" name="delivery" defaultChecked style={{ accentColor: '#2563eb' }} /> Pickup
                    </label>
                  )}
                  {genericSettings?.homeDeliveryEnabled !== false && (
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 16, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
                      <input type="radio" name="delivery" style={{ accentColor: '#2563eb' }} /> Delivery
                    </label>
                  )}
                </div>
              </>
            )}

            {genericSettings?.pickupDisclaimer ? (
              <div style={{ background: '#eff6ff', color: '#1e3a8a', padding: 16, borderRadius: 12, marginTop: 16, border: '1px solid #bfdbfe' }}>
                <strong>Pickup note:</strong> {genericSettings.pickupDisclaimer}
              </div>
            ) : null}

            {genericSettings?.deliveryDisclaimer ? (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: 16, borderRadius: 12, marginTop: 16, border: '1px solid #fde68a' }}>
                <strong>Delivery note:</strong> {genericSettings.deliveryDisclaimer}
              </div>
            ) : null}

            <h2 style={{ fontSize: '1.2rem', margin: '40px 0 24px', borderBottom: '1px solid #eee', paddingBottom: 16 }}>Payment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {genericSettings?.cashOnPickupEnabled !== false && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, border: '2px solid #2563eb', borderRadius: 8, cursor: 'pointer', background: '#eff6ff' }}>
                  <input type="radio" name="payment" defaultChecked style={{ accentColor: '#2563eb' }} /> Pay at salon counter
                </label>
              )}
              {genericSettings?.onlinePaymentEnabled && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" name="payment" style={{ accentColor: '#2563eb' }} /> Pay Online
                </label>
              )}
              {genericSettings?.cashOnDeliveryEnabled !== false && genericSettings?.homeDeliveryEnabled !== false && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" name="payment" style={{ accentColor: '#2563eb' }} /> Cash on Delivery
                </label>
              )}
            </div>

            {belowMinOrder && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: 16, borderRadius: 12, marginTop: 16, border: '1px solid #fecaca', fontSize: '0.9rem' }}>
                Minimum order amount is {money(minOrder)}. Please add more items.
              </div>
            )}

            <button className="sf-btn sf-btn-primary" style={{ width: '100%', padding: 16, marginTop: 40 }} disabled={belowMinOrder}>Confirm Order / Booking</button>
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
              <div style={{ fontWeight: 600 }}>{money(cartTotal)}</div>
            </div>

            {minOrder > 0 && (
              <div style={{ fontSize: '0.85rem', color: belowMinOrder ? '#dc2626' : '#16a34a', marginBottom: 12 }}>
                Minimum order: {money(minOrder)} {belowMinOrder ? `(need ${money(minOrder - cartTotal)} more)` : '✓ Met'}
              </div>
            )}

            <div style={{ borderTop: '1px solid #eee', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--sf-text-light)' }}>
                <span>Subtotal</span>
                <span>{money(cartTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--sf-text-light)' }}>
                <span>Taxes</span>
                <span>Calculated at checkout</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee', fontSize: '1.5rem', fontWeight: 700 }}>
                <span>Total</span>
                <span>{money(cartTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
