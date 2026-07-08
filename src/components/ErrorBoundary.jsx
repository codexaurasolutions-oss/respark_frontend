import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Automatically reload the page if it's a chunk load error (Vercel deployment mismatch)
    const isChunkLoadError = error?.message && (
      /Failed to fetch dynamically imported module/i.test(error.message) || 
      /Importing a module script failed/i.test(error.message)
    );
    
    if (isChunkLoadError) {
      if (!sessionStorage.getItem("chunk_reload_attempted")) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload(true);
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "system-ui, sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: "center", background: "white", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
            <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Something went wrong</h2>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>An unexpected error occurred. Please try refreshing the page.</p>
            <button onClick={() => window.location.reload()} style={{ padding: "10px 24px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: 16, textAlign: "left" }}>
                <summary style={{ cursor: "pointer", color: "#94a3b8", fontSize: 12 }}>Error details</summary>
                <pre style={{ marginTop: 8, padding: 12, background: "#f1f5f9", borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 200, color: "#64748b" }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
