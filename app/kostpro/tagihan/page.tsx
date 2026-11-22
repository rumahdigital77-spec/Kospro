'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, ReceiptText, Search, Zap } from 'lucide-react';
import { useKs, type Reading } from '@/lib/useKs';
import { saveData, type Payment, type Tenant, type Transaction } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';
import { Empty, PageHead, Sheet, Tabs } from '@/components/ks-ui';
import {
  dueDateOf, dueInMonth, greeting, monthKey, monthLabel, parseISO, parseMonthLabel, rp, shortDate, toast, todayISO, waLink, fmtRate, ID_MONTHS,
} from '@/lib/ks';

type Tab = 'daftar' | 'tunggakan' | 'meter';
const sameTenant = (p: Payment, t: Tenant) => (p.tenantId ? p.tenantId === t.id : p.tenant === t.name && p.room === t.room);

export default function TagihanPage() {
  const k = useKs(false);
  const [tab, setTab] = useState<Tab>('daftar');
  const [status, setStatus] = useState<'belum' | 'lunas' | 'semua'>('belum');
  const [month, setMonth] = useState('');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('tab');
    if (t === 'tunggakan' || t === 'meter') setTab(t);
    if (p.get('status') === 'lunas') setStatus('lunas');
    if (p.get('aksi') === 'bayar') setPick(true);
    if (p.get('aksi') === 'catat') setTab('meter');
    const id = p.get('id');
    if (id) { setPaying(id); if (p.get('baru') === '1') toast('Penghuni baru dibuat. Tagihan pertama siap dilunasi.'); }
  }, []);

  const today = todayISO();
  const unpaid = k.payments.filter((p) => p.status === 'unpaid');
  const overdue = unpaid.filter((p) => dueDateOf(p, k.tenants) < today);
  const overdueSum = overdue.reduce((s, p) => s + p.amount, 0);
  const months = useMemo(() => Array.from(new Set(k.payments.map((p) => p.month))).sort((a, b) => (parseMonthLabel(b)?.getTime() || 0) - (parseMonthLabel(a)?.getTime() || 0)), [k.payments]);
  const s = q.trim().toLowerCase();
  const list = k.payments
    .filter((p) => (status === 'semua' ? true : status === 'belum' ? p.status === 'unpaid' : p.status === 'paid') && (!month || p.month === month)
      && (!s || [p.tenant, p.room, p.month, p.receiptNo, p.note].some((v) => String(v || '').toLowerCase().includes(s))))
    .sort((a, b) => dueDateOf(a, k.tenants).localeCompare(dueDateOf(b, k.tenants)));

  const phoneOf = (p: Payment) => k.tenants.find((t) => sameTenant(p, t))?.phone;
  const remind = (p: Payment) => {
    const msg = `Halo ${p.tenant}, selamat ${greeting()}. Kami ingin mengingatkan dengan santun bahwa tagihan kamar ${p.room} (${p.note || p.month}) sebesar ${rp(p.amount)} belum kami terima. Jika ada kendala, silakan kabari kami agar bisa dibicarakan bersama. Terima kasih 🙏${k.settings.name ? ' — ' + k.settings.name : ''}${k.settings.bank ? '\nPembayaran: ' + k.settings.bank : ''}`;
    window.open(waLink(phoneOf(p), msg), '_blank');
  };

  const byTenant = useMemo(() => {
    const m = new Map<string, { name: string; room: string; items: Payment[] }>();
    overdue.forEach((p) => { const key = p.tenantId || p.tenant + p.room; const e = m.get(key) || { name: p.tenant, room: p.room, items: [] }; e.items.push(p); m.set(key, e); });
    return Array.from(m.values());
  }, [overdue]);

  const payingItem = paying ? k.payments.find((p) => p.id === paying) || null : null;

  return (
    <div className="ks-page">
      <PageHead title="Tagihan" sub={`${unpaid.length} belum lunas · tunggakan ${rp(overdueSum)}`}>
        <button className="ks-btn ghost" onClick={() => setManualOpen(true)}><Plus size={20} /> Manual</button>
        <button className="ks-btn" onClick={() => setIssueOpen(true)}><ReceiptText size={20} /> Terbitkan</button>
      </PageHead>

      <section className="ks-card">
        <Tabs<Tab> value={tab} onChange={setTab} items={[{ id: 'daftar', label: 'Daftar tagihan' }, { id: 'tunggakan', label: 'Tunggakan', n: overdue.length }, { id: 'meter', label: 'Catat meter' }]} />

        {tab === 'daftar' && (
          <>
            <label className="ks-search-f"><Search size={22} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kamar, no. tagihan…" /></label>
            <div className="ks-2">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="belum">Belum lunas</option><option value="lunas">Lunas</option><option value="semua">Semua status</option></select>
              <select value={month} onChange={(e) => setMonth(e.target.value)}><option value="">Semua bulan</option>{months.map((m) => <option key={m}>{m}</option>)}</select>
            </div>
            {!list.length ? (
              <Empty icon={<ReceiptText size={56} strokeWidth={1.5} />} title="Tidak ada tagihan" text="Semua tagihan sudah lunas. Tagihan siklus baru diterbitkan lewat tombol Terbitkan." />
            ) : (
              <div className="ks-list">
                {list.map((p) => {
                  const due = dueDateOf(p, k.tenants);
                  const late = p.status === 'unpaid' && due < today;
                  return (
                    <div key={p.id} className="ks-bill">
                      <div className="ks-bill-top"><span><b>{p.tenant}</b><small>Kamar {p.room} · {p.note || p.month}</small></span><strong>{rp(p.amount)}</strong></div>
                      <div className="ks-bill-meta">
                        <em className={'ks-pill ' + (p.status === 'paid' ? 'terisi' : late ? 'bad' : 'dipesan')}>{p.status === 'paid' ? 'Lunas' : late ? 'Menunggak' : 'Belum bayar'}</em>
                        <small>{p.status === 'paid' ? `Dibayar ${shortDate(p.paidAt)}` : `Jatuh tempo ${shortDate(due)}`}</small>
                      </div>
                      <div className="ks-bill-act">
                        {p.status === 'unpaid' ? (<>
                          <button className="ks-btn sm" onClick={() => setPaying(p.id)}>Terima bayar</button>
                          <button className="ks-btn sm ghost" onClick={() => remind(p)}>Ingatkan</button>
                        </>) : <Link className="ks-btn sm ghost" href={'/kostpro/kwitansi?id=' + encodeURIComponent(p.id)}>Kwitansi</Link>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'tunggakan' && (
          !byTenant.length ? <Empty icon={<ReceiptText size={56} strokeWidth={1.5} />} title="Tidak ada tunggakan" text="Semua penghuni membayar tepat waktu." /> : (
            <div className="ks-list">
              {byTenant.map((g) => (
                <div key={g.name + g.room} className="ks-bill">
                  <div className="ks-bill-top"><span><b>{g.name}</b><small>Kamar {g.room} · {g.items.length} tagihan</small></span><strong className="bad">{rp(g.items.reduce((a, p) => a + p.amount, 0))}</strong></div>
                  <small>Tertua jatuh tempo {shortDate(g.items.map((p) => dueDateOf(p, k.tenants)).sort()[0])}</small>
                  <div className="ks-bill-act">
                    <button className="ks-btn sm" onClick={() => setPaying(g.items[0].id)}>Terima bayar</button>
                    <button className="ks-btn sm ghost" onClick={() => remind({ ...g.items[0], amount: g.items.reduce((a, p) => a + p.amount, 0), note: `${g.items.length} tagihan` })}>Ingatkan</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'meter' && <MeterTab k={k} />}
      </section>

      <Sheet open={pick} onClose={() => setPick(false)} title="Terima bayar">
        {!unpaid.length ? <p className="ks-muted pad">Tidak ada tagihan yang belum lunas.</p> : (
          <div className="ks-list">{unpaid.map((p) => <button key={p.id} className="ks-row" onClick={() => { setPick(false); setPaying(p.id); }}><span><b>{p.tenant} · {p.room}</b><small>{p.note || p.month}</small></span><strong>{rp(p.amount)}</strong></button>)}</div>
        )}
      </Sheet>

      {payingItem && <PaySheet p={payingItem} k={k} busy={busy} setBusy={setBusy} onClose={() => setPaying(null)} />}
      <IssueSheet open={issueOpen} onClose={() => setIssueOpen(false)} k={k} />
      <ManualSheet open={manualOpen} onClose={() => setManualOpen(false)} k={k} />
    </div>
  );
}

function PaySheet({ p, k, busy, setBusy, onClose }: { p: Payment; k: ReturnType<typeof useKs>; busy: boolean; setBusy: (b: boolean) => void; onClose: () => void }) {
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState('transfer');
  const [gift, setGift] = useState(true);
  const due = dueDateOf(p, k.tenants);
  const eligible = !!k.settings.reward && paidAt <= due && p.kind !== 'listrik';
  const amt = k.settings.rewardAmount || 25000;

  const submit = async () => {
    if (!paidAt) return toast('Tanggal pembayaran wajib diisi.');
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc('post_payment_transaction_v2', { p_payment_id: p.id, p_paid_at: paidAt, p_method: method });
      if (error) throw new Error(error.message || 'Gagal memposting pembayaran.');
      const receiptNo = String((data as any)?.receipt_no || p.receiptNo || '');
      const paid: Payment = { ...p, status: 'paid', paidAt, method, receiptNo };
      const nextPay = k.payments.map((x) => (x.id === p.id ? paid : x));
      const hist = [...k.paymentHistory.filter((x) => x.id !== p.id), paid];
      const tx: Transaction[] = k.transactions.some((x) => x.referenceId === p.id) ? k.transactions : [...k.transactions, {
        id: 'TR-' + Date.now(), date: paidAt, description: `POSTING KAMAR — ${p.room} — ${p.tenant} — ${p.month} — ${method.toUpperCase()}`, category: 'Pendapatan Kamar',
        amount: p.amount, type: 'income', referenceId: p.id, debitAccount: method === 'cash' ? 'Kas' : method === 'transfer' ? 'Bank' : 'QRIS', creditAccount: 'Pendapatan Sewa Kamar', accountingBasis: 'cash',
      }];
      const withGift = eligible && gift ? [...tx, { id: 'TR-AP-' + Date.now(), date: paidAt, description: `Apresiasi tepat waktu — ${p.tenant} (${p.room})`, category: 'Apresiasi Penghuni', amount: amt, type: 'expense' as const, referenceId: 'AP-' + p.id, accountingBasis: 'cash' as const }] : tx;
      await saveData('payments', nextPay);
      await saveData('paymentHistory', hist);
      await saveData('transactions', withGift);
      toast('Pembayaran dicatat. Membuka kwitansi…');
      location.href = '/kostpro/kwitansi?id=' + encodeURIComponent(p.id);
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran.'); setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title="Terima bayar">
      <div className="ks-kv"><span>{p.tenant} · Kamar {p.room}</span><b>{rp(p.amount)}</b></div>
      <p className="ks-hint">{p.note || p.month} · jatuh tempo {shortDate(due)}. Nominal harus sama dengan total tagihan.</p>
      <div className="ks-2">
        <label className="ks-f"><b>Tanggal bayar</b><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></label>
        <label className="ks-f"><b>Metode</b><select value={method} onChange={(e) => setMethod(e.target.value)}><option value="transfer">Transfer</option><option value="cash">Cash</option><option value="qris">QRIS</option></select></label>
      </div>
      {eligible && <label className="ks-check"><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /><span>Tepat waktu — catat apresiasi {rp(amt)} (tercatat sebagai pengeluaran)</span></label>}
      <button className="ks-btn block" disabled={busy} onClick={() => void submit()}>{busy ? 'Menyimpan…' : 'Simpan & buat kwitansi'}</button>
    </Sheet>
  );
}

function IssueSheet({ open, onClose, k }: { open: boolean; onClose: () => void; k: ReturnType<typeof useKs> }) {
  const [ym, setYm] = useState(monthKey(new Date()));
  const [busy, setBusy] = useState(false);
  const [y, m] = ym.split('-').map(Number);
  const label = `${ID_MONTHS[(m || 1) - 1]} ${y}`;
  const all = [...k.payments, ...k.paymentHistory];
  const todo = k.tenants.filter((t) => {
    if (monthKey(parseISO(t.startDate)) > ym) return false;
    if (t.endDate && monthKey(parseISO(t.endDate)) < ym) return false;
    return !all.some((p) => sameTenant(p, t) && p.month === label && p.kind !== 'listrik' && p.kind !== 'manual');
  });
  const total = todo.reduce((s, t) => s + t.rent, 0);
  const go = async () => {
    setBusy(true);
    try {
      const stamp = Date.now();
      const add: Payment[] = todo.map((t, i) => ({ id: `P-${stamp}-${i}`, tenantId: t.id, tenant: t.name, room: t.room, month: label, amount: t.rent, status: 'unpaid', dueDate: dueInMonth(t.startDate, y, m - 1), kind: 'sewa' }));
      await saveData('payments', [...k.payments, ...add]);
      toast(`${add.length} tagihan ${label} diterbitkan.`); onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal menerbitkan tagihan.'); }
    setBusy(false);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Terbitkan tagihan">
      <label className="ks-f"><b>Periode</b><input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></label>
      <div className="ks-note"><ReceiptText size={20} /><span>{todo.length ? <>Akan dibuat <b>{todo.length}</b> tagihan sewa {label} senilai <b>{rp(total)}</b>. Penghuni yang sudah punya tagihan bulan ini dilewati.</> : <>Tidak ada tagihan baru untuk {label}. Semua penghuni aktif sudah ditagih.</>}</span></div>
      <button className="ks-btn block" disabled={busy || !todo.length} onClick={() => void go()}>{busy ? 'Menerbitkan…' : 'Terbitkan sekarang'}</button>
    </Sheet>
  );
}

function ManualSheet({ open, onClose, k }: { open: boolean; onClose: () => void; k: ReturnType<typeof useKs> }) {
  const [tid, setTid] = useState('');
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [due, setDue] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTid(k.tenants[0]?.id || ''); setDesc(''); setAmt(''); setDue(todayISO()); } }, [open]);
  const go = async () => {
    const t = k.tenants.find((x) => x.id === tid);
    if (!t) return toast('Pilih penghuni.');
    if (!desc.trim()) return toast('Isi keterangan tagihan.');
    if (!(Number(amt) > 0)) return toast('Nominal harus lebih dari 0.');
    setBusy(true);
    try {
      const p: Payment = { id: 'P-' + Date.now(), tenantId: t.id, tenant: t.name, room: t.room, month: monthLabel(parseISO(due)), amount: Math.round(Number(amt)), status: 'unpaid', dueDate: due, kind: 'manual', note: desc.trim() };
      await saveData('payments', [...k.payments, p]);
      toast('Tagihan manual dibuat.'); onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal membuat tagihan.'); }
    setBusy(false);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Tagihan manual">
      {!k.tenants.length ? <p className="ks-muted pad">Belum ada penghuni aktif.</p> : (<>
        <label className="ks-f"><b>Penghuni</b><select value={tid} onChange={(e) => setTid(e.target.value)}>{k.tenants.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.room}</option>)}</select></label>
        <label className="ks-f"><b>Keterangan</b><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="mis. Laundry, Air, Kunci hilang" /></label>
        <div className="ks-2">
          <label className="ks-f"><b>Nominal</b><input type="number" min={0} value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
          <label className="ks-f"><b>Jatuh tempo</b><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        </div>
        <button className="ks-btn block" disabled={busy} onClick={() => void go()}>Buat tagihan</button>
      </>)}
    </Sheet>
  );
}

function MeterTab({ k }: { k: ReturnType<typeof useKs> }) {
  const ym = monthKey(new Date());
  const rate = k.settings.elecTariff || 0;
  const rows = k.rooms.filter((r) => r.status === 'occupied' && (r.elec || 'meter') === 'meter' && k.tenants.some((t) => t.room === r.id));
  const [vals, setVals] = useState<Record<string, { start: string; end: string }>>({});
  const [busy, setBusy] = useState('');
  const last = (id: string) => (k.meters[id] || []).slice().sort((a, b) => a.month.localeCompare(b.month)).filter((x) => x.month < ym).pop();
  const done = (id: string) => (k.meters[id] || []).find((x) => x.month === ym);

  const save = async (roomId: string) => {
    const t = k.tenants.find((x) => x.room === roomId);
    const v = vals[roomId] || { start: '', end: '' };
    const start = v.start !== '' ? Number(v.start) : last(roomId)?.end ?? 0;
    const end = Number(v.end);
    if (!t) return toast('Penghuni tidak ditemukan.');
    if (v.end === '' || !Number.isFinite(end) || end < start) return toast('Angka akhir harus ≥ angka awal.');
    if (!(rate > 0)) return toast('Atur tarif listrik di Pengaturan terlebih dahulu.');
    setBusy(roomId);
    try {
      const kwh = Math.round((end - start) * 100) / 100;
      const cost = Math.round(kwh * rate);
      const pid = `P-LS-${Date.now()}-${roomId}`;
      const reading: Reading = { month: ym, start, end, kwh, tariff: rate, cost, paymentId: cost > 0 ? pid : undefined };
      const meters = { ...k.meters, [roomId]: [...(k.meters[roomId] || []), reading] };
      let payments = k.payments;
      if (cost > 0) {
        const d = new Date();
        payments = [...payments, { id: pid, tenantId: t.id, tenant: t.name, room: roomId, month: monthLabel(d), amount: cost, status: 'unpaid', dueDate: todayISO(), kind: 'listrik', note: `Listrik ${kwh} kWh` }];
      }
      await saveData('meters', meters);
      if (cost > 0) await saveData('payments', payments);
      toast(`Listrik ${roomId}: ${kwh} kWh = ${rp(cost)}${cost > 0 ? ' — tagihan dibuat.' : ''}`);
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal menyimpan meter.'); }
    setBusy('');
  };

  if (!rows.length) return <Empty icon={<Zap size={56} strokeWidth={1.5} />} title="Belum ada kamar bermeteran" text="Kamar terisi dengan listrik “Meteran per kamar” akan muncul di sini." />;
  return (
    <>
      <p className="ks-hint">Tarif {rate ? `Rp ${fmtRate(rate)}/kWh` : 'belum diatur (lihat Pengaturan)'}. Catat angka meter akhir bulan; tagihan listrik dibuat otomatis.</p>
      <div className="ks-list">
        {rows.map((r) => {
          const d = done(r.id);
          const prev = last(r.id)?.end;
          const v = vals[r.id] || { start: '', end: '' };
          return (
            <div key={r.id} className="ks-bill">
              <div className="ks-bill-top"><span><b>Kamar {r.id}</b><small>{r.tenant}</small></span>{d && <strong>{rp(d.cost)}</strong>}</div>
              {d ? <small>Tercatat bulan ini: {d.start} → {d.end} = {d.kwh} kWh</small> : (
                <div className="ks-2">
                  <label className="ks-f"><b>Awal{prev !== undefined ? ' (bulan lalu)' : ''}</b><input type="number" inputMode="decimal" placeholder={String(prev ?? 0)} value={v.start} onChange={(e) => setVals({ ...vals, [r.id]: { ...v, start: e.target.value } })} /></label>
                  <label className="ks-f"><b>Akhir</b><input type="number" inputMode="decimal" value={v.end} onChange={(e) => setVals({ ...vals, [r.id]: { ...v, end: e.target.value } })} /></label>
                </div>
              )}
              {!d && <div className="ks-bill-act"><button className="ks-btn sm" disabled={busy === r.id} onClick={() => void save(r.id)}>Simpan &amp; tagihkan</button></div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
