import React from "react";
import { T } from "../theme";

// Three stacked shadows (tight contact shadow, mid lift, soft ambient
// falloff) instead of the old single flat one — this is most of what
// actually reads as "premium" depth, more than any single color choice.
const CARD_SHADOW = `0 1px 2px rgba(${T.shadow}, 0.05), 0 10px 24px -12px rgba(${T.shadow}, 0.22), 0 28px 56px -30px rgba(${T.shadow}, 0.28)`;

export default function Card({ children, style }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 14,
        boxShadow: CARD_SHADOW,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
