export function UptimeBadge({ pct }: { pct: number }) {
    const color = pct > 99 ? 'green' : pct > 95 ? 'orange' : 'red';
    return (
        <span
            style={{
                padding: '4px 8px',
                borderRadius: 8,
                background: color,
                color: '#fff'
            }}
        >
            {pct.toFixed(2)}%
        </span>
    );
}
