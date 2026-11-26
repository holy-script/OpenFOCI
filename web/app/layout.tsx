import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenFOCI — Sovereign Biofeedback & Wearable Telemetry Engine',
  description:
    'Open-source BLE driver, real-time diaphragmatic respiration telemetry engine, and local-first Mind Orb cockpit for FOCI wearables.',
  keywords: [
    'OpenFOCI',
    'FOCI',
    'BLE',
    'wearable',
    'biofeedback',
    'respiration',
    'diaphragmatic breathing',
    'AirSync',
    'Tencent',
    'reverse-engineering',
    'open-source',
  ],
  authors: [{ name: 'OpenFOCI Contributors' }],
};

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="min-h-screen bg-[#030712] text-zinc-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
