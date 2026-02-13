"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type Overview = {
  total_users: number;
  active_subscriptions: number;
  total_campaigns: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  revenue_summary: number;
  fraud_events_7d: number;
};

export default function AdminOverviewPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Forbidden"))))
      .then(setData)
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted">Loading…</p>;

  const cards = [
    { label: "Total users", value: data.total_users },
    { label: "Active subscriptions", value: data.active_subscriptions },
    { label: "Total campaigns", value: data.total_campaigns },
    { label: "Total views", value: data.total_views },
    { label: "Total likes", value: data.total_likes },
    { label: "Total shares", value: data.total_shares },
    { label: "Revenue (₹)", value: data.revenue_summary },
    { label: "Fraud events (7d)", value: data.fraud_events_7d },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Admin dashboard</h1>
      <p className="text-muted text-sm mb-8">Overview of platform metrics.</p>
      <div className="glass-card p-4 mb-8 rounded-2xl border border-white/10 bg-white/5">
        <p className="text-sm text-muted">
          <strong>Admin URL:</strong> <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">/admin</code> — only users with <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">role = admin</code> can access. To make a user admin, run in your database: <code className="block mt-2 bg-white/10 p-3 rounded-xl text-xs overflow-x-auto font-mono">UPDATE users SET role = &apos;admin&apos; WHERE mobile_number = &apos;+91YOUR_NUMBER&apos;;</code>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value }) => (
          <div key={label} className="glass-card p-5 rounded-2xl border border-white/10 hover:border-white/15 transition-colors">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
