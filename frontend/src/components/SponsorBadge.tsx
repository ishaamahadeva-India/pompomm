"use client";

import { cn } from "@/lib/utils";

type SponsorBadgeProps = {
  sponsorName: string;
  associateSponsor?: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function SponsorBadge({ sponsorName, associateSponsor, size = "md", className }: SponsorBadgeProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-primary font-medium",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {sponsorName}
      </span>
      {associateSponsor && (
        <span
          className={cn(
            "inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-muted",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {associateSponsor}
        </span>
      )}
    </div>
  );
}
