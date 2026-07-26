import rawData from "@/data/vn-address.json";

export type VietnamWard = {
  code: number;
  name: string;
};

export type VietnamProvince = {
  code: number;
  name: string;
  wards: VietnamWard[];
};

const provinces = rawData as VietnamProvince[];

/**
 * Removes Vietnamese diacritics and lowercases text so search is
 * accent-insensitive (e.g. "ha noi" or "Hà Nội" both match "Hà Nội"),
 * matching the typeahead behavior used by Shopee/Lazada/Tiki address pickers.
 */
export function normalizeVietnameseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, (match) => (match === "đ" ? "d" : "D"))
    .toLowerCase()
    .trim();
}

export function getAllProvinces(): VietnamProvince[] {
  return provinces;
}

export function searchProvinces(query: string): VietnamProvince[] {
  const normalizedQuery = normalizeVietnameseText(query);
  if (!normalizedQuery) {
    return provinces;
  }
  return provinces.filter((province) =>
    normalizeVietnameseText(province.name).includes(normalizedQuery),
  );
}

export function getProvinceByCode(
  code: number | null,
): VietnamProvince | null {
  if (code === null) {
    return null;
  }
  return provinces.find((province) => province.code === code) ?? null;
}

export function findProvinceByName(name: string): VietnamProvince | null {
  const normalizedName = normalizeVietnameseText(name);
  if (!normalizedName) {
    return null;
  }
  return (
    provinces.find(
      (province) => normalizeVietnameseText(province.name) === normalizedName,
    ) ?? null
  );
}

export function getWardsByProvince(
  provinceCode: number | null,
): VietnamWard[] {
  const province = getProvinceByCode(provinceCode);
  return province?.wards ?? [];
}

export function searchWards(
  provinceCode: number | null,
  query: string,
): VietnamWard[] {
  const wards = getWardsByProvince(provinceCode);
  const normalizedQuery = normalizeVietnameseText(query);
  if (!normalizedQuery) {
    return wards;
  }
  return wards.filter((ward) =>
    normalizeVietnameseText(ward.name).includes(normalizedQuery),
  );
}

export function getWardByCode(
  provinceCode: number | null,
  wardCode: number | null,
): VietnamWard | null {
  if (wardCode === null) {
    return null;
  }
  const wards = getWardsByProvince(provinceCode);
  return wards.find((ward) => ward.code === wardCode) ?? null;
}

export function findWardByName(
  provinceCode: number | null,
  name: string,
): VietnamWard | null {
  const normalizedName = normalizeVietnameseText(name);
  if (!normalizedName) {
    return null;
  }
  const wards = getWardsByProvince(provinceCode);
  return (
    wards.find((ward) => normalizeVietnameseText(ward.name) === normalizedName) ??
    null
  );
}
