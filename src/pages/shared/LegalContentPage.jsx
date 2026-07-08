import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import PageLoader from "../../components/PageLoader";

export default function LegalContentPage({ scope = "global", title, contentKey }) {
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, titleText: title, content: "", supportEmail: "", businessName: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (scope === "salon" && slug) {
          const response = await api.get(`/public/salon/${slug}`);
          if (!active) return;
          setState({
            loading: false,
            titleText: title,
            content: response.data?.legalContent?.[contentKey] || "",
            supportEmail: response.data?.salon?.email || "",
            businessName: response.data?.salon?.name || "Business"
          });
          return;
        }

        const response = await api.get("/public/settings");
        if (!active) return;
        const settingsData = response.data || {};
        const contentMap = {
          termsAndConditions: settingsData.termsContent || "",
          privacyPolicy: settingsData.privacyContent || "",
          termsUrl: settingsData.termsUrl || "",
          privacyUrl: settingsData.privacyUrl || ""
        };
        const resolvedContent = contentMap[contentKey] || "";
        setState({
          loading: false,
          titleText: title,
          content: resolvedContent,
          supportEmail: settingsData.supportEmail || "",
          businessName: settingsData.systemName || "Skillify"
        });
      } catch {
        if (!active) return;
        setState((current) => ({ ...current, loading: false }));
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [scope, slug, title, contentKey]);

  if (state.loading) {
    return <div className="page-shell"><div className="panel-card"><PageLoader compact title={`Loading ${title}`} message="Preparing legal content and public business details." /></div></div>;
  }

  return (
    <div className="page-shell">
      <div className="panel-card" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <p className="muted" style={{ margin: 0 }}>{state.businessName}</p>
          <h1 style={{ margin: 0 }}>{state.titleText}</h1>
          {state.content ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "#334155" }}>{state.content}</div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              This page is ready, but detailed content has not been configured yet in settings.
            </p>
          )}
          {scope === "salon" && slug ? <Link to={`/site/${slug}`}>Back to website</Link> : <Link to="/login">Back to portal</Link>}
          {state.supportEmail ? <p className="muted" style={{ margin: 0 }}>Support: {state.supportEmail}</p> : null}
        </div>
      </div>
    </div>
  );
}
