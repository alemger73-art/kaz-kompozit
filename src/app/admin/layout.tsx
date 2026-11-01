import '../globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { title: 'Админка', robots: { index: false, follow: false }, icons: { icon: '/favicon.svg' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-graphite-50">{children}</body>
    </html>
  );
}
