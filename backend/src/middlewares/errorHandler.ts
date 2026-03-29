import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { config } from '../config';
import { errorTracker } from '../utils/errorTracking';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
  requestId?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate request ID for tracing
  const requestId = (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Track error with full context
  errorTracker.captureException(err, {
    userId: (req as any).user?.id,
    organizationId: (req as any).user?.organizationId,
    endpoint: `${req.method} ${req.path}`,
    method: req.method,
    requestId,
    userAgent: req.headers['user-agent'] as string,
    ip: req.ip,
    extra: {
      query: req.query,
      params: req.params,
    },
  });

  // Log error (in production, errorTracker handles detailed logging)
  if (config.env === 'development') {
    console.error('Error:', err);
  }

  const response: ErrorResponse = {
    success: false,
    message: 'Internal server error',
    requestId, // Include for client-side error reporting
  };

  let statusCode = 500;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.message = err.message;

    if ('errors' in err) {
      response.errors = (err as { errors?: unknown }).errors;
    }
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string };
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      response.message = 'A record with this value already exists';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      response.message = 'Record not found';
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    response.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    response.message = 'Token expired';
  }

  // Include stack trace in development
  if (config.env === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
