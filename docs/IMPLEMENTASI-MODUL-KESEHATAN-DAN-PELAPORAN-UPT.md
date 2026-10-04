# SIPRIMA PAS — Implementasi Modul Pemeriksaan Kesehatan & Acuan Pelaporan UPT

## 1. Pemeriksaan Kesehatan Pegawai/Pasien

### Identitas
- Nama — wajib
- No. KTP/NIK — opsional
- Alamat — opsional
- No. HP — opsional
- Tempat lahir — opsional
- Tanggal lahir — opsional
- Umur — dihitung otomatis dari tanggal lahir
- Jenis kelamin — Laki-laki / Perempuan, opsional
- Golongan darah — opsional
- Email — opsional

Tidak ada field pangkat/golongan, jabatan, atau status kepegawaian.

### Pemeriksaan
Semua field pemeriksaan opsional:
- Tanggal pemeriksaan
- Tensi sistolik/diastolik
- Denyut nadi
- Suhu tubuh
- Tinggi badan
- Berat badan
- IMT/BMI otomatis dari tinggi + berat
- Lingkar perut
- Gula darah
- Kolesterol total
- HDL
- LDL
- Trigliserida
- Asam urat
- Hemoglobin
- Saturasi oksigen
- Frekuensi napas
- Keluhan
- Riwayat penyakit
- Obat yang sedang dikonsumsi
- Petugas kesehatan pemeriksa
- Kesimpulan
- Catatan

### Obat yang diberikan
- Nama obat
- Jumlah
- Satuan
- Keterangan

Tidak ada field aturan penggunaan.

### Riwayat
Satu identitas dapat memiliki banyak pemeriksaan. Setiap pemeriksaan menjadi riwayat terpisah sehingga perkembangan kesehatan dapat dipantau.

## 2. Audit trail

Data penting menyimpan:
- Created By
- Created At
- Last Updated By
- Last Updated At

Audit trail menyimpan:
- waktu perubahan
- user/petugas
- aktivitas
- field yang berubah
- nilai sebelum
- nilai sesudah

## 3. Acuan file pelaporan UPT

ZIP pelaporan LPP Kelas IIA Tangerang digunakan sebagai contoh struktur pelaporan nyata.

Jenis laporan yang ditemukan:
- BJMHS
- Ibu Hamil, Melahirkan dan Menyusui
- Kematian
- KIE
- Paliatif
- Penyakit Menular
- Penyakit Tidak Menular
- Rujukan
- Sarpras Klinik
- Surat Pengantar

### Aturan khusus Penyakit Menular
SIPRIMA PAS hanya mengimpor sheet **`Rekapitulasi (Otomatis)`**.

SIPRIMA tidak mengimpor seluruh sheet rincian TBC/HIV/infeksi menular sebagai data individu. Yang disimpan untuk kebutuhan rekap adalah hasil agregat: nama indikator/penyakit dan jumlah angka sesuai rekap otomatis, dengan konteks UPT dan periode.

## 4. Arah pengembangan

Input manual dan import Excel menggunakan database yang sama. Data kemudian digunakan bersama untuk:
- Dashboard
- Rekap 12 UPT
- Analisis
- Monitoring
- Laporan Pimpinan
- Pencarian/filter/sortir

Filter dan pencarian akan dibuat sebagai pola UI yang konsisten pada modul-modul SIPRIMA PAS.
