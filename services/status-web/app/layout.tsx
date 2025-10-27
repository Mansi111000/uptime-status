import type { ReactNode } from "react";

export const metadata = {
  title: "Uptime Status",
  description: "Public uptime & latency dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
        <div
          style={{
            maxWidth: 980,
            margin: "2rem auto",
            padding: "0 1rem",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: "1.25rem",
            }}
          >
            <h1 style={{ margin: 0, fontWeight: 700 }}>
              <span role="img" aria-label="bolt">
                ⚡
              </span>{" "}
              Uptime Status
            </h1>

            <nav style={{ fontSize: 14, opacity: 0.9 }}>
              <a href="/" style={{ textDecoration: "none", color: "inherit" }}>
                Home
              </a>
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
