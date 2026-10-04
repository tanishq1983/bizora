import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import type { ApiErrorCode, AuthUser } from '@bizora/shared';
import { errors } from '../core/errors.js';
import type { AuthService } from '../services/auth.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Resolves the bearer token into `req.user`.
 *
 * Routes never read headers themselves, and a missing identity is always a 401
 * with a message the frontend can put on screen — never a silent failure later
 * in a service.
 */
export function createAuthMiddleware(auth: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization') ?? req.header('Authorization');
      if (!header) throw errors.unauthorized();

      const [scheme, token] = header.split(' ');
      if (!token || scheme?.toLowerCase() !== 'bearer') throw errors.unauthorized();

      const user = await auth.resolveToken(token);
      if (!user) throw errors.unauthorized();

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Narrowing helper so handlers get a non-optional user. */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw errors.unauthorized();
  return req.user;
}

/**
 * Validates and replaces `req.body`. Express 5 makes `req.body` writable, so
 * the handler downstream only ever sees data that has already passed the schema.
 */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      next(errors.validation(issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : undefined));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(errors.validation(result.error.issues[0]?.message));
      return;
    }
    // Express 5 exposes `query` as a getter, so the parsed value is stashed
    // separately rather than assigned back.
    res_locals(req, result.data);
    next();
  };
}

function res_locals(req: Request, data: unknown): void {
  Object.defineProperty(req, 'validatedQuery', { value: data, configurable: true, writable: true });
}

export function validatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery?: T }).validatedQuery as T;
}

/**
 * Wraps a handler so a rejected promise reaches the error middleware.
 *
 * Deliberately does not return the promise: Express 5 also inspects a handler's
 * return value, and returning `undefined` keeps ownership of `next()` here
 * rather than having the error reported twice. A handler that returns nothing
 * (nothing to await) is equally valid, so both shapes are accepted.
 */
export function asyncHandler(handler: (req: Request, res: Response) => unknown): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res);
      if (result instanceof Promise) void result.catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export type { ApiErrorCode };