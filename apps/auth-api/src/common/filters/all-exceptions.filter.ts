import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { randomUUID } from "crypto";
import { ApiResponse } from "../interfaces/api-response.interface";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = "Internal server error";
    let errors = null;

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      message = typeof response === "string" ? response : response.message || exception.message;
      if (typeof response === "object" && response.error) {
           // NestJS default error structure often places validation errors in 'message' if it's an array,
           // or we can put the specific error code/type in 'errors'.
           // Trying to map standard NestJS validation errors to the requested format if possible.
           if (Array.isArray(response.message)) {
               errors = response.message.map((msg: string) => ({ message: msg }));
               message = "Errores de validación";
           }
      }
    } else {
        console.error(exception); // Log internal errors
    }

    const responseBody: ApiResponse<null> = {
      success: false,
      statusCode: httpStatus,
      message,
      data: null,
      errors: errors,
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
