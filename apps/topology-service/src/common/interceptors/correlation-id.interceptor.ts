import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers[CORRELATION_ID_HEADER] || uuidv4();

    request.correlationId = correlationId;
    request.headers[CORRELATION_ID_HEADER] = correlationId;

    const response = context.switchToHttp().getResponse();
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
