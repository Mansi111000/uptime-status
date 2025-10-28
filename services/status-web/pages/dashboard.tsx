import Head from "next/head";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Panel, KPI, Pill, StatusBadge, TrendBars, Cog } from "../app/components/DashboardBits";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

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

function useMonitors() {
  const { data, isLoading, error } = useSWR<Monitor[]>("/api/public/monitors", fetcher, { refreshInterval: 15000 });
  return { monitors: data ?? [], isLoading, error };
}

function useSummary(id?: number, window = "24h") {
  const shouldFetch = !!id;
  const { data } = useSWR<SummaryPoint[]>(
    shouldFetch ? `/api/public/monitors/${id}/summary?window=${window}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );
  return data ?? [];
}

export default function Dashboard() {
  const { monitors, isLoading } = useMonitors();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HTTP" | "PING" | "PORT">("ALL");
  const [stateFilter, setStateFilter] = useState<"ALL" | "ENABLED" | "PAUSED">("ALL");

  const filtered = useMemo(() => {
    return (monitors ?? []).filter(m => {
      const t =
        m.method === "PING" ? "PING" :
        m.method === "PORT" ? "PORT" : "HTTP";
      const passType = typeFilter === "ALL" || t === typeFilter;
      const passState = stateFilter === "ALL" || (stateFilter === "ENABLED" ? m.is_enabled : !m.is_enabled);
      const passQ =
        q.trim().length === 0 ||
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.url.toLowerCase().includes(q.toLowerCase());
      return passType && passState && passQ;
    });
  }, [monitors, q, typeFilter, stateFilter]);

  const kpis = useMemo(() => {
    let up = 0, down = 0, paused = 0;
    monitors.forEach((m) => {
      if (!m.is_enabled) paused += 1;
      else up += 1; // treat unknown as up for now; your monitor service will flip this over time
    });
    return { up, down, paused };
  }, [monitors]);

  return (
    <>
      <Head><title>Uptime Status • Dashboard</title></Head>

      <div className="min-h-screen grid grid-cols-[240px_1fr] bg-grid px-0">
        {/* Sidebar */}
        <aside className="hidden md:block bg-sidebar/70 backdrop-blur-sm border-r border-white/5">
          <div className="p-4 text-sm font-medium text-white/80">Uptime</div>
          <nav className="px-2 space-y-1 text-sm">
            <NavLink href="/dashboard" label="Uptime" active />
            <NavLink href="#" label="Incidents" />
            <NavLink href="#" label="Status pages" />
            <NavLink href="#" label="Maintenance" />
            <NavLink href="#" label="Settings" />
          </nav>
          <div className="absolute bottom-4 left-0 right-0 px-4 text-xs text-white/40">
            Bluewave Uptime • Super Admin
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-2">
                ⚡ Uptime Status
              </h1>
              <p className="text-white/50 text-sm mt-1">
                A quick overview of your monitors.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary">Create new</button>
              <button className="btn-ghost">Bulk Import</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <KPI title="UP" value={kpis.up} accent="ok" />
            <KPI title="DOWN" value={kpis.down} accent="bad" />
            <KPI title="PAUSED" value={kpis.paused} />
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Pill active>Monitors: {filtered.length}</Pill>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">Type</span>
              {(["ALL","HTTP","PING","PORT"] as const).map(t => (
                <Pill key={t} active={typeFilter===t} onClick={()=>setTypeFilter(t)}>{t}</Pill>
              ))}
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">State</span>
              {(["ALL","ENABLED","PAUSED"] as const).map(s => (
                <Pill key={s} active={stateFilter===s} onClick={()=>setStateFilter(s)}>{s}</Pill>
              ))}
            </div>
            <div className="ml-auto w-full sm:w-80">
              <input
                placeholder="Search monitors…"
                className="input"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <Panel className="mt-6 overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_minmax(240px,1fr)_120px_56px] px-4 py-3 text-xs uppercase tracking-wide text-white/40">
              <div>Host</div><div>Status</div><div>Response time</div><div>Type</div><div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-white/5">
              {(isLoading ? Array.from({length:4}) : filtered).map((m, i) => (
                <MonitorRow key={(m as any)?.id ?? i} monitor={m as Monitor} loading={isLoading}/>
              ))}
            </div>
          </Panel>
        </main>
      </div>
    </>
  );
}

function NavLink({ href, label, active=false }:{href:string; label:string; active?:boolean}) {
  return (
    <Link href={href} className={`block px-3 py-2 rounded-xl transition
      ${active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
      {label}
    </Link>
  );
}

function MonitorRow({ monitor, loading }:{monitor?:Monitor; loading:boolean}) {
  const points = useSummary(monitor?.id);
  const lastOk = points.length ? points[points.length-1].ok : true;
  const type =
    monitor?.method === "PING" ? "PING" :
    monitor?.method === "PORT" ? "PORT" : "HTTP(S)";

  return (
    <div className="grid grid-cols-[1fr_120px_minmax(240px,1fr)_120px_56px] items-center px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-white truncate">{loading ? "—" : monitor?.name}</div>
        <a href={monitor?.url} className="text-xs text-sky-400/80 hover:text-sky-300 truncate block">
          {loading ? " " : monitor?.url}
        </a>
      </div>
      <div>
        <StatusBadge ok={loading ? true : (monitor?.is_enabled ? lastOk : false)} paused={!monitor?.is_enabled}/>
      </div>
      <div className="pr-4">
        <TrendBars
          points={(points ?? []).map(p => ({ v: Math.min(1000, p.ms), ok: p.ok }))}
          max={1000}
          loading={loading}
        />
      </div>
      <div className="text-white/70 text-sm">{type}</div>
      <div className="text-right">
        <button className="icon-btn" aria-label="settings"><Cog /></button>
      </div>
    </div>
  );
}
