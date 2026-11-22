import { q, setState } from './db';
import { propertyOf } from './auth';
import { normalizeRooms, type RoomRow } from './rooms';
import { buildDemo } from './demo';
import { todayISO } from './dates';

const EXTRA_KEYS = ['tenants', 'payments', 'transactions', 'tenantHistory', 'paymentHistory', 'tenantMonthlyHistory', 'paymentMonthlyHistory', 'meters'];
const tooBig = (v: unknown) => JSON.stringify(v ?? null).length > 4_000_000;
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

// Membuat property + kamar + pengaturan awal (dipakai alur daftar, mode contoh, dan pemulihan cadangan).
export async function provisionProperty(userId: string, a: Record<string, any>, opts: { demo?: boolean } = {}): Promise<string> {
  if (await propertyOf(userId)) throw new Error('DATABASE_ALREADY_PROVISIONED');
  const demo = opts.demo === true;
  let name = String(a.p_property_name || '').trim().slice(0, 120);
  let address = String(a.p_address || '').trim().slice(0, 300);
  let phone = String(a.p_phone || '').trim().slice(0, 30);
  let rooms: RoomRow[];
  let settings: Record<string, any> = {};
  const extra: Record<string, unknown> = {};

  if (demo) {
    const d: any = buildDemo();
    name = 'Kos Contoh Melati'; address = d.settings.address; phone = d.settings.phone;
    rooms = d.rooms; settings = d.settings;
    for (const k of EXTRA_KEYS) if (d[k] !== undefined) extra[k] = d[k];
  } else {
    if (!name) throw new Error('Nama properti wajib diisi.');
    if (Array.isArray(a.p_rooms)) rooms = normalizeRooms(a.p_rooms).slice(0, 400);
    else {
      const count = Math.min(Math.max(parseInt(a.p_room_count) || 0, 0), 300);
      rooms = Array.from({ length: count }, (_, i) => ({ id: 'K-' + String(i + 1).padStart(2, '0'), tenant: '-', price: 0, status: 'available' }));
    }
    const seen = new Set<string>();
    rooms = rooms.filter((r) => { const k = r.id.toUpperCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    const today = todayISO();
    rooms = rooms.map((r) => ({ ...r, since: r.since || today }));
    if (isObj(a.p_settings)) settings = a.p_settings;
    if (tooBig(settings)) throw new Error('Data pengaturan terlalu besar.');
    if (isObj(a.p_state)) {
      for (const k of EXTRA_KEYS) {
        const v = a.p_state[k];
        if (v === undefined) continue;
        if (tooBig(v)) throw new Error('Data cadangan terlalu besar.');
        extra[k] = v;
      }
    }
  }

  const r = await q('insert into properties(owner_user_id,name,address,phone,is_demo) values($1,$2,$3,$4,$5) returning id', [userId, name, address, phone, demo]);
  const pid: string = r[0].id;
  await setState(pid, 'kostpro_rooms', rooms);
  await setState(pid, 'kostpro_settings', { ...settings, name: settings.name || name, onboarded: true, demo });
  for (const [k, v] of Object.entries(extra)) await setState(pid, 'kostpro_' + k, v);
  if (a.p_full_name) await q('update users set full_name=$2 where id=$1', [userId, String(a.p_full_name).slice(0, 120)]);
  return pid;
}
