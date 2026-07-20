import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";

export default function LegalContentPage({ scope = "global", title, contentKey }) {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, content: "", businessName: "", supportEmail: "", lastUpdated: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let content = "";
        let businessName = "Skillify";
        let supportEmail = "";

        if (scope === "salon" && slug) {
          // Salon-specific legal content
          const response = await api.get(`/public/salon/${slug}`);
          const legalContent = response.data?.legalContent || {};
          content = legalContent[contentKey] || "";
          businessName = response.data?.salon?.name || "Skillify";
          supportEmail = response.data?.salon?.email || "";
        } else {
          // Global legal content from salon settings
          const response = await api.get(`/public/legal${slug ? `?slug=${slug}` : ""}`);
          const data = response.data || {};
          content = data[contentKey] || "";
          businessName = data.businessName || "Skillify";
          supportEmail = data.supportEmail || "";
        }

        if (!active) return;
        setState({ loading: false, content, businessName, supportEmail });
      } catch {
        if (!active) return;
        setState((current) => ({ ...current, loading: false }));
      }
    };
    void load();
    return () => { active = false; };
  }, [scope, slug, contentKey]);

  if (state.loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>Loading {title}...</div>
        </div>
      </div>
    );
  }

  const isPrivacy = contentKey === "privacyPolicy";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #fafbff 50%, #f8f0ff 100%)" }}>
      {/* Header bar */}
      <div style={{ background: "#1e293b", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            {isPrivacy ? "🔒" : "📋"}
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{state.businessName}</span>
        </div>
        <Link
          to={scope === "salon" && slug ? `/site/${slug}` : "/login"}
          style={{ color: "#94a3b8", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}
        >
          ← Back to portal
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Title card */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 48px", boxShadow: "0 4px 32px rgba(0,0,0,0.06)", border: "1px solid rgba(226,232,240,0.6)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ width: 56, height: 56, background: isPrivacy ? "linear-gradient(135deg, #eff6ff, #dbeafe)" : "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              {isPrivacy ? "🔒" : "📋"}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>{title}</h1>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
                {isPrivacy
                  ? "How we collect, use and protect your personal information."
                  : "Please read these terms carefully before using our services."}
              </p>
            </div>
          </div>
        </div>

        {/* Content card */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 48px", boxShadow: "0 4px 32px rgba(0,0,0,0.06)", border: "1px solid rgba(226,232,240,0.6)", marginBottom: 24 }}>
          {state.content ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.9, color: "#334155", fontSize: 15, fontFamily: "inherit" }}>
              {state.content}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>{isPrivacy ? "🔒" : "📋"}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Content not configured yet</div>
              <div style={{ fontSize: 14 }}>
                The business owner can add {title} content from{" "}
                <strong>Admin → Settings → {title}</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          {state.supportEmail && (
            <p style={{ margin: "0 0 8px" }}>
              Questions? Contact us at{" "}
              <a href={`mailto:${state.supportEmail}`} style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}>
                {state.supportEmail}
              </a>
            </p>
          )}
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} {state.businessName}. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
