import jwt from "jsonwebtoken";
// bcrypt typings may not be available in a fresh environment; keep import but allow TS to proceed
// @ts-ignore
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is required. Set JWT_SECRET in backend/.env or environment variables."
  );
}

export interface AuthPayload {
  sub: string;
  role: string;
  assignedTpsId: number | null;
  full_name?: string;
  tps_code?: string | null;
}

export const createAuthToken = (payload: AuthPayload) => {
  return jwt.sign(payload as any, JWT_SECRET as any, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};

export const verifyPassword = (password: string, hash: string) => {
  return bcrypt.compareSync(password, hash);
};
