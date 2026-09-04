import React from "react";
import { T, fontDisplay } from "../theme";

export default function Avatar({ initials, size = 38, src }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: T.navy,
        color: T.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fontDisplay,
        fontWeight: 600,
        fontSize: size * 0.36,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}
