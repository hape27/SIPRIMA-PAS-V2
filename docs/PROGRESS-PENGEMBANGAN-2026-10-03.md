# Progres Pengembangan SIPRIMA PAS — 2026-10-03

## Tahap Rekapitulasi dan Audit Koreksi

### Rekapitulasi
- Nama menu sidebar ditetapkan menjadi **Rekapitulasi**, bukan `Rekap 12 UPT`.
- Halaman Rekapitulasi menampilkan kartu ringkasan, pencarian, sortir kontekstual, tabel per UPT, total otomatis, status kelengkapan, dan tombol **Lihat Detail**.
- Status kelengkapan mengambil acuan dari Monitoring Laporan untuk periode yang aktif.
- Detail per UPT menampilkan PTM, Penyakit Menular, Rujukan, Kematian, BJMHS, dan peserta KIE.
- Total dihitung dari data yang sedang ditampilkan/filter, bukan angka manual.

### Audit koreksi data kesehatan
- Edit data identitas dan pemeriksaan harus menyertakan **alasan perubahan**.
- Audit trail menyimpan user, waktu, field, nilai sebelum, nilai sesudah, dan alasan perubahan.
- Aturan akses edit tetap untuk role ADMIN dan OPERATOR pada baseline saat ini.

## Ketentuan import revisi yang menjadi target implementasi berikutnya
1. Import pertama untuk UPT + periode + jenis laporan = data baru.
2. File dengan hash yang sama = ditolak sebagai duplikat.
3. UPT + periode + jenis laporan yang sama dengan file baru = dianggap **revisi**, bukan data tambahan.
4. Revisi harus meminta konfirmasi petugas sebelum menggantikan data aktif.
5. Data aktif harus berasal dari versi revisi terbaru.
6. Riwayat versi/file lama tetap disimpan untuk audit dan penelusuran.
7. Koreksi langsung di aplikasi tetap memakai audit trail dan alasan perubahan.

Catatan: implementasi mekanisme penggantian data aktif pada import revisi perlu dilakukan hati-hati karena modul Manajemen Obat memiliki transaksi yang tidak semuanya memiliki relasi `sourceRecordId` langsung. Jangan menghapus data lama secara massal sebelum strategi versi/arsip tervalidasi.
