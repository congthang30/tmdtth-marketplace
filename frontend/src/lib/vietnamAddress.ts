import rawData from "@/data/vn-address.json";

export type VietnamWard = {
  code: number;
  name: string;
};

export type VietnamDistrict = {
  code: number;
  name: string;
  wards: VietnamWard[];
};

export type VietnamProvince = {
  code: number;
  name: string;
  districts: VietnamDistrict[];
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

export function getDistrictsByProvince(
  provinceCode: number | null,
): VietnamDistrict[] {
  const province = getProvinceByCode(provinceCode);
  return province?.districts ?? [];
}

export function searchDistricts(
  provinceCode: number | null,
  query: string,
): VietnamDistrict[] {
  const districts = getDistrictsByProvince(provinceCode);
  const normalizedQuery = normalizeVietnameseText(query);
  if (!normalizedQuery) {
    return districts;
  }
  return districts.filter((district) =>
    normalizeVietnameseText(district.name).includes(normalizedQuery),
  );
}

export function getDistrictByCode(
  provinceCode: number | null,
  districtCode: number | null,
): VietnamDistrict | null {
  if (districtCode === null) {
    return null;
  }
  const districts = getDistrictsByProvince(provinceCode);
  return (
    districts.find((district) => district.code === districtCode) ?? null
  );
}

export function findDistrictByName(
  provinceCode: number | null,
  name: string,
): VietnamDistrict | null {
  const normalizedName = normalizeVietnameseText(name);
  if (!normalizedName) {
    return null;
  }
  const districts = getDistrictsByProvince(provinceCode);
  return (
    districts.find(
      (district) => normalizeVietnameseText(district.name) === normalizedName,
    ) ?? null
  );
}

export function getWardsByDistrict(
  provinceCode: number | null,
  districtCode: number | null,
): VietnamWard[] {
  const district = getDistrictByCode(provinceCode, districtCode);
  return district?.wards ?? [];
}

export function searchWards(
  provinceCode: number | null,
  districtCode: number | null,
  query: string,
): VietnamWard[] {
  const wards = getWardsByDistrict(provinceCode, districtCode);
  const normalizedQuery = normalizeVietnameseText(query);
  if (!normalizedQuery) {
    return wards;
  }
  return wards.filter((ward) =>
    normalizeVietnameseText(ward.name).includes(normalizedQuery),
  );
}

export function findWardByName(
  provinceCode: number | null,
  districtCode: number | null,
  name: string,
): VietnamWard | null {
  const normalizedName = normalizeVietnameseText(name);
  if (!normalizedName) {
    return null;
  }
  const wards = getWardsByDistrict(provinceCode, districtCode);
  return (
    wards.find((ward) => normalizeVietnameseText(ward.name) === normalizedName) ??
    null
  );
}
