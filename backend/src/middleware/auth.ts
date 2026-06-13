import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is required. Set JWT_SECRET in backend/.env or environment variables."
  );
}

export interface AuthUserPayload {
  sub: string;
  role: string;
  assignedTpsId: number | null;
  nik?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = {
      sub: decoded.sub,
      role: decoded.role,
      assignedTpsId:
        decoded.assignedTpsId === undefined ? null : decoded.assignedTpsId,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient role permissions" });
    }

    next();
  };
};

// keep legacy export name for existing modules that import `verifyToken`
export const verifyToken = authenticateToken;