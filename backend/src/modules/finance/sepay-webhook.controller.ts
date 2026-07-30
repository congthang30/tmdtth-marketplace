import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { NoApiEnvelope } from '../../common/decorators/no-api-envelope.decorator';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { SepayWebhookService } from './sepay-webhook.service';

@Controller('webhooks/sepay')
export class SepayWebhookController {
  constructor(private readonly sepayWebhookService: SepayWebhookService) {}

  @Post()
  @NoApiEnvelope()
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-sepay-signature') signature: string | undefined,
    @Headers('x-sepay-timestamp') timestamp: string | undefined,
    @Body() dto: SepayWebhookDto,
  ) {
    this.sepayWebhookService.verifySignature(
      request.rawBody,
      signature,
      timestamp,
    );
    await this.sepayWebhookService.handleWebhook(dto, request.rawBody!);
    return { success: true };
  }
}
