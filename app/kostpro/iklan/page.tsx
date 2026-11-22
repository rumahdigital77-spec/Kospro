'use client';
import Link from 'next/link';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { saveData } from '@/lib/store';
import { Empty, PageHead } from '@/components/ks-ui';
import { elecTile, floorOf, rp, sortRooms, toast } from '@/lib/ks';

export default function IklanKamar() {
  const k = useKs();
  const rooms = sortRooms(k.rooms);
  const vacant = rooms.filter((r) => r.status === 'available');
  const live = vacant.filter((r) => r.listed !== false);
  const demo = !!k.settings.demo;

  const toggle = async (id: string, on: boolean) => {
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: { ...k.rooms.find((r) => r.id === id), listed: on } }) });
      if (!res.ok) throw new Error('Gagal memperbarui iklan.');
      await saveData('rooms', k.rooms.map((r) => (r.id === id ? { ...r, listed: on } : r)));
      toast(on ? `Kamar ${id} tayang di KostIn.` : `Kamar ${id} disembunyikan.`);
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal.'); }
  };

  return (
    <div className="ks-page">
      <PageHead title="Iklan Kamar" sub={demo ? 'Mode contoh: tidak tayang di KostIn' : `${live.length} kamar tayang di KostIn`}>
        <Link className="ks-btn ghost" href="/kostin" target="_blank"><ExternalLink size={18} /> Buka KostIn</Link>
      </PageHead>
      <section className="ks-card">
        <div className="ks-note blue"><Megaphone size={20} /><span>Kamar berstatus <b>Kosong</b> otomatis tayang di KostIn dan hilang saat terisi atau dipesan. Matikan tombol untuk menyembunyikan kamar tertentu.</span></div>
        {!vacant.length ? <Empty icon={<Megaphone size={56} strokeWidth={1.5} />} title="Tidak ada kamar kosong" text="Kamar kosong akan muncul di sini." /> : (
          <div className="ks-list">
            {vacant.map((r) => (
              <label key={r.id} className="ks-row">
                <span><b>Kamar {r.id}</b><small>Lantai {floorOf(r)} · {rp(r.price)}/bulan · listrik {elecTile(r.elec)}{!r.price ? ' · harga belum diisi' : ''}</small></span>
                <input type="checkbox" className="ks-switch" checked={r.listed !== false} disabled={demo} onChange={(e) => void toggle(r.id, e.target.checked)} />
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
