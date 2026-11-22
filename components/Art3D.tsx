'use client';
import { useId } from 'react';

export type ArtName =
  | 'home' | 'rooms' | 'bill' | 'people' | 'gear' | 'grid' | 'wallet' | 'doc' | 'megaphone' | 'chart'
  | 'checkin' | 'checkout' | 'backup' | 'search' | 'calendar' | 'store' | 'plus';

// Ikon ilustrasi 3D (SVG inline, tanpa file gambar) untuk menu KostPro & KostIn.
export default function Art3D({ name, size = 40, className = '' }: { name: ArtName; size?: number; className?: string }) {
  const uid = 'a' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const f = (k: string) => `url(#${uid}${k})`;
  const Grad = ({ k, a, b, v = true }: { k: string; a: string; b: string; v?: boolean }) => (
    <linearGradient id={uid + k} x1="0" y1="0" x2={v ? 0 : 1} y2={v ? 1 : 1}><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
  );
  const Shadow = () => <ellipse cx="32" cy="59" rx="18" ry="3" fill="#0f172a" opacity=".16" />;
  const Shine = ({ d }: { d: string }) => <path d={d} fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="2.4" strokeLinecap="round" />;
  let body: React.ReactNode = null;

  switch (name) {
    case 'home':
      body = (<>
        <defs><Grad k="r" a="#34d399" b="#047857" /><Grad k="w" a="#ffffff" b="#cbd5e1" /><Grad k="d" a="#10b981" b="#047857" /></defs>
        <Shadow />
        <rect x="14" y="30" width="36" height="26" rx="5" fill={f('w')} />
        <rect x="28" y="38" width="10" height="18" rx="3" fill={f('d')} /><circle cx="35" cy="47" r="1.4" fill="#fff" />
        <path d="M6 31 L32 8 L58 31 Q59 34 55 34 L9 34 Q5 34 6 31Z" fill={f('r')} />
        <Shine d="M13 29 L31 13" />
      </>); break;
    case 'rooms':
      body = (<>
        <defs><Grad k="b" a="#a78bfa" b="#5b21b6" /><Grad k="g" a="#fde68a" b="#f59e0b" /><Grad k="d" a="#ede9fe" b="#c4b5fd" /></defs>
        <Shadow />
        <rect x="14" y="8" width="36" height="48" rx="6" fill={f('b')} />
        {[0, 1, 2].flatMap((r) => [0, 1].map((c) => <rect key={r + '' + c} x={20 + c * 13} y={14 + r * 11} width="9" height="8" rx="2" fill={f('g')} />))}
        <rect x="27" y="45" width="10" height="11" rx="3" fill={f('d')} />
        <Shine d="M18 14 L18 40" />
      </>); break;
    case 'bill':
      body = (<>
        <defs><Grad k="p" a="#ffffff" b="#e2e8f0" /><Grad k="o" a="#fb923c" b="#ea580c" /><Grad k="k" a="#f472b6" b="#be185d" /></defs>
        <Shadow />
        <path d="M16 6 H48 V54 L43 50 L38 54 L33 50 L28 54 L23 50 L16 54Z" fill={f('p')} stroke="#cbd5e1" strokeWidth="1" />
        <rect x="22" y="14" width="20" height="4" rx="2" fill={f('o')} /><rect x="22" y="23" width="14" height="4" rx="2" fill={f('k')} />
        <rect x="22" y="32" width="20" height="4" rx="2" fill="#cbd5e1" />
        <circle cx="45" cy="42" r="9" fill={f('o')} /><text x="45" y="46" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">Rp</text>
      </>); break;
    case 'people':
      body = (<>
        <defs><Grad k="a" a="#60a5fa" b="#1d4ed8" /><Grad k="b" a="#fdba74" b="#ea580c" /><Grad k="h" a="#fde7d3" b="#f3b98c" /></defs>
        <Shadow />
        <path d="M6 54 Q6 36 22 36 Q38 36 38 54Z" fill={f('a')} /><circle cx="22" cy="24" r="9" fill={f('h')} />
        <path d="M28 54 Q28 38 43 38 Q58 38 58 54Z" fill={f('b')} /><circle cx="43" cy="27" r="8" fill={f('h')} />
        <Shine d="M10 48 Q12 41 20 40" />
      </>); break;
    case 'gear':
      body = (<>
        <defs><Grad k="g" a="#5eead4" b="#0f766e" /></defs>
        <Shadow />
        <circle cx="32" cy="31" r="21" fill="none" stroke={f('g')} strokeWidth="9" strokeDasharray="7.2 6.2" />
        <circle cx="32" cy="31" r="18" fill={f('g')} /><circle cx="32" cy="31" r="8" fill="#134e4a" /><circle cx="32" cy="31" r="4.5" fill="#99f6e4" />
        <Shine d="M18 22 Q22 15 30 13" />
      </>); break;
    case 'grid':
      body = (<>
        <defs><Grad k="a" a="#93c5fd" b="#2563eb" /><Grad k="b" a="#fcd34d" b="#d97706" /><Grad k="c" a="#f9a8d4" b="#db2777" /><Grad k="d" a="#86efac" b="#16a34a" /></defs>
        <Shadow />
        <rect x="8" y="8" width="22" height="22" rx="7" fill={f('a')} /><rect x="34" y="8" width="22" height="22" rx="7" fill={f('b')} />
        <rect x="8" y="34" width="22" height="22" rx="7" fill={f('c')} /><rect x="34" y="34" width="22" height="22" rx="7" fill={f('d')} />
        <Shine d="M13 14 L13 22" />
      </>); break;
    case 'wallet':
      body = (<>
        <defs><Grad k="w" a="#60a5fa" b="#1e40af" /><Grad k="p" a="#fff" b="#dbeafe" /></defs>
        <Shadow />
        <rect x="14" y="10" width="30" height="16" rx="3" fill={f('p')} transform="rotate(-8 29 18)" />
        <rect x="6" y="20" width="52" height="34" rx="10" fill={f('w')} />
        <rect x="38" y="31" width="20" height="13" rx="6.5" fill="#1d4ed8" /><circle cx="46" cy="37.5" r="3.2" fill="#fff" />
        <Shine d="M13 28 L28 26" />
      </>); break;
    case 'doc':
      body = (<>
        <defs><Grad k="p" a="#ffffff" b="#e2e8f0" /><Grad k="v" a="#c4b5fd" b="#6d28d9" /></defs>
        <Shadow />
        <path d="M14 6 H38 L50 18 V54 Q50 58 46 58 H18 Q14 58 14 54Z" fill={f('p')} stroke="#cbd5e1" />
        <path d="M38 6 V16 Q38 18 40 18 H50Z" fill={f('v')} />
        <rect x="20" y="26" width="24" height="4" rx="2" fill={f('v')} /><rect x="20" y="35" width="24" height="4" rx="2" fill="#cbd5e1" /><rect x="20" y="44" width="14" height="4" rx="2" fill="#cbd5e1" />
      </>); break;
    case 'megaphone':
      body = (<>
        <defs><Grad k="o" a="#fdba74" b="#ea580c" /><Grad k="r" a="#f87171" b="#b91c1c" /></defs>
        <Shadow />
        <path d="M10 26 H22 L48 10 V50 L22 38 H10 Q6 38 6 34 V30 Q6 26 10 26Z" fill={f('o')} />
        <rect x="46" y="8" width="7" height="44" rx="3.5" fill={f('r')} />
        <path d="M16 38 L20 54 Q21 57 24 57 H26 Q29 57 28 54 L25 40Z" fill={f('r')} />
        <Shine d="M12 30 L22 30" />
      </>); break;
    case 'chart':
      body = (<>
        <defs><Grad k="p" a="#ffffff" b="#e2e8f0" /><Grad k="k" a="#f472b6" b="#be185d" /><Grad k="v" a="#a78bfa" b="#5b21b6" /></defs>
        <Shadow />
        <rect x="12" y="8" width="40" height="48" rx="8" fill={f('p')} stroke="#cbd5e1" />
        <rect x="22" y="4" width="20" height="9" rx="4" fill={f('k')} />
        <rect x="18" y="38" width="8" height="12" rx="2" fill={f('k')} /><rect x="29" y="28" width="8" height="22" rx="2" fill={f('v')} /><rect x="40" y="20" width="8" height="30" rx="2" fill={f('k')} />
      </>); break;
    case 'checkin':
    case 'checkout': {
      const out = name === 'checkout';
      body = (<>
        <defs><Grad k="g" a={out ? '#fdba74' : '#6ee7b7'} b={out ? '#c2410c' : '#047857'} /></defs>
        <Shadow />
        <rect x="10" y="8" width="44" height="48" rx="11" fill={f('g')} />
        <path d="M38 14 H44 Q47 14 47 17 V47 Q47 50 44 50 H38" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d={out ? 'M34 32 H16 M23 25 L16 32 L23 39' : 'M16 32 H34 M27 25 L34 32 L27 39'} fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <Shine d="M15 16 Q15 13 19 13" />
      </>); break; }
    case 'backup':
      body = (<>
        <defs><Grad k="c" a="#bae6fd" b="#0ea5e9" /><Grad k="a" a="#34d399" b="#047857" /></defs>
        <Shadow />
        <path d="M18 42 Q6 42 6 32 Q6 23 16 22 Q19 10 32 10 Q45 10 47 22 Q58 23 58 33 Q58 42 48 42Z" fill={f('c')} />
        <circle cx="32" cy="42" r="13" fill={f('a')} />
        <path d="M32 34 V49 M26 43 L32 49 L38 43" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Shine d="M14 27 Q18 19 28 17" />
      </>); break;
    case 'search':
      body = (<>
        <defs><Grad k="g" a="#e0f2fe" b="#38bdf8" /><Grad k="h" a="#fdba74" b="#ea580c" /></defs>
        <Shadow />
        <path d="M40 40 L54 54" stroke={f('h')} strokeWidth="9" strokeLinecap="round" />
        <circle cx="26" cy="26" r="17" fill="#0e7490" /><circle cx="26" cy="26" r="13" fill={f('g')} />
        <Shine d="M17 22 Q19 15 27 14" />
      </>); break;
    case 'calendar':
      body = (<>
        <defs><Grad k="p" a="#ffffff" b="#e2e8f0" /><Grad k="r" a="#f87171" b="#b91c1c" /><Grad k="t" a="#2dd4bf" b="#0f766e" /></defs>
        <Shadow />
        <rect x="8" y="10" width="48" height="46" rx="10" fill={f('p')} stroke="#cbd5e1" />
        <path d="M8 22 Q8 10 18 10 H46 Q56 10 56 22Z" fill={f('r')} />
        <rect x="18" y="5" width="5" height="12" rx="2.5" fill="#7f1d1d" /><rect x="41" y="5" width="5" height="12" rx="2.5" fill="#7f1d1d" />
        {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={r + '' + c} cx={19 + c * 13} cy={31 + r * 9} r="3" fill={r === 1 && c === 1 ? f('t') : '#cbd5e1'} />))}
      </>); break;
    case 'store':
      body = (<>
        <defs><Grad k="a" a="#fdba74" b="#ea580c" /><Grad k="w" a="#ffffff" b="#e2e8f0" /><Grad k="b" a="#60a5fa" b="#1d4ed8" /></defs>
        <Shadow />
        <rect x="10" y="28" width="44" height="28" rx="4" fill={f('w')} /><rect x="26" y="38" width="12" height="18" rx="2" fill={f('b')} />
        <path d="M8 12 H56 L60 26 Q60 32 54 32 Q49 32 48 28 Q47 32 42 32 Q37 32 36 28 Q35 32 30 32 Q25 32 24 28 Q23 32 18 32 Q12 32 10 28 L4 26Z" fill={f('a')} />
        <path d="M20 12 L18 30 M32 12 V30 M44 12 L46 30" stroke="#fff" strokeOpacity=".7" strokeWidth="3" />
      </>); break;
    case 'plus':
      body = (<>
        <defs><Grad k="o" a="#fcd34d" b="#d97706" /></defs>
        <Shadow />
        <rect x="26" y="6" width="12" height="50" rx="6" fill={f('o')} /><rect x="8" y="24" width="48" height="12" rx="6" fill={f('o')} />
        <Shine d="M30 12 V22" />
      </>); break;
  }
  return <svg className={'a3d ' + className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">{body}</svg>;
}
