import React from "react";
import { T } from "../theme";

export default function Card({ children, style }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
