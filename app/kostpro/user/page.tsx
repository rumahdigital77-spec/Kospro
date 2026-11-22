'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Akun & pembuatan database kini ditangani alur daftar (layout) dan halaman Pengaturan.
export default function UserRedirect() {
  const r = useRouter();
  useEffect(() => { r.replace('/kostpro/pengaturan'); }, [r]);
  return null;
}
