# Modul Manajemen Obat — SIPRIMA PAS

Modul ini menambah satu area **Manajemen Obat** untuk membantu rekapitulasi obat pada tingkat Kanwil/UPT. Modul bukan pengganti sistem farmasi/SDP; transaksi dapat dimasukkan dari laporan yang diterima.

## Menu
- Master Obat
- Penerimaan Obat
- Obat Masuk
- Distribusi Obat
- Obat Keluar
- Stok Obat
- Rekap Obat

## Perhitungan stok
`Stok akhir = saldo awal + penerimaan + obat masuk + distribusi masuk - distribusi keluar - obat keluar`.

Saldo awal disimpan per **UPT + obat + tanggal** pada `MedicineStockOpening`. Bila belum ada saldo awal, nilai awal dianggap 0 dan perlu diisi sebelum dipakai sebagai stok operasional.

## API
- `GET /api/medicines`
- `POST /api/medicines`
- `PATCH /api/medicines/:id`
- `GET /api/medicines/stock?periodId=&uptId=`
- `GET /api/medicines/summary?periodId=&uptId=`
- `GET /api/medicines/transactions?uptId=`
- `POST /api/medicines/openings`
- `POST /api/medicines/receipts`
- `POST /api/medicines/inbounds`
- `POST /api/medicines/distributions`
- `POST /api/medicines/issues`

Semua perubahan transaksi dicatat pada audit log.

## Aturan V1.1 setelah hardening
- `PENERIMAAN` dan `OBAT_MASUK` diperlakukan sebagai dua jenis transaksi masuk yang terpisah. Keduanya hanya boleh dicatat sekali untuk satu kejadian; jangan menginput kejadian yang sama ke dua sheet karena akan menggandakan stok.
- `DISTRIBUSI` mengurangi stok UPT asal dan menambah stok UPT tujuan.
- `OBAT_KELUAR` mengurangi stok UPT.
- `SALDO_AWAL` adalah saldo acuan pada tanggal tertentu dan tidak boleh negatif.
- Transaksi keluar/distribusi ditolak bila stok tidak mencukupi.
- Jumlah transaksi harus bilangan bulat positif; saldo awal boleh nol.
- Satuan transaksi harus sama dengan satuan pada `MASTER_OBAT`.
- Import Excel menggunakan preview/validasi dan commit transaksional: bila ada error, seluruh import dibatalkan.
- File asli disimpan dengan SHA-256 dan source record untuk provenance.
