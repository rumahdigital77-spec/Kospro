'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, Search, Plus, Home, LayoutGrid, ReceiptText, Users, Menu, Wallet, FileText, Megaphone, BarChart3,
  SlidersHorizontal, LogIn, LogOut, Download, Banknote, DoorOpen, CalendarDays, Info, X, Lock,
} from 'lucide-react';
import AccountDataSync from './AccountDataSync';
import Onboarding from './Onboarding';
import { Sheet } from './ks-ui';
import Art3D, { type ArtName } from './Art3D';
import { createClient } from '@/lib/supabase-browser';
import { loadData } from '@/lib/store';
import { APP_VERSION_LABEL } from '@/lib/version';
import { backupDue, backupNow, checkPin, hasPin, longDate, toast, THEMES, type Settings } from '@/lib/ks';

type Phase = 'loading' | 'onboarding' | 'app';

const TITLES: [string, string][] = [
  ['/kostpro/kamar', 'Kamar'], ['/kostpro/tagihan', 'Tagihan'], ['/kostpro/penghuni', 'Penghuni'], ['/kostpro/keuangan', 'Pengeluaran'],
  ['/kostpro/kwitansi', 'Dokumen'], ['/kostpro/dokumen', 'Dokumen'], ['/kostpro/master-bill', 'Dokumen'], ['/kostpro/iklan', 'Iklan Kamar'],
  ['/kostpro/laporan', 'Laporan'], ['/kostpro/pengaturan', 'Pengaturan'], ['/kostpro/booking', 'Booking'], ['/kostpro/cctv', 'CCTV'],
];

export default function KostproShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/kostpro';
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [propName, setPropName] = useState('');
  const [settings, setSettings] = useState<Settings>({});
  const [more, setMore] = useState(false);
  const [plus, setPlus] = useState(false);
  const [search, setSearch] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);

  const check = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setAuthUser(null); setPhase('onboarding'); return; }
    const { data: has } = await sb.rpc('get_database_provisioning_status');
    setAuthUser({ id: user.id, email: user.email });
    setPhase(has ? 'app' : 'onboarding');
  }, []);

  const loadProfile = useCallback(async () => {
    const { data } = await createClient().rpc('get_my_access');
    const first = Array.isArray(data) ? data[0] : null;
    if (first?.properties?.name) setPropName(String(first.properties.name));
    setSettings(loadData<Settings>('settings', {}));
  }, []);

  useEffect(() => {
    void check();
    const { data: l } = createClient().auth.onAuthStateChange(() => { window.setTimeout(() => void check(), 0); });
    return () => l.subscription.unsubscribe();
  }, [check]);

  useEffect(() => {
    if (phase !== 'app') return;
    void loadProfile();
    const re = () => setSettings(loadData<Settings>('settings', {}));
    const rp = () => void loadProfile();
    window.addEventListener('kostpro:data-saved', re);
    window.addEventListener('kostpro:data-scope-changed', re);
    window.addEventListener('kostpro:profile-updated', rp);
    if (hasPin() && sessionStorage.getItem('kostpro_unlocked') !== '1') setLocked(true);
    return () => {
      window.removeEventListener('kostpro:data-saved', re);
      window.removeEventListener('kostpro:data-scope-changed', re);
      window.removeEventListener('kostpro:profile-updated', rp);
    };
  }, [phase, loadProfile]);

  useEffect(() => {
    let t = 0;
    const on = (e: Event) => { setToastMsg(String((e as CustomEvent).detail || '')); window.clearTimeout(t); t = window.setTimeout(() => setToastMsg(''), 3200); };
    window.addEventListener('ks:toast', on);
    return () => { window.removeEventListener('ks:toast', on); window.clearTimeout(t); };
  }, []);

  useEffect(() => { setMore(false); setPlus(false); setSearch(false); }, [path]);

  const theme = THEMES.find((x) => x.id === settings.theme) || THEMES[0];
  useEffect(() => {
    let m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = theme.c;
  }, [theme.c]);

  const isHome = path === '/kostpro';
  const pageTitle = TITLES.find(([p]) => path === p || path.startsWith(p + '/'))?.[1] || 'KostPro';
  const due = backupDue(settings) && !(typeof window !== 'undefined' && localStorage.getItem('kostpro_backup_snooze') === new Date().toISOString().slice(0, 10));
  const nav = useMemo<{ href: string; label: string; art: ArtName; exact?: boolean }[]>(() => [
    { href: '/kostpro', label: 'Beranda', art: 'home', exact: true },
    { href: '/kostpro/kamar', label: 'Kamar', art: 'rooms' },
    { href: '/kostpro/tagihan', label: 'Tagihan', art: 'bill' },
    { href: '/kostpro/penghuni', label: 'Penghuni', art: 'people' },
  ], []);
  const moreItems: { href: string; label: string; art: ArtName }[] = [
    { href: '/kostpro/keuangan', label: 'Pengeluaran', art: 'wallet' },
    { href: '/kostpro/dokumen', label: 'Dokumen', art: 'doc' },
    { href: '/kostpro/iklan', label: 'Iklan Kamar', art: 'megaphone' },
    { href: '/kostpro/laporan', label: 'Laporan', art: 'chart' },
    { href: '/kostpro/pengaturan', label: 'Pengaturan', art: 'gear' },
    { href: '/kostpro/kamar/check-in', label: 'Check-in', art: 'checkin' },
    { href: '/kostpro/penghuni/kelola', label: 'Check-out', art: 'checkout' },
  ];
  const moreActive = !nav.some((n) => (n.exact ? path === n.href : path === n.href || path.startsWith(n.href + '/')));

  const doBackup = async () => {
    try {
      const r = await backupNow();
      if (r === 'cancelled') return;
      toast(r === 'shared' ? 'Cadangan dibagikan. Simpan di tempat yang aman.' : 'File cadangan diunduh. Simpan ke Google Drive/WhatsApp pribadi.');
      setMore(false);
    } catch (e) { toast(e instanceof Error ? e.message : 'Gagal membuat cadangan.'); }
  };

  const unlock = async () => {
    if (await checkPin(pin)) { sessionStorage.setItem('kostpro_unlocked', '1'); setLocked(false); setPin(''); setPinErr(false); }
    else { setPinErr(true); setPin(''); }
  };

  if (phase === 'loading') return <div className="kostpro-root ks ks-splash" data-theme="teal"><Building2 size={34} /><span>Memuat…</span></div>;

  if (phase === 'onboarding') {
    return (
      <div className="kostpro-root ks" data-theme={theme.id} data-mode="auto">
        <AccountDataSync />
        <Onboarding existingUser={authUser} onDone={() => void check()} />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="kostpro-root ks ks-lock" data-theme={theme.id} data-mode={settings.mode || 'auto'}>
        <div className="ks-lock-card">
          <div className="ks-brand sm"><img src="/brand/kostpro-logo.png" alt="KostPro" /></div>
          <Lock size={26} />
          <h2>Masukkan PIN</h2>
          <input type="password" inputMode="numeric" autoFocus maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinErr(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void unlock(); }} placeholder="PIN" />
          {pinErr && <p className="ks-err">PIN salah.</p>}
          <button className="ks-btn" onClick={() => void unlock()}>Buka</button>
          <p className="ks-ver">{APP_VERSION_LABEL}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kostpro-root ks" data-theme={theme.id} data-mode={settings.mode || 'auto'}>
      <AccountDataSync />
      <header className="ks-head">
        <div className="ks-head-in">
          <Link href="/kostpro" className={'ks-logo' + (settings.logo ? ' own' : '')} aria-label="Beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={settings.logo || '/brand/kostpro-icon.png'} alt="Logo" />
          </Link>
          <div className="ks-head-t">
            <b>{isHome ? (propName || 'KostPro') : pageTitle}</b>
            <span>{isHome ? longDate(new Date()) : (propName || 'KostPro')}</span>
          </div>
          <button className="ks-iconbtn" aria-label="Cari" onClick={() => setSearch(true)}><Search size={24} /></button>
          <button className="ks-plusbtn" aria-label="Tambah" onClick={() => setPlus(true)}><Plus size={28} /></button>
        </div>
      </header>

      <main className="ks-main">
        {settings.demo && (
          <div className="ks-banner demo">
            <Info size={18} /><span><b>Mode data contoh.</b> Data fiktif, tidak tampil di KostIn. Hapus kapan saja di Pengaturan.</span>
          </div>
        )}
        {children}
      </main>

      <nav className="ks-nav" aria-label="Menu utama">
        {nav.map(({ href, label, art, exact }) => {
          const on = exact ? path === href : path === href || path.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={'ks-nav-i' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined}>
              <Art3D name={art} size={34} /><span>{label}</span>
            </Link>
          );
        })}
        <button className={'ks-nav-i' + (more || moreActive ? ' on' : '')} onClick={() => setMore((v) => !v)} aria-expanded={more}>
          <span className="ks-dotwrap"><Art3D name="grid" size={34} />{due && <i className="ks-dot" />}</span><span>Lainnya</span>
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="Menu lainnya">
        <div className="ks-tiles">
          {moreItems.map(({ href, label, art }) => (
            <Link key={href} href={href} className="ks-tile"><Art3D name={art} size={44} /><span>{label}</span></Link>
          ))}
          <button className="ks-tile" onClick={() => void doBackup()}><Art3D name="backup" size={44} /><span>Cadangkan data</span></button>
        </div>
        <div className="ks-note blue"><Info size={20} /><span>Data tersimpan di akun Anda dan tersinkron ke KostIn. Cadangkan rutin sebagai arsip pribadi bila perangkat hilang atau akun bermasalah.</span></div>
      </Sheet>

      <Sheet open={plus} onClose={() => setPlus(false)} title="Tambah cepat">
        <div className="ks-list">
          {([
            { href: '/kostpro/kamar/check-in', l: 'Check-in penghuni', art: 'checkin' },
            { href: '/kostpro/tagihan?aksi=bayar', l: 'Terima bayar', art: 'wallet' },
            { href: '/kostpro/penghuni?aksi=booking', l: 'Catat booking', art: 'calendar' },
            { href: '/kostpro/kamar?aksi=tambah', l: 'Tambah kamar', art: 'rooms' },
            { href: '/kostpro/keuangan?aksi=tambah', l: 'Catat pengeluaran', art: 'bill' },
          ] as { href: string; l: string; art: ArtName }[]).map(({ href, l, art }) => (
            <Link key={href} href={href} className="ks-row"><span className="ks-row-i art"><Art3D name={art} size={34} /></span><b>{l}</b></Link>
          ))}
        </div>
      </Sheet>

      <SearchOverlay open={search} onClose={() => setSearch(false)} go={(h) => { setSearch(false); router.push(h); }} />
      {toastMsg && <div className="ks-toast" role="status"><span>{toastMsg}</span><button aria-label="Tutup" onClick={() => setToastMsg('')}><X size={16} /></button></div>}
    </div>
  );
}

function SearchOverlay({ open, onClose, go }: { open: boolean; onClose: () => void; go: (href: string) => void }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const s = q.trim().toLowerCase();
  const rooms = loadData<any[]>('rooms', []);
  const tenants = loadData<any[]>('tenants', []).filter((x) => (x.status || 'active') === 'active');
  const rr = s ? rooms.filter((r) => String(r.id).toLowerCase().includes(s) || String(r.tenant).toLowerCase().includes(s)).slice(0, 8) : [];
  const tt = s ? tenants.filter((t) => [t.name, t.phone, t.room, t.occupation].some((v) => String(v || '').toLowerCase().includes(s))).slice(0, 8) : [];
  return (
    <>
      <button className="ks-scrim" aria-label="Tutup" onClick={onClose} />
      <div className="ks-search" role="dialog" aria-label="Pencarian">
        <div className="ks-search-in"><Search size={20} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kamar atau penghuni…" /><button className="ks-x" onClick={onClose} aria-label="Tutup"><X size={22} /></button></div>
        <div className="ks-list">
          {rr.map((r) => <button key={'r' + r.id} className="ks-row" onClick={() => go('/kostpro/kamar?room=' + encodeURIComponent(r.id))}><span className="ks-row-i"><DoorOpen size={20} /></span><b>Kamar {r.id}</b><small>{r.tenant && r.tenant !== '-' ? r.tenant : 'Kosong'}</small></button>)}
          {tt.map((t) => <button key={'t' + t.id} className="ks-row" onClick={() => go('/kostpro/penghuni')}><span className="ks-row-i"><Users size={20} /></span><b>{t.name}</b><small>Kamar {t.room}</small></button>)}
          {s && !rr.length && !tt.length && <p className="ks-muted pad">Tidak ditemukan.</p>}
          {!s && <p className="ks-muted pad">Ketik nama penghuni, nomor kamar, atau nomor HP.</p>}
        </div>
      </div>
    </>
  );
}
