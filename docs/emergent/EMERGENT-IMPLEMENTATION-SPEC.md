# SIPRIMA PAS — Implementation Specification

## 1. Tujuan
Menyelesaikan SIPRIMA PAS sebagai aplikasi web pelaporan, rekapitulasi, analisis, administrasi, dan penelusuran dokumen pendukung kesehatan pemasyarakatan.

## 2. Prinsip arsitektur
Excel tetap menjadi media pelaporan UPT. Aplikasi melakukan:
IMPORT -> VALIDATE -> RAW/PROVENANCE -> NORMALIZE -> DOMAIN -> AGGREGATE -> DASHBOARD/REPORT.

Setiap record domain harus dapat ditelusuri ke UPT, periode, jenis laporan, dan provenance/source ketika berasal dari import.

## 3. Menu dan modul
### Dashboard
Ringkasan KPI seluruh modul. Filter global minimal: periode, UPT, jenis laporan. Ketika filter berubah, kartu, tabel, grafik, dan angka dashboard ikut berubah.

### Import Excel
Upload, deteksi jenis laporan, preview sheet, validasi, issue list, konfirmasi, commit. Simpan file sumber dan provenance. Jangan membuat angka ganda.

### Monitoring Laporan
Matrix UPT x jenis laporan x periode: masuk, belum masuk, terlambat, warning, error, revisi, kelengkapan dokumen.

### Rekapitulasi
Read-only aggregation lintas UPT dan jenis laporan. Search/filter/sort contextual. Total otomatis. Detail UPT. Export mengikuti filter aktif.

### KIE
Topik, jumlah peserta, penyuluh, tenaga medis/non-medis, asal instansi. Rekap per UPT/periode/topik.

### Penyakit Menular
Sumber utama import: sheet `Rekapitulasi (Otomatis)` sesuai format pelaporan. Detail penyakit/program, UPT, periode, jumlah. Dukungan filter penyakit seperti TBC, HIV, Hepatitis, dan penyakit menular lainnya. Jangan mengimpor sheet detail TBC/HIV/infeksi sebagai transaksi terpisah jika format tersebut hanya rincian pendukung.

### PTM
Normalisasi matriks penyakit x LAMA/BARU. Simpan disease_group, disease_name, case_status, case_count. Rekap total, lama, baru. Filter penyakit, UPT, periode.

### Paliatif
Identitas, status hukum, usia, penyakit, jenis kelamin, status perawatan. Rekap dan detail.

### Kematian
Detail kasus, tanggal kejadian, diagnosis, keterangan, UPT, periode. Dukungan dokumen kematian/berita acara sesuai aturan.

### Rujukan
Tanggal, diagnosis, tujuan rujukan, detail rujukan, UPT, periode. Rekap jumlah dan detail. Dukungan surat/bukti rujukan.

### KIA
Kehamilan, persalinan, menyusui, ASI, rujukan sesuai template. Master/list validasi tidak dianggap sebagai transaksi.

### BJMHS
No, Kanwil, UPT, nama WBP, jenis kelamin, status WBP, hasil interpretasi, tindak lanjut, tanggal dirujuk, diagnosis, terapi farmakologi/non-farmakologi, keterangan. Klasifikasi F00-F99 sesuai mapping baseline.

### Sarana Prasarana Klinik
Item, kategori, jumlah, kondisi, ketersediaan. Periodisitas semesteran bila sumber menggunakan semester.

### Cek Kesehatan Pegawai
Profil pegawai + banyak riwayat pemeriksaan. Nama wajib; identitas lain opsional. Usia otomatis. Pemeriksaan vital/lab opsional. Obat yang diberikan dapat memiliki banyak item. Created By/At dan Last Updated By/At. Koreksi memerlukan alasan.

### Manajemen Obat
Master obat, stok, penerimaan, obat masuk, distribusi, obat keluar, saldo awal. Dokumen transaksi terhubung ke transaksi.

### Analisis
Tren bulanan/semester, distribusi UPT, penyakit terbanyak, perbandingan periode, indikator lintas modul. Filter sama dengan data sumber.

### Laporan Pimpinan
Generate PDF/Excel/print berdasarkan filter aktif. Tampilkan ringkasan, tabel, grafik bila dipilih. Hasil harus sama dengan Rekapitulasi/Analisis.

### Administrasi
User, UPT, master/configuration sesuai hak akses.

### Audit
Audit aktivitas, perubahan data, alasan koreksi, dokumen upload/update/delete, import/revisi.

## 4. Search/filter/sort universal
Semua modul pelaporan harus memiliki search/filter/sort yang relevan. Contoh:
- UPT
- periode/rentang periode
- jenis penyakit/program
- status laporan
- status dokumen
- status kasus/transaksi
- kata kunci
- tanggal

Jangan menampilkan filter yang tidak relevan dengan modul.

## 5. Contoh kebutuhan pimpinan
Filter:
UPT A + Penyakit Menular + Juni–Oktober 2026 + TBC/HIV/Hepatitis.

Hasil harus menampilkan hanya data yang cocok, termasuk total per penyakit, total periode, dan detail UPT. Filter yang sama dapat diterapkan pada PTM, KIE, Paliatif, Kematian, Rujukan, KIA, BJMHS, Sarpras, dan Obat sesuai konteks.

## 6. Integritas data
Exact same SHA-256 file -> reject duplicate.
Same UPT + period + report type but different file -> revision flow, not additive import.
Revision requires confirmation. Latest revision is active. Old source/history retained.

## 7. Keamanan
Jangan commit secrets. Gunakan `.env`. Jangan memakai data nyata untuk seed/demo. Upload file harus divalidasi tipe/ukuran dan disimpan dengan nama internal yang aman.
