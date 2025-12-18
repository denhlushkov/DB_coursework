/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Therapist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "phone" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "Therapist" ADD COLUMN     "phone" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Therapist_phone_key" ON "Therapist"("phone");
