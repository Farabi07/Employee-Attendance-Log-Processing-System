import React from "react";
import { T } from "../theme";

export default function Card({ children, style }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(15,43,36,0.03), 0 6px 16px -10px rgba(15,43,36,0.12)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
