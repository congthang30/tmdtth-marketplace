-- Keep one stable classification schema per product, with at most two levels.
CREATE OR REPLACE FUNCTION enforce_product_variant_attribute_schema()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  attribute_count INTEGER;
  expected_names TEXT[];
  new_names TEXT[];
BEGIN
  PERFORM pg_advisory_xact_lock(NEW."ProductID");

  IF jsonb_typeof(NEW."Attributes") <> 'object' THEN
    RAISE EXCEPTION 'Variant attributes must be a JSON object'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*)
  INTO attribute_count
  FROM jsonb_each(NEW."Attributes");

  IF attribute_count < 1 OR attribute_count > 2 THEN
    RAISE EXCEPTION 'Each product variant must have one or two attribute levels'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(NEW."Attributes") AS attribute(name, value)
    WHERE btrim(attribute.name) = ''
      OR char_length(attribute.name) > 100
      OR jsonb_typeof(attribute.value) <> 'string'
      OR btrim(attribute.value #>> '{}') = ''
      OR char_length(attribute.value #>> '{}') > 255
  ) THEN
    RAISE EXCEPTION 'Variant attribute names or values are invalid'
      USING ERRCODE = 'check_violation';
  END IF;

  new_names := ARRAY(
    SELECT name
    FROM jsonb_object_keys(NEW."Attributes") AS name
    ORDER BY name
  );

  SELECT ARRAY(
    SELECT name
    FROM jsonb_object_keys(candidate."Attributes") AS name
    ORDER BY name
  )
  INTO expected_names
  FROM "ProductVariants" AS candidate
  WHERE candidate."ProductID" = NEW."ProductID"
    AND (
      TG_OP = 'INSERT'
      OR candidate."ProductVariantID" <> NEW."ProductVariantID"
    )
  LIMIT 1;

  IF expected_names IS NOT NULL AND new_names <> expected_names THEN
    RAISE EXCEPTION 'All variants of a product must use the same attribute level names'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "ProductVariants_AttributeSchema_check"
BEFORE INSERT OR UPDATE OF "ProductID", "Attributes"
ON "ProductVariants"
FOR EACH ROW
EXECUTE FUNCTION enforce_product_variant_attribute_schema();
