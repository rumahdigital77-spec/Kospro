'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogIn, Banknote, LayoutGrid, AlertTriangle, BedSingle, FileText, CalendarDays, Check, Shield, ChevronRight } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { createClient } from '@/lib/supabase-browser';
import {
  addDaysISO, backupDue, backupNow, dueDateOf, effectiveEnd, greeting, longDate, monthKey, monthLabel, rp, shortDate, todayISO, toast, vacantDays,
} from '@/lib/ks';

type Booking = { id: string; guest_name: string; room_name?: string; room_id: string; status: string };

export default function Beranda() {
  const k = useKs();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [snoozed, setSnoozed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSnoozed(localStorage.getItem('kostpro_backup_snooze') === todayISO());
    let off = false;
    const load = async () => {
      const { data } = await createClient().rpc('get_kostin_bookings_for_owner');
      if (!off && Array.isArray(data)) setBookings(data as Booking[]);
    };
    void load();
    const iv = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => { off = true; window.clearInterval(iv); };
  }, []);

  const today = todayISO();
  const now = new Date();
  const curKey = monthKey(now);
  const curLabel = monthLabel(now);
  const allPay = [...k.payments, ...k.paymentHistory.filter((h) => !k.payments.some((p) => p.id === h.id))];

  const total = k.rooms.length;
  const occupied = k.rooms.filter((r) => r.status === 'occupied').length;
  const occ = total ? Math.round((occupied / total) * 100) : 0;
  const received = allPay.filter((p) => p.status === 'paid' && String(p.paidAt || '').slice(0, 7) === curKey).reduce((s, p) => s + p.amount, 0);
  const billed = allPay.filter((p) => p.month === curLabel).reduce((s, p) => s + p.amount, 0);
  const potential = k.rooms.filter((r) => r.status !== 'maintenance').reduce((s, r) => s + (r.price || 0), 0);
  const overdue = k.payments.filter((p) => p.status === 'unpaid' && dueDateOf(p, k.tenants) < today);
  const overdueSum = overdue.reduce((s, p) => s + p.amount, 0);
  const overdueTenants = new Set(overdue.map((p) => p.tenantId || p.tenant)).size;
  const dueToday = k.payments.filter((p) => p.status === 'unpaid' && dueDateOf(p, k.tenants) === today);
  const vacant = k.rooms.filter((r) => r.status === 'available');
  const oldest = vacant.slice().sort((a, b) => vacantDays(b) - vacantDays(a))[0];
  const ending = k.tenants.filter((t) => { const e = effectiveEnd(t); return e >= today && e <= addDaysISO(today, 30); });
  const endingSoon = ending.filter((t) => effectiveEnd(t) <= addDaysISO(today, 7));
  const pending = bookings.filter((b) => b.status === 'PENDING');
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
  const prospects = pending.length + confirmed.length;

  const actions: { key: string; title: string; sub: string; href: string }[] = [
    ...overdue.slice(0, 4).map((p) => ({ key: 'o' + p.id, title: `Tunggakan — ${p.tenant} (${p.room})`, sub: `${p.month} · jatuh tempo ${shortDate(dueDateOf(p, k.tenants))} · ${rp(p.amount)}`, href: '/kostpro/tagihan?tab=tunggakan' })),
    ...dueToday.slice(0, 3).map((p) => ({ key: 'd' + p.id, title: `Jatuh tempo hari ini — ${p.tenant} (${p.room})`, sub: rp(p.amount), href: '/kostpro/tagihan' })),
    ...pending.slice(0, 3).map((b) => ({ key: 'b' + b.id, title: `Booking baru dari ${b.guest_name}`, sub: `Kamar ${b.room_name || b.room_id} · menunggu persetujuan`, href: '/kostpro/penghuni?tab=booking' })),
    ...confirmed.slice(0, 3).map((b) => ({ key: 'c' + b.id, title: `Siap check-in: ${b.guest_name}`, sub: `Kamar ${b.room_name || b.room_id} · booking disetujui`, href: '/kostpro/penghuni?tab=booking' })),
    ...endingSoon.slice(0, 3).map((t) => ({ key: 'e' + t.id, title: `Kontrak ${t.name} segera berakhir`, sub: `Kamar ${t.room} · ${shortDate(effectiveEnd(t))}`, href: '/kostpro/penghuni' })),
  ];

  const showBackup = k.ready && backupDue(k.settings) && !snoozed;
  const name = k.settings.ownerName || k.settings.manager || 'Pemilik';

  const doBackup = async () => {
    setBusy(true);
    try {
      const r = await backupNow();
      if (r !== 'cancelled') toast(r === 'shared' ? 'Cadangan dibagikan.' : 'File cadangan diunduh. Simpan ke Google Drive/WhatsApp pribadi.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal membuat cadangan.'); }
    setBusy(false);
  };

  return (
    <div className="ks-page">
      <h1 className="ks-hello">Selamat {greeting(now)}, {name}</h1>
      <p className="ks-date">{longDate(now)}</p>

      <div className="ks-cta">
        <Link href="/kostpro/kamar/check-in" className="ks-btn"><LogIn size={22} /> Check-in</Link>
        <Link href="/kostpro/tagihan?aksi=bayar" className="ks-btn ghost"><Banknote size={22} /> Terima bayar</Link>
      </div>

      {showBackup && (
        <div className="ks-banner warn">
          <Shield size={22} />
          <div>
            <p><b>Waktunya mencadangkan data.</b> {k.settings.lastBackupAt ? `Terakhir dicadangkan ${Math.max(1, Math.floor((Date.now() - new Date(k.settings.lastBackupAt).getTime()) / 86400000))} hari lalu.` : 'Belum pernah mencadangkan.'} Simpan file cadangan ke Google Drive/WhatsApp pribadi agar aman.</p>
            <div className="ks-banner-actions">
              <button className="ks-btn sm" disabled={busy} onClick={() => void doBackup()}>Cadangkan sekarang</button>
              <button className="ks-link" onClick={() => { localStorage.setItem('kostpro_backup_snooze', todayISO()); setSnoozed(true); }}>Nanti</button>
            </div>
          </div>
        </div>
      )}

      <div className="ks-kpis">
        <Link href="/kostpro/kamar" className="ks-kpi">
          <h4><LayoutGrid size={22} /> Okupansi</h4>
          <strong>{occ}%</strong>
          <div className="ks-bar"><i style={{ width: occ + '%' }} /></div>
          <small>{occupied} dari {total} kamar terisi</small>
        </Link>
        <Link href="/kostpro/tagihan?status=lunas" className="ks-kpi">
          <h4><Banknote size={22} /> Diterima bulan ini</h4>
          <strong className="good">{rp(received)}</strong>
          <small>ditagih {rp(billed)} · potensi penuh {rp(potential)}</small>
        </Link>
        <Link href="/kostpro/tagihan?tab=tunggakan" className="ks-kpi">
          <h4><AlertTriangle size={22} /> Tunggakan</h4>
          <strong className={overdueSum ? 'bad' : ''}>{rp(overdueSum)}</strong>
          <small>{overdue.length} tagihan · {overdueTenants} penghuni</small>
        </Link>
        <Link href="/kostpro/kamar?f=kosong" className="ks-kpi">
          <h4><BedSingle size={22} /> Kamar kosong</h4>
          <strong>{vacant.length}</strong>
          <small>{oldest ? `terlama ${oldest.id} · ${vacantDays(oldest)} hari` : 'tidak ada kamar kosong'}</small>
        </Link>
        <Link href="/kostpro/penghuni" className="ks-kpi">
          <h4><FileText size={22} /> Kontrak berakhir</h4>
          <strong>{ending.length}</strong>
          <small>dalam 30 hari</small>
        </Link>
        <Link href="/kostpro/penghuni?tab=booking" className="ks-kpi">
          <h4><CalendarDays size={22} /> Calon penghuni</h4>
          <strong>{prospects}</strong>
          <small>daftar tunggu &amp; booking</small>
        </Link>
      </div>

      <section className="ks-card">
        <div className="ks-card-h"><h3>Perlu tindakan hari ini</h3><span>{actions.length} hal</span></div>
        {actions.length === 0 ? (
          <div className="ks-empty slim"><Check size={64} strokeWidth={1.5} /><b>Semua beres</b><p>Tidak ada tagihan jatuh tempo atau pekerjaan mendesak hari ini.</p></div>
        ) : (
          <div className="ks-list">
            {actions.map((a) => (
              <Link key={a.key} href={a.href} className="ks-row"><span><b>{a.title}</b><small>{a.sub}</small></span><ChevronRight size={20} /></Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
