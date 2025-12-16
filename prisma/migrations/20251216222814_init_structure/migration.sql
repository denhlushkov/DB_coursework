-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('Scheduled', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'BankTransfer');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateTable
CREATE TABLE "Schedule" (
    "schedule_id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "diagnosis_id" SERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "severity_level" "Severity" NOT NULL DEFAULT 'Low',

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("diagnosis_id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "procedure_id" SERIAL NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("procedure_id")
);

-- CreateTable
CREATE TABLE "Therapist" (
    "therapist_id" SERIAL NOT NULL,
    "schedule_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "specialization" VARCHAR(100),

    CONSTRAINT "Therapist_pkey" PRIMARY KEY ("therapist_id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "medical_rec_id" SERIAL NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("medical_rec_id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "patient_id" SERIAL NOT NULL,
    "diagnosis_id" INTEGER,
    "medical_rec_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "birth_date" DATE NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "Session" (
    "session_id" SERIAL NOT NULL,
    "procedure_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'Scheduled',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "invoice_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "payment_id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateIndex
CREATE INDEX "Schedule_date_is_available_idx" ON "Schedule"("date", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_title_key" ON "Diagnosis"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Procedure_title_key" ON "Procedure"("title");

-- CreateIndex
CREATE INDEX "Therapist_name_idx" ON "Therapist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_medical_rec_id_key" ON "Patient"("medical_rec_id");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Session_patient_id_idx" ON "Session"("patient_id");

-- CreateIndex
CREATE INDEX "Session_therapist_id_date_idx" ON "Session"("therapist_id", "date");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_session_id_key" ON "Invoice"("session_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "Payment"("invoice_id");

-- AddForeignKey
ALTER TABLE "Therapist" ADD CONSTRAINT "Therapist_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "Schedule"("schedule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "Diagnosis"("diagnosis_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_medical_rec_id_fkey" FOREIGN KEY ("medical_rec_id") REFERENCES "MedicalRecord"("medical_rec_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "Procedure"("procedure_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist"("therapist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;
