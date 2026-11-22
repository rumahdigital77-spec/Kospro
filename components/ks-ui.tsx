'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <button className="ks-scrim" aria-label="Tutup" onClick={onClose} />
      <div className="ks-sheet" role="dialog" aria-label={title}>
        <div className="ks-sheet-head"><h3>{title}</h3><button className="ks-x" aria-label="Tutup" onClick={onClose}><X size={22} /></button></div>
        <div className="ks-sheet-body">{children}</div>
      </div>
    </>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="ks-pagehead">
      <div><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div>
      {children ? <div className="ks-pagehead-actions">{children}</div> : null}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; n?: number }[] }) {
  return (
    <div className="ks-tabs" role="tablist">
      {items.map((i) => (
        <button key={i.id} role="tab" aria-selected={value === i.id} className={value === i.id ? 'on' : ''} onClick={() => onChange(i.id)}>
          {i.label}{typeof i.n === 'number' ? <span>{i.n}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, children }: { icon: React.ReactNode; title: string; text?: string; children?: React.ReactNode }) {
  return <div className="ks-empty">{icon}<b>{title}</b>{text ? <p>{text}</p> : null}{children}</div>;
}
