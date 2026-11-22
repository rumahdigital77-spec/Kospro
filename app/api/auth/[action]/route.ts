import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { randomBytes } from 'crypto';
import { createSession, currentUser, destroySession, hashPassword, publicUser, verifyPassword } from '@/lib/auth';
import { provisionProperty } from '@/lib/provision';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers: noStore });

export async function GET(_: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== 'me') return fail('Not found', 404);
  try { return NextResponse.json({ user: publicUser(await currentUser()) }, { headers: noStore }); }
  catch (e) { return fail(e instanceof Error ? e.message : 'Database error', 503); }
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  try {
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const fullName = String(b.full_name || '').trim() || null;

    if (action === 'logout') { await destroySession(); return NextResponse.json({ ok: true }, { headers: noStore }); }
    if (action === 'demo') {
      const r = await q('insert into users(email,full_name,password_hash,role) values($1,$2,$3,$4) returning id,email,full_name,role',
        [`demo-${randomBytes(8).toString('hex')}@demo.kostpro.local`, 'Pengguna Contoh', hashPassword(randomBytes(16).toString('hex')), 'demo']);
      try { await provisionProperty(r[0].id, {}, { demo: true }); }
      catch (e) { await q('delete from users where id=$1', [r[0].id]); throw e; }
      await createSession(r[0].id);
      return NextResponse.json({ user: publicUser(r[0]) }, { headers: noStore });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Email tidak valid.');

    if (action === 'signup') {
      if (password.length < 8) return fail('Password minimal 8 karakter.');
      if ((await q('select 1 from users where email=$1', [email])).length) return fail('User already registered: email sudah terdaftar.', 409);
      const r = await q('insert into users(email,full_name,password_hash) values($1,$2,$3) returning id,email,full_name,role', [email, fullName, hashPassword(password)]);
      // Pembuatan property dilakukan sebelum sesi dibuat agar data lengkap saat browser pertama kali memuat.
      if (b.provision && typeof b.provision === 'object') {
        try { await provisionProperty(r[0].id, b.provision, { demo: false }); }
        catch (e) { await q('delete from users where id=$1', [r[0].id]); return fail(e instanceof Error ? e.message : 'Gagal membuat property.', 400); }
      }
      await createSession(r[0].id);
      return NextResponse.json({ user: publicUser(r[0]) }, { headers: noStore });
    }
    if (action === 'login') {
      const r = await q('select id,email,full_name,role,password_hash from users where email=$1', [email]);
      if (!r[0] || !verifyPassword(password, r[0].password_hash)) return fail('Email atau password salah.', 401);
      await createSession(r[0].id);
      return NextResponse.json({ user: publicUser(r[0]) }, { headers: noStore });
    }
    return fail('Not found', 404);
  } catch (e) { return fail(e instanceof Error ? e.message : 'Server error', 500); }
}
