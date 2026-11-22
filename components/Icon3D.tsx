import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

export type Tone = 'blue' | 'violet' | 'amber' | 'teal' | 'rose' | 'green' | 'slate';
const TONES: Record<Tone, [string, string, string]> = {
  blue: ['#7dd3fc', '#2563eb', '#1e3a8a'],
  violet: ['#c4b5fd', '#7c3aed', '#4c1d95'],
  amber: ['#fde68a', '#f59e0b', '#92400e'],
  teal: ['#99f6e4', '#0d9488', '#115e59'],
  rose: ['#fda4af', '#e11d48', '#881337'],
  green: ['#bbf7d0', '#16a34a', '#14532d'],
  slate: ['#cbd5e1', '#475569', '#0f172a'],
};

export default function Icon3D({ icon: I, tone = 'blue', size = 44 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  const [a, b, c] = TONES[tone];
  const style = { width: size, height: size, '--a': a, '--b': b, '--c': c } as CSSProperties;
  return (
    <span className="i3d" style={style} aria-hidden>
      <I size={Math.round(size * 0.5)} strokeWidth={2.4} />
    </span>
  );
}
