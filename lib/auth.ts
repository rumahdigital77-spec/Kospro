import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { q } from './db';

const COOKIE = 'kp_session';
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(pw, salt, 64).toString('hex');
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, h] = stored.split(':');
  if (!salt || !h) return false;
  const a = scryptSync(pw, salt, 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  await q("insert into sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '30 days')", [sha(token), userId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await q('delete from sessions where token_hash=$1', [sha(t)]);
  jar.delete(COOKIE);
}

export type User = { id: string; email: string; full_name: string | null; role: string };

export async function currentUser(): Promise<User | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const r = await q(
    'select u.id,u.email,u.full_name,u.role from sessions s join users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()',
    [sha(t)]
  );
  return r[0] || null;
}

export const publicUser = (u: User | null) =>
  u ? { id: u.id, email: u.email, user_metadata: { full_name: u.full_name } } : null;

export async function propertyOf(userId: string): Promise<{ id: string; name: string; address: string | null; phone: string | null; is_demo: boolean } | null> {
  const r = await q('select id,name,address,phone,is_demo from properties where owner_user_id=$1', [userId]);
  return r[0] || null;
}
