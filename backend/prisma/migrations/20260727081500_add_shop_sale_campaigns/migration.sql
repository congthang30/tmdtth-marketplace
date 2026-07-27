CREATE TABLE "ShopSaleCampaigns" (
  "ShopSaleCampaignID" BIGSERIAL NOT NULL,
  "ShopID" BIGINT NOT NULL,
  "CampaignName" VARCHAR(150) NOT NULL,
  "StartsAt" TIMESTAMP(3) NOT NULL,
  "EndsAt" TIMESTAMP(3) NOT NULL,
  "Status" VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP(3),
  CONSTRAINT "ShopSaleCampaigns_pkey" PRIMARY KEY ("ShopSaleCampaignID")
);

CREATE TABLE "ShopSaleCampaignItems" (
  "ShopSaleCampaignItemID" BIGSERIAL NOT NULL,
  "CampaignID" BIGINT NOT NULL,
  "ProductVariantID" BIGINT NOT NULL,
  "SalePrice" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "ShopSaleCampaignItems_pkey" PRIMARY KEY ("ShopSaleCampaignItemID")
);

CREATE INDEX "ShopSaleCampaigns_ShopID_StartsAt_EndsAt_idx" ON "ShopSaleCampaigns"("ShopID", "StartsAt", "EndsAt");
CREATE INDEX "ShopSaleCampaigns_Status_idx" ON "ShopSaleCampaigns"("Status");
CREATE UNIQUE INDEX "ShopSaleCampaignItems_CampaignID_ProductVariantID_key" ON "ShopSaleCampaignItems"("CampaignID", "ProductVariantID");
CREATE INDEX "ShopSaleCampaignItems_ProductVariantID_idx" ON "ShopSaleCampaignItems"("ProductVariantID");
ALTER TABLE "ShopSaleCampaigns" ADD CONSTRAINT "ShopSaleCampaigns_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "ShopSaleCampaignItems" ADD CONSTRAINT "ShopSaleCampaignItems_CampaignID_fkey" FOREIGN KEY ("CampaignID") REFERENCES "ShopSaleCampaigns"("ShopSaleCampaignID") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ShopSaleCampaignItems" ADD CONSTRAINT "ShopSaleCampaignItems_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;
