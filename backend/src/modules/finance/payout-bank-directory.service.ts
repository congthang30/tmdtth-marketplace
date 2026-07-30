import { Injectable, Logger } from '@nestjs/common';
import {
  SUPPORTED_PAYOUT_BANKS,
  type SupportedPayoutBank,
} from './finance.constants';

const BANK_LOOKUP_LIST_URL = 'https://api.banklookup.net/bank/list';
const BANK_DIRECTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const BANK_DIRECTORY_TIMEOUT_MS = 5_000;

export type PayoutBankDirectoryItem = SupportedPayoutBank & {
  fullName: string;
  logoUrl: string | null;
};

type ProviderBank = {
  code: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  iconUrl: string | null;
};

const BANK_LOOKUP_SHORT_NAME_ALIASES: Readonly<Record<string, string>> = {
  KBank: 'Kasikornbank',
};

function normalizeBankLabel(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function parseHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseProviderBank(value: unknown): ProviderBank | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const bank = value as Record<string, unknown>;
  if (
    typeof bank.code !== 'string' ||
    typeof bank.name !== 'string' ||
    typeof bank.short_name !== 'string'
  ) {
    return null;
  }

  return {
    code: bank.code.trim().toUpperCase(),
    name: bank.name.trim(),
    shortName: bank.short_name.trim(),
    logoUrl: parseHttpsUrl(bank.logo_url),
    iconUrl: parseHttpsUrl(bank.icon_url),
  };
}

function fallbackDirectory(): PayoutBankDirectoryItem[] {
  return SUPPORTED_PAYOUT_BANKS.map((bank) => ({
    ...bank,
    fullName: bank.name,
    logoUrl: null,
  }));
}

@Injectable()
export class PayoutBankDirectoryService {
  private readonly logger = new Logger(PayoutBankDirectoryService.name);
  private cachedBanks: PayoutBankDirectoryItem[] | null = null;
  private cachedAt = 0;
  private refreshPromise: Promise<PayoutBankDirectoryItem[]> | null = null;

  async list(): Promise<PayoutBankDirectoryItem[]> {
    if (
      this.cachedBanks &&
      Date.now() - this.cachedAt < BANK_DIRECTORY_CACHE_TTL_MS
    ) {
      return this.cachedBanks;
    }

    this.refreshPromise ??= this.fetchDirectory();

    try {
      return await this.refreshPromise;
    } catch (error) {
      this.logger.warn(
        `Không thể làm mới danh sách ngân hàng từ BankLookup: ${
          error instanceof Error ? error.message : 'Lỗi không xác định'
        }`,
      );
      return this.cachedBanks ?? fallbackDirectory();
    } finally {
      this.refreshPromise = null;
    }
  }

  private async fetchDirectory(): Promise<PayoutBankDirectoryItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      BANK_DIRECTORY_TIMEOUT_MS,
    );

    try {
      const response = await fetch(BANK_LOOKUP_LIST_URL, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        code?: unknown;
        success?: unknown;
        data?: unknown;
      };

      if (
        !response.ok ||
        payload.code !== 200 ||
        payload.success !== true ||
        !Array.isArray(payload.data)
      ) {
        throw new Error(`Phản hồi không hợp lệ (HTTP ${response.status})`);
      }

      const providerBanks = payload.data
        .map(parseProviderBank)
        .filter((bank): bank is ProviderBank => bank !== null);
      if (providerBanks.length === 0) {
        throw new Error('Danh sách ngân hàng trống');
      }

      const banksByShortName = new Map(
        providerBanks.map((bank) => [normalizeBankLabel(bank.shortName), bank]),
      );
      const banksByCode = new Map(
        providerBanks.map((bank) => [bank.code, bank]),
      );
      const directory = SUPPORTED_PAYOUT_BANKS.map((bank) => {
        // Match the display name first because BankLookup uses different codes
        // for several banks (for example STB/SCB and SCB/SGCB).
        const providerShortName =
          BANK_LOOKUP_SHORT_NAME_ALIASES[bank.name] ?? bank.name;
        const providerBank =
          banksByShortName.get(normalizeBankLabel(providerShortName)) ??
          banksByCode.get(bank.code);

        return {
          ...bank,
          fullName: providerBank?.name || bank.name,
          logoUrl: providerBank?.logoUrl ?? providerBank?.iconUrl ?? null,
        };
      });

      this.cachedBanks = directory;
      this.cachedAt = Date.now();
      return directory;
    } finally {
      clearTimeout(timeout);
    }
  }
}
