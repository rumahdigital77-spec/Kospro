import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { normalizeRooms } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await q(
      `select p.id,p.name,p.address,s.value from properties p join app_state s on s.property_id=p.id and s.key='kostpro_rooms' where p.is_demo=false`
    );
    const properties = rows
      .map((r) => ({
        source_property_id: r.id, name: r.name, city: null, address: r.address, cover_url: null, facilities: [],
        rooms: normalizeRooms(r.value).filter((x) => x.status === 'available' && x.listed !== false)
          .map((x) => ({ source_room_id: x.id, name: x.id, room_type: null, price_monthly: x.price, status: 'AVAILABLE' })),
      }))
      .filter((p) => p.rooms.length > 0);
    return NextResponse.json(
      { source: 'kostpro', read_only: true, properties, total_available_rooms: properties.reduce((n, p) => n + p.rooms.length, 0) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    return NextResponse.json({ source: 'kostpro', properties: [], error: e instanceof Error ? e.message : 'Inventory unavailable' }, { status: 502 });
  }
}
