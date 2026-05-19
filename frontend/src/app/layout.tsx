import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import CookieBanner from '@/components/ui/CookieBanner';

export const metadata: Metadata = {
  title: 'Permission Manager',
  description: 'Gestion des permissions et droits d acces pour entreprises'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
