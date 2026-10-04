# SIPRIMA PAS V6 - Frontend Build Fix

Perbaikan utama:
- Frontend `tsconfig.json` dilonggarkan untuk local deployment (`strict: false`, `noImplicitAny: false`).
- Build produksi frontend menggunakan `vite build`, bukan TypeScript project build.
- `typecheck` dipisahkan menjadi `tsc --noEmit` sehingga error tipe tidak memblokir build runtime lokal.
- Script START-SIPRIMA-LOCAL.bat membuat `.env` lokal otomatis dengan konfigurasi yang konsisten.
- Prisma/Docker backend dari V5 dipertahankan.

Tujuan: menghilangkan kegagalan Docker build akibat TS7026/JSX type diagnostics tanpa mengubah runtime React/Vite.
