'use client';
import Link from 'next/link';
import { ChevronRight, FileText, Receipt, DoorOpen, Users, BarChart3 } from 'lucide-react';
import { PageHead } from '@/components/ks-ui';

const ITEMS = [
  { href: '/kostpro/kwitansi', t: 'Kwitansi', s: 'Buat, cetak, dan kirim kwitansi pembayaran', I: Receipt },
  { href: '/kostpro/master-bill', t: 'Master Bill', s: 'Rekap tagihan & pembayaran per penghuni', I: FileText },
  { href: '/kostpro/kamar/history-tamu', t: 'Riwayat tamu', s: 'Daftar tamu yang pernah menginap', I: Users },
  { href: '/kostpro/kamar/status', t: 'Status kamar', s: 'Ringkasan status seluruh kamar', I: DoorOpen },
  { href: '/kostpro/laporan/bulanan', t: 'Laporan bulanan', s: 'Rekap pendapatan dan pengeluaran per bulan', I: BarChart3 },
];

export default function Dokumen() {
  return (
    <div className="ks-page">
      <PageHead title="Dokumen" sub="Kwitansi, rekap tagihan, dan arsip" />
      <section className="ks-card"><div className="ks-list">
        {ITEMS.map(({ href, t, s, I }) => (
          <Link key={href} href={href} className="ks-row"><span className="ks-row-i"><I size={22} /></span><span><b>{t}</b><small>{s}</small></span><ChevronRight size={20} /></Link>
        ))}
      </div></section>
    </div>
  );
}
