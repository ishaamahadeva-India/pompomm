"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SponsorBadge } from "./SponsorBadge";
import { CountdownTimer } from "./CountdownTimer";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { cn } from "@/lib/utils";

export type Campaign = {
  id: string;
  title: string;
  description: string | null;
  category: "direct_ad" | "sponsored_knowledge";
  sponsor_name: string;
  associate_sponsor: string | null;
  reward_pool: number;
  start_time: string;
  end_time: string;
  status: "upcoming" | "active" | "completed";
  created_at: string;
};

type CampaignCardProps = {
  campaign: Campaign;
  className?: string;
  priority?: boolean;
};

export function CampaignCard({ campaign, className, priority }: CampaignCardProps) {
  const isEnded = campaign.status === "completed" || new Date(campaign.end_time) < new Date();
  const isActive = campaign.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(className)}
    >
      <Link href={`/campaign/${campaign.id}`}>
        <Card
          className={cn(
            "cursor-pointer transition-all hover:bg-white/[0.07] hover:border-white/12",
            priority && "border-primary/30"
          )}
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-2">{campaign.title}</CardTitle>
              <SponsorBadge
                sponsorName={campaign.sponsor_name}
                associateSponsor={campaign.associate_sponsor}
                size="sm"
                className="mt-2"
              />
            </div>
            {isActive && (
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted">Reward pool</p>
                <p className="gold-reward font-bold">₹{Number(campaign.reward_pool).toLocaleString()}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {campaign.description && (
              <p className="text-sm text-muted line-clamp-2">{campaign.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  campaign.category === "direct_ad"
                    ? "bg-primary/20 text-primary"
                    : "bg-white/10 text-muted"
                )}
              >
                {campaign.category === "direct_ad" ? "Direct Ad" : "Sponsored Knowledge"}
              </span>
              {!isEnded ? (
                <CountdownTimer endTime={campaign.end_time} compact />
              ) : (
                <span className="text-xs text-muted">Ended</span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
