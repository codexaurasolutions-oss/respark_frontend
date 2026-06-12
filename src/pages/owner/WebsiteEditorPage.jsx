import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { formatApiError } from "../../utils/apiError";
import PageLoader from "../../components/PageLoader";

export default function WebsiteEditorPage() {
  const [config, setConfig] = useState({
    heroTitle: "Elevate Your Beauty Experience",
    heroSubtitle: "Discover premium salon services and exclusive products curated just for you.",
    heroImage: ""
  });
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [saving, setSaving] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());

  const slug = useMemo(() => preview?.settings?.customSlug || preview?.salon?.slug || "demo", [preview]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/owner/website/config"),
      api.get("/owner/catalog/preview")
    ]).then(([configResponse, previewResponse]) => {
      if (!active) return;
      if (configResponse.status !== "fulfilled") {
        setStatus({ loading: false, error: formatApiError(configResponse.reason, "Could not load website editor"), success: "" });
        return;
      }
      setConfig({
        heroTitle: configResponse.value.data.heroTitle || "Elevate Your Beauty Experience",
        heroSubtitle: configResponse.value.data.heroSubtitle || "Discover premium salon services and exclusive products curated just for you.",
        heroImage: configResponse.value.data.heroImage || ""
      });
      setPreview(previewResponse.status === "fulfilled" ? (previewResponse.value.data || null) : null);
      setStatus({ loading: false, error: "", success: "" });
    }).catch((error) => {
      if (!active) return;
      setStatus({ loading: false, error: formatApiError(error, "Could not load website editor"), success: "" });
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await api.post("/owner/website/config", config);
      setIframeKey(Date.now());
      setStatus({ loading: false, error: "", success: "Website editor changes published successfully." });
    } catch (err) {
      setStatus({ loading: false, error: formatApiError(err, "Failed to save website configuration"), success: "" });
    } finally {
      setSaving(false);
    }
  };

  if (status.loading) {
    return <PageLoader title="Loading website editor" message="Preparing your live storefront preview and editable website content." />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f5f5f5' }}>
      
      {/* Sidebar Editor */}
      <div style={{ width: 400, background: 'white', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Live Site Builder</h2>
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ background: '#111', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {status.error ? (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 14px', borderRadius: 10, border: '1px solid #fecaca', fontSize: 13, fontWeight: 600 }}>
              {status.error}
            </div>
          ) : null}
          {status.success ? (
            <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 14px', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13, fontWeight: 600 }}>
              {status.success}
            </div>
          ) : null}
          
          {/* Section: Hero */}
          <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              Hero Section
              <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'normal' }}>Home Page</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', fontWeight: 500 }}>
                Hero Title
                <input 
                  type="text" 
                  value={config.heroTitle}
                  onChange={e => setConfig({...config, heroTitle: e.target.value})}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', fontWeight: 500 }}>
                Hero Subtitle
                <textarea 
                  rows="3"
                  value={config.heroSubtitle}
                  onChange={e => setConfig({...config, heroSubtitle: e.target.value})}
                  style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', fontWeight: 500, marginTop: '8px' }}>
                Hero Background Image
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', border: '1px solid #ccc', overflow: 'hidden', background: config.heroImage ? '#fff' : 'linear-gradient(135deg, #dbeafe, #f8fafc)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>
                    {config.heroImage ? <img src={config.heroImage} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover' }} /> : 'No Img'}
                  </div>
                  <input 
                    type="text" 
                    value={config.heroImage}
                    placeholder="https://images.unsplash.com/..."
                    onChange={e => setConfig({...config, heroImage: e.target.value})}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>Paste an image URL to update the hero background.</span>
              </label>
            </div>
          </div>

          <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '12px', border: '1px solid #eee', opacity: 0.6 }}>
            <h3 style={{ margin: '0', fontSize: '1rem' }}>+ Add Section</h3>
          </div>

        </div>
      </div>

      {/* Live Preview Area */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#e0e0e0', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600 }}>Desktop Preview</div>
          <div style={{ background: '#eef2ff', color: '#3730a3', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600 }}>Slug: {slug}</div>
          <a 
            href={`/site/${slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            View Full Screen <span style={{ fontSize: '1.2rem' }}>&nearr;</span>
          </a>
        </div>
        
        <div style={{ flex: 1, background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #ccc' }}>
          <iframe 
            key={iframeKey}
            src={`/site/${slug}`} 
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Live Preview"
          />
        </div>
      </div>

    </div>
  );
}
