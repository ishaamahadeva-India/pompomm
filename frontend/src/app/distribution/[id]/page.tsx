"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { API_BASE } from "@/lib/utils";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  sponsor_name: string;
  total_budget: number;
  payout_model: string;
  min_unique_views_required: number;
  min_engagement_rate_required: number;
  max_daily_payout_per_user: number;
  end_time: string;
  status: string;
};

type Stats = {
  total_unique_views: number;
  total_likes: number;
  total_shares: number;
  verified_engagement_rate: number;
  total_earned: number;
  payout_status: string;
};

export default function DistributionCampaignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const ref = searchParams.get("ref");
  const token = useAuthStore((s) => s.token);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchSec, setWatchSec] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSocialFallback, setShowSocialFallback] = useState(false);

  const isLanding = Boolean(ref);

  const copyLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl).then(
      () => {
        setToastMessage("Link copied");
        setTimeout(() => setToastMessage(null), 2000);
      },
      () => setToastMessage("Failed to copy")
    );
  };

  const handleNativeShare = async () => {
    if (!trackingUrl || !campaign) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: campaign.title,
          text: "Check this campaign",
          url: trackingUrl,
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setShowSocialFallback(true);
      }
    } else {
      setShowSocialFallback(true);
    }
  };

  const shareText = campaign ? `Check this campaign: ${campaign.title}` : "Check this campaign";
  const encodedUrl = typeof window !== "undefined" && trackingUrl ? encodeURIComponent(trackingUrl) : "";
  const encodedText = typeof window !== "undefined" ? encodeURIComponent(shareText) : "";
  const whatsAppMessage = trackingUrl ? `${shareText} ${trackingUrl}` : shareText;
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(whatsAppMessage)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const campRes = await fetch(`${API_BASE}/distribution/campaigns/${id}`).then((r) => (r.ok ? r.json() : null));
        if (cancelled) return;
        setCampaign(campRes);
        if (token && !ref) {
          const [statsRes, linkRes] = await Promise.all([
            fetch(`${API_BASE}/distribution/campaigns/${id}/stats`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)),
            fetch(`${API_BASE}/distribution/campaigns/${id}/tracking-link`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)),
          ]);
          if (!cancelled) {
            setStats(statsRes ?? null);
            setTrackingUrl(linkRes?.tracking_url ?? null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token, ref]);

  useEffect(() => {
    if (!isLanding || !ref) return;
    const t = setInterval(() => setWatchSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLanding, ref]);

  const handleRecordView = async () => {
    if (!ref || watchSec < 7) return;
    try {
      const res = await fetch(`${API_BASE}/distribution/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          campaign_id: id,
          ref,
          engagement_action: "view",
          watched_seconds: watchSec,
          device_hash: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 32) : "",
        }),
      });
      const data = await res.json();
      if (data.accepted) setEngaged(true);
      else alert(data.message || "Not counted");
    } catch {
      alert("Request failed");
    }
  };

  const handleLike = async () => {
    if (!ref) return;
    try {
      const res = await fetch(`${API_BASE}/distribution/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ campaign_id: id, ref, engagement_action: "like" }),
      });
      const data = await res.json();
      if (data.accepted) setEngaged(true);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (!ref) return;
    try {
      const res = await fetch(`${API_BASE}/distribution/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ campaign_id: id, ref, engagement_action: "share" }),
      });
      const data = await res.json();
      if (data.accepted) setEngaged(true);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <main className="page-container max-w-2xl">
        <Skeleton className="h-6 w-48 mb-6 rounded" />
        <Skeleton className="h-40 rounded-2xl" />
      </main>
    );
  }

  if (!campaign) {
    return (
      <main className="page-container max-w-xl">
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-muted mb-4">Campaign not found.</p>
          <Link href="/distribution"><Button variant="secondary" className="rounded-xl">Back to list</Button></Link>
        </div>
      </main>
    );
  }

  if (isLanding) {
    return (
      <main className="page-container max-w-lg">
        <div className="glass-card p-6 sm:p-8 mb-6 rounded-2xl border border-white/10">
          <h1 className="text-xl font-bold mb-2">{campaign.title}</h1>
          <p className="text-sm text-muted mb-4">{campaign.description || ""}</p>
          <p className="text-xs text-muted">Sponsored by {campaign.sponsor_name}</p>
        </div>
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
          <p className="text-sm text-muted mb-4">Your engagement is verified and counts toward the creator’s performance.</p>
          {!token && <p className="text-amber-400 text-sm mb-4">Log in for your engagement to count.</p>}
          {!engaged ? (
            <>
              <p className="text-sm mb-4">Watched: {watchSec}s (min 7s for a view to count)</p>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleRecordView} disabled={watchSec < 7} className="rounded-xl">Count as view</Button>
                <Button variant="secondary" onClick={handleLike} className="rounded-xl">Like</Button>
                <Button variant="outline" onClick={handleShare} className="rounded-xl">Share</Button>
              </div>
            </>
          ) : (
            <p className="text-accent-green font-medium">Thank you. Your engagement was recorded.</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="page-container max-w-2xl">
      <Link href="/distribution" className="text-sm text-muted hover:text-foreground mb-6 inline-block">← Back to distribution campaigns</Link>
      <div className="glass-card p-6 sm:p-8 mb-6 rounded-2xl border border-white/10">
        <h1 className="text-2xl font-bold mb-2 tracking-tight">{campaign.title}</h1>
        <p className="text-muted text-sm mb-4">{campaign.description || ""}</p>
        <p className="text-sm font-medium">Sponsor: {campaign.sponsor_name}</p>
        <p className="text-xs text-muted mt-2">Min {campaign.min_unique_views_required} verified views, {campaign.min_engagement_rate_required}% engagement rate to qualify. Daily cap: ₹{Number(campaign.max_daily_payout_per_user).toLocaleString()}</p>
      </div>

      {!token ? (
        <div className="glass-card p-8 text-center rounded-2xl border border-white/10">
          <p className="text-muted mb-6">Log in to get your tracking link and see your stats.</p>
          <Link href="/login"><Button className="rounded-xl">Log in</Button></Link>
        </div>
      ) : (
        <>
          <div className="glass-card p-6 sm:p-8 mb-6 rounded-2xl border border-white/10">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-2">Your tracking link</h2>
            <p className="text-xs text-muted mb-3">Share this link. Only verified engagement on our platform counts.</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <input readOnly value={trackingUrl ?? ""} className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm min-w-0" />
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" className="rounded-xl flex-1 sm:flex-none" onClick={copyLink} disabled={!trackingUrl}>
                  Copy Link
                </Button>
                <Button size="sm" variant="secondary" className="rounded-xl flex-1 sm:flex-none" onClick={handleNativeShare} disabled={!trackingUrl}>
                  Share
                </Button>
              </div>
            </div>
            {toastMessage && (
              <p className="text-sm text-accent-green mt-2 animate-in fade-in duration-200" role="status">
                {toastMessage}
              </p>
            )}
            {(showSocialFallback || (typeof navigator !== "undefined" && !navigator.share)) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-muted mb-3">Share via</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-sm transition-colors"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-sm transition-colors"
                  >
                    Facebook
                  </a>
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-sm transition-colors"
                  >
                    Twitter
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/10">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-4">Your performance</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div><p className="text-muted text-xs uppercase tracking-wider mb-0.5">Verified views</p><p className="font-semibold text-lg">{stats?.total_unique_views ?? 0}</p></div>
              <div><p className="text-muted text-xs uppercase tracking-wider mb-0.5">Engagement rate</p><p className="font-semibold text-lg">{stats?.verified_engagement_rate ?? 0}%</p></div>
              <div><p className="text-muted text-xs uppercase tracking-wider mb-0.5">Earnings so far</p><p className="font-semibold text-lg gold-reward">₹{Number(stats?.total_earned ?? 0).toLocaleString()}</p></div>
              <div><p className="text-muted text-xs uppercase tracking-wider mb-0.5">Payout status</p><p className="font-semibold text-lg">{stats?.payout_status ?? "pending"}</p></div>
            </div>
            <p className="text-xs text-muted mt-5">Payments are not instant. Admin approval required.</p>
          </div>
        </>
      )}
    </main>
  );
}
