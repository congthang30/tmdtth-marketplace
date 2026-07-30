import { GhnAddressResolver } from './ghn-address.resolver';

type MockWard = { WardCode: string; WardName: string };

function mockGhnMasterData(wards: MockWard[]) {
  return jest.spyOn(global, 'fetch').mockImplementation((input, init) => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const path = new URL(rawUrl).pathname;
    const rawBody = typeof init?.body === 'string' ? init.body : '{}';
    const body = JSON.parse(rawBody) as {
      province_id?: number;
      district_id?: number;
    };
    let data: unknown;

    if (path.endsWith('/master-data/province')) {
      data = [{ ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }];
    } else if (path.endsWith('/master-data/district')) {
      expect(body.province_id).toBe(202);
      data = [{ DistrictID: 3695, DistrictName: 'Thành Phố Thủ Đức' }];
    } else {
      expect(path.endsWith('/master-data/ward')).toBe(true);
      expect(body.district_id).toBe(3695);
      data = wards;
    }

    return Promise.resolve({
      ok: true,
      statusText: 'OK',
      json: () => Promise.resolve({ code: 200, data }),
    } as Response);
  });
}

describe('GhnAddressResolver', () => {
  beforeEach(() => {
    process.env.GHN_API_BASE_URL = 'https://ghn.test/shiip/public-api';
    process.env.GHN_TOKEN = 'test-token';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GHN_API_BASE_URL;
    delete process.env.GHN_TOKEN;
  });

  it('falls back from the post-2025 Hiệp Bình ward to GHN legacy master data', async () => {
    mockGhnMasterData([
      { WardCode: '90741', WardName: 'Phường Hiệp Bình Chánh' },
    ]);

    await expect(
      new GhnAddressResolver().resolve(
        'Thành phố Hồ Chí Minh',
        'Phường Hiệp Bình',
      ),
    ).resolves.toMatchObject({
      districtId: 3695,
      wardCode: '90741',
      wardName: 'Phường Hiệp Bình Chánh',
    });
  });

  it('prefers an exact merged-ward match when GHN master data provides it', async () => {
    mockGhnMasterData([
      { WardCode: 'NEW', WardName: 'Phường Hiệp Bình' },
      { WardCode: '90741', WardName: 'Phường Hiệp Bình Chánh' },
    ]);

    await expect(
      new GhnAddressResolver().resolve(
        'Thành phố Hồ Chí Minh',
        'Phường Hiệp Bình',
      ),
    ).resolves.toMatchObject({
      wardCode: 'NEW',
      wardName: 'Phường Hiệp Bình',
    });
  });
});
