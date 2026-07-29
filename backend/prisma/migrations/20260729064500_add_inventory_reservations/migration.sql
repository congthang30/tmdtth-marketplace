ALTER TABLE "ProductInventory"
  ADD COLUMN "QuantityDamaged" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "QuantityIncoming" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductInventory"
  ADD CONSTRAINT "ProductInventory_non_negative_stock_check"
  CHECK (
    "QuantityOnHand" >= 0 AND
    "QuantityReserved" >= 0 AND
    "QuantityAvailable" >= 0 AND
    "QuantityDamaged" >= 0 AND
    "QuantityIncoming" >= 0
  ),
  ADD CONSTRAINT "ProductInventory_stock_balance_check"
  CHECK (
    "QuantityOnHand" = "QuantityAvailable" + "QuantityReserved" + "QuantityDamaged"
  );

CREATE TABLE "InventoryReservations" (
  "InventoryReservationID" BIGSERIAL NOT NULL,
  "ProductInventoryID" BIGINT NOT NULL,
  "OrderID" BIGINT NOT NULL,
  "OrderItemID" BIGINT NOT NULL,
  "Quantity" INTEGER NOT NULL,
  "ReservationStatus" VARCHAR(50) NOT NULL DEFAULT 'Active',
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "CompletedAt" TIMESTAMP(3),
  "ReleasedAt" TIMESTAMP(3),
  "ReturnedAt" TIMESTAMP(3),
  CONSTRAINT "InventoryReservations_pkey" PRIMARY KEY ("InventoryReservationID"),
  CONSTRAINT "InventoryReservations_quantity_check" CHECK ("Quantity" > 0),
  CONSTRAINT "InventoryReservations_status_check" CHECK (
    "ReservationStatus" IN ('Active', 'Completed', 'Released', 'Returned')
  )
);

CREATE UNIQUE INDEX "InventoryReservations_OrderItemID_key"
  ON "InventoryReservations"("OrderItemID");
CREATE INDEX "InventoryReservations_ProductInventoryID_ReservationStatus_idx"
  ON "InventoryReservations"("ProductInventoryID", "ReservationStatus");
CREATE INDEX "InventoryReservations_OrderID_ReservationStatus_idx"
  ON "InventoryReservations"("OrderID", "ReservationStatus");

ALTER TABLE "InventoryReservations"
  ADD CONSTRAINT "InventoryReservations_ProductInventoryID_fkey"
  FOREIGN KEY ("ProductInventoryID") REFERENCES "ProductInventory"("ProductInventoryID")
  ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT "InventoryReservations_OrderID_fkey"
  FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID")
  ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT "InventoryReservations_OrderItemID_fkey"
  FOREIGN KEY ("OrderItemID") REFERENCES "OrderItems"("OrderItemID")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Existing in-flight order items already contribute to QuantityReserved.
-- Backfill one active reservation per item without mutating stock buckets.
INSERT INTO "InventoryReservations" (
  "ProductInventoryID",
  "OrderID",
  "OrderItemID",
  "Quantity",
  "ReservationStatus",
  "CreatedAt"
)
SELECT
  inventory."ProductInventoryID",
  item."OrderID",
  item."OrderItemID",
  item."Quantity",
  'Active',
  item."CreatedAt"
FROM "OrderItems" item
JOIN "ShopOrders" shop_order
  ON shop_order."ShopOrderID" = item."ShopOrderID"
JOIN "ProductInventory" inventory
  ON inventory."ProductVariantID" = item."ProductVariantID"
WHERE shop_order."OrderStatus" IN (
  'WaitingForSeller', 'Confirmed', 'Preparing', 'Prepared', 'Shipping'
)
ON CONFLICT ("OrderItemID") DO NOTHING;
