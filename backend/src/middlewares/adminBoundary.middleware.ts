import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const SENSITIVE_KEYS = ['password', 'pwd', 'tempPassword', 'currentPassword', 'newPassword'];

function scrubSensitiveFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(scrubSensitiveFields);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.includes(key) && typeof value === 'string') {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = scrubSensitiveFields(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}

export const adminBoundaryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Reject any GET request that tries to query password fields
  if (req.method === 'GET') {
    const queryKeys = Object.keys(req.query).map(k => k.toLowerCase());
    const hasPasswordQuery = queryKeys.some(k =>
      k.includes('password') || k.includes('pwd')
    );
    if (hasPasswordQuery) {
      logger.warn('Admin boundary violation: password field in query', {
        ip: req.ip,
        userId: (req as any).user?.id,
        path: req.path
      });
      res.status(403).json({ error: 'Access to password fields is forbidden' });
      return;
    }
  }

  // Intercept res.json to scrub any password fields from outgoing responses
  const originalJson = res.json.bind(res);
  (res as any).json = function (data: any) {
    if (data !== null && typeof data === 'object') {
      const scrubbed = scrubSensitiveFields(data);
      return originalJson(scrubbed);
    }
    return originalJson(data);
  };

  next();
};
