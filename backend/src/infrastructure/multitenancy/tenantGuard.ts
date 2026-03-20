import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      userRole?: 'admin' | 'manager' | 'user';
    }
  }
}

export function tenantGuard(req: Request, res: Response, next: NextFunction) {
  const tenantHeader = req.headers['x-tenant-id'];
  const tenantId = Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;

  if (!tenantId) {
    return res.status(400).json({ error: 'x-tenant-id header is required' });
  }

  req.tenantId = tenantId;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
