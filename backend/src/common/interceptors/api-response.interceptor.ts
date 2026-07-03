import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiSuccessBody, PaginatedResult } from '../types/api-response.type';
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
  ApiSuccessBody
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccessBody> {
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
