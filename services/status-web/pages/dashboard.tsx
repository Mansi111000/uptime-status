"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UptimeBar, LatencyLine } from "@/app/components/Charts";
import UptimeBadge from "@/app/components/UptimeBadge";

type Monitor = {
  id: number;
  name: string;
  url: string;
  interval_sec: number;
  is_enabled: boolean;
  method: string;
  timeout_ms: number;
  expected_statuses: number[];
  created_at: string;
};

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [summary, setSummary] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/monitors");
        const data = await res.json();
        setMonitors(data);

        const sums: Record<number, any> = {};
        for (const m of data) {
          const sres = await fetch(`/api/public/monitors/${m.id}/summary?window=24h`);
          sums[m.id] = await sres.json();
        }
        setSummary(sums);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uptimeData = monitors.map(m => ({ name: m.name, uptime: summary[m.id]?.uptime_percent ?? 0 }));
  const latencyData = monitors.map(m => ({ name: m.name, latency: summary[m.id]?.avg_latency_ms ?? 0 }));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">🌐 Uptime Dashboard</h1>

      {loading ? (
        <p className="text-gray-400">Loading monitors…</p>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Uptime (%) per Monitor (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <UptimeBar data={uptimeData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Latency (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                <LatencyLine data={latencyData} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monitors Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm text-left">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-2">Name</th>
                    <th>URL</th>
                    <th>Method</th>
                    <th>Uptime</th>
                    <th>Avg Latency (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m) => (
                    <tr key={m.id} className="border-b border-gray-800">
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="text-blue-400"><a href={m.url} target="_blank">{m.url}</a></td>
                      <td>{m.method}</td>
                      <td><UptimeBadge value={summary[m.id]?.uptime_percent} /></td>
                      <td>{summary[m.id]?.avg_latency_ms?.toFixed(0) ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
