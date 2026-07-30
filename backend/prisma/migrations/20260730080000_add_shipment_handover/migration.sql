-- Persist the seller's carrier handover instruction and the exact GHN
-- station selected for Drop-off orders.
ALTER TABLE "Shipments"
ADD COLUMN "HandoverMethod" VARCHAR(20) NOT NULL DEFAULT 'Pickup',
ADD COLUMN "PickupStationID" INTEGER,
ADD COLUMN "PickupStationName" VARCHAR(255),
ADD COLUMN "PickupStationAddress" VARCHAR(500);

ALTER TABLE "Shipments"
ADD CONSTRAINT "Shipments_HandoverMethod_check"
CHECK (
  ("HandoverMethod" = 'Pickup' AND "PickupStationID" IS NULL)
  OR
  (
    "HandoverMethod" = 'Dropoff'
    AND "PickupStationID" IS NOT NULL
    AND "PickupStationID" > 0
    AND "PickupStationName" IS NOT NULL
    AND "PickupStationAddress" IS NOT NULL
  )
);

ALTER TABLE "Shipments"
ADD CONSTRAINT "Shipments_ShopOrderID_key" UNIQUE ("ShopOrderID");
