import db from "../database/connection";

export interface Election {
  id: number;
  name: string;
  election_type: string | null;
  region_name: string | null;
  voting_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const ElectionsService = {
  getAll(): Election[] {
    const stmt = db.prepare("SELECT * FROM elections ORDER BY id DESC");
    return stmt.all() as unknown as Election[];
  },

  getById(id: number): Election | null {
    const stmt = db.prepare("SELECT * FROM elections WHERE id = ?");
    const election = stmt.get(id);
    return election ? (election as unknown as Election) : null;
  },

  create(data: {
    name: string;
    election_type: string;
    region_name: string;
    voting_date?: string;
    status?: string;
  }): Election {
    const stmt = db.prepare(`
      INSERT INTO elections (name, election_type, region_name, voting_date, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const status = data.status || "DRAFT";
    const votingDate = data.voting_date || null;
    const result = stmt.run(data.name, data.election_type, data.region_name, votingDate, status);
    
    return this.getById(Number(result.lastInsertRowid))!;
  },

  update(
    id: number,
    data: {
      name?: string;
      election_type?: string;
      region_name?: string;
      voting_date?: string;
      status?: string;
    }
  ): Election | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name : existing.name;
    const electionType = data.election_type !== undefined ? data.election_type : existing.election_type;
    const regionName = data.region_name !== undefined ? data.region_name : existing.region_name;
    const votingDate = data.voting_date !== undefined ? data.voting_date : existing.voting_date;
    const status = data.status !== undefined ? data.status : existing.status;

    const stmt = db.prepare(`
      UPDATE elections
      SET name = ?, election_type = ?, region_name = ?, voting_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, electionType, regionName, votingDate, status, id);

    return this.getById(id);
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare("DELETE FROM elections WHERE id = ?");
    stmt.run(id);
    return true;
  },
};
