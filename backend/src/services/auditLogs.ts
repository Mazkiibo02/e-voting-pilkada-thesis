import db from "../database/connection";
import { createHash } from "crypto";

export interface AuditLogInput {
  electionId?: number | null;
  tpsId?: number | null;
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  description?: string | null;
  metadataJson?: any;
}

export interface AuditLogRecord {
  id: number;
  election_id: number | null;
  tps_id: number | null;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  metadata_json: string | null;
  created_at: string;
}

export const AuditLogsService = {
  log(input: AuditLogInput): void {
    try {
      let finalEmail = input.actorEmail || null;
      
      // Auto-lookup email if actorUserId is provided but actorEmail is missing
      if (!finalEmail && input.actorUserId) {
        try {
          const user = db.prepare("SELECT email FROM users WHERE id = ?").get(input.actorUserId) as { email: string } | undefined;
          if (user) {
            finalEmail = user.email;
          }
        } catch (dbErr) {
          console.warn("Failed to lookup user email for audit log:", dbErr);
        }
      }

      const metadata = input.metadataJson ? JSON.stringify(input.metadataJson) : null;
      
      db.prepare(`
        INSERT INTO audit_logs (
          election_id, tps_id, actor_user_id, actor_email, actor_role, 
          action, entity_type, entity_id, description, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.electionId ?? null,
        input.tpsId ?? null,
        input.actorUserId ?? null,
        finalEmail,
        input.actorRole ?? null,
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.description ?? null,
        metadata
      );
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  },

  getAll(filters: { action?: string; entityType?: string; actorRole?: string; limit?: number; offset?: number } = {}): AuditLogRecord[] {
    let query = `SELECT * FROM audit_logs`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.action && filters.action !== 'ALL') {
      conditions.push(`action = ?`);
      params.push(filters.action);
    }
    if (filters.entityType) {
      conditions.push(`entity_type = ?`);
      params.push(filters.entityType);
    }
    if (filters.actorRole) {
      conditions.push(`actor_role = ?`);
      params.push(filters.actorRole);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(` AND `);
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(query).all(...params) as unknown as AuditLogRecord[];
  },

  generateTpsAuditHash(tpsId: number): string {
    const logs = db.prepare("SELECT * FROM audit_logs WHERE tps_id = ? ORDER BY id ASC").all(tpsId) as unknown as AuditLogRecord[];
    
    let currentHash = createHash("sha256").update(`tps-audit-start-${tpsId}`).digest("hex");
    
    for (const log of logs) {
      const logStr = JSON.stringify({
        id: log.id,
        election_id: log.election_id,
        tps_id: log.tps_id,
        actor_user_id: log.actor_user_id,
        actor_email: log.actor_email,
        actor_role: log.actor_role,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        description: log.description,
        metadata_json: log.metadata_json,
        created_at: log.created_at
      });
      currentHash = createHash("sha256").update(currentHash + logStr).digest("hex");
    }
    
    return currentHash;
  }
};
