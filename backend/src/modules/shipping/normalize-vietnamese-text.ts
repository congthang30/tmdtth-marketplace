/**
 * Removes Vietnamese diacritics and lowercases text so administrative-name
 * matching is accent-insensitive (e.g. "ha noi" and "Hà Nội" both match).
 * Mirrors frontend/src/lib/vietnamAddress.ts's normalizeVietnameseText so
 * carrier address resolution behaves consistently with the address picker.
 */
export function normalizeVietnameseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (match) => (match === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .trim();
}
