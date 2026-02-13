"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type StatCounterProps = {
  value: number;
  label: string;
  className?: string;
  animate?: boolean;
  size?: "sm" | "md";
};

export function StatCounter({ value, label, className, animate = true, size = "md" }: StatCounterProps) {
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    const duration = 500;
    const steps = 20;
    const step = (value - display) / steps;
    const interval = duration / steps;
    let current = display;
    const id = setInterval(() => {
      current += step;
      if (Math.abs(current - value) < 1) {
        setDisplay(value);
        clearInterval(id);
      } else {
        setDisplay(Math.round(current));
      }
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- display intentionally excluded to avoid loop
  }, [value, animate]);

  return (
    <div className={cn("text-center", className)}>
      <motion.span
        key={display}
        initial={animate ? { opacity: 0, y: 4 } : false}
        animate={{ opacity: 1, y: 0 }}
        className={cn("font-bold tabular-nums", size === "sm" ? "text-sm" : "text-2xl")}
      >
        {display.toLocaleString()}
      </motion.span>
      <p className={cn("text-muted mt-0.5", size === "sm" ? "text-xs" : "text-sm")}>{label}</p>
    </div>
  );
}
