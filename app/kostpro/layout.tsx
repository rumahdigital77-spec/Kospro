import './kostpro.css';
import './kosku.css';
import KostproShell from '@/components/KostproShell';

export const metadata = { title: 'KostPro — Manajemen Kost' };

export default function KostProLayout({ children }: { children: React.ReactNode }) {
  return <KostproShell>{children}</KostproShell>;
}
