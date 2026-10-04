CREATE TABLE "HealthProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nik" VARCHAR(32),
  "address" TEXT,
  "phone" VARCHAR(50),
  "birthPlace" VARCHAR(100),
  "birthDate" DATETIME,
  "sex" VARCHAR(20),
  "bloodType" VARCHAR(10),
  "email" VARCHAR(150),
  "createdById" TEXT,
  "lastUpdatedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HealthProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "HealthProfile_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HealthProfile_name_idx" ON "HealthProfile"("name");
CREATE INDEX "HealthProfile_nik_idx" ON "HealthProfile"("nik");
CREATE INDEX "HealthProfile_birthDate_idx" ON "HealthProfile"("birthDate");

CREATE TABLE "HealthExam" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileId" TEXT NOT NULL,
  "examinationDate" DATETIME,
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
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HealthExam_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HealthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "HealthExam_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HealthExam_profileId_examinationDate_idx" ON "HealthExam"("profileId", "examinationDate");

CREATE TABLE "HealthMedication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "examId" TEXT NOT NULL,
  "medicineId" TEXT,
  "medicineName" TEXT NOT NULL,
  "quantity" INTEGER,
  "unit" VARCHAR(50),
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthMedication_examId_fkey" FOREIGN KEY ("examId") REFERENCES "HealthExam"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthMedication_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "MedicineMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HealthMedication_examId_idx" ON "HealthMedication"("examId");
CREATE INDEX "HealthMedication_medicineId_idx" ON "HealthMedication"("medicineId");
