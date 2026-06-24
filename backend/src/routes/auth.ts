import { Router } from "express";
import db from "../database/connection";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { createAuthToken, verifyPassword } from "../services/auth";
import { AuditLogsService } from "../services/auditLogs";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = db
    .prepare(
      `SELECT id, name, email, password_hash, role, assigned_tps_id, status FROM users WHERE LOWER(email) = LOWER(?)`
    )
    .get(email.trim()) as any;

  if (!user || !verifyPassword(password, user.password_hash as string)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.status !== "ACTIVE") {
    return res.status(403).json({ message: "User account is not active" });
  }

  const token = createAuthToken({
    sub: String(user.id),
    role: String(user.role),
    assignedTpsId:
      user.assigned_tps_id !== null && user.assigned_tps_id !== undefined
        ? Number(user.assigned_tps_id)
        : null,
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedTpsId: user.assigned_tps_id ?? null,
    status: user.status,
  };

  // Log authentication login
  AuditLogsService.log({
    actorUserId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: "AUTH_LOGIN",
    entityType: "USER",
    entityId: user.id,
    description: `User ${user.email} successfully logged in as ${user.role}`,
    metadataJson: {
      email: user.email,
      role: user.role
    }
  });

  res.json({ token, user: safeUser });
});

router.get("/me", authenticateToken, (req: AuthRequest, res) => {
  const userId = req.user?.sub;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = db
    .prepare(
      `SELECT id, name, email, role, assigned_tps_id, status FROM users WHERE id = ?`
    )
    .get(userId);

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedTpsId: user.assigned_tps_id ?? null,
    status: user.status,
  };

  res.json({ user: safeUser });
});

router.post("/logout", (_req, res) => {
  return res.json({ message: "Logged out" });
});

export default router;
