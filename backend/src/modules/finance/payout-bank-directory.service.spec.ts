import { SUPPORTED_PAYOUT_BANKS } from './finance.constants';
import { PayoutBankDirectoryService } from './payout-bank-directory.service';

const providerBanks = [
  {
    code: 'KB',
    name: 'Ngân hàng Đại chúng TNHH Kasikornbank',
    short_name: 'Kasikornbank',
    logo_url: 'https://example.test/kbank.png',
    icon_url: 'https://example.test/kbank.svg',
  },
  {
    code: 'SCB',
    name: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    short_name: 'Sacombank',
    logo_url: 'https://example.test/sacombank.png',
    icon_url: 'https://example.test/sacombank.svg',
  },
  {
    code: 'SGCB',
    name: 'Ngân hàng TMCP Sài Gòn',
    short_name: 'SCB',
    logo_url: 'https://example.test/scb.png',
    icon_url: 'https://example.test/scb.svg',
  },
  {
    code: 'VCB',
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    short_name: 'Vietcombank',
    logo_url: 'https://example.test/vcb.png',
    icon_url: 'https://example.test/vcb.svg',
  },
];

function mockResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 503,
    json: () =>
      Promise.resolve({
        code: ok ? 200 : 503,
        success: ok,
        data,
      }),
  } as Response;
}

describe('PayoutBankDirectoryService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enriches only canonical payout banks and handles provider code collisions', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(mockResponse(providerBanks));
    const service = new PayoutBankDirectoryService();

    const banks = await service.list();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.banklookup.net/bank/list',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(banks.find(({ code }) => code === 'STB')).toMatchObject({
      name: 'Sacombank',
      fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín',
      logoUrl: 'https://example.test/sacombank.png',
    });
    expect(banks.find(({ code }) => code === 'SCB')).toMatchObject({
      name: 'SCB',
      fullName: 'Ngân hàng TMCP Sài Gòn',
      logoUrl: 'https://example.test/scb.png',
    });
    expect(banks.find(({ code }) => code === 'VCB')).toMatchObject({
      name: 'Vietcombank',
      fullName: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    });
    expect(banks.find(({ code }) => code === 'KBANK')).toMatchObject({
      name: 'KBank',
      fullName: 'Ngân hàng Đại chúng TNHH Kasikornbank',
      logoUrl: 'https://example.test/kbank.png',
    });
    expect(banks).toHaveLength(SUPPORTED_PAYOUT_BANKS.length);

    await service.list();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to the canonical list when BankLookup is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

    const banks = await new PayoutBankDirectoryService().list();

    expect(banks).toHaveLength(SUPPORTED_PAYOUT_BANKS.length);
    expect(banks[0]).toEqual({
      code: 'ABB',
      name: 'ABBANK',
      fullName: 'ABBANK',
      logoUrl: null,
    });
  });

  it('rejects non-HTTPS logo URLs from the provider', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      mockResponse([
        {
          code: 'VCB',
          name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
          short_name: 'Vietcombank',
          logo_url: 'javascript:alert(1)',
          icon_url: 'http://example.test/vcb.svg',
        },
      ]),
    );

    const banks = await new PayoutBankDirectoryService().list();

    expect(banks.find(({ code }) => code === 'VCB')?.logoUrl).toBeNull();
  });
});
