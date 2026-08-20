export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = options.status || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.expose = options.expose ?? this.status < 500;
    this.details = options.details ?? null;
  }
}

export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      status: 400,
      code: 'VALIDATION_ERROR',
      ...options,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未登录，请先登录', options = {}) {
    super(message, {
      status: 401,
      code: 'UNAUTHORIZED',
      ...options,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '无权限执行该操作', options = {}) {
    super(message, {
      status: 403,
      code: 'FORBIDDEN',
      ...options,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在', options = {}) {
    super(message, {
      status: 404,
      code: 'NOT_FOUND',
      ...options,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = '资源状态冲突', options = {}) {
    super(message, {
      status: 409,
      code: 'CONFLICT',
      ...options,
    });
  }
}

export function createValidationError(message, status = 400) {
  return new ValidationError(message, { status });
}
