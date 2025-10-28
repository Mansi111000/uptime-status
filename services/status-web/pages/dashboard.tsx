// services/status-web/pages/dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

type Monitor = {
  id: number;
  name: string;
  url: string;
  method: string;
  interval_sec: number;
  timeout_ms: number;
  is_enabled: boolean;
  expected_statuses: number[];
};

type SummaryPoint = { ts: string; ms: number; ok: boolean };

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HTTP" | "PING" | "PORT">("ALL");
  const [stateFilter, setStateFilter] = useState<"ALL" | "ENABLED" | "PAUSED">("ALL");
  const [summaries, setSummaries] = useState<Record<number, SummaryPoint[]>>({});

  // fetch monitors
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/public/monitors");
        const data: Monitor[] = await res.json();
        if (!alive) return;
        setMonitors(data);

        // fetch a small sparkline window for each monitor (parallel)
        const windowParam = "24h";
        const map: Record<number, SummaryPoint[]> = {};
        await Promise.all(
          data.map(async (m) => {
            try {
              const r = await fetch(`/api/public/monitors/${m.id}/summary?window=${windowParam}`);
              const s: SummaryPoint[] = await r.json();
              map[m.id] = s.slice(-28); // last ~28 points
            } catch {
              map[m.id] = [];
            }
          })
        );
        if (!alive) return;
        setSummaries(map);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return monitors.filter((m) => {
      const q = query.trim().toLowerCase();
      const matchesText =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.url.toLowerCase().includes(q) ||
        `${m.method}`.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "HTTP" && ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH"].includes(m.method)) ||
        (typeFilter === "PING" && m.method === "PING") ||
        (typeFilter === "PORT" && m.method === "PORT");

      const matchesState =
        stateFilter === "ALL" ||
        (stateFilter === "ENABLED" && m.is_enabled) ||
        (stateFilter === "PAUSED" && !m.is_enabled);

      return matchesText && matchesType && matchesState;
    });
  }, [monitors, query, typeFilter, stateFilter]);

  const upCount = filtered.filter((m) => m.is_enabled).length;
  const pausedCount = filtered.filter((m) => !m.is_enabled).length;
  const downCount = 0; // you can compute this from incident API if needed

  return (
    <>
      <Head>
        <title>Uptime Status — Dashboard</title>
      </Head>

      <main className="min-h-screen px-6 py-8 md:px-10 lg:px-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-orange-400 to-yellow-300" />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Uptime Status</h1>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
              Bulk Import
            </button>
            <button className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-neutral-900">
              Create new
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="UP" value={upCount} />
          <StatCard label="DOWN" value={downCount} />
          <StatCard label="PAUSED" value={pausedCount} />
          <StatCard label="Monitors" value={filtered.length} />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-500">Type</span>
          {(["ALL", "HTTP", "PING", "PORT"] as const).map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t}
            </FilterChip>
          ))}
          <span className="ml-3 text-sm font-medium text-neutral-500">State</span>
          {(["ALL", "ENABLED", "PAUSED"] as const).map((s) => (
            <FilterChip key={s} active={stateFilter === s} onClick={() => setStateFilter(s)}>
              {s}
            </FilterChip>
          ))}
          <input
            placeholder="Search monitors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ml-auto w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:ring-neutral-700"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[2fr,1fr,2fr,1fr,120px] gap-4 border-b border-neutral-200/70 px-4 py-3 text-sm font-semibold text-neutral-500 dark:border-neutral-800/70 md:grid">
            <div>Host</div>
            <div>Status</div>
            <div>Response time</div>
            <div>Type</div>
            <div className="text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-neutral-500">Loading monitors…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-neutral-500">No monitors match your filters.</div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
              {filtered.map((m) => {
                const points = summaries[m.id] ?? [];
                const okRatio =
                  points.length === 0
                    ? (m.is_enabled ? 1 : 0)
                    : points.filter((p) => p.ok).length / points.length;
                const status =
                  !m.is_enabled ? ("Paused" as const) : okRatio > 0.99 ? ("Up" as const) : ("Degraded" as const);

                return (
                  <li key={m.id} className="grid items-center gap-4 px-4 py-4 md:grid-cols-[2fr,1fr,2fr,1fr,120px]">
                    {/* Host + url */}
                    <div>
                      <div className="text-base font-semibold">{m.name || "Monitor " + m.id}</div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-neutral-500 hover:underline"
                      >
                        {m.url}
                      </a>
                    </div>

                    {/* Status pill */}
                    <div>
                      <span
                        className={
                          "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm " +
                          (status === "Paused"
                            ? "bg-neutral-200/60 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            : status === "Up"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300")
                        }
                      >
                        <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                        {status}
                      </span>
                    </div>

                    {/* Sparkline */}
                    <div className="flex h-10 items-end gap-0.5">
                      {points.length === 0 ? (
                        <div className="text-sm text-neutral-500">No data</div>
                      ) : (
                        points.map((p, i) => {
                          // height by latency, color by ok
                          const h = Math.max(2, Math.min(36, Math.round((p.ms / 1000) * 36)));
                          const cls = p.ok
                            ? "bg-neutral-700 dark:bg-neutral-300"
                            : "bg-rose-500/80 dark:bg-rose-400/90";
                          return <div key={i} className={`w-1 ${cls}`} style={{ height: h }} />;
                        })
                      )}
                    </div>

                    {/* Type */}
                    <div className="text-sm text-neutral-600 dark:text-neutral-300">{m.method === "PING" || m.method === "PORT" ? m.method : "HTTP(S)"}</div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                        Edit
                      </button>
                      <button className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                        Pause
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs font-semibold " +
        (active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900")
      }
    >
      {children}
    </button>
  );
}
