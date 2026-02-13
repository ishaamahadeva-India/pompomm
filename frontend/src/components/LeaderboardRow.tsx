"use client";

import { motion } from "framer-motion";
import { RankBadge } from "./RankBadge";
import { StatCounter } from "./StatCounter";
import { cn } from "@/lib/utils";

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_id: string;
  total_score: number;
  unique_views: number;
  shares: number;
};

type LeaderboardRowProps = {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
  animate?: boolean;
  className?: string;
};

export function LeaderboardRow({ entry, isCurrentUser, animate = true, className }: LeaderboardRowProps) {
  return (
    <motion.div
      layout
      initial={animate ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "glass-card flex items-center gap-4 p-4 rounded-2xl border border-white/10 transition-colors",
        isCurrentUser && "ring-2 ring-primary/50",
        className
      )}
    >
      <RankBadge rank={entry.rank} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          Creator {entry.display_id}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-primary">(You)</span>
          )}
        </p>
        <div className="flex gap-4 mt-1">
          <StatCounter value={entry.unique_views} label="Views" animate={animate} size="sm" />
          <StatCounter value={entry.shares} label="Shares" animate={animate} size="sm" />
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold gold-reward">{entry.total_score.toLocaleString()}</span>
        <p className="text-xs text-muted">Score</p>
      </div>
    </motion.div>
  );
}
