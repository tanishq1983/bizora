import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider } from '@/lib/auth';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bizora',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Bizora — Validate your startup before an investor does',
    template: '%s · Bizora',
  },
  description:
    'Bizora runs your startup idea past an AI Builder Agent and a relentless Investor Agent, then hands you a readiness score you can defend.',
  openGraph: {
    title: 'Bizora — Validate your startup before an investor does',
    description:
      'An AI Builder Agent analyses your idea. An AI Investor Agent asks three hard questions. You leave with an investor-readiness score.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050912',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only rounded-md bg-brand-600 px-4 py-2 font-medium text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>

        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}