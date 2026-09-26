import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../../modules/logger/custom-logger.service';

const SENSITIVE_FIELDS = new Set([
  'password', 'newpassword', 'oldpassword', 'confirmpassword',
  'otp', 'otpcode', 'token', 'accesstoken', 'refreshtoken',
  'secret', 'apikey', 'authorization',
]);

// Deep-redacts sensitive fields before the request body ever reaches the log
// table — this is now a real write path (it was previously dead code), and a
// login/register/reset-password body must never land in plaintext logs.
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [
        key,
        SENSITIVE_FIELDS.has(key.toLowerCase()) ? '[REDACTED]' : redact(v),
      ]),
    );
  }
  return value;
}

// Catches every exception that reaches the HTTP layer — including ones that
// never touch a service at all, such as a DTO failing class-validator before
// the controller method even runs — and records it to the log table before
// responding. This is the only place such errors can be logged at all: by
// the time a controller-facing try/catch could see them, the response has
// already been decided.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    const requestUser = (request as any).user;
    const logMessage = {
      method: request.method,
      url: request.url,
      body: redact(request.body),
      query: request.query,
      params: request.params,
      httpStatus,
      message: JSON.stringify(message),
      user: requestUser?.email,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    this.logger.error(
      `${request.method} ${request.url} → ${httpStatus}: ${JSON.stringify(message)}`,
      JSON.stringify(logMessage),
    );

    response.status(httpStatus).json({
      statusCode: httpStatus,
      message: typeof message === 'object' && message !== null && 'message' in message
        ? (Array.isArray(message?.message)
          ? message?.message[0]
          : message?.message)
        : message || 'Something went wrong',
      timestamp: new Date().toISOString(),
      path: request.url,
    });

  }
}