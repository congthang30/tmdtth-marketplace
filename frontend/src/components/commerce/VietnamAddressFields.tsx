import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/ui/Combobox";
import {
  findDistrictByName,
  findProvinceByName,
  findWardByName,
  getDistrictsByProvince,
  getProvinceByCode,
  getWardsByDistrict,
  searchDistricts,
  searchProvinces,
  searchWards,
  type VietnamDistrict,
  type VietnamProvince,
  type VietnamWard,
} from "@/lib/vietnamAddress";

export type VietnamAddressValue = {
  province: string;
  district: string;
  ward: string;
};

type VietnamAddressFieldsProps = {
  value: VietnamAddressValue;
  onChange: (value: VietnamAddressValue) => void;
  errors?: {
    province?: string;
    district?: string;
    ward?: string;
  };
  required?: boolean;
  names?: {
    province?: string;
    district?: string;
    ward?: string;
  };
};

/**
 * Cascading, search-to-filter Tỉnh/Thành → Quận/Huyện → Phường/Xã picker,
 * matching the address input pattern used by Shopee/Lazada/Tiki. Backed by
 * an offline bundled dataset (frontend/src/data/vn-address.json) — no
 * network calls at input time.
 *
 * The value/onChange contract is plain strings (province/district/ward
 * names), identical to the existing Zod schema and backend DTO fields, so
 * this is a drop-in replacement for the previous free-text TextInput trio
 * with zero backend/schema changes.
 */
export function VietnamAddressFields({
  value,
  onChange,
  errors,
  required = false,
  names,
}: VietnamAddressFieldsProps) {
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState<number | null>(null);
  const [provinceQuery, setProvinceQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");
  const [wardQuery, setWardQuery] = useState("");

  // Hydrate codes from saved string values (edit existing address / resume
  // draft) exactly once per distinct incoming value, so typing in the
  // comboboxes afterwards is not fought by this effect.
  useEffect(() => {
    if (!value.province) {
      return;
    }
    const province = findProvinceByName(value.province);
    setProvinceCode((current) => {
      if (current !== null) {
        return current;
      }
      return province?.code ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.province]);

  useEffect(() => {
    if (!value.district || provinceCode === null) {
      return;
    }
    setDistrictCode((current) => {
      if (current !== null) {
        return current;
      }
      const district = findDistrictByName(provinceCode, value.district);
      return district?.code ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.district, provinceCode]);

  useEffect(() => {
    if (!value.ward || provinceCode === null || districtCode === null) {
      return;
    }
    setWardCode((current) => {
      if (current !== null) {
        return current;
      }
      const ward = findWardByName(provinceCode, districtCode, value.ward);
      return ward?.code ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.ward, provinceCode, districtCode]);

  const provinceOptions = useMemo(
    () =>
      searchProvinces(provinceQuery).map((province: VietnamProvince) => ({
        value: String(province.code),
        label: province.name,
      })),
    [provinceQuery],
  );

  const districtOptions = useMemo(
    () =>
      searchDistricts(provinceCode, districtQuery).map(
        (district: VietnamDistrict) => ({
          value: String(district.code),
          label: district.name,
        }),
      ),
    [provinceCode, districtQuery],
  );

  const wardOptions = useMemo(
    () =>
      searchWards(provinceCode, districtCode, wardQuery).map(
        (ward: VietnamWard) => ({
          value: String(ward.code),
          label: ward.name,
        }),
      ),
    [provinceCode, districtCode, wardQuery],
  );

  const handleProvinceChange = (nextValue: string) => {
    const nextCode = nextValue ? Number(nextValue) : null;
    setProvinceCode(nextCode);
    setDistrictCode(null);
    setWardCode(null);
    setDistrictQuery("");
    setWardQuery("");
    const province = getProvinceByCode(nextCode);
    onChange({
      province: province?.name ?? "",
      district: "",
      ward: "",
    });
  };

  const handleDistrictChange = (nextValue: string) => {
    const nextCode = nextValue ? Number(nextValue) : null;
    setDistrictCode(nextCode);
    setWardCode(null);
    setWardQuery("");
    const district = getDistrictsByProvince(provinceCode).find(
      (item) => item.code === nextCode,
    );
    onChange({
      ...value,
      district: district?.name ?? "",
      ward: "",
    });
  };

  const handleWardChange = (nextValue: string) => {
    const nextCode = nextValue ? Number(nextValue) : null;
    setWardCode(nextCode);
    const ward = getWardsByDistrict(provinceCode, districtCode).find(
      (item) => item.code === nextCode,
    );
    onChange({
      ...value,
      ward: ward?.name ?? "",
    });
  };

  return (
    <>
      <Combobox
        label="Tỉnh/Thành phố"
        placeholder="Chọn tỉnh/thành phố"
        name={names?.province}
        value={provinceCode !== null ? String(provinceCode) : ""}
        onChange={handleProvinceChange}
        query={provinceQuery}
        onQueryChange={setProvinceQuery}
        options={provinceOptions}
        error={errors?.province}
        required={required}
      />
      <Combobox
        label="Quận/Huyện"
        placeholder="Chọn quận/huyện"
        name={names?.district}
        value={districtCode !== null ? String(districtCode) : ""}
        onChange={handleDistrictChange}
        query={districtQuery}
        onQueryChange={setDistrictQuery}
        options={districtOptions}
        error={errors?.district}
        disabled={provinceCode === null}
        disabledHint="Chọn tỉnh/thành phố trước"
        required={required}
      />
      <Combobox
        label="Phường/Xã"
        placeholder="Chọn phường/xã"
        name={names?.ward}
        value={wardCode !== null ? String(wardCode) : ""}
        onChange={handleWardChange}
        query={wardQuery}
        onQueryChange={setWardQuery}
        options={wardOptions}
        error={errors?.ward}
        disabled={districtCode === null}
        disabledHint="Chọn quận/huyện trước"
        required={required}
      />
    </>
  );
}
