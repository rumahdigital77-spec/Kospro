// Data contoh (fiktif) untuk fitur "Coba dulu". Hanya dipakai di server dan tidak pernah tampil di KostIn.
import { addDaysISO, addMonthsISO, dueInMonth, isoOf, monthLabel, parseISO } from './dates';
import type { RoomRow } from './rooms';

const NAMES = ['Andi Pratama', 'Siti Rahma', 'Budi Santoso', 'Dewi Lestari', 'Rizky Maulana', 'Putri Ayu', 'Fajar Nugroho', 'Nadia Safitri', 'Bagas Wicaksono', 'Intan Permata', 'Rendra Saputra', 'Lina Marlina'];
const JOBS = ['Mahasiswa UGM', 'Karyawan swasta', 'Mahasiswa UNY', 'Perawat', 'Karyawan swasta', 'Mahasiswa UII', 'Guru', 'Mahasiswa UGM', 'Freelancer', 'Mahasiswa UNY', 'Karyawan bank', 'Apoteker'];
const OCCUPIED = [0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 14];
const PRICES = [650000, 700000, 700000, 750000, 750000, 800000, 800000, 850000, 850000];

export function buildDemo(now = new Date()) {
  const today = isoOf(now);
  const rooms: RoomRow[] = [];
  const tenants: any[] = [];
  const payments: any[] = [];
  const paymentHistory: any[] = [];
  const tenantHistory: any[] = [];
  const transactions: any[] = [];
  let pc = 1;
  const pay = (t: any, due: string, paid: boolean, paidAt?: string) => {
    const id = 'DM-P' + String(pc++).padStart(3, '0');
    const method = ['transfer', 'cash', 'qris'][pc % 3];
    const p: any = { id, tenantId: t.id, tenant: t.name, room: t.room, month: monthLabel(parseISO(due)), amount: t.rent, status: paid ? 'paid' : 'unpaid', dueDate: due, kind: 'sewa' };
    if (paid && paidAt) {
      p.paidAt = paidAt; p.method = method; p.receiptNo = 'KW-' + paidAt.replaceAll('-', '') + '-D' + String(pc).padStart(3, '0');
      transactions.push({ id: 'DM-TR' + id, date: paidAt, description: 'POSTING KAMAR — ' + t.room + ' — ' + t.name + ' — ' + p.month + ' — ' + method.toUpperCase(), category: 'Pendapatan Kamar', amount: t.rent, type: 'income', referenceId: id, debitAccount: method === 'cash' ? 'Kas' : method === 'transfer' ? 'Bank' : 'QRIS', creditAccount: 'Pendapatan Sewa Kamar', accountingBasis: 'cash' });
    }
    return p;
  };

  for (let i = 0; i < 18; i++) {
    const floor = i < 9 ? 1 : 2;
    const n = (i % 9) + 1;
    const id = (floor === 1 ? 'A' : 'B') + n;
    const price = PRICES[n - 1] + (floor - 1) * 50000;
    const k = OCCUPIED.indexOf(i);
    const room: RoomRow = { id, tenant: '-', price, status: 'available', floor, elec: 'meter', listed: true, since: addDaysISO(today, -((i % 9) + 1)), updated_at: now.toISOString() };
    if (i === 15) room.status = 'reserved';
    else if (i === 17) room.status = 'maintenance';
    if (k >= 0) {
      const start = addDaysISO(today, -(15 + k * 13));
      const t: any = { id: 'DM-T' + String(k + 1).padStart(2, '0'), name: NAMES[k], room: id, phone: '08120000' + String(1000 + k), startDate: start, endDate: k === 3 ? addDaysISO(today, 12) : k === 8 ? addDaysISO(today, 25) : addMonthsISO(start, 12), rent: price, status: 'active', occupation: JOBS[k] };
      tenants.push(t);
      room.status = 'occupied'; room.tenant = t.name; room.since = start;
      const s = parseISO(start);
      let y = s.getFullYear(), m = s.getMonth();
      const cy = now.getFullYear(), cm = now.getMonth();
      while (y < cy || (y === cy && m <= cm)) {
        const due = dueInMonth(start, y, m);
        const isCurrent = y === cy && m === cm;
        const prevMonth = (y === cy && m === cm - 1) || (cm === 0 && y === cy - 1 && m === 11);
        let paid = true;
        if (isCurrent) paid = k % 3 === 0;
        else if (prevMonth && (k === 1 || k === 5)) paid = false;
        const paidAt = paid ? (due > today ? today : due) : undefined;
        if (!(isCurrent && due > addDaysISO(today, 20))) payments.push(pay(t, due, paid, paidAt));
        m++; if (m > 11) { m = 0; y++; }
      }
    }
    rooms.push(room);
  }

  // Dua penghuni lama (riwayat)
  for (let h = 0; h < 2; h++) {
    const start = addMonthsISO(today, -(5 + h)); const end = addDaysISO(today, -(20 + h * 15));
    const t: any = { id: 'DM-H' + (h + 1), name: ['Hendra Wijaya', 'Maya Kusuma'][h], room: ['A8', 'B2'][h], phone: '08120000' + (2000 + h), startDate: start, endDate: end, rent: 700000, status: 'history', checkoutReason: 'checkout', occupation: 'Karyawan swasta' };
    tenantHistory.push(t);
    paymentHistory.push(pay(t, start, true, start));
  }

  const exp = (d: number, desc: string, cat: string, amt: number) => transactions.push({ id: 'DM-EX' + transactions.length, date: addDaysISO(today, -d), description: desc, category: cat, amount: amt, type: 'expense', debitAccount: cat, creditAccount: 'Kas', accountingBasis: 'cash' });
  exp(3, 'Listrik & air bulanan', 'Operasional', 850000);
  exp(9, 'Kebersihan & sampah', 'Operasional', 300000);
  exp(14, 'Perbaikan keran kamar B9', 'Perawatan', 150000);
  exp(22, 'Internet / WiFi', 'Operasional', 400000);
  exp(30, 'Gaji penjaga kost', 'Gaji', 1200000);

  const settings = {
    name: 'Kos Contoh Melati', ownerName: 'Pemilik Contoh', manager: 'Pemilik Contoh', phone: '081200000000', city: 'Sleman',
    bank: 'BSI 7123xxxx a.n. Contoh', address: 'Jl. Contoh No. 1, Sleman (data fiktif)', propertyType: 'Kos-kosan', target: 'Campur',
    elecTariff: 1444.7, elecTariffLabel: 'R-1/1.300–2.200 VA', elecMode: 'meter', theme: 'teal', mode: 'auto', reward: false, rewardAmount: 25000,
    currency: 'IDR', receiptPrefix: 'KW', receiptNext: 1, demo: true, onboarded: true,
  };
  return { rooms, tenants, payments, paymentHistory, tenantHistory, transactions, settings };
}
