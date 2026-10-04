import type { ErrorRequestHandler, RequestHandler } from 'express';
import { toAppError } from '../core/errors.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('http');

/**
 * Single exit point for every failure.
 *
 * By the time anything reaches here it has been normalised to an AppError, so
 * the response is always `{ ok: false, error: { code, message } }` with a
 * sentence written for a person. Unexpected faults are logged in full and
 * reported generically — no stacks, no provider messages, no SQL.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error);

  const context = {
    method: req.method,
    path: req.path,
    code: appError.code,
    status: appError.status,
  };

  if (appError.status >= 500) {
    log.error(appError.message, { ...context, cause: error instanceof Error ? error.stack : String(error) });
  } else {
    log.warn(appError.message, context);
  }

  res.status(appError.status).json({
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  });
};

/** Keeps a mistyped URL from falling through to a bare Express 404 page. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND' as const,
      message: `No Bizora endpoint matches ${req.method} ${req.path}.`,
    },
  });
};