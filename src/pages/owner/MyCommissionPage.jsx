import { useEffect, useState } from "react";
import { api } from "../../api/client";
import EmptyState from "../../components/EmptyState";
import ModuleTabs from "../../components/ModuleTabs";
import PageLoader from "../../components/PageLoader";
import { useAuth } from "../../context/AuthContext";
import { useSalonSettings } from "../../context/SalonSettingsContext";
import { getMyWorkspaceTabs } from "../../utils/myWorkspaceTabs";
import { Coins, CircleDollarSign, TrendingUp, Sparkles, Hash } from "lucide-react";

export default function MyCommissionPage() {
  const { auth } = useAuth();
  const { formatMoney } = useSalonSettings();
  const [data, setData] = useState({ totalCommission: 0, itemCount: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const myTabs = getMyWorkspaceTabs(auth?.membership?.permissions || {});

  useEffect(() => {
    api.get("/owner/my-commission").then((response) => {
      setData(response.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-shell" style={{ paddingBottom: 60 }}>
      <style>{`
        @keyframes popUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .anim-pop { animation: popUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        
        .c-card { background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: none; transition: all 0.3s; }
        .c-card:hover { transform: translateY(-3px); box-shadow: none; border-color: #cbd5e1; }
        
        .stat-badge { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 20px; border-radius: 20px; color: white; display: flex; flex-direction: column; justify-content: center; border: 1px solid rgba(255,255,255,0.2); }
      `}</style>

      <ModuleTabs
        title="My Commission"
        items={myTabs}
      />

      <div className="anim-pop" style={{ background: "linear-gradient(135deg, #16a34a, #14532d)", borderRadius: 24, padding: "40px 32px", color: "white", marginBottom: 32, display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
            <Coins size={32} color="#86efac" />
            My Commission
          </h1>
          <p style={{ margin: 0, color: "#bbf7d0", fontSize: 15, maxWidth: 500 }}>Track your staff-scoped earnings connected to completed, eligible invoice items.</p>
        </div>
        
        {!loading && (
          <div style={{ display: "flex", gap: 16 }}>
            <div className="stat-badge">
              <div style={{ fontSize: 13, textTransform: "uppercase", fontWeight: 700, color: "#86efac", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Hash size={14} /> Linked Items</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{data.itemCount}</div>
            </div>
            <div className="stat-badge" style={{ background: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: 13, textTransform: "uppercase", fontWeight: 700, color: "#dcfce7", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} /> Total Earnings</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{formatMoney(data.totalCommission || 0)}</div>
            </div>
          </div>
        )}
      </div>

      {loading ? <PageLoader title="Calculating your commission" message="Gathering eligible invoice items..." /> : (
        <div className="c-card anim-pop delay-1" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a", display: "flex", alignItems: "center", gap: 10 }}><Sparkles size={20} color="#16a34a" /> Commission Breakdown</h3>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gap: 16 }}>
              {data.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderRadius: 16, background: "#f8fafc", border: "1px solid #f1f5f9", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = '#bbf7d0'} onMouseOut={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>{item.serviceName}</h4>
                    <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 16 }}>
                      <span><strong>Qty:</strong> {item.qty}</span>
                      <span><strong>Line Total:</strong> {formatMoney(item.lineTotal || 0)}</span>
                    </div>
                  </div>
                  <div style={{ background: "#dcfce7", color: "#166534", padding: "8px 16px", borderRadius: 20, fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    <CircleDollarSign size={18} /> +{formatMoney(item.commissionAmount || 0)}
                  </div>
                </div>
              ))}
              {!data.items.length && <EmptyState title="No commission items yet" message="Commissionable services and products will appear here after eligible invoices are completed." />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
