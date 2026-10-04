# SIPRIMA PAS — Paket Handoff untuk Pengembangan Web

## Tujuan
Paket ini adalah source baseline SIPRIMA PAS Tahap 3 yang sudah dibersihkan dari `node_modules`, build cache, upload lokal, dan file `.env` berisi konfigurasi lokal. Gunakan source ini sebagai baseline; jangan membangun aplikasi baru dari nol.

## Identitas resmi
**SIPRIMA PAS**
**Sistem Informasi Pelaporan, Rujukan, Integrasi, Monitoring, dan Administrasi Pemasyarakatan**

Tagline: **Satu Data untuk Rekap, Analisis, dan Pelaporan.**

## Prinsip pengembangan
1. Pertahankan fungsi baseline yang sudah ada.
2. Jangan menghapus menu/modul hanya karena UI belum sempurna.
3. Semua data pelaporan memakai konteks UPT + periode + jenis laporan.
4. Dashboard, Rekapitulasi, Analisis, dan Laporan Pimpinan membaca sumber data yang sama.
5. Semua modul utama mendukung search/filter/sort kontekstual.
6. Dokumen pendukung terhubung langsung ke data/transaksi.
7. Dokumen dapat berstatus Wajib atau Opsional sesuai aturan modul/transaksi.
8. Import Excel harus aman terhadap duplikasi dan revisi.
9. Perubahan manual penting harus memiliki alasan dan audit trail.
10. Jangan menggunakan data pasien/pegawai nyata dalam pengujian atau demo.

## Struktur menu resmi
1. Dashboard
2. Import Excel
3. Monitoring Laporan
4. Rekapitulasi
5. KIE
6. Penyakit Menular
7. PTM
8. Paliatif
9. Kematian
10. Rujukan
11. KIA (Ibu Hamil, Melahirkan dan Menyusui)
12. BJMHS
13. Sarana Prasarana Klinik
14. Cek Kesehatan Pegawai
15. Manajemen Obat
16. Analisis
17. Laporan Pimpinan
18. Administrasi
19. Audit

## Dokumen spesifikasi
- `docs/emergent/EMERGENT-IMPLEMENTATION-SPEC.md`
- `docs/emergent/MODUL-MAPPING-AND-FILTER-SPEC.md`
- `docs/emergent/DOCUMENT-SUPPORT-SPEC.md`
- `docs/emergent/IMPORT-REVISION-SPEC.md`
- `docs/emergent/EMERGENT-PROMPT.md`

## Catatan instalasi
- Backend: Node.js + Prisma + PostgreSQL.
- Frontend: Vite/React sesuai package baseline.
- Jangan menyalin `node_modules` dari perangkat lain.
- Salin `backend/.env.example` menjadi `backend/.env`, lalu isi kredensial lingkungan target.
- Jalankan migrasi Prisma sesuai schema/migration baseline sebelum menjalankan aplikasi.
