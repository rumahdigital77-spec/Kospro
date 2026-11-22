'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { saveData, type Payment, type Transaction } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';
import { monthLabel, parseISO, refreshAllFromServer, rp, toast } from '@/lib/ks';

const same = (p: Payment, t: { id: string; name: string; room: string }) => (p.tenantId ? p.tenantId === t.id : p.tenant === t.name && p.room === t.room);

// Pemeriksaan alur: Booking → C.I. → Occupied → Tagihan → Pembayaran → Keuangan/Laporan.
export default function SyncAudit() {
  const k = useKs(false);
  const [open, setOpen] = useState<{ room_id: string; status: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void createClient().rpc('get_kostin_bookings_for_owner').then(({ data }) => { if (Array.isArray(data)) setOpen(data); });
  }, []);
  if (!k.ready) return null;

  const allPay = [...k.payments, ...k.paymentHistory.filter((h) => !k.payments.some((p) => p.id === h.id))];
  const occNoTenant = k.rooms.filter((r) => r.status === 'occupied' && !k.tenants.some((t) => t.room === r.id));
  const tenantNotOcc = k.tenants.filter((t) => k.rooms.find((r) => r.id === t.room)?.status !== 'occupied');
  const noBill = k.tenants.filter((t) => !allPay.some((p) => same(p, t)));
  const paidNoIncome = allPay.filter((p) => p.status === 'paid' && !k.transactions.some((x) => x.referenceId === p.id));
  const resNoBooking = open === null ? [] : k.rooms.filter((r) => r.status === 'reserved' && !open.some((b) => b.room_id === r.id && (b.status === 'PENDING' || b.status === 'CONFIRMED')));
  const issues = occNoTenant.length + tenantNotOcc.length + noBill.length + paidNoIncome.length + resNoBooking.length;
  const paidSum = allPay.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const incomeSum = k.transactions.filter((x) => x.type === 'income' && allPay.some((p) => p.id === x.referenceId)).reduce((s, x) => s + x.amount, 0);

  const fix = async () => {
    setBusy(true);
    try {
      await refreshAllFromServer();
      const rooms = k.rooms.map((r) => {
        if (occNoTenant.some((x) => x.id === r.id) || resNoBooking.some((x) => x.id === r.id)) return { ...r, status: 'available' as const, tenant: '-' };
        const t = tenantNotOcc.find((x) => x.room === r.id);
        return t ? { ...r, status: 'occupied' as const, tenant: t.name } : r;
      });
      const stamp = Date.now();
      const bills: Payment[] = noBill.map((t, i) => ({ id: `P-${stamp}-F${i}`, tenantId: t.id, tenant: t.name, room: t.room, month: monthLabel(parseISO(t.startDate)), amount: t.rent, status: 'unpaid', dueDate: t.startDate, kind: 'sewa' }));
      const tx: Transaction[] = paidNoIncome.map((p, i) => ({
        id: `TR-${stamp}-F${i}`, date: p.paidAt || new Date().toISOString().slice(0, 10), description: `POSTING KAMAR — ${p.room} — ${p.tenant} — ${p.note || p.month}`, category: 'Pendapatan Kamar',
        amount: p.amount, type: 'income', referenceId: p.id, debitAccount: p.method === 'cash' ? 'Kas' : 'Bank', creditAccount: 'Pendapatan Sewa Kamar', accountingBasis: 'cash',
      }));
      if (occNoTenant.length || tenantNotOcc.length || resNoBooking.length) await saveData('rooms', rooms);
      if (bills.length) await saveData('payments', [...k.payments, ...bills]);
      if (tx.length) await saveData('transactions', [...k.transactions, ...tx]);
      toast('Data diperbaiki dan disinkronkan.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal memperbaiki data.'); }
    setBusy(false);
  };

  const rows: [number, string][] = [
    [occNoTenant.length, 'Kamar berstatus Terisi tetapi tidak ada penghuni aktif'],
    [tenantNotOcc.length, 'Penghuni aktif tetapi kamarnya belum berstatus Terisi'],
    [noBill.length, 'Penghuni aktif yang belum punya tagihan sama sekali'],
    [paidNoIncome.length, 'Pembayaran lunas yang belum tercatat sebagai pendapatan'],
    [resNoBooking.length, 'Kamar berstatus Dipesan tanpa booking yang berjalan'],
  ];

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="section-title">Pemeriksaan sinkronisasi alur</div>
      <div className="sub" style={{ marginBottom: 12 }}>Booking → C.I. → Terisi → Tagihan → Lunas → Keuangan &amp; Laporan.</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(([n, l]) => (
          <div key={l} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            {n ? <AlertTriangle size={16} color="#c2570c" /> : <CheckCircle2 size={16} color="#15803d" />}
            <span style={{ flex: 1 }}>{l}</span><b>{n}</b>
          </div>
        ))}
      </div>
      <div className="sub" style={{ marginTop: 12 }}>Pembayaran lunas {rp(paidSum)} · tercatat di pendapatan {rp(incomeSum)}{paidSum === incomeSum ? ' (cocok)' : ' (selisih ' + rp(paidSum - incomeSum) + ')'}</div>
      {issues > 0 && <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={() => void fix()}>{busy ? 'Memperbaiki…' : `Perbaiki ${issues} masalah`}</button>}
      {issues === 0 && <div className="sub" style={{ marginTop: 8, color: '#15803d' }}>Semua data sinkron.</div>}
    </div>
  );
}
