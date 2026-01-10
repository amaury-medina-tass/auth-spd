import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { randomUUID } from "crypto";
import { ApiResponse } from "../interfaces/api-response.interface";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";
    let errors = null;
    let errorCode: string | null = null;
    let errorData: Record<string, any> | null = null;

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;

      if (typeof response === "string") {
        message = response;
      } else {
        message = response.message || exception.message;
        errorCode = response.code || null;

        // Extract additional properties (excluding standard ones)
        const { message: _, code: __, statusCode: ___, error: ____, ...rest } = response;
        if (Object.keys(rest).length > 0) {
          errorData = rest;
        }

        // Handle validation errors
        if (Array.isArray(response.message)) {
          errors = response.message.map((msg: string) => ({ message: msg }));
          message = "Errores de validación";
        }
      }
    } else {
      console.error(exception);
    }

    const responseBody: ApiResponse<null> = {
      success: false,
      statusCode: httpStatus,
      message,
      data: null,
      errors: errors || (errorCode ? { code: errorCode, ...errorData } : null),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.headers["x-request-id"] || randomUUID(),
        path: httpAdapter.getRequestUrl(request),
        method: httpAdapter.getRequestMethod(request)
      }
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
