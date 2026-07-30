import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SepayWebhookDto } from './sepay-webhook.dto';

describe('SepayWebhookDto', () => {
  it('accepts and normalizes the documented SePay JSON payload', async () => {
    const dto = plainToInstance(SepayWebhookDto, {
      id: 92704,
      gateway: 'Vietcombank',
      transactionDate: '2026-07-30 18:20:00',
      accountNumber: '1017588888',
      subAccount: '',
      code: 'PAY-ABC-123',
      content: 'PAY-ABC-123 chuyen tien',
      transferType: 'out',
      description: 'Chuyen tien payout',
      transferAmount: 100000,
      accumulated: 5000000,
      referenceCode: 'FT260730123456',
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toEqual([]);
    expect(dto).toMatchObject({
      id: '92704',
      transactionDate: '2026-07-30T18:20:00+07:00',
      transferAmount: '100000',
      accumulated: '5000000',
      subAccount: undefined,
    });
  });
});
