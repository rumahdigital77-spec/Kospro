// Helper tanggal murni (aman dipakai di server maupun browser). Semua memakai zona waktu lokal.
export const ID_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const ID_DAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const p2 = (n: number) => String(n).padStart(2, '0');

export const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayISO = () => isoOf(new Date());
export const parseISO = (s: string) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};
export const monthKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
export const monthLabel = (d: Date) => `${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const parseMonthLabel = (s: string): Date | null => {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const i = ID_MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  return i < 0 ? null : new Date(Number(m[2]), i, 1);
};
export const longDate = (d: Date) => `${ID_DAYS[d.getDay()]}, ${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const shortDate = (iso?: string) => {
  if (!iso) return '-';
  const d = parseISO(iso);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};
export const addDaysISO = (iso: string, n: number) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return isoOf(d); };
export const addMonthsISO = (iso: string, n: number) => {
  const d = parseISO(iso); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return isoOf(d);
};
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
// Tanggal jatuh tempo pada bulan tertentu mengikuti tanggal mulai sewa (dijepit ke akhir bulan).
export const dueInMonth = (startISO: string, year: number, month0: number) => {
  const day = parseISO(startISO).getDate();
  return isoOf(new Date(year, month0, Math.min(day, new Date(year, month0 + 1, 0).getDate())));
};
export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
};
