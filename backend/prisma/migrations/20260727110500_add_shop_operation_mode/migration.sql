-- Add seller-controlled shop operation scheduling without overloading moderation status.
CREATE TYPE "ShopOperationMode" AS ENUM ('Open', 'PausedUntil', 'PausedIndefinitely');
CREATE TYPE "ShopOperationAction" AS ENUM ('ScheduledPause', 'IndefinitePause', 'Resume', 'AdminSuspend', 'AdminResume');

ALTER TABLE "Shops"
  ADD COLUMN "OperationMode" "ShopOperationMode" NOT NULL DEFAULT 'Open',
  ADD COLUMN "PauseStartsAt" TIMESTAMP(3),
  ADD COLUMN "PauseEndsAt" TIMESTAMP(3),
  ADD COLUMN "PauseReason" VARCHAR(500),
  ADD COLUMN "OperationUpdatedByUserID" BIGINT,
  ADD COLUMN "OperationUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Shops"
  ADD CONSTRAINT "Shops_OperationUpdatedByUserID_fkey"
  FOREIGN KEY ("OperationUpdatedByUserID") REFERENCES "Users"("UserID")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "ShopOperationHistories" (
  "ShopOperationHistoryID" BIGSERIAL PRIMARY KEY,
  "ShopID" BIGINT NOT NULL,
  "Action" "ShopOperationAction" NOT NULL,
  "StartsAt" TIMESTAMP(3),
  "EndsAt" TIMESTAMP(3),
  "Reason" VARCHAR(500),
  "ActorUserID" BIGINT NOT NULL,
  "ActorRole" VARCHAR(30) NOT NULL,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopOperationHistories_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "ShopOperationHistories_ActorUserID_fkey" FOREIGN KEY ("ActorUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX "Shops_ShopStatus_OperationMode_idx" ON "Shops"("ShopStatus", "OperationMode");
CREATE INDEX "Shops_OperationMode_PauseStartsAt_PauseEndsAt_idx" ON "Shops"("OperationMode", "PauseStartsAt", "PauseEndsAt");
CREATE INDEX "ShopOperationHistories_ShopID_CreatedAt_idx" ON "ShopOperationHistories"("ShopID", "CreatedAt");
CREATE INDEX "ShopOperationHistories_ActorUserID_idx" ON "ShopOperationHistories"("ActorUserID");
