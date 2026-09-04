import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { T } from "../theme";

// A plain <input type="password"> with a show/hide toggle. Accepts the same
// `style` object every caller was already passing to a bare input — the
// margin moves to the wrapper (so it isn't applied twice) and the input
// gets extra right-padding to make room for the eye icon; everything else
// (border, radius, font, colors) passes through untouched.
export default function PasswordInput({ style = {}, ...inputProps }) {
  const [show, setShow] = useState(false);
  const { marginBottom, marginTop, margin, ...inputStyle } = style;

  return (
    <div style={{ position: "relative", width: "100%", marginBottom, marginTop, margin }}>
      <input
        type={show ? "text" : "password"}
        {...inputProps}
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box", paddingRight: 38 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          color: T.faint,
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
