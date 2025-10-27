"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "../app/components/ui/card";
import UptimeBadge from "../app/components/UptimeBadge";
import { UptimeBar, LatencyLine } from "../app/components/Charts";
import { Database, Cloud, Activity, AlertCircle, CheckCircle2 } from "lucide-react";

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

type Summary = { uptime_percent: number; avg_latency_ms: number; window: string };

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [publicMonitors, setPublicMonitors] = useState<Monitor[]>([]);
  const [summaries, setSummaries] = useState<Record<number, Summary>>({});
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [mRes, pmRes, incRes] = await Promise.all([
          fetch("/api/monitors"),
          fetch("/api/public/monitors"),
          fetch("/api/public/incidents/active"),
        ]);
        const [m, pm, inc] = await Promise.all([mRes.json(), pmRes.json(), incRes.json()]);
        setMonitors(m);
        setPublicMonitors(pm);
        setIncidents(Array.isArray(inc) ? inc : []);

        // fetch summaries for each public monitor
        const map: Record<number, Summary> = {};
        for (const mon of pm) {
          const s = await fetch(`/api/public/monitors/${mon.id}/summary?window=24h`).then(r => r.json());
          map[mon.id] = s;
        }
        setSummaries(map);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uptimeData = publicMonitors.map(m => ({ name: m.name, uptime: summaries[m.id]?.uptime_percent ?? 0 }));
  const latencyData = publicMonitors.map(m => ({ name: m.name, latency: summaries[m.id]?.avg_latency_ms ?? 0 }));

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen text-gray-100">
      <motion.h1
        className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🌐 Uptime Dashboard
      </motion.h1>

      {loading ? (
        <p className="text-center text-gray-400">Loading…</p>
      ) : (
        <>
          {/* quick status tiles */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg">Database</CardTitle>
                <Database className="text-blue-400" />
              </CardHeader>
              <CardContent>
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 /> Connected
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg">Redis</CardTitle>
                <Cloud className="text-yellow-400" />
              </CardHeader>
              <CardContent>
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 /> Connected
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifier</CardTitle>
                <Activity className="text-pink-400" />
              </CardHeader>
              <CardContent>
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 /> Active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* charts */}
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader><CardTitle>Uptime (24h)</CardTitle></CardHeader>
              <CardContent><UptimeBar data={uptimeData} /></CardContent>
            </Card>
            <Card className="bg-gray-800/70 border-gray-700">
              <CardHeader><CardTitle>Average Latency (ms)</CardTitle></CardHeader>
              <CardContent><LatencyLine data={latencyData} /></CardContent>
            </Card>
          </div>

          {/* monitors (private + public) */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-gray-800/70 border-gray-700 mt-8">
              <CardHeader><CardTitle>/api/monitors</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="py-2">Name</th><th>URL</th><th>Method</th><th>Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitors.map((m) => (
                      <tr key={m.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td>{m.url}</td>
                        <td>{m.method}</td>
                        <td>{m.is_enabled ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/70 border-gray-700 mt-8">
              <CardHeader><CardTitle>/api/public/monitors + summary</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="py-2">Name</th><th>Uptime %</th><th>Latency (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publicMonitors.map((m) => (
                      <tr key={m.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td><UptimeBadge value={summaries[m.id]?.uptime_percent} /></td>
                        <td>{summaries[m.id]?.avg_latency_ms?.toFixed(0) ?? "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* incidents */}
          <Card className="bg-gray-800/70 border-gray-700 mt-8">
            <CardHeader className="flex items-center gap-2">
              <AlertCircle className="text-red-400" />
              <CardTitle>Active Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <p className="text-gray-400">No active incidents 🎉</p>
              ) : (
                <ul className="list-disc pl-6">
                  {incidents.map((i, idx) => (
                    <li key={idx} className="mb-1 text-red-300">
                      #{i.id ?? "—"} · monitor {i.monitor_id ?? "—"} · {i.reason ?? "—"}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
