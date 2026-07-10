export type VariantAvailability = {
  id: string;
  quantityAvailable: number;
};

export function getFirstAvailableVariantId(
  variants: readonly VariantAvailability[],
): string | null {
  return (
    variants.find((variant) => variant.quantityAvailable > 0)?.id ?? null
  );
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
