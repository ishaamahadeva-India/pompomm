"use client";

import { cn } from "@/lib/utils";

type RankBadgeProps = {
  rank: number;
  className?: string;
};

const topStyles: Record<number, string> = {
  1: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
  2: "bg-gradient-to-r from-gray-300 to-gray-400 text-black",
  3: "bg-gradient-to-r from-amber-600 to-amber-700 text-white",
};

export function RankBadge({ rank, className }: RankBadgeProps) {
  const style = topStyles[rank] ?? "bg-white/10 text-foreground";
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
        style,
        className
      )}
    >
      {rank}
    </span>
  );
}
