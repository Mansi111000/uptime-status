import { clsx } from "clsx";
import React from "react";

export function Panel({ children, className }:{children:React.ReactNode; className?:string}) {
  return (
    <div className={clsx(
      "rounded-2xl border border-white/10 bg-card/70 backdrop-blur-sm shadow-lg",
      className
    )}>
      {children}
    </div>
  );
}

export function KPI({ title, value, accent }:{title:string; value:number|string; accent?:"ok"|"bad"}) {
  return (
    <Panel className="p-4">
      <div className="text-xs uppercase tracking-wider text-white/40">{title}</div>
      <div className={clsx("mt-1 text-3xl font-semibold",
        accent==="ok" && "text-emerald-400",
        accent==="bad" && "text-rose-400",
        !accent && "text-white"
      )}>{value}</div>
      <div className="mt-3 h-8">
        <div className="h-full rounded-lg bg-white/5 overflow-hidden">
          <div className={clsx("h-full", accent==="ok" ? "bg-emerald-500/40" : accent==="bad" ? "bg-rose-500/40" : "bg-sky-500/30")}
               style={{ width: "66%" }} />
        </div>
      </div>
    </Panel>
  );
}

export function Pill({ children, active, onClick }:{children:React.ReactNode; active?:boolean; onClick?():void}) {
  return (
    <button onClick={onClick}
      className={clsx("px-3 py-1.5 rounded-full text-xs border transition",
        active ? "bg-white text-black border-white" : "text-white/70 border-white/20 hover:bg-white/10")}>
      {children}
    </button>
  );
}

export function StatusBadge({ ok, paused }:{ok?:boolean; paused?:boolean}) {
  const label = paused ? "Paused" : ok ? "Up" : "Down";
  const cls = paused ? "bg-zinc-500" : ok ? "bg-emerald-500" : "bg-rose-500";
  return (
    <span className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full text-white ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-white" />
      {label}
    </span>
  );
}

export function TrendBars({ points, max=1000, loading }:{points:{v:number; ok:boolean}[]; max?:number; loading?:boolean}) {
  if (loading) return <div className="h-9 animate-pulse rounded-md bg-white/5" />;
  const normalized = points.slice(-36); // last 36 bars
  return (
    <div className="flex items-end gap-[2px] h-9">
      {normalized.map((p, i) => {
        const h = Math.max(3, Math.round((p.v / max) * 32));
        const c = p.ok ? "bg-emerald-400/80" : "bg-rose-500/80";
        return <div key={i} className={`w-[6px] rounded-sm ${c}`} style={{ height: `${h}px` }} />;
      })}
    </div>
  );
}

export function Cog(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M10.2 2.3h3.6l.6 2.6a7.6 7.6 0 012.3 1.3l2.5-.9 1.8 3.1-2 1.7c.1.4.1.9.1 1.4s0 1-.1 1.4l2 1.7-1.8 3.1-2.5-.9a7.6 7.6 0 01-2.3 1.3l-.6 2.6h-3.6l-.6-2.6a7.6 7.6 0 01-2.3-1.3l-2.5.9-1.8-3.1 2-1.7A7.9 7.9 0 013 12c0-.5 0-1 .1-1.4l-2-1.7L2.9 5.8l2.5.9c.7-.6 1.5-1 2.3-1.3l.5-2.6z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function PanelSection({ title, children }:{title:string; children:React.ReactNode}) {
  return (
    <Panel className="p-4">
      <div className="text-sm font-medium text-white mb-3">{title}</div>
      {children}
    </Panel>
  );
}

export const classes = {}; // reserved for future
