import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export function notFound(message = "Resource not found"): never {
  throw new HttpError(404, message);
}

type ApiErrorCode = "VALIDATION_ERROR" | "HTTP_ERROR" | "INTERNAL_ERROR";

function sendError(res: Response, status: number, code: ApiErrorCode, message: string, details?: unknown) {
  return res.status(status).json({
    error: {
      code,
      message,
      details
    },
    message
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof SyntaxError && "body" in error) {
    return sendError(res, 400, "HTTP_ERROR", "Некорректный JSON в теле запроса");
  }

  if (error instanceof ZodError) {
    return sendError(res, 422, "VALIDATION_ERROR", "Validation failed", error.flatten());
  }

  if (error instanceof HttpError) {
    return sendError(res, error.status, "HTTP_ERROR", error.message);
  }

  logger.error("Unhandled API error", {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
  });
  return sendError(res, 500, "INTERNAL_ERROR", "Internal server error");
}
