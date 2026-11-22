// Helper UI KostPro (gaya KosKu): tema, penomoran kamar, format, cadangan data, sinkron kamar.
import { loadData, saveData, type Room, type Tenant, type Payment } from './store';
import { addMonthsISO, dueInMonth, parseISO, parseMonthLabel, todayISO, daysBetween } from './dates';
export * from './dates';

export type Settings = {
  name?: string; ownerName?: string; manager?: string; phone?: string; city?: string; bank?: string; address?: string;
  propertyType?: string; target?: string; elecTariff?: number; elecTariffLabel?: string; elecMode?: string;
  theme?: string; mode?: 'auto' | 'light' | 'dark'; reward?: boolean; rewardAmount?: number;
  lastBackupAt?: string; onboarded?: boolean; demo?: boolean; currency?: string; logo?: string; signature?: string;
  receiptPrefix?: string; receiptNext?: number; availableRooms?: number;
};

export const THEMES = [
  { id: 'teal', name: 'Teal', c: '#0f766e' }, { id: 'blue', name: 'Biru', c: '#2563eb' },
  { id: 'green', name: 'Hijau', c: '#15803d' }, { id: 'purple', name: 'Ungu', c: '#7c3aed' },
  { id: 'rose', name: 'Mawar', c: '#be3a5a' }, { id: 'bronze', name: 'Perunggu', c: '#a56a43' },
  { id: 'slate', name: 'Abu', c: '#475f7f' }, { id: 'coral', name: 'Koral', c: '#e2574c' },
];

export const PROPERTY_TYPES = ['Kos-kosan', 'Kontrakan', 'Homestay'];
export const TARGETS = ['Campur', 'Putra', 'Putri'];
export const NUMBERING = [
  { id: 'letter', label: 'A1, A2... (huruf per lantai)' },
  { id: 'hundreds', label: '101, 102... (nomor per lantai)' },
  { id: 'seq', label: '1, 2, 3... (berurutan)' },
  { id: 'k', label: 'K-01, K-02... (berurutan)' },
];
export const ELEC_MODES = [
  { id: 'meter', label: 'Meteran per kamar', tile: 'meter' },
  { id: 'included', label: 'Termasuk di harga sewa', tile: 'termasuk' },
  { id: 'token', label: 'Token / bayar sendiri', tile: 'token' },
];
export const ELEC_TARIFFS = [
  { id: 'r1-900', label: 'R-1/900 VA-RTM', rate: 1352 },
  { id: 'r1-1300', label: 'R-1/1.300–2.200 VA', rate: 1444.7 },
  { id: 'r2', label: 'R-2/3.500–5.500 VA', rate: 1699.53 },
  { id: 'r3', label: 'R-3/6.600 VA ke atas', rate: 1699.53 },
  { id: 'custom', label: 'Tarif khusus (isi sendiri)', rate: 0 },
];
export const fmtRate = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const elecTile = (e?: string) => ELEC_MODES.find((x) => x.id === e)?.tile || 'meter';

export function genRoomIds(pattern: string, floors: number, perFloor: number, startFloor = 1, startSeq = 1) {
  const out: { id: string; floor: number }[] = [];
  let seq = startSeq;
  for (let f = 0; f < floors; f++) {
    const fl = startFloor + f;
    for (let n = 1; n <= perFloor; n++) {
      let id: string;
      if (pattern === 'letter') id = String.fromCharCode(65 + ((fl - 1) % 26)) + n;
      else if (pattern === 'hundreds') id = String(fl * 100 + n);
      else if (pattern === 'k') id = 'K-' + String(seq++).padStart(2, '0');
      else id = String(seq++);
      out.push({ id, floor: fl });
    }
  }
  return out;
}

export function floorOf(r: { id: string; floor?: number }): number {
  if (typeof r.floor === 'number' && r.floor > 0) return r.floor;
  const l = /^([A-Za-z])\d+$/.exec(r.id);
  if (l) return l[1].toUpperCase().charCodeAt(0) - 64;
  const h = /^(\d)\d{2,}$/.exec(r.id);
  if (h) return Number(h[1]);
  return 1;
}
export const byRoom = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, 'id', { numeric: true });
export const sortRooms = <T extends { id: string; floor?: number }>(rooms: T[]) =>
  rooms.slice().sort((a, b) => floorOf(a) - floorOf(b) || byRoom(a, b));

export const shortRp = (n: number) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (v >= 1000) return Math.round(v / 1000) + ' rb';
  return String(v);
};
export const rp = (n: number) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

export const waLink = (phone: string | undefined, text: string) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
};

export const effectiveEnd = (t: Tenant) => t.endDate || addMonthsISO(t.startDate, 1);

export function dueDateOf(p: Payment, tenants: Tenant[]): string {
  if (p.dueDate) return p.dueDate;
  const m = parseMonthLabel(p.month);
  if (!m) return todayISO();
  const t = tenants.find((x) => (p.tenantId && x.id === p.tenantId) || (x.name === p.tenant && x.room === p.room));
  return dueInMonth(t?.startDate || todayISO().slice(0, 8) + '01', m.getFullYear(), m.getMonth());
}

export const vacantDays = (r: Room) => {
  const s = r.since || (r.updated_at ? r.updated_at.slice(0, 10) : todayISO());
  return Math.max(0, daysBetween(s.slice(0, 10), todayISO()));
};

export const toast = (msg: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ks:toast', { detail: msg }));
};

// ---- Sinkron kamar dari server (sumber yang sama dengan KostIn) ----
export async function refreshRoomsFromServer(): Promise<boolean> {
  try {
    const r = await fetch('/api/rooms', { cache: 'no-store' });
    if (!r.ok) return false;
    const j = await r.json();
    if (!Array.isArray(j.rooms)) return false;
    const next = JSON.stringify(j.rooms);
    if (localStorage.getItem('kostpro_rooms') !== next) {
      localStorage.setItem('kostpro_rooms', next);
      window.dispatchEvent(new Event('kostpro:rooms-synced'));
    }
    return true;
  } catch { return false; }
}

// ---- Cadangan data ----
export const BACKUP_KEYS = ['settings', 'rooms', 'tenants', 'payments', 'transactions', 'tenantHistory', 'paymentHistory', 'tenantMonthlyHistory', 'paymentMonthlyHistory', 'meters'];

export function buildBackup(): string {
  const data: Record<string, unknown> = {};
  for (const k of BACKUP_KEYS) {
    const raw = localStorage.getItem('kostpro_' + k);
    if (raw === null) continue;
    try { data[k] = JSON.parse(raw); } catch { /* abaikan */ }
  }
  return JSON.stringify({ app: 'kostpro', version: 'V.2.0', createdAt: new Date().toISOString(), data }, null, 2);
}

export function parseBackup(text: string): { data: Record<string, unknown> } | { error: string } {
  try {
    const x = JSON.parse(text);
    const out: Record<string, unknown> = {};
    if (x && x.app === 'kostpro' && x.data && typeof x.data === 'object') {
      for (const k of BACKUP_KEYS) if (x.data[k] !== undefined) out[k] = x.data[k];
    } else if (x && x.version === 'V.1.0') {
      for (const k of BACKUP_KEYS) if (x['kostpro_' + k] !== undefined) out[k] = x['kostpro_' + k];
    }
    if (!Object.keys(out).length) return { error: 'File bukan cadangan KostPro yang valid.' };
    return { data: out };
  } catch { return { error: 'File cadangan tidak bisa dibaca.' }; }
}

export async function markBackedUp() {
  const s = loadData<Settings>('settings', {});
  await saveData('settings', { ...s, lastBackupAt: new Date().toISOString() });
}

export async function backupNow(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const text = buildBackup();
  const name = `kostpro-cadangan-${todayISO()}.json`;
  const nav: any = navigator;
  try {
    const file = new File([text], name, { type: 'application/json' });
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: 'Cadangan KostPro' }); await markBackedUp(); return 'shared'; }
      catch (e: any) { if (e?.name === 'AbortError') return 'cancelled'; }
    }
  } catch { /* lanjut ke unduh biasa */ }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await markBackedUp();
  return 'downloaded';
}

export async function applyBackup(data: Record<string, unknown>) {
  for (const k of BACKUP_KEYS) if (data[k] !== undefined) await saveData(k, data[k]);
}

export const backupDue = (s: Settings) => {
  if (s.demo) return false;
  if (!s.lastBackupAt) return true;
  return (Date.now() - new Date(s.lastBackupAt).getTime()) / 86400000 >= 7;
};

// ---- PIN perangkat ----
const PIN_KEY = 'kostpro_pin_hash';
export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kostpro:' + pin));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const hasPin = () => typeof window !== 'undefined' && !!localStorage.getItem(PIN_KEY);
export async function setPin(pin: string | null) {
  if (!pin) localStorage.removeItem(PIN_KEY); else localStorage.setItem(PIN_KEY, await hashPin(pin));
}
export async function checkPin(pin: string) { return (await hashPin(pin)) === localStorage.getItem(PIN_KEY); }
export const normalizeFloor = (v: unknown) => Math.max(1, Math.floor(Number(v) || 1));
export { parseISO };
