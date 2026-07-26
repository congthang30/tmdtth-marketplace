import { useEffect, useMemo, useState } from "react";
import { Combobox } from "@/components/ui/Combobox";
import {
  findProvinceByName,
  findWardByName,
  getProvinceByCode,
  getWardsByProvince,
  searchProvinces,
  searchWards,
  type VietnamProvince,
  type VietnamWard,
} from "@/lib/vietnamAddress";

export type VietnamAddressValue = {
  province: string;
  ward: string;
};

type VietnamAddressFieldsProps = {
  value: VietnamAddressValue;
  onChange: (value: VietnamAddressValue) => void;
  errors?: {
    province?: string;
    ward?: string;
  };
  required?: boolean;
  names?: {
    province?: string;
    ward?: string;
  };
};

/**
 * Cascading, search-to-filter Tỉnh/Thành → Phường/Xã picker, matching the
 * 2-tier administrative model in effect in Vietnam since 1 July 2025 (the
 * Quận/Huyện tier was abolished; wards now belong directly to a province).
 * Backed by an offline bundled dataset (frontend/src/data/vn-address.json,
 * sourced from provinces.open-api.vn/api/v2) — no network calls at input
 * time.
 *
 * The value/onChange contract is plain strings (province/ward names),
 * matching the current Zod schema and backend DTO fields, so this is a
 * drop-in replacement for the previous free-text TextInput pair with no
 * backend/schema surprises beyond the district removal already agreed in
 * the implementation plan.
 */
export function VietnamAddressFields({
  value,
  onChange,
  errors,
  required = false,
  names,
}: VietnamAddressFieldsProps) {
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState<number | null>(null);
  const [provinceQuery, setProvinceQuery] = useState("");
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
    if (!value.ward || provinceCode === null) {
      return;
    }
    setWardCode((current) => {
      if (current !== null) {
        return current;
      }
      const ward = findWardByName(provinceCode, value.ward);
      return ward?.code ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.ward, provinceCode]);

  const provinceOptions = useMemo(
    () =>
      searchProvinces(provinceQuery).map((province: VietnamProvince) => ({
        value: String(province.code),
        label: province.name,
      })),
    [provinceQuery],
  );

  const wardOptions = useMemo(
    () =>
      searchWards(provinceCode, wardQuery).map((ward: VietnamWard) => ({
        value: String(ward.code),
        label: ward.name,
      })),
    [provinceCode, wardQuery],
  );

  const handleProvinceChange = (nextValue: string) => {
    const nextCode = nextValue ? Number(nextValue) : null;
    setProvinceCode(nextCode);
    setWardCode(null);
    setWardQuery("");
    const province = getProvinceByCode(nextCode);
    onChange({
      province: province?.name ?? "",
      ward: "",
    });
  };

  const handleWardChange = (nextValue: string) => {
    const nextCode = nextValue ? Number(nextValue) : null;
    setWardCode(nextCode);
    const ward = getWardsByProvince(provinceCode).find(
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
        label="Phường/Xã"
        placeholder="Chọn phường/xã"
        name={names?.ward}
        value={wardCode !== null ? String(wardCode) : ""}
        onChange={handleWardChange}
        query={wardQuery}
        onQueryChange={setWardQuery}
        options={wardOptions}
        error={errors?.ward}
        disabled={provinceCode === null}
        disabledHint="Chọn tỉnh/thành phố trước"
        required={required}
      />
    </>
  );
}
