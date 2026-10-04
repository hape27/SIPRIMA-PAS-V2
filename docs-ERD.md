# ERD SIPRIMA PAS V1

```text
MasterUPT ─────< ImportBatch >──── User
   │                  │
   │                  └────< SourceFile ────< SourceRecord
   │
   ├────< ReportSubmission >──── ReportType
   │             │
   │             └────────────── ReportPeriod
   │
   ├────< BjmhsScreening
   ├────< MaternalRecord
   ├────< DeathRecord
   ├────< KieActivitySummary
   ├────< PalliativeRecord
   ├────< PtmCaseSummary
   ├────< InfectiousDiseaseSummary
   ├────< Referral
   ├────< ClinicFacility
   └────< SubmissionDocument

User ────< AuditLog
ReportType ────< IndicatorMaster
```

Prinsip desain:
- `SourceFile` dan `SourceRecord` menyimpan jejak asal Excel.
- Tabel domain menyimpan data yang sudah dinormalisasi.
- `ReportSubmission` mengukur kelengkapan laporan per UPT/periode/jenis laporan.
- Dashboard pimpinan membaca agregat domain, bukan file mentah.
- Data identitas WBP hanya ditampilkan pada peran yang berwenang.
