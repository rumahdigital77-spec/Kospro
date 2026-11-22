'use client';
import { useEffect, useState } from 'react';
import { loadData, type Room, type Tenant, type Payment, type Transaction } from './store';
import { refreshRoomsFromServer, type Settings } from './ks';

export type Reading = { month: string; start: number; end: number; kwh: number; tariff: number; cost: number; paymentId?: string };
export type KsData = {
  ready: boolean; rooms: Room[]; tenants: Tenant[]; payments: Payment[]; paymentHistory: Payment[];
  tenantHistory: Tenant[]; transactions: Transaction[]; settings: Settings; meters: Record<string, Reading[]>;
};
const empty: KsData = { ready: false, rooms: [], tenants: [], payments: [], paymentHistory: [], tenantHistory: [], transactions: [], settings: {}, meters: {} };

const read = (): KsData => ({
  ready: true,
  rooms: loadData<Room[]>('rooms', []),
  tenants: loadData<Tenant[]>('tenants', []).filter((x) => (x.status || 'active') === 'active'),
  payments: loadData<Payment[]>('payments', []),
  paymentHistory: loadData<Payment[]>('paymentHistory', []),
  tenantHistory: loadData<Tenant[]>('tenantHistory', []),
  transactions: loadData<Transaction[]>('transactions', []),
  settings: loadData<Settings>('settings', {}),
  meters: loadData<Record<string, Reading[]>>('meters', {}),
});

// Membaca data lokal (yang disinkronkan ke database) dan menyegarkan status kamar dari server tiap 5 detik,
// sehingga booking dari KostIn langsung tampil di KostPro.
export function useKs(poll = true): KsData {
  const [d, setD] = useState<KsData>(empty);
  useEffect(() => {
    const load = () => setD(read());
    load();
    const evs = ['kostpro:data-saved', 'kostpro:data-scope-changed', 'kostpro:rooms-synced'];
    evs.forEach((e) => window.addEventListener(e, load));
    let iv = 0;
    const tick = () => { if (!document.hidden) void refreshRoomsFromServer(); };
    if (poll) { tick(); iv = window.setInterval(tick, 5000); }
    document.addEventListener('visibilitychange', tick);
    return () => { evs.forEach((e) => window.removeEventListener(e, load)); window.clearInterval(iv); document.removeEventListener('visibilitychange', tick); };
  }, [poll]);
  return d;
}
