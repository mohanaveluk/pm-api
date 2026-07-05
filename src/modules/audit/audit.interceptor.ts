import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditRepo: AuditRepository) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const apiName = `${controllerName}.${handlerName}`;

    const accountGuid =
      (request.headers['x-account-guid'] as string) ||
      request.query?.accountGuid ||
      request.params?.accountGuid ||
      undefined;

    const userId = (request.user as any)?.id || (request.user as any)?.sub || undefined;

    const save = (statusCode: number, error?: string) =>
      this.auditRepo.log({
        accountGuid,
        userId,
        apiName,
        method: request.method,
        endpoint: request.originalUrl,
        statusCode,
        duration: Date.now() - start,
        error,
      }).catch(() => {
        // never let audit logging break the request
      });

    return next.handle().pipe(
      tap(() => save(response.statusCode || 200)),
      catchError((err) => {
        const statusCode = err?.status || err?.statusCode || 500;
        const errorMessage = err?.message || String(err);
        save(statusCode, errorMessage);
        return throwError(() => err);
      }),
    );
  }
}
