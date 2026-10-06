CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'NOT_PAID');
CREATE TYPE "OrderGroupType" AS ENUM ('CUSTOMER_GROUP', 'CONSOLIDATION');
CREATE TYPE "TruckCapacity" AS ENUM ('TWO_TONNES', 'THREE_AND_HALF_TONNES', 'FOUR_AND_HALF_TONNES');

ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_CONSOLIDATION';

CREATE TABLE "order_groups" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "type" "OrderGroupType" NOT NULL,
  "truck_capacity" "TruckCapacity",
  "dispatchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "consolidationSizeKg" INTEGER NOT NULL DEFAULT 100,
  "maxConsolidationDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "maxConsolidationWaitHours" INTEGER NOT NULL DEFAULT 48,
  "dailySummaryHour" INTEGER NOT NULL DEFAULT 18,
  "adminEmail" TEXT,
  "adminPhone" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_order_summaries" (
  "id" TEXT NOT NULL,
  "summary_date" DATE NOT NULL,
  "payload" JSONB NOT NULL,
  "email_attempted_at" TIMESTAMP(3),
  "sms_attempted_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_order_summaries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders" ADD COLUMN "purchase_code" TEXT;
UPDATE "orders" SET "purchase_code" = UPPER(SUBSTRING(MD5("id" || RANDOM()::TEXT), 1, 8));
ALTER TABLE "orders" ALTER COLUMN "purchase_code" SET NOT NULL;
ALTER TABLE "orders" ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'NOT_PAID';
ALTER TABLE "orders" ADD COLUMN "tin_number" TEXT;
ALTER TABLE "orders" ADD COLUMN "group_order_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "truck_capacity" "TruckCapacity";

CREATE UNIQUE INDEX "orders_purchase_code_key" ON "orders"("purchase_code");
CREATE UNIQUE INDEX "order_groups_reference_key" ON "order_groups"("reference");
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
CREATE INDEX "orders_payment_status_createdAt_idx" ON "orders"("payment_status", "createdAt");
CREATE INDEX "orders_group_order_id_idx" ON "orders"("group_order_id");
CREATE INDEX "orders_deliveryLat_deliveryLng_idx" ON "orders"("deliveryLat", "deliveryLng");
CREATE INDEX "order_groups_type_createdAt_idx" ON "order_groups"("type", "createdAt");
CREATE UNIQUE INDEX "daily_order_summaries_summary_date_key" ON "daily_order_summaries"("summary_date");
CREATE INDEX "daily_order_summaries_summary_date_idx" ON "daily_order_summaries"("summary_date");

ALTER TABLE "orders" ADD CONSTRAINT "orders_group_order_id_fkey"
FOREIGN KEY ("group_order_id") REFERENCES "order_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;