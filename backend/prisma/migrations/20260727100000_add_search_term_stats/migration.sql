CREATE TABLE "SearchTermStats" (
  "SearchTermStatID" BIGSERIAL NOT NULL,
  "NormalizedTerm" VARCHAR(100) NOT NULL,
  "DisplayTerm" VARCHAR(100) NOT NULL,
  "SearchCount" BIGINT NOT NULL DEFAULT 1,
  "LastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchTermStats_pkey" PRIMARY KEY ("SearchTermStatID")
);

CREATE UNIQUE INDEX "SearchTermStats_NormalizedTerm_key" ON "SearchTermStats"("NormalizedTerm");
CREATE INDEX "SearchTermStats_SearchCount_LastSearchedAt_idx" ON "SearchTermStats"("SearchCount", "LastSearchedAt");
