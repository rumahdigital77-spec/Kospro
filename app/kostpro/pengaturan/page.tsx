'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, Upload } from 'lucide-react';
import { useKs } from '@/lib/useKs';
import { saveData } from '@/lib/store';
import { createClient } from '@/lib/supabase-browser';
import { PageHead } from '@/components/ks-ui';
import { ELEC_TARIFFS, THEMES, applyBackup, backupNow, fmtRate, hasPin, parseBackup, rp, setPin, toast, type Settings } from '@/lib/ks';

export default function Pengaturan() {
  const k = useKs(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Settings>({});
  const [prop, setProp] = useState({ name: '', address: '', phone: '' });
  const [account, setAccount] = useState<{ email: string; is_demo: boolean } | null>(null);
  const [pin, setPinV] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinOn, setPinOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (k.ready) setF(k.settings); }, [k.ready]);
  useEffect(() => {
    setPinOn(hasPin());
    const sb = createClient();
    void sb.rpc('get_my_account').then(({ data }) => { if (data) setAccount({ email: data.email, is_demo: !!data.is_demo }); });
    void sb.rpc('get_my_access').then(({ data }) => {
      const p = Array.isArray(data) ? data[0]?.properties : null;
      if (p) setProp({ name: p.name || '', address: p.address || '', phone: p.phone || '' });
    });
  }, []);

  const set = <K extends keyof Settings>(key: K, v: Settings[K]) => setF((x) => ({ ...x, [key]: v }));
  const saveSettings = async (msg = 'Pengaturan disimpan.', patch: Settings = {}) => {
    setBusy(true);
    try { await saveData('settings', { ...k.settings, ...f, ...patch }); toast(msg); }
    catch (e) { toast(e instanceof Error ? e.message : 'Gagal menyimpan.'); }
    setBusy(false);
  };
  const saveProp = async () => {
    setBusy(true);
    const { error } = await createClient().rpc('update_property_profile', { p_name: prop.name, p_address: prop.address, p_phone: prop.phone });
    setBusy(false);
    if (error) return toast(error.message || 'Gagal menyimpan properti.');
    window.dispatchEvent(new Event('kostpro:profile-updated'));
    toast('Profil properti disimpan. KostIn ikut diperbarui.');
  };
  const savePin = async () => {
    if (!/^\d{4,6}$/.test(pin)) return toast('PIN harus 4–6 digit angka.');
    if (pin !== pin2) return toast('Ulangi PIN tidak sama.');
    await setPin(pin); setPinOn(true); setPinV(''); setPin2(''); sessionStorage.setItem('kostpro_unlocked', '1'); toast('PIN aktif di perangkat ini.');
  };
  const image = (key: 'logo' | 'signature') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return toast('File maksimal 1 MB.');
    const r = new FileReader(); r.onload = () => set(key, String(r.result)); r.readAsDataURL(file);
  };
  const restore = (file?: File | null) => {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = async () => {
      const r = parseBackup(String(rd.result || ''));
      if ('error' in r) return toast(r.error);
      if (!confirm('Pulihkan data dari cadangan? Data kamar, penghuni, tagihan, dan keuangan saat ini akan diganti.')) return;
      setBusy(true);
      try { await applyBackup(r.data); toast('Data dipulihkan. Memuat ulang…'); setTimeout(() => location.reload(), 900); }
      catch (e) { toast(e instanceof Error ? e.message : 'Gagal memulihkan.'); setBusy(false); }
    };
    rd.readAsText(file);
  };
  const logout = async () => { await createClient().auth.signOut(); location.href = '/kostpro'; };
  const wipeDemo = async () => {
    if (!confirm('Hapus semua data contoh dan mulai mengatur usaha Anda sendiri?')) return;
    const { error } = await createClient().rpc('reset_demo_data');
    if (error) return toast(error.message);
    await createClient().auth.signOut();
    location.href = '/kostpro';
  };
  const tariffId = ELEC_TARIFFS.find((t) => t.rate === f.elecTariff && t.id !== 'custom')?.id || 'custom';

  return (
    <div className="ks-page">
      <PageHead title="Pengaturan" sub="Identitas usaha, tampilan, dan data" />

      <section className="ks-card ks-stack">
        <h3>Identitas usaha</h3>
        <label className="ks-f"><b>Nama usaha</b><input value={f.name || ''} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="ks-f"><b>Nama pemilik / pengelola</b><input value={f.ownerName || ''} onChange={(e) => { set('ownerName', e.target.value); set('manager', e.target.value); }} /></label>
        <div className="ks-2">
          <label className="ks-f"><b>No. WhatsApp usaha</b><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
          <label className="ks-f"><b>Kota</b><input value={f.city || ''} onChange={(e) => set('city', e.target.value)} /></label>
        </div>
        <label className="ks-f"><b>Rekening / cara bayar</b><input value={f.bank || ''} onChange={(e) => set('bank', e.target.value)} /></label>
        <div className="ks-2">
          <label className="ks-f"><b>Logo</b><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image('logo')} />{f.logo && <img src={f.logo} alt="Logo" className="ks-thumb" />}</label>
          <label className="ks-f"><b>Tanda tangan</b><input type="file" accept="image/png,image/jpeg,image/webp" onChange={image('signature')} />{f.signature && <img src={f.signature} alt="Tanda tangan" className="ks-thumb" />}</label>
        </div>
        <div className="ks-2">
          <label className="ks-f"><b>Prefix kwitansi</b><input value={f.receiptPrefix || 'KW'} onChange={(e) => set('receiptPrefix', e.target.value.toUpperCase())} /></label>
          <label className="ks-f"><b>Nomor berikutnya</b><input type="number" min={1} value={f.receiptNext || 1} onChange={(e) => set('receiptNext', Math.max(1, Number(e.target.value) || 1))} /></label>
        </div>
        <button className="ks-btn" disabled={busy} onClick={() => void saveSettings()}>Simpan identitas</button>
      </section>

      <section className="ks-card ks-stack">
        <h3>Properti (tampil di KostIn)</h3>
        <label className="ks-f"><b>Nama properti</b><input value={prop.name} onChange={(e) => setProp({ ...prop, name: e.target.value })} /></label>
        <label className="ks-f"><b>Alamat</b><input value={prop.address} onChange={(e) => setProp({ ...prop, address: e.target.value })} /></label>
        <label className="ks-f"><b>Telepon</b><input value={prop.phone} onChange={(e) => setProp({ ...prop, phone: e.target.value })} /></label>
        <button className="ks-btn" disabled={busy || !prop.name.trim()} onClick={() => void saveProp()}>Simpan properti</button>
        <p className="ks-hint">Kamar, lantai, dan harga diatur di menu Kamar.</p>
      </section>

      <section className="ks-card ks-stack">
        <h3>Listrik & penagihan</h3>
        <label className="ks-f"><b>Tarif listrik</b>
          <select value={tariffId} onChange={(e) => { const t = ELEC_TARIFFS.find((x) => x.id === e.target.value)!; setF((x) => ({ ...x, elecTariff: t.id === 'custom' ? x.elecTariff || 0 : t.rate, elecTariffLabel: t.label })); }}>
            {ELEC_TARIFFS.map((t) => <option key={t.id} value={t.id}>{t.id === 'custom' ? t.label : `${t.label} — Rp ${fmtRate(t.rate)}`}</option>)}
          </select>
        </label>
        {tariffId === 'custom' && <label className="ks-f"><b>Tarif per kWh</b><input type="number" min={0} value={f.elecTariff || ''} onChange={(e) => set('elecTariff', Number(e.target.value) || 0)} /></label>}
        <label className="ks-check"><input type="checkbox" checked={!!f.reward} onChange={(e) => set('reward', e.target.checked)} /><span>Beri apresiasi {rp(f.rewardAmount || 25000)} untuk penghuni yang membayar tepat waktu</span></label>
        <p className="ks-hint">KostPro tidak memiliki fitur denda/bunga keterlambatan.</p>
        <button className="ks-btn" disabled={busy} onClick={() => void saveSettings()}>Simpan</button>
      </section>

      <section className="ks-card ks-stack">
        <h3>Tampilan</h3>
        <div className="ks-swatches">
          {THEMES.map((t) => <button key={t.id} type="button" aria-label={t.name} aria-pressed={(f.theme || 'teal') === t.id} className={(f.theme || 'teal') === t.id ? 'on' : ''} style={{ background: t.c }} onClick={() => { set('theme', t.id); void saveSettings('Tema diganti.', { theme: t.id }); }} />)}
        </div>
        <div className="ks-seg">
          {([['auto', 'Ikuti perangkat'], ['light', 'Terang'], ['dark', 'Gelap']] as const).map(([id, l]) => <button key={id} className={(f.mode || 'auto') === id ? 'on' : ''} onClick={() => { set('mode', id); void saveSettings('Mode diganti.', { mode: id }); }}>{l}</button>)}
        </div>
      </section>

      <section className="ks-card ks-stack">
        <h3>Keamanan</h3>
        <p className="ks-hint">PIN mengunci aplikasi di perangkat ini. {pinOn ? 'PIN sedang aktif.' : 'PIN belum diatur.'}</p>
        <div className="ks-2">
          <label className="ks-f"><b>PIN baru (4–6 digit)</b><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPinV(e.target.value.replace(/\D/g, ''))} /></label>
          <label className="ks-f"><b>Ulangi PIN</b><input type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} /></label>
        </div>
        <div className="ks-inline"><button className="ks-btn" onClick={() => void savePin()}>{pinOn ? 'Ganti PIN' : 'Aktifkan PIN'}</button>{pinOn && <button className="ks-btn ghost" onClick={async () => { await setPin(null); setPinOn(false); toast('PIN dimatikan.'); }}>Matikan PIN</button>}</div>
      </section>

      <section className="ks-card ks-stack">
        <h3>Cadangan data</h3>
        <p className="ks-hint">{k.settings.lastBackupAt ? `Terakhir dicadangkan ${new Date(k.settings.lastBackupAt).toLocaleString('id-ID')}.` : 'Belum pernah dicadangkan.'}</p>
        <div className="ks-inline">
          <button className="ks-btn" onClick={async () => { const r = await backupNow().catch(() => 'cancelled' as const); if (r !== 'cancelled') toast('Cadangan dibuat.'); }}><Download size={18} /> Cadangkan data</button>
          <button className="ks-btn ghost" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={18} /> Pulihkan</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </section>

      <section className="ks-card">
        <h3>Fitur lain</h3>
        <div className="ks-list">
          <Link href="/kostpro/cctv" className="ks-row"><b>CCTV</b><ChevronRight size={20} /></Link>
          <Link href="/kostpro/booking" className="ks-row"><b>Pusat booking KostIn</b><ChevronRight size={20} /></Link>
          <Link href="/kostin" className="ks-row"><b>Buka KostIn (marketplace)</b><ChevronRight size={20} /></Link>
        </div>
      </section>

      <section className="ks-card ks-stack">
        <h3>Akun</h3>
        <p className="ks-hint">{account ? `Masuk sebagai ${account.is_demo ? 'pengguna data contoh' : account.email}.` : ''}</p>
        {account?.is_demo && <button className="ks-btn danger" onClick={() => void wipeDemo()}>Hapus data contoh &amp; mulai usaha saya</button>}
        <button className="ks-btn ghost" onClick={() => void logout()}>Keluar</button>
      </section>
      <p className="ks-ver">Tampilan KostPro v2.1 · gaya KosKu</p>
    </div>
  );
}
