# SIPRIMA PAS V1.0 Release Candidate — Hardening Update

Tanggal: 2026-10-02

## Perbaikan utama
1. Backend Docker sekarang melakukan build TypeScript sebelum runtime.
2. Runtime menggunakan `prisma migrate deploy`, bukan `db push`.
3. JWT secret, DATABASE_URL, dan CORS_ORIGIN wajib dikonfigurasi; JWT minimal 32 karakter.
4. CORS tidak lagi fallback ke wildcard.
5. API mendapat rate limit global; login mendapat limit lebih ketat.
6. Import commit sekarang atomic dengan Prisma transaction. Jika ada error validasi, perubahan domain/import dibatalkan seluruhnya.
7. File upload yang tersimpan dihapus jika commit gagal.
8. Import Manajemen Obat sudah dikenali oleh Import Wizard.
9. Parser template obat mendukung MASTER_OBAT, PENERIMAAN, OBAT_MASUK, DISTRIBUSI, OBAT_KELUAR, SALDO_AWAL.
10. Validasi stok keluar/distribusi dilakukan di backend dan dibungkus transaksi untuk mencegah overselling karena request bersamaan.
11. Validasi satuan, obat aktif, UPT aktif, jumlah positif, tanggal, kedaluwarsa, dan batas stok diperketat.
12. Seed admin tidak lagi menyimpan password default di source; gunakan ADMIN_EMAIL dan ADMIN_PASSWORD.
13. Form login frontend tidak lagi diprefill dengan kredensial default.
14. `MEDICINE` ditambahkan sebagai jenis report dan dapat dibuat otomatis saat import jika belum ada.
15. Source record memakai payload JSON-safe untuk nilai tanggal.

## Semantik stok V1.1
- PENERIMAAN dan OBAT_MASUK adalah dua kategori transaksi masuk yang berbeda. Kejadian yang sama tidak boleh dicatat pada keduanya.
- DISTRIBUSI mengurangi stok UPT asal dan menambah stok UPT tujuan.
- OBAT_KELUAR mengurangi stok UPT.
- SALDO_AWAL menjadi saldo acuan dan tidak boleh negatif.

## Verifikasi yang berhasil dilakukan di lingkungan build saat ini
- Pemeriksaan sintaks TypeScript server/frontend berjalan sampai tahap resolusi dependensi; tidak ditemukan syntax error setelah perbaikan.
- Struktur Dockerfile diperiksa ulang.
- Sumber tidak dapat menjalani full `npm build`/Vitest karena instalasi dependency di lingkungan audit timeout dan `node_modules` belum tersedia.
- Docker runtime tidak tersedia di lingkungan audit ini, sehingga status RC belum boleh disebut sebagai production-verified.
