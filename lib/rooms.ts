export const ROOM_STATUSES = ['available', 'occupied', 'reserved', 'maintenance'];
export type RoomRow = {
  id: string; tenant: string; price: number; status: string; updated_at?: string;
  floor?: number; elec?: string; listed?: boolean; since?: string;
};

export function normalizeRooms(v: unknown): RoomRow[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((r: any) => {
      const row: RoomRow = {
        id: String(r?.id ?? r?.room_code ?? '').trim(),
        tenant: String(r?.tenant ?? '-'),
        price: Number(r?.price ?? 0),
        status: ROOM_STATUSES.includes(r?.status) ? r.status : 'available',
        updated_at: r?.updated_at,
      };
      const fl = Number(r?.floor);
      if (r?.floor != null && Number.isFinite(fl) && fl >= 0) row.floor = Math.floor(fl);
      if (typeof r?.elec === 'string') row.elec = r.elec;
      if (typeof r?.listed === 'boolean') row.listed = r.listed;
      if (typeof r?.since === 'string') row.since = r.since;
      return row;
    })
    .filter((r) => r.id);
}
