import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const client = url ? neon(url) : null;

const SCHEMA = [
  `create table if not exists users(id uuid primary key default gen_random_uuid(), email text unique not null, full_name text, password_hash text not null, role text not null default 'owner', created_at timestamptz not null default now())`,
  `create table if not exists sessions(token_hash text primary key, user_id uuid not null references users(id) on delete cascade, expires_at timestamptz not null)`,
  `create table if not exists properties(id uuid primary key default gen_random_uuid(), owner_user_id uuid unique references users(id) on delete cascade, name text not null, address text, phone text, created_at timestamptz not null default now())`,
  `alter table properties add column if not exists is_demo boolean not null default false`,
  `create table if not exists app_state(property_id uuid not null references properties(id) on delete cascade, key text not null, value jsonb not null, updated_at timestamptz not null default now(), primary key(property_id,key))`,
  `create table if not exists bookings(id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade, room_id text not null, room_name text, room_price numeric not null default 0, guest_name text not null, guest_phone text not null, check_in date not null, duration_months int not null default 1, payment_method text, status text not null default 'PENDING', user_id uuid references users(id) on delete set null, created_at timestamptz not null default now())`,
  `create table if not exists reviews(id uuid primary key default gen_random_uuid(), booking_id uuid unique not null references bookings(id) on delete cascade, property_id uuid not null references properties(id) on delete cascade, user_id uuid references users(id) on delete set null, reviewer_name text, rating int not null check(rating between 1 and 5), comment text, created_at timestamptz not null default now())`,
  `create index if not exists bookings_property_idx on bookings(property_id, created_at desc)`,
  `create index if not exists reviews_property_idx on reviews(property_id, created_at desc)`,
  `create index if not exists sessions_user_idx on sessions(user_id)`,
];

let ready: Promise<void> | null = null;
function ensureSchema() {
  if (!client) throw new Error('DATABASE_URL belum diatur. Hubungkan Vercel Postgres (Storage) ke project ini.');
  if (!ready) {
    ready = (async () => { for (const s of SCHEMA) await client.query(s); })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export async function q(text: string, params: unknown[] = []): Promise<any[]> {
  await ensureSchema();
  return (await client!.query(text, params as any[])) as any[];
}

export async function getState(pid: string, key: string): Promise<any> {
  const r = await q('select value from app_state where property_id=$1 and key=$2', [pid, key]);
  return r[0]?.value;
}

export async function setState(pid: string, key: string, value: unknown) {
  await q(
    'insert into app_state(property_id,key,value) values($1,$2,$3::jsonb) on conflict (property_id,key) do update set value=excluded.value, updated_at=now()',
    [pid, key, JSON.stringify(value)]
  );
}
