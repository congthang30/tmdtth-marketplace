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

/**
 * GHN's master-data endpoints return bare province names ("Hồ Chí Minh",
 * "Gia Lai"), while addresses stored in our own DB may carry the full
 * administrative prefix ("Thành phố Hồ Chí Minh", "Tỉnh Gia Lai") or a
 * legacy abbreviation ("TP.HCM", "Tp Hà Nội"). Without stripping these
 * prefixes, exact-match comparison after normalizeVietnameseText() would
 * fail for every single province, so every carrier quote/shipment would
 * be rejected. This strips the common prefixes before comparison; it is
 * only used for province matching, never to alter stored/displayed data.
 */
export function normalizeProvinceNameForMatching(value: string): string {
  const normalized = normalizeVietnameseText(value);
  return normalized.replace(/^(thanh pho|tinh|tp\.?|tp|t\.)\s*/, '').trim();
}

/**
 * GHN's sandbox master data has not been fully migrated to the 2025
 * ward/commune merger: some entries still reflect the pre-reform 3-tier
 * hierarchy, using unit-type prefixes like "Thị trấn" (township) or
 * "Thị xã" for a place that our own (post-reform) data now calls "Xã"
 * (commune) or "Phường" (ward) — e.g. GHN's "Thị trấn Ia Ly" vs our
 * "Xã Ia Ly". The underlying place name is identical, only the
 * administrative unit-type prefix differs, so this strips all known
 * Vietnamese ward/commune-level prefixes before comparing.
 */
export function normalizeWardNameForMatching(value: string): string {
  const normalized = normalizeVietnameseText(value);
  return normalized.replace(/^(phuong|xa|thi tran|thi xa)\s*/, '').trim();
}
