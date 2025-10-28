// services/status-web/pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css'; // <-- load Tailwind

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
