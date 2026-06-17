export default function EmptyState({
  title = "Nothing here yet",
  message = "New items will appear here once activity starts.",
  label = "Status"
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-accent" aria-hidden="true">
        <span className="empty-state-kicker">{label}</span>
      </div>
      <strong>{title}</strong>
      <p className="muted">{message}</p>
    </div>
  );
}
