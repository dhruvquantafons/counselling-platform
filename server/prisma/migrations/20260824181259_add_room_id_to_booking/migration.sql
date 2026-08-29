/*
  Warnings:

  - A unique constraint covering the columns `[roomId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "roomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_roomId_key" ON "Booking"("roomId");
