import './theme.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'KostIn × KostPro',
  description: 'Marketplace kost dan sistem manajemen kost dalam satu aplikasi.',
  icons: { icon: '/icon-3d.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#4f46e5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
