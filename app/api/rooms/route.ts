import { NextResponse } from 'next/server';
import { q, getState, setState } from '@/lib/db';
import { currentUser, propertyOf } from '@/lib/auth';
import { normalizeRooms, ROOM_STATUSES, type RoomRow } from '@/lib/rooms';
import { todayISO } from '@/lib/dates';

export const dynamic = 'force-dynamic';

async function scope() {
  const u = await currentUser();
  if (!u) return null;
  return propertyOf(u.id);
}

export async function GET() {
  try {
    const p = await scope();
    if (!p) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    return NextResponse.json({ property_id: p.id, property_name: p.name, rooms: normalizeRooms(await getState(p.id, 'kostpro_rooms')) }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Database belum terhubung.' }, { status: 503 });
  }
}

export async function POST(req: Request) {
  try {
    const p = await scope();
    if (!p) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    const room = (await req.json())?.room;
    if (!room?.id || !ROOM_STATUSES.includes(room.status)) return NextResponse.json({ error: 'Data kamar tidak valid.' }, { status: 400 });

    const rooms = normalizeRooms(await getState(p.id, 'kostpro_rooms'));
    const code = String(room.id).trim().toUpperCase();
    const cur = rooms.find((x) => x.id === code);
    if (room.status === 'available' || room.status === 'maintenance') {
      const live = await q(`select 1 from bookings where property_id=$1 and room_id=$2 and status in ('PENDING','CONFIRMED') limit 1`, [p.id, code]);
      const tenants = await getState(p.id, 'kostpro_tenants');
      const hasTenant = Array.isArray(tenants) && tenants.some((t: any) =>
        String(t?.room ?? '').trim().toLowerCase().replace(/^kamar\s+/, '') === code.toLowerCase() &&
        !['history', 'inactive', 'checkout', 'checked_out'].includes(String(t?.status ?? 'active').toLowerCase()));
      if (live.length || hasTenant) return NextResponse.json({ error: 'ROOM_LOCKED_BY_ACTIVE_BOOKING_OR_TENANT' }, { status: 409 });
    }
    const fl = Number(room.floor);
    const next: RoomRow = {
      ...(cur || {}),
      id: code, tenant: room.tenant || cur?.tenant || '-', price: Number(room.price) || 0, status: room.status, updated_at: new Date().toISOString(),
      floor: room.floor != null && Number.isFinite(fl) && fl > 0 ? Math.floor(fl) : cur?.floor,
      elec: typeof room.elec === 'string' ? room.elec : cur?.elec,
      listed: typeof room.listed === 'boolean' ? room.listed : cur?.listed,
      since: cur && cur.status === room.status && cur.since ? cur.since : todayISO(),
    };
    await setState(p.id, 'kostpro_rooms', cur ? rooms.map((x) => (x.id === code ? next : x)) : [...rooms, next]);
    return NextResponse.json({ room: next });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal menyimpan kamar.' }, { status: 500 });
  }
}
