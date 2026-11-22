import './kostin.css';
import BottomNav from '@/components/BottomNav';

export const metadata = { title: 'KostIn — Cari Kost. Pilih Kamar. Langsung Booking.' };

export default function KostInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kostin-root">
      {children}
      <BottomNav mode="kostin" />
    </div>
  );
}
