# Arsitektur Final SIPRIMA PAS

```text
UPT Excel/Google Sheet
        |
        v
Import Wizard
        |
        +--> SHA-256 / duplicate check
        +--> workbook/sheet detection
        +--> normalization
        +--> validation
        |
        v
PostgreSQL + Prisma
        |
        +--> source_file / source_record (provenance)
        +--> domain tables
        +--> report_submission
        +--> audit_log
        |
        +-------------------+
        |                   |
        v                   v
Rekap / Monitoring      Analisis
        |                   |
        +---------+---------+
                  v
          Laporan Pimpinan
           PDF (Print) / XLSX
```

## Prinsip
1. Excel adalah input sumber, bukan struktur database.
2. Data matriks PTM di-unpivot.
3. Sheet petunjuk/master tidak menjadi sumber transaksi.
4. Data sumber disimpan untuk provenance.
5. Dashboard pimpinan memakai agregat.
6. Hak akses memakai RBAC.
7. Semua aktivitas penting dicatat di audit log.
