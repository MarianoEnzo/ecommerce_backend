import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // NestJS a veces devuelve un objeto, a veces un string
    const message =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as any).message
        : exceptionResponse;

    // Solo loguear errores 5xx — los 4xx son errores del cliente, no nuestros
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}`,
        exception.stack,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} → ${status}`);
    }

    response.status(status).json({
      statusCode: status,
      error: exception.name.replace('Exception', ''),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}