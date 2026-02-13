"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

type CountdownTimerProps = {
  endTime: string | Date;
  onEnd?: () => void;
  className?: string;
  compact?: boolean;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({ endTime, onEnd, className, compact }: CountdownTimerProps) {
  const end = useMemo(() => (typeof endTime === "string" ? new Date(endTime) : endTime), [endTime]);
  const [diff, setDiff] = useState(() => Math.max(0, end.getTime() - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const d = Math.max(0, end.getTime() - Date.now());
      setDiff(d);
      if (d === 0) {
        clearInterval(t);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [end, onEnd]);

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  if (diff === 0) {
    return (
      <span className={cn("text-muted", className)}>Ended</span>
    );
  }

  if (compact) {
    return (
      <span className={cn("font-mono text-sm", className)}>
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {days > 0 && (
        <div className="glass-card flex flex-col items-center px-3 py-2 min-w-[3rem]">
          <span className="font-mono text-xl font-bold">{pad(days)}</span>
          <span className="text-xs text-muted">Days</span>
        </div>
      )}
      <div className="glass-card flex flex-col items-center px-3 py-2 min-w-[3rem]">
        <span className="font-mono text-xl font-bold">{pad(hours)}</span>
        <span className="text-xs text-muted">Hours</span>
      </div>
      <div className="glass-card flex flex-col items-center px-3 py-2 min-w-[3rem]">
        <span className="font-mono text-xl font-bold">{pad(minutes)}</span>
        <span className="text-xs text-muted">Min</span>
      </div>
      <div className="glass-card flex flex-col items-center px-3 py-2 min-w-[3rem]">
        <span className="font-mono text-xl font-bold">{pad(seconds)}</span>
        <span className="text-xs text-muted">Sec</span>
      </div>
    </div>
  );
}
