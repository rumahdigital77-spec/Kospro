import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { normalizeRooms } from '@/lib/rooms';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const propertyId = String(b.propertyId || '').trim(), roomId = String(b.roomId || '').trim();
    const name = String(b.name || '').trim().slice(0, 120), phone = String(b.phone || '').trim().slice(0, 30);
    const checkIn = String(b.checkIn || '').trim(), duration = Number(b.duration || 0);
    const method = String(b.paymentMethod || 'TRANSFER_BANK').trim().slice(0, 30);
    if (!/^[0-9a-f-]{36}$/i.test(propertyId) || !roomId || !name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) ||
        !Number.isInteger(duration) || duration < 1 || duration > 120) return bad('Data booking belum lengkap.');

    const demo = await q('select 1 from properties where id=$1 and is_demo=true', [propertyId]);
    if (demo.length) return bad('Property tidak ditemukan.', 404);
    const st = await q(`select value from app_state where property_id=$1 and key='kostpro_rooms'`, [propertyId]);
    if (!st.length) return bad('Property tidak ditemukan.', 404);
    const rooms = normalizeRooms(st[0].value);
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.status !== 'available') return bad('Kamar sudah tidak tersedia.', 409);

    // Compare-and-swap: only reserve if nobody changed the room list since we read it.
    const next = rooms.map((r) => r.id === roomId ? { ...r, status: 'reserved', updated_at: new Date().toISOString() } : r);
    const cas = await q(
      `update app_state set value=$3::jsonb, updated_at=now() where property_id=$1 and key='kostpro_rooms' and value=$2::jsonb returning 1`,
      [propertyId, JSON.stringify(st[0].value), JSON.stringify(next)]
    );
    if (!cas.length) return bad('Kamar baru saja dipesan orang lain. Silakan muat ulang.', 409);

    const user = await currentUser().catch(() => null);
    const ins = await q(
      `insert into bookings(property_id,room_id,room_name,room_price,guest_name,guest_phone,check_in,duration_months,payment_method,user_id)
       values($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10) returning id,status`,
      [propertyId, roomId, roomId, room.price, name, phone, checkIn, duration, method, user?.id ?? null]
    );
    return NextResponse.json({ success: true, booking: ins[0], bookingId: ins[0].id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[booking]', e);
    return bad('Server booking tidak dapat memproses permintaan.', 500);
  }
}
