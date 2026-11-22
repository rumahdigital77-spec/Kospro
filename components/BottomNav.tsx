'use client';

// Navigasi bawah untuk KostIn (marketplace). Navigasi KostPro ada di components/KostproShell.tsx.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Art3D, { type ArtName } from './Art3D';

type Item = { href: string; label: string; art: ArtName; exact?: boolean };

const KOSTIN: Item[] = [
  { href: '/kostin', label: 'Beranda', art: 'home', exact: true },
  { href: '/kostin#properti', label: 'Cari', art: 'search' },
  { href: '/kostin/booking', label: 'Booking', art: 'calendar' },
  { href: '/kostin/partner', label: 'Partner', art: 'store' },
  { href: '/', label: 'Menu', art: 'grid', exact: true },
];

export default function BottomNav({ mode }: { mode: 'kostin' | 'kostpro' }) {
  const path = usePathname() || '/';
  const items = KOSTIN;
  const on = (i: Item) => {
    const base = i.href.split('#')[0];
    if (i.label === 'Cari') return false;
    if (i.label === 'Beranda') return path === '/kostin' || path.startsWith('/kostin/kost');
    return i.exact ? path === base : path === base || path.startsWith(base + '/');
  };
  if (mode !== 'kostin') return null;
  return (
    <nav className="bn" aria-label="Menu utama">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className={'bn-item' + (on(i) ? ' on' : '')} aria-current={on(i) ? 'page' : undefined}>
          <Art3D name={i.art} size={32} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
