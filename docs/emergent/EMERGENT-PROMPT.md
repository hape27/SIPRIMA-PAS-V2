# Prompt Handoff untuk Emergent

Bangun dan lanjutkan aplikasi **SIPRIMA PAS** dari source baseline yang diberikan. Jangan membuat aplikasi baru dari nol dan jangan menghapus fungsi baseline.

Identitas:
SIPRIMA PAS — Sistem Informasi Pelaporan, Rujukan, Integrasi, Monitoring, dan Administrasi Pemasyarakatan.
Tagline: Satu Data untuk Rekap, Analisis, dan Pelaporan.

Pertahankan struktur data dan fitur yang sudah ada, lalu sempurnakan menjadi 19 menu resmi:
Dashboard, Import Excel, Monitoring Laporan, Rekapitulasi, KIE, Penyakit Menular, PTM, Paliatif, Kematian, Rujukan, KIA, BJMHS, Sarana Prasarana Klinik, Cek Kesehatan Pegawai, Manajemen Obat, Analisis, Laporan Pimpinan, Administrasi, Audit.

Kebutuhan paling penting:
1. Semua modul pelaporan mengikuti format laporan UPT yang menjadi sumber baseline.
2. Penyakit Menular menggunakan sheet `Rekapitulasi (Otomatis)` sebagai sumber agregat sesuai spesifikasi.
3. PTM dinormalisasi menjadi disease_group, disease_name, case_status, case_count.
4. Semua modul memiliki search/filter/sort kontekstual.
5. Filter harus memengaruhi cards, tabel, grafik, total, pagination, dan export pada halaman tersebut.
6. Contoh wajib: UPT A + Penyakit Menular + Juni–Oktober 2026 + TBC/HIV/Hepatitis menghasilkan hanya data tersebut beserta total per penyakit.
7. Semua jenis pelaporan dapat disajikan dengan detail berdasarkan filter yang relevan.
8. Dokumen pendukung terhubung ke record/transaksi. Status dokumen Wajib/Opsional/Tidak diperlukan.
9. Kematian dan Manajemen Obat harus mendukung dokumen administrasi yang sesuai.
10. Import harus membedakan NEW, DUPLICATE berdasarkan hash, dan REVISION berdasarkan UPT+periode+report type dengan file berbeda.
11. Revisi harus menjaga histori dan mencegah double count.
12. Dashboard, Rekapitulasi, Analisis, dan Laporan Pimpinan harus membaca sumber data aktif yang sama.
13. Koreksi manual penting membutuhkan alasan dan audit trail before/after.
14. Jangan commit secrets atau data nyata.

Sebelum mengubah kode, buat audit terhadap baseline: fitur yang sudah ada, fitur yang kurang, schema yang ada, route yang ada, dan risiko migrasi. Lakukan perubahan bertahap dan jalankan typecheck/build/migration validation setelah setiap tahap. Jangan menyatakan berhasil jika build atau test belum benar-benar dijalankan.

Output akhir yang diharapkan: aplikasi web SIPRIMA PAS yang dapat digunakan untuk input manual, import Excel pelaporan UPT, monitoring, rekap detail, filter penyajian pimpinan, dokumen pendukung, analisis, laporan, administrasi, dan audit.
