import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { handlers } from '@/lib/rpc';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const fn = Object.prototype.hasOwnProperty.call(handlers, name) ? handlers[name] : null;
  const headers = { 'Cache-Control': 'no-store' };
  if (!fn) return NextResponse.json({ error: 'RPC tidak dikenal: ' + name }, { status: 404, headers });
  try {
    const a = await req.json().catch(() => ({}));
    const data = await fn({ user: await currentUser(), a: a && typeof a === 'object' ? a : {} });
    return NextResponse.json({ data: data ?? null }, { headers });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 200, headers });
  }
}
