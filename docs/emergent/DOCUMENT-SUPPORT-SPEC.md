# Dokumen Pendukung SIPRIMA PAS

## Status
- WAJIB: data tidak dapat difinalisasi sebelum dokumen ada.
- OPSIONAL: data tetap dapat disimpan tanpa dokumen.
- TIDAK DIPERLUKAN: tidak ada upload pada transaksi tersebut.

Status harus dapat dikonfigurasi per modul/jenis transaksi.

## Modul
- Kematian: dokumen kematian sesuai kebutuhan kasus; berita acara/dokumen lain opsional bila tidak dipersyaratkan.
- Rujukan: surat/bukti rujukan sesuai kebutuhan.
- KIE: surat kegiatan, daftar peserta, dokumentasi opsional.
- KIA: hasil/formulir pelayanan bila diperlukan.
- Paliatif: dokumen pelayanan bila diperlukan.
- BJMHS: formulir/hasil pemeriksaan bila diperlukan.
- PTM/Penyakit Menular: bukti/rekap pendukung bila diperlukan.
- Sarpras: checklist, berita acara, foto kondisi, dokumen pendukung.
- Cek Kesehatan Pegawai: hasil pemeriksaan bila tersedia/diperlukan.
- Manajemen Obat: surat permintaan, dokumen penerimaan, tanda terima pihak ketiga, distribusi, pengeluaran, sesuai transaksi.

## Metadata dokumen
- documentId
- module
- recordId/transactionId
- UPT
- period
- documentType
- documentNumber
- documentDate
- originalFileName
- storedFileName/path/key
- mimeType
- fileSize
- uploadedBy
- uploadedAt
- notes
- status

## Audit
Catat upload, replace/update, delete/void, download/view bila kebijakan mengharuskan. Untuk replace/delete, simpan alasan dan identitas pengguna.

## Prinsip
Satu record dapat memiliki banyak dokumen. Jumlah dokumen tidak boleh dihitung sebagai jumlah kasus/transaksi.
