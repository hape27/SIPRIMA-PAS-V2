# SIPRIMA PAS — Go-Live Checklist

## Infrastruktur
- [ ] Server production tersedia.
- [ ] Docker dan Docker Compose tersedia.
- [ ] DNS/domain disiapkan.
- [ ] HTTPS/TLS aktif.
- [ ] Firewall hanya membuka port yang diperlukan.
- [ ] PostgreSQL tidak diekspos ke internet.

## Konfigurasi
- [ ] `POSTGRES_PASSWORD` diganti dengan secret acak.
- [ ] `JWT_SECRET` diganti dengan secret acak.
- [ ] `CORS_ORIGIN` dibatasi ke domain aplikasi.
- [ ] `UPLOAD_DIR` berada pada storage yang dibackup.
- [ ] Password admin default diganti.

## Database
- [ ] `prisma db push` berhasil pada deployment pertama.
- [ ] Seed berhasil.
- [ ] 12 UPT muncul.
- [ ] Periode bulanan 2026 dan semester 2026 tersedia.
- [ ] Backup pertama dibuat.
- [ ] Restore backup diuji.

## Functional test
- [ ] Login ADMIN.
- [ ] Login OPERATOR.
- [ ] Login LEADERSHIP.
- [ ] Import file PTM.
- [ ] Preview PTM.
- [ ] Validasi warning/error.
- [ ] Simpan PTM.
- [ ] Import seluruh tipe laporan.
- [ ] Rekap 12 UPT sesuai Excel pembanding.
- [ ] Monitoring cut-off tanggal 25 benar.
- [ ] Analisis tren benar.
- [ ] Laporan pimpinan dapat dicetak ke PDF.
- [ ] Laporan Excel dapat diunduh.
- [ ] Audit log mencatat aktivitas.

## Data governance
- [ ] Detail WBP tidak diberikan ke role pimpinan.
- [ ] File sumber tidak dihapus saat data diperbaiki.
- [ ] Koreksi dilakukan melalui proses terkontrol.
- [ ] Export detail dibatasi role.
