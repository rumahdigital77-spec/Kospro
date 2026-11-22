// Pengganti client Supabase: antarmuka sama, tetapi semua data lewat API milik aplikasi ini (Vercel Postgres).
type R = Promise<{ data: any; error: Error | null }>;
type AuthCb = (event: string, session: { user: any } | null) => void;

const listeners = new Set<AuthCb>();
const emit = (ev: string, user: any) => listeners.forEach((cb) => { try { cb(ev, user ? { user } : null); } catch { /* ignore */ } });

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  let j: any = {};
  try { j = await r.json(); } catch { /* empty */ }
  return { ok: r.ok, j };
}

async function me(): Promise<any> {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    return (await r.json()).user ?? null;
  } catch { return null; }
}

async function authCall(action: 'login' | 'signup' | 'demo', body: Record<string, unknown>): R {
  try {
    const { ok, j } = await post('/api/auth/' + action, body);
    if (!ok || j.error) return { data: { user: null, session: null }, error: new Error(j.error || 'Proses gagal.') };
    emit('SIGNED_IN', j.user);
    return { data: { user: j.user, session: { user: j.user } }, error: null };
  } catch (e) { return { data: { user: null, session: null }, error: e instanceof Error ? e : new Error('Jaringan bermasalah.') }; }
}

const client = {
  auth: {
    async getUser() { const user = await me(); return { data: { user }, error: null }; },
    async getSession() { const user = await me(); return { data: { session: user ? { user } : null }, error: null }; },
    signInWithPassword: (c: { email: string; password: string }): R => authCall('login', c),
    signInDemo: (): R => authCall('demo', {}),
    signUp: (c: { email: string; password: string; options?: { data?: Record<string, unknown> } }): R =>
      authCall('signup', { email: c.email, password: c.password, full_name: c.options?.data?.full_name as string | undefined, provision: c.options?.data?.provision }),
    async signOut(): Promise<{ error: Error | null }> { await post('/api/auth/logout'); emit('SIGNED_OUT', null); return { error: null }; },
    onAuthStateChange(cb: AuthCb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => { listeners.delete(cb); } } } };
    },
  },
  async rpc(name: string, args?: Record<string, unknown>): R {
    try {
      const { j } = await post('/api/rpc/' + name, args);
      return j.error ? { data: null, error: new Error(j.error) } : { data: j.data ?? null, error: null };
    } catch (e) { return { data: null, error: e instanceof Error ? e : new Error('Jaringan bermasalah.') }; }
  },
  // Realtime tidak dipakai lagi; halaman sudah polling tiap detik.
  channel(_name: string) { const c = { on: (..._a: unknown[]) => c, subscribe: () => c }; return c; },
  async removeChannel(_c: unknown) { return 'ok'; },
};

export function createClient() { return client; }
