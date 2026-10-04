# SIPRIMA PAS — Final Build

SIPRIMA PAS adalah aplikasi pendukung Kanwil Ditjenpas Banten untuk mengimpor laporan kesehatan UPT berbasis Excel, memvalidasi dan menormalisasi data, mengonsolidasikan 12 UPT, memantau kelengkapan laporan, menganalisis tren, dan menghasilkan laporan pimpinan.

## Alur utama
1. Login
2. Pilih periode + UPT
3. Import Excel
4. Preview & validasi
5. Konfirmasi simpan
6. Rekap 12 UPT
7. Monitoring cut-off tanggal 25
8. Analisis & grafik
9. Laporan pimpinan (print/PDF dan Excel)
10. Audit log, backup, administrasi

## Teknologi
React + Vite + TypeScript, Express + TypeScript, PostgreSQL, Prisma, Docker.

## Pengembangan lokal
Backend:
- `cd backend`
- `npm install`
- salin `.env.example` menjadi `.env` dan isi `DATABASE_URL`, `JWT_SECRET`
- `npx prisma db push`
- `npm run seed`
- `npm run dev`

Frontend:
- `cd frontend`
- `npm install`
- `npm run dev`

## Production Docker
1. Salin `.env.production.example` menjadi `.env`.
2. Isi password PostgreSQL dan JWT_SECRET dengan nilai acak yang kuat.
3. `docker compose -f docker-compose.production.yml up -d --build`
4. Jangan mengandalkan kredensial default. Buat/atur akun administrator secara aman sebelum penggunaan.

## Laporan PDF
Menu Laporan Pimpinan membuka halaman laporan agregat. Gunakan dialog Print browser → Save as PDF.

## Backup
`DATABASE_URL=... ./scripts/backup.sh`

Restore:
`DATABASE_URL=... ./scripts/restore.sh backups/nama-file.dump`

## Keamanan
- Password di-hash bcrypt.
- JWT 8 jam.
- Helmet, CORS, rate limit login.
- RBAC ADMIN/OPERATOR/LEADERSHIP.
- File sumber disimpan berdasarkan SHA-256.
- Audit log untuk login, import, report, dan administrasi.
- Laporan pimpinan hanya agregat.

## Catatan production
Sebelum go-live, ubah password admin default, JWT secret, database password, batasi CORS ke domain resmi, aktifkan HTTPS/reverse proxy, lakukan backup terjadwal, dan uji restore.
