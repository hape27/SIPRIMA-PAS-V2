-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'OPERATOR', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('BELUM_MASUK', 'DITERIMA', 'VALID', 'WARNING', 'ERROR', 'TERLAMBAT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'VALIDATED', 'READY_TO_SAVE', 'SAVED', 'FAILED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('VALID', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('LAMA', 'BARU');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('BULANAN', 'SEMESTERAN', 'TAHUNAN');

-- CreateTable
CREATE TABLE "MasterUPT" (
    "id" TEXT NOT NULL,
    "kodeUpt" VARCHAR(30) NOT NULL,
    "namaUpt" VARCHAR(200) NOT NULL,
    "jenisUpt" VARCHAR(50),
    "kelasUpt" VARCHAR(20),
    "kabupatenKota" VARCHAR(100),
    "kanwil" VARCHAR(100),
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MasterUPT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPeriod" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tipePeriode" "PeriodType" NOT NULL,
    "bulan" INTEGER,
    "semester" INTEGER,
    "label" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportType" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "periodicity" VARCHAR(20) NOT NULL,

    CONSTRAINT "ReportType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorMaster" (
    "id" TEXT NOT NULL,
    "reportTypeId" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(50),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IndicatorMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "RoleName" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileHash" VARCHAR(128) NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sourceReportType" TEXT,

    CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "sourceColumnRange" TEXT,
    "rawPayload" JSONB NOT NULL,
    "normalizedPayload" JSONB,
    "validationStatus" "ValidationStatus" NOT NULL,
    "validationMessage" TEXT,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSubmission" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "reportTypeId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "importBatchId" TEXT,
    "notes" TEXT,

    CONSTRAINT "ReportSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BjmhsScreening" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personName" TEXT,
    "sex" TEXT,
    "legalStatus" TEXT,
    "screeningResult" TEXT,
    "followUp" TEXT,
    "referralDateText" TEXT,
    "diagnosis" TEXT,
    "diagnosisGroup" TEXT,
    "pharmacologicalTreatment" TEXT,
    "nonPharmacologicalTreatment" TEXT,
    "followupNote" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "BjmhsScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaternalRecord" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personName" TEXT,
    "age" INTEGER,
    "legalStatus" TEXT,
    "pregnancyStatus" TEXT,
    "gestationalAge" TEXT,
    "deliveryStatus" TEXT,
    "deliveryType" TEXT,
    "breastfeedingStatus" TEXT,
    "feedingType" TEXT,
    "referralStatus" TEXT,
    "referralType" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "MaternalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeathRecord" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personName" TEXT,
    "legalStatus" TEXT,
    "sex" TEXT,
    "birthDate" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "age" INTEGER,
    "citizenship" TEXT,
    "country" TEXT,
    "crimeType" TEXT,
    "primaryDiagnosis" TEXT,
    "secondaryDiagnosis1" TEXT,
    "secondaryDiagnosis2" TEXT,
    "notes" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "DeathRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KieActivitySummary" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "counselorCount" INTEGER NOT NULL DEFAULT 0,
    "medicalProfessionalCount" INTEGER NOT NULL DEFAULT 0,
    "nonMedicalProfessionalCount" INTEGER NOT NULL DEFAULT 0,
    "internalInstitutionCount" INTEGER NOT NULL DEFAULT 0,
    "externalInstitutionCount" INTEGER NOT NULL DEFAULT 0,
    "sourceRecordId" TEXT,

    CONSTRAINT "KieActivitySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalliativeRecord" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personName" TEXT,
    "legalStatus" TEXT,
    "age" INTEGER,
    "diagnosis" TEXT,
    "sex" TEXT,
    "careStatus" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "PalliativeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PtmCaseSummary" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "diseaseGroup" TEXT NOT NULL,
    "diseaseName" TEXT NOT NULL,
    "caseStatus" "CaseStatus" NOT NULL,
    "caseCount" INTEGER NOT NULL DEFAULT 0,
    "sourceRecordId" TEXT,

    CONSTRAINT "PtmCaseSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfectiousDiseaseSummary" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "category" TEXT,
    "value" INTEGER NOT NULL DEFAULT 0,
    "sourceRecordId" TEXT,

    CONSTRAINT "InfectiousDiseaseSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "personName" TEXT,
    "legalStatus" TEXT,
    "age" INTEGER,
    "sex" TEXT,
    "diagnosis" TEXT,
    "referralType" TEXT,
    "destinationFacility" TEXT,
    "referralDate" TIMESTAMP(3),
    "notes" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicFacility" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "facilityItem" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "condition" TEXT,
    "availabilityStatus" TEXT,
    "notes" TEXT,
    "sourceRecordId" TEXT,

    CONSTRAINT "ClinicFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionDocument" (
    "id" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "documentNumber" TEXT,
    "documentDate" TIMESTAMP(3),
    "verificationStatus" TEXT,
    "sourceFileId" TEXT,

    CONSTRAINT "SubmissionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nik" VARCHAR(32),
    "address" TEXT,
    "phone" VARCHAR(50),
    "birthPlace" VARCHAR(100),
    "birthDate" TIMESTAMP(3),
    "sex" VARCHAR(20),
    "bloodType" VARCHAR(10),
    "email" VARCHAR(150),
    "createdById" TEXT,
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthExam" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "examinationDate" TIMESTAMP(3),
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulse" INTEGER,
    "temperature" DECIMAL(5,2),
    "heightCm" DECIMAL(6,2),
    "weightKg" DECIMAL(6,2),
    "waistCm" DECIMAL(6,2),
    "bloodSugar" DECIMAL(8,2),
    "totalCholesterol" DECIMAL(8,2),
    "hdl" DECIMAL(8,2),
    "ldl" DECIMAL(8,2),
    "triglycerides" DECIMAL(8,2),
    "uricAcid" DECIMAL(8,2),
    "hemoglobin" DECIMAL(6,2),
    "oxygenSaturation" DECIMAL(5,2),
    "respiratoryRate" INTEGER,
    "complaints" TEXT,
    "diseaseHistory" TEXT,
    "currentMedication" TEXT,
    "examinerName" TEXT,
    "conclusion" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthMedication" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "medicineId" TEXT,
    "medicineName" TEXT NOT NULL,
    "quantity" INTEGER,
    "unit" VARCHAR(50),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineMaster" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "dosageForm" VARCHAR(100),
    "strength" VARCHAR(100),
    "unit" VARCHAR(50) NOT NULL,
    "groupName" VARCHAR(100),
    "category" VARCHAR(100),
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "maxStock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "uptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineReceipt" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "documentNumber" VARCHAR(100),
    "source" VARCHAR(200),
    "batchNumber" VARCHAR(100),
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "price" DECIMAL(18,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineInbound" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "inboundDate" TIMESTAMP(3) NOT NULL,
    "documentNumber" VARCHAR(100),
    "batchNumber" VARCHAR(100),
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "source" VARCHAR(200),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineInbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineDistribution" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "sourceUptId" TEXT NOT NULL,
    "destinationUptId" TEXT NOT NULL,
    "distributionDate" TIMESTAMP(3) NOT NULL,
    "documentNumber" VARCHAR(100),
    "batchNumber" VARCHAR(100),
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineIssue" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "batchNumber" VARCHAR(100),
    "quantity" INTEGER NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "purpose" VARCHAR(200),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineStockOpening" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "uptId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicineStockOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterUPT_kodeUpt_key" ON "MasterUPT"("kodeUpt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportPeriod_tahun_tipePeriode_bulan_semester_key" ON "ReportPeriod"("tahun", "tipePeriode", "bulan", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "ReportType_code_key" ON "ReportType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorMaster_reportTypeId_code_key" ON "IndicatorMaster"("reportTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_batchNumber_key" ON "ImportBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "SourceFile_fileHash_idx" ON "SourceFile"("fileHash");

-- CreateIndex
CREATE INDEX "SourceRecord_sourceFileId_sheetName_sourceRow_idx" ON "SourceRecord"("sourceFileId", "sheetName", "sourceRow");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSubmission_uptId_periodId_reportTypeId_key" ON "ReportSubmission"("uptId", "periodId", "reportTypeId");

-- CreateIndex
CREATE INDEX "PtmCaseSummary_periodId_diseaseGroup_diseaseName_caseStatus_idx" ON "PtmCaseSummary"("periodId", "diseaseGroup", "diseaseName", "caseStatus");

-- CreateIndex
CREATE INDEX "HealthProfile_name_idx" ON "HealthProfile"("name");

-- CreateIndex
CREATE INDEX "HealthProfile_nik_idx" ON "HealthProfile"("nik");

-- CreateIndex
CREATE INDEX "HealthProfile_birthDate_idx" ON "HealthProfile"("birthDate");

-- CreateIndex
CREATE INDEX "HealthExam_profileId_examinationDate_idx" ON "HealthExam"("profileId", "examinationDate");

-- CreateIndex
CREATE INDEX "HealthMedication_examId_idx" ON "HealthMedication"("examId");

-- CreateIndex
CREATE INDEX "HealthMedication_medicineId_idx" ON "HealthMedication"("medicineId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_action_idx" ON "AuditLog"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineMaster_code_key" ON "MedicineMaster"("code");

-- CreateIndex
CREATE INDEX "MedicineMaster_name_idx" ON "MedicineMaster"("name");

-- CreateIndex
CREATE INDEX "MedicineReceipt_uptId_receiptDate_idx" ON "MedicineReceipt"("uptId", "receiptDate");

-- CreateIndex
CREATE INDEX "MedicineInbound_uptId_inboundDate_idx" ON "MedicineInbound"("uptId", "inboundDate");

-- CreateIndex
CREATE INDEX "MedicineDistribution_sourceUptId_distributionDate_idx" ON "MedicineDistribution"("sourceUptId", "distributionDate");

-- CreateIndex
CREATE INDEX "MedicineDistribution_destinationUptId_distributionDate_idx" ON "MedicineDistribution"("destinationUptId", "distributionDate");

-- CreateIndex
CREATE INDEX "MedicineIssue_uptId_issueDate_idx" ON "MedicineIssue"("uptId", "issueDate");

-- CreateIndex
CREATE INDEX "MedicineStockOpening_uptId_asOfDate_idx" ON "MedicineStockOpening"("uptId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineStockOpening_medicineId_uptId_asOfDate_key" ON "MedicineStockOpening"("medicineId", "uptId", "asOfDate");

-- AddForeignKey
ALTER TABLE "IndicatorMaster" ADD CONSTRAINT "IndicatorMaster_reportTypeId_fkey" FOREIGN KEY ("reportTypeId") REFERENCES "ReportType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubmission" ADD CONSTRAINT "ReportSubmission_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubmission" ADD CONSTRAINT "ReportSubmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubmission" ADD CONSTRAINT "ReportSubmission_reportTypeId_fkey" FOREIGN KEY ("reportTypeId") REFERENCES "ReportType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubmission" ADD CONSTRAINT "ReportSubmission_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BjmhsScreening" ADD CONSTRAINT "BjmhsScreening_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BjmhsScreening" ADD CONSTRAINT "BjmhsScreening_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaternalRecord" ADD CONSTRAINT "MaternalRecord_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaternalRecord" ADD CONSTRAINT "MaternalRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathRecord" ADD CONSTRAINT "DeathRecord_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathRecord" ADD CONSTRAINT "DeathRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KieActivitySummary" ADD CONSTRAINT "KieActivitySummary_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KieActivitySummary" ADD CONSTRAINT "KieActivitySummary_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalliativeRecord" ADD CONSTRAINT "PalliativeRecord_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalliativeRecord" ADD CONSTRAINT "PalliativeRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtmCaseSummary" ADD CONSTRAINT "PtmCaseSummary_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PtmCaseSummary" ADD CONSTRAINT "PtmCaseSummary_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfectiousDiseaseSummary" ADD CONSTRAINT "InfectiousDiseaseSummary_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfectiousDiseaseSummary" ADD CONSTRAINT "InfectiousDiseaseSummary_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicFacility" ADD CONSTRAINT "ClinicFacility_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicFacility" ADD CONSTRAINT "ClinicFacility_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "SourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionDocument" ADD CONSTRAINT "SubmissionDocument_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionDocument" ADD CONSTRAINT "SubmissionDocument_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthExam" ADD CONSTRAINT "HealthExam_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HealthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthExam" ADD CONSTRAINT "HealthExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthExam" ADD CONSTRAINT "HealthExam_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMedication" ADD CONSTRAINT "HealthMedication_examId_fkey" FOREIGN KEY ("examId") REFERENCES "HealthExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthMedication" ADD CONSTRAINT "HealthMedication_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineMaster" ADD CONSTRAINT "MedicineMaster_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReceipt" ADD CONSTRAINT "MedicineReceipt_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineReceipt" ADD CONSTRAINT "MedicineReceipt_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInbound" ADD CONSTRAINT "MedicineInbound_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInbound" ADD CONSTRAINT "MedicineInbound_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDistribution" ADD CONSTRAINT "MedicineDistribution_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDistribution" ADD CONSTRAINT "MedicineDistribution_sourceUptId_fkey" FOREIGN KEY ("sourceUptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineDistribution" ADD CONSTRAINT "MedicineDistribution_destinationUptId_fkey" FOREIGN KEY ("destinationUptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineIssue" ADD CONSTRAINT "MedicineIssue_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineIssue" ADD CONSTRAINT "MedicineIssue_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineStockOpening" ADD CONSTRAINT "MedicineStockOpening_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineStockOpening" ADD CONSTRAINT "MedicineStockOpening_uptId_fkey" FOREIGN KEY ("uptId") REFERENCES "MasterUPT"("id") ON DELETE CASCADE ON UPDATE CASCADE;
