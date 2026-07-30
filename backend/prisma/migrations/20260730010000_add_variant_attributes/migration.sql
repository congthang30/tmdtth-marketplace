-- Add JSONB classification state and backfill valid historical objects.
ALTER TABLE "ProductVariants" ADD COLUMN "Attributes" JSONB;

CREATE OR REPLACE FUNCTION pg_temp.safe_variant_attributes(value TEXT) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

UPDATE "ProductVariants"
SET "Attributes" = pg_temp.safe_variant_attributes("VariantOptionJson")
WHERE "Attributes" IS NULL
  AND jsonb_typeof(pg_temp.safe_variant_attributes("VariantOptionJson")) = 'object';
