CREATE TABLE "UploadAssets" (
  "UploadAssetID" BIGSERIAL PRIMARY KEY,
  "OwnerUserID" BIGINT NOT NULL,
  "StoragePublicID" VARCHAR(500) NOT NULL,
  "Url" VARCHAR(1000) NOT NULL,
  "OriginalName" VARCHAR(255) NOT NULL,
  "MimeType" VARCHAR(100) NOT NULL,
  "Size" INTEGER NOT NULL,
  "Status" VARCHAR(30) NOT NULL DEFAULT 'Pending',
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "AttachedAt" TIMESTAMP(3),
  CONSTRAINT "UploadAssets_OwnerUserID_fkey" FOREIGN KEY ("OwnerUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "UploadAssets_StoragePublicID_key" ON "UploadAssets"("StoragePublicID");
CREATE INDEX "UploadAssets_OwnerUserID_Status_CreatedAt_idx" ON "UploadAssets"("OwnerUserID", "Status", "CreatedAt");

ALTER TABLE "ProductImages" ADD COLUMN "AssetID" BIGINT;
CREATE UNIQUE INDEX "ProductImages_AssetID_key" ON "ProductImages"("AssetID");
ALTER TABLE "ProductImages" ADD CONSTRAINT "ProductImages_AssetID_fkey" FOREIGN KEY ("AssetID") REFERENCES "UploadAssets"("UploadAssetID") ON DELETE NO ACTION ON UPDATE NO ACTION;

WITH "RankedThumbnails" AS (
  SELECT "ProductImageID",
         ROW_NUMBER() OVER (PARTITION BY "ProductID" ORDER BY "SortOrder", "CreatedAt", "ProductImageID") AS "Position"
  FROM "ProductImages"
  WHERE "IsThumbnail" = TRUE
)
UPDATE "ProductImages" AS image
SET "IsThumbnail" = FALSE
FROM "RankedThumbnails" AS ranked
WHERE image."ProductImageID" = ranked."ProductImageID"
  AND ranked."Position" > 1;

CREATE UNIQUE INDEX "ProductImages_one_thumbnail_per_product_idx"
  ON "ProductImages"("ProductID")
  WHERE "IsThumbnail" = TRUE;
