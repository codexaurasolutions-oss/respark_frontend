import { useEffect, useRef, useState } from "react";
import { extractIndianPhoneDigits, normalizeIndianPhoneInputDigits } from "../utils/phone";

export default function IndianPhoneInput({
  value,
  onChange,
  placeholder = "9876543210",
  required = false,
  disabled = false,
  className = "",
  style = {},
  inputStyle = {},
  name,
  id
}) {
  const externalDigits = extractIndianPhoneDigits(value);
  const [draftDigits, setDraftDigits] = useState(externalDigits);
  const lastEmittedRef = useRef(externalDigits);

  useEffect(() => {
    if (externalDigits !== lastEmittedRef.current) {
      setDraftDigits(externalDigits);
    }
  }, [externalDigits]);

  const emitDigits = (rawValue) => {
    const nextDigits = normalizeIndianPhoneInputDigits(rawValue);
    lastEmittedRef.current = nextDigits;
    setDraftDigits(nextDigits);
    onChange?.(nextDigits ? `+91${nextDigits}` : "");
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        background: disabled ? "#f8fafc" : "#fff",
        overflow: "hidden",
        flexShrink: 0,
        ...style
      }}
    >
      <span
        style={{
          padding: "10px 12px",
          background: "#f8fafc",
          color: "#475569",
          fontWeight: 700,
          borderRight: "1px solid #e2e8f0",
          whiteSpace: "nowrap"
        }}
      >
        +91
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={draftDigits}
        maxLength={10}
        placeholder={placeholder}
        onChange={(event) => emitDigits(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          emitDigits(event.clipboardData?.getData("text") || "");
        }}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          padding: "10px 14px",
          fontSize: "0.95rem",
          background: "transparent",
          ...inputStyle
        }}
      />
    </div>
  );
}
