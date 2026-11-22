'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, LogIn, Search, Users } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { createClient } from '@/lib/supabase-browser';
import { Empty, PageHead, Sheet, Tabs } from '@/components/ks-ui';
import { dueDateOf, effectiveEnd, refreshRoomsFromServer, refreshAllFromServer, rp, shortDate, toast, todayISO, waLink, sortRooms } from '@/lib/ks';

type Tab = 'aktif' | 'booking' | 'riwayat';
type Booking = { id: string; guest_name: string; guest_phone: string; check_in: string; duration_months: number; status: string; room_id: string; room_name?: string; room_price?: number };

export default function PenghuniPage() {
  const k = useKs();
  const [tab, setTab] = useState<Tab>('aktif');
  const [q, setQ] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookOpen, setBookOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().rpc('get_kostin_bookings_for_owner');
    if (Array.isArray(data)) setBookings(data as Booking[]);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('tab') === 'booking') setTab('booking');
    if (p.get('aksi') === 'booking') setBookOpen(true);
    void load();
    const iv = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => window.clearInterval(iv);
  }, [load]);

  const today = todayISO();
  const s = q.trim().toLowerCase();
  const match = (...v: (string | undefined)[]) => !s || v.some((x) => String(x || '').toLowerCase().includes(s));
  const active = k.tenants.filter((t) => match(t.name, t.phone, t.room, t.occupation));
  const open = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').filter((b) => match(b.guest_name, b.guest_phone, b.room_name, b.room_id));
  const openAll = bookings.filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED').length;
  const hist = k.tenantHistory.filter((t) => match(t.name, t.phone, t.room)).sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')));
  const expired = k.tenants.filter((t) => effectiveEnd(t) <= today);

  const setStatus = async (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    const { error } = await createClient().rpc('update_kostin_booking_status', { p_booking_id: id, p_status: status });
    if (error) return toast(error.message || 'Gagal mengubah status booking.');
    toast(status === 'CONFIRMED' ? 'Booking disetujui. Siap check-in.' : 'Booking ditolak. Kamar kembali kosong.');
    await load(); await refreshAllFromServer(); await refreshRoomsFromServer();
  };

  const status = (t: (typeof k.tenants)[number]) => {
    const open = k.payments.filter((p) => p.status === 'unpaid' && ((p.tenantId && p.tenantId === t.id) || (!p.tenantId && p.tenant === t.name && p.room === t.room)));
    if (open.some((p) => dueDateOf(p, k.tenants) < today)) return { l: 'Menunggak', c: 'bad' };
    if (open.length) return { l: 'Belum bayar', c: 'dipesan' };
    return { l: 'Lunas', c: 'terisi' };
  };

  return (
    <div className="ks-page">
      <PageHead title="Penghuni" sub={`${k.tenants.length} penghuni aktif`}>
        <button className="ks-btn ghost" onClick={() => setBookOpen(true)}><CalendarDays size={20} /> Booking</button>
        <Link className="ks-btn" href="/kostpro/kamar/check-in"><LogIn size={20} /> Check-in</Link>
      </PageHead>

      <section className="ks-card">
        <Tabs<Tab> value={tab} onChange={setTab} items={[{ id: 'aktif', label: 'Aktif', n: k.tenants.length }, { id: 'booking', label: 'Calon & booking', n: openAll }, { id: 'riwayat', label: 'Riwayat', n: k.tenantHistory.length }]} />
        <label className="ks-search-f"><Search size={22} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, HP, kamar, kampus/pekerjaan" /></label>

        {tab === 'aktif' && (
          <>
            {expired.length > 0 && (
              <div className="ks-banner warn"><CalendarDays size={20} /><div><p><b>{expired.length} penghuni masa sewanya berakhir.</b></p><div className="ks-banner-actions"><Link className="ks-btn sm" href="/kostpro/penghuni/kelola">Proses check-out</Link></div></div></div>
            )}
            {!active.length ? (
              <Empty icon={<Users size={56} strokeWidth={1.5} />} title="Belum ada penghuni aktif" text="Gunakan Check-in untuk mendaftarkan penghuni ke kamar.">
                <Link className="ks-btn" href="/kostpro/kamar/check-in"><LogIn size={20} /> Check-in</Link>
              </Empty>
            ) : (
              <div className="ks-list">
                {active.map((t) => {
                  const st = status(t);
                  return (
                    <div key={t.id} className="ks-bill">
                      <div className="ks-bill-top"><span><b>{t.name}</b><small>Kamar {t.room}{t.occupation ? ' · ' + t.occupation : ''}</small></span><em className={'ks-pill ' + st.c}>{st.l}</em></div>
                      <small>{shortDate(t.startDate)} – {shortDate(effectiveEnd(t))} · {rp(t.rent)}/bulan{t.phone ? ' · ' + t.phone : ''}</small>
                      <div className="ks-bill-act">
                        {t.phone && <a className="ks-btn sm ghost" href={waLink(t.phone, `Halo ${t.name}, `)} target="_blank" rel="noreferrer">WhatsApp</a>}
                        <Link className="ks-btn sm ghost" href={'/kostpro/master-bill?id=' + encodeURIComponent(t.id)}>Master Bill</Link>
                        <Link className="ks-btn sm ghost" href="/kostpro/penghuni/kelola">Kelola</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'booking' && (
          !open.length ? <Empty icon={<CalendarDays size={56} strokeWidth={1.5} />} title="Belum ada calon penghuni" text="Booking dari KostIn dan booking manual akan muncul di sini secara otomatis." /> : (
            <div className="ks-list">
              {open.map((b) => (
                <div key={b.id} className="ks-bill">
                  <div className="ks-bill-top"><span><b>{b.guest_name}</b><small>{b.guest_phone} · Kamar {b.room_name || b.room_id}</small></span><em className={'ks-pill ' + (b.status === 'PENDING' ? 'dipesan' : 'terisi')}>{b.status === 'PENDING' ? 'Menunggu' : 'Disetujui'}</em></div>
                  <small>Masuk {shortDate(b.check_in)} · {b.duration_months} bulan{b.room_price ? ' · ' + rp(b.room_price) : ''}</small>
                  <div className="ks-bill-act">
                    {b.status === 'PENDING' && <button className="ks-btn sm" onClick={() => void setStatus(b.id, 'CONFIRMED')}>Setujui</button>}
                    {b.status === 'CONFIRMED' && <Link className="ks-btn sm" href={'/kostpro/booking/ci?id=' + encodeURIComponent(b.id)}>Check-in</Link>}
                    <button className="ks-btn sm ghost" onClick={() => void setStatus(b.id, 'CANCELLED')}>Tolak</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'riwayat' && (
          !hist.length ? <Empty icon={<Users size={56} strokeWidth={1.5} />} title="Belum ada riwayat" text="Penghuni yang sudah check-out akan tercatat di sini." /> : (
            <div className="ks-list">
              {hist.map((t) => (
                <div key={t.id} className="ks-bill"><div className="ks-bill-top"><span><b>{t.name}</b><small>Kamar {t.room} · {shortDate(t.startDate)} – {shortDate(t.endDate)}</small></span><small>{t.checkoutReason === 'expired' ? 'Masa sewa habis' : t.checkoutReason === 'transferred' ? 'Pindah kamar' : 'Check-out'}</small></div></div>
              ))}
              <Link className="ks-link" href="/kostpro/penghuni/history">Lihat riwayat lengkap</Link>
            </div>
          )
        )}
      </section>

      <BookSheet open={bookOpen} onClose={() => setBookOpen(false)} rooms={sortRooms(k.rooms).filter((r) => r.status === 'available')} onDone={async () => { setBookOpen(false); setTab('booking'); await load(); await refreshAllFromServer(); await refreshRoomsFromServer(); }} />
    </div>
  );
}

function BookSheet({ open, onClose, rooms, onDone }: { open: boolean; onClose: () => void; rooms: { id: string; price: number }[]; onDone: () => void }) {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dur, setDur] = useState('1');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setRoom(rooms[0]?.id || ''); setName(''); setPhone(''); setDate(todayISO()); setDur('1'); } }, [open]);
  const go = async () => {
    if (!room || !name.trim() || !phone.trim()) return toast('Kamar, nama, dan nomor HP wajib diisi.');
    setBusy(true);
    const { error } = await createClient().rpc('create_owner_booking', { p_room_id: room, p_guest_name: name.trim(), p_guest_phone: phone.trim(), p_check_in: date, p_duration_months: Number(dur) || 1 });
    setBusy(false);
    if (error) return toast(error.message || 'Gagal mencatat booking.');
    toast('Booking dicatat. Kamar berstatus Dipesan.'); onDone();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Catat booking">
      {!rooms.length ? <p className="ks-muted pad">Tidak ada kamar kosong untuk dibooking.</p> : (<>
        <label className="ks-f"><b>Kamar</b><select value={room} onChange={(e) => setRoom(e.target.value)}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.id} — {rp(r.price)}</option>)}</select></label>
        <label className="ks-f"><b>Nama calon penghuni</b><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="ks-f"><b>No. WhatsApp / HP</b><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" /></label>
        <div className="ks-2">
          <label className="ks-f"><b>Tanggal masuk</b><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="ks-f"><b>Durasi (bulan)</b><input type="number" min={1} max={120} value={dur} onChange={(e) => setDur(e.target.value)} /></label>
        </div>
        <button className="ks-btn block" disabled={busy} onClick={() => void go()}>{busy ? 'Menyimpan…' : 'Simpan booking'}</button>
      </>)}
    </Sheet>
  );
}
