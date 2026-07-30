export type VariantAvailability = {
  id: string;
  quantityAvailable: number;
};

export type AttributeVariant = VariantAvailability & {
  attributes: Readonly<Record<string, string>>;
};

export function getFirstAvailableVariantId(
  variants: readonly VariantAvailability[],
): string | null {
  return (
    variants.find((variant) => variant.quantityAvailable > 0)?.id ?? null
  );
}

const ATTRIBUTE_ORDER = new Map([
  ['màu', 0],
  ['màu sắc', 0],
  ['color', 0],
  ['kích cỡ', 1],
  ['size', 1],
]);

export function getAttributeGroups(variants: readonly AttributeVariant[]) {
  const groups = new Map<string, Set<string>>();
  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.attributes)) {
      if (!groups.has(name)) groups.set(name, new Set());
      groups.get(name)?.add(value);
    }
  }
  return [...groups]
    .map(([name, values]) => ({ name, values: [...values] }))
    .sort(
      (left, right) =>
        (ATTRIBUTE_ORDER.get(left.name.trim().toLocaleLowerCase('vi')) ?? 2) -
        (ATTRIBUTE_ORDER.get(right.name.trim().toLocaleLowerCase('vi')) ?? 2),
    );
}

export function variantMatchesSelection(
  variant: AttributeVariant,
  selection: Readonly<Record<string, string>>,
) {
  return Object.entries(selection).every(
    ([name, value]) => variant.attributes[name] === value,
  );
}

export function canSelectAttributeValue(
  variants: readonly AttributeVariant[],
  selection: Readonly<Record<string, string>>,
  name: string,
  value: string,
) {
  return variants.some(
    (variant) =>
      variant.quantityAvailable > 0 &&
      variantMatchesSelection(variant, { ...selection, [name]: value }),
  );
}

export function findSelectedAttributeVariant<T extends AttributeVariant>(
  variants: readonly T[],
  selection: Readonly<Record<string, string>>,
  groupCount: number,
): T | null {
  if (Object.keys(selection).length !== groupCount) return null;
  return variants.find((variant) => variantMatchesSelection(variant, selection)) ?? null;
}

export function canAddVariantToCart(
  variant: VariantAvailability | null | undefined,
  quantity: number,
): variant is VariantAvailability {
  return Boolean(
    variant &&
      variant.quantityAvailable > 0 &&
      Number.isInteger(quantity) &&
      quantity > 0 &&
      quantity <= variant.quantityAvailable,
  );
}
