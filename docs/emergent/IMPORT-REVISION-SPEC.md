# Import Excel — Duplicate dan Revision

## Alur
1. Pilih UPT.
2. Pilih periode.
3. Upload file.
4. Deteksi report type.
5. Preview sheet/row/header.
6. Validasi.
7. Hitung SHA-256.
8. Tentukan status: NEW / DUPLICATE / REVISION.
9. Commit hanya setelah konfirmasi.

## Rules
### NEW
Jika belum ada active submission untuk UPT + periode + report type: import sebagai data baru.

### DUPLICATE
Jika SHA-256 identik dengan file yang sudah pernah diimport: tolak dan tampilkan referensi import sebelumnya.

### REVISION
Jika UPT + periode + report type sama tetapi hash berbeda: jangan menambah angka di atas versi lama. Tampilkan banner REVISION dan minta konfirmasi.

Setelah disetujui:
- versi baru menjadi ACTIVE;
- versi lama menjadi SUPERSEDED/ARCHIVED;
- source file lama tetap dipertahankan;
- provenance tetap tersedia;
- dashboard/reka/analisis hanya membaca versi ACTIVE.

## Medicine caution
Manajemen Obat memiliki transaksi yang perlu ditangani khusus karena tidak semua transaksi memiliki sourceRecord langsung. Jangan menggunakan mass-delete tanpa strategi penggantian versi yang teruji.
