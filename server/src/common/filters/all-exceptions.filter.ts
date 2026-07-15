import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import type { ApiError } from "@medistore/shared";
import { ZodValidationException } from "../zod-validation.exception";

/**
 * Every error leaves the API in ONE shape (eng review 5A):
 *   { statusCode, error, message, details? }
 * zod failures map to field-level details; unknown errors become an
 * opaque 500 (no stack traces or internals leak to clients).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let body: ApiError;

    if (exception instanceof ZodValidationException) {
      body = {
        statusCode: HttpStatus.BAD_REQUEST,
        error: "Bad Request",
        message: "Validation failed",
        details: exception.fieldErrors(),
      };
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === "string"
          ? response
          : ((response as Record<string, unknown>).message as string) ?? exception.message;
      body = {
        statusCode: status,
        error: exception.name.replace(/Exception$/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
        message: Array.isArray(message) ? message.join("; ") : String(message),
      };
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      body = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: "Internal Server Error",
        message: "Something went wrong on our side. Please try again.",
      };
    }

    res.status(body.statusCode).json(body);
  }
}
