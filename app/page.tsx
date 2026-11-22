import Link from 'next/link';
import { Building2, ArrowUpRight, KeyRound } from 'lucide-react';
import Art3D from '@/components/Art3D';
import Icon3D from '@/components/Icon3D';

export default function Landing() {
  return (
    <main className="lp">
      <div className="lp-blob b1" /><div className="lp-blob b2" />
      <header className="lp-head">
        <img src="/icon-3d.svg" alt="" width={64} height={64} />
        <h1>Kost<span>In</span> <i>×</i> Kost<span>Pro</span></h1>
        <p>Satu aplikasi untuk mencari kost dan mengelola kost.</p>
      </header>
      <section className="lp-cards">
        <Link href="/kostin" className="lp-card">
          <Art3D name="search" size={76} />
          <h2>KostIn</h2>
          <p>Marketplace untuk tamu: cari kost, pilih kamar, langsung booking.</p>
          <span className="lp-go">Buka marketplace <ArrowUpRight size={18} /></span>
        </Link>
        <Link href="/kostpro" className="lp-card">
          <Art3D name="home" size={76} />
          <h2>KostPro</h2>
          <p>Untuk pemilik: kamar, penghuni, tagihan, keuangan, dan booking masuk.</p>
          <span className="lp-go">Buka manajemen <ArrowUpRight size={18} /></span>
        </Link>
      </section>
      <footer className="lp-foot"><Icon3D icon={Building2} tone="slate" size={26} /><Icon3D icon={KeyRound} tone="amber" size={26} /></footer>
    </main>
  );
}
