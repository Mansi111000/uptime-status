// Server component: fetch data on the server and pass to client components.

type Monitor = {
  id: number;
  name: string;
  url: string;
  method: string;
  interval_sec: number;
  timeout_ms: number;
  expected_statuses: number[];
  is_enabled: boolean;
  created_at: string;
};

type Summary = {
  uptime_percent: number;
  avg_latency_ms: number;
  window: string;
};

async function fetchJSON<T>(path: string): Promise<T> {
  // Normalize base URL (accepts with/without trailing slash)
  const envBase = process.env.NEXT_PUBLIC_API_URL; // e.g. http://api:8000 in Docker
  const base =
    (envBase ? envBase.replace(/\/+$/, "") : "http://localhost/api") || "";
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`GET ${url} → ${r.status} ${r.statusText}: ${text}`);
  }
  return r.json() as Promise<T>;
}

import Charts from "./components/Charts";
import UptimeBadge from "./components/UptimeBadge";

export default async function Page() {
  let monitors: Monitor[] = [];
  let summariesByIndex: Summary[] = [];

  try {
    monitors = await fetchJSON<Monitor[]>("/public/monitors");
    summariesByIndex = await Promise.all(
      monitors.map((m) =>
        fetchJSON<Summary>(`/public/monitors/${m.id}/summary?window=24h`)
      )
    );
  } catch (e) {
    // Render a friendly error and bail from page crash
    const msg =
      e instanceof Error ? e.message : "Failed to fetch data from API";
    return (
      <div
        style={{
          border: "1px solid #f4c7c7",
          background: "#fff5f5",
          color: "#7a1f1f",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <strong>API Error:</strong> {msg}
      </div>
    );
  }

  const overallOperational =
    monitors.length === 0 ||
    summariesByIndex.every((s) => (s?.uptime_percent ?? 0) >= 99);

  return (
    <div>
      <p style={{ margin: "0 0 16px" }}>
        Overall platform status:{" "}
        <strong style={{ color: overallOperational ? "#16a34a" : "#b91c1c" }}>
          {overallOperational ? "Operational" : "Degraded"}
        </strong>
      </p>

      {monitors.length === 0 ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "#fafafa",
          }}
        >
          <p style={{ margin: 0 }}>
            No monitors found. Create one via{" "}
            <code>/api/monitors</code> (POST) and refresh.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {monitors.map((m, i) => {
            const sum = summariesByIndex[i] ?? {
              uptime_percent: 0,
              avg_latency_ms: 0,
              window: "24h",
            };
            const chartData = [
              {
                x: "avg(24h)",
                latency: Math.max(0, Math.round(sum.avg_latency_ms || 0)),
              },
            ];

            return (
              <section
                key={m.id}
                aria-labelledby={`monitor-${m.id}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 16,
                  background: "white",
                }}
              >
                <h3 id={`monitor-${m.id}`} style={{ margin: "0 0 6px" }}>
                  {m.name}
                </h3>

                <p style={{ margin: "2px 0 10px" }}>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2563eb", textDecoration: "none" }}
                  >
                    {m.url}
                  </a>
                </p>

                <div style={{ marginBottom: 8 }}>
                  <UptimeBadge value={sum.uptime_percent ?? 0} />
                </div>

                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                  <span style={{ marginRight: 12 }}>
                    <strong>Method:</strong> {m.method}
                  </span>
                  <span style={{ marginRight: 12 }}>
                    <strong>Interval:</strong> {m.interval_sec}s
                  </span>
                  <span>
                    <strong>Timeout:</strong> {m.timeout_ms}ms
                  </span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Charts data={chartData} />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
