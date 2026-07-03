type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

export function serializeForJson(value: unknown): JsonLike | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item) ?? null);
  }

  if (typeof value === 'object') {
    const decimalLike = value as {
      toJSON?: () => unknown;
      constructor?: { name?: string };
    };

    if (
      decimalLike.constructor?.name === 'Decimal' &&
      typeof decimalLike.toJSON === 'function'
    ) {
      return String(decimalLike.toJSON());
    }

    const record = value as Record<string, unknown>;
    const serialized: Record<string, JsonLike> = {};

    for (const [key, item] of Object.entries(record)) {
      const result = serializeForJson(item);

      if (result !== undefined) {
        serialized[key] = result;
      }
    }

    return serialized;
  }

  if (typeof value === 'symbol') {
    return value.description ?? value.toString();
  }

  if (typeof value === 'function') {
    return value.name ? `[Function ${value.name}]` : '[Function]';
  }

  return null;
}
