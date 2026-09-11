import React, { useEffect, useRef, useState } from "react";
import { Text, StyleProp, TextStyle } from "react-native";
import { formatMoney } from "../lib/currency";

// Counts up from whatever it last showed to the new `value` over ~650ms,
// ease-out, instead of a hero balance/total number just snapping to its
// new figure — for the one or two headline currency numbers per screen
// (Wallet's balance, Payroll's total payable), not table rows: re-counting
// every row on each refresh would read as noisy rather than premium.
export default function AnimatedAmount({
  value,
  currency,
  style,
  duration = 650,
}: {
  value: number | string | null | undefined;
  currency?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const firstRunRef = useRef(true);

  useEffect(() => {
    // Don't count up from 0 on first mount — only animate actual changes
    // after the real starting value has already been shown once.
    if (firstRunRef.current) {
      firstRunRef.current = false;
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return <Text style={style}>{formatMoney(display, currency)}</Text>;
}
