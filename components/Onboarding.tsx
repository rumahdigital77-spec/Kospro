'use client';

import { useRef, useState } from 'react';
import { Building2, PenLine, Gift, Upload, Shield, Hand, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import {
  ELEC_MODES, ELEC_TARIFFS, NUMBERING, PROPERTY_TYPES, TARGETS, THEMES, fmtRate, genRoomIds, parseBackup, setPin,
} from '@/lib/ks';

type View = 'welcome' | 'login' | 'steps';

export default function Onboarding({ existingUser, onDone }: { existingUser: { id: string; email: string } | null; onDone: () => void }) {
  const sb = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('welcome');
  const [step, setStep] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [restore, setRestore] = useState<Record<string, any> | null>(null);

  // Akun login (agar data tersinkron ke KostIn)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Langkah 2: identitas usaha
  const [usaha, setUsaha] = useState('');
  const [pemilik, setPemilik] = useState('');
  const [wa, setWa] = useState('');
  const [kota, setKota] = useState('');
  const [bank, setBank] = useState('');
  // Langkah 3: properti & kamar pertama
  const [propName, setPropName] = useState('');
  const [jenis, setJenis] = useState(PROPERTY_TYPES[0]);
  const [target, setTarget] = useState(TARGETS[0]);
  const [lantai, setLantai] = useState('1');
  const [perLantai, setPerLantai] = useState('6');
  const [numbering, setNumbering] = useState('letter');
  const [harga, setHarga] = useState('');
  const [elecMode, setElecMode] = useState('meter');
  const [tariffId, setTariffId] = useState('r1-1300');
  const [customRate, setCustomRate] = useState('');
  const [alamat, setAlamat] = useState('');
  // Langkah 4: preferensi
  const [theme, setTheme] = useState('teal');
  const [mode, setMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [reward, setReward] = useState(false);
  const [pin, setPinV] = useState('');
  const [pin2, setPin2] = useState('');

  const tariff = ELEC_TARIFFS.find((t) => t.id === tariffId) || ELEC_TARIFFS[1];
  const rate = tariffId === 'custom' ? Number(customRate) || 0 : tariff.rate;
  const progress = view === 'steps' ? step : 1;

  const fail = (m: string) => { setErr(m); return false; };

  const startDemo = async () => {
    setErr(''); setBusy(true);
    const { error } = await sb.auth.signInDemo();
    setBusy(false);
    if (error) setErr(error.message || 'Gagal membuat data contoh.');
    else onDone();
  };

  const login = async () => {
    setErr('');
    if (!email.trim() || !password) return setErr('Email dan password wajib diisi.');
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) setErr(error.message || 'Login gagal.');
    else onDone();
  };

  const pickFile = (f?: File | null) => {
    if (!f) return;
    setErr('');
    const rd = new FileReader();
    rd.onload = () => {
      const r = parseBackup(String(rd.result || ''));
      if ('error' in r) return setErr(r.error);
      const s = (r.data.settings || {}) as Record<string, any>;
      setRestore(r.data);
      setUsaha(String(s.name || '')); setPemilik(String(s.ownerName || s.manager || ''));
      setWa(String(s.phone || '')); setKota(String(s.city || '')); setBank(String(s.bank || ''));
      setAlamat(String(s.address || '')); setPropName(String(s.name || ''));
      if (typeof s.theme === 'string') setTheme(s.theme);
      if (s.mode === 'light' || s.mode === 'dark' || s.mode === 'auto') setMode(s.mode);
      setStep(2); setView('steps');
    };
    rd.readAsText(f);
  };

  const validate2 = () => {
    if (!usaha.trim()) return fail('Nama usaha wajib diisi.');
    if (!pemilik.trim()) return fail('Nama pemilik / pengelola wajib diisi.');
    if (!existingUser) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return fail('Email tidak valid.');
      if (password.length < 8) return fail('Password minimal 8 karakter.');
    }
    return true;
  };
  const validate3 = () => {
    if (!propName.trim()) return fail('Nama properti wajib diisi.');
    const f = Number(lantai), p = Number(perLantai);
    if (!Number.isInteger(f) || f < 1 || f > 20) return fail('Jumlah lantai 1–20.');
    if (!Number.isInteger(p) || p < 1 || p > 50) return fail('Kamar per lantai 1–50.');
    if (f * p > 300) return fail('Maksimal 300 kamar saat awal. Sisanya bisa ditambah nanti.');
    if (Number(harga || 0) < 0) return fail('Harga tidak valid.');
    if (elecMode === 'meter' && tariffId === 'custom' && !(rate > 0)) return fail('Isi tarif listrik per kWh.');
    return true;
  };

  const next = () => {
    setErr('');
    if (step === 2) { if (!validate2()) return; setStep(restore ? 4 : 3); }
    else if (step === 3) { if (!validate3()) return; setStep(4); }
  };
  const back = () => {
    setErr('');
    if (step === 2) { setView('welcome'); setRestore(null); }
    else if (step === 4) setStep(restore ? 2 : 3);
    else setStep(step - 1);
  };

  const finish = async () => {
    setErr('');
    if (pin || pin2) {
      if (!/^\d{4,6}$/.test(pin)) return setErr('PIN harus 4–6 digit angka.');
      if (pin !== pin2) return setErr('Ulangi PIN tidak sama.');
    }
    setBusy(true);
    try {
      const base = {
        theme, mode, reward, rewardAmount: 25000, currency: 'IDR', receiptPrefix: 'KW', receiptNext: 1,
        name: usaha.trim(), ownerName: pemilik.trim(), manager: pemilik.trim(), phone: wa.trim(), city: kota.trim(), bank: bank.trim(), address: alamat.trim(),
      };
      let provision: Record<string, unknown>;
      if (restore) {
        const old = (restore.settings || {}) as Record<string, unknown>;
        provision = {
          p_property_name: usaha.trim(), p_address: alamat.trim(), p_phone: wa.trim(), p_full_name: pemilik.trim(),
          p_rooms: Array.isArray(restore.rooms) ? restore.rooms : [], p_settings: { ...old, ...base }, p_state: restore,
        };
      } else {
        const rooms = genRoomIds(numbering, Number(lantai), Number(perLantai)).map(({ id, floor }) => ({
          id, floor, tenant: '-', price: Number(harga) || 0, status: 'available', elec: elecMode, listed: true,
        }));
        provision = {
          p_property_name: propName.trim(), p_address: alamat.trim(), p_phone: wa.trim(), p_full_name: pemilik.trim(), p_rooms: rooms,
          p_settings: {
            ...base, propertyType: jenis, target, elecMode, elecTariff: rate, elecTariffLabel: tariffId === 'custom' ? 'Tarif khusus' : tariff.label,
            availableRooms: rooms.length,
          },
        };
      }
      if (existingUser) {
        const { error } = await sb.rpc('provision_owner_property', provision);
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signUp({
          email: email.trim().toLowerCase(), password, options: { data: { full_name: pemilik.trim(), provision } },
        });
        if (error) {
          if (/already registered|sudah terdaftar/i.test(error.message)) {
            setView('login'); setStep(2);
            throw new Error('Email sudah terdaftar. Silakan masuk dengan akun tersebut.');
          }
          throw error;
        }
      }
      if (pin) { await setPin(pin); sessionStorage.setItem('kostpro_unlocked', '1'); }
      if (existingUser) {
        sessionStorage.removeItem('kostpro-post-hydration-reload');
        window.location.assign('/kostpro');
      } else onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyimpan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-onb" data-theme={theme} data-mode={mode}>
      <div className="ks-onb-card">
        <div className="ks-progress" aria-label={`Langkah ${progress} dari 4`}>
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= progress ? 'on' : ''} />)}
        </div>

        {view === 'welcome' && (
          <>
            <div className="ks-brand"><img src="/brand/kostpro-logo.png" alt="KostPro — Managed Smart Your Property" /></div>
            <h1>Selamat datang di KostPro</h1>
            <p className="ks-lead">Kelola kamar, penghuni, tagihan, kwitansi, dan laporan kos/kontrakan Anda — langsung dari HP atau laptop.</p>
            <div className="ks-note blue"><Shield size={22} /><span>Data tersimpan aman di akun Anda dan tersinkron ke KostIn. Untuk berjaga-jaga, gunakan fitur <b>Cadangkan data</b> secara rutin.</span></div>
            {existingUser && <div className="ks-note"><Hand size={20} /><span>Anda masuk sebagai <b>{existingUser.email}</b>, tetapi belum punya usaha. Silakan atur usaha Anda.</span></div>}
            <button className="ks-choice" onClick={() => { setErr(''); setRestore(null); setStep(2); setView('steps'); }}>
              <PenLine size={30} /><span><b>Mulai atur usaha saya</b><small>4 langkah singkat: identitas, properti &amp; kamar, preferensi.</small></span>
            </button>
            {!existingUser && (
              <button className="ks-choice" disabled={busy} onClick={() => void startDemo()}>
                <Gift size={30} /><span><b>Coba dulu dengan data contoh</b><small>1 properti fiktif (2 lantai), 18 kamar, penghuni &amp; tagihan beberapa bulan. Tidak tampil di KostIn. Bisa dihapus kapan saja.</small></span>
              </button>
            )}
            <button className="ks-choice" onClick={() => fileRef.current?.click()}>
              <Upload size={30} /><span><b>Pulihkan dari file cadangan</b><small>Pindah dari HP/laptop lain.</small></span>
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            {!existingUser && <button className="ks-link" onClick={() => { setErr(''); setView('login'); }}>Sudah punya akun? Masuk</button>}
            {err && <p className="ks-err">{err}</p>}
          </>
        )}

        {view === 'login' && (
          <>
            <div className="ks-brand sm"><img src="/brand/kostpro-logo.png" alt="KostPro" /></div>
            <h2>Masuk</h2>
            <p className="ks-lead">Gunakan email dan password akun KostPro Anda.</p>
            <label className="ks-f"><b>Email</b><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" /></label>
            <label className="ks-f"><b>Password</b><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void login(); }} /></label>
            {err && <p className="ks-err">{err}</p>}
            <div className="ks-onb-foot">
              <button className="ks-link" onClick={() => { setErr(''); setView('welcome'); }}>Kembali</button>
              <button className="ks-btn" disabled={busy} onClick={() => void login()}>{busy ? 'Memproses…' : 'Masuk'}</button>
            </div>
          </>
        )}

        {view === 'steps' && step === 2 && (
          <>
            <h2>Identitas usaha</h2>
            <p className="ks-lead">Tampil di kwitansi, tagihan, dan dokumen.</p>
            {restore && <div className="ks-note green"><Check size={18} /><span>Cadangan terbaca: {Array.isArray(restore.rooms) ? restore.rooms.length : 0} kamar, {Array.isArray(restore.tenants) ? restore.tenants.length : 0} penghuni. Data dipulihkan setelah Anda selesai.</span></div>}
            <label className="ks-f"><b>Nama usaha</b><input value={usaha} onChange={(e) => setUsaha(e.target.value)} placeholder="mis. Griya Melati Kost" /></label>
            <label className="ks-f"><b>Nama pemilik / pengelola</b><input value={pemilik} onChange={(e) => setPemilik(e.target.value)} placeholder="mis. Bu Ratna" /></label>
            <label className="ks-f"><b>No. WhatsApp usaha <em>(opsional)</em></b><input inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xx" /></label>
            <label className="ks-f"><b>Kota <em>(opsional)</em></b><input value={kota} onChange={(e) => setKota(e.target.value)} placeholder="mis. Sleman" /></label>
            <label className="ks-f"><b>Rekening / cara bayar <em>(opsional)</em></b><input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="mis. BSI 7123... a.n. ..." /></label>
            {!existingUser && (
              <div className="ks-acct">
                <h4>Akun login</h4>
                <p>Agar data tersimpan di server dan tersinkron ke KostIn (kamar kosong otomatis tampil untuk tamu).</p>
                <label className="ks-f"><b>Email</b><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@email.com" /></label>
                <label className="ks-f"><b>Password</b><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" /></label>
              </div>
            )}
            {err && <p className="ks-err">{err}</p>}
            <div className="ks-onb-foot"><button className="ks-link" onClick={back}>Kembali</button><button className="ks-btn" onClick={next}>Lanjut</button></div>
          </>
        )}

        {view === 'steps' && step === 3 && (
          <>
            <h2>Properti &amp; kamar pertama</h2>
            <p className="ks-lead">Bisa ditambah atau diubah kapan saja. Kamar yang berstatus kosong otomatis tampil di KostIn.</p>
            <label className="ks-f"><b>Nama properti</b><input value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="mis. Kos Putri Melati" /></label>
            <div className="ks-2">
              <label className="ks-f"><b>Jenis</b><select value={jenis} onChange={(e) => setJenis(e.target.value)}>{PROPERTY_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="ks-f"><b>Peruntukan</b><select value={target} onChange={(e) => setTarget(e.target.value)}>{TARGETS.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="ks-f"><b>Jumlah lantai</b><input type="number" inputMode="numeric" min={1} max={20} value={lantai} onChange={(e) => setLantai(e.target.value)} /></label>
              <label className="ks-f"><b>Kamar per lantai</b><input type="number" inputMode="numeric" min={1} max={50} value={perLantai} onChange={(e) => setPerLantai(e.target.value)} /></label>
              <label className="ks-f"><b>Penomoran</b><select value={numbering} onChange={(e) => setNumbering(e.target.value)}>{NUMBERING.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label className="ks-f"><b>Harga per bulan</b><input type="number" inputMode="numeric" min={0} value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="0" /></label>
              <label className="ks-f"><b>Listrik kamar</b><select value={elecMode} onChange={(e) => setElecMode(e.target.value)}>{ELEC_MODES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label className="ks-f"><b>Tarif listrik</b>
                <select value={tariffId} onChange={(e) => setTariffId(e.target.value)}>
                  {ELEC_TARIFFS.map((t) => <option key={t.id} value={t.id}>{t.id === 'custom' ? t.label : `${t.label} — Rp ${fmtRate(t.rate)}`}</option>)}
                </select>
              </label>
            </div>
            {tariffId === 'custom' && <label className="ks-f"><b>Tarif per kWh</b><input type="number" inputMode="decimal" min={0} value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="mis. 1500" /></label>}
            <label className="ks-f"><b>Alamat <em>(opsional)</em></b><input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jalan, kelurahan, kota" /></label>
            <p className="ks-hint">Akan dibuat {Math.max(0, (Number(lantai) || 0) * (Number(perLantai) || 0))} kamar{!Number(harga) ? ' — harga masih 0, isi harga agar tampil benar di KostIn.' : '.'}</p>
            {err && <p className="ks-err">{err}</p>}
            <div className="ks-onb-foot"><button className="ks-link" onClick={back}>Kembali</button><button className="ks-btn" onClick={next}>Lanjut</button></div>
          </>
        )}

        {view === 'steps' && step === 4 && (
          <>
            <h2>Preferensi</h2>
            <p className="ks-lead">Atur tampilan dan kebijakan penagihan.</p>
            <div className="ks-f"><b>Tema warna</b>
              <div className="ks-swatches">
                {THEMES.map((t) => <button key={t.id} type="button" aria-label={t.name} aria-pressed={theme === t.id} className={theme === t.id ? 'on' : ''} style={{ background: t.c }} onClick={() => setTheme(t.id)} />)}
              </div>
            </div>
            <div className="ks-f"><b>Mode</b>
              <div className="ks-seg">
                {([['auto', 'Ikuti perangkat'], ['light', 'Terang'], ['dark', 'Gelap']] as const).map(([id, l]) => <button key={id} type="button" className={mode === id ? 'on' : ''} onClick={() => setMode(id)}>{l}</button>)}
              </div>
            </div>
            <h5 className="ks-sec">Penagihan</h5>
            <label className="ks-check"><input type="checkbox" checked={reward} onChange={(e) => setReward(e.target.checked)} /><span>Beri apresiasi Rp 25.000 untuk penghuni yang membayar tepat waktu (bisa diubah/dimatikan nanti)</span></label>
            <div className="ks-note green"><Hand size={20} /><span>KostPro tidak memiliki fitur denda/bunga keterlambatan. Pengingat dikirim dengan bahasa sopan.</span></div>
            <h5 className="ks-sec">Keamanan (opsional)</h5>
            <div className="ks-2">
              <label className="ks-f"><b>PIN 4–6 digit <em>(opsional)</em></b><input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPinV(e.target.value.replace(/\D/g, ''))} /></label>
              <label className="ks-f"><b>Ulangi PIN <em>(opsional)</em></b><input type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} /></label>
            </div>
            <p className="ks-hint">PIN mengunci aplikasi di perangkat ini saja.</p>
            {err && <p className="ks-err">{err}</p>}
            <div className="ks-onb-foot">
              <button className="ks-link" onClick={back}>Kembali</button>
              <button className="ks-btn" disabled={busy} onClick={() => void finish()}><Check size={18} /> {busy ? 'Menyimpan…' : 'Selesai'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
