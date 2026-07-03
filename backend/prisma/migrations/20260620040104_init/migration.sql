-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Users" (
    "UserID" BIGSERIAL NOT NULL,
    "UserCode" UUID NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "PhoneNumber" VARCHAR(20),
    "PasswordHash" VARCHAR(500),
    "UserStatus" VARCHAR(50) NOT NULL DEFAULT 'PendingVerification',
    "EmailConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "PhoneConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "LastLoginAt" TIMESTAMP(3),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "UserProfiles" (
    "UserID" BIGINT NOT NULL,
    "FullName" VARCHAR(150) NOT NULL,
    "Gender" VARCHAR(20),
    "DateOfBirth" DATE,
    "AvatarUrl" VARCHAR(1000),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "UserProfiles_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "Addresses" (
    "AddressID" BIGSERIAL NOT NULL,
    "UserID" BIGINT NOT NULL,
    "ReceiverName" VARCHAR(150) NOT NULL,
    "PhoneNumber" VARCHAR(20) NOT NULL,
    "Province" VARCHAR(100) NOT NULL,
    "District" VARCHAR(100) NOT NULL,
    "Ward" VARCHAR(100) NOT NULL,
    "StreetAddress" VARCHAR(255) NOT NULL,
    "FullAddress" VARCHAR(600),
    "IsDefault" BOOLEAN NOT NULL DEFAULT false,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "Addresses_pkey" PRIMARY KEY ("AddressID")
);

-- CreateTable
CREATE TABLE "Shops" (
    "ShopID" BIGSERIAL NOT NULL,
    "OwnerUserID" BIGINT NOT NULL,
    "ShopCode" UUID NOT NULL,
    "ShopName" VARCHAR(150) NOT NULL,
    "Slug" VARCHAR(180) NOT NULL,
    "Description" VARCHAR(1000),
    "Email" VARCHAR(255),
    "PhoneNumber" VARCHAR(20),
    "Province" VARCHAR(100),
    "District" VARCHAR(100),
    "Ward" VARCHAR(100),
    "StreetAddress" VARCHAR(255),
    "TaxCode" VARCHAR(50),
    "ShopStatus" VARCHAR(50) NOT NULL DEFAULT 'PendingApproval',
    "ApprovedByUserID" BIGINT,
    "ApprovedAt" TIMESTAMP(3),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "Shops_pkey" PRIMARY KEY ("ShopID")
);

-- CreateTable
CREATE TABLE "Categories" (
    "CategoryID" BIGSERIAL NOT NULL,
    "ParentCategoryID" BIGINT,
    "CategoryName" VARCHAR(150) NOT NULL,
    "Slug" VARCHAR(180) NOT NULL,
    "Description" VARCHAR(500),
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("CategoryID")
);

-- CreateTable
CREATE TABLE "Products" (
    "ProductID" BIGSERIAL NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "CategoryID" BIGINT NOT NULL,
    "ProductCode" UUID NOT NULL,
    "ProductName" VARCHAR(255) NOT NULL,
    "Slug" VARCHAR(280) NOT NULL,
    "Description" TEXT,
    "Brand" VARCHAR(150),
    "BasePrice" DECIMAL(18,2) NOT NULL,
    "CompareAtPrice" DECIMAL(18,2),
    "WarrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "WeightGram" INTEGER NOT NULL DEFAULT 0,
    "ProductStatus" VARCHAR(50) NOT NULL DEFAULT 'Draft',
    "IsViolation" BOOLEAN NOT NULL DEFAULT false,
    "ViewCount" BIGINT NOT NULL DEFAULT 0,
    "SoldCount" BIGINT NOT NULL DEFAULT 0,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedByUserID" BIGINT,
    "UpdatedByUserID" BIGINT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "Products_pkey" PRIMARY KEY ("ProductID")
);

-- CreateTable
CREATE TABLE "ProductVariants" (
    "ProductVariantID" BIGSERIAL NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "SKU" VARCHAR(100) NOT NULL,
    "VariantName" VARCHAR(255) NOT NULL,
    "VariantOptionJson" TEXT,
    "Price" DECIMAL(18,2) NOT NULL,
    "CompareAtPrice" DECIMAL(18,2),
    "WeightGram" INTEGER NOT NULL DEFAULT 0,
    "VariantStatus" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVariants_pkey" PRIMARY KEY ("ProductVariantID")
);

-- CreateTable
CREATE TABLE "ProductImages" (
    "ProductImageID" BIGSERIAL NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT,
    "ImageUrl" VARCHAR(1000) NOT NULL,
    "AltText" VARCHAR(255),
    "SortOrder" INTEGER NOT NULL DEFAULT 0,
    "IsThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImages_pkey" PRIMARY KEY ("ProductImageID")
);

-- CreateTable
CREATE TABLE "ProductInventory" (
    "ProductInventoryID" BIGSERIAL NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT NOT NULL,
    "QuantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "QuantityReserved" INTEGER NOT NULL DEFAULT 0,
    "QuantityAvailable" INTEGER NOT NULL DEFAULT 0,
    "LowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "UpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("ProductInventoryID")
);

-- CreateTable
CREATE TABLE "InventoryTransactions" (
    "InventoryTransactionID" BIGSERIAL NOT NULL,
    "ProductInventoryID" BIGINT NOT NULL,
    "TransactionType" VARCHAR(50) NOT NULL,
    "QuantityChange" INTEGER NOT NULL,
    "QuantityAfter" INTEGER NOT NULL,
    "ReferenceType" VARCHAR(50),
    "ReferenceID" BIGINT,
    "Note" VARCHAR(500),
    "CreatedByUserID" BIGINT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransactions_pkey" PRIMARY KEY ("InventoryTransactionID")
);

-- CreateTable
CREATE TABLE "ProductAttributes" (
    "ProductAttributeID" BIGSERIAL NOT NULL,
    "CategoryID" BIGINT NOT NULL,
    "AttributeName" VARCHAR(150) NOT NULL,
    "DataType" VARCHAR(50) NOT NULL,
    "Unit" VARCHAR(50),
    "IsRequired" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAttributes_pkey" PRIMARY KEY ("ProductAttributeID")
);

-- CreateTable
CREATE TABLE "ProductAttributeValues" (
    "ProductAttributeValueID" BIGSERIAL NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT,
    "ProductAttributeID" BIGINT NOT NULL,
    "ValueText" VARCHAR(1000) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAttributeValues_pkey" PRIMARY KEY ("ProductAttributeValueID")
);

-- CreateTable
CREATE TABLE "ProductModerationLogs" (
    "ProductModerationLogID" BIGSERIAL NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ModeratorUserID" BIGINT NOT NULL,
    "ModerationStatus" VARCHAR(50) NOT NULL,
    "Reason" VARCHAR(1000),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductModerationLogs_pkey" PRIMARY KEY ("ProductModerationLogID")
);

-- CreateTable
CREATE TABLE "Carts" (
    "CartID" BIGSERIAL NOT NULL,
    "UserID" BIGINT NOT NULL,
    "CartStatus" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Carts_pkey" PRIMARY KEY ("CartID")
);

-- CreateTable
CREATE TABLE "CartItems" (
    "CartItemID" BIGSERIAL NOT NULL,
    "CartID" BIGINT NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitPriceSnapshot" DECIMAL(18,2) NOT NULL,
    "IsSelected" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CartItems_pkey" PRIMARY KEY ("CartItemID")
);

-- CreateTable
CREATE TABLE "PaymentMethods" (
    "PaymentMethodID" BIGSERIAL NOT NULL,
    "MethodCode" VARCHAR(50) NOT NULL,
    "MethodName" VARCHAR(100) NOT NULL,
    "IsOnline" BOOLEAN NOT NULL DEFAULT false,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethods_pkey" PRIMARY KEY ("PaymentMethodID")
);

-- CreateTable
CREATE TABLE "Orders" (
    "OrderID" BIGSERIAL NOT NULL,
    "OrderCode" VARCHAR(50) NOT NULL,
    "UserID" BIGINT NOT NULL,
    "ShippingAddressID" BIGINT,
    "PaymentMethodID" BIGINT NOT NULL,
    "OrderStatus" VARCHAR(50) NOT NULL DEFAULT 'Created',
    "PaymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "ReceiverName" VARCHAR(150) NOT NULL,
    "ReceiverPhone" VARCHAR(20) NOT NULL,
    "ShippingProvince" VARCHAR(100) NOT NULL,
    "ShippingDistrict" VARCHAR(100) NOT NULL,
    "ShippingWard" VARCHAR(100) NOT NULL,
    "ShippingStreetAddress" VARCHAR(255) NOT NULL,
    "SubtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ShippingFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "TotalAmount" DECIMAL(18,2) NOT NULL,
    "CustomerNote" VARCHAR(1000),
    "CancelledAt" TIMESTAMP(3),
    "CompletedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("OrderID")
);

-- CreateTable
CREATE TABLE "ShopOrders" (
    "ShopOrderID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "ShopOrderCode" VARCHAR(60) NOT NULL,
    "ShippingCompanyID" BIGINT,
    "ShippingServiceID" BIGINT,
    "ShippingQuoteID" BIGINT,
    "OrderStatus" VARCHAR(50) NOT NULL DEFAULT 'WaitingForSeller',
    "SubtotalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "DiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ShippingFeeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "TotalAmount" DECIMAL(18,2) NOT NULL,
    "SellerNote" VARCHAR(1000),
    "ConfirmedAt" TIMESTAMP(3),
    "PreparedAt" TIMESTAMP(3),
    "CompletedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "ShopOrders_pkey" PRIMARY KEY ("ShopOrderID")
);

-- CreateTable
CREATE TABLE "OrderItems" (
    "OrderItemID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "ShopOrderID" BIGINT NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT NOT NULL,
    "ProductNameSnapshot" VARCHAR(255) NOT NULL,
    "VariantNameSnapshot" VARCHAR(255),
    "SKUSnapshot" VARCHAR(100),
    "UnitPrice" DECIMAL(18,2) NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "DiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "LineTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ItemStatus" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("OrderItemID")
);

-- CreateTable
CREATE TABLE "OrderStatusHistories" (
    "OrderStatusHistoryID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT,
    "ShopOrderID" BIGINT,
    "FromStatus" VARCHAR(50),
    "ToStatus" VARCHAR(50) NOT NULL,
    "ChangedByUserID" BIGINT,
    "Reason" VARCHAR(1000),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistories_pkey" PRIMARY KEY ("OrderStatusHistoryID")
);

-- CreateTable
CREATE TABLE "OrderNotes" (
    "OrderNoteID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT,
    "ShopOrderID" BIGINT,
    "CreatedByUserID" BIGINT,
    "NoteType" VARCHAR(50) NOT NULL DEFAULT 'Internal',
    "NoteText" VARCHAR(2000) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNotes_pkey" PRIMARY KEY ("OrderNoteID")
);

-- CreateTable
CREATE TABLE "OrderCancellations" (
    "OrderCancellationID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT,
    "ShopOrderID" BIGINT,
    "RequestedByUserID" BIGINT NOT NULL,
    "CancellationReason" VARCHAR(1000) NOT NULL,
    "CancellationStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "ApprovedByUserID" BIGINT,
    "ApprovedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCancellations_pkey" PRIMARY KEY ("OrderCancellationID")
);

-- CreateTable
CREATE TABLE "ShippingCompanies" (
    "ShippingCompanyID" BIGSERIAL NOT NULL,
    "OwnerUserID" BIGINT NOT NULL,
    "CompanyCode" UUID NOT NULL,
    "CompanyName" VARCHAR(150) NOT NULL,
    "Slug" VARCHAR(180) NOT NULL,
    "Email" VARCHAR(255),
    "PhoneNumber" VARCHAR(20),
    "TaxCode" VARCHAR(50),
    "AddressText" VARCHAR(500),
    "CompanyStatus" VARCHAR(50) NOT NULL DEFAULT 'PendingApproval',
    "ApprovedByUserID" BIGINT,
    "ApprovedAt" TIMESTAMP(3),
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),
    "DeletedAt" TIMESTAMP(3),

    CONSTRAINT "ShippingCompanies_pkey" PRIMARY KEY ("ShippingCompanyID")
);

-- CreateTable
CREATE TABLE "ShippingServices" (
    "ShippingServiceID" BIGSERIAL NOT NULL,
    "ShippingCompanyID" BIGINT NOT NULL,
    "ServiceCode" VARCHAR(50) NOT NULL,
    "ServiceName" VARCHAR(150) NOT NULL,
    "BaseFee" DECIMAL(18,2) NOT NULL,
    "FeePerKg" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "EstimatedMinDays" INTEGER NOT NULL DEFAULT 1,
    "EstimatedMaxDays" INTEGER NOT NULL DEFAULT 3,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "ShippingServices_pkey" PRIMARY KEY ("ShippingServiceID")
);

-- CreateTable
CREATE TABLE "ShippingQuotes" (
    "ShippingQuoteID" BIGSERIAL NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "ShippingCompanyID" BIGINT NOT NULL,
    "ShippingServiceID" BIGINT NOT NULL,
    "DestinationProvince" VARCHAR(100) NOT NULL,
    "DestinationDistrict" VARCHAR(100),
    "TotalWeightGram" INTEGER NOT NULL,
    "QuotedFee" DECIMAL(18,2) NOT NULL,
    "EstimatedMinDays" INTEGER NOT NULL,
    "EstimatedMaxDays" INTEGER NOT NULL,
    "ExpiresAt" TIMESTAMP(3) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingQuotes_pkey" PRIMARY KEY ("ShippingQuoteID")
);

-- CreateTable
CREATE TABLE "Shipments" (
    "ShipmentID" BIGSERIAL NOT NULL,
    "ShopOrderID" BIGINT NOT NULL,
    "ShippingCompanyID" BIGINT NOT NULL,
    "ShippingServiceID" BIGINT NOT NULL,
    "ShipmentCode" VARCHAR(80) NOT NULL,
    "TrackingNumber" VARCHAR(100),
    "ShipmentStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "ShippingFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "CODAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "PickupAddress" VARCHAR(500),
    "DeliveryAddress" VARCHAR(500) NOT NULL,
    "RecipientName" VARCHAR(150) NOT NULL,
    "RecipientPhone" VARCHAR(20) NOT NULL,
    "ExpectedDeliveryAt" TIMESTAMP(3),
    "PickedUpAt" TIMESTAMP(3),
    "DeliveredAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Shipments_pkey" PRIMARY KEY ("ShipmentID")
);

-- CreateTable
CREATE TABLE "ShipmentItems" (
    "ShipmentItemID" BIGSERIAL NOT NULL,
    "ShipmentID" BIGINT NOT NULL,
    "OrderItemID" BIGINT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentItems_pkey" PRIMARY KEY ("ShipmentItemID")
);

-- CreateTable
CREATE TABLE "ShipmentTrackingHistories" (
    "ShipmentTrackingHistoryID" BIGSERIAL NOT NULL,
    "ShipmentID" BIGINT NOT NULL,
    "FromStatus" VARCHAR(50),
    "ToStatus" VARCHAR(50) NOT NULL,
    "LocationText" VARCHAR(255),
    "Note" VARCHAR(1000),
    "UpdatedByUserID" BIGINT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTrackingHistories_pkey" PRIMARY KEY ("ShipmentTrackingHistoryID")
);

-- CreateTable
CREATE TABLE "Payments" (
    "PaymentID" BIGSERIAL NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "PaymentMethodID" BIGINT NOT NULL,
    "PaymentCode" VARCHAR(80) NOT NULL,
    "ProviderName" VARCHAR(100),
    "ProviderTransactionCode" VARCHAR(255),
    "Amount" DECIMAL(18,2) NOT NULL,
    "PaymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "PaidAt" TIMESTAMP(3),
    "ExpiredAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("PaymentID")
);

-- CreateTable
CREATE TABLE "PaymentTransactions" (
    "PaymentTransactionID" BIGSERIAL NOT NULL,
    "PaymentID" BIGINT NOT NULL,
    "TransactionCode" VARCHAR(255) NOT NULL,
    "TransactionType" VARCHAR(50) NOT NULL,
    "TransactionStatus" VARCHAR(50) NOT NULL,
    "Amount" DECIMAL(18,2) NOT NULL,
    "ProviderResponseCode" VARCHAR(100),
    "ProviderResponseMessage" VARCHAR(1000),
    "RawResponse" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransactions_pkey" PRIMARY KEY ("PaymentTransactionID")
);

-- CreateTable
CREATE TABLE "PaymentStatusHistories" (
    "PaymentStatusHistoryID" BIGSERIAL NOT NULL,
    "PaymentID" BIGINT NOT NULL,
    "FromStatus" VARCHAR(50),
    "ToStatus" VARCHAR(50) NOT NULL,
    "Reason" VARCHAR(1000),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentStatusHistories_pkey" PRIMARY KEY ("PaymentStatusHistoryID")
);

-- CreateTable
CREATE TABLE "Vouchers" (
    "VoucherID" BIGSERIAL NOT NULL,
    "VoucherCode" VARCHAR(50) NOT NULL,
    "VoucherName" VARCHAR(150) NOT NULL,
    "ShopID" BIGINT,
    "DiscountType" VARCHAR(50) NOT NULL,
    "DiscountValue" DECIMAL(18,2) NOT NULL,
    "MaxDiscountAmount" DECIMAL(18,2),
    "MinOrderAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "UsageLimit" INTEGER,
    "UsedCount" INTEGER NOT NULL DEFAULT 0,
    "StartAt" TIMESTAMP(3) NOT NULL,
    "EndAt" TIMESTAMP(3) NOT NULL,
    "VoucherStatus" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vouchers_pkey" PRIMARY KEY ("VoucherID")
);

-- CreateTable
CREATE TABLE "VoucherUsages" (
    "VoucherUsageID" BIGSERIAL NOT NULL,
    "VoucherID" BIGINT NOT NULL,
    "UserID" BIGINT NOT NULL,
    "OrderID" BIGINT,
    "ShopOrderID" BIGINT,
    "DiscountAmount" DECIMAL(18,2) NOT NULL,
    "UsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherUsages_pkey" PRIMARY KEY ("VoucherUsageID")
);

-- CreateTable
CREATE TABLE "ProductReviews" (
    "ProductReviewID" BIGSERIAL NOT NULL,
    "OrderItemID" BIGINT NOT NULL,
    "ProductID" BIGINT NOT NULL,
    "ProductVariantID" BIGINT,
    "UserID" BIGINT NOT NULL,
    "Rating" SMALLINT NOT NULL,
    "ReviewTitle" VARCHAR(255),
    "ReviewContent" VARCHAR(2000),
    "ReviewStatus" VARCHAR(50) NOT NULL DEFAULT 'Published',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "ProductReviews_pkey" PRIMARY KEY ("ProductReviewID")
);

-- CreateTable
CREATE TABLE "ShopReviews" (
    "ShopReviewID" BIGSERIAL NOT NULL,
    "ShopOrderID" BIGINT NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "UserID" BIGINT NOT NULL,
    "Rating" SMALLINT NOT NULL,
    "ReviewContent" VARCHAR(2000),
    "ReviewStatus" VARCHAR(50) NOT NULL DEFAULT 'Published',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReviews_pkey" PRIMARY KEY ("ShopReviewID")
);

-- CreateTable
CREATE TABLE "ShippingReviews" (
    "ShippingReviewID" BIGSERIAL NOT NULL,
    "ShipmentID" BIGINT NOT NULL,
    "ShippingCompanyID" BIGINT NOT NULL,
    "UserID" BIGINT NOT NULL,
    "Rating" SMALLINT NOT NULL,
    "ReviewContent" VARCHAR(2000),
    "ReviewStatus" VARCHAR(50) NOT NULL DEFAULT 'Published',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShippingReviews_pkey" PRIMARY KEY ("ShippingReviewID")
);

-- CreateTable
CREATE TABLE "ReturnRequests" (
    "ReturnRequestID" BIGSERIAL NOT NULL,
    "ReturnCode" VARCHAR(80) NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "ShopOrderID" BIGINT NOT NULL,
    "UserID" BIGINT NOT NULL,
    "ShopID" BIGINT NOT NULL,
    "ReturnReason" VARCHAR(1000) NOT NULL,
    "ReturnRequestStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "RequestedRefundAmount" DECIMAL(18,2) NOT NULL,
    "DeadlineAt" TIMESTAMP(3) NOT NULL,
    "ReviewedByUserID" BIGINT,
    "ReviewedAt" TIMESTAMP(3),
    "ResolutionNote" VARCHAR(2000),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnRequests_pkey" PRIMARY KEY ("ReturnRequestID")
);

-- CreateTable
CREATE TABLE "ReturnRequestItems" (
    "ReturnRequestItemID" BIGSERIAL NOT NULL,
    "ReturnRequestID" BIGINT NOT NULL,
    "OrderItemID" BIGINT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "RequestedRefundAmount" DECIMAL(18,2) NOT NULL,
    "ItemCondition" VARCHAR(50),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnRequestItems_pkey" PRIMARY KEY ("ReturnRequestItemID")
);

-- CreateTable
CREATE TABLE "RefundRequests" (
    "RefundRequestID" BIGSERIAL NOT NULL,
    "RefundRequestCode" VARCHAR(80) NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "ShopOrderID" BIGINT,
    "PaymentID" BIGINT NOT NULL,
    "ReturnRequestID" BIGINT,
    "ComplaintID" BIGINT,
    "RequestedByUserID" BIGINT NOT NULL,
    "Amount" DECIMAL(18,2) NOT NULL,
    "RefundRequestStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "Reason" VARCHAR(1000),
    "ApprovedByUserID" BIGINT,
    "ApprovedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundRequests_pkey" PRIMARY KEY ("RefundRequestID")
);

-- CreateTable
CREATE TABLE "Refunds" (
    "RefundID" BIGSERIAL NOT NULL,
    "RefundRequestID" BIGINT NOT NULL,
    "PaymentID" BIGINT NOT NULL,
    "RefundCode" VARCHAR(80) NOT NULL,
    "ProviderRefundCode" VARCHAR(255),
    "Amount" DECIMAL(18,2) NOT NULL,
    "RefundStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "RefundedAt" TIMESTAMP(3),
    "ProviderResponse" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Refunds_pkey" PRIMARY KEY ("RefundID")
);

-- CreateTable
CREATE TABLE "Complaints" (
    "ComplaintID" BIGSERIAL NOT NULL,
    "ComplaintCode" VARCHAR(80) NOT NULL,
    "ComplaintType" VARCHAR(50) NOT NULL,
    "OrderID" BIGINT,
    "ShopOrderID" BIGINT,
    "ShipmentID" BIGINT,
    "ReturnRequestID" BIGINT,
    "ComplainantUserID" BIGINT NOT NULL,
    "AgainstShopID" BIGINT,
    "AgainstShippingCompanyID" BIGINT,
    "ComplaintTitle" VARCHAR(255) NOT NULL,
    "ComplaintContent" VARCHAR(3000) NOT NULL,
    "ComplaintStatus" VARCHAR(50) NOT NULL DEFAULT 'Open',
    "DeadlineAt" TIMESTAMP(3) NOT NULL,
    "AssignedAdminUserID" BIGINT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Complaints_pkey" PRIMARY KEY ("ComplaintID")
);

-- CreateTable
CREATE TABLE "ComplaintEvidenceFiles" (
    "ComplaintEvidenceFileID" BIGSERIAL NOT NULL,
    "ComplaintID" BIGINT,
    "ReturnRequestID" BIGINT,
    "UploadedByUserID" BIGINT NOT NULL,
    "FileType" VARCHAR(50) NOT NULL,
    "FileUrl" VARCHAR(1000) NOT NULL,
    "Description" VARCHAR(500),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintEvidenceFiles_pkey" PRIMARY KEY ("ComplaintEvidenceFileID")
);

-- CreateTable
CREATE TABLE "ComplaintResolutions" (
    "ComplaintResolutionID" BIGSERIAL NOT NULL,
    "ComplaintID" BIGINT NOT NULL,
    "ResolvedByUserID" BIGINT NOT NULL,
    "ResolutionType" VARCHAR(50) NOT NULL,
    "CompensationAmount" DECIMAL(18,2),
    "ResolutionContent" VARCHAR(3000) NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintResolutions_pkey" PRIMARY KEY ("ComplaintResolutionID")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_UserCode_key" ON "Users"("UserCode");

-- CreateIndex
CREATE UNIQUE INDEX "Users_Email_key" ON "Users"("Email");

-- CreateIndex
CREATE INDEX "Addresses_UserID_idx" ON "Addresses"("UserID");

-- CreateIndex
CREATE UNIQUE INDEX "Shops_ShopCode_key" ON "Shops"("ShopCode");

-- CreateIndex
CREATE UNIQUE INDEX "Shops_Slug_key" ON "Shops"("Slug");

-- CreateIndex
CREATE INDEX "Shops_OwnerUserID_idx" ON "Shops"("OwnerUserID");

-- CreateIndex
CREATE UNIQUE INDEX "Categories_Slug_key" ON "Categories"("Slug");

-- CreateIndex
CREATE INDEX "Categories_ParentCategoryID_idx" ON "Categories"("ParentCategoryID");

-- CreateIndex
CREATE UNIQUE INDEX "Products_ProductCode_key" ON "Products"("ProductCode");

-- CreateIndex
CREATE INDEX "Products_CategoryID_idx" ON "Products"("CategoryID");

-- CreateIndex
CREATE INDEX "Products_ProductStatus_idx" ON "Products"("ProductStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Products_ShopID_Slug_key" ON "Products"("ShopID", "Slug");

-- CreateIndex
CREATE INDEX "ProductVariants_ProductID_idx" ON "ProductVariants"("ProductID");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariants_ProductID_SKU_key" ON "ProductVariants"("ProductID", "SKU");

-- CreateIndex
CREATE INDEX "ProductImages_ProductID_idx" ON "ProductImages"("ProductID");

-- CreateIndex
CREATE INDEX "ProductImages_ProductVariantID_idx" ON "ProductImages"("ProductVariantID");

-- CreateIndex
CREATE INDEX "ProductInventory_ProductID_idx" ON "ProductInventory"("ProductID");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_ProductVariantID_key" ON "ProductInventory"("ProductVariantID");

-- CreateIndex
CREATE INDEX "InventoryTransactions_ProductInventoryID_idx" ON "InventoryTransactions"("ProductInventoryID");

-- CreateIndex
CREATE INDEX "InventoryTransactions_ReferenceType_ReferenceID_idx" ON "InventoryTransactions"("ReferenceType", "ReferenceID");

-- CreateIndex
CREATE INDEX "ProductAttributes_CategoryID_idx" ON "ProductAttributes"("CategoryID");

-- CreateIndex
CREATE INDEX "ProductAttributeValues_ProductID_idx" ON "ProductAttributeValues"("ProductID");

-- CreateIndex
CREATE INDEX "ProductAttributeValues_ProductVariantID_idx" ON "ProductAttributeValues"("ProductVariantID");

-- CreateIndex
CREATE INDEX "ProductAttributeValues_ProductAttributeID_idx" ON "ProductAttributeValues"("ProductAttributeID");

-- CreateIndex
CREATE INDEX "ProductModerationLogs_ProductID_idx" ON "ProductModerationLogs"("ProductID");

-- CreateIndex
CREATE INDEX "ProductModerationLogs_ModeratorUserID_idx" ON "ProductModerationLogs"("ModeratorUserID");

-- CreateIndex
CREATE INDEX "Carts_UserID_idx" ON "Carts"("UserID");

-- CreateIndex
CREATE INDEX "CartItems_ShopID_idx" ON "CartItems"("ShopID");

-- CreateIndex
CREATE INDEX "CartItems_ProductID_idx" ON "CartItems"("ProductID");

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_CartID_ProductVariantID_key" ON "CartItems"("CartID", "ProductVariantID");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethods_MethodCode_key" ON "PaymentMethods"("MethodCode");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_OrderCode_key" ON "Orders"("OrderCode");

-- CreateIndex
CREATE INDEX "Orders_UserID_idx" ON "Orders"("UserID");

-- CreateIndex
CREATE INDEX "Orders_ShippingAddressID_idx" ON "Orders"("ShippingAddressID");

-- CreateIndex
CREATE INDEX "Orders_PaymentMethodID_idx" ON "Orders"("PaymentMethodID");

-- CreateIndex
CREATE INDEX "Orders_OrderStatus_idx" ON "Orders"("OrderStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrders_ShopOrderCode_key" ON "ShopOrders"("ShopOrderCode");

-- CreateIndex
CREATE INDEX "ShopOrders_OrderID_idx" ON "ShopOrders"("OrderID");

-- CreateIndex
CREATE INDEX "ShopOrders_ShopID_idx" ON "ShopOrders"("ShopID");

-- CreateIndex
CREATE INDEX "ShopOrders_OrderStatus_idx" ON "ShopOrders"("OrderStatus");

-- CreateIndex
CREATE INDEX "OrderItems_OrderID_idx" ON "OrderItems"("OrderID");

-- CreateIndex
CREATE INDEX "OrderItems_ShopOrderID_idx" ON "OrderItems"("ShopOrderID");

-- CreateIndex
CREATE INDEX "OrderItems_ProductID_idx" ON "OrderItems"("ProductID");

-- CreateIndex
CREATE INDEX "OrderStatusHistories_OrderID_idx" ON "OrderStatusHistories"("OrderID");

-- CreateIndex
CREATE INDEX "OrderStatusHistories_ShopOrderID_idx" ON "OrderStatusHistories"("ShopOrderID");

-- CreateIndex
CREATE INDEX "OrderNotes_OrderID_idx" ON "OrderNotes"("OrderID");

-- CreateIndex
CREATE INDEX "OrderNotes_ShopOrderID_idx" ON "OrderNotes"("ShopOrderID");

-- CreateIndex
CREATE INDEX "OrderCancellations_OrderID_idx" ON "OrderCancellations"("OrderID");

-- CreateIndex
CREATE INDEX "OrderCancellations_ShopOrderID_idx" ON "OrderCancellations"("ShopOrderID");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCompanies_CompanyCode_key" ON "ShippingCompanies"("CompanyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCompanies_Slug_key" ON "ShippingCompanies"("Slug");

-- CreateIndex
CREATE INDEX "ShippingCompanies_OwnerUserID_idx" ON "ShippingCompanies"("OwnerUserID");

-- CreateIndex
CREATE INDEX "ShippingServices_ShippingCompanyID_idx" ON "ShippingServices"("ShippingCompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingServices_ShippingCompanyID_ServiceCode_key" ON "ShippingServices"("ShippingCompanyID", "ServiceCode");

-- CreateIndex
CREATE INDEX "ShippingQuotes_ShopID_idx" ON "ShippingQuotes"("ShopID");

-- CreateIndex
CREATE INDEX "ShippingQuotes_ShippingCompanyID_idx" ON "ShippingQuotes"("ShippingCompanyID");

-- CreateIndex
CREATE INDEX "ShippingQuotes_ShippingServiceID_idx" ON "ShippingQuotes"("ShippingServiceID");

-- CreateIndex
CREATE UNIQUE INDEX "Shipments_ShipmentCode_key" ON "Shipments"("ShipmentCode");

-- CreateIndex
CREATE INDEX "Shipments_ShopOrderID_idx" ON "Shipments"("ShopOrderID");

-- CreateIndex
CREATE INDEX "Shipments_ShippingCompanyID_idx" ON "Shipments"("ShippingCompanyID");

-- CreateIndex
CREATE INDEX "Shipments_ShipmentStatus_idx" ON "Shipments"("ShipmentStatus");

-- CreateIndex
CREATE INDEX "ShipmentItems_ShipmentID_idx" ON "ShipmentItems"("ShipmentID");

-- CreateIndex
CREATE INDEX "ShipmentItems_OrderItemID_idx" ON "ShipmentItems"("OrderItemID");

-- CreateIndex
CREATE INDEX "ShipmentTrackingHistories_ShipmentID_idx" ON "ShipmentTrackingHistories"("ShipmentID");

-- CreateIndex
CREATE UNIQUE INDEX "Payments_PaymentCode_key" ON "Payments"("PaymentCode");

-- CreateIndex
CREATE INDEX "Payments_OrderID_idx" ON "Payments"("OrderID");

-- CreateIndex
CREATE INDEX "Payments_PaymentMethodID_idx" ON "Payments"("PaymentMethodID");

-- CreateIndex
CREATE INDEX "Payments_PaymentStatus_idx" ON "Payments"("PaymentStatus");

-- CreateIndex
CREATE INDEX "PaymentTransactions_PaymentID_idx" ON "PaymentTransactions"("PaymentID");

-- CreateIndex
CREATE INDEX "PaymentStatusHistories_PaymentID_idx" ON "PaymentStatusHistories"("PaymentID");

-- CreateIndex
CREATE UNIQUE INDEX "Vouchers_VoucherCode_key" ON "Vouchers"("VoucherCode");

-- CreateIndex
CREATE INDEX "Vouchers_ShopID_idx" ON "Vouchers"("ShopID");

-- CreateIndex
CREATE INDEX "VoucherUsages_VoucherID_idx" ON "VoucherUsages"("VoucherID");

-- CreateIndex
CREATE INDEX "VoucherUsages_UserID_idx" ON "VoucherUsages"("UserID");

-- CreateIndex
CREATE INDEX "VoucherUsages_OrderID_idx" ON "VoucherUsages"("OrderID");

-- CreateIndex
CREATE INDEX "ProductReviews_ProductID_idx" ON "ProductReviews"("ProductID");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReviews_OrderItemID_UserID_key" ON "ProductReviews"("OrderItemID", "UserID");

-- CreateIndex
CREATE INDEX "ShopReviews_ShopID_idx" ON "ShopReviews"("ShopID");

-- CreateIndex
CREATE UNIQUE INDEX "ShopReviews_ShopOrderID_UserID_key" ON "ShopReviews"("ShopOrderID", "UserID");

-- CreateIndex
CREATE INDEX "ShippingReviews_ShippingCompanyID_idx" ON "ShippingReviews"("ShippingCompanyID");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingReviews_ShipmentID_UserID_key" ON "ShippingReviews"("ShipmentID", "UserID");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequests_ReturnCode_key" ON "ReturnRequests"("ReturnCode");

-- CreateIndex
CREATE INDEX "ReturnRequests_OrderID_idx" ON "ReturnRequests"("OrderID");

-- CreateIndex
CREATE INDEX "ReturnRequests_ShopOrderID_idx" ON "ReturnRequests"("ShopOrderID");

-- CreateIndex
CREATE INDEX "ReturnRequests_UserID_idx" ON "ReturnRequests"("UserID");

-- CreateIndex
CREATE INDEX "ReturnRequestItems_ReturnRequestID_idx" ON "ReturnRequestItems"("ReturnRequestID");

-- CreateIndex
CREATE INDEX "ReturnRequestItems_OrderItemID_idx" ON "ReturnRequestItems"("OrderItemID");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequests_RefundRequestCode_key" ON "RefundRequests"("RefundRequestCode");

-- CreateIndex
CREATE INDEX "RefundRequests_OrderID_idx" ON "RefundRequests"("OrderID");

-- CreateIndex
CREATE INDEX "RefundRequests_PaymentID_idx" ON "RefundRequests"("PaymentID");

-- CreateIndex
CREATE INDEX "RefundRequests_ReturnRequestID_idx" ON "RefundRequests"("ReturnRequestID");

-- CreateIndex
CREATE UNIQUE INDEX "Refunds_RefundCode_key" ON "Refunds"("RefundCode");

-- CreateIndex
CREATE INDEX "Refunds_RefundRequestID_idx" ON "Refunds"("RefundRequestID");

-- CreateIndex
CREATE INDEX "Refunds_PaymentID_idx" ON "Refunds"("PaymentID");

-- CreateIndex
CREATE UNIQUE INDEX "Complaints_ComplaintCode_key" ON "Complaints"("ComplaintCode");

-- CreateIndex
CREATE INDEX "Complaints_OrderID_idx" ON "Complaints"("OrderID");

-- CreateIndex
CREATE INDEX "Complaints_ShopOrderID_idx" ON "Complaints"("ShopOrderID");

-- CreateIndex
CREATE INDEX "Complaints_ComplainantUserID_idx" ON "Complaints"("ComplainantUserID");

-- CreateIndex
CREATE INDEX "Complaints_ComplaintStatus_idx" ON "Complaints"("ComplaintStatus");

-- CreateIndex
CREATE INDEX "ComplaintEvidenceFiles_ComplaintID_idx" ON "ComplaintEvidenceFiles"("ComplaintID");

-- CreateIndex
CREATE INDEX "ComplaintEvidenceFiles_ReturnRequestID_idx" ON "ComplaintEvidenceFiles"("ReturnRequestID");

-- CreateIndex
CREATE INDEX "ComplaintResolutions_ComplaintID_idx" ON "ComplaintResolutions"("ComplaintID");

-- AddForeignKey
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Addresses" ADD CONSTRAINT "Addresses_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Shops" ADD CONSTRAINT "Shops_OwnerUserID_fkey" FOREIGN KEY ("OwnerUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Shops" ADD CONSTRAINT "Shops_ApprovedByUserID_fkey" FOREIGN KEY ("ApprovedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Categories" ADD CONSTRAINT "Categories_ParentCategoryID_fkey" FOREIGN KEY ("ParentCategoryID") REFERENCES "Categories"("CategoryID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_CreatedByUserID_fkey" FOREIGN KEY ("CreatedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_UpdatedByUserID_fkey" FOREIGN KEY ("UpdatedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductVariants" ADD CONSTRAINT "ProductVariants_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductImages" ADD CONSTRAINT "ProductImages_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductImages" ADD CONSTRAINT "ProductImages_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryTransactions" ADD CONSTRAINT "InventoryTransactions_ProductInventoryID_fkey" FOREIGN KEY ("ProductInventoryID") REFERENCES "ProductInventory"("ProductInventoryID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryTransactions" ADD CONSTRAINT "InventoryTransactions_CreatedByUserID_fkey" FOREIGN KEY ("CreatedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributes" ADD CONSTRAINT "ProductAttributes_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributeValues" ADD CONSTRAINT "ProductAttributeValues_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributeValues" ADD CONSTRAINT "ProductAttributeValues_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributeValues" ADD CONSTRAINT "ProductAttributeValues_ProductAttributeID_fkey" FOREIGN KEY ("ProductAttributeID") REFERENCES "ProductAttributes"("ProductAttributeID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductModerationLogs" ADD CONSTRAINT "ProductModerationLogs_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductModerationLogs" ADD CONSTRAINT "ProductModerationLogs_ModeratorUserID_fkey" FOREIGN KEY ("ModeratorUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Carts" ADD CONSTRAINT "Carts_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_CartID_fkey" FOREIGN KEY ("CartID") REFERENCES "Carts"("CartID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_ShippingAddressID_fkey" FOREIGN KEY ("ShippingAddressID") REFERENCES "Addresses"("AddressID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_PaymentMethodID_fkey" FOREIGN KEY ("PaymentMethodID") REFERENCES "PaymentMethods"("PaymentMethodID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopOrders" ADD CONSTRAINT "ShopOrders_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopOrders" ADD CONSTRAINT "ShopOrders_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopOrders" ADD CONSTRAINT "ShopOrders_ShippingCompanyID_fkey" FOREIGN KEY ("ShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopOrders" ADD CONSTRAINT "ShopOrders_ShippingServiceID_fkey" FOREIGN KEY ("ShippingServiceID") REFERENCES "ShippingServices"("ShippingServiceID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopOrders" ADD CONSTRAINT "ShopOrders_ShippingQuoteID_fkey" FOREIGN KEY ("ShippingQuoteID") REFERENCES "ShippingQuotes"("ShippingQuoteID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderStatusHistories" ADD CONSTRAINT "OrderStatusHistories_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderStatusHistories" ADD CONSTRAINT "OrderStatusHistories_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderStatusHistories" ADD CONSTRAINT "OrderStatusHistories_ChangedByUserID_fkey" FOREIGN KEY ("ChangedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderNotes" ADD CONSTRAINT "OrderNotes_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderNotes" ADD CONSTRAINT "OrderNotes_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderNotes" ADD CONSTRAINT "OrderNotes_CreatedByUserID_fkey" FOREIGN KEY ("CreatedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderCancellations" ADD CONSTRAINT "OrderCancellations_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderCancellations" ADD CONSTRAINT "OrderCancellations_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderCancellations" ADD CONSTRAINT "OrderCancellations_RequestedByUserID_fkey" FOREIGN KEY ("RequestedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderCancellations" ADD CONSTRAINT "OrderCancellations_ApprovedByUserID_fkey" FOREIGN KEY ("ApprovedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingCompanies" ADD CONSTRAINT "ShippingCompanies_OwnerUserID_fkey" FOREIGN KEY ("OwnerUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingCompanies" ADD CONSTRAINT "ShippingCompanies_ApprovedByUserID_fkey" FOREIGN KEY ("ApprovedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingServices" ADD CONSTRAINT "ShippingServices_ShippingCompanyID_fkey" FOREIGN KEY ("ShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingQuotes" ADD CONSTRAINT "ShippingQuotes_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingQuotes" ADD CONSTRAINT "ShippingQuotes_ShippingCompanyID_fkey" FOREIGN KEY ("ShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingQuotes" ADD CONSTRAINT "ShippingQuotes_ShippingServiceID_fkey" FOREIGN KEY ("ShippingServiceID") REFERENCES "ShippingServices"("ShippingServiceID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Shipments" ADD CONSTRAINT "Shipments_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Shipments" ADD CONSTRAINT "Shipments_ShippingCompanyID_fkey" FOREIGN KEY ("ShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Shipments" ADD CONSTRAINT "Shipments_ShippingServiceID_fkey" FOREIGN KEY ("ShippingServiceID") REFERENCES "ShippingServices"("ShippingServiceID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShipmentItems" ADD CONSTRAINT "ShipmentItems_ShipmentID_fkey" FOREIGN KEY ("ShipmentID") REFERENCES "Shipments"("ShipmentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShipmentItems" ADD CONSTRAINT "ShipmentItems_OrderItemID_fkey" FOREIGN KEY ("OrderItemID") REFERENCES "OrderItems"("OrderItemID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShipmentTrackingHistories" ADD CONSTRAINT "ShipmentTrackingHistories_ShipmentID_fkey" FOREIGN KEY ("ShipmentID") REFERENCES "Shipments"("ShipmentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShipmentTrackingHistories" ADD CONSTRAINT "ShipmentTrackingHistories_UpdatedByUserID_fkey" FOREIGN KEY ("UpdatedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_PaymentMethodID_fkey" FOREIGN KEY ("PaymentMethodID") REFERENCES "PaymentMethods"("PaymentMethodID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentTransactions" ADD CONSTRAINT "PaymentTransactions_PaymentID_fkey" FOREIGN KEY ("PaymentID") REFERENCES "Payments"("PaymentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentStatusHistories" ADD CONSTRAINT "PaymentStatusHistories_PaymentID_fkey" FOREIGN KEY ("PaymentID") REFERENCES "Payments"("PaymentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Vouchers" ADD CONSTRAINT "Vouchers_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VoucherUsages" ADD CONSTRAINT "VoucherUsages_VoucherID_fkey" FOREIGN KEY ("VoucherID") REFERENCES "Vouchers"("VoucherID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VoucherUsages" ADD CONSTRAINT "VoucherUsages_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VoucherUsages" ADD CONSTRAINT "VoucherUsages_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VoucherUsages" ADD CONSTRAINT "VoucherUsages_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_OrderItemID_fkey" FOREIGN KEY ("OrderItemID") REFERENCES "OrderItems"("OrderItemID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_ProductVariantID_fkey" FOREIGN KEY ("ProductVariantID") REFERENCES "ProductVariants"("ProductVariantID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopReviews" ADD CONSTRAINT "ShopReviews_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopReviews" ADD CONSTRAINT "ShopReviews_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShopReviews" ADD CONSTRAINT "ShopReviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingReviews" ADD CONSTRAINT "ShippingReviews_ShipmentID_fkey" FOREIGN KEY ("ShipmentID") REFERENCES "Shipments"("ShipmentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingReviews" ADD CONSTRAINT "ShippingReviews_ShippingCompanyID_fkey" FOREIGN KEY ("ShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingReviews" ADD CONSTRAINT "ShippingReviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequests" ADD CONSTRAINT "ReturnRequests_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequests" ADD CONSTRAINT "ReturnRequests_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequests" ADD CONSTRAINT "ReturnRequests_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequests" ADD CONSTRAINT "ReturnRequests_ShopID_fkey" FOREIGN KEY ("ShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequests" ADD CONSTRAINT "ReturnRequests_ReviewedByUserID_fkey" FOREIGN KEY ("ReviewedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequestItems" ADD CONSTRAINT "ReturnRequestItems_ReturnRequestID_fkey" FOREIGN KEY ("ReturnRequestID") REFERENCES "ReturnRequests"("ReturnRequestID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequestItems" ADD CONSTRAINT "ReturnRequestItems_OrderItemID_fkey" FOREIGN KEY ("OrderItemID") REFERENCES "OrderItems"("OrderItemID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_PaymentID_fkey" FOREIGN KEY ("PaymentID") REFERENCES "Payments"("PaymentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_ReturnRequestID_fkey" FOREIGN KEY ("ReturnRequestID") REFERENCES "ReturnRequests"("ReturnRequestID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_ComplaintID_fkey" FOREIGN KEY ("ComplaintID") REFERENCES "Complaints"("ComplaintID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_RequestedByUserID_fkey" FOREIGN KEY ("RequestedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RefundRequests" ADD CONSTRAINT "RefundRequests_ApprovedByUserID_fkey" FOREIGN KEY ("ApprovedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Refunds" ADD CONSTRAINT "Refunds_RefundRequestID_fkey" FOREIGN KEY ("RefundRequestID") REFERENCES "RefundRequests"("RefundRequestID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Refunds" ADD CONSTRAINT "Refunds_PaymentID_fkey" FOREIGN KEY ("PaymentID") REFERENCES "Payments"("PaymentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Orders"("OrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_ShopOrderID_fkey" FOREIGN KEY ("ShopOrderID") REFERENCES "ShopOrders"("ShopOrderID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_ShipmentID_fkey" FOREIGN KEY ("ShipmentID") REFERENCES "Shipments"("ShipmentID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_ReturnRequestID_fkey" FOREIGN KEY ("ReturnRequestID") REFERENCES "ReturnRequests"("ReturnRequestID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_ComplainantUserID_fkey" FOREIGN KEY ("ComplainantUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_AgainstShopID_fkey" FOREIGN KEY ("AgainstShopID") REFERENCES "Shops"("ShopID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_AgainstShippingCompanyID_fkey" FOREIGN KEY ("AgainstShippingCompanyID") REFERENCES "ShippingCompanies"("ShippingCompanyID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Complaints" ADD CONSTRAINT "Complaints_AssignedAdminUserID_fkey" FOREIGN KEY ("AssignedAdminUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ComplaintEvidenceFiles" ADD CONSTRAINT "ComplaintEvidenceFiles_ComplaintID_fkey" FOREIGN KEY ("ComplaintID") REFERENCES "Complaints"("ComplaintID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ComplaintEvidenceFiles" ADD CONSTRAINT "ComplaintEvidenceFiles_ReturnRequestID_fkey" FOREIGN KEY ("ReturnRequestID") REFERENCES "ReturnRequests"("ReturnRequestID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ComplaintEvidenceFiles" ADD CONSTRAINT "ComplaintEvidenceFiles_UploadedByUserID_fkey" FOREIGN KEY ("UploadedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ComplaintResolutions" ADD CONSTRAINT "ComplaintResolutions_ComplaintID_fkey" FOREIGN KEY ("ComplaintID") REFERENCES "Complaints"("ComplaintID") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ComplaintResolutions" ADD CONSTRAINT "ComplaintResolutions_ResolvedByUserID_fkey" FOREIGN KEY ("ResolvedByUserID") REFERENCES "Users"("UserID") ON DELETE NO ACTION ON UPDATE NO ACTION;
