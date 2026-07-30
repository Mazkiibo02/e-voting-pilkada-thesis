import db from "../database/connection";

export interface Party {
  id: number;
  name: string;
  acronym: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartyAvailability extends Party {
  is_endorsed: boolean;
  endorsed_paslon_id: number | null;
  endorsed_candidate_name: string | null;
  endorsed_ballot_number: number | null;
}

export const PartiesService = {
  getAll(): Party[] {
    const stmt = db.prepare("SELECT * FROM parties ORDER BY acronym ASC");
    return stmt.all() as unknown as Party[];
  },

  getById(id: number): Party | null {
    const stmt = db.prepare("SELECT * FROM parties WHERE id = ?");
    const res = stmt.get(id);
    return res ? (res as unknown as Party) : null;
  },

  create(data: { name: string; acronym: string; logo_url?: string }): Party {
    const stmt = db.prepare("INSERT INTO parties (name, acronym, logo_url) VALUES (?, ?, ?)");
    const result = stmt.run(data.name, data.acronym, data.logo_url || null);
    return this.getById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: { name?: string; acronym?: string; logo_url?: string }): Party | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const name = data.name !== undefined ? data.name : existing.name;
    const acronym = data.acronym !== undefined ? data.acronym : existing.acronym;
    const logoUrl = data.logo_url !== undefined ? data.logo_url : existing.logo_url;

    const stmt = db.prepare(
      "UPDATE parties SET name = ?, acronym = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(name, acronym, logoUrl, id);
    return this.getById(id);
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    // Remove relations first if any
    db.prepare("DELETE FROM paslon_parties WHERE party_id = ?").run(id);
    db.prepare("DELETE FROM parties WHERE id = ?").run(id);
    return true;
  },

  getAvailability(electionId: number, excludePaslonId?: number): PartyAvailability[] {
    const parties = this.getAll();
    
    // Find all endorsements for this election
    let query = `
      SELECT pp.party_id, pp.paslon_id, cp.candidate_name, cp.ballot_number
      FROM paslon_parties pp
      JOIN candidate_pairs cp ON cp.id = pp.paslon_id
      WHERE pp.election_id = ? AND (cp.is_deleted = 0 OR cp.is_deleted IS NULL)
    `;
    const params: any[] = [electionId];
    
    if (excludePaslonId) {
      query += " AND pp.paslon_id != ?";
      params.push(excludePaslonId);
    }

    const stmt = db.prepare(query);
    const endorsements = stmt.all(...params) as any[];

    const endorsementMap = new Map<number, { paslon_id: number; candidate_name: string; ballot_number: number }>();
    for (const e of endorsements) {
      endorsementMap.set(e.party_id, {
        paslon_id: e.paslon_id,
        candidate_name: e.candidate_name,
        ballot_number: e.ballot_number
      });
    }

    return parties.map(p => {
      const end = endorsementMap.get(p.id);
      return {
        ...p,
        is_endorsed: !!end,
        endorsed_paslon_id: end ? end.paslon_id : null,
        endorsed_candidate_name: end ? end.candidate_name : null,
        endorsed_ballot_number: end ? end.ballot_number : null
      };
    });
  }
};
