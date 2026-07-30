import { Injectable, Logger } from '@nestjs/common';
import {
  getCarrierTimeoutMs,
  getGhnConfig,
} from '../../../config/carrier.config';
import {
  normalizeProvinceNameForMatching,
  normalizeWardNameForMatching,
} from '../normalize-vietnamese-text';

/**
 * GHN's master-data endpoints expose the province/district/ward hierarchy
 * that GHN's own APIs require (from_district_id/from_ward_code and
 * to_district_id/to_ward_code). Our own DB uses a strict 2-tier hierarchy
 * (Province -> Ward, per the 2025 administrative reform), so we resolve
 * district_id/ward_code on the fly by matching province + ward names
 * against this master data, in-memory, cached for 24h.
 *
 * This resolver is also reused by the GHTK client, since GHTK's fee API
 * accepts free-text province/district/ward names and GHN's master data is
 * the most complete public source of canonical Vietnamese administrative
 * names available to both carriers.
 */

type GhnWard = { WardCode: string; WardName: string };
type GhnDistrict = {
  DistrictID: number;
  DistrictName: string;
  Wards?: GhnWard[];
};
type GhnProvince = { ProvinceID: number; ProvinceName: string };

export type ResolvedGhnAddress = {
  districtId: number;
  districtName: string;
  wardCode: string;
  wardName: string;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ponytail: GHN sandbox still exposes pre-2025 wards. Remove this verified
// fallback once its master data includes the merged ward name.
const GHN_LEGACY_WARD_ALIASES: Record<string, string> = {
  'ho chi minh|hiep binh': 'hiep binh chanh',
};

@Injectable()
export class GhnAddressResolver {
  private readonly logger = new Logger(GhnAddressResolver.name);

  private provinces: GhnProvince[] | null = null;
  private districtsByProvinceId = new Map<number, GhnDistrict[]>();
  private wardsByDistrictId = new Map<number, GhnWard[]>();
  private loadedAt = 0;

  private async fetchJson<T>(path: string, body: unknown): Promise<T> {
    const config = getGhnConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getCarrierTimeoutMs());

    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: config.token ?? '',
        },
        body: JSON.stringify(body ?? {}),
        signal: controller.signal,
      });

      const json = (await response.json()) as {
        code?: number;
        data?: T;
        message?: string;
      };

      if (!response.ok || json.code !== 200) {
        throw new Error(
          `GHN master-data request to ${path} failed: ${json.message ?? response.statusText}`,
        );
      }

      return json.data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async ensureLoaded(): Promise<void> {
    const isFresh =
      this.provinces !== null && Date.now() - this.loadedAt < CACHE_TTL_MS;
    if (isFresh) {
      return;
    }

    const provinces = await this.fetchJson<GhnProvince[]>(
      '/master-data/province',
      {},
    );
    this.provinces = provinces;
    this.districtsByProvinceId = new Map();
    this.wardsByDistrictId = new Map();
    this.loadedAt = Date.now();
    this.logger.log(`Loaded ${provinces.length} GHN provinces into cache.`);
  }

  private async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    const cached = this.districtsByProvinceId.get(provinceId);
    if (cached) {
      return cached;
    }

    const districts = await this.fetchJson<GhnDistrict[]>(
      '/master-data/district',
      {
        province_id: provinceId,
      },
    );
    this.districtsByProvinceId.set(provinceId, districts);
    return districts;
  }

  private async getWards(districtId: number): Promise<GhnWard[]> {
    const cached = this.wardsByDistrictId.get(districtId);
    if (cached) {
      return cached;
    }

    const wards = await this.fetchJson<GhnWard[]>('/master-data/ward', {
      district_id: districtId,
    });
    this.wardsByDistrictId.set(districtId, wards);
    return wards;
  }

  /**
   * Resolves a (provinceName, wardName) pair from our 2-tier address model
   * into GHN's district_id + ward_code. Since GHN still models a 3-tier
   * hierarchy (province -> district -> ward), we search every district in
   * the matched province for a ward whose name matches. If multiple
   * districts contain a matching ward name, the first match is used and a
   * warning is logged (this is rare: ward names are usually unique within
   * a province after the 2025 merge).
   */
  async resolve(
    provinceName: string,
    wardName: string,
  ): Promise<ResolvedGhnAddress | null> {
    await this.ensureLoaded();

    const normalizedProvince = normalizeProvinceNameForMatching(provinceName);
    const normalizedWard = normalizeWardNameForMatching(wardName);

    const province = this.provinces?.find(
      (item) =>
        normalizeProvinceNameForMatching(item.ProvinceName) ===
        normalizedProvince,
    );

    if (!province) {
      this.logger.warn(`GHN: could not resolve province "${provinceName}".`);
      return null;
    }

    const districts = await this.getDistricts(province.ProvinceID);
    const wardCandidates: Array<{
      district: GhnDistrict;
      ward: GhnWard;
    }> = [];

    for (const district of districts) {
      const wards = await this.getWards(district.DistrictID);
      wardCandidates.push(...wards.map((ward) => ({ district, ward })));
    }

    let matches = wardCandidates.filter(
      ({ ward }) =>
        normalizeWardNameForMatching(ward.WardName) === normalizedWard,
    );

    if (matches.length === 0) {
      const legacyWard =
        GHN_LEGACY_WARD_ALIASES[`${normalizedProvince}|${normalizedWard}`];
      if (legacyWard) {
        matches = wardCandidates.filter(
          ({ ward }) =>
            normalizeWardNameForMatching(ward.WardName) === legacyWard,
        );
        if (matches.length > 0) {
          this.logger.warn(
            `GHN: resolved post-2025 ward "${wardName}" as legacy ward "${matches[0].ward.WardName}".`,
          );
        }
      }
    }

    const resolvedMatches: ResolvedGhnAddress[] = matches.map(
      ({ district, ward }) => ({
        districtId: district.DistrictID,
        districtName: district.DistrictName,
        wardCode: ward.WardCode,
        wardName: ward.WardName,
      }),
    );

    if (resolvedMatches.length === 0) {
      this.logger.warn(
        `GHN: could not resolve ward "${wardName}" within province "${provinceName}".`,
      );
      return null;
    }

    if (resolvedMatches.length > 1) {
      this.logger.warn(
        `GHN: ambiguous ward "${wardName}" in "${provinceName}" matched ${resolvedMatches.length} districts; using the first match.`,
      );
    }

    return resolvedMatches[0];
  }
}
