import { SetMetadata } from '@nestjs/common';

export const NO_API_ENVELOPE = 'noApiEnvelope';
export const NoApiEnvelope = () => SetMetadata(NO_API_ENVELOPE, true);
