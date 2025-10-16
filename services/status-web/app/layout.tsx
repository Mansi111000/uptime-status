export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
                <div style={{ maxWidth: 980, margin: '2rem auto', padding: '0 1rem' }}>
                    <h1>⚡ Uptime Status</h1>
                    {children}
                </div>
            </body>
        </html>
    );
}
