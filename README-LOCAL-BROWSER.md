# SIPRIMA PAS — Local Browser / Offline-First

Aplikasi berjalan lokal dan diakses melalui browser, tanpa hosting internet saat digunakan.

Arsitektur:
Browser -> Frontend (Nginx) -> Backend -> PostgreSQL lokal

## Prasyarat satu kali
- Windows 10/11 64-bit
- Docker Desktop dengan WSL 2 backend aktif
- Internet hanya diperlukan saat pertama kali menarik image/build dependency. Setelah image tersedia, aplikasi dapat dijalankan tanpa internet.

## Jalankan
1. Pastikan Docker Desktop sudah Running.
2. Klik `START-SIPRIMA-LOCAL.bat`.
3. Buka `http://localhost` di Chrome/Edge.
4. Untuk menghentikan, klik `STOP-SIPRIMA-LOCAL.bat`.

## Data
Database PostgreSQL dan upload tersimpan pada Docker named volumes, sehingga data tetap ada setelah container dihentikan.

## Catatan
Paket ini mempertahankan arsitektur produksi agar fitur import, audit, laporan, dan manajemen obat tetap sama. Ini bukan aplikasi statis HTML; backend dan database tetap berjalan lokal.
