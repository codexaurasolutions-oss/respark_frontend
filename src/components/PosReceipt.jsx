import { Download, Printer, QrCode, X } from "lucide-react";

const Text = ({ children, style }) => <span style={style}>{children}</span>;
const Divider = ({ dashed = false, style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      borderTop: `1px ${dashed ? "dashed" : "solid"} #cbd5e1`,
      margin: "12px 0",
      ...style
    }}
  />
);
const Tag = ({ color = "default", children, style = {} }) => {
  const palette = {
    success: { background: "#dcfce7", color: "#166534" },
    error: { background: "#fee2e2", color: "#991b1b" },
    warning: { background: "#fef3c7", color: "#92400e" },
    default: { background: "#e2e8f0", color: "#334155" }
  };
  const tone = palette[color] || palette.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        ...tone,
        ...style
      }}
    >
      {children}
    </span>
  );
};

/* ─── helpers ─────────────────────────────── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColor = (s) =>
  ({ PAID: "success", UNPAID: "error", PARTIAL: "warning", CANCELLED: "default" }[s] ?? "default");

/* ─── inline styles ─────────────────────────────── */
const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.72)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 24,
  },
  wrap: {
    position: "relative",
    width: 400,
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    scrollbarWidth: "none",
    background: "#fff",
    borderRadius: "12px 12px 0 0",
    boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
    fontFamily: "'Courier New', Courier, monospace",
    paddingBottom: 40,
  },
  zigzagWrap: {
    position: "relative",
    background: "#fff",
    marginTop: -1,
  },
  actionBar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "10px 16px",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
    borderBottom: "1px solid #f0f0f0",
    borderRadius: "12px 12px 0 0",
  },
  iconBtn: (color = "#475569") => ({
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: `1px solid #e2e8f0`,
    background: "#f8fafc",
    color,
    cursor: "pointer",
    fontSize: 16,
    transition: "all .18s",
  }),
  body: { padding: "0 28px 0" },
  logo: {
    textAlign: "center",
    padding: "24px 0 8px",
  },
  logoName: {
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: 4,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1,
  },
  logoTagline: {
    fontFamily: "sans-serif",
    fontSize: 10,
    letterSpacing: 3,
    color: "#94a3b8",
    marginTop: 4,
    textTransform: "uppercase",
  },
  address: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 1.6,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 0",
    fontFamily: "sans-serif",
    fontSize: 12,
  },
  metaLabel: { color: "#94a3b8", fontSize: 11 },
  metaValue: { color: "#0f172a", fontWeight: 600, textAlign: "right", fontSize: 12 },
  customerBox: {
    fontFamily: "sans-serif",
  },
  customerLabel: { fontSize: 10, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase" },
  customerName: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginTop: 2 },
  customerPhone: { fontSize: 12, color: "#64748b", marginTop: 2 },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "8px 0",
    borderBottom: "1px dashed #e2e8f0",
  },
  itemName: { fontWeight: 600, color: "#0f172a", fontSize: 13, fontFamily: "sans-serif" },
  itemSub: { fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" },
  itemAmt: { fontWeight: 700, color: "#0f172a", fontSize: 13, textAlign: "right", minWidth: 72 },
  totalsRow: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "sans-serif",
    padding: "4px 0",
  },
  grandRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0 4px",
    borderTop: "2px solid #0f172a",
    marginTop: 8,
  },
  grandLabel: {
    fontFamily: "sans-serif",
    fontWeight: 800,
    fontSize: 16,
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  grandAmt: {
    fontFamily: "monospace",
    fontWeight: 900,
    fontSize: 22,
    color: "#0f172a",
  },
  footer: {
    textAlign: "center",
    padding: "12px 0 20px",
    fontFamily: "sans-serif",
  },
  thankYou: {
    fontSize: 17,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerSub: { fontSize: 11, color: "#94a3b8", letterSpacing: 1 },
  qrBox: {
    width: 72,
    height: 72,
    margin: "12px auto 0",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#cbd5e1",
    fontSize: 36,
  },
  barcode: {
    margin: "12px auto 0",
    width: "80%",
    height: 40,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
};

/* ─── zigzag SVG bottom edge ─────────── */
const ZigzagBottom = () => (
  <svg
    viewBox="0 0 400 20"
    preserveAspectRatio="none"
    style={{ display: "block", width: "100%", height: 20, marginTop: -1 }}
  >
    <polygon
      points="0,0 20,20 40,0 60,20 80,0 100,20 120,0 140,20 160,0 180,20 200,0 220,20 240,0 260,20 280,0 300,20 320,0 340,20 360,0 380,20 400,0 400,0 0,0"
      fill="#fff"
    />
    <polyline
      points="0,0 20,20 40,0 60,20 80,0 100,20 120,0 140,20 160,0 180,20 200,0 220,20 240,0 260,20 280,0 300,20 320,0 340,20 360,0 380,20 400,0"
      fill="none"
      stroke="#e2e8f0"
      strokeWidth="1"
    />
  </svg>
);

/* ─── fake barcode strips ─────────── */
const FakeBarcode = () => {
  const strips = Array.from({ length: 42 }, (_, i) => ({
    w: [1, 2, 3, 1, 2, 1, 3, 2, 1, 2][i % 10],
    h: 28 + (i % 3) * 6,
  }));
  return (
    <div style={S.barcode}>
      {strips.map((s, i) => (
        <div
          key={i}
          style={{
            width: s.w,
            height: s.h,
            background: "#0f172a",
            borderRadius: 1,
            opacity: 0.8 + (i % 3) * 0.07,
          }}
        />
      ))}
    </div>
  );
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function PosReceipt({ invoice, salonName, salonAddress, salonPhone, onClose, onPrint, onDownload }) {
  /* ── data wiring ── */
  const safeInv = invoice || {};
  const items = safeInv.items || [];
  const customer = safeInv.customer || {};

  const displaySalonName = salonName || "STYLUXE";
  const displayAddress = salonAddress || "Panchsheel Enclave, Hyderabad";
  const displayPhone = salonPhone || "";

  const invDate = safeInv.createdAt ? new Date(safeInv.createdAt) : new Date();
  const dateStr = invDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  const timeStr = invDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const statusUp = (safeInv.status || "UNPAID").toUpperCase();

  const subtotal = Number(safeInv.subtotal || safeInv.total || 0);
  const discount = Number(safeInv.discount || 0);
  const tax = Number(safeInv.tax || 0);
  const grandTotal = Number(safeInv.total || subtotal);
  const paid = Number(safeInv.paidAmount || 0);
  const balance = Number(safeInv.balanceAmount || Math.max(0, grandTotal - paid));

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.wrap} onClick={(e) => e.stopPropagation()}>

        {/* ── action bar ── */}
        <div style={S.actionBar}>
          {onPrint && (
            <div style={S.iconBtn()} title="Print" onClick={onPrint}>
              <Printer size={16} />
            </div>
          )}
          {onDownload && (
            <div style={S.iconBtn()} title="Download PDF" onClick={onDownload}>
              <Download size={16} />
            </div>
          )}
          <div style={S.iconBtn("#ef4444")} title="Close" onClick={onClose}>
            <X size={16} />
          </div>
        </div>

        <div style={S.body}>

          {/* ── LOGO / HEADER ── */}
          <div style={S.logo}>
            <div style={S.logoName}>{displaySalonName.toUpperCase()}</div>
            <div style={S.logoTagline}>HAIR · LIFESTYLE · CARE</div>
            <div style={S.address}>
              {displayAddress}
              {displayPhone && <><br />📞 {displayPhone}</>}
            </div>
          </div>

          <Divider dashed style={{ borderColor: "#cbd5e1", margin: "12px 0" }} />

          {/* ── META ── */}
          <div style={S.metaGrid}>
            <span style={S.metaLabel}>Invoice No</span>
            <span style={S.metaValue}>{safeInv.invoiceNumber || "—"}</span>

            <span style={S.metaLabel}>Date</span>
            <span style={S.metaValue}>{dateStr}</span>

            <span style={S.metaLabel}>Time</span>
            <span style={S.metaValue}>{timeStr}</span>

            <span style={S.metaLabel}>Status</span>
            <span style={{ textAlign: "right" }}>
              <Tag
                color={statusColor(statusUp)}
                style={{ fontSize: 10, fontWeight: 700, fontFamily: "sans-serif", borderRadius: 4 }}
              >
                {statusUp}
              </Tag>
            </span>
          </div>

          <Divider dashed style={{ borderColor: "#cbd5e1", margin: "12px 0" }} />

          {/* ── CUSTOMER ── */}
          <div style={S.customerBox}>
            <div style={S.customerLabel}>Bill To</div>
            <div style={S.customerName}>{customer.name || safeInv.customerName || "Walk-in Customer"}</div>
            {(customer.phone || safeInv.customerPhone) && (
              <div style={S.customerPhone}>📱 {customer.phone || safeInv.customerPhone}</div>
            )}
          </div>

          <Divider dashed style={{ borderColor: "#cbd5e1", margin: "12px 0" }} />

          {/* ── LINE ITEMS ── */}
          <div>
            {items.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: "12px 0" }}>
                No items
              </div>
            )}
            {items.map((item, idx) => {
              const rate = Number(item.unitPrice || 0);
              const qty = Number(item.qty || 1);
              const amt = Number(item.lineTotal || rate * qty);
              return (
                <div key={idx} style={S.itemRow}>
                  <div>
                    <div style={S.itemName}>{item.serviceName || item.productName || item.name || "Item"}</div>
                    <div style={S.itemSub}>
                      {qty} × {fmt(rate)}
                    </div>
                    {item.staffName && (
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "sans-serif", marginTop: 1 }}>
                        Staff: {item.staffName}
                      </div>
                    )}
                  </div>
                  <div style={S.itemAmt}>{fmt(amt)}</div>
                </div>
              );
            })}
          </div>

          <Divider dashed style={{ borderColor: "#cbd5e1", margin: "12px 0 4px" }} />

          {/* ── TOTALS ── */}
          <div>
            <div style={S.totalsRow}>
              <Text style={{ color: "#64748b", fontSize: 13, fontFamily: "sans-serif" }}>Subtotal</Text>
              <Text style={{ fontFamily: "monospace", fontSize: 13 }}>{fmt(subtotal)}</Text>
            </div>
            {discount > 0 && (
              <div style={S.totalsRow}>
                <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "sans-serif" }}>Discount</Text>
                <Text style={{ color: "#22c55e", fontFamily: "monospace", fontSize: 12 }}>- {fmt(discount)}</Text>
              </div>
            )}
            {tax > 0 && (
              <div style={S.totalsRow}>
                <Text style={{ color: "#f59e0b", fontSize: 12, fontFamily: "sans-serif" }}>Tax</Text>
                <Text style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: 12 }}>+ {fmt(tax)}</Text>
              </div>
            )}

            {/* GRAND TOTAL */}
            <div style={S.grandRow}>
              <span style={S.grandLabel}>Grand Total</span>
              <span style={S.grandAmt}>Rs {fmt(grandTotal)}</span>
            </div>

            {paid > 0 && (
              <div style={{ ...S.totalsRow, marginTop: 6 }}>
                <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "sans-serif" }}>Paid</Text>
                <Text style={{ color: "#22c55e", fontFamily: "monospace", fontSize: 12 }}>Rs {fmt(paid)}</Text>
              </div>
            )}
            {balance > 0 && (
              <div style={S.totalsRow}>
                <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "sans-serif" }}>Balance Due</Text>
                <Text style={{ color: "#ef4444", fontFamily: "monospace", fontSize: 12 }}>Rs {fmt(balance)}</Text>
              </div>
            )}

            {safeInv.payments?.length > 0 && (
              <>
                <Divider dashed style={{ borderColor: "#cbd5e1", margin: "10px 0 6px" }} />
                {safeInv.payments.map((p, i) => (
                  <div key={i} style={{ ...S.totalsRow }}>
                    <Text style={{ color: "#94a3b8", fontSize: 11, fontFamily: "sans-serif" }}>
                      {p.mode} payment
                    </Text>
                    <Text style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                      {fmt(p.amount)}
                    </Text>
                  </div>
                ))}
              </>
            )}
          </div>

          <Divider dashed style={{ borderColor: "#cbd5e1", margin: "14px 0 0" }} />

          {/* ── FOOTER ── */}
          <div style={S.footer}>
            <div style={S.thankYou}>✨ Thank You! ✨</div>
            <div style={S.footerSub}>VISIT AGAIN · POWERED BY SKILLIFY</div>
            <FakeBarcode />
            <div style={{ ...S.qrBox, marginTop: 10 }}>
              <QrCode size={28} />
            </div>
            <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 6, letterSpacing: 1, fontFamily: "monospace" }}>
              {safeInv.invoiceNumber || "—"}
            </div>
          </div>
        </div>

        {/* ── zigzag torn bottom ── */}
        <ZigzagBottom />
      </div>
    </div>
  );
}
