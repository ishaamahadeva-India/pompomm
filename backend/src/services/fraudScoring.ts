import { getPool } from "../lib/db.js";

const FRAUD_THRESHOLD_DEFAULT = 50;
const FRAUD_THRESHOLD_VERIFIED = 70;

/**
 * Compute fraud score 0-100 and detailed metrics for a creator in a distribution campaign.
 * Stores: ip_concentration (%), top 5 IP ranges, device_duplication_ratio, spike_delta (10min), geo_distribution_summary.
 * Auto-hold if fraud_score >= threshold (lower for non-verified creators).
 */
export async function computeFraudScore(campaignId: string, refCreatorId: string): Promise<{ score: number; held: boolean }> {
  const pool = getPool();
  const rows = await pool.query(
    `SELECT visitor_ip, device_hash, country, created_at
     FROM referral_tracking
     WHERE campaign_id = $1 AND ref_creator_id = $2 AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at ASC`,
    [campaignId, refCreatorId]
  ).then((r) => r.rows);

  const total = rows.length;
  let score = 0;
  let ipConcentration = 0;
  let deviceDuplicationRate = 0;
  let spikeDelta = 0;
  const topFiveIpRanges: { range: string; count: number }[] = [];
  const geoDistributionSummary: Record<string, number> = {};

  if (total < 10) {
    await updateStatsAndFraudLog(pool, campaignId, refCreatorId, 0, false, 0, 0, 0, [], {});
    return { score: 0, held: false };
  }

  const ipCounts: Record<string, number> = {};
  const ipRanges: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  const byMinute: Record<string, number> = {};
  const by10Min: Record<string, number> = {};

  for (const r of rows) {
    const ip = (r.visitor_ip as string) || "";
    const ipRange = ip ? ip.split(".").slice(0, 3).join(".") : "";
    const device = (r.device_hash as string) || "";
    const min = (r.created_at as Date).toISOString().slice(0, 16);
    const tenMin = (r.created_at as Date).toISOString().slice(0, 15) + "0";
    const country = (r.country as string) || "";
    ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    ipRanges[ipRange] = (ipRanges[ipRange] || 0) + 1;
    deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    byMinute[min] = (byMinute[min] || 0) + 1;
    by10Min[tenMin] = (by10Min[tenMin] || 0) + 1;
    if (country) geoDistributionSummary[country] = (geoDistributionSummary[country] || 0) + 1;
  }

  ipConcentration = (Math.max(...Object.values(ipCounts), 0) / total) * 100;
  const topIpShare = ipConcentration / 100;
  if (topIpShare > 0.5) score += 40;
  else if (topIpShare > 0.3) score += 20;

  const topRangeShare = Math.max(...Object.values(ipRanges), 0) / total;
  if (topRangeShare > 0.5) score += 25;

  Object.entries(ipRanges)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .forEach((e) => topFiveIpRanges.push(e));

  const maxPerMinute = Math.max(...Object.values(byMinute), 0);
  const avgPerMinute = total / Math.max(Object.keys(byMinute).length, 1);
  if (maxPerMinute > 0 && avgPerMinute > 0 && avgPerMinute > 0) {
    const ratio = maxPerMinute / avgPerMinute;
    spikeDelta = ((ratio - 1) * 100);
    if (ratio > 3) score += 25;
  }

  const deviceVariety = Object.keys(deviceCounts).length;
  deviceDuplicationRate = deviceVariety > 0 ? (Math.max(...Object.values(deviceCounts), 0) / total) * 100 : 0;
  if (deviceVariety === 1 && total > 20) score += 10;

  score = Math.min(100, score);

  const [statsRow, userRow] = await Promise.all([
    pool.query("SELECT payout_status FROM creator_distribution_stats WHERE campaign_id = $1 AND user_id = $2", [campaignId, refCreatorId]).then((r) => r.rows[0]),
    pool.query("SELECT creator_tier FROM users WHERE id = $1", [refCreatorId]).then((r) => r.rows[0]),
  ]);
  const tier = (userRow?.creator_tier as string) || "bronze";
  const threshold = tier === "verified" ? FRAUD_THRESHOLD_VERIFIED : FRAUD_THRESHOLD_DEFAULT;
  const held = score >= threshold && (statsRow?.payout_status as string) !== "paid";

  await updateStatsAndFraudLog(pool, campaignId, refCreatorId, score, held, ipConcentration, deviceDuplicationRate, spikeDelta, topFiveIpRanges, geoDistributionSummary);

  if (held) {
    await pool.query(
      "UPDATE creator_distribution_stats SET fraud_score = $1, payout_status = 'held', last_updated = NOW() WHERE campaign_id = $2 AND user_id = $3",
      [score, campaignId, refCreatorId]
    );
  } else {
    await pool.query(
      "UPDATE creator_distribution_stats SET fraud_score = $1, last_updated = NOW() WHERE campaign_id = $2 AND user_id = $3",
      [score, campaignId, refCreatorId]
    );
  }

  return { score, held };
}

async function updateStatsAndFraudLog(
  pool: ReturnType<typeof getPool>,
  campaignId: string,
  userId: string,
  fraudScore: number,
  _held: boolean,
  ipConcentration: number,
  deviceDuplicationRate: number,
  spikeDelta: number,
  topFiveIpRanges: { range: string; count: number }[],
  geoDistributionSummary: Record<string, number>
): Promise<void> {
  await pool.query(
    `INSERT INTO fraud_log (event_type, campaign_id, user_id, fraud_score, ip_concentration, device_duplication_rate, spike_delta, geo_distribution_summary, payload)
     VALUES ('distribution_fraud', $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      campaignId,
      userId,
      fraudScore,
      ipConcentration,
      deviceDuplicationRate,
      spikeDelta,
      JSON.stringify(geoDistributionSummary),
      JSON.stringify({ top_five_ip_ranges: topFiveIpRanges }),
    ]
  );
}
