# SIPRIMA PAS — Finalization Handoff — 2026-10-04

## Yang diselesaikan pada pass ini
- Mempertahankan baseline React/Vite + Express/TypeScript + PostgreSQL/Prisma.
- Menambahkan endpoint operasional terpadu `/api/module-data` untuk KIE, Penyakit Menular, PTM, Paliatif, Kematian, Rujukan, KIA, BJMHS, dan Sarana Prasarana.
- Menambahkan 19 menu UI sesuai spesifikasi V1, termasuk Audit.
- Menambahkan filter UPT/periode/pencarian pada halaman operasional baru.
- Menambahkan export CSV dari dataset hasil filter pada halaman operasional baru.
- Menjaga domain database terpisah; endpoint hanya menyatukan bentuk penyajian.
- Memperbarui go-live checklist agar deployment production menggunakan `prisma migrate deploy`.

## Verifikasi yang dilakukan
- Parser/syntax TypeScript backend dan frontend dijalankan dengan TypeScript compiler tanpa syntax error.
- Source diperiksa untuk secret literal dan tidak ditemukan file `.env` production/local yang ikut terpaket.
- Full dependency installation tidak dapat diselesaikan pada environment audit ini; `npm ci` terhenti/timeout.
- Karena dependency, PostgreSQL, dan Docker runtime tidak tersedia secara operasional di environment audit, full build, migration deploy, integration test, dan browser E2E belum dapat dinyatakan production-verified.

## Catatan penting sebelum go-live
Spesifikasi V1 juga menetapkan semantic revision untuk import: hash sama = DUPLICATE, UPT+periode+report type dengan hash berbeda = REVISION, versi terbaru ACTIVE, versi lama SUPERSEDED/ARCHIVED, tanpa double count. Baseline database saat ini belum memiliki model versioning aktif untuk seluruh domain, sehingga mekanisme tersebut harus divalidasi di environment PostgreSQL sebelum dinyatakan selesai.

## Status
**Release candidate / production hardening handoff**, bukan klaim bahwa deployment production sudah berhasil.

Deployment final harus dilanjutkan dengan:
1. `npm ci` backend/frontend.
2. `npx prisma generate`.
3. `npx prisma migrate deploy`.
4. `npm run build` backend dan frontend.
5. `npm test` backend.
6. Seed administrator menggunakan secret environment.
7. Functional test semua 19 menu dan seluruh template Excel.
8. Uji duplicate/revision dan pembuktian tidak terjadi double count.
9. Uji backup + restore.
10. Uji HTTPS, CORS domain resmi, upload storage, dan RBAC pada server production.
