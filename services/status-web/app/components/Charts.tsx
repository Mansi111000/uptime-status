'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Charts({ data }: { data: { x: string; latency: number }[] }) {
    return (
        <div style={{ height: 240, border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey="x" hide />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="latency" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
