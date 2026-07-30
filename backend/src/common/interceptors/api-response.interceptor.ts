import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { NO_API_ENVELOPE } from '../decorators/no-api-envelope.decorator';
import { PaginatedResult } from '../types/api-response.type';
import { serializeForJson } from '../utils/serialization.util';

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<unknown>).items) &&
    typeof (value as PaginatedResult<unknown>).meta === 'object'
  );
}

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor<
  unknown,
  unknown
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    const bypass = this.reflector.getAllAndOverride<boolean>(NO_API_ENVELOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (bypass) return next.handle();

    return next.handle().pipe(
      map((value) => {
        if (isPaginatedResult(value)) {
          return {
            success: true,
            data: serializeForJson(value.items) ?? null,
            message: value.message ?? 'OK',
            meta: value.meta,
          };
        }

        return {
          success: true,
          data: serializeForJson(value) ?? null,
          message: 'OK',
        };
      }),
    );
  }
}
