"use client";

import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, { label: string; className: string }> = {
  bronze: { label: "Bronze", className: "bg-amber-800/40 text-amber-200 border-amber-600/40" },
  silver: { label: "Silver", className: "bg-slate-500/30 text-slate-200 border-slate-400/40" },
  gold: { label: "Gold", className: "bg-yellow-600/30 text-yellow-200 border-yellow-500/50" },
  verified: { label: "Verified", className: "bg-emerald-600/30 text-emerald-200 border-emerald-500/50" },
};

type Tier = keyof typeof TIER_STYLES;

export function CreatorTierBadge({
  tier,
  size = "md",
  className,
}: {
  tier: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const normalized = (tier?.toLowerCase() || "bronze") as Tier;
  const style = TIER_STYLES[normalized] ?? TIER_STYLES.bronze;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        style.className,
        className
      )}
      title={`Creator tier: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
