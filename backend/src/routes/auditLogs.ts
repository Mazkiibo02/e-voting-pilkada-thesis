import { Router, Response } from "express";
import { authenticateToken, requireRole, AuthRequest } from "../middleware/auth";
import { AuditLogsService } from "../services/auditLogs";

const router = Router();

// GET /audit-logs
// Allowed roles: ADMIN, PENGAWAS
router.get("/", authenticateToken, requireRole(["ADMIN", "PENGAWAS"]), async (req: AuthRequest, res: Response) => {
  try {
    const action = req.query.action ? String(req.query.action) : undefined;
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;
    const actorRole = req.query.actorRole ? String(req.query.actorRole) : undefined;
    
    let tpsId = req.query.tpsId ? Number(req.query.tpsId) : undefined;
    if (req.user?.role === "PENGAWAS") {
      if (!req.user.assignedTpsId) {
        return res.status(403).json({ message: "Pengawas tidak memiliki TPS yang ditugaskan." });
      }
      tpsId = req.user.assignedTpsId;
    }

    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const logs = AuditLogsService.getAll({
      action,
      entityType,
      actorRole,
      tpsId,
      limit,
      offset
    });

    return res.json({
      items: logs,
      total: logs.length
    });
  } catch (error: any) {
    console.error("Error retrieving audit logs:", error);
    return res.status(500).json({ message: "Failed to retrieve audit logs" });
  }
});

export default router;
