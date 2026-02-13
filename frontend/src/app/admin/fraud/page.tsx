"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { API_BASE } from "@/lib/utils";

type FraudEvent = {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_id: string | null;
  created_at: string;
};

export default function AdminFraudPage() {
  const token = useAuthStore((s) => s.token);
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/admin/fraud?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: { events: FraudEvent[] }) => setEvents(r.events ?? []))
      .catch(() => setError("Failed to load"));
  }, [token]);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 tracking-tight">Fraud monitoring</h1>
      <p className="text-muted text-sm mb-8">Recent fraud log entries.</p>
      <div className="glass-card overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Time</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">Event type</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">IP</th>
              <th className="p-4 font-medium text-muted uppercase tracking-wider">User ID</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4">{new Date(e.created_at).toLocaleString()}</td>
                <td className="p-4">{e.event_type}</td>
                <td className="p-4 font-mono text-muted">{e.ip_address ?? "—"}</td>
                <td className="p-4 font-mono text-muted">{e.user_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="p-8 text-muted text-center">No fraud events</p>}
      </div>
    </div>
  );
}
