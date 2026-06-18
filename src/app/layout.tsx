import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,   // monospace is not LCP-path
});
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  preload: false,   // used only in sidebar/login labels
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Avishkar Dhol Tasha Pathak — Attendance System',
  description: 'Member management and attendance tracking for Avishkar Dhol Tasha Pathak',
};

// Preconnect to Google Fonts CDN to cut font latency
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${notoDevanagari.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
