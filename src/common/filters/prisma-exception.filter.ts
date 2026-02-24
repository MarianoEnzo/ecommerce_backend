import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { Response } from 'express';

@Catch(PrismaClientKnownRequestError, PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: PrismaClientKnownRequestError | PrismaClientValidationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handleKnownError(exception, response);
    }

    // PrismaClientValidationError — query mal formada, es un bug nuestro
    this.logger.error('Prisma validation error', exception.message);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }

  private handleKnownError(
    exception: PrismaClientKnownRequestError,
    response: Response,
  ) {
    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        const fields = (exception.meta?.target as string[]) ?? ['field'];
        this.logger.warn(`Unique constraint violation on: ${fields.join(', ')}`);
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: `A record with this ${fields.join(', ')} already exists`,
        });
      }

      // Record not found (update/delete sobre un id que no existe)
      case 'P2025':
        this.logger.warn('Record not found', exception.meta?.cause);
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Record not found',
        });

      // Foreign key constraint violation
      case 'P2003':
        this.logger.warn('Foreign key constraint violation', exception.meta);
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Related record not found',
        });

      // Null constraint violation
      case 'P2011':
        this.logger.warn('Null constraint violation', exception.meta);
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A required field is missing',
        });

      default:
        this.logger.error(
          `Unhandled Prisma error: ${exception.code}`,
          exception.message,
        );
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
    }
  }
}