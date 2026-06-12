export default function PageLoader({
  title = "Loading workspace",
  message = "We are preparing the latest data for this page.",
  compact = false
}) {
  return (
    <div className={compact ? "loader-card compact" : "loader-card"}>
      <div className="loader-stack" aria-hidden="true">
        <span className="loader-line loader-line-lg" />
        <span className="loader-line loader-line-md" />
        <span className="loader-line" />
      </div>
      <div className="loader-copy">
        <strong>{title}</strong>
        <p className="muted">{message}</p>
      </div>
    </div>
  );
}
