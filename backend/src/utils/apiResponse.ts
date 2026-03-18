import { Response } from 'express';

interface ApiResponseOptions {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiResponse {
  /**
   * Success response
   * @param res Express Response
   * @param messageOrData Message string OR data (if string, requires data as 3rd param)
   * @param dataOrStatusCode Data OR status code (depends on 2nd param type)
   * @param statusCode Status code (default 200)
   * @param meta Pagination meta
   */
  static success(
    res: Response,
    messageOrData: string | unknown,
    dataOrStatusCode?: unknown,
    statusCode = 200,
    meta?: ApiResponseOptions['meta']
  ): Response {
    // Handle flexible signature: success(res, data) OR success(res, message, data)
    let message: string;
    let data: unknown;
    let code = statusCode;

    if (typeof messageOrData === 'string' && (dataOrStatusCode === undefined || typeof dataOrStatusCode !== 'number' || arguments.length > 3)) {
      // Called as: success(res, message, data?, statusCode?)
      message = messageOrData;
      data = dataOrStatusCode;
    } else {
      // Called as: success(res, data) or success(res, data, statusCode)
      message = 'Success';
      data = messageOrData;
      if (typeof dataOrStatusCode === 'number') {
        code = dataOrStatusCode;
      }
    }

    return res.status(code).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  /**
   * Created response (201)
   * @param res Express Response
   * @param messageOrData Message string OR data
   * @param data Data (if first param is message)
   */
  static created(res: Response, messageOrData: string | unknown, data?: unknown): Response {
    if (typeof messageOrData === 'string') {
      return this.success(res, messageOrData, data, 201);
    }
    return this.success(res, 'Created', messageOrData, 201);
  }

  static error(res: Response, message: string, statusCode = 400, errors?: unknown): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static validationError(res: Response, errors: unknown): Response {
    return this.error(res, 'Validation failed', 422, errors);
  }

  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }

  static paginated(
    res: Response,
    message: string,
    data: unknown[],
    page: number,
    limit: number,
    total: number
  ): Response {
    const totalPages = Math.ceil(total / limit);
    return this.success(res, message, data, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}
