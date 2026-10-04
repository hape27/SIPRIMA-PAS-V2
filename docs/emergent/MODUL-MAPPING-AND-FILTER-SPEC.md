# Mapping Modul dan Filter

| Modul | Sumber/Domain | Filter utama | Rekap utama |
|---|---|---|---|
| KIE | kie_activity_summary | UPT, periode, topik, penyuluh | peserta, kegiatan |
| Penyakit Menular | infectious_disease_summary | UPT, periode/range, program, penyakit | total kasus per penyakit/program |
| PTM | ptm_case_summary | UPT, periode/range, kelompok penyakit, penyakit, status lama/baru | lama, baru, total |
| Paliatif | palliative_record | UPT, periode, penyakit, jenis kelamin, status perawatan | jumlah record/kasus |
| Kematian | death_record | UPT, periode/range, diagnosis, tanggal, status | jumlah kematian |
| Rujukan | referral | UPT, periode/range, diagnosis, tujuan | jumlah rujukan |
| KIA | maternal_record | UPT, periode, status kehamilan/persalinan/menyusui, rujukan | jumlah record/indikator |
| BJMHS | bjmhs_screening | UPT, periode, jenis kelamin, status WBP, interpretasi, diagnosis | jumlah screening/hasil |
| Sarpras | clinic_facility | UPT, semester, kategori, item, kondisi, ketersediaan | item tersedia/tidak |
| Cek Kesehatan Pegawai | health_profile/health_exam | nama, NIK, tanggal/range, jenis kelamin, hasil pemeriksaan | jumlah pemeriksaan, tren |
| Manajemen Obat | medicine domain | UPT, tanggal/range, obat, transaksi, pihak | stok dan transaksi |

## Filter lintas modul
Filter yang dipilih harus memengaruhi seluruh komponen data pada halaman yang sama: cards, table, chart, totals, pagination, export.

## Filter bertingkat
Contoh Penyakit Menular:
UPT -> periode/range -> program -> penyakit.

Jika pengguna memilih TBC, HIV, Hepatitis, maka hasil hanya menampilkan ketiga penyakit tersebut dan totalnya.

## Export
Export Excel/PDF/print harus menggunakan dataset hasil filter aktif, bukan seluruh database.
