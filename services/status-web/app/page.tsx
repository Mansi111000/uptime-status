async function fetchJSON(path: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
    const r = await fetch(`${base}${path}`, { cache: 'no-store' })
    return r.json()
}

import Charts from './components/Charts'
import { UptimeBadge } from './components/UptimeBadge'

export default async function Page() {
    const mons = await fetchJSON('/public/monitors')
    const summaries = await Promise.all(
        mons.map((m: any) => fetchJSON(`/public/monitors/${m.id}/summary?window=24h`))
    )

    return (
        <div>
            <p>
                Overall platform status: <strong>Operational</strong>
            </p>
            <div style={{ display: 'grid', gap: 16 }}>
                {mons.map((m: any, i: number) => (
                    <div key={m.id} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
                        <h3 style={{ margin: '0 0 8px' }}>{m.name}</h3>
                        <p style={{ margin: '4px 0' }}>
                            <a href={m.url} target="_blank">
                                {m.url}
                            </a>
                        </p>
                        <UptimeBadge pct={summaries[i].uptime_percent || 0} />
                        <div style={{ marginTop: 12 }}>
                            <Charts data={[{ x: 'now', latency: summaries[i].avg_latency_ms || 0 }]} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
