'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plus, Search, Zap, Trash2 } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { saveData, type Room } from '@/lib/store';
import { PageHead, Sheet, Tabs } from '@/components/ks-ui';
import {
  ELEC_MODES, NUMBERING, dueDateOf, elecTile, floorOf, genRoomIds, normalizeFloor, rp, shortRp, sortRooms, toast, todayISO, vacantDays, daysBetween, addDaysISO,
} from '@/lib/ks';

type Filter = 'semua' | 'kosong' | 'terisi' | 'dipesan' | 'perbaikan';
const STATUS_OF: Record<Filter, Room['status'] | ''> = { semua: '', kosong: 'available', terisi: 'occupied', dipesan: 'reserved', perbaikan: 'maintenance' };
const LABEL: Record<Room['status'], string> = { available: 'Kosong', occupied: 'Terisi', reserved: 'Dipesan', maintenance: 'Perbaikan' };
const CLS: Record<Room['status'], string> = { available: 'kosong', occupied: 'terisi', reserved: 'dipesan', maintenance: 'perbaikan' };

export default function KamarPage() {
  const k = useKs();
  const [view, setView] = useState<'denah' | 'daftar'>('denah');
  const [filter, setFilter] = useState<Filter>('semua');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('aksi') === 'tambah') setAddOpen(true);
    const f = p.get('f') as Filter | null;
    if (f && f in STATUS_OF) setFilter(f);
    const room = p.get('room');
    if (room) setSel(room);
  }, []);

  const rooms = useMemo(() => sortRooms(k.rooms), [k.rooms]);
  const count = (f: Filter) => (f === 'semua' ? rooms.length : rooms.filter((r) => r.status === STATUS_OF[f]).length);
  const today = todayISO();
  const flag = (r: Room) => {
    const t = k.tenants.find((x) => x.room === r.id);
    if (!t) return '';
    const open = k.payments.filter((p) => p.status === 'unpaid' && ((p.tenantId && p.tenantId === t.id) || (!p.tenantId && p.tenant === t.name && p.room === t.room)));
    if (open.some((p) => dueDateOf(p, k.tenants) < today)) return 'bad';
    if (open.some((p) => { const d = daysBetween(today, dueDateOf(p, k.tenants)); return d >= 0 && d <= 3; })) return 'soon';
    return '';
  };

  const s = q.trim().toLowerCase();
  const shown = rooms.filter((r) => (!STATUS_OF[filter] || r.status === STATUS_OF[filter]) && (!s || r.id.toLowerCase().includes(s) || String(r.tenant).toLowerCase().includes(s)));
  const floors = Array.from(new Set(shown.map((r) => floorOf(r)))).sort((a, b) => a - b);
  const detail = sel ? rooms.find((r) => r.id === sel) || null : null;

  // Simpan satu kamar: server (penjaga booking/penghuni aktif) dulu, lalu data lokal + sinkron cloud.
  const saveRoom = async (room: Room, successMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error === 'ROOM_LOCKED_BY_ACTIVE_BOOKING_OR_TENANT' ? 'Kamar masih punya booking atau penghuni aktif. Selesaikan dulu lewat menu Penghuni.' : j?.error || 'Gagal menyimpan kamar.');
      }
      const exists = k.rooms.some((r) => r.id === room.id);
      const next = exists ? k.rooms.map((r) => (r.id === room.id ? { ...r, ...room } : r)) : [...k.rooms, room];
      await saveData('rooms', next);
      toast(successMsg);
      return true;
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal menyimpan kamar.'); return false; }
    finally { setBusy(false); }
  };

  const removeRoom = async (r: Room) => {
    if (!confirm(`Hapus kamar ${r.id}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      await saveData('rooms', k.rooms.filter((x) => x.id !== r.id));
      setSel(null); toast(`Kamar ${r.id} dihapus.`);
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal menghapus.'); }
    setBusy(false);
  };

  return (
    <div className="ks-page">
      <PageHead title="Kamar & Unit" sub={`${rooms.length} unit${k.settings.name ? ' · ' + k.settings.name : ''}`}>
        <button className="ks-btn ghost" onClick={() => setBulkOpen(true)}><LayoutGrid size={20} /> Tambah banyak</button>
        <button className="ks-btn" onClick={() => setAddOpen(true)}><Plus size={20} /> Kamar</button>
      </PageHead>

      <section className="ks-card">
        <div className="ks-toolbar">
          <label className="ks-search-f"><Search size={22} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kamar / penghuni" /></label>
          <div className="ks-seg">
            <button className={view === 'denah' ? 'on' : ''} onClick={() => setView('denah')}>Denah</button>
            <button className={view === 'daftar' ? 'on' : ''} onClick={() => setView('daftar')}>Daftar</button>
          </div>
        </div>
        <Tabs<Filter> value={filter} onChange={setFilter} items={[
          { id: 'semua', label: 'Semua', n: count('semua') }, { id: 'kosong', label: 'Kosong', n: count('kosong') }, { id: 'terisi', label: 'Terisi', n: count('terisi') },
          { id: 'dipesan', label: 'Dipesan', n: count('dipesan') }, { id: 'perbaikan', label: 'Perbaikan', n: count('perbaikan') },
        ]} />
        <div className="ks-legend">
          <span><i className="sq terisi" />Terisi</span><span><i className="sq kosong" />Kosong</span><span><i className="sq dipesan" />Dipesan</span><span><i className="sq perbaikan" />Perbaikan</span>
          <span><i className="dot bad" />Ada tunggakan</span><span><i className="dot soon" />Jatuh tempo ≤3 hari</span>
        </div>

        {!rooms.length && k.ready && <p className="ks-muted pad">Belum ada kamar. Tekan “+ Kamar” atau “Tambah banyak”.</p>}
        {rooms.length > 0 && !shown.length && <p className="ks-muted pad">Tidak ada kamar yang cocok.</p>}

        {view === 'denah' && floors.map((f) => {
          const inFloor = shown.filter((r) => floorOf(r) === f);
          const all = rooms.filter((r) => floorOf(r) === f);
          return (
            <div key={f} className="ks-floor">
              <div className="ks-floor-h"><b>Lantai {f}</b><span>{all.filter((r) => r.status === 'occupied').length}/{all.length} terisi</span></div>
              <div className="ks-rooms">
                {inFloor.map((r) => {
                  const fl = flag(r);
                  const tn = k.tenants.find((t) => t.room === r.id);
                  const sub = r.status === 'occupied' ? `Terisi ${tn ? Math.max(0, daysBetween(tn.startDate, today)) : vacantDays(r)}h` : `${LABEL[r.status]} ${vacantDays(r)}h`;
                  return (
                    <button key={r.id} className={'ks-room ' + CLS[r.status]} onClick={() => setSel(r.id)}>
                      {fl && <i className={'dot ' + fl} />}
                      <b>{r.id}</b>
                      <span>{r.status === 'occupied' && r.tenant && r.tenant !== '-' ? r.tenant : sub}</span>
                      <small>{shortRp(r.price)} · <Zap size={12} /> {elecTile(r.elec)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {view === 'daftar' && (
          <div className="ks-list">
            {shown.map((r) => (
              <button key={r.id} className="ks-row" onClick={() => setSel(r.id)}>
                <span><b>{r.id} <em className={'ks-pill ' + CLS[r.status]}>{LABEL[r.status]}</em></b><small>{r.status === 'occupied' && r.tenant !== '-' ? r.tenant : 'Lantai ' + floorOf(r)} · {rp(r.price)}</small></span>
                {flag(r) && <i className={'dot ' + flag(r)} />}
              </button>
            ))}
          </div>
        )}
      </section>

      <RoomSheet room={detail} busy={busy} onClose={() => setSel(null)} onSave={saveRoom} onRemove={removeRoom} />
      <AddRoom open={addOpen} onClose={() => setAddOpen(false)} rooms={k.rooms} defaultElec={k.settings.elecMode || 'meter'} onSave={async (r) => { if (await saveRoom(r, `Kamar ${r.id} ditambahkan.`)) setAddOpen(false); }} />
      <BulkAdd open={bulkOpen} onClose={() => setBulkOpen(false)} rooms={k.rooms} defaultElec={k.settings.elecMode || 'meter'} onSave={async (list) => {
        setBusy(true);
        try { await saveData('rooms', [...k.rooms, ...list]); toast(`${list.length} kamar ditambahkan.`); setBulkOpen(false); }
        catch (e) { toast(e instanceof Error ? e.message : 'Gagal menambah kamar.'); }
        setBusy(false);
      }} />
    </div>
  );
}

function RoomSheet({ room, busy, onClose, onSave, onRemove }: { room: Room | null; busy: boolean; onClose: () => void; onSave: (r: Room, m: string) => Promise<boolean>; onRemove: (r: Room) => void }) {
  const [price, setPrice] = useState('');
  useEffect(() => { setPrice(room ? String(room.price || '') : ''); }, [room?.id, room?.price]);
  if (!room) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const locked = room.status === 'occupied' && room.tenant !== '-';
  const set = (status: Room['status']) => void onSave({ ...room, status, tenant: status === 'available' || status === 'maintenance' ? '-' : room.tenant }, `Status ${room.id}: ${LABEL[status]}.`);
  return (
    <Sheet open onClose={onClose} title={`Kamar ${room.id}`}>
      <div className="ks-detail">
        <div className="ks-detail-top"><span className={'ks-pill ' + CLS[room.status]}>{LABEL[room.status]}</span><small>Lantai {floorOf(room)}</small></div>
        <div className="ks-kv"><span>Penghuni</span><b>{room.tenant && room.tenant !== '-' ? room.tenant : '—'}</b></div>
        <label className="ks-f"><b>Harga per bulan</b>
          <div className="ks-inline"><input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            <button className="ks-btn sm" disabled={busy || !(Number(price) > 0) || Number(price) === room.price} onClick={() => void onSave({ ...room, price: Number(price) }, 'Harga kamar diperbarui.')}>Simpan</button></div>
        </label>
        <label className="ks-f"><b>Listrik</b>
          <select value={room.elec || 'meter'} onChange={(e) => void onSave({ ...room, elec: e.target.value }, 'Pengaturan listrik diperbarui.')}>
            {ELEC_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="ks-check"><input type="checkbox" checked={room.listed !== false} onChange={(e) => void onSave({ ...room, listed: e.target.checked }, e.target.checked ? 'Tayang di KostIn saat kosong.' : 'Disembunyikan dari KostIn.')} /><span>Tayangkan di KostIn saat kamar kosong</span></label>

        {room.status === 'available' && <Link className="ks-btn block" href={'/kostpro/kamar/check-in?room=' + encodeURIComponent(room.id)}>Check-in penghuni</Link>}
        {locked ? (
          <>
            <Link className="ks-btn block" href="/kostpro/penghuni">Lihat penghuni</Link>
            <p className="ks-hint">Kamar terisi dikelola dari menu Penghuni agar data kamar, tagihan, dan keuangan tetap sinkron.</p>
          </>
        ) : (
          <>
            <b className="ks-sec">Ubah status</b>
            <div className="ks-seg full">
              {(['available', 'reserved', 'maintenance'] as const).map((st) => <button key={st} disabled={busy || room.status === st} className={room.status === st ? 'on' : ''} onClick={() => set(st)}>{LABEL[st]}</button>)}
            </div>
            {room.status === 'available' && <button className="ks-btn danger block" disabled={busy} onClick={() => onRemove(room)}><Trash2 size={18} /> Hapus kamar</button>}
          </>
        )}
      </div>
    </Sheet>
  );
}

function AddRoom({ open, onClose, rooms, defaultElec, onSave }: { open: boolean; onClose: () => void; rooms: Room[]; defaultElec: string; onSave: (r: Room) => void | Promise<void> }) {
  const [code, setCode] = useState('');
  const [floor, setFloor] = useState('1');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    const f = rooms.length ? Math.max(...rooms.map((r) => floorOf(r))) : 1;
    setFloor(String(f)); setPrice(String(rooms.length ? rooms[rooms.length - 1].price || '' : '')); setCode(''); setErr('');
  }, [open]);
  const submit = () => {
    const id = code.trim().toUpperCase();
    if (!id) return setErr('Nomor kamar wajib diisi.');
    if (rooms.some((r) => r.id.toUpperCase() === id)) return setErr('Nomor kamar sudah ada.');
    if (!(Number(price) >= 0)) return setErr('Harga tidak valid.');
    void onSave({ id, tenant: '-', price: Number(price) || 0, status: 'available', floor: normalizeFloor(floor), elec: defaultElec, listed: true });
  };
  return (
    <Sheet open={open} onClose={onClose} title="Tambah kamar">
      <label className="ks-f"><b>Nomor kamar</b><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="mis. A7" /></label>
      <div className="ks-2">
        <label className="ks-f"><b>Lantai</b><input type="number" min={1} value={floor} onChange={(e) => setFloor(e.target.value)} /></label>
        <label className="ks-f"><b>Harga per bulan</b><input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      </div>
      {err && <p className="ks-err">{err}</p>}
      <button className="ks-btn block" onClick={submit}>Simpan kamar</button>
    </Sheet>
  );
}

function BulkAdd({ open, onClose, rooms, defaultElec, onSave }: { open: boolean; onClose: () => void; rooms: Room[]; defaultElec: string; onSave: (l: Room[]) => void | Promise<void> }) {
  const [floors, setFloors] = useState('1');
  const [per, setPer] = useState('6');
  const [pattern, setPattern] = useState('letter');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  const startFloor = rooms.length ? Math.max(...rooms.map((r) => floorOf(r))) + 1 : 1;
  useEffect(() => { if (open) { setErr(''); setPrice(String(rooms.length ? rooms[rooms.length - 1].price || '' : '')); } }, [open]);
  const submit = () => {
    const f = Number(floors), p = Number(per);
    if (!Number.isInteger(f) || f < 1 || f > 20 || !Number.isInteger(p) || p < 1 || p > 50) return setErr('Lantai 1–20 dan kamar per lantai 1–50.');
    const seq = pattern === 'seq' || pattern === 'k' ? rooms.length + 1 : 1;
    const taken = new Set(rooms.map((r) => r.id.toUpperCase()));
    const list = genRoomIds(pattern, f, p, startFloor, seq);
    const clash = list.filter((x) => taken.has(x.id.toUpperCase()));
    if (clash.length) return setErr(`Nomor ${clash.slice(0, 3).map((c) => c.id).join(', ')} sudah dipakai. Ganti pola penomoran.`);
    if (rooms.length + list.length > 400) return setErr('Total kamar maksimal 400.');
    void onSave(list.map(({ id, floor }) => ({ id, floor, tenant: '-', price: Number(price) || 0, status: 'available' as const, elec: defaultElec, listed: true, since: addDaysISO(todayISO(), 0) })));
  };
  return (
    <Sheet open={open} onClose={onClose} title="Tambah banyak kamar">
      <p className="ks-hint">Kamar baru dimulai dari lantai {startFloor}.</p>
      <div className="ks-2">
        <label className="ks-f"><b>Jumlah lantai</b><input type="number" min={1} max={20} value={floors} onChange={(e) => setFloors(e.target.value)} /></label>
        <label className="ks-f"><b>Kamar per lantai</b><input type="number" min={1} max={50} value={per} onChange={(e) => setPer(e.target.value)} /></label>
      </div>
      <label className="ks-f"><b>Penomoran</b><select value={pattern} onChange={(e) => setPattern(e.target.value)}>{NUMBERING.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
      <label className="ks-f"><b>Harga per bulan</b><input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      {err && <p className="ks-err">{err}</p>}
      <button className="ks-btn block" onClick={submit}>Buat {(Number(floors) || 0) * (Number(per) || 0)} kamar</button>
    </Sheet>
  );
}
