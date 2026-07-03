import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorBody } from '../types/api-response.type';

type NestErrorResponse =
  | string
  | {
      code?: string;
      error?: string;
      message?: string | string[];
      details?: unknown[];
    };

const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
};
const BAD_REQUEST_STATUS = Number(HttpStatus.BAD_REQUEST);

function getMessage(response: NestErrorResponse, status: number): string {
  if (typeof response === 'string') {
    return response;
  }

  if (Array.isArray(response.message)) {
    return status === BAD_REQUEST_STATUS
      ? 'Dữ liệu không hợp lệ'
      : response.message.join(', ');
  }

  if (response.message) {
    return response.message;
  }

  return response.error ?? 'Internal server error';
}

function getDetails(response: NestErrorResponse): unknown[] {
  if (typeof response === 'string') {
    return [];
  }

  if (response.details) {
    return response.details;
  }

  if (Array.isArray(response.message)) {
    return response.message;
  }

  return [];
}

function getCode(response: NestErrorResponse, status: number): string {
  if (typeof response !== 'string' && response.code) {
    return response.code;
  }

  if (
    status === BAD_REQUEST_STATUS &&
    typeof response !== 'string' &&
    Array.isArray(response.message)
  ) {
    return 'VALIDATION_ERROR';
  }

  return STATUS_CODE_MAP[status] ?? 'INTERNAL_SERVER_ERROR';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as NestErrorResponse;
      const body: ApiErrorBody = {
        success: false,
        error: {
          code: getCode(exceptionResponse, status),
          message: getMessage(exceptionResponse, status),
          details: getDetails(exceptionResponse),
        },
      };

      response.status(status).json(body);
      return;
    }

    const body: ApiErrorBody = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: [],
      },
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
