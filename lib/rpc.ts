import { q, getState, setState } from './db';
import { propertyOf, destroySession, type User } from './auth';
import { normalizeRooms } from './rooms';
import { provisionProperty } from './provision';
import { todayISO, addMonthsISO, monthLabel, parseISO } from './dates';

type Ctx = { user: User | null; a: Record<string, any> };

async function need(user: User | null) {
  if (!user) throw new Error('AUTH_REQUIRED');
  return user;
}
async function needProperty(user: User | null) {
  const u = await need(user);
  const p = await propertyOf(u.id);
  if (!p) throw new Error('PROPERTY_NOT_FOUND');
  return { u, p };
}
const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

const BOOKING_SELECT = `b.id,b.property_id,b.room_id,b.room_name,b.room_price::float8 as room_price,b.guest_name,b.guest_phone,
  b.check_in::text as check_in,b.duration_months,b.payment_method,b.status,b.created_at,p.name as property_name`;

async function setRoomStatus(pid: string, roomId: string, from: string[] | null, status: string, tenant?: string) {
  const rooms = normalizeRooms(await getState(pid, 'kostpro_rooms'));
  const next = rooms.map((r) =>
    r.id === roomId && (!from || from.includes(r.status))
      ? { ...r, status, tenant: tenant ?? (status === 'available' ? '-' : r.tenant), updated_at: new Date().toISOString(), since: r.status !== status ? todayISO() : r.since }
      : r
  );
  await setState(pid, 'kostpro_rooms', next);
}

export const handlers: Record<string, (c: Ctx) => Promise<unknown>> = {
  async get_database_provisioning_status({ user }) {
    return user ? !!(await propertyOf(user.id)) : false;
  },

  async provision_owner_property({ user, a }) {
    const u = await need(user);
    return provisionProperty(u.id, a, { demo: false });
  },

  async reset_demo_data({ user }) {
    const u = await need(user);
    if (u.role !== 'demo') throw new Error('Akun ini bukan akun data contoh.');
    await q("delete from users where id=$1 and role='demo'", [u.id]);
    await destroySession();
    return true;
  },

  async update_property_profile({ user, a }) {
    const { p } = await needProperty(user);
    const name = String(a.p_name || '').trim().slice(0, 120);
    if (!name) throw new Error('Nama properti wajib diisi.');
    await q('update properties set name=$2,address=$3,phone=$4 where id=$1', [p.id, name, String(a.p_address || '').trim().slice(0, 300), String(a.p_phone || '').trim().slice(0, 30)]);
    return true;
  },

  async create_owner_booking({ user, a }) {
    const { p } = await needProperty(user);
    const roomId = String(a.p_room_id || '').trim();
    const name = String(a.p_guest_name || '').trim().slice(0, 120);
    const phone = String(a.p_guest_phone || '').trim().slice(0, 30);
    const checkIn = String(a.p_check_in || '').trim();
    const dur = parseInt(a.p_duration_months);
    if (!roomId || !name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !(dur >= 1 && dur <= 120)) throw new Error('Data booking belum lengkap.');
    const room = normalizeRooms(await getState(p.id, 'kostpro_rooms')).find((x) => x.id === roomId);
    if (!room || room.status !== 'available') throw new Error('Kamar sudah tidak tersedia.');
    await setRoomStatus(p.id, roomId, ['available'], 'reserved');
    const ins = await q(
      `insert into bookings(property_id,room_id,room_name,room_price,guest_name,guest_phone,check_in,duration_months,payment_method,status,user_id)
       values($1,$2,$3,$4,$5,$6,$7::date,$8,'OWNER','CONFIRMED',null) returning id`,
      [p.id, roomId, roomId, room.price, name, phone, checkIn, dur]
    );
    return ins[0].id;
  },

  async get_my_account({ user }) {
    if (!user) return null;
    const p = await propertyOf(user.id);
    return { user_id: user.id, email: user.email, full_name: user.full_name, property_id: p?.id ?? null, role: user.role, status: 'active', is_demo: !!p?.is_demo };
  },

  async get_my_access({ user }) {
    if (!user) return [];
    const p = await propertyOf(user.id);
    return p ? [{ property_id: p.id, role: 'owner', properties: { id: p.id, name: p.name, address: p.address, phone: p.phone } }] : [];
  },

  async get_property_app_state({ user }) {
    const u = await need(user);
    const p = await propertyOf(u.id);
    if (!p) return {};
    const rows = await q('select key,value from app_state where property_id=$1', [p.id]);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  async save_property_app_state({ user, a }) {
    const { p } = await needProperty(user);
    const key = String(a.p_key || '');
    if (!/^kostpro_[A-Za-z0-9_]{1,60}$/.test(key)) throw new Error('Key data tidak valid.');
    if (JSON.stringify(a.p_value ?? null).length > 4_000_000) throw new Error('Data terlalu besar.');
    await setState(p.id, key, a.p_value ?? null);
    return true;
  },

  async get_kostin_bookings_for_owner({ user }) {
    const { p } = await needProperty(user);
    return q(`select ${BOOKING_SELECT} from bookings b join properties p on p.id=b.property_id where b.property_id=$1 order by b.created_at desc`, [p.id]);
  },

  async update_kostin_booking_status({ user, a }) {
    const { p } = await needProperty(user);
    const status = String(a.p_status || '').toUpperCase();
    if (!['CONFIRMED', 'CANCELLED'].includes(status)) throw new Error('Status booking tidak valid.');
    if (!isUuid(a.p_booking_id)) throw new Error('ID booking tidak valid.');
    const r = await q(
      `update bookings set status=$3 where id=$1 and property_id=$2 and status in ('PENDING',$4) returning room_id`,
      [a.p_booking_id, p.id, status, status === 'CANCELLED' ? 'CONFIRMED' : 'PENDING']
    );
    if (!r.length) throw new Error('Booking tidak ditemukan atau statusnya tidak bisa diubah.');
    if (status === 'CANCELLED') await setRoomStatus(p.id, r[0].room_id, ['reserved'], 'available');
    return true;
  },

  async save_kostin_booking_checkin_v2({ user, a }) {
    const { p } = await needProperty(user);
    const dur = parseInt(a.p_duration_months);
    if (!isUuid(a.p_booking_id) || !(dur >= 1) || !a.p_guest_name || !a.p_guest_phone || !a.p_check_in) throw new Error('Data C.I. belum lengkap.');
    const r = await q(
      `update bookings set status='COMPLETED',guest_name=$3,guest_phone=$4,check_in=$5::date,duration_months=$6
       where id=$1 and property_id=$2 and status='CONFIRMED' returning room_id,room_price::float8 as price`,
      [a.p_booking_id, p.id, String(a.p_guest_name).trim(), String(a.p_guest_phone).trim(), String(a.p_check_in), dur]
    );
    if (!r.length) throw new Error('Booking belum berstatus CONFIRMED.');
    await setRoomStatus(p.id, r[0].room_id, null, 'occupied', String(a.p_guest_name).trim());
    // C.I. dari booking = penghuni aktif + tagihan sewa pertama (agar masuk Tagihan, Piutang, dan Laporan).
    const guestName = String(a.p_guest_name).trim();
    const checkIn = String(a.p_check_in);
    const stamp = Date.now();
    const tenantId = 'TEN-' + stamp;
    const tList = await getState(p.id, 'kostpro_tenants');
    const tenants: any[] = Array.isArray(tList) ? tList : [];
    await setState(p.id, 'kostpro_tenants', [...tenants, {
      id: tenantId, name: guestName, room: r[0].room_id, phone: String(a.p_guest_phone).trim(),
      startDate: checkIn, endDate: addMonthsISO(checkIn, dur), rent: r[0].price, status: 'active', source: 'kostin-booking',
    }]);
    const pList = await getState(p.id, 'kostpro_payments');
    const payments: any[] = Array.isArray(pList) ? pList : [];
    await setState(p.id, 'kostpro_payments', [...payments, {
      id: 'P-' + stamp, tenantId, tenant: guestName, room: r[0].room_id, month: monthLabel(parseISO(checkIn)),
      amount: r[0].price, status: 'unpaid', dueDate: checkIn, kind: 'sewa',
    }]);
    return true;
  },

  async post_payment_transaction_v2({ user, a }) {
    const { p } = await needProperty(user);
    const list = await getState(p.id, 'kostpro_payments');
    const payments: any[] = Array.isArray(list) ? list : [];
    const cur = payments.find((x) => x?.id === a.p_payment_id);
    if (!cur) throw new Error('Tagihan tidak ditemukan.');
    if (cur.status === 'paid') throw new Error('Tagihan ini sudah lunas.');
    const receipt = cur.receiptNo || 'KW-' + String(a.p_paid_at || '').replaceAll('-', '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const method = ['cash', 'transfer', 'qris'].includes(String(a.p_method)) ? String(a.p_method) : 'transfer';
    const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(String(a.p_paid_at)) ? String(a.p_paid_at) : todayISO();
    await setState(p.id, 'kostpro_payments', payments.map((x) => x.id === cur.id ? { ...x, status: 'paid', paidAt, method, receiptNo: receipt } : x));
    // Pendapatan dicatat di server (satu kali per tagihan) sehingga Keuangan & Laporan selalu sinkron.
    const trList = await getState(p.id, 'kostpro_transactions');
    const txs: any[] = Array.isArray(trList) ? trList : [];
    if (!txs.some((x) => x?.referenceId === cur.id)) {
      await setState(p.id, 'kostpro_transactions', [...txs, {
        id: 'TR-' + Date.now(), date: paidAt, description: `POSTING KAMAR — ${cur.room} — ${cur.tenant} — ${cur.note || cur.month} — ${method.toUpperCase()}`,
        category: cur.kind === 'listrik' ? 'Pendapatan Listrik' : 'Pendapatan Kamar', amount: Number(cur.amount) || 0, type: 'income', referenceId: cur.id,
        debitAccount: method === 'cash' ? 'Kas' : method === 'transfer' ? 'Bank' : 'QRIS', creditAccount: 'Pendapatan Sewa Kamar', accountingBasis: 'cash',
      }]);
    }
    return { receipt_no: receipt };
  },

  async get_partner_dashboard({ user }) {
    const u = await need(user);
    const p = await propertyOf(u.id);
    if (!p) return { properties: [], bookings: [] };
    const bookings = await q(`select ${BOOKING_SELECT} from bookings b join properties p on p.id=b.property_id where b.property_id=$1 order by b.created_at desc`, [p.id]);
    return { properties: [p], bookings };
  },

  async claim_property() {
    throw new Error('Property otomatis terhubung ke akun pemilik. Buat database di KostPro → User & Akses.');
  },

  async get_kostin_property_reviews({ a }) {
    if (!isUuid(a.p_source_property_id)) return [];
    return q('select rating,comment,reviewer_name,created_at from reviews where property_id=$1 order by created_at desc limit 50', [a.p_source_property_id]);
  },

  async get_my_completed_kostin_bookings({ user, a }) {
    if (!user || !isUuid(a.p_source_property_id)) return [];
    return q(
      `select b.id,b.room_name,b.check_in::text as check_in,exists(select 1 from reviews r where r.booking_id=b.id) as reviewed
       from bookings b where b.user_id=$1 and b.property_id=$2 and b.status='COMPLETED' order by b.created_at desc`,
      [user.id, a.p_source_property_id]
    );
  },

  async create_kostin_review({ user, a }) {
    const u = await need(user);
    const rating = parseInt(a.p_rating);
    if (!isUuid(a.p_booking_id) || !(rating >= 1 && rating <= 5)) throw new Error('Rating tidak valid.');
    const b = await q(`select property_id from bookings where id=$1 and user_id=$2 and status='COMPLETED'`, [a.p_booking_id, u.id]);
    if (!b.length) throw new Error('Hanya tamu dengan booking selesai yang dapat memberi ulasan.');
    const name = u.full_name || u.email.split('@')[0];
    const r = await q('insert into reviews(booking_id,property_id,user_id,reviewer_name,rating,comment) values($1,$2,$3,$4,$5,$6) on conflict (booking_id) do nothing returning id',
      [a.p_booking_id, b[0].property_id, u.id, name, rating, String(a.p_comment || '').slice(0, 1000)]);
    if (!r.length) throw new Error('Booking ini sudah diulas.');
    return true;
  },
};
