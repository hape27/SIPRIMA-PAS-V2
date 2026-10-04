# SIPRIMA PAS — Local Browser Offline

## Persyaratan
- Windows 10/11 64-bit
- Docker Desktop + WSL 2 aktif
- Internet hanya diperlukan saat pertama kali Docker mengunduh image/build dependency
- Setelah image tersedia, aplikasi dan database berjalan lokal.

## Menjalankan
1. Ekstrak ZIP ke folder, misalnya `C:\SIPRIMA-PAS`.
2. Buka Docker Desktop dan tunggu Engine Running.
3. Klik dua kali `START-SIPRIMA-LOCAL.bat`.
4. Browser membuka `http://localhost`.

## Login awal lokal
- Email: `admin@siprima.local`
- Password: `SIPRIMA-Local-2026!`

Ganti password dan secret di `.env` sebelum dipakai bersama atau dipindahkan ke server.

## Catatan
Versi ini mempertahankan backend PostgreSQL lokal, import Excel, monitoring, rekap, analisis, laporan pimpinan, dan manajemen obat. Data database disimpan pada Docker volume lokal.
