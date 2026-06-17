const getPasswordChecks = (password) => {
  const value = String(password || "");
  return [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value)
  ];
};

const getStrengthMeta = (password) => {
  const score = getPasswordChecks(password).filter(Boolean).length;

  if (!password) {
    return { score: 0, label: "Add a strong password", color: "#94a3b8" };
  }
  if (score <= 2) {
    return { score, label: "Password is weak", color: "#ef4444" };
  }
  if (score <= 4) {
    return { score, label: "Password is medium", color: "#f59e0b" };
  }
  return { score, label: "Password is strong!", color: "#22c55e" };
};

export default function PasswordStrengthMeter({ password, style }) {
  const { score, label, color } = getStrengthMeta(password);

  return (
    <div style={{ display: "grid", gap: 8, ...style }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            style={{
              height: 6,
              borderRadius: 999,
              background: index < score ? color : "#e2e8f0",
              transition: "background 0.2s ease"
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>
        Use 8+ chars with upper, lower, number, and symbol.
      </div>
    </div>
  );
}
