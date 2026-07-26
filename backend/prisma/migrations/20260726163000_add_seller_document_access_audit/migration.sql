CREATE TYPE "SellerDocumentAccessRole" AS ENUM ('Owner', 'Admin');

CREATE TABLE "SellerDocumentAccessAudits" (
    "SellerDocumentAccessAuditID" BIGSERIAL NOT NULL,
    "SellerVerificationDocumentID" BIGINT NOT NULL,
    "ActorUserID" BIGINT NOT NULL,
    "AccessRole" "SellerDocumentAccessRole" NOT NULL,
    "Purpose" VARCHAR(200) NOT NULL,
    "IPAddress" VARCHAR(64),
    "UserAgent" VARCHAR(500),
    "SignedUrlTTLSeconds" INTEGER NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerDocumentAccessAudits_pkey" PRIMARY KEY ("SellerDocumentAccessAuditID")
);

CREATE INDEX "SellerDocumentAccessAudits_SellerVerificationDocumentID_CreatedAt_idx"
ON "SellerDocumentAccessAudits"("SellerVerificationDocumentID", "CreatedAt");

CREATE INDEX "SellerDocumentAccessAudits_ActorUserID_CreatedAt_idx"
ON "SellerDocumentAccessAudits"("ActorUserID", "CreatedAt");

ALTER TABLE "SellerDocumentAccessAudits"
ADD CONSTRAINT "SellerDocumentAccessAudits_SellerVerificationDocumentID_fkey"
FOREIGN KEY ("SellerVerificationDocumentID") REFERENCES "SellerVerificationDocuments"("SellerVerificationDocumentID")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "SellerDocumentAccessAudits"
ADD CONSTRAINT "SellerDocumentAccessAudits_ActorUserID_fkey"
FOREIGN KEY ("ActorUserID") REFERENCES "Users"("UserID")
ON DELETE NO ACTION ON UPDATE NO ACTION;
