import React, { useState, useEffect } from "react";
import { Download, Printer, X } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import { readSalonSettingsCache } from "../utils/salonSettings";
import { api } from "../api/client";

const Divider = ({ dashed = false, style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      borderTop: `1px ${dashed ? "dashed" : "solid"} #cbd5e1`,
      margin: "14px 0",
      ...style
    }}
  />
);

const Tag = ({ color = "default", children, style = {} }) => {
  const palette = {
    success: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" },
    error: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" },
    warning: { background: "#fffbeb", color: "#d97706", border: "1px solid #fcd34d" },
    default: { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }
  };
  const tone = palette[color] || palette.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.6, ...tone, ...style }}>
      {children}
    </span>
  );
};

const statusColor = (s) => ({ PAID: "success", UNPAID: "error", PARTIAL: "warning", CANCELLED: "default" }[s?.toUpperCase()] ?? "default");

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20
  },
  wrap: {
    position: "relative", width: 380, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto",
    background: "#fff", borderRadius: 16, boxShadow: "0 25px 60px -12px rgba(0,0,0,0.35)",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", paddingBottom: 0
  },
  actionBar: {
    position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end", gap: 8,
    padding: "12px 16px", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
    borderBottom: "1px solid #f1f5f9", borderRadius: "16px 16px 0 0"
  },
  iconBtn: (color = "#475569") => ({
    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color,
    cursor: "pointer", fontSize: 15, transition: "all .15s"
  }),
  body: { padding: "0 24px 24px" },
  logo: { textAlign: "center", padding: "20px 0 4px" },
  logoName: {
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 26, fontWeight: 900,
    letterSpacing: 3, color: "#0f172a", margin: 0, lineHeight: 1
  },
  logoTagline: { fontSize: 9, letterSpacing: 3.5, color: "#94a3b8", marginTop: 4, textTransform: "uppercase", fontWeight: 600 },
  address: { fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 1.6 },
  metaGrid: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12 },
  metaLabel: { color: "#94a3b8", fontSize: 11, fontWeight: 500 },
  metaValue: { color: "#0f172a", fontWeight: 600, textAlign: "right", fontSize: 12, fontFamily: "'JetBrains Mono', 'Courier New', monospace" },
  customerBox: { marginBottom: 4 },
  customerLabel: { fontSize: 9, color: "#94a3b8", letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700 },
  customerName: { fontWeight: 700, fontSize: 14, color: "#0f172a", marginTop: 2 },
  customerPhone: { fontSize: 11, color: "#64748b", marginTop: 1, fontFamily: "'JetBrains Mono', monospace" },
  itemRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px dashed #e2e8f0" },
  itemName: { fontWeight: 600, color: "#0f172a", fontSize: 13 },
  itemSub: { fontSize: 11, color: "#94a3b8", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" },
  itemAmt: { fontWeight: 700, color: "#0f172a", fontSize: 13, textAlign: "right", minWidth: 70, fontFamily: "'JetBrains Mono', monospace" },
  totalsRow: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  grandRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px", borderTop: "2px solid #0f172a", marginTop: 8 },
  grandLabel: { fontWeight: 800, fontSize: 13, color: "#0f172a", letterSpacing: 0.5 },
  grandAmt: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 18, color: "#0f172a" },
  footer: { textAlign: "center", padding: "16px 0 20px" },
  thankYou: { fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: 1.5, marginBottom: 4 },
  footerSub: { fontSize: 10, color: "#94a3b8", letterSpacing: 2, fontWeight: 600 },
  barcode: { margin: "14px auto 0", width: "75%", height: 36, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 1.5 }
};

const ZigzagBottom = () => (
  <svg viewBox="0 0 380 16" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 16 }}>
    <polygon points="0,0 19,16 38,0 57,16 76,0 95,16 114,0 133,16 152,0 171,16 190,0 209,16 228,0 247,16 266,0 285,16 304,0 323,16 342,0 361,16 380,0 380,16 0,16" fill="#fff" />
    <polyline points="0,0 19,16 38,0 57,16 76,0 95,16 114,0 133,16 152,0 171,16 190,0 209,16 228,0 247,16 266,0 285,16 304,0 323,16 342,0 361,16 380,0" fill="none" stroke="#e2e8f0" strokeWidth="1" />
  </svg>
);

const FakeBarcode = () => {
  const strips = Array.from({ length: 48 }, (_, i) => ({ w: [1, 2, 3, 1, 2, 1, 3, 2, 1, 2][i % 10], h: 24 + (i % 4) * 4 }));
  return (
    <div style={S.barcode}>
      {strips.map((s, i) => <div key={i} style={{ width: s.w, height: s.h, background: "#0f172a", borderRadius: 0.5, opacity: 0.75 + (i % 3) * 0.08 }} />)}
    </div>
  );
};

export default function PosReceipt({ invoice, salonName, salonAddress, salonPhone, currencyCode = "INR", onClose, onPrint, onDownload, inline = false }) {
  const { auth } = useAuth();
  const salonId = auth?.salonId || auth?.membership?.salonId || auth?.membership?.salon?.id || "global";
  
  const [liveSettingsName, setLiveSettingsName] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const response = await api.get("/owner/settings");
        if (active && response.data?.advancedSettings?.genericSettings?.salonName) {
          setLiveSettingsName(response.data.advancedSettings.genericSettings.salonName);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchSettings();
    return () => { active = false; };
  }, []);

  const handleLocalPrint = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');
      
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Receipt</title>
          ${styles}
          <style>
            body { background: white !important; margin: 0 !important; padding: 20px !important; display: flex !important; justify-content: center !important; }
            .invoice-paper { max-width: 800px !important; width: 100% !important; margin: 0 auto !important; box-shadow: none !important; border: none !important; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div class="invoice-paper" style="max-width: 800px; width: 100%;">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    iframe.contentWindow.document.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  const cachedSettings = readSalonSettingsCache(salonId);
  const customSalonName = cachedSettings?.advancedSettings?.genericSettings?.salonName;

  const safeInv = invoice || {};
  const items = safeInv.items || [];
  const customer = safeInv.customer || {};
  const displaySalonName = liveSettingsName || customSalonName || salonName || "";
  const displayAddress = salonAddress || "";
  const displayPhone = salonPhone || "";
  const invDate = safeInv.createdAt ? new Date(safeInv.createdAt) : new Date();
  const dateStr = invDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
  const timeStr = invDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const statusUp = (safeInv.status || "UNPAID").toUpperCase();
  const subtotal = Number(safeInv.subtotal || safeInv.total || 0);
  const discount = Number(safeInv.discount || 0);
  const tax = Number(safeInv.tax || 0);
  const grandTotal = Number(safeInv.total || subtotal);
  const paid = Number(safeInv.paidAmount || 0);
  const balance = Number(safeInv.balanceAmount || Math.max(0, grandTotal - paid));
  const money = (value) => formatCurrency(value || 0, currencyCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={inline ? { display: "flex", justifyContent: "center", width: "100%", padding: "20px 0" } : S.overlay} className={inline ? "" : "pos-receipt-overlay"} onClick={inline ? undefined : onClose}>
      <div id="receipt-print-area" style={{ ...S.wrap, ...(inline ? { maxHeight: "none", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0" } : {}) }} className="invoice-paper" onClick={inline ? undefined : (e) => e.stopPropagation()}>
        <div style={S.actionBar} className="no-print">
          {onPrint && <div style={S.iconBtn()} title="Print" onClick={handleLocalPrint}><Printer size={15} /></div>}
          {onDownload && <div style={S.iconBtn()} title="Download" onClick={onDownload}><Download size={15} /></div>}
          {onClose && !inline && <div style={S.iconBtn("#ef4444")} title="Close" onClick={onClose}><X size={15} /></div>}
        </div>

        <div style={S.body}>
          <div style={S.logo}>
            <div style={S.logoName}>{displaySalonName.toUpperCase()}</div>
            <div style={S.logoTagline}>Hair · Lifestyle · Care</div>
            {displayAddress && <div style={S.address}>{displayAddress}{displayPhone && <><br />{displayPhone}</>}</div>}
          </div>

          <Divider dashed />

          <div style={S.metaGrid}>
            <span style={S.metaLabel}>Invoice No</span><span style={S.metaValue}>{safeInv.invoiceNumber || "—"}</span>
            <span style={S.metaLabel}>Date</span><span style={S.metaValue}>{dateStr}</span>
            <span style={S.metaLabel}>Time</span><span style={S.metaValue}>{timeStr}</span>
            <span style={S.metaLabel}>Status</span>
            <span style={{ textAlign: "right" }}><Tag color={statusColor(statusUp)}>{statusUp}</Tag></span>
          </div>

          <Divider dashed />

          <div style={S.customerBox}>
            <div style={S.customerLabel}>Bill To</div>
            <div style={S.customerName}>{customer.name || safeInv.customerName || "Walk-in Customer"}</div>
            {(customer.phone || safeInv.customerPhone) && <div style={S.customerPhone}>{customer.phone || safeInv.customerPhone}</div>}
          </div>

          <Divider dashed />

          <div>
            {items.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: "14px 0" }}>No items</div>}
            {items.map((item, idx) => {
              const rate = Number(item.unitPrice || 0);
              const qty = Number(item.qty || 1);
              const amt = Number(item.lineTotal || rate * qty);
              return (
                <div key={idx} style={S.itemRow}>
                  <div style={{ flex: 1 }}>
                    <div style={S.itemName}>{item.serviceName || item.productName || item.name || "Item"}</div>
                    <div style={S.itemSub}>{qty} × {money(rate)}</div>
                    {item.staffName && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Staff: {item.staffName}</div>}
                  </div>
                  <div style={S.itemAmt}>{money(amt)}</div>
                </div>
              );
            })}
          </div>

          <Divider dashed />

          <div>
            <div style={S.totalsRow}><span style={{ color: "#64748b", fontSize: 12 }}>Subtotal</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{money(subtotal)}</span></div>
            {discount > 0 && <div style={S.totalsRow}><span style={{ color: "#22c55e", fontSize: 11 }}>Discount</span><span style={{ color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>- {money(discount)}</span></div>}
            {tax > 0 && <div style={S.totalsRow}><span style={{ color: "#f59e0b", fontSize: 11 }}>Tax</span><span style={{ color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>+ {money(tax)}</span></div>}
            <div style={S.grandRow}><span style={S.grandLabel}>Grand Total</span><span style={S.grandAmt}>{money(grandTotal)}</span></div>
            {paid > 0 && <div style={{ ...S.totalsRow, marginTop: 10, paddingTop: 8, borderTop: "1px dashed #e2e8f0" }}><span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>Paid</span><span style={{ color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>{money(paid)}</span></div>}
            {balance > 0 && <div style={S.totalsRow}><span style={{ color: "#ef4444", fontSize: 11 }}>Balance Due</span><span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{money(balance)}</span></div>}
            {safeInv.payments?.length > 0 && (
              <>
                <Divider dashed style={{ margin: "10px 0 6px" }} />
                {safeInv.payments.map((p, i) => (
                  <div key={i} style={S.totalsRow}>
                    <span style={{ color: "#94a3b8", fontSize: 10, textTransform: "uppercase", fontWeight: 600 }}>{p.mode}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748b" }}>{money(p.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <Divider dashed style={{ margin: "16px 0 0" }} />

          <div style={S.footer}>
            <div style={S.thankYou}>Thank You!</div>
            <div style={S.footerSub}>Visit Again</div>
            <FakeBarcode />
            <div style={{ fontSize: 9, color: "#cbd5e1", marginTop: 16, letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>{safeInv.invoiceNumber || "—"}</div>
          </div>
        </div>

        <ZigzagBottom />
      </div>
    </div>
  );
}
