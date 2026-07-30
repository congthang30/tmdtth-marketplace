ALTER TABLE "Shops" ADD COLUMN "AvatarAssetID" BIGINT;

CREATE UNIQUE INDEX "Shops_AvatarAssetID_key" ON "Shops"("AvatarAssetID");

ALTER TABLE "Shops" ADD CONSTRAINT "Shops_AvatarAssetID_fkey"
  FOREIGN KEY ("AvatarAssetID") REFERENCES "UploadAssets"("UploadAssetID")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
