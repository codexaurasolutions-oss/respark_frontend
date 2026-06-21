export default function CatalogAnalyticsPanel({
  analytics,
  branchFilter,
  setBranchFilter,
  dateFilters,
  setDateFilters,
  branches
}) {
  const summaryMap = new Map((analytics?.summary || []).map((row) => [row.eventType, row._count?._all || 0]));

  return (
    <div className="panel-card">
      <h3>Catalog Analytics</h3>
      <div className="inline-actions" style={{ marginBottom: 16 }}>
        <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
          <option value="">All branches</option>
          {(branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        <input
          type="date"
          value={dateFilters.start}
          onChange={(event) => setDateFilters((current) => ({ ...current, start: event.target.value }))}
        />
        <input
          type="date"
          value={dateFilters.end}
          onChange={(event) => setDateFilters((current) => ({ ...current, end: event.target.value }))}
        />
        <button
          type="button"
          className="secondary-button"
          onClick={() => setDateFilters({ start: "", end: "" })}
          disabled={!dateFilters.start && !dateFilters.end}
        >
          Clear Dates
        </button>
      </div>
      {(dateFilters.start || dateFilters.end) && (
        <p className="muted" style={{ marginBottom: 16 }}>
          Showing analytics for {dateFilters.start || "the beginning"} to {dateFilters.end || "today"}.
        </p>
      )}
      <div className="badge-row" style={{ marginBottom: 16 }}>
        <span className="badge">Views {summaryMap.get("PAGE_VIEW") || 0}</span>
        <span className="badge">QR Scans {summaryMap.get("QR_SCAN") || 0}</span>
        <span className="badge">Service Views {summaryMap.get("SERVICE_VIEW") || 0}</span>
        <span className="badge">Product Clicks {summaryMap.get("PRODUCT_CLICK") || 0}</span>
        <span className="badge">Booking Clicks {summaryMap.get("BOOKING_CLICK") || 0}</span>
        <span className="badge">WhatsApp Clicks {summaryMap.get("WHATSAPP_CLICK") || 0}</span>
        <span className="badge">Offer Clicks {summaryMap.get("OFFER_CLICK") || 0}</span>
      </div>

      <div className="two-col">
        <div className="summary-box">
          <strong>Top Services</strong>
          <div className="list-stack" style={{ marginTop: 10 }}>
            {(analytics?.topServices || []).map((row) => (
              <div key={row.serviceId || row.count} className="list-item">
                <strong>{row.service?.name || "Service"}</strong>
                <div className="item-meta">{row.count} views</div>
              </div>
            ))}
            {!(analytics?.topServices || []).length && <p className="muted">No service activity yet.</p>}
          </div>
        </div>
        <div className="summary-box">
          <strong>Top Products</strong>
          <div className="list-stack" style={{ marginTop: 10 }}>
            {(analytics?.topProducts || []).map((row) => (
              <div key={row.productId || row.count} className="list-item">
                <strong>{row.product?.name || "Product"}</strong>
                <div className="item-meta">{row.count} clicks</div>
              </div>
            ))}
            {!(analytics?.topProducts || []).length && <p className="muted">No product activity yet.</p>}
          </div>
        </div>
      </div>

      <div className="summary-box" style={{ marginTop: 16 }}>
        <strong>Recent Events</strong>
        <div className="list-stack" style={{ marginTop: 10 }}>
          {(analytics?.events || []).map((row) => (
            <div key={row.id} className="list-item">
              <strong>{row.eventType}</strong>
              <div className="item-meta">{row.branchId || "Salon level"} | {new Date(row.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {!(analytics?.events || []).length && <p className="muted">No catalog events tracked yet.</p>}
        </div>
      </div>
    </div>
  );
}
