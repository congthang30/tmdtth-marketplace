CREATE TABLE "ShopCategories" (
  "ShopCategoryID" BIGSERIAL PRIMARY KEY,
  "ShopID" BIGINT NOT NULL,
  "ParentShopCategoryID" BIGINT,
  "CategoryName" VARCHAR(150) NOT NULL,
  "Slug" VARCHAR(180) NOT NULL,
  "Description" VARCHAR(500),
  "SortOrder" INTEGER NOT NULL DEFAULT 0,
  "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP(3),
  CONSTRAINT "ShopCategories_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "ShopCategories_ParentShopCategoryID_fkey" FOREIGN KEY ("ParentShopCategoryID") REFERENCES "ShopCategories"("ShopCategoryID") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "ShopCategories_ShopID_Slug_key" UNIQUE ("ShopID", "Slug")
);
CREATE INDEX "ShopCategories_ShopID_IsActive_SortOrder_idx" ON "ShopCategories"("ShopID", "IsActive", "SortOrder");

CREATE TABLE "ShopCategoryProducts" (
  "ShopCategoryID" BIGINT NOT NULL,
  "ProductID" BIGINT NOT NULL,
  "SortOrder" INTEGER NOT NULL DEFAULT 0,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopCategoryProducts_pkey" PRIMARY KEY ("ShopCategoryID", "ProductID"),
  CONSTRAINT "ShopCategoryProducts_ShopCategoryID_fkey" FOREIGN KEY ("ShopCategoryID") REFERENCES "ShopCategories"("ShopCategoryID") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "ShopCategoryProducts_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "ShopCategoryProducts_ProductID_idx" ON "ShopCategoryProducts"("ProductID");

CREATE TABLE "VoucherShopCategories" (
  "VoucherID" BIGINT NOT NULL,
  "ShopCategoryID" BIGINT NOT NULL,
  "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoucherShopCategories_pkey" PRIMARY KEY ("VoucherID", "ShopCategoryID"),
  CONSTRAINT "VoucherShopCategories_VoucherID_fkey" FOREIGN KEY ("VoucherID") REFERENCES "Vouchers"("VoucherID") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "VoucherShopCategories_ShopCategoryID_fkey" FOREIGN KEY ("ShopCategoryID") REFERENCES "ShopCategories"("ShopCategoryID") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "VoucherShopCategories_ShopCategoryID_idx" ON "VoucherShopCategories"("ShopCategoryID");
