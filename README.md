# KostIn × KostPro — satu aplikasi, dua menu utama

- `/` pilih menu: **KostIn** (marketplace tamu) atau **KostPro** (manajemen pemilik)
- `/kostin/...` beranda, detail kost, booking, partner
- `/kostpro/...` dashboard, kamar, tagihan, booking, kwitansi, CCTV, laporan, keuangan, pengaturan, user & akses
- KostPro memakai tampilan KosKu: menu bawah Beranda · Kamar · Tagihan · Penghuni · Lainnya; alur daftar 4 langkah (identitas → properti & kamar → preferensi), mode data contoh, dan pemulihan dari file cadangan.
- Kamar berstatus Kosong otomatis tampil di KostIn (`/api/kostin/inventory`); booking dari KostIn langsung muncul di Penghuni → Calon & booking. Data contoh tidak pernah tampil di KostIn.

## Database: hanya di Vercel (Postgres/Neon)
1. Push folder ini ke GitHub, lalu **Import** di Vercel.
2. Di project Vercel: **Storage → Create Database → Neon (Postgres)** → Connect ke project ini.
   Vercel otomatis mengisi `DATABASE_URL` / `POSTGRES_URL`.
3. Deploy. Semua tabel dibuat otomatis pada request pertama (lihat `lib/db.ts`).
4. Buka `/kostpro` → ikuti alur daftar (akun, properti, kamar dibuat otomatis).

Lokal: `vercel env pull .env.local` lalu `npm install && npm run dev`.

Supabase tidak dipakai lagi. Login memakai tabel `users` + cookie sesi (`lib/auth.ts`).
