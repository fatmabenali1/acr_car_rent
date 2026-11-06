import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request" },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        success: false,
        error: { code: "RESOURCE_ALREADY_EXISTS", message: "A resource with these unique values already exists" },
      });
      return;
    }
    if (error.code === "P2003" || error.code === "P2014") {
      response.status(409).json({
        success: false,
        error: { code: "RESOURCE_IN_USE", message: "This resource is referenced and cannot be changed or deleted" },
      });
      return;
    }
    if (error.code === "P2025") {
      response.status(404).json({
        success: false,
        error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" },
      });
      return;
    }
  }

  if (error instanceof Error && error.name === "MulterError") {
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    response.status(code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      error: {
        code: code === "LIMIT_FILE_SIZE" ? "UPLOAD_TOO_LARGE" : "UPLOAD_INVALID",
        message: code === "LIMIT_FILE_SIZE" ? "Image exceeds the configured upload size limit" : "Upload could not be accepted",
      },
    });
    return;
  }

  console.error("Unhandled request error", error);
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" },
  });
};
